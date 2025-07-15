import "../styles/Rating.css"
import { useNavigate } from "react-router-dom";
import MovieRatingStar from "./MovieRatingStar";

function Rating({movie_object}){

    const navigate = useNavigate();

    function onMovieClick() {
        console.log("Navigating to movie details for:", movie_object.primaryTitle);
        navigate(`/mediadetails/${movie_object.id}`);
    }
    

    return(
        <div className="container">
            <div className="top">
                
                <img src={movie_object.primaryImage} className="rating-poster" onClick={onMovieClick}/>
                <div className="rating-star-div">
                    <MovieRatingStar movie={movie_object}  ></MovieRatingStar>
                </div>
                <p className="movie-title" onClick={onMovieClick} >{movie_object.primaryTitle} </p>
            </div>
            
        </div>
    );

}

export default Rating;