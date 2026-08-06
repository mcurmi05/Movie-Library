import { useState } from "react";
import RatingHistoryModal from "./RatingHistoryModal";
import { getRatingDateInfo } from "../../utils/ratingDate";
import "../../styles/common/RatingDetails.css";

// The "Rated: <date>" line and history button that each row on the Ratings page
// carries, for the details pages, which show one title at a time. Renders
// nothing until the title has actually been rated.
export default function RatingDetails({
  title,
  createdAt,
  updatedAt,
  previousRating = null,
  dateUnknown = false,
  history = null,
  onDeleteEvent = null,
}) {
  const [showHistory, setShowHistory] = useState(false);
  const info = getRatingDateInfo(createdAt, updatedAt, previousRating, {
    dateUnknown,
  });
  if (!info) return null;

  // Latest date only - the full evolution lives in the history modal.
  const date = info.unknown
    ? info.lastUpdatedFormatted
    : info.changed
      ? info.updatedFormatted
      : info.ratedFormatted;

  return (
    <div className="rating-details">
      <span className="rating-details-date">Rated: {date}</span>
      {info.previousRating != null && (
        <span className="rating-details-prev">was {info.previousRating}</span>
      )}
      {history?.length > 0 && (
        <button
          type="button"
          className="rating-details-history"
          title="Rating history"
          aria-label="Rating history"
          onClick={() => setShowHistory(true)}
        >
          <svg
            width="15"
            height="15"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <circle cx="12" cy="12" r="10" />
            <path d="M12 6v6l4 2" />
          </svg>
        </button>
      )}
      {showHistory && (
        <RatingHistoryModal
          open={showHistory}
          title={title}
          history={history}
          onDeleteEvent={onDeleteEvent}
          onClose={() => setShowHistory(false)}
        />
      )}
    </div>
  );
}
