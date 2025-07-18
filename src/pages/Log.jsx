import LogComponent from "../components/LogComponent.jsx";
import "../styles/Log.css";
import { useLogs } from "../contexts/UserLogsContext.jsx";
import { useEffect } from "react";

function Log() {
  const { userLogs, userLogsLoaded } = useLogs();

  useEffect(() => {
    window.scrollTo({ top: 0});
  }, []);

  if (!userLogsLoaded) {
    return (
      <>
        <h1 style={{ alignSelf: "center", marginTop: "-20px" }}>Your Log</h1>
        <div style={{ alignSelf: "center" }}>Loading log...</div>
      </>
    );
  }

  return (
    <>
      <h1 style={{ alignSelf: "center", marginTop: "-20px" }}>Your Log</h1>
      {console.log(userLogs)}
      <div className="logs-container-vertically-down">
        {userLogs.map((log) => (
            log.id ? (
                <LogComponent
                    key={log.id}
                    log_id={log.id}
                    created_at={log.created_at}
                    movie={log.movie_object}
                    logtext={log.log}
                />
            ) : null
            ))}
      </div>
    </>
  );
}

export default Log;
