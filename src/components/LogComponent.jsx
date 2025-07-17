import Rating from "./Rating.jsx"
import "../styles/Rating.css"
import "../styles/LogComponent.css"
import { supabase } from "../services/supabase-client";
import { useState } from "react";
import { useLogs } from "../contexts/UserLogsContext.jsx";

export default function LogComponent({movie, logtext, created_at}){

    const [visible, setVisible] = useState(true);
    const {removeLog} = useLogs();

    async function deleteLogClick(){
        const { error } = await supabase
            .from("logs")
            .delete()
            .eq("created_at", created_at);

        removeLog(created_at);

        if (error) {
            console.error("Error deleting log:", error);
        } else {
          setVisible(false);
        }

    }


    if (!visible) return null;

    return (

        //i am fully aware of how lazy this is
        <div className="log-rating-wrapper">
            <Rating movie_object={movie} ratingDate="today"></Rating>
            <textarea
                className="log-input"
                onInput={e => {
                    e.target.style.height = '100px'; 
                    e.target.style.height = (e.target.scrollHeight) + 'px';
                }}
                text={logtext}
            ></textarea>
            <img src="/logdelete.png" className="log-delete-icon" onClick={deleteLogClick}></img>
        </div>

    );

}