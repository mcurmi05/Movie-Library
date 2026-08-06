import { useEffect, useState } from "react";
import {
  getImdbHistogram,
  getLetterboxdHistogram,
} from "../../services/externalReviews";
import "../../styles/media/ExternalReviews.css";

// Vote breakdowns from IMDb (1–10) and Letterboxd (½–5 stars). Bars are scaled
// against the busiest bucket so the shape of the distribution reads at a
// glance; hovering (or tapping, on touch) a bar gives the exact vote count and
// share.
//
// Letterboxd serves its chart from an endpoint behind a bot challenge, so that
// half can fail where the rest of the page works - when it does, its tab is
// simply not offered and the IMDb chart stays on screen.
//
// `source` is owned by the page and shared with the reviews section below, so
// one tab click switches both.
function RatingHistogram({ imdbId, tmdbId, mediaType, source, onSourceChange }) {
  const [imdb, setImdb] = useState(null);
  const [lb, setLb] = useState(null);
  const [active, setActive] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setImdb(null);
    if (!imdbId) return;
    getImdbHistogram(imdbId)
      .then((res) => !cancelled && setImdb(res))
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [imdbId]);

  useEffect(() => {
    let cancelled = false;
    setLb(null);
    if (mediaType !== "movie" || tmdbId == null) return;
    getLetterboxdHistogram(tmdbId)
      .then((res) => !cancelled && setLb(res))
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [tmdbId, mediaType]);

  useEffect(() => {
    setActive(null);
  }, [source]);

  const hasImdb = !!imdb?.histogram?.length;
  const hasLb = !!lb?.histogram?.length;
  if (!hasImdb && !hasLb) return null;

  // Honour the shared tab, but never blank the chart out because the other
  // half of the page can offer a source this one couldn't fetch.
  const isLb = source === "letterboxd" ? hasLb : !hasImdb;
  const data = isLb ? lb : imdb;

  const max = Math.max(...data.histogram.map((b) => b.votes));
  const total =
    data.total || data.histogram.reduce((sum, b) => sum + b.votes, 0);
  const shown = data.histogram.find((b) => b.rating === active);
  const label = (rating) => (isLb ? `★ ${rating}` : `${rating}/10`);

  return (
    <div className={`rating-dist${isLb ? " is-letterboxd" : ""}`}>
      <div className="rating-dist-head">
        <span className="rating-dist-title">Rating distribution</span>
        {hasImdb && hasLb && (
          <div className="xr-tabs">
            <button
              className={`xr-tab${!isLb ? " is-active" : ""}`}
              onClick={() => onSourceChange("imdb")}
            >
              IMDb
            </button>
            <button
              className={`xr-tab${isLb ? " is-active" : ""}`}
              onClick={() => onSourceChange("letterboxd")}
            >
              Letterboxd
            </button>
          </div>
        )}
        <span className="rating-dist-readout">
          {shown
            ? `${label(shown.rating)} · ${shown.votes.toLocaleString()} votes · ` +
              `${((shown.votes / total) * 100).toFixed(1)}%`
            : `${total.toLocaleString()} votes`}
        </span>
      </div>

      <div className="rating-dist-bars" onMouseLeave={() => setActive(null)}>
        {data.histogram.map((bucket) => (
          <button
            key={bucket.rating}
            type="button"
            className={`rating-dist-bar${
              active === bucket.rating ? " is-active" : ""
            }`}
            onMouseEnter={() => setActive(bucket.rating)}
            onFocus={() => setActive(bucket.rating)}
            onClick={() => setActive(bucket.rating)}
            aria-label={`${label(bucket.rating)}: ${bucket.votes.toLocaleString()} votes`}
          >
            <span
              className="rating-dist-fill"
              style={{ height: `${Math.max((bucket.votes / max) * 100, 2)}%` }}
            />
            <span className="rating-dist-label">{bucket.rating}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

export default RatingHistogram;
