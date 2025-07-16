import "../styles/DirectorList.css";

function DirectorList({ movie }) {
  const directors = movie.directors;
  let multiple = false;
  if (directors.length > 1) {
    multiple = true;
  }

  return (
    <div className="container-director-main">
      <p className="list-title-director">{multiple ? "Directors" : "Director"}</p>
      <div className="director-list-container">
        {directors.map((director, index) => (
          <div className="director-container" key={index}>
            <img src={director.url} className="director-image" />
            <p className="director-fullname">{director.fullName}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export default DirectorList;
