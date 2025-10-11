import { useEffect, useId, useRef, useState } from "react";
import { format } from "date-fns";
import { DayPicker } from "react-day-picker";

export function Dialog({
  initialDate,
  onDateChange,
  showWeekday,
  dateColor,
  iconGap = "10px",
  minWidth = "150px",
}) {
  const dialogRef = useRef(null);
  const dialogId = useId();
  const headerId = useId();

  const [month, setMonth] = useState(initialDate || new Date());
  const [selectedDate, setSelectedDate] = useState(initialDate || new Date());
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const toggleDialog = () => setIsDialogOpen(!isDialogOpen);

  useEffect(() => {
    if (!dialogRef.current) return;
    if (isDialogOpen) {
      document.body.style.overflow = "hidden";
      dialogRef.current.showModal();
    } else {
      document.body.style.overflow = "";
      dialogRef.current.close();
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isDialogOpen]);

  // When a date is picked
  const handleDayPickerSelect = (date) => {
    if (!date) {
      dialogRef.current?.close();
      return;
    }
    setSelectedDate(date);
    setMonth(date);
    setIsDialogOpen(false);
    if (onDateChange) onDateChange(date); // <-- Call parent handler
  };

  return (
    <>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: iconGap,
          justifyContent: "center",
          width: "100%",
        }}
      >
        <p
          style={{
            margin: 0,
            fontSize: "1.08rem",
            color: typeof dateColor === "string" ? dateColor : "#fff",
            textAlign: "center",
            minWidth: minWidth,
            fontWeight: 500,
            letterSpacing: "0.01em",
            textShadow: "0 1px 4px rgba(0,0,0,0.25)",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
            flexShrink: 0,
          }}
        >
          {selectedDate
            ? showWeekday
              ? format(selectedDate, "EEE, dd MMM yyyy")
              : format(selectedDate, "dd MMM yyyy")
            : "Pick a date"}
        </p>
        <img
          onClick={toggleDialog}
          aria-controls="dialog"
          aria-haspopup="dialog"
          aria-expanded={isDialogOpen}
          style={{ padding: 0, cursor: "pointer" }}
          src="/calendar.png"
          width="20px"
          alt="Pick a date"
        />
      </div>
      {isDialogOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.4)",
            zIndex: 1000,
          }}
        />
      )}
      <div style={{ display: "flex", justifyContent: "center" }}>
        <dialog
          role="dialog"
          ref={dialogRef}
          id={dialogId}
          aria-modal
          aria-labelledby={headerId}
          onClose={() => setIsDialogOpen(false)}
        >
          <DayPicker
            month={month}
            onMonthChange={setMonth}
            autoFocus
            mode="single"
            selected={selectedDate}
            onSelect={handleDayPickerSelect}
            footer={
              selectedDate !== undefined &&
              `Selected: ${selectedDate.toDateString()}`
            }
          />
        </dialog>
      </div>
    </>
  );
}
