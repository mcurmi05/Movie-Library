import LogComponent from "../components/LogComponent.jsx";
import "../styles/Log.css"
import { useLogs } from "../contexts/UserLogsContext.jsx";

function Log() {

    const { userLogs, userLogsLoaded } = useLogs();

    if (!userLogsLoaded) {
        return (<>
                <h1 style={{alignSelf:"center", marginTop:"-20px"}}>Your Log</h1>
                <div style={{alignSelf:"center"}}>Loading log...</div>
                </>);
    }

    return (
        <>
            <h1 style={{alignSelf:"center", marginTop:"-20px"}}>Your Log</h1>
            <div className="logs-container-vertically-down">
                {userLogs.map(log => (
                    <LogComponent
                        key={log.id}
                        created_at={log.created_at}
                        movie={log.movie_object}
                        logtext={log.log}
                        log_id={log.id}
                    />
            ))}
            </div>
        </>
    );
}

export default Log;