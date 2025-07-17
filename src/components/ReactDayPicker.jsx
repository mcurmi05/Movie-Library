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
      dialogRef.current?.close();
      return;
    }
    setSelectedDate(date);
    setInputValue(format(date, "dd/MM/yyyy"));
    dialogRef.current?.close();
  };

  return (
    
      <>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>

          <p aria-live="assertive" aria-atomic="true" style={{ margin: 0 }}>
            {selectedDate !== undefined
              ? selectedDate.toDateString()
              : "Enter a log date"}
          </p>

          <img
            onClick={toggleDialog}
            aria-controls="dialog"
            aria-haspopup="dialog"
            aria-expanded={isDialogOpen}
            style={{ padding: 0, cursor: "pointer" }} 
            src="/calendar.png"
            width="20px"
          />
          
        </div>

        {isDialogOpen && (
              //Makes background dark
              <div style={{
                  position: "fixed",
                  inset: 0,
                  background: "rgba(0,0,0,0.4)",
                  zIndex: 1000}}/>
              )}


              <div style={{display:"flex", justifyContent:"center"}}>
                  <dialog
                    role="dialog"
                    ref={dialogRef}
                    id={dialogId}
                    aria-modal
                    aria-labelledby={headerId}
                    onClose={() => setIsDialogOpen(false)}>

                    <DayPicker
                      month={month}
                      onMonthChange={setMonth}
                      autoFocus
                      mode="single"
                      selected={selectedDate}
                      onSelect={handleDayPickerSelect}
                      footer={
                        selectedDate !== undefined &&
                        `‎ ‎ ‎ ‎ Selected: ${selectedDate.toDateString()}`
          }/>
      
            </dialog>
      </div>
    </>
  );
}