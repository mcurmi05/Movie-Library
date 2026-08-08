// Stats over a set of log rows, shaped by Log.tsx into a flat list so movies,
// TV and books can be counted together. Everything is derived from the
// currently filtered set, so the numbers follow whatever filters are applied.

const words = (t) => String(t).trim().split(/\s+/).filter(Boolean).length;

const median = (nums) => {
  if (!nums.length) return 0;
  const s = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
};

const mean = (nums) =>
  nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : null;

const topOf = (counts) => {
  let best = null;
  counts.forEach((count, key) => {
    if (!best || count > best.count) best = { key, count };
  });
  return best;
};

const topN = (counts, n) =>
  [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([key, count]) => ({ key, count }));

// Local yyyy-mm-dd (not toISOString, which shifts across the UTC boundary).
const dayKey = (d) => {
  const p = (v) => String(v).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};

const DAY = 86400000;
const dayNumber = (d) => Math.floor(new Date(dayKey(d)).getTime() / DAY);

const MONTH_NAMES = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];
const WEEKDAYS = [
  "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday",
];
// Monday-first order for the weekday breakdown; the values are getDay() indexes.
const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0];

// Common English filler, plus the words that show up in every single review
// ("watched", "film") and would otherwise win by default.
const STOPWORDS = new Set(
  ("the a an and or but if of to in on at for with from by as is are was were be been being " +
    "it its this that these those there here so than then too very just really quite much many " +
    "i me my mine we our you your he she they them his her their who whom which what when where " +
    "how why not no nor do does did done have has had having will would can could should may " +
    "might must about into over under again more most some such only own same s t don now " +
    "one two also up out down off get got go went make made like know think see")
    .split(" "),
);

