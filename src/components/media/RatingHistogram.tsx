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
// half can fail where the rest of the page works - when it does the tab is
// still offered (the reviews below always offer it for a film) and this half
// says so, instead of leaving IMDb's 1-10 bars up under a Letterboxd tab.
//
// `source` is owned by the page and shared with the reviews section below, so
// one tab click switches both.
function RatingHistogram({ imdbId, tmdbId, mediaType, source, onSourceChange }) {
  const [imdb, setImdb] = useState(null);
  const [lb, setLb] = useState(null);
  // "loading" | "ready" | "failed": the Letterboxd tab is offered whenever the
  // film could have one, so this half has to say which of those it is rather
  // than quietly leaving the IMDb chart up under a Letterboxd tab.
  const [lbState, setLbState] = useState("loading");
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
    if (mediaType !== "movie" || tmdbId == null) {
      setLbState("failed");
      return;
    }
    setLbState("loading");
    getLetterboxdHistogram(tmdbId)
      .then((res) => {
        if (cancelled) return;
        setLb(res);
        setLbState(res?.histogram?.length ? "ready" : "failed");
      })
      .catch(() => !cancelled && setLbState("failed"));
    return () => {
      cancelled = true;
    };
  }, [tmdbId, mediaType]);

  useEffect(() => {
    setActive(null);
  }, [source]);

  const hasImdb = !!imdb?.histogram?.length;
  const hasLb = !!lb?.histogram?.length;
  const canLb = mediaType === "movie" && tmdbId != null;
  // The reviews below offer a Letterboxd tab for any film, so this chart has
  // to follow that choice even before (or without) its own data: showing the
  // IMDb 1-10 chart under a Letterboxd tab is what used to happen.
  const wantLb = source === "letterboxd" && canLb;
  const pendingLb = wantLb && !hasLb && lbState === "loading";
  if (!hasImdb && !hasLb && !pendingLb) return null;

  const isLb = wantLb || !hasImdb;
  const data = isLb ? (hasLb ? lb : null) : imdb;

  const max = data ? Math.max(...data.histogram.map((b) => b.votes)) : 0;
  const total = data
    ? data.total || data.histogram.reduce((sum, b) => sum + b.votes, 0)
    : 0;
  const shown = data?.histogram.find((b) => b.rating === active);
  const label = (rating) => (isLb ? `★ ${rating}` : `${rating}/10`);

  return (
    <div className={`rating-dist${isLb ? " is-letterboxd" : ""}`}>
      <div className="rating-dist-head">
        <span className="rating-dist-title">Rating distribution</span>
        {hasImdb && canLb && (
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
          {!data
            ? ""
            : shown
              ? `${label(shown.rating)} · ${shown.votes.toLocaleString()} votes · ` +
                `${((shown.votes / total) * 100).toFixed(1)}%`
              : `${total.toLocaleString()} votes`}
        </span>
      </div>

      {!data ? (
        <p className="rating-dist-note">
          {lbState === "loading"
            ? "Loading Letterboxd distribution…"
            : "Letterboxd distribution unavailable."}
        </p>
      ) : (
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
      )}
    </div>
  );
}

export default RatingHistogram;
