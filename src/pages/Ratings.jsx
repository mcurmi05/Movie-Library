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

  return (
    <div>
      <h1>Your Ratings</h1>
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
          margin: "20px 0",
        }}
      />
      {filteredRatings.length === 0 && (
        <div>No ratings found for "{searchTerm}"!</div>
      )}
      <div>
        {filteredRatings
          .slice()
          .reverse()
          .map((rating) => (
            <div
              key={rating.id || rating.imdb_movie_id}
              style={{ marginBottom: "1rem" }}
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
