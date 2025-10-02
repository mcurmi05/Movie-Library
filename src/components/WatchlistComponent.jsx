import Rating from "./Rating.jsx";
import "../styles/Rating.css";
import "../styles/LogComponent.css";
import { supabase } from "../services/supabase-client";
import { useState } from "react";
import Modal from "@mui/material/Modal";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import { useWatchlist } from "../contexts/UserWatchlistContext.jsx";

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

export default function WatchlistComponent({ watchlist_id, movie, addedDate }) {
  const [visible, setVisible] = useState(true);
  const { removeWatchlist } = useWatchlist();

  const [showDeleteModal, setShowDeleteModal] = useState(false);

  async function confirmDeleteWatchlist() {
    const { error } = await supabase
      .from("watchlist")
      .delete()
      .eq("id", watchlist_id);
    removeWatchlist(watchlist_id);
    if (error) {
      console.error("Error deleting watchlist entry:", error);
    } else {
      setVisible(false);
    }
    setShowDeleteModal(false);
  }

  if (!visible) return null;
  const formattedDate = addedDate
    ? new Date(addedDate).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    : "";
  return (
    <div className="log-rating-wrapper">
      <Rating
        key={watchlist_id}
        movie_object={movie}
        ratingDate={null}
        addedToWatchlistDate={
          formattedDate !== "Invalid Date" ? formattedDate : null
        }
      />
      <img
        src="/logdelete.png"
        className="log-delete-icon"
        onClick={() => setShowDeleteModal(true)}
      ></img>
      <Modal
        open={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        aria-labelledby="delete-watchlist-modal-title"
      >
        <Box sx={modalStyle}>
          <div
            style={{
              textAlign: "center",
              marginBottom: "18px",
              fontWeight: "bold",
            }}
          >
            Are you sure you want to remove this from your watchlist?
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
              onClick={confirmDeleteWatchlist}
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
              Remove
            </Button>
          </Box>
        </Box>
      </Modal>
    </div>
  );
}
