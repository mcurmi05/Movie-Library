import { useRatings} from "../contexts/UserRatingsContext.jsx";
import { useAuth } from "../contexts/AuthContext";
import Rating from "../components/Rating.jsx";
import MovieRatingStar from "../components/MovieRatingStar.jsx";

function Ratings() {

   const { isAuthenticated } = useAuth();
   const {userRatings, userRatingsLoaded} = useRatings();

   console.log("User ratings: " + userRatings)

   if (!isAuthenticated) {
     return <div>Please sign in to view your ratings</div>;
   }

   if (!userRatingsLoaded) {
     return <div>Loading ratings...</div>;
   }

    try {
     return(
        <div>
            <h1>Your Ratings</h1>
            {userRatings.map((rating) => (
                <div key={rating.imdb_movie_id}>
                  <Rating movie_object={rating.movie_object}></Rating>
                </div>
            ))}
        </div>
     );
   } catch (error) {
     console.error('Error rendering ratings:', error);
     return <div>Loading ratings...</div>;
   }
   
}

export default Ratings;