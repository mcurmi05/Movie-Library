// Vercel Edge function: Letterboxd's rating distribution for one film.
//
//   ?tmdb_id=550 -> { histogram: [{ rating, votes }], total, average }
//
// The numbers only exist on /csi/film/{slug}/rating-histogram/, which sits
// behind Cloudflare's bot check. Node's TLS fingerprint is refused there (the
// plain film page is not), so this runs on the edge runtime, whose fetch has a
// different fingerprint and stands a chance of getting through. If it doesn't,
// the endpoint returns 502 and the UI drops the Letterboxd tab - nothing else
// depends on it.

export const config = { runtime: "edge" };

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";

const HEADERS = { "User-Agent": UA, "Accept-Language": "en-US,en;q=0.9" };

const json = (body, status = 200, headers = {}) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...headers },
  });

// "half-★" is 0.5; otherwise one point per ★ plus a half for the ½.
function starsToRating(stars) {
  if (stars === "half-★") return 0.5;
  const full = (stars.match(/★/g) || []).length;
  return full + (stars.includes("½") ? 0.5 : 0) || null;
}

async function slugFor(tmdbId) {
  const res = await fetch(`https://letterboxd.com/tmdb/${tmdbId}/`, {
    headers: HEADERS,
    redirect: "follow",
  });
  if (!res.ok || !res.url.includes("/film/")) return null;
  return new URL(res.url).pathname.replace(/^\/film\//, "").replace(/\/$/, "");
}

// Each bar is an <a class="barcolumn tooltip" title="8,553 half-★ ratings (0%)">.
function parseHistogram(html) {
  const bars = [
    ...html.matchAll(
      /class="barcolumn tooltip" title="([\d,]+) (\S+) ratings/g,
    ),
  ].map(([, votes, stars]) => ({
    rating: starsToRating(stars),
    votes: Number(votes.replace(/,/g, "")),
  }));
  return bars.length === 10 && bars.every((b) => b.rating) ? bars : null;
}

export default async function handler(req) {
  // Edge passes an absolute URL; the dev middleware in vite.config.js passes a
  // bare path, hence the base.
  const tmdbId = Number(
    new URL(req.url, "http://localhost").searchParams.get("tmdb_id"),
  );
  if (!Number.isInteger(tmdbId) || tmdbId <= 0) {
    return json({ error: "Missing or invalid tmdb_id" }, 400);
  }

  try {
    const slug = await slugFor(tmdbId);
    if (!slug) return json({ error: "Film not found" }, 404);

    const res = await fetch(
      `https://letterboxd.com/csi/film/${slug}/rating-histogram/`,
      { headers: { ...HEADERS, Referer: `https://letterboxd.com/film/${slug}/` } },
    );
    if (!res.ok) return json({ error: `Letterboxd responded ${res.status}` }, 502);

    const histogram = parseHistogram(await res.text());
    if (!histogram) return json({ error: "No distribution found" }, 404);

    const total = histogram.reduce((sum, b) => sum + b.votes, 0);
    const average = total
      ? histogram.reduce((sum, b) => sum + b.rating * b.votes, 0) / total
      : null;
    return json(
      { histogram, total, average, slug },
      200,
      // Distributions this size barely move; let the CDN carry the load.
      { "Cache-Control": "public, s-maxage=3600" },
    );
  } catch (err) {
    return json({ error: err.message }, 502);
  }
}
