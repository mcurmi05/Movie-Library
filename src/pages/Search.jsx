import { useState, useEffect } from "react";
import { useSearch } from "../contexts/SearchContext";
import "../styles/Search.css";
import MovieCard from "../components/MovieCard.jsx";

function Search() {

  const { searchResults, selectedMovie, searchError } = useSearch();

  const [movies, setMovies] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (searchResults) {
      setMovies(searchResults);
      setError(searchError);
      setLoading(false);
    } else if (selectedMovie) {
      setMovies([selectedMovie]);
      setError(null);
      setLoading(false);
    } 
  }, [searchResults, selectedMovie, searchError]);


  return (
    <div className="search">
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

export default Search;
