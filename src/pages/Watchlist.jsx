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
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        width: "100%",
      }}
    >
      <h1 style={{ textAlign: "center", marginTop: "-20px" }}>
        Your Watchlist
      </h1>
      <div style={{ height: "18px" }} />
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: "20px",
          gap: "10px",
        }}
      >
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
            textAlign: "center",
          }}
        />
        <span
          style={{
            fontWeight: "bold",
            background: "#ff0000",
            color: "white",
            borderRadius: "12px",
            padding: "2px 7px",
            fontSize: "0.95em",
            boxShadow: "0 1px 4px rgba(0,0,0,0.10)",
            letterSpacing: "0.5px",
            verticalAlign: "middle",
            display: "inline-block",
          }}
        >
          {filteredWatchlist.length}
        </span>
      </div>
      {filteredWatchlist.length === 0 && (
        <div style={{ textAlign: "center" }}>
          No watchlist items found for "{searchTerm}"!
        </div>
      )}
      <div
        style={{
          width: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
        }}
      >
        {filteredWatchlist
          .slice()
          .reverse()
          .map((watchlist_entry) =>
            watchlist_entry.id ? (
              <div
                style={{
                  marginBottom: "1rem",
                  width: "100%",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                }}
              >
                <WatchlistComponent
                  key={watchlist_entry.id}
                  watchlist_id={watchlist_entry.id}
                  movie={watchlist_entry.movie_object}
                />
              </div>
            ) : null
          )}
      </div>
    </div>
  );
}

export default Watchlist;
