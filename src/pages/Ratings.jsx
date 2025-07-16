import { useRatings } from "../contexts/UserRatingsContext.jsx";
import { useAuth } from "../contexts/AuthContext";
import Rating from "../components/Rating.jsx";

function Ratings() {
  const { isAuthenticated } = useAuth();
  const { userRatings, userRatingsLoaded } = useRatings();

  console.log("User ratings: " + userRatings);

  if (!isAuthenticated) {
    return <div>Please sign in to view your ratings</div>;
  }

  if (!userRatingsLoaded) {
    return <div>Loading ratings...</div>;
  }

  try {
    return (
      <div
        style={{justifyContent:"center", display:"flex", flexDirection:"column"}}
      >
        <h1 style={{alignSelf:"center"}}>Your Ratings</h1>
        {userRatings
          .slice()
          .reverse()
          .map((rating) => (
            <div
              key={rating.imdb_movie_id}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
              }}
            >
              <Rating
                movie_object={rating.movie_object}
                ratingDate={rating.created_at}
              ></Rating>
            </div>
          ))}
      </div>
    );
  } catch (error) {
    console.error("Error rendering ratings:", error);
    return <div>Loading ratings...</div>;
  }
}

export default Ratings;
