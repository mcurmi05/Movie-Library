// Vercel serverless function: on-demand Letterboxd rating for one movie.
// Used by the media details page to refresh a single title live. Scrapes the
// film page (resolved via Letterboxd's /tmdb/{id}/ redirect), upserts the
// result into the `letterboxd_ratings` cache, and returns it.
//
// ?action=reviews&page=N returns reviews instead (nothing cached): page 1 is
// the twelve popular reviews off the film page, later pages come off
// /film/{slug}/reviews/by/activity/page/N/. Letterboxd's histogram endpoint and
// the reviews listing sit behind a bot challenge that only some IPs get past,
// so a blocked listing page is reported as hasMore: false.
//
// Ratings stay on Letterboxd's native 0–5 scale.

// URL can come from the dedicated server var or the existing client var (same
// value); the write requires the service-role key (anon key is read-only here).
const SUPABASE_URL =
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_PROJECT_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/120.0 Safari/537.36";

async function scrapeRating(tmdbId) {
  const res = await fetch(`https://letterboxd.com/tmdb/${tmdbId}/`, {
    headers: { "User-Agent": UA, "Accept-Language": "en-US,en;q=0.9" },
    redirect: "follow",
  });
  if (!res.ok || !res.url.includes("/film/")) return null;

  const html = await res.text();
  const m = html.match(
    /<script type="application\/ld\+json">\s*\/\* <!\[CDATA\[ \*\/([\s\S]*?)\/\* \]\]> \*\/\s*<\/script>/,
  );
  if (!m) return null;

  let ld;
  try {
    ld = JSON.parse(m[1]);
  } catch {
    return null;
  }
  const agg = ld.aggregateRating;
  if (!agg || agg.ratingValue == null) return null;

  let slug = null;
  try {
    slug = new URL(ld.url).pathname.replace(/^\/film\//, "").replace(/\/$/, "");
  } catch {
    /* leave slug null */
  }

  return {
    tmdb_id: tmdbId,
    slug,
    rating: Number(agg.ratingValue),
    rating_count: agg.ratingCount != null ? Number(agg.ratingCount) : null,
  };
}

const ENTITIES = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
};

function decode(s) {
  return s
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&(\w+);/g, (m, name) => ENTITIES[name] ?? m);
}

// Star glyphs carry the rating in their aria-label: "★★★½" is 3.5.
function starsToRating(label) {
  if (!label) return null;
  const full = (label.match(/★/g) || []).length;
  const half = label.includes("½") ? 0.5 : 0;
  return full + half || null;
}

function parseReview(block, slug) {
  const link = block.match(/href="([^"]+)" class="context"/)?.[1];
  const author = block.match(
    /<strong class="displayname">([\s\S]*?)<\/strong>/,
  )?.[1];
  if (!link || !author) return null;

  // The body sits between the review div and the like/comment actions; the
  // markup in between is <p> paragraphs plus the odd link. Paragraph ends and
  // <br> both carry line breaks the writer put there, so keep them.
  const bodyAt = block.indexOf("js-review-body");
  const endAt = block.indexOf('<div class="viewing-actions"', bodyAt);
  const body = bodyAt === -1 || endAt === -1 ? "" : block.slice(bodyAt, endAt);
  const text = decode(
    body
      .slice(body.indexOf(">") + 1)
      .replace(/<\/p>/g, "\n\n")
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<[^>]+>/g, "")
      .trim(),
  ).replace(/\n{3,}/g, "\n\n");
  if (!text) return null;

  return {
    id: link,
    url: `https://letterboxd.com${link}`,
    author: decode(author.trim()),
    text,
    rating: starsToRating(
      block.match(/class="glyph -rating"[^>]*aria-label="([^"]*)"/)?.[1],
    ),
    likes: Number(block.match(/data-count="(\d+)"/)?.[1] ?? 0) || null,
    spoiler: block.includes("This review may contain spoilers"),
    slug,
  };
}

function parseReviews(html, slug) {
  return html
    .split('<article class="production-viewing')
    .slice(1)
    .map((block) => parseReview(block.slice(0, block.indexOf("</article>")), slug))
    .filter(Boolean);
}

// Page 1 is the film page's popular reviews; anything past that comes off the
// paginated reviews listing, which is ordered the same way. Cloudflare guards
// the listing more tightly than the film page, so a blocked page is reported as
// "no more reviews" and the UI just stops offering to load them.
async function scrapeReviews(tmdbId, page) {
  const res = await fetch(`https://letterboxd.com/tmdb/${tmdbId}/`, {
    headers: { "User-Agent": UA, "Accept-Language": "en-US,en;q=0.9" },
    redirect: "follow",
  });
  if (!res.ok || !res.url.includes("/film/")) return null;

  const slug = new URL(res.url).pathname.replace(/^\/film\//, "").replace(/\/$/, "");
  if (page <= 1) {
    const reviews = parseReviews(await res.text(), slug);
    return { reviews, hasMore: reviews.length > 0, slug };
  }

  const listing = await fetch(
    `https://letterboxd.com/film/${slug}/reviews/by/activity/page/${page}/`,
    {
      headers: {
        "User-Agent": UA,
        "Accept-Language": "en-US,en;q=0.9",
        Referer: `https://letterboxd.com/film/${slug}/`,
      },
    },
  );
  if (!listing.ok) return { reviews: [], hasMore: false, slug };

  const html = await listing.text();
  const reviews = parseReviews(html, slug);
  return { reviews, hasMore: reviews.length > 0 && html.includes('class="next"'), slug };
}

async function cacheRow(row) {
  if (!SUPABASE_URL || !SERVICE_KEY) return; // best-effort cache write
  const url =
    `${SUPABASE_URL.replace(/\/$/, "")}/rest/v1/letterboxd_ratings` +
    `?on_conflict=tmdb_id`;
  await fetch(url, {
    method: "POST",
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      "Content-Type": "application/json",
      Prefer: "resolution=merge-duplicates,return=minimal",
    },
    body: JSON.stringify([{ ...row, updated_at: new Date().toISOString() }]),
  }).catch(() => {});
}

export default async function handler(req, res) {
  const raw =
    req.query?.tmdb_id ||
    (req.url && new URL(req.url, "http://x").searchParams.get("tmdb_id"));
  const tmdbId = Number(raw);
  if (!Number.isInteger(tmdbId) || tmdbId <= 0) {
    return res.status(400).json({ error: "Missing or invalid tmdb_id" });
  }

  const action =
    req.query?.action ||
    (req.url && new URL(req.url, "http://x").searchParams.get("action"));

  try {
    if (action === "reviews") {
      const page =
        Number(
          req.query?.page ||
            (req.url && new URL(req.url, "http://x").searchParams.get("page")),
        ) || 1;
      const result = await scrapeReviews(tmdbId, page);
      if (!result) return res.status(404).json({ error: "Film not found" });
      res.setHeader("Cache-Control", "no-store");
      return res.status(200).json(result);
    }

    const row = await scrapeRating(tmdbId);
    if (!row) return res.status(404).json({ error: "No rating found" });
    await cacheRow(row);
    return res.status(200).json({
      tmdb_id: row.tmdb_id,
      slug: row.slug,
      rating: row.rating,
      ratingCount: row.rating_count,
    });
  } catch (err) {
    return res.status(502).json({ error: err.message });
  }
}
