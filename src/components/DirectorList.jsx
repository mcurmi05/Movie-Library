import "../styles/DirectorList.css";
import scrapeImage from "../services/imdbimagescraper";

function DirectorList({ movie }) {
  const directors = movie.directors;
  let multiple = false;
  if (directors.length > 1) {
    multiple = true;
  }

  return (
    <div>
      <p className="list-title">{multiple ? "Directors" : "Director"}</p>
      <div className="director-list-container">
        {directors.map((director, index) => (
          <div className="director-container" key={index}>
            <img src={scrapeImage(director.url)} className="director-image" />
            <p className="director-fullname">{director.fullName}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export default DirectorList;
