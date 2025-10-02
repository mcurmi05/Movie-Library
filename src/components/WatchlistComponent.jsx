import Rating from "./Rating.jsx";
import "../styles/Rating.css";
import "../styles/LogComponent.css";
import { supabase } from "../services/supabase-client";
import { useState } from "react";
import { useWatchlist } from "../contexts/UserWatchlistContext.jsx";

export default function WatchlistComponent({ watchlist_id, movie, addedDate }) {
  const [visible, setVisible] = useState(true);
  const { removeWatchlist } = useWatchlist();

  async function deleteWatchlistClick() {
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
        onClick={deleteWatchlistClick}
      ></img>
    </div>
  );
}
