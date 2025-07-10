import { useState, useEffect, useRef } from "react";
import { searchMovies, getPopularMovies } from "../services/api.js";
import "../styles/Home.css";
import MovieCard from "../components/MovieCard.jsx";

function Home() {
  const [searchQuery, setSearchQuery] = useState("");
  const [movies, setMovies] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchResults, setSearchResults] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);

  const searchTimeoutRef = useRef(null);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const loadPopularMovies = async () => {
      try {
        const popularMovies = await getPopularMovies();
        setMovies(popularMovies);
      } catch (err) {
        setError("Failed to load movies...");
        console.log(err);
      } finally {
        setLoading(false);
      }
    };

    loadPopularMovies();
  }, []);

  useEffect(() => {
    if (searchQuery.trim().length > 2) {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }

      searchTimeoutRef.current = setTimeout(async () => {
        setSearchLoading(true);
        try {
          const results = await searchMovies(searchQuery);
          setSearchResults(results.slice(0, 5));
          setShowDropdown(true);
        } catch (err) {
          console.log("Search error:", err);
          setSearchResults([]);
        } finally {
          setSearchLoading(false);
        }
      }, 1000);
    } else {
      setShowDropdown(false);
      setSearchResults([]);
    }

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchQuery]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    if (loading) return;

    setShowDropdown(false);
    setLoading(true);
    try {
      const searchResults = await searchMovies(searchQuery);
      setMovies(searchResults);
      setError(null);
    } catch (err) {
      console.log(err);
      setError("Failed to search movies");
    } finally {
      setLoading(false);
    }
  };

  const handleDropdownClick = (movie) => {
    setSearchQuery(movie.primaryTitle);
    setShowDropdown(false);
    setMovies([movie]);
  };

  const handleInputChange = (e) => {
    setSearchQuery(e.target.value);
    if (e.target.value.trim() === "") {
      setShowDropdown(false);
    }
  };

  return (
    <div className="home">
      <div className="search-container" ref={dropdownRef}>
        <form onSubmit={handleSearch} className="search-form">
          <input
            type="text"
            placeholder="Search for a movie..."
            className="search-input"
            value={searchQuery}
            onChange={handleInputChange}
          />

          <button type="submit" className="search-button">
            Search
          </button>
        </form>
        {showDropdown && (
          <div className="search-dropdown">
            {searchLoading ? (
              <div className="dropdown-loading">Searching...</div>
            ) : searchResults.length > 0 ? (
              searchResults.map((movie) => (
                <div
                  key={movie.id}
                  className="dropdown-item"
                  onClick={() => handleDropdownClick(movie)}
                >
                  <img
                    src={movie.primaryImage || "/placeholderimage.jpg"}
                    className="dropdown-poster"
                  />
                  <div className="dropdown-info">
                    <h4>{movie.primaryTitle}</h4>
                    <p>{movie.startYear}</p>
                  </div>
                </div>
              ))
            ) : (
              <div className="dropdown-no-results">No results found</div>
            )}
          </div>
        )}
      </div>

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

export default Home;
