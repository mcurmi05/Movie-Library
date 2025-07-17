import "../styles/AddLog.css"
import { supabase } from "../services/supabase-client"; 
import { useAuth } from "../contexts/AuthContext";  
import { useNavigate } from "react-router-dom";
import { getMovieById } from "../services/api";
import { useLogs } from "../contexts/UserLogsContext";

export default function AddLog({movie}){

    const {user, isAuthenticated} = useAuth();
    const navigate = useNavigate();
    const {addLog} = useLogs();


    async function onClick(){

        const more_details_movie = await getMovieById(movie.id);

        if (!isAuthenticated) {
            navigate("/signin");
        } else{
            const { error } = await supabase
            .from("logs")
            .insert(
                {
                    imdb_movie_id: movie.id,
                    user_id: user.id,
                    movie_object: more_details_movie
                }
            );
            addLog(movie.id, "", more_details_movie)

            if (error) {
                console.error(error);
            }
    }}

    return(

        <div className="white-highlight">
            <img src="/addlog.png" className="addlog-icon" onClick={onClick}></img>
        </div>
        
    );

};