import { useState, useRef, useEffect } from "react";
import Rating from "@mui/material/Rating";
import { useBookLogs } from "../contexts/UserBookLogsContext.jsx";
import { format } from "date-fns";
import { Dialog } from "./ReactDayPicker.jsx";

const BookLogCard = ({ bookLog }) => {
  const { deleteBookLog, updateBookLog } = useBookLogs();

  // Editable state
  const [text, setText] = useState(bookLog.log || "");
  const [saving, setSaving] = useState(false);
  const [buttonSaving, setButtonSaving] = useState(false);
  const [ratingSaving, setRatingSaving] = useState(false);
  const [textEdited, setTextEdited] = useState(false);
  const debounceTimeout = useRef(null);
  const textareaRef = useRef(null);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = textareaRef.current.scrollHeight + "px";
    }
  }, [text]);

  // Debounced text saving
  useEffect(() => {
    if (!textEdited) return;
    if (debounceTimeout.current) clearTimeout(debounceTimeout.current);

    setSaving(true);
    debounceTimeout.current = setTimeout(async () => {
      try {
        await updateBookLog(bookLog.id, { log: text });
        setSaving(false);
        setTextEdited(false);
        console.log("Updated book log text");
      } catch (error) {
        setSaving(false);
        console.error("Error updating book log:", error);
      }
    }, 2000);

    return () => clearTimeout(debounceTimeout.current);
  }, [text, textEdited, updateBookLog, bookLog.id]);

  const handleStartDateChange = async (newDate) => {
    try {
      setButtonSaving(true);
      // Use local timezone to avoid date shifting
      const year = newDate.getFullYear();
      const month = String(newDate.getMonth() + 1).padStart(2, '0');
      const day = String(newDate.getDate()).padStart(2, '0');
      const dateString = `${year}-${month}-${day}`;
      await updateBookLog(bookLog.id, { start_date: dateString });
      setTimeout(() => setButtonSaving(false), 1200);
    } catch (error) {
      setButtonSaving(false);
      console.error("Error updating start date:", error);
      alert("Failed to save start date. Please try again.");
    }
  };

  const handleEndDateChange = async (newDate) => {
    try {
      setButtonSaving(true);
      // Use local timezone to avoid date shifting
      const year = newDate.getFullYear();
      const month = String(newDate.getMonth() + 1).padStart(2, '0');
      const day = String(newDate.getDate()).padStart(2, '0');
      const dateString = `${year}-${month}-${day}`;
      await updateBookLog(bookLog.id, { end_date: dateString });
      setTimeout(() => setButtonSaving(false), 1200);
    } catch (error) {
      setButtonSaving(false);
      console.error("Error updating end date:", error);
      alert("Failed to save end date. Please try again.");
    }
  };

  const handleRatingChange = async (event, newValue) => {
    if (newValue === null) return; // Ignore null values
    
    try {
      setRatingSaving(true);
      await updateBookLog(bookLog.id, { book_rating: newValue });
      setTimeout(() => setRatingSaving(false), 1200);
    } catch (error) {
      setRatingSaving(false);
      console.error("Error updating rating:", error);
      alert("Failed to save rating. Please try again.");
    }
  };

  const handleClearRating = async () => {
    try {
      setRatingSaving(true);
      await updateBookLog(bookLog.id, { book_rating: null });
      setTimeout(() => setRatingSaving(false), 1200);
    } catch (error) {
      setRatingSaving(false);
      console.error("Error clearing rating:", error);
      alert("Failed to clear rating. Please try again.");
    }
  };

  const handleMarkRead = async () => {
    try {
      setButtonSaving(true);
      const today = new Date();
      const year = today.getFullYear();
      const month = String(today.getMonth() + 1).padStart(2, '0');
      const day = String(today.getDate()).padStart(2, '0');
      const dateString = `${year}-${month}-${day}`;
      await updateBookLog(bookLog.id, { end_date: dateString });
      setTimeout(() => setButtonSaving(false), 1200);
    } catch (error) {
      setButtonSaving(false);
      console.error("Error marking as read:", error);
      alert("Failed to mark as read. Please try again.");
    }
  };

  const handleMarkUnread = async () => {
    try {
      setButtonSaving(true);
      await updateBookLog(bookLog.id, { end_date: null });
      setTimeout(() => setButtonSaving(false), 1200);
    } catch (error) {
      setButtonSaving(false);
      console.error("Error marking as unread:", error);
      alert("Failed to mark as unread. Please try again.");
    }
  };

  const handleDelete = async () => {
    if (window.confirm("Are you sure you want to delete this book log?")) {
      try {
        await deleteBookLog(bookLog.id);
      } catch (error) {
        console.error("Error deleting book log:", error);
      }
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return null;
    try {
      return format(new Date(dateString), "MMM d, yyyy");
    } catch {
      return null;
    }
  };

  return (
    <div className="book-log-card">
      <div className="book-log-content">
        <div className="book-cover-section">
          {bookLog.cover_image ? (
            <img
              src={bookLog.cover_image}
              alt={`${bookLog.title} cover`}
              className="book-cover"
              onError={(e) => {
                e.target.style.display = "none";
                e.target.nextSibling.style.display = "flex";
              }}
            />
          ) : null}
          <div
            className={`book-cover-placeholder ${!bookLog.cover_image ? "show" : ""}`}
          >
            📚
          </div>
        </div>

        <div className="book-details">
          <div className="book-header">
            <h3 className="book-title">{bookLog.title}</h3>
            <button
              onClick={handleDelete}
              className="delete-btn"
              title="Delete log"
            >
              ×
            </button>
          </div>

          <p className="book-author">by {bookLog.author}</p>

          <div className="book-rating" style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <Rating
              value={bookLog.book_rating}
              onChange={handleRatingChange}
              max={10}
              size="small"
            />
            <span className="rating-number">({bookLog.book_rating && bookLog.book_rating > 0 ? bookLog.book_rating : '?'}/10)</span>
            {bookLog.book_rating && bookLog.book_rating > 0 && (
              <button
                onClick={handleClearRating}
                style={{
                  background: "none",
                  border: "none",
                  color: "#ff4444",
                  fontSize: "12px",
                  cursor: "pointer",
                  padding: "2px 4px",
                  borderRadius: "2px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center"
                }}
                title="Clear rating"
              >
                ×
              </button>
            )}
            {(saving || ratingSaving) && (
              <span className="saving-indicator" style={{ marginLeft: "8px", color: "#4CAF50", fontSize: "0.8em" }}>
                Saving...
              </span>
            )}
          </div>

          <div className="book-dates" style={{ display: "flex", alignItems: "center", gap: "20px", marginBottom: "12px" }}>
            <div className="book-date-field" style={{ display: "flex", alignItems: "center" }}>
              <span style={{ fontSize: "0.9rem", color: "#ccc", marginRight: "8px" }}>Started:</span>
              <Dialog
                initialDate={bookLog.start_date ? new Date(bookLog.start_date) : null}
                onDateChange={handleStartDateChange}
                showWeekday={false}
                dateColor="#ffffff"
                minWidth="120px"
              />
            </div>
            
            {bookLog.end_date ? (
              <div className="book-date-field" style={{ display: "flex", alignItems: "center" }}>
                <span style={{ fontSize: "0.9rem", color: "#ccc", marginRight: "8px" }}>Read:</span>
                <Dialog
                  initialDate={new Date(bookLog.end_date)}
                  onDateChange={handleEndDateChange}
                  showWeekday={false}  
                  dateColor="#ffffff"
                  minWidth="120px"
                />
                <button
                  onClick={handleMarkUnread}
                  disabled={buttonSaving}
                  title="Mark as unread"
                  style={{
                    marginLeft: "6px",
                    background: "none",
                    border: "none",
                    color: "#ff4444",
                    fontSize: "14px",
                    cursor: "pointer",
                    padding: "2px 4px",
                    borderRadius: "2px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    transform: "translateY(-2px)"
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.backgroundColor = "rgba(255, 68, 68, 0.1)";
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.backgroundColor = "transparent";
                  }}
                >
                  ×
                </button>
              </div>
            ) : (
              <button
                onClick={handleMarkRead}
                disabled={buttonSaving}
                style={{
                  padding: "6px 12px",
                  border: "1px solid #4CAF50",
                  borderRadius: "4px",
                  backgroundColor: "transparent",
                  color: "#4CAF50",
                  fontSize: "0.8rem",
                  cursor: "pointer",
                  transition: "all 0.2s",
                  transform: "translateY(-3px)"
                }}
                onMouseEnter={(e) => {
                  e.target.style.backgroundColor = "#4CAF50";
                  e.target.style.color = "#ffffff";
                }}
                onMouseLeave={(e) => {
                  e.target.style.backgroundColor = "transparent";
                  e.target.style.color = "#4CAF50";
                }}
              >
                {buttonSaving ? "Saving..." : "Mark as Read"}
              </button>
            )}
          </div>

          <div className="book-log-text">
            <textarea
              ref={textareaRef}
              value={text}
              onChange={(e) => {
                setText(e.target.value);
                setTextEdited(true);
              }}
              placeholder="Add notes about this book..."
              style={{
                width: "100%",
                minHeight: "60px",
                padding: "8px",
                border: "1px solid #555",
                borderRadius: "4px",
                backgroundColor: "#3b3b3b",
                color: "#ffffff",
                fontSize: "14px",
                resize: "none",
                overflow: "hidden",
                fontFamily: "inherit",
                lineHeight: "1.5",
                boxSizing: "border-box"
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default BookLogCard;
