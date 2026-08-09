// TMDB serves the same poster at fixed widths under /t/p/<size>/. Posters are
// stored at w500, which is 5x more pixels than a 100px wall tile needs, so the
// compact views ask for a smaller cut and hand the browser a srcset to pick
// from. Covers that aren't TMDB (user overrides, Hardcover book jackets) are
// left exactly as they are.
const TMDB_POSTER = /^(https?:\/\/image\.tmdb\.org\/t\/p\/)(w\d+|original)(\/.+)$/;

export function tmdbSized(url, size) {
  const match = typeof url === "string" && url.match(TMDB_POSTER);
  return match ? `${match[1]}${size}${match[3]}` : url;
}

// Widths worth offering for a small tile: 1x, ~2x and a retina-ish 3x.
const WALL_WIDTHS = [154, 185, 342];

export function wallPosterSrc(url) {
  if (typeof url !== "string" || !TMDB_POSTER.test(url)) {
    return { src: url, srcSet: undefined };
  }
  return {
    src: tmdbSized(url, "w185"),
    srcSet: WALL_WIDTHS.map((w) => `${tmdbSized(url, `w${w}`)} ${w}w`).join(", "),
  };
}
