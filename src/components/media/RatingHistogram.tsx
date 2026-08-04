import { useEffect, useState } from "react";
import { getImdbHistogram } from "../../services/externalReviews";
import "../../styles/media/ExternalReviews.css";

// IMDb's 1–10 vote breakdown. Bars are scaled against the busiest bucket so
// the shape of the distribution reads at a glance; hovering (or tapping, on
// touch) a bar gives the exact vote count and share.
//
// Letterboxd has the same chart on its site but serves it from an endpoint
// that's behind a bot challenge, so only IMDb is shown here.
function RatingHistogram({ imdbId }) {
  const [data, setData] = useState(null);
  const [active, setActive] = useState(null);

  useEffect(() => {
    if (!imdbId) return;
    let cancelled = false;
    setData(null);
    getImdbHistogram(imdbId)
      .then((res) => !cancelled && setData(res))
      .catch(() => !cancelled && setData(null));
    return () => {
      cancelled = true;
    };
  }, [imdbId]);

  if (!data?.histogram?.length) return null;

  const max = Math.max(...data.histogram.map((b) => b.votes));
  const total =
    data.total || data.histogram.reduce((sum, b) => sum + b.votes, 0);
  const shown = data.histogram.find((b) => b.rating === active);

  return (
    <div className="rating-dist">
      <div className="rating-dist-head">
        <img src="/images/imdbicon.png" className="rating-dist-icon" alt="IMDb" />
        <span className="rating-dist-title">Rating distribution</span>
        <span className="rating-dist-readout">
          {shown
            ? `${shown.rating}/10 · ${shown.votes.toLocaleString()} votes · ` +
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
            aria-label={`${bucket.rating} out of 10: ${bucket.votes.toLocaleString()} votes`}
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
