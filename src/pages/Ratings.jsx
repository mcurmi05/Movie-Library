import { useRatings } from "../contexts/UserRatingsContext.jsx";
import Rating from "../components/Rating.jsx";

function Ratings() {
  const { userRatings, userRatingsLoaded } = useRatings();

  console.log("User ratings: ", userRatings);

  if (!userRatingsLoaded) {
    return (<>
              <h1 style={{alignSelf:"center", marginTop:"-20px"}}>Your Ratings</h1>
              <div style={{alignSelf:"center"}}>Loading ratings...</div>
            </>);
  }

  try {
    return (
      <div
        style={{justifyContent:"center", display:"flex", flexDirection:"column"}}
      >
        <h1 style={{textAlign:"center", marginTop:"-20px"}}>Your Ratings</h1>
        {userRatings.length === 0 ? <h3 style={{ textAlign: "center", marginTop:"50px" , fontWeight:"normal"}}>You haven't rated any movies or shows! Click the star icon to rate one.</h3>:null}

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
            <div className="div-wrapper-rating-testing" >
              <Rating
                movie_object={rating.movie_object}
                ratingDate={rating.created_at}
              ></Rating>
            </div>
            </div>
          ))}
      </div>
    );
  } catch (error) {
    console.error("Error rendering ratings:", error);
    return <div style={{alignSelf:"center"}}>Loading ratings...</div>;
  }
}

export default Ratings;
