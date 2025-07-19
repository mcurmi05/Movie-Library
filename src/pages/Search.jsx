import { useSearch } from "../contexts/SearchContext";
import "../styles/Search.css";
import MovieCard from "../components/MovieCard.jsx";

function Search() {

  const { searchResults, searchError, searchLoading } = useSearch();

  

  return (
    <div className="search">
      {searchError && <div className="error-message">{searchError}</div>}

      {searchLoading ? (
        <div className="loading">Loading...</div>
      ) : (
        <div className="movies-grid">
          {searchResults.map((movie) => {
            return <MovieCard movie={movie} key={movie.id} />;
          })}
        </div>
      )}
    </div>
  );
}

export default Search;
