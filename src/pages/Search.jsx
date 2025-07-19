import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useSearch } from "../contexts/SearchContext";
import "../styles/Search.css";
import MovieCard from "../components/MovieCard.jsx";
import { searchMovies } from "../services/api";

function Search() {
  const {
    searchResults,
    setSearchResults,
    searchError,
    setSearchError,
    searchLoading,
    setSearchLoading,
    setSearchQuery,
  } = useSearch();

  const location = useLocation();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const query = params.get("q") || "";
    setSearchQuery(query);

    if (query.trim()) {
      setSearchLoading(true);
      searchMovies(query)
        .then(results => {
          setSearchResults(results);
          setSearchError(null);
        })
        .catch(() => {
          setSearchResults([]);
          setSearchError("Failed to search movies");
        })
        .finally(() => {
          setSearchLoading(false);
        });
    } else {
      setSearchResults([]);
    }
  }, [location.search, setSearchQuery, setSearchResults, setSearchLoading, setSearchError]);

  return (
    <div className="search">
      {searchError && <div className="error-message">{searchError}</div>}
      {searchLoading ? (
        <div className="loading">Loading...</div>
      ) : (
        searchResults && searchResults.length > 0 ? (
          <div className="movies-grid">
            {searchResults.map((movie) => (
              <MovieCard movie={movie} key={movie.id} />
            ))}
          </div>
        ) : (
          <div style={{ textAlign: "center" }}>
            Use the search bar to search for movies or shows!
          </div>
        )
      )}
    </div>
  );
}

export default Search;