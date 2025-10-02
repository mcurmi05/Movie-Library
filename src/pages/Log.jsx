import LogComponent from "../components/LogComponent.jsx";
import "../styles/Log.css";
import { useLogs } from "../contexts/UserLogsContext.jsx";
import { useEffect, useState } from "react";
//
function Log() {
  const { userLogs, userLogsLoaded } = useLogs();
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, []);

  if (!userLogsLoaded) {
    return (
      <>
        <h1 style={{ alignSelf: "center", marginTop: "-20px" }}>Your Log</h1>
        <div style={{ alignSelf: "center" }}>Loading log...</div>
      </>
    );
  }

  const filteredLogs = userLogs.filter((log) => {
    if (!searchTerm.trim()) return true;
    const title = log.movie_object?.primaryTitle || "";
    return title.toLowerCase().includes(searchTerm.toLowerCase());
  });

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        width: "100%",
      }}
    >
      <h1 style={{ textAlign: "center", marginTop: "-20px" }}>Your Log</h1>
      <input
        type="text"
        placeholder="Search your logged movies/shows..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        style={{
          padding: "8px",
          borderRadius: "6px",
          border: "1px solid #ccc",
          width: "300px",
          margin: "20px 0",
          textAlign: "center",
        }}
      />
      {filteredLogs.length === 0 && (
        <div style={{ textAlign: "center" }}>
          No logs found for "{searchTerm}"!
        </div>
      )}
      <div
        style={{
          width: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
        }}
      >
        {filteredLogs.map((log) =>
          log.id ? (
            <div
              style={{
                marginBottom: "1rem",
                width: "100%",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
              }}
            >
              <LogComponent
                key={log.id}
                log_id={log.id}
                created_at={log.created_at}
                movie={log.movie_object}
                logtext={log.log}
              />
            </div>
          ) : null
        )}
      </div>
    </div>
  );
}

export default Log;
