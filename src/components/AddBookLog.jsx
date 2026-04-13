import { useState } from "react";
import { useAuth } from "../contexts/AuthContext.jsx";
import { useBookLogs } from "../contexts/UserBookLogsContext.jsx";
import { Dialog } from "./ReactDayPicker.jsx";
import Rating from "@mui/material/Rating";
import "../styles/AddLog.css";

const AddBookLog = ({ isOpen, onClose }) => {
  const { user } = useAuth();
  const { createBookLog } = useBookLogs();

  const [formData, setFormData] = useState({
    title: "",
    author: "",
    cover_image: "",
    book_rating: 0,
    start_date: null,
    end_date: null,
    log: "",
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasFinished, setHasFinished] = useState(false);

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleFinishedChange = (finished) => {
    setHasFinished(finished);
    if (!finished) {
      // Clear end date if user unchecks finished
      setFormData((prev) => ({
        ...prev,
        end_date: null,
      }));
    }
  };

  const formatDateForDB = (date) => {
    if (!date) return null;
    // Use local timezone to avoid date shifting
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user) return;

    console.log("Form submitted with data:", formData);
    setIsSubmitting(true);
    try {
      const bookLogData = {
        ...formData,
        user_id: user.id,
        start_date: formatDateForDB(formData.start_date),
        end_date: formatDateForDB(formData.end_date),
      };

      console.log("Sending to createBookLog:", bookLogData);
      const result = await createBookLog(bookLogData);
      console.log("Book log created successfully:", result);

      // Reset form
      setFormData({
        title: "",
        author: "",
        cover_image: "",
        book_rating: 0,
        start_date: null,
        end_date: null,
        log: "",
      });
      setHasFinished(false);

      console.log("Closing modal");
      onClose();
    } catch (error) {
      console.error("Error creating book log:", error);
      alert("Failed to create book log: " + (error.message || error));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Add Book Log</h2>
          <button className="modal-close" onClick={onClose}>
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="book-log-form">
          <div className="form-field">
            <label htmlFor="title">Title *</label>
            <input
              id="title"
              type="text"
              value={formData.title}
              onChange={(e) => handleInputChange("title", e.target.value)}
              required
            />
          </div>

          <div className="form-field">
            <label htmlFor="author">Author *</label>
            <input
              id="author"
              type="text"
              value={formData.author}
              onChange={(e) => handleInputChange("author", e.target.value)}
              required
            />
          </div>

          <div className="form-field">
            <label htmlFor="cover_image">Cover Image URL</label>
            <input
              id="cover_image"
              type="url"
              value={formData.cover_image}
              onChange={(e) => handleInputChange("cover_image", e.target.value)}
              placeholder="https://example.com/book-cover.jpg"
            />
          </div>

          <div className="form-field">
            <label>Rating *</label>
            <Rating
              name="book-rating"
              value={formData.book_rating}
              onChange={(event, newValue) => {
                handleInputChange("book_rating", newValue || 0);
              }}
              max={10}
              size="large"
            />
          </div>

          <div className="form-field-row">
            <div className="form-field">
              <label>Start Date</label>
              <Dialog
                initialDate={formData.start_date}
                onDateChange={(date) => handleInputChange("start_date", date)}
                showWeekday={true}
                dateColor="#ffffff"
                minWidth="120px"
              />
            </div>

            <div className="form-field">
              <label
                style={{ display: "flex", alignItems: "center", gap: "8px" }}
              >
                <input
                  type="checkbox"
                  checked={hasFinished}
                  onChange={(e) => handleFinishedChange(e.target.checked)}
                  style={{ margin: 0 }}
                />
                I have finished reading this book
              </label>
            </div>
          </div>

          {hasFinished && (
            <div className="form-field">
              <label>End Date</label>
              <Dialog
                initialDate={formData.end_date}
                onDateChange={(date) => handleInputChange("end_date", date)}
                showWeekday={true}
                dateColor="#ffffff"
                minWidth="120px"
              />
            </div>
          )}

          <div className="form-field">
            <label htmlFor="log">Log/Notes</label>
            <textarea
              id="log"
              value={formData.log}
              onChange={(e) => handleInputChange("log", e.target.value)}
              rows={4}
              placeholder="Your thoughts about this book..."
            />
          </div>

          <div className="modal-actions">
            <button type="button" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !formData.title || !formData.author}
            >
              {isSubmitting ? "Adding..." : "Add Book Log"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddBookLog;
