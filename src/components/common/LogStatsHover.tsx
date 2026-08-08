import { useEffect, useMemo, useRef, useState } from "react";
import {
  computeLogStats,
  pct,
  compact,
  signed,
  runtimeLabel,
  shortDate,
} from "../../utils/logStats";
import "../../styles/common/LogStatsHover.css";

// `onClick` turns the value into a link that filters the page down to whatever
// the stat is about (a title, a genre).
function Row({ label, value, sub, onClick, title }) {
  return (
    <div className="lsh-row">
      <span className="lsh-label">{label}</span>
      <span className="lsh-value">
        {onClick ? (
          <button type="button" className="lsh-link" onClick={onClick} title={title}>
            {value}
          </button>
        ) : (
          value
        )}
        {sub ? <span className="lsh-sub"> {sub}</span> : null}
      </span>
    </div>
  );
}

function Group({ title, children }) {
  return (
    <div className="lsh-group">
      <div className="lsh-group-title">{title}</div>
      {children}
    </div>
  );
}

// Hover card in the log toolbar. Numbers describe the currently filtered set,
// so they move with the filters rather than always showing the whole library.
// Hovering peeks at it; clicking pins it open so the links inside are reachable
// without keeping the pointer on the card.
function LogStatsHover({ items, filtered, onSearch, onGenre, onReveal }) {
  const [hovered, setHovered] = useState(false);
  const [pinned, setPinned] = useState(false);
  const ref = useRef(null);
  const open = hovered || pinned;
  const s = useMemo(() => computeLogStats(items), [items]);

  useEffect(() => {
    if (!pinned) return;
    const handleClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setPinned(false);
    };
    const handleKey = (e) => {
      if (e.key === "Escape") setPinned(false);
    };
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, [pinned]);

  // Applying a filter from inside the card dismisses it, so the result is
  // visible straight away.
  const apply = (fn, value) => () => {
    if (!fn || !value) return;
    fn(value);
    setPinned(false);
    setHovered(false);
  };

  return (
    <div
      className="lsh-wrap"
      ref={ref}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <button
        type="button"
        className={`lsh-trigger${pinned ? " lsh-trigger--on" : ""}`}
        aria-expanded={open}
        onClick={() => setPinned((v) => !v)}
      >
        Stats
      </button>
      {open && (
        <div className="lsh-panel" role="tooltip">
          <div className="lsh-head">
            {filtered ? "Filtered logs" : "All logs"}
            <span className="lsh-head-count">{s.total}</span>
          </div>

          <div className="lsh-scroll">
            <Group title="Mix">
              <Row
                label="Movies"
                value={s.movies}
                sub={`(${pct(s.movies, s.total)})`}
              />
              <Row label="TV" value={s.tv} sub={`(${pct(s.tv, s.total)})`} />
              <Row
                label="Books"
                value={s.books}
                sub={`(${pct(s.books, s.total)})`}
              />
              <Row
                label="Unique titles"
                value={s.uniqueTitles}
                sub={`· ${s.rewatches} repeats`}
              />
              {s.runtimeMinutes > 0 && (
                <Row
                  label="Movie runtime"
                  value={runtimeLabel(s.runtimeMinutes)}
                />
              )}
            </Group>

            <Group title="Writing">
              <Row
                label="With a note"
                value={s.withNote}
                sub={`(${pct(s.withNote, s.total)})`}
              />
              <Row label="Words written" value={compact(s.totalWords)} />
              <Row label="Characters" value={compact(s.totalChars)} />
              <Row label="Avg words / note" value={s.avgWords.toFixed(1)} />
              <Row label="Median words" value={s.medianWords} />
              {s.longest && (
                <>
                  <Row
                    label="Longest note"
                    value={`${s.longest.words} words`}
                  />
                  {s.longest.title && (
                    <div className="lsh-note">
                      <button
                        type="button"
                        className="lsh-link"
                        onClick={apply(onReveal, s.longest.ref)}
                        title="Jump to this log"
                      >
                        {s.longest.title}
                      </button>
                    </div>
                  )}
                </>
              )}
              {s.topWord && (
                <Row
                  label="Most used word"
                  value={s.topWord.key}
                  sub={`· ${s.topWord.count}×`}
                />
              )}
              {s.longestWord && (
                <Row
                  label="Longest word"
                  value={s.longestWord}
                  sub={`· ${s.longestWord.length}`}
                />
              )}
            </Group>

            <Group title="Rhythm">
              <Row label="Current streak" value={`${s.currentStreak} days`} />
              <Row label="Longest streak" value={`${s.longestStreak} days`} />
              {s.gap && (
                <Row
                  label="Longest gap"
                  value={`${s.gap.days} days`}
                  sub={`· ${shortDate(s.gap.from)} → ${shortDate(s.gap.to)}`}
                />
              )}
              <Row label="Logs / month" value={s.perMonth.toFixed(1)} />
              {s.busiestMonth && (
                <Row
                  label="Busiest month"
                  value={s.busiestMonth.label}
                  sub={`· ${s.busiestMonth.count}`}
                />
              )}
              {s.busiestYear && (
                <Row
                  label="Busiest year"
                  value={s.busiestYear.key}
                  sub={`· ${s.busiestYear.count}`}
                />
              )}
              <Row
                label="Has a date"
                value={s.dated}
                sub={`(${pct(s.dated, s.total)})`}
              />
            </Group>

            <Group title="By day of the week">
              {s.weekdays.map((d) => (
                <div className="lsh-day" key={d.label}>
                  <span className="lsh-day-name">{d.label}</span>
                  <span className="lsh-day-bar">
                    <span
                      className="lsh-day-fill"
                      style={{
                        width: d.max ? `${(d.count / d.max) * 100}%` : "0%",
                      }}
                    />
                  </span>
                  <span className="lsh-day-count">{d.count}</span>
                  <span className="lsh-day-pct">{pct(d.count, s.dated)}</span>
                </div>
              ))}
            </Group>

            <Group title="Ratings">
              <Row
                label="Rated"
                value={s.rated}
                sub={`(${pct(s.rated, s.total)})`}
              />
              {s.avgRating != null && (
                <Row label="Avg rating" value={s.avgRating.toFixed(2)} />
              )}
              <Row
                label="Perfect 10s"
                value={s.tens}
                sub={`(${pct(s.tens, s.rated)})`}
              />
            </Group>

            <Group title="You vs the crowd">
              {s.vsImdb != null && (
                <Row
                  label="vs IMDb"
                  value={signed(s.vsImdb)}
                  sub={`· ${s.vsImdbCount}`}
                />
              )}
              {s.vsLb != null && (
                <Row
                  label="vs Letterboxd"
                  value={signed(s.vsLb)}
                  sub={`· ${s.vsLbCount}`}
                />
              )}
              {s.vsGr != null && (
                <Row
                  label="vs Goodreads"
                  value={signed(s.vsGr)}
                  sub={`· ${s.vsGrCount}`}
                />
              )}
              {s.comparable > 0 && (
                <Row
                  label="Contrarian picks"
                  value={s.contrarian}
                  sub={`(${pct(s.contrarian, s.comparable)} off by 2+)`}
                />
              )}
              {s.biggestGap && (
                <>
                  <Row
                    label="Biggest gap"
                    value={signed(s.biggestGap.delta)}
                    sub={`· ${s.biggestGap.source}`}
                  />
                  <div className="lsh-note">
                    <button
                      type="button"
                      className="lsh-link"
                      onClick={apply(onReveal, s.biggestGap.ref)}
                      title="Jump to this log"
                    >
                      {s.biggestGap.title}
                    </button>{" "}
                    — you {s.biggestGap.yours}, them{" "}
                    {s.biggestGap.crowd.toFixed(1)}
                  </div>
                </>
              )}
              {s.vsImdb == null && s.vsLb == null && s.vsGr == null && (
                <div className="lsh-note">
                  No crowd ratings to compare against yet.
                </div>
              )}
            </Group>

            <Group title="Taste">
              {s.topGenres.length > 0 ? (
                s.topGenres.map((g, i) => (
                  <Row
                    key={g.key}
                    label={`#${i + 1} genre`}
                    value={g.key}
                    onClick={apply(onGenre, g.key)}
                    title="Filter the log by this genre"
                    sub={`· ${g.count} (${pct(g.count, s.genreTagged)})`}
                  />
                ))
              ) : (
                <div className="lsh-note">No genre data in this set.</div>
              )}
              {s.oldest && (
                <Row
                  label="Oldest release"
                  value={s.oldest.year}
                  sub={
                    <>
                      {"· "}
                      <button
                        type="button"
                        className="lsh-link"
                        onClick={apply(onReveal, s.oldest.ref)}
                        title="Jump to this log"
                      >
                        {s.oldest.title}
                      </button>
                    </>
                  }
                />
              )}
              {s.newest && (
                <Row
                  label="Newest release"
                  value={s.newest.year}
                  sub={
                    <>
                      {"· "}
                      <button
                        type="button"
                        className="lsh-link"
                        onClick={apply(onReveal, s.newest.ref)}
                        title="Jump to this log"
                      >
                        {s.newest.title}
                      </button>
                    </>
                  }
                />
              )}
              {s.mostRepeated && (
                <Row
                  label="Most logged"
                  value={s.mostRepeated.title}
                  onClick={apply(onSearch, s.mostRepeated.title)}
                  title="Search the log for this title"
                  sub={`· ${s.mostRepeated.count}×`}
                />
              )}
              {s.mostUnusual && (
                <>
                  <Row
                    label="Most unusual"
                    value={s.mostUnusual.title}
                    onClick={apply(onReveal, s.mostUnusual.ref)}
                    title="Jump to this log"
                  />
                  <div className="lsh-note">
                    only {s.mostUnusual.count}{" "}
                    <button
                      type="button"
                      className="lsh-link"
                      onClick={apply(onGenre, s.mostUnusual.genre)}
                      title="Filter the log by this genre"
                    >
                      {s.mostUnusual.genre}
                    </button>{" "}
                    log{s.mostUnusual.count === 1 ? "" : "s"} in this set
                  </div>
                </>
              )}
            </Group>
          </div>
        </div>
      )}
    </div>
  );
}

export default LogStatsHover;
