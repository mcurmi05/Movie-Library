import "../styles/Favourites.css"
import {useMovieContext} from "../contexts/MovieContext.jsx"
import MovieCard from "../components/MovieCard.jsx"

function Favourites() {

  const {favourites} = useMovieContext();

  if (favourites.length>0){
    return (
      <div className="favourites">
        <h2>Favourites</h2>
        <div className="movies-grid">
          {favourites.map((movie) => {
            return <MovieCard movie={movie} key={movie.id} />;
          })}
        </div>
      </div>
        
  )};

  return (
    <div className="favourites-empty">
      <h2>No favourite movies yet</h2>
      <p>Start adding movies to your favourites!</p>
    </div>
  );
}

export default Favourites;
