import "../styles/MovieCard.css";
import { useNavigate } from "react-router-dom";
import ReleaseAndRunTime from "./ReleaseAndRunTime.jsx";
import IMDBInfo from "./IMDBInfo.jsx";

function MovieCard({ movie }) {

  const navigate = useNavigate();

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
      </div>

      <div className="movie-info">
        <h3 onClick={onMovieCardClick}>{movie.primaryTitle}</h3>
        <ReleaseAndRunTime movie={movie} />
        <IMDBInfo movie={movie}></IMDBInfo>

        <div className="user-rating-movie-card">
          <img className="user-rating-star" src="/user-rating-star2.png"/>
          <p className="user-rating-number">7</p>
        </div>

      </div>
    </div>
  );
  
}

export default MovieCard;
