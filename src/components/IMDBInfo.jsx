function IMDBInfo({ movie }) {
  const formatVotes = (votes) => {
    if (!votes) return "0";

    if (votes >= 1000000) {
      return "(" + (votes / 1000000).toFixed(1) + "M)";
    } else if (votes >= 1000) {
      return "(" + (votes / 1000).toFixed(0) + "K)";
    } else {
      return "(" + votes.toString() + ")";
    }
  };

  return (
    <a href={movie.url} target="_blank" className="imdb-rating">
      <img src="/imdbicon.png" className="imdb-movie-card " />
      <img src="/staricon.png" className="star-movie-card" />
      <p>
        {movie.averageRating
          ? movie.averageRating.toFixed(1)
          : "No ratings yet"}{" "}
        {movie.numVotes ? formatVotes(movie.numVotes) : null}
      </p>
    </a>
  );
}
export default IMDBInfo;
