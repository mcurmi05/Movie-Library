import { useStorygraphRating } from "./StorygraphRatingsContext";
import "./StorygraphInfo.css";
import { formatCountParens } from "../../../utils/formatCount";

export default function StorygraphInfo({ book, live = false }) {
  const hardcoverId =
    book?.hardcover_id || book?.book_entries?.hardcover_id || null;
  const data = useStorygraphRating(hardcoverId, { live });
  if (!hardcoverId) return null;
  const isLoading = data === undefined;
  const slug =
    data?.slug ||
    book?.storygraph_slug ||
    book?.book_entries?.storygraph_slug ||
    null;
  const isbn13 = book?.isbn13 || book?.book_entries?.isbn13 || null;
  const title = book?.title || book?.book_entries?.title || "";
  const author = book?.author || book?.book_entries?.author || "";
  const searchTerm = `${title} ${author}`.trim() || isbn13;
  const href = slug
    ? `https://app.thestorygraph.com/books/${slug}`
    : searchTerm
      ? `https://app.thestorygraph.com/search?search_term=${encodeURIComponent(searchTerm)}`
      : undefined;

  return (
    <a
      href={href}
      target={href ? "_blank" : undefined}
      rel={href ? "noreferrer" : undefined}
      className="storygraph-rating"
      title="StoryGraph rating out of 5"
      aria-disabled={!href}
    >
      <img
        src="/images/storygraph.png"
        className="storygraph-movie-card"
        alt="StoryGraph"
      />
      <span className="star-movie-card storygraph-star" aria-hidden="true" />
      <p
        style={{ opacity: isLoading ? 0 : 1 }}
      >
        {data?.rating != null
          ? Number(data.rating).toFixed(2)
          : isLoading
            ? ""
            : "No ratings yet"}{" "}
        {formatCountParens(data?.ratingCount)}
      </p>
    </a>
  );
}
