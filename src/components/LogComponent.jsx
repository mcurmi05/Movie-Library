import Rating from "./Rating.jsx"
import "../styles/Rating.css"
import "../styles/LogComponent.css"

export default function LogComponent({movie}){

    return (

        //i am fully aware of how lazy this is
        <div className="log-rating-wrapper">
            <Rating movie_object={movie} ratingDate="today"></Rating>
            <textarea
                className="log-input"
                onInput={e => {
                    e.target.style.height = '100px'; // reset to default
                    e.target.style.height = (e.target.scrollHeight) + 'px';
                }}
            ></textarea>
        </div>

    );

}