import "../styles/MovieCard.css";
import { useMovieContext } from "../contexts/MovieContext.jsx";

function MovieCard({ movie }) {
  const { isFavourite, addToFavourites, removeFromFavourites } =
    useMovieContext();
  const favourite = isFavourite(movie.id);

  function onFavouriteClick(e) {
    e.preventDefault();
    if (favourite) {
      removeFromFavourites(movie.id);
    } else {
      addToFavourites(movie);
    }
  }

  const formatVotes = (votes) => {
    if (!votes) return "0";

    if (votes >= 1000000) {
      return "(" + (votes / 1000000).toFixed(1) + "M)";
    } else if (votes >= 1000) {
      return "(" + (votes / 1000).toFixed(0) + "K)";
    } else {
      return "(" + votes.toString() + ")";
    }
  };

  return (
    <div className="movie-card">
      <div className="movie-poster">
        <img
          className="movie-poster-img"
          src={
            movie.primaryImage
              ? `${movie.primaryImage}`
              : "/placeholderimage.jpg"
          }
        />

        <div className="movie-overlay">
          <button
            className={`favourite-btn ${favourite ? "active" : ""}`}
            onClick={onFavouriteClick}
          >
            ♥
          </button>
        </div>
      </div>

      <div className="movie-info">
        <h3>{movie.primaryTitle}</h3>
        <p>
          {movie.startYear ? movie.startYear : "Unknown year"} -{" "}
          {Math.floor(movie.runtimeMinutes / 60)
            ? Math.floor(movie.runtimeMinutes / 60) + "h"
            : null}{" "}
          {movie.runtimeMinutes % 60
            ? (movie.runtimeMinutes % 60) + "m"
            : "Unknown runtime"}
        </p>
        <a href={movie.url} target="_blank" className="imdb-rating">
          <img src="/imdbicon.png" className="imdb-movie-card " />
          <img src="/staricon.png" className="star-movie-card" />
          <p>
            {movie.averageRating ? movie.averageRating : "No ratings yet"} {movie.numVotes ? formatVotes(movie.numVotes): null} 
          </p>
        </a>
      </div>
    </div>
  );
}

export default MovieCard;
