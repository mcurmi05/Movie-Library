import WatchlistComponent from "../components/WatchlistComponent.jsx";
import "../styles/Log.css";
import { useEffect } from "react";
import { useWatchlist } from "../contexts/UserWatchlistContext.jsx";

function Watchlist() {
  const { userWatchlist, userWatchlistLoaded } = useWatchlist();

  useEffect(() => {
    window.scrollTo({ top: 0});
  }, []);

  if (!userWatchlistLoaded) {
    return (
      <>
        <h1 style={{ alignSelf: "center", marginTop: "-20px" }}>Your Watchlist</h1>
        <div style={{ alignSelf: "center" }}>Loading watchlist...</div>
      </>
    );
  }

  return (
    <>
      <h1 style={{ textAlign: "center", marginTop: "-20px" }}>Your Watchlist</h1>
      {userWatchlist.length === 0 ? <h3 style={{ textAlign: "center", marginTop:"50px" , fontWeight:"normal"}}>You don't have any movies or shows in your watchlist! Click the bookmark icon to add one.</h3>:null}
      {console.log(userWatchlist)}
      <div className="logs-container-vertically-down">
        {userWatchlist.map((watchlist_entry) => (
            watchlist_entry.id ? (
                <WatchlistComponent
                    key={watchlist_entry.id}
                    watchlist_id={watchlist_entry.id}
                    movie={watchlist_entry.movie_object}
                />
            ) : null
            ))}
      </div>
    </>
  );
}

export default Watchlist;
