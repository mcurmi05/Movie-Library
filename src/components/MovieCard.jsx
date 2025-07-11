import "../styles/MovieCard.css";
import { useMovieContext } from "../contexts/MovieContext.jsx";
import { useNavigate } from "react-router-dom";
import ReleaseAndRunTime from "./ReleaseAndRunTime.jsx";
import IMDBInfo from "./IMDBInfo.jsx";

function MovieCard({ movie }) {
  const { isFavourite, addToFavourites, removeFromFavourites } =
    useMovieContext();
  const favourite = isFavourite(movie.id);
  const navigate = useNavigate();

  function onFavouriteClick(e) {
    e.preventDefault();
    e.stopPropagation();
    if (favourite) {
      removeFromFavourites(movie.id);
    } else {
      addToFavourites(movie);
    }
  }

  function onMovieCardClick() {
    console.log("Navigating to movie details for:", movie.primaryTitle);
    navigate(`/mediadetails/${movie.id}`);
  }

  

  return (
    <div className="movie-card">
      <div className="movie-poster" onClick={onMovieCardClick}>
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
        <h3 onClick={onMovieCardClick}>{movie.primaryTitle}</h3>
        <ReleaseAndRunTime movie={movie}/>
        <IMDBInfo movie={movie}></IMDBInfo>
      </div>
    </div>
  );
}

export default MovieCard;
