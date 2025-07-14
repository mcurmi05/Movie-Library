import "../styles/MovieCard.css";
import { useNavigate } from "react-router-dom";
import ReleaseAndRunTime from "./ReleaseAndRunTime.jsx";
import IMDBInfo from "./IMDBInfo.jsx";
import RatingModal from "./RatingModal.jsx";
import{useState, useEffect} from "react";
import { useAuth } from "../contexts/AuthContext";
import { useRatings } from "../contexts/UserRatingsContext.jsx";

import { getRatingFromArray } from "../services/ratingsfromtable.js";
import { supabase } from "../services/supabase-client.js";

function MovieCard({ movie }) {

  const [rated, setRated] = useState(false);
  const [rating, setRating] = useState(0);
  const { user, isAuthenticated } = useAuth();

  const {userRatings, userRatingsLoaded} = useRatings();

  const [showRatingModal, setShowRatingModal] = useState(false);

  const navigate = useNavigate();

  useEffect( () => {
    if (isAuthenticated && userRatingsLoaded){
      const movieRating = getRatingFromArray(userRatings, movie.id);

      if (movieRating){
        setRating(movieRating);
        console.log(`movie has been given ${movieRating}`)
        setRated(true);
      } else{
        setRating(0);
        setRated(false);
      }

    } else {
      setRating(0);
      setRated(false);
    }

  },[isAuthenticated, userRatings, userRatingsLoaded, movie.id]);

  function onMovieCardClick() {
    console.log("Navigating to movie details for:", movie.primaryTitle);
    navigate(`/mediadetails/${movie.id}`);
  }

  async function handleNewRatingClick(){
    if (!isAuthenticated){
      navigate("/signin")
    } else{
      setShowRatingModal(true);
    }
  }

  async function handleReRatingClick(){
    if (!isAuthenticated){
      navigate("/signin")
    } else{
      setShowRatingModal(true);
    }
  }

  async function handleRating(newRating) {
    setRating(newRating);

    try {
      let error;
      
      if (rated) {
        const result = await supabase
          .from('ratings')
          .update({rating: newRating})
          .eq('imdb_movie_id', movie.id)
          .eq('user_id', user.id);
        error = result.error;
      } else {
        const result = await supabase
          .from('ratings')
          .insert({imdb_movie_id: movie.id, user_id: user.id, rating: newRating});
        error = result.error;
      }

      if (error) {
        console.error(error);
      } else {
        setRated(true);
        console.log(`Rating ${rated ? 'updated' : 'added'}: ${newRating}`);
      }
    } catch (err) {
      console.error('Error handling rating:', err);
    }
  }

  async function handleRemoveRating() {
    try {
      const { error } = await supabase
        .from('ratings')
        .delete()
        .eq('imdb_movie_id', movie.id)
        .eq('user_id', user.id);

      if (error) {
        console.error(error);
      } else {
        setRating(0);
        setRated(false);
      }
    } catch (err) {
      console.error(err);
    }
  }

  return (
    <>
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
            {!rated?
                <><img className="user-rating-star" src="/user-rating-star.png"  onClick={handleNewRatingClick}/><p className="user-rating-number" onClick={handleNewRatingClick}></p></>:
                <><img className="user-rating-star" src="/user-rating-star2.png" onClick={handleReRatingClick}/><p className="user-rating-number" onClick={handleReRatingClick}>{rating}</p></>
              }
          </div>

        </div>
      </div>

      <RatingModal
        open={showRatingModal}
        onClose={() => setShowRatingModal(false)}
        onRate={handleRating}
        onRemove={handleRemoveRating}
        currentRating={rating}
        movieTitle={movie.primaryTitle}
        isRated={rated}
      />
    </>
  );
  
}

export default MovieCard;