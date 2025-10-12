import { useRatings } from "../contexts/UserRatingsContext.jsx";
import Rating from "../components/Rating.jsx";
import { useMemo, useState, useEffect } from "react";

function Ratings() {
  const { userRatings, userRatingsLoaded, updateRanking } = useRatings();
  const [searchTerm, setSearchTerm] = useState("");
  const [ratingFilter, setRatingFilter] = useState("all");
  const [mediaTypeFilter, setMediaTypeFilter] = useState("all");
  // Rank mode: none | movies | tv
  const [rankModeType, setRankModeType] = useState("none");

  // When rank mode is enabled, force rating filter to 10 and media filter appropriately
  useEffect(() => {
    if (rankModeType === "movies") {
      setRatingFilter("10");
      setMediaTypeFilter("movies");
    } else if (rankModeType === "tv") {
      setRatingFilter("10");
      setMediaTypeFilter("tv");
    }
  }, [rankModeType]);

  // Avoid early return before hooks; we'll render a loading state in JSX

  const filteredRatings = userRatings.filter((rating) => {
    // Filter by media type (movie/tv)
    if (mediaTypeFilter !== "all") {
      const type = (rating.movie_object?.type || "").toLowerCase();
      const titleType = (rating.movie_object?.titleType || "").toLowerCase();
      const isTV =
        type.includes("tv") ||
        titleType.includes("tv") ||
        rating.movie_object?.episodes;
      if (mediaTypeFilter === "movies" && isTV) return false;
      if (mediaTypeFilter === "tv" && !isTV) return false;
    }
    // Filter by search term
    if (searchTerm.trim()) {
      const title = rating.movie_object?.primaryTitle || "";
      if (!title.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    }
    // Filter by rating value
    if (ratingFilter !== "all") {
      if (Number(rating.rating) !== Number(ratingFilter)) return false;
    }
    return true;
  });

  // Compute 10s with ranking and default sort
  const allTens = useMemo(() => {
    return filteredRatings.filter((r) => Number(r.rating) === 10);
  }, [filteredRatings]);

  // Sort helper for rankings: rank asc (1..n), then created_at desc
  const rankSort = (a, b) => {
    const ra = a.ranking ?? Number.MAX_SAFE_INTEGER;
    const rb = b.ranking ?? Number.MAX_SAFE_INTEGER;
    if (ra !== rb) return ra - rb;
    const dateA = new Date(a.created_at);
    const dateB = new Date(b.created_at);
    return dateB - dateA;
  };

  // Display list respects rank when filtering 10s, otherwise default date sort
  const sortedRatings = useMemo(() => {
    if (ratingFilter === "10") {
      return [...allTens].sort(rankSort);
    }
    return filteredRatings.slice().sort((a, b) => {
      const dateA = new Date(a.created_at);
      const dateB = new Date(b.created_at);
      return dateB - dateA;
    });
  }, [filteredRatings, allTens, ratingFilter]);

  // Move rank up/down among 10s by swapping ranking values and normalizing
  // Note: normalization handled implicitly by applyRankOrder indices

  const applyRankOrder = async (orderedIds) => {
    // Persist sequential rankings based on provided order of imdb ids
    for (let i = 0; i < orderedIds.length; i++) {
      const imdb = orderedIds[i];
      await updateRanking(imdb, i + 1);
    }
  };

  const handleMove = async (imdbId, direction) => {
    const tensSorted = [...allTens].sort(rankSort);
    const index = tensSorted.findIndex((r) => r.imdb_movie_id === imdbId);
    if (index === -1) return;
    const swapWith = direction === "up" ? index - 1 : index + 1;
    if (swapWith < 0 || swapWith >= tensSorted.length) return;
    const ids = tensSorted.map((r) => r.imdb_movie_id);
    [ids[index], ids[swapWith]] = [ids[swapWith], ids[index]];
    await applyRankOrder(ids);
  };

  const handleSendTop = async (imdbId) => {
    const tensSorted = [...allTens].sort(rankSort);
    const index = tensSorted.findIndex((r) => r.imdb_movie_id === imdbId);
    if (index <= 0) return;
    const ids = tensSorted.map((r) => r.imdb_movie_id);
    const [moved] = ids.splice(index, 1);
    ids.unshift(moved);
    await applyRankOrder(ids);
  };

  const handleSendBottom = async (imdbId) => {
    const tensSorted = [...allTens].sort(rankSort);
    const index = tensSorted.findIndex((r) => r.imdb_movie_id === imdbId);
    if (index === -1 || index === tensSorted.length - 1) return;
    const ids = tensSorted.map((r) => r.imdb_movie_id);
    const [moved] = ids.splice(index, 1);
    ids.push(moved);
    await applyRankOrder(ids);
  };

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
          flexWrap: "wrap",
        }}
      >
        <input
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

        {/* Rank mode toggles */}
        <label
          style={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
            backgroundColor: "#3b3b3b",
            color: "#ffffff",
            padding: "6px 10px",
            border: "1px solid #cccccc",
            borderRadius: "6px",
            margin: "6px",
            fontSize: "0.85rem",
            userSelect: "none",
            cursor: "pointer",
          }}
        >
          <input
            type="checkbox"
            checked={rankModeType === "movies"}
            onChange={(e) =>
              setRankModeType(e.target.checked ? "movies" : "none")
            }
          />
          Rank 10s Movies
        </label>
        <label
          style={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
            backgroundColor: "#3b3b3b",
            color: "#ffffff",
            padding: "6px 10px",
            border: "1px solid #cccccc",
            borderRadius: "6px",
            margin: "6px",
            fontSize: "0.85rem",
            userSelect: "none",
            cursor: "pointer",
          }}
        >
          <input
            type="checkbox"
            checked={rankModeType === "tv"}
            onChange={(e) => setRankModeType(e.target.checked ? "tv" : "none")}
          />
          Rank 10s TV
        </label>
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
          {sortedRatings.length}
        </span>
      </div>
      {!userRatingsLoaded ? (
        <div style={{ textAlign: "center" }}>Loading...</div>
      ) : sortedRatings.length === 0 ? (
        <div style={{ textAlign: "center" }}>
          No ratings found for "{searchTerm}"!
        </div>
      ) : null}
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
            <div
              className="div-wrapper-rating-testing"
              style={{ width: "100%" }}
            >
              <Rating
                movie_object={rating.movie_object}
                ratingDate={rating.created_at}
                rankNumber={
                  Number(rating.rating) === 10 ? rating.ranking : null
                }
                showRankControls={
                  rankModeType !== "none" && Number(rating.rating) === 10
                }
                onMoveUp={() => handleMove(rating.imdb_movie_id, "up")}
                onMoveDown={() => handleMove(rating.imdb_movie_id, "down")}
                onSendTop={() => handleSendTop(rating.imdb_movie_id)}
                onSendBottom={() => handleSendBottom(rating.imdb_movie_id)}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default Ratings;