function noteWordStats(notes) {
  const counts = new Map();
  let longest = "";
  notes.forEach((note) => {
    String(note)
      .toLowerCase()
      .split(/[^a-z'-]+/)
      .forEach((raw) => {
        const w = raw.replace(/^[-']+|[-']+$/g, "");
        if (w.length < 3) return;
        if (w.length > longest.length) longest = w;
        if (STOPWORDS.has(w)) return;
        counts.set(w, (counts.get(w) || 0) + 1);
      });
  });
  return { topWord: topOf(counts), longestWord: longest || null };
}

// Consecutive-day streaks over the days that have at least one log. "Current"
// counts only if the run reaches today or yesterday, so it doesn't keep
// claiming a streak from six months ago.
function streaks(dayNums) {
  if (!dayNums.length) return { current: 0, longest: 0 };
  const uniq = [...new Set(dayNums)].sort((a, b) => a - b);
  let longest = 1;
  let run = 1;
  for (let i = 1; i < uniq.length; i += 1) {
    run = uniq[i] === uniq[i - 1] + 1 ? run + 1 : 1;
    if (run > longest) longest = run;
  }
  const today = dayNumber(new Date());
  const last = uniq[uniq.length - 1];
  let current = 0;
  if (last === today || last === today - 1) {
    current = 1;
    for (let i = uniq.length - 1; i > 0; i -= 1) {
      if (uniq[i - 1] !== uniq[i] - 1) break;
      current += 1;
    }
  }
  return { current, longest };
}

// Longest run of days with nothing logged, between the first and last log.
function longestGap(dayNums) {
  const uniq = [...new Set(dayNums)].sort((a, b) => a - b);
  if (uniq.length < 2) return null;
  let best = { days: 0, from: null, to: null };
  for (let i = 1; i < uniq.length; i += 1) {
    const days = uniq[i] - uniq[i - 1] - 1;
    if (days > best.days)
      best = {
        days,
        from: new Date(uniq[i - 1] * DAY),
        to: new Date(uniq[i] * DAY),
      };
  }
  return best.days > 0 ? best : null;
}

export function computeLogStats(items) {
  const total = items.length;
  const noteLengths = [];
  const notes = [];
  let chars = 0;
  let longestNote = null;
  let movies = 0;
  let tv = 0;
  let books = 0;
  let rewatches = 0;
  let dated = 0;
  let runtimeMinutes = 0;
  let tens = 0;
  const ratings = [];
  const genreCounts = new Map();
  const yearCounts = new Map();
  const monthCounts = new Map();
  const weekdayCounts = new Map();
  const titleCounts = new Map();
  const dayNums = [];
  // Signed differences vs each crowd source, on a 0-10 scale.
  const vsImdb = [];
  const vsLb = [];
  const vsGr = [];
  let biggestGap = null;
  let contrarian = 0;
  let comparable = 0;
  const withGenres = [];
  let oldest = null;
  let newest = null;

  items.forEach((it) => {
    if (it.kind === "book") books += 1;
    else if (it.isTV) tv += 1;
    else movies += 1;

    const note = it.note && String(it.note).trim();
    if (note) {
      const w = words(note);
      noteLengths.push(w);
      notes.push(note);
      chars += note.length;
      if (!longestNote || w > longestNote.words)
        longestNote = { words: w, title: it.title, ref: it.ref };
    }

    if (it.isRepeat) rewatches += 1;
    if (!it.dateUnknown) dated += 1;
    if (it.rating != null) {
      ratings.push(it.rating);
      if (it.rating >= 10) tens += 1;
    }
    if (!it.isTV && it.kind !== "book" && it.runtimeMinutes > 0)
      runtimeMinutes += it.runtimeMinutes;

    const genres = it.genres || [];
    genres.forEach((g) => genreCounts.set(g, (genreCounts.get(g) || 0) + 1));
    if (genres.length) withGenres.push(it);

    if (it.titleKey)
      titleCounts.set(it.titleKey, (titleCounts.get(it.titleKey) || 0) + 1);

    // Release-year extremes. Only the year is stored for both movies and
    // books, so there's no finer granularity available here.
    if (it.year != null) {
      if (!oldest || it.year < oldest.year)
        oldest = { year: it.year, title: it.title, ref: it.ref };
      if (!newest || it.year > newest.year)
        newest = { year: it.year, title: it.title, ref: it.ref };
    }

    // Crowd comparison. Letterboxd and Goodreads are 0-5 natively; Log.tsx
    // doubles them before they get here so every source is on the same scale.
    if (it.rating != null) {
      if (it.crowdImdb != null) vsImdb.push(it.rating - it.crowdImdb);
      if (it.crowdLb != null) vsLb.push(it.rating - it.crowdLb);
      if (it.crowdGr != null) vsGr.push(it.rating - it.crowdGr);
      // One headline number per title: Letterboxd for film, Goodreads for
      // books, IMDb for everything else (it's the only source covering TV).
      const best =
        it.crowdLb != null
          ? { crowd: it.crowdLb, source: "Letterboxd" }
          : it.crowdGr != null
            ? { crowd: it.crowdGr, source: "Goodreads" }
            : it.crowdImdb != null
              ? { crowd: it.crowdImdb, source: "IMDb" }
              : null;
      if (best) {
        comparable += 1;
        const delta = it.rating - best.crowd;
        if (Math.abs(delta) >= 2) contrarian += 1;
        if (!biggestGap || Math.abs(delta) > Math.abs(biggestGap.delta))
          biggestGap = {
            delta,
            title: it.title,
            yours: it.rating,
            crowd: best.crowd,
            source: best.source,
            ref: it.ref,
          };
      }
    }

    if (!it.dateUnknown && it.date instanceof Date && !Number.isNaN(+it.date)) {
      const y = it.date.getFullYear();
      if (y > 1900) {
        yearCounts.set(y, (yearCounts.get(y) || 0) + 1);
        const mk = `${y}-${String(it.date.getMonth()).padStart(2, "0")}`;
        monthCounts.set(mk, (monthCounts.get(mk) || 0) + 1);
        const wd = it.date.getDay();
        weekdayCounts.set(wd, (weekdayCounts.get(wd) || 0) + 1);
        dayNums.push(dayNumber(it.date));
      }
    }
  });

  // Rarest thing you've logged: the title whose least-common genre is the
  // least common overall. Ties break toward the smaller genre list, which
  // favours the genuinely niche over a broadly-tagged blockbuster.
  let mostUnusual = null;
  withGenres.forEach((it) => {
    let rarest = null;
    it.genres.forEach((g) => {
      const c = genreCounts.get(g) || 0;
      if (!rarest || c < rarest.count) rarest = { genre: g, count: c };
    });
    if (!rarest) return;
    const better =
      !mostUnusual ||
      rarest.count < mostUnusual.count ||
      (rarest.count === mostUnusual.count &&
        it.genres.length < mostUnusual.genreCount);
    if (better)
      mostUnusual = {
        title: it.title,
        genre: rarest.genre,
        count: rarest.count,
        genreCount: it.genres.length,
        ref: it.ref,
      };
  });

  const mostRepeated = topOf(titleCounts);
  const repeatTitle =
    mostRepeated && mostRepeated.count > 1
      ? {
          title:
            items.find((i) => i.titleKey === mostRepeated.key)?.title || "",
          count: mostRepeated.count,
        }
      : null;

  const busiestMonthEntry = topOf(monthCounts);
  const busiestMonth = busiestMonthEntry
    ? {
        label: `${MONTH_NAMES[Number(busiestMonthEntry.key.slice(5))]} ${busiestMonthEntry.key.slice(0, 4)}`,
        count: busiestMonthEntry.count,
      }
    : null;

  // Average per month across the span actually covered, not per calendar month
  // that happens to have logs, so quiet months drag the number down honestly.
  const sortedDays = [...dayNums].sort((a, b) => a - b);
  const spanMonths = sortedDays.length
    ? Math.max(
        1,
        Math.round(
          (sortedDays[sortedDays.length - 1] - sortedDays[0]) / 30.44,
        ) || 1,
      )
    : 0;

  const streakRun = streaks(dayNums);
  const weekdayMax = Math.max(0, ...weekdayCounts.values());
  const weekdays = WEEK_ORDER.map((d) => ({
    label: WEEKDAYS[d].slice(0, 3),
    count: weekdayCounts.get(d) || 0,
    max: weekdayMax,
  }));
  const totalWords = noteLengths.reduce((a, b) => a + b, 0);

  return {
    total,
    movies,
    tv,
    books,
    withNote: noteLengths.length,
    totalWords,
    totalChars: chars,
    avgWords: noteLengths.length ? totalWords / noteLengths.length : 0,
    medianWords: median(noteLengths),
    longest: longestNote,
    ...noteWordStats(notes),
    rated: ratings.length,
    avgRating: mean(ratings),
    tens,
    rewatches,
    dated,
    runtimeMinutes,
    topGenres: topN(genreCounts, 3),
    genreTagged: withGenres.length,
    busiestYear: topOf(yearCounts),
    busiestMonth,
    perMonth: spanMonths ? dated / spanMonths : 0,
    weekdays,
    oldest,
    newest,
    // Named, not spread: `longest` here would collide with the longest note.
    currentStreak: streakRun.current,
    longestStreak: streakRun.longest,
    gap: longestGap(dayNums),
    uniqueTitles: titleCounts.size,
    mostRepeated: repeatTitle,
    mostUnusual,
    vsImdb: mean(vsImdb),
    vsImdbCount: vsImdb.length,
    vsLb: mean(vsLb),
    vsLbCount: vsLb.length,
    vsGr: mean(vsGr),
    vsGrCount: vsGr.length,
    biggestGap,
    contrarian,
    comparable,
  };
}

export const pct = (n, d) => (d > 0 ? `${Math.round((n / d) * 100)}%` : "0%");

export const compact = (n) =>
  n >= 1000 ? `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k` : String(n);

export const signed = (n) => `${n > 0 ? "+" : ""}${n.toFixed(2)}`;

export function runtimeLabel(minutes) {
  if (!minutes) return "0h";
  const days = Math.floor(minutes / 1440);
  const hours = Math.round((minutes % 1440) / 60);
  if (days > 0) return `${days}d ${hours}h`;
  return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
}

export const shortDate = (d) =>
  `${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`;
