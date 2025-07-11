import { useParams } from "react-router-dom";
import { useState, useEffect } from "react";
import { getMovieById } from "../services/api";
import "../styles/MediaDetails.css"
import ReleaseAndRunTime from "../components/ReleaseAndRunTime";
import IMDBInfo from "../components/IMDBInfo";
import MediaGenres from "../components/MediaGenres.jsx";

function MediaDetails() {
  const { id } = useParams();
  const [movie, setMovie] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchMovieDetails = async () => {
      try {
        const movie = await getMovieById(id);
        setMovie(movie);
      } catch (err) {
        setError("Failed to load movie details");
        console.log(err);
      } finally {
        setLoading(false);
      }
    };

    fetchMovieDetails();
  }, [id]);

  if (loading) return <div className="loading">Loading...</div>;
  if (error) return <div className="error">{error}</div>;
  if (!movie) return <div className="error">Movie not found</div>;

  const getYouTubeVideoId = (url) => {
    const regex =
      /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:[^/\n\s]+\/\S+\/|(?:v|e(?:mbed)?)\/|\S*?[?&]v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
    const match = url.match(regex);
    return match ? match[1] : null;
  };

  return (
      <div className="page-container">
        <div className="media-details">
            {/*title*/}
            <h1>{movie.primaryTitle}</h1>
            {/*release and runtime*/}
            <div className="subtitle">
              <ReleaseAndRunTime movie={movie}/>
              ·  
              <IMDBInfo movie={movie} className="media-details-imdb"></IMDBInfo>
            </div>

            {/*poster and trailer*/}
            <div className="poster-and-trailer">
              <img className="poster" src={movie.primaryImage}/>
              {movie.trailer ? (
                <div className="trailer-container">
                  <iframe className="youtube-embed"
                    src={`https://www.youtube.com/embed/${getYouTubeVideoId(
                      movie.trailer
                    )}`}
                    title={`${movie.primaryTitle} - Trailer`}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  ></iframe>
                </div>
              ) : (
                <h2>No trailer found</h2>
              )}
            </div>
            {/*description and genres*/}
            <div className="media-genres-and-description">
              <div className="description-container"><p className="description">{movie.description}</p></div>
              <MediaGenres movie={movie}></MediaGenres>
            </div>
            
        </div>
    </div>
  );
}

export default MediaDetails;
