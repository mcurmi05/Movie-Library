import { useRatings } from "../contexts/UserRatingsContext.jsx";
import Rating from "../components/Rating.jsx";
import { useState } from "react";

function Ratings() {
  const { userRatings, userRatingsLoaded } = useRatings();
  const [searchTerm, setSearchTerm] = useState("");

  if (!userRatingsLoaded) {
    return (
      <>
        <h1 style={{ alignSelf: "center", marginTop: "-20px" }}>
          Your Ratings
        </h1>
        <div style={{ alignSelf: "center" }}>Loading ratings...</div>
      </>
    );
  }

  const filteredRatings = userRatings.filter((rating) => {
    if (!searchTerm.trim()) return true;
    const title = rating.movie_object?.primaryTitle || "";
    return title.toLowerCase().includes(searchTerm.toLowerCase());
  });

  // Sort ratings by created_at descending (newest first)
  const sortedRatings = filteredRatings.slice().sort((a, b) => {
    const dateA = new Date(a.created_at);
    const dateB = new Date(b.created_at);
    return dateB - dateA;
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
      <h1 style={{ textAlign: "center", marginTop: "-20px" }}>Your Ratings</h1>
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
          placeholder="Search your rated movies/shows..."
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
          {userRatings.length}
        </span>
      </div>
      {sortedRatings.length === 0 && (
        <div style={{ textAlign: "center" }}>
          No ratings found for "{searchTerm}"!
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
        {sortedRatings.map((rating) => (
          <div
            key={rating.id || rating.imdb_movie_id}
            style={{
              marginBottom: "1rem",
              width: "100%",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
            }}
          >
            <div className="div-wrapper-rating-testing">
              <Rating
                movie_object={rating.movie_object}
                ratingDate={rating.created_at}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default Ratings;
