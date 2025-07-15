import "../styles/Rating.css"
import { useNavigate } from "react-router-dom";
import MovieRatingStar from "./MovieRatingStar";
import ReleaseAndRunTime from "./ReleaseAndRunTime";

function Rating({movie_object, ratingDate}){

    const navigate = useNavigate();

    function onMovieClick() {
        console.log("Navigating to movie details for:", movie_object.primaryTitle);
        navigate(`/mediadetails/${movie_object.id}`);
    }

    const formattedDate = ratingDate
        ? new Date(ratingDate).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        })
        : '';
    

    return(
        <div className="container">
            <div className="top">
                <p>Rated on: {formattedDate}</p>
                <img src={movie_object.primaryImage} className="rating-poster" onClick={onMovieClick}/>
                <div className="rating-star-div">
                    <MovieRatingStar movie={movie_object}  ></MovieRatingStar>
                </div>
                <p className="movie-title" onClick={onMovieClick} >{movie_object.primaryTitle} </p>
                <p>{movie_object.description}</p>
                <ReleaseAndRunTime movie={movie_object}></ReleaseAndRunTime>
                <p>Director: {movie_object.directors[0].fullName} </p>
                {/* can get their photos and make a x scroll */}
                <p>Actors - 
                    {movie_object.cast
                    .filter(castMember => castMember.job === "actress" || castMember.job === "actor")
                    .map(castMember => `${castMember.fullName} as ${castMember.characters&&castMember.characters.length>0?castMember.characters:castMember.fullName}`)
                    .join(", ")}
                </p>
            </div>
            
        </div>
    );

}

export default Rating;