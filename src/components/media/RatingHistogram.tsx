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
// half can fail where the rest of the page works - when it does the tab stays
// on offer and this half says the distribution is unavailable, instead of
// leaving IMDb's 1-10 bars up under a Letterboxd tab.
//
// This header also owns the only source switcher on the page: `source` lives
// on the page and the reviews below follow it, so one click moves both.

function ImdbMark() {
  return (
    <svg className="xr-mark" viewBox="0 0 64 32" aria-hidden="true">
      <rect width="64" height="32" rx="5" fill="#f5c518" />
      <text
        x="32"
        y="23"
        textAnchor="middle"
        fontSize="17"
        fontWeight="700"
        fontFamily="Helvetica, Arial, sans-serif"
        fill="#000"
      >
        IMDb
      </text>
    </svg>
  );
}

function LetterboxdMark() {
  return (
    <svg className="xr-mark" viewBox="0 0 64 32" aria-hidden="true">
      <circle cx="16" cy="16" r="12" fill="#ff8000" />
      <circle cx="48" cy="16" r="12" fill="#40bcf4" />
      <circle cx="32" cy="16" r="12" fill="#00e054" />
    </svg>
  );
}

function RatingHistogram({ imdbId, tmdbId, mediaType, source, onSourceChange }) {
  const [imdb, setImdb] = useState(null);
  const [lb, setLb] = useState(null);
  // "loading" | "ready" | "failed" per source. The tabs are offered for what a
  // title could have, not for what actually came back, so the chart has to be
  // able to say which of those it is.
  const [imdbState, setImdbState] = useState("loading");
  const [lbState, setLbState] = useState("loading");
  const [active, setActive] = useState(null);

  const canImdb = !!imdbId;
  // Letterboxd is film-only, matching the reviews below.
  const canLb = mediaType === "movie" && tmdbId != null;

  useEffect(() => {
    let cancelled = false;
    setImdb(null);
    if (!imdbId) {
      setImdbState("failed");
      return;
    }
    setImdbState("loading");
    getImdbHistogram(imdbId)
      .then((res) => {
        if (cancelled) return;
        setImdb(res);
        setImdbState(res?.histogram?.length ? "ready" : "failed");
      })
      .catch(() => !cancelled && setImdbState("failed"));
    return () => {
      cancelled = true;
    };
  }, [imdbId]);

  useEffect(() => {
    let cancelled = false;
    setLb(null);
    if (!canLb) {
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
  }, [tmdbId, canLb]);

  useEffect(() => {
    setActive(null);
  }, [source]);

  if (!canImdb && !canLb) return null;

  const isLb = (source === "letterboxd" && canLb) || !canImdb;
  const data = isLb ? lb : imdb;
  const state = isLb ? lbState : imdbState;
  const hasBars = !!data?.histogram?.length;

  const max = hasBars ? Math.max(...data.histogram.map((b) => b.votes)) : 0;
  const total = hasBars
    ? data.total || data.histogram.reduce((sum, b) => sum + b.votes, 0)
    : 0;
  const shown = hasBars && data.histogram.find((b) => b.rating === active);
  const label = (rating) => (isLb ? `★ ${rating}` : `${rating}/10`);

  return (
    <div className={`rating-dist${isLb ? " is-letterboxd" : ""}`}>
      <div className="rating-dist-head">
        <span className="rating-dist-title">Rating distribution</span>
        {canImdb && canLb && (
          <div className="xr-tabs">
            <button
              className={`xr-tab${!isLb ? " is-active" : ""}`}
              onClick={() => onSourceChange("imdb")}
            >
              <ImdbMark />
              IMDb
            </button>
            <button
              className={`xr-tab${isLb ? " is-active" : ""}`}
              onClick={() => onSourceChange("letterboxd")}
            >
              <LetterboxdMark />
              Letterboxd
            </button>
          </div>
        )}
        <span className="rating-dist-readout">
          {!hasBars
            ? ""
            : shown
              ? `${label(shown.rating)} · ${shown.votes.toLocaleString()} votes · ` +
                `${((shown.votes / total) * 100).toFixed(1)}%`
              : `${total.toLocaleString()} votes`}
        </span>
      </div>

      {hasBars ? (
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
      ) : (
        <p className="rating-dist-note">
          {state === "loading"
            ? "Loading distribution…"
            : `${isLb ? "Letterboxd" : "IMDb"} distribution unavailable.`}
        </p>
      )}
    </div>
  );
}

export default RatingHistogram;
