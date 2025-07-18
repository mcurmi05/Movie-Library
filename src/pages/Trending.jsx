import { useState, useEffect } from "react";
import { getPopularMovies } from "../services/api.js";
import { useCache } from "../contexts/PopularMoviesCacheContext";
import "../styles/Trending.css";
import MovieCard from "../components/MovieCard.jsx";

function Trending() {

  const { 
    popularMovies, 
    popularMoviesLoaded, 
    cachePopularMovies 
  } = useCache();

  const [movies, setMovies] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadPopularMovies = async () => {
      //check if we already have cached popular movies
      if (popularMoviesLoaded && popularMovies) {
        console.log("using cached popular movies:");
        console.log(popularMovies)
        setMovies(popularMovies);
        setError(null);
        setLoading(false);
        return;
      }

      //if no cached data, fetch from API
      console.log("Fetching popular movies from API");
      try {
        const fetchedMovies = await getPopularMovies();
        setMovies(fetchedMovies);
        cachePopularMovies(fetchedMovies); //cache the results
        setError(null);
      } catch (err) {
        setError("Failed to load movies...");
        console.log(err);
      } finally {
        setLoading(false);
      }
    };

    loadPopularMovies();
  }, [popularMovies, popularMoviesLoaded, cachePopularMovies]);

  return (
    <div className="trending">
      <h1 style={{textAlign:"center", marginTop:"-20px"}}>Top 100 Trending Movies</h1>
      {error && <div className="error-message">{error}</div>}

      {loading ? (
        <div className="loading">Loading...</div>
      ) : (
        <div className="movies-grid">
          {movies.map((movie) => {
            return <MovieCard movie={movie} key={movie.id} />;
          })}
        </div>
      )}
    </div>
  );
}

export default Trending;
