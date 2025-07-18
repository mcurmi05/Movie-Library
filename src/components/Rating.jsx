import "../styles/Rating.css";
import { useNavigate } from "react-router-dom";
import MovieRatingStar from "./MovieRatingStar";
import ReleaseAndRunTime from "./ReleaseAndRunTime";
import AddLog from "./AddLog.jsx"
import AddWatchlist from "./AddWatchList.jsx";

function Rating({ movie_object, ratingDate }) {
  const navigate = useNavigate();

  function onMovieClick() {
    console.log("Navigating to movie details for:", movie_object.primaryTitle);
    navigate(`/mediadetails/${movie_object.id}`);
  }

  const formattedDate = ratingDate
    ? new Date(ratingDate).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    : "";

  return (
    <div className="container">

        <div className="top-stuff">
            <div className="poster-wrapper">
                <img
                    src={movie_object.primaryImage ? `${movie_object.primaryImage}`: "/placeholderimage.jpg"}
                    onError={e => { e.target.onerror = null; e.target.src = "/placeholderimage.jpg"}}
                    className="rating-poster"
                    onClick={onMovieClick}
                />
            </div>
            <div className="right-stuff">
                <div className="title-and-star">
                    <p className="movie-title" onClick={onMovieClick}>
                    {movie_object.primaryTitle}{" "}
                    </p>
                    <div className="rating-star-div">
                        <MovieRatingStar movie={movie_object}></MovieRatingStar>
                    </div>
                    <AddLog movie={movie_object}></AddLog>
                    <AddWatchlist movie={movie_object}></AddWatchlist>
                </div>

                <div className="rating-page-subtitle">
                    <ReleaseAndRunTime style={{textWrap:"wrap"}} movie={movie_object}></ReleaseAndRunTime>
                    {formattedDate!=="Invalid Date"?<p>Rated on: {formattedDate}</p>:null}
                </div>

                <div className="top">
        

                <div className="description-and-stars-and-director">
                    <div className="directors-and-stars">
                        {movie_object.type === "movie" &&
                        movie_object.directors &&
                        movie_object.directors.length > 0 && (
                            <p className="director-p">
                            <span className="bold-span">Directed by</span>{" "}
                            {movie_object.directors
                                .map((director) => director.fullName)
                                .join(", ")}
                            </p>
                        )}
                        <p>
                        <span className="bold-span">Stars</span>{" "}
                        {movie_object.cast
                            .slice(0, 3)
                            .map((castMember) => castMember.fullName)
                            .join(", ")}
                        </p>
                    </div>
                </div>
        
      </div>
            </div>
        </div>
      

      

      
    </div>
  );
}

export default Rating;
