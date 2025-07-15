import { useRatings} from "../contexts/UserRatingsContext.jsx";
import { useAuth } from "../contexts/AuthContext";
import { useState, useNavigate, useEffect } from "react";   
import Rating from "../components/Rating.jsx";

function Ratings() {

   const { isAuthenticated } = useAuth();
   const {userRatings, userRatingsLoaded, addRating, updateRating, removeRating} = useRatings();
   const [showRatingModal, setShowRatingModal] = useState(false);
   //const navigate = useNavigate();

   if (!isAuthenticated) {
     return <div>Please sign in to view your ratings</div>;
   }

   if (!userRatingsLoaded) {
     return <div>Loading ratings...</div>;
   }
   
   
    return(
        <div>
            <h1>Your Ratings</h1>
            {userRatings.map((rating, index) => (
                <Rating movie_object={rating.movie_object} rating={rating.rating}></Rating>
            ))}
        </div>
    );
   

}

export default Ratings;