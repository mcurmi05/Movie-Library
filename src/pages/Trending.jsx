import { useState, useEffect } from "react";
import { getPopularMovies, getPopularTV } from "../services/api.js";
import { useCache } from "../contexts/PopularMoviesCacheContext";
import "../styles/Trending.css";
import MovieCard from "../components/MovieCard.jsx";

function Trending() {
  const { 
    popularMedia, 
    popularMediaType, 
    popularMediaLoaded, 
    cachePopularMedia,
    clearCache 
  } = useCache();

  const getInitialMediaType = () => {
    const saved = localStorage.getItem("trendingMediaType");
    return saved === "tv" ? "tv" : "movies";
  };
  const [mediaType, setMediaType] = useState(getInitialMediaType);

  const [movies, setMovies] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    localStorage.setItem("trendingMediaType", mediaType);
  }, [mediaType]);


  useEffect(() => {
    const loadPopular = async () => {
      setLoading(true);
      setError(null);

      if (popularMediaType !== mediaType) {
        clearCache();
      }

      if (popularMediaLoaded && popularMedia && popularMediaType === mediaType) {
        setMovies(popularMedia);
        setLoading(false);
        return;
      }

      try {
        if (mediaType === "movies") {
          const fetchedMovies = await getPopularMovies();
          setMovies(fetchedMovies);
          cachePopularMedia(fetchedMovies, "movies");
        } else {
          const fetchedTV = await getPopularTV();
          setMovies(fetchedTV);
          cachePopularMedia(fetchedTV, "tv");
        }
      } catch (err) {
        setError("Failed to load " + mediaType + "..." + err);
      } finally {
        setLoading(false);
      }
    };

    loadPopular();
  }, [mediaType, popularMedia, popularMediaType, popularMediaLoaded, cachePopularMedia, clearCache]);

  return (
    <div className="trending">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", marginTop: "-20px", flexWrap:"wrap" }}>
        <h1 style={{ textAlign: "center", margin: 0 }}>Top 100 Trending</h1>
        <select
          className="mediatype-selector"
          value={mediaType}
          onChange={e => setMediaType(e.target.value)}
        >
          <option value="movies">Movies</option>
          <option value="tv">TV</option>
        </select>
      </div>
      {error && <div className="error-message">{error}</div>}

      {loading ? (
        <div className="loading">Loading...</div>
      ) : (
        <div className="movies-grid">
          {movies.map((movie) => (
            <MovieCard movie={movie} key={movie.id} />
          ))}
        </div>
      )}
    </div>
  );
}

export default Trending;