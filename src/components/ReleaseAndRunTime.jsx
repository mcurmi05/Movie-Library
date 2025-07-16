function ReleaseAndRunTime({movie}) {
    
    return(
        <p>
            {movie.startYear ? (
            movie.endYear ? 
                `${movie.startYear} - ${movie.endYear}` : 
                `${movie.startYear} ·`
            ) : ""}    
            
            {Math.floor(movie.runtimeMinutes / 60)
            ? " " + Math.floor(movie.runtimeMinutes / 60) + "h"
            : null}{" "}
            {movie.runtimeMinutes % 60
            ? (movie.runtimeMinutes % 60) + "m"
            : "Unknown runtime"}
        </p>
    );
    
}

export default ReleaseAndRunTime;