import WatchlistComponent from "../components/WatchlistComponent.jsx";
import "../styles/Log.css";
import { useEffect, useState } from "react";
import { useWatchlist } from "../contexts/UserWatchlistContext.jsx";

function Watchlist() {
  const { userWatchlist, userWatchlistLoaded } = useWatchlist();
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, []);

  if (!userWatchlistLoaded) {
    return (
      <>
        <h1 style={{ alignSelf: "center", marginTop: "-20px" }}>
          Your Watchlist
        </h1>
        <div style={{ alignSelf: "center" }}>Loading watchlist...</div>
      </>
    );
  }

  const filteredWatchlist = userWatchlist.filter((item) => {
    if (!searchTerm.trim()) return true;
    const title = item.movie_object?.primaryTitle || "";
    return title.toLowerCase().includes(searchTerm.toLowerCase());
  });

  return (
    <div>
      <h1 style={{ textAlign: "center", marginTop: "-20px" }}>
        Your Watchlist
      </h1>
      <input
        type="text"
        placeholder="Search your watchlist..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        style={{
          padding: "8px",
          borderRadius: "6px",
          border: "1px solid #ccc",
          width: "300px",
          margin: "20px 0",
        }}
      />
      {filteredWatchlist.length === 0 && (
        <div>No watchlist items found for "{searchTerm}"!</div>
      )}
      <div className="logs-container-vertically-down">
        {filteredWatchlist
          .slice()
          .reverse()
          .map((watchlist_entry) =>
            watchlist_entry.id ? (
              <WatchlistComponent
                key={watchlist_entry.id}
                watchlist_id={watchlist_entry.id}
                movie={watchlist_entry.movie_object}
              />
            ) : null
          )}
      </div>
    </div>
  );
}

export default Watchlist;
