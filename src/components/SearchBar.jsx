import { useState, useEffect, useRef } from "react";
import { searchMovies, searchMoviesFIRSTFIVEONLY } from "../services/api.js";
import { useSearch } from "../contexts/SearchContext";
import { useNavigate } from "react-router-dom";
import "../styles/SearchBar.css";

function SearchBar() {

  const { 
    searchQuery, 
    setSearchQuery, 
    setSearchResults, 
    setSearchError 
  } = useSearch();
  
  const [dropdownResults, setDropdownResults] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const navigate = useNavigate();

  const searchTimeoutRef = useRef(null);
  const dropdownRef = useRef(null);

  useEffect(() => {

    if (searchQuery.trim().length > 1) {
      
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }

      searchTimeoutRef.current = setTimeout(async () => {
        setSearchLoading(true);
        try {
          const results = await searchMoviesFIRSTFIVEONLY(searchQuery);
          setDropdownResults(results);
          setShowDropdown(true);
        } catch (err) {
          console.log("Search error:", err);
          setDropdownResults([]);
        } finally {
          setSearchLoading(false);
        }
      }, 1000);
    } else {
      setShowDropdown(false);
      setDropdownResults([]);
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

    setShowDropdown(false);
    navigate("/search")
    try {
      const searchResults = await searchMovies(searchQuery);
      setSearchResults(searchResults);
      setSearchError(null);
    } catch (err) {
      console.log(err);
      setSearchError("Failed to search movies");
      setSearchResults(null);
    }
  };

  const handleDropdownClick = (movie) => {
    setShowDropdown(false);
    navigate(`/mediadetails/${movie.id}`);
  };

  const handleInputChange = (e) => {
    setSearchQuery(e.target.value);
    if (e.target.value.trim() === "") {
      setShowDropdown(false);
    }
  };

  return (
    <div className="search-container" ref={dropdownRef}>
      <form onSubmit={handleSearch} className="search-form">
        <input
          type="text"
          placeholder="Search..."
          className="search-input"
          value={searchQuery}
          onChange={handleInputChange}
        />
        <button type="submit" className="search-button">
          <img src="/search.png" className="search-button-img"></img>
        </button>
      </form>

      {showDropdown && (
        <div className="search-dropdown">
          {searchLoading ? (
            <div className="dropdown-loading">Searching...</div>
          ) : dropdownResults.length > 0 ? (
            dropdownResults.map((movie) => (
              <div
                key={movie.id}
                className="dropdown-item"
                onClick={() => handleDropdownClick(movie)}
              >
                <img
                  src={movie.primaryImage || "/placeholderimage.jpg"}
                  alt={movie.primaryTitle}
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
  );
}

export default SearchBar;