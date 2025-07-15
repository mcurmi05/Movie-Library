import { useEffect, useId, useRef, useState } from "react";

import { format, isValid, parse } from "date-fns";
import { DayPicker } from "react-day-picker";

export function Dialog() {
  const dialogRef = useRef(null);
  const dialogId = useId();
  const headerId = useId();

  // Hold the month in state to control the calendar when the input changes
  const [month, setMonth] = useState(new Date());

  // Hold the selected date in state
  const [selectedDate, setSelectedDate] = useState(undefined);

  // Hold the input value in state
  const [inputValue, setInputValue] = useState("");

  // Hold the dialog visibility in state
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Function to toggle the dialog visibility
  const toggleDialog = () => setIsDialogOpen(!isDialogOpen);

  // Hook to handle the body scroll behavior and focus trapping
  useEffect(() => {
    const handleBodyScroll = (isOpen) => {
      document.body.style.overflow = isOpen ? "hidden" : "";
    };
    if (!dialogRef.current) return;
    if (isDialogOpen) {
      handleBodyScroll(true);
      dialogRef.current.showModal();
    } else {
      handleBodyScroll(false);
      dialogRef.current.close();
    }
    return () => {
      handleBodyScroll(false);
    };
  }, [isDialogOpen]);

  const handleDayPickerSelect = (date) => {
    if (!date) {
      setInputValue("");
      setSelectedDate(undefined);
    } else {
      setSelectedDate(date);
      setInputValue(format(date, "MM/dd/yyyy"));
    }
    dialogRef.current?.close();
  };

  const handleInputChange = (e) => {
    setInputValue(e.target.value); // Keep the input value in sync

    const parsedDate = parse(e.target.value, "MM/dd/yyyy", new Date());

    if (isValid(parsedDate)) {
      setSelectedDate(parsedDate);
      setMonth(parsedDate);
    } else {
      setSelectedDate(undefined);
    }
  };

  return (
    <div>
      <label htmlFor="date-input">
        <strong>Pick a Date: </strong>
      </label>
      <input
        style={{ fontSize: "inherit" }}
        id="date-input"
        type="text"
        value={inputValue}
        placeholder="MM/dd/yyyy"
        onChange={handleInputChange}
      />{" "}
      <button
        style={{ fontSize: "inherit" }}
        onClick={toggleDialog}
        aria-controls="dialog"
        aria-haspopup="dialog"
        aria-expanded={isDialogOpen}
        padding="0px"
      >
        📆
      </button>
      <p aria-live="assertive" aria-atomic="true">
        {selectedDate !== undefined
          ? selectedDate.toDateString()
          : "Please type or pick a date"}
      </p>
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
  );
}