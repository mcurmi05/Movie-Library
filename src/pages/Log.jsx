import LogComponent from "../components/LogComponent.jsx";
import { useRatings } from "../contexts/UserRatingsContext.jsx";
import "../styles/Log.css";
import { useLogs } from "../contexts/UserLogsContext.jsx";
import { useEffect, useState } from "react";
//
function Log() {
  const { userLogs, userLogsLoaded } = useLogs();
  const { userRatings } = useRatings();
  const [searchTerm, setSearchTerm] = useState("");
  const [ratingFilter, setRatingFilter] = useState("all");
  const [mediaTypeFilter, setMediaTypeFilter] = useState("all");

  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, []);

  if (!userLogsLoaded) {
    return (
      <>
        <h1 style={{ alignSelf: "center", marginTop: "-20px" }}>Your Log</h1>
        <div style={{ alignSelf: "center" }}>Loading log...</div>
      </>
    );
  }

  const filteredLogs = userLogs.filter((log) => {
    // Filter by media type
    if (mediaTypeFilter !== "all") {
      const type = (log.movie_object?.type || "").toLowerCase();
      const titleType = (log.movie_object?.titleType || "").toLowerCase();
      const isTV =
        type.includes("tv") ||
        titleType.includes("tv") ||
        log.movie_object?.episodes;
      if (mediaTypeFilter === "movies" && isTV) return false;
      if (mediaTypeFilter === "tv" && !isTV) return false;
    }
    // Filter by search term
    if (searchTerm.trim()) {
      const title = log.movie_object?.primaryTitle || "";
      if (!title.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    }
    // Filter by rating value (if present)
    if (ratingFilter !== "all") {
      // Find rating from userRatings context
      let ratingValue = null;
      if (log.movie_object && log.movie_object.id) {
        const found = userRatings.find(
          (r) => r.imdb_movie_id === log.movie_object.id
        );
        if (found) ratingValue = found.rating;
      }
      if (ratingValue === null) return false;
      if (Number(ratingValue) !== Number(ratingFilter)) return false;
    }
    return true;
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
      <h1 style={{ textAlign: "center", marginTop: "-20px" }}>Your Log</h1>
      <div style={{ height: "18px" }} />
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: "20px",
          gap: "10px",
          flexWrap: "wrap",
        }}
      >
        <input
          className="filter-input"
          type="text"
          placeholder="Search..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{
            padding: "8px",
            borderRadius: "6px",
            border: "1px solid #ccc",
            width: "180px",
            textAlign: "center",
            margin: "6px",
            backgroundColor: "#3b3b3b",
            color: "#ffffff",
          }}
        />
        <select
          value={mediaTypeFilter}
          onChange={(e) => setMediaTypeFilter(e.target.value)}
          style={{
            height: "32px",
            padding: "0 10px",
            border: "1px solid #cccccc",
            borderRadius: "6px",
            backgroundColor: "#3b3b3b",
            color: "#ffffff",
            fontSize: "0.8rem",
            outline: "none",
            textAlign: "center",
            margin: "6px",
          }}
        >
          <option value="all">Movies & TV</option>
          <option value="movies">Movies</option>
          <option value="tv">TV</option>
        </select>
        <select
          value={ratingFilter}
          onChange={(e) => setRatingFilter(e.target.value)}
          style={{
            height: "32px",
            padding: "0 10px",
            border: "1px solid #cccccc",
            borderRadius: "6px",
            backgroundColor: "#3b3b3b",
            color: "#ffffff",
            fontSize: "0.8rem",
            fontweight: "bold",
            outline: "none",
            textAlign: "center",
            margin: "6px",
          }}
        >
          <option value="all" style={{ whiteSpace: "nowrap" }}>
            All Ratings
          </option>
          {[...Array(10)].map((_, i) => (
            <option key={10 - i} value={10 - i}>
              {10 - i}
            </option>
          ))}
        </select>
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
            margin: "6px",
          }}
        >
          {filteredLogs.length}
        </span>
      </div>
      {filteredLogs.length === 0 && (
        <div style={{ textAlign: "center" }}>
          No logs match your applied filters
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
        {filteredLogs.map((log) =>
          log.id ? (
            <div
              style={{
                marginBottom: "1rem",
                width: "100%",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
              }}
            >
              <LogComponent
                key={log.id}
                log_id={log.id}
                created_at={log.created_at}
                movie={log.movie_object}
                logtext={log.log}
              />
            </div>
          ) : null
        )}
      </div>
    </div>
  );
}

export default Log;
