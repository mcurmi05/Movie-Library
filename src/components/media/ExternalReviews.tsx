import { useEffect, useState } from "react";
import {
  getImdbReviews,
  getLetterboxdReviews,
} from "../../services/externalReviews";
import "../../styles/media/ExternalReviews.css";

const PAGE = 5;

// Reviews from IMDb and Letterboxd, fetched live (never cached - they change
// too often to be worth a table). IMDb pages through a cursor; Letterboxd only
// gives us its twelve popular reviews at once, so "load more" just reveals the
// next few of those.

function ReviewCard({ review, source }) {
  const [expanded, setExpanded] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const hidden = review.spoiler && !revealed;

  return (
    <article className="xr-card">
      <div className="xr-card-head">
        <span className="xr-author">{review.author}</span>
        {review.rating != null && (
          <span className="xr-rating">
            {source === "letterboxd"
              ? `★ ${review.rating}`
              : `${review.rating}/10`}
          </span>
        )}
        {review.likes ? (
          <span className="xr-likes">{review.likes.toLocaleString()} likes</span>
        ) : null}
        <a
          className="xr-link"
          href={review.url}
          target="_blank"
          rel="noreferrer"
        >
          Read on {source === "letterboxd" ? "Letterboxd" : "IMDb"}
        </a>
      </div>

      {review.title && <p className="xr-title">{review.title}</p>}

      {hidden ? (
        <button className="xr-spoiler" onClick={() => setRevealed(true)}>
          This review contains spoilers — click to show
        </button>
      ) : (
        <p className={`xr-text${expanded ? "" : " is-clamped"}`}>
          {review.text}
        </p>
      )}

      {!hidden && review.text.length > 320 && (
        <button className="xr-more" onClick={() => setExpanded((v) => !v)}>
          {expanded ? "Show less" : "Show more"}
        </button>
      )}
    </article>
  );
}

function ExternalReviews({ imdbId, tmdbId, mediaType }) {
  // Letterboxd is film-only, so TV shows just get the IMDb tab.
  const hasLetterboxd = mediaType === "movie" && tmdbId != null;
  const [source, setSource] = useState(imdbId ? "imdb" : "letterboxd");

  const [imdb, setImdb] = useState(null); // { reviews, cursor, hasMore }
  const [lb, setLb] = useState(null); // full list, revealed in slices
  const [lbShown, setLbShown] = useState(PAGE);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    setImdb(null);
    setLb(null);
    setLbShown(PAGE);
  }, [imdbId, tmdbId]);

  // First page of whichever tab is open, fetched only once it's actually shown.
  useEffect(() => {
    if (source === "imdb" ? imdb || !imdbId : lb || !hasLetterboxd) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    const request =
      source === "imdb"
        ? getImdbReviews(imdbId, { first: PAGE }).then(
            (page) => !cancelled && setImdb(page),
          )
        : getLetterboxdReviews(tmdbId).then(
            (reviews) => !cancelled && setLb(reviews),
          );
    request
      .catch(() => !cancelled && setError("Couldn't load reviews."))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [source, imdbId, tmdbId, hasLetterboxd, imdb, lb]);

  const loadMore = async () => {
    if (source === "letterboxd") {
      setLbShown((n) => n + PAGE);
      return;
    }
    setLoading(true);
    try {
      const page = await getImdbReviews(imdbId, {
        first: PAGE,
        after: imdb.cursor,
      });
      setImdb((prev) => ({
        ...page,
        reviews: [...prev.reviews, ...page.reviews],
      }));
    } catch {
      setError("Couldn't load more reviews.");
    } finally {
      setLoading(false);
    }
  };

  if (!imdbId && !hasLetterboxd) return null;

  const reviews =
    source === "imdb"
      ? imdb?.reviews || []
      : (lb || []).slice(0, lbShown);
  const hasMore =
    source === "imdb" ? !!imdb?.hasMore : (lb?.length || 0) > lbShown;

  return (
    <div className="xr-section">
      <div className="xr-head">
        <p className="xr-heading">Reviews</p>
        {imdbId && hasLetterboxd && (
          <div className="xr-tabs">
            <button
              className={`xr-tab${source === "imdb" ? " is-active" : ""}`}
              onClick={() => setSource("imdb")}
            >
              IMDb
            </button>
            <button
              className={`xr-tab${source === "letterboxd" ? " is-active" : ""}`}
              onClick={() => setSource("letterboxd")}
            >
              Letterboxd
            </button>
          </div>
        )}
      </div>

      {error && <p className="xr-empty">{error}</p>}
      {!error && !reviews.length && (
        <p className="xr-empty">{loading ? "Loading reviews…" : "No reviews yet."}</p>
      )}

      <div className="xr-list">
        {reviews.map((review) => (
          <ReviewCard key={review.id} review={review} source={source} />
        ))}
      </div>

      {hasMore && (
        <button className="xr-load" onClick={loadMore} disabled={loading}>
          {loading ? "Loading…" : "Load more reviews"}
        </button>
      )}
    </div>
  );
}

export default ExternalReviews;
