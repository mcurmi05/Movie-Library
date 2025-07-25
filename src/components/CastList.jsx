import "../styles/CastList.css"

function CastList({ movie }) {
  return (
    <div className="container-cast-main">
        <p className="list-title-cast">Cast & Crew</p>
        <div className="cast-list-container">
        
        {movie.cast.filter(castMember => castMember.job === "actor" || castMember.job === "actress").map((castMember, index) => (
            <div className="cast-member-container" key={index}>
                <img src={castMember.primaryImage ? `${castMember.primaryImage}`: "/placeholderimage.jpg"} className="cast-image"/>
                <p className="cast-member-fullname">{castMember.fullName}</p>
                <p className="cast-member-characters">{castMember.characters && castMember.characters.length > 0 ? castMember.characters.join(", ") : ""}</p>
            </div>
            ))}
        </div>
    </div>
  );
}

export default CastList;