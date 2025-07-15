import "../styles/Rating.css"

function Rating({movie_object, rating}){

    

    return(
        <div className="container">
            <div className="top">
                <img src={movie_object.primaryImage} className="rating-poster"/>
                {movie_object.primaryTitle} 
                {rating}
            </div>
            
        </div>
    );

}

export default Rating;