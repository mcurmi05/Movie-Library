import Rating from "./Rating.jsx"
import "../styles/Rating.css"
import "../styles/LogComponent.css"
import { supabase } from "../services/supabase-client";
import { useState } from "react";
import { useLogs } from "../contexts/UserLogsContext.jsx";
import { useRef } from "react";
import { useEffect } from "react";

export default function LogComponent({movie, logtext, created_at}){

    const [visible, setVisible] = useState(true);
    const {removeLog, updateLog} = useLogs();

    const [text, setText] = useState(logtext);
    const debounceTimeout = useRef(null);

    const [saving, setSaving] = useState(false);
    const [textEdited, setTextEdited] = useState(false); 



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

    useEffect(() => {
        if (!visible || !textEdited) return;
        if (debounceTimeout.current) clearTimeout(debounceTimeout.current);
        setSaving(true);
        debounceTimeout.current = setTimeout(async () => {
            const { error } = await supabase
                .from("logs")
                .update({ log: text })
                .eq("created_at", created_at);
            updateLog(movie.id, text, movie, created_at)
            setSaving(false);
            console.log("Updated log")
            if (error) {
                console.error("Error updating log:", error);
            }
        }, 2000);
        return () => clearTimeout(debounceTimeout.current);
    }, [text, visible, created_at, movie, textEdited]);


    if (!visible) return null;
    return (

        //i am fully aware of how lazy this is
        <div className="log-rating-wrapper">
            <Rating movie_object={movie} ratingDate="today"></Rating>
            <textarea
                className="log-input"
                value={text}
                onInput={e => {
                    e.target.style.height = '100px'; 
                    e.target.style.height = (e.target.scrollHeight) + 'px';
                    setText(e.target.value);
                    //open to suggestions on a better way to do this lol
                    setTextEdited(true);
                }}
            ></textarea>
            <img src="/logdelete.png" className="log-delete-icon" onClick={deleteLogClick}></img>
            {<div style={{fontSize: "0.9rem", color: "#888", marginTop: "4px"}}>{saving ? <p>Saving, please don't refresh or click away...</p>:<br></br>}</div>}
        </div>

    );

}