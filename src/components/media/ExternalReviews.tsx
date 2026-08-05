import { useCallback, useEffect, useState } from "react";
import {
  getImdbReviews,
  getLetterboxdReviews,
} from "../../services/externalReviews";
import "../../styles/media/ExternalReviews.css";

const PAGE = 5;

const IMDB_SORTS = [
  { value: "helpful", label: "Most helpful" },
  { value: "votes", label: "Most votes" },
  { value: "newest", label: "Newest" },
  { value: "highest", label: "Highest rated" },
  { value: "lowest", label: "Lowest rated" },
];

const IMDB_RATINGS = [10, 9, 8, 7, 6, 5, 4, 3, 2, 1];
const LB_RATINGS = [5, 4.5, 4, 3.5, 3, 2.5, 2, 1.5, 1, 0.5];

// Reviews from IMDb and Letterboxd, fetched live (never cached - they change
// too often to be worth a table). IMDb pages through a cursor for as long as it
// has more; Letterboxd only hands over the twelve reviews on the film page
// (everything deeper is behind a bot challenge), so once those run out we link
// out to the site instead.

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
  const [sort, setSort] = useState("helpful");
  const [rating, setRating] = useState("");

  const [imdb, setImdb] = useState(null); // { reviews, cursor, hasMore }
  const [lb, setLb] = useState(null); // full list, revealed in slices
  const [lbShown, setLbShown] = useState(PAGE);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Rating filters are per-scale, so switching tabs drops the current one.
  useEffect(() => {
    setRating("");
  }, [source]);

  useEffect(() => {
    setImdb(null);
    setLb(null);
    setLbShown(PAGE);
  }, [imdbId, tmdbId]);

  // Sort and filter are server-side on IMDb, so a change means a fresh page.
  useEffect(() => {
    setImdb(null);
  }, [sort, rating]);

  const loadImdb = useCallback(
    (after) =>
      getImdbReviews(imdbId, {
        first: PAGE,
        after,
        sort,
        rating: Number(rating) || null,
      }),
    [imdbId, sort, rating],
  );

  // First page of whichever tab is open, fetched only once it's actually shown.
  useEffect(() => {
    if (source === "imdb" ? imdb || !imdbId : lb || !hasLetterboxd) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    const request =
      source === "imdb"
        ? loadImdb().then((page) => !cancelled && setImdb(page))
        : getLetterboxdReviews(tmdbId).then(
            // Letterboxd's own order is "popular", which is close to but not
            // exactly likes; sort it properly here.
            (reviews) =>
              !cancelled &&
              setLb([...reviews].sort((a, b) => (b.likes || 0) - (a.likes || 0))),
          );
    request
      .catch(() => !cancelled && setError("Couldn't load reviews."))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [source, imdbId, tmdbId, hasLetterboxd, imdb, lb, loadImdb]);

  const loadMore = async () => {
    if (source === "letterboxd") {
      setLbShown((n) => n + PAGE);
      return;
    }
    setLoading(true);
    try {
      const page = await loadImdb(imdb.cursor);
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

  const isLb = source === "letterboxd";
  const filteredLb = (lb || []).filter(
    (r) => !rating || r.rating === Number(rating),
  );
  const reviews = isLb ? filteredLb.slice(0, lbShown) : imdb?.reviews || [];
  const hasMore = isLb ? filteredLb.length > lbShown : !!imdb?.hasMore;
  // Where to send anyone who wants to keep scrolling past what we can show.
  const allReviewsUrl = isLb
    ? lb?.[0]?.slug && `https://letterboxd.com/film/${lb[0].slug}/reviews/by/activity/`
    : imdbId && `https://www.imdb.com/title/${imdbId}/reviews/`;

  return (
    <div className="xr-section">
      <div className="xr-head">
        <p className="xr-heading">Reviews</p>
        {imdbId && hasLetterboxd && (
          <div className="xr-tabs">
            <button
              className={`xr-tab${!isLb ? " is-active" : ""}`}
              onClick={() => setSource("imdb")}
            >
              IMDb
            </button>
            <button
              className={`xr-tab${isLb ? " is-active" : ""}`}
              onClick={() => setSource("letterboxd")}
            >
              Letterboxd
            </button>
          </div>
        )}
      </div>

      <div className="xr-controls">
        {!isLb && (
          <select
            className="xr-select"
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            aria-label="Sort reviews"
          >
            {IMDB_SORTS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        )}
        <select
          className="xr-select"
          value={rating}
          onChange={(e) => setRating(e.target.value)}
          aria-label="Filter reviews by rating"
        >
          <option value="">All ratings</option>
          {(isLb ? LB_RATINGS : IMDB_RATINGS).map((value) => (
            <option key={value} value={value}>
              {isLb ? `★ ${value}` : `${value}/10`}
            </option>
          ))}
        </select>
      </div>

      {error && <p className="xr-empty">{error}</p>}
      {!error && !reviews.length && (
        <p className="xr-empty">
          {loading ? "Loading reviews…" : "No reviews match that filter."}
        </p>
      )}

      <div className="xr-list">
        {reviews.map((review) => (
          <ReviewCard key={review.id} review={review} source={source} />
        ))}
      </div>

      <div className="xr-foot">
        {hasMore && (
          <button className="xr-load" onClick={loadMore} disabled={loading}>
            {loading ? "Loading…" : "Load more reviews"}
          </button>
        )}
        {!hasMore && reviews.length > 0 && allReviewsUrl && (
          <a
            className="xr-load"
            href={allReviewsUrl}
            target="_blank"
            rel="noreferrer"
          >
            Continue on {isLb ? "Letterboxd" : "IMDb"}
          </a>
        )}
      </div>
    </div>
  );
}

export default ExternalReviews;
