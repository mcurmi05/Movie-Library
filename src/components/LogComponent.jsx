import Rating from "./Rating.jsx";
import "../styles/Rating.css";
import "../styles/LogComponent.css";
import { supabase } from "../services/supabase-client";
import { useState } from "react";
import Modal from "@mui/material/Modal";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import { useLogs } from "../contexts/UserLogsContext.jsx";
import { useRef } from "react";
import { useEffect } from "react";
import { Dialog } from "../components/ReactDayPicker.jsx";

const modalStyle = {
  position: "absolute",
  top: "50%",
  left: "50%",
  transform: "translate(-50%, -50%)",
  width: 400,
  bgcolor: "#1a1a1a",
  color: "white",
  boxShadow: 24,
  p: 4,
  borderRadius: 2,
  fontWeight: "bold",
};

export default function LogComponent({ log_id, movie, logtext, created_at }) {
  const [visible, setVisible] = useState(true);
  const {
    removeLog,
    updateLog,
    updateDate,
    userLogs,
    addSeason,
    updateSeasonDate,
    removeSeason,
    setSeasonFinished,
  } = useLogs();
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const [text, setText] = useState(logtext);
  const debounceTimeout = useRef(null);

  const [saving, setSaving] = useState(false);
  const [textEdited, setTextEdited] = useState(false);

  const textareaRef = useRef(null);

  const isTV =
    movie &&
    (movie.type?.toLowerCase?.().includes("tv") ||
      (movie.titleType &&
        String(movie.titleType).toLowerCase().includes("tv")) ||
      movie.episodes);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "100px";
      textareaRef.current.style.height =
        textareaRef.current.scrollHeight + "px";
    }
  }, [text]);

  async function handleDateChange(newDate) {
    const isoDate = newDate.toISOString();
    setSaving(true);
    const { error } = await supabase
      .from("logs")
      .update({ created_at: isoDate })
      .eq("id", log_id);

    if (!error) {
      updateDate(log_id, isoDate);
      setTimeout(() => setSaving(false), 1200);
    } else {
      setSaving(false);
      alert("Failed to save date. Please try again.");
      console.error("Error updating date:", error);
    }
  }

  async function confirmDeleteLog() {
    const { error } = await supabase.from("logs").delete().eq("id", log_id);
    removeLog(log_id);
    if (error) {
      console.error("Error deleting log:", error);
    } else {
      setVisible(false);
    }
    setShowDeleteModal(false);
  }

  useEffect(() => {
    if (!visible || !textEdited) return;
    if (debounceTimeout.current) clearTimeout(debounceTimeout.current);
    setSaving(true);
    debounceTimeout.current = setTimeout(async () => {
      const { error } = await supabase
        .from("logs")
        .update({ log: text })
        .eq("id", log_id);
      if (!error) {
        updateLog(log_id, text);
        setSaving(false);
        setTextEdited(false);
        console.log("Updated log");
      } else {
        setSaving(false);
        console.error("Error updating log:", error);
      }
    }, 2000);
    return () => clearTimeout(debounceTimeout.current);
  }, [text, visible, created_at, movie, textEdited, updateLog, log_id]);

  if (!visible) return null;
  return (
    //i am fully aware of how lazy this is
    <div className="log-rating-wrapper">
      <Rating key={log_id} movie_object={movie} ratingDate="today"></Rating>
      {!isTV && (
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            marginBottom: "18px",
          }}
        >
          <div
            className="date-picker-log"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: "100%",
              paddingLeft: "200px",
            }}
          >
            <Dialog
              initialDate={created_at ? new Date(created_at) : new Date()}
              onDateChange={handleDateChange}
              showWeekday={true}
              dateColor="#fff"
            />
          </div>
        </div>
      )}

      {/* Seasons UI for TV/mini-series entries */}
      {movie &&
        (movie.type?.toLowerCase?.().includes("tv") ||
          (movie.titleType &&
            String(movie.titleType).toLowerCase().includes("tv")) ||
          movie.episodes) && (
          <div style={{ width: "100%", marginBottom: "12px" }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                marginBottom: "8px",
              }}
            >
              <strong>Seasons</strong>
              <button
                onClick={() => addSeason(log_id)}
                style={{
                  background: "#222",
                  color: "white",
                  border: "1px solid #444",
                  padding: "4px 8px",
                  borderRadius: 6,
                }}
              >
                +
              </button>
            </div>
            <div
              style={{ display: "flex", flexDirection: "column", gap: "8px" }}
            >
              {(userLogs.find((l) => l.id === log_id)?.season_info || []).map(
                (s, idx, arr) => (
                  <div
                    key={idx}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "12px",
                      flexWrap: "wrap",
                    }}
                  >
                    <div style={{ minWidth: 80 }}>
                      Season {s.season || idx + 1}
                    </div>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                      }}
                    >
                      <div style={{ fontSize: "0.9rem", color: "#ccc" }}>
                        Start:
                      </div>
                      <Dialog
                        initialDate={
                          s.start_date ? new Date(s.start_date) : new Date()
                        }
                        onDateChange={(d) =>
                          updateSeasonDate(
                            log_id,
                            idx,
                            "start_date",
                            d.toISOString()
                          )
                        }
                        showWeekday={false}
                        dateColor="#fff"
                      />

                      {/* finished toggle - when not finished allow marking finished */}
                      {!s.finished ? (
                        <button
                          onClick={() => setSeasonFinished(log_id, idx, true)}
                          aria-label="Mark season finished"
                          title="Mark season finished"
                          style={{
                            background: "#444",
                            color: "white",
                            border: "none",
                            borderRadius: 6,
                            padding: "6px",
                            marginLeft: 8,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          {/* check icon */}
                          <svg
                            width="16"
                            height="16"
                            viewBox="0 0 24 24"
                            fill="none"
                            xmlns="http://www.w3.org/2000/svg"
                            aria-hidden
                          >
                            <path
                              d="M20 6L9 17L4 12"
                              stroke="white"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        </button>
                      ) : (
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "8px",
                            marginLeft: 8,
                          }}
                        >
                          {/* green check circle */}
                          <svg
                            width="18"
                            height="18"
                            viewBox="0 0 24 24"
                            fill="none"
                            xmlns="http://www.w3.org/2000/svg"
                            aria-hidden
                          >
                            <circle cx="12" cy="12" r="10" fill="#2ecc71" />
                            <path
                              d="M9 12.5L11 14.5L15 10.5"
                              stroke="white"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                          <div style={{ fontSize: "0.9rem", color: "#ccc" }}>
                            End:
                          </div>
                          <Dialog
                            initialDate={
                              s.end_date ? new Date(s.end_date) : new Date()
                            }
                            onDateChange={(d) =>
                              updateSeasonDate(
                                log_id,
                                idx,
                                "end_date",
                                d.toISOString()
                              )
                            }
                            showWeekday={false}
                            dateColor="#fff"
                          />
                          <button
                            onClick={() =>
                              setSeasonFinished(log_id, idx, false)
                            }
                            aria-label="Undo finished"
                            title="Undo finished"
                            style={{
                              background: "transparent",
                              color: "white",
                              border: "none",
                              borderRadius: 6,
                              padding: "6px",
                              display: "flex",
                              alignItems: "center",
                            }}
                          >
                            {/* circular arrow */}
                            <svg
                              width="16"
                              height="16"
                              viewBox="0 0 24 24"
                              fill="none"
                              xmlns="http://www.w3.org/2000/svg"
                              aria-hidden
                            >
                              <path
                                d="M21 12A9 9 0 1 0 12 21"
                                stroke="#ccc"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                              <path
                                d="M21 3v6h-6"
                                stroke="#ccc"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                            </svg>
                          </button>
                        </div>
                      )}
                    </div>
                    {/* show remove button only for the last season */}
                    {idx === arr.length - 1 && (
                      <button
                        onClick={() => removeSeason(log_id)}
                        style={{
                          background: "#ff4d4f",
                          color: "white",
                          border: "none",
                          borderRadius: 4,
                          padding: "4px 6px",
                          marginLeft: 8,
                        }}
                        title="Remove newest season"
                      >
                        ×
                      </button>
                    )}
                  </div>
                )
              )}
            </div>
          </div>
        )}
      <textarea
        ref={textareaRef}
        className="log-input"
        value={text}
        onInput={(e) => {
          e.target.style.height = "100px";
          e.target.style.height = e.target.scrollHeight + "px";
          setText(e.target.value);
          //open to suggestions on a better way to do this lol
          setTextEdited(true);
        }}
      ></textarea>
      <img
        src="/logdelete.png"
        className="log-delete-icon"
        onClick={() => setShowDeleteModal(true)}
      ></img>
      <Modal
        open={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        aria-labelledby="delete-log-modal-title"
      >
        <Box sx={modalStyle}>
          <div
            style={{
              textAlign: "center",
              marginBottom: "18px",
              fontWeight: "bold",
            }}
          >
            Are you sure you want to delete this log?
          </div>
          <Box
            sx={{
              display: "flex",
              gap: 2,
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <Button
              variant="outlined"
              onClick={() => setShowDeleteModal(false)}
              sx={{
                color: "white",
                borderColor: "#666",
                "&:hover": { borderColor: "#888" },
                fontWeight: "bold",
                textTransform: "none",
                "&.Mui-focusVisible": {
                  boxShadow: "none",
                  outline: "none",
                  borderColor: "#666",
                },
              }}
            >
              Cancel
            </Button>
            <Button
              variant="contained"
              onClick={confirmDeleteLog}
              sx={{
                backgroundColor: "#ff0000ff",
                "&:hover": { backgroundColor: "#cc0000" },
                fontWeight: "bold",
                textTransform: "none",
                "&.Mui-focusVisible": {
                  boxShadow: "none",
                  outline: "none",
                  borderColor: "#ff0000ff",
                },
              }}
            >
              Delete
            </Button>
          </Box>
        </Box>
      </Modal>
      {
        <div style={{ fontSize: "0.9rem", color: "#888", marginTop: "4px" }}>
          {saving ? (
            <p>Saving, please don't refresh or click away...</p>
          ) : (
            <br></br>
          )}
        </div>
      }
    </div>
  );
}
