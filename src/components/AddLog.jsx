import "../styles/AddLog.css"
import { supabase } from "../services/supabase-client"; 
import { useAuth } from "../contexts/AuthContext";  
import { useNavigate } from "react-router-dom";
import { getMovieById } from "../services/api";
import { useLogs } from "../contexts/UserLogsContext";

export default function AddLog({movie, needMoreDetail}){

    const {user, isAuthenticated} = useAuth();
    const navigate = useNavigate();
    const {addLog} = useLogs();


    async function onClick(){

        if (!isAuthenticated) {
            navigate("/signin");
        } else{
            navigate("/log")
            if(needMoreDetail){
                movie = await getMovieById(movie.id);
            }

            const { data, error } = await supabase
            .from("logs")
            .insert(
                {
                    imdb_movie_id: movie.id,
                    user_id: user.id,
                    movie_object: movie
                })
                .select();
            
            console.log(data)
            const newLog = data[0];
            addLog(movie.id, "", movie, newLog.id)
            
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