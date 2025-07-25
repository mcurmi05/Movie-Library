import Rating from "./Rating.jsx";
import "../styles/Rating.css";
import "../styles/LogComponent.css";
import { supabase } from "../services/supabase-client";
import { useState } from "react";
import { useLogs } from "../contexts/UserLogsContext.jsx";
import { useRef } from "react";
import { useEffect } from "react";
import { Dialog } from "../components/ReactDayPicker.jsx";

export default function LogComponent({ log_id, movie, logtext, created_at }) {
  const [visible, setVisible] = useState(true);
  const { removeLog, updateLog, updateDate } = useLogs();

  const [text, setText] = useState(logtext);
  const debounceTimeout = useRef(null);

  const [saving, setSaving] = useState(false);
  const [textEdited, setTextEdited] = useState(false);

  const textareaRef = useRef(null);

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

  async function deleteLogClick() {
    const { error } = await supabase.from("logs").delete().eq("id", log_id);

    removeLog(log_id);

    if (error) {
      console.error("Error deleting log:", error);
    } else {
      setVisible(false);
    }
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
        onClick={deleteLogClick}
      ></img>
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
