import "../styles/Rating.css"
import MovieRatingStar from "./MovieRatingStar";

function Rating({movie_object}){

    

    return(
        <div className="container">
            <div className="top">
                <div className="rating-star-div">
                    <MovieRatingStar movie={movie_object} ></MovieRatingStar>
                </div>
                <img src={movie_object.primaryImage} className="rating-poster"/>
                {movie_object.primaryTitle} 
            </div>
            
        </div>
    );

}

export default Rating;