import { createContext, useContext, useState } from 'react';
import {getUserLogs} from "../services/ratingsfromtable.js"
import { useAuth } from './AuthContext.jsx';
import { useEffect } from 'react';  

/* eslint-disable react-refresh/only-export-components */

const UserLogsContext = createContext();

export const useLogs = () => {
  const context = useContext(UserLogsContext);
  if (!context) {
    throw new Error('useLogs must be used within a UserLogsProvider');
  }
  return context;
};

export const UserLogsProvider = ({ children }) => {
  const [userLogs, setUserLogs] = useState([]);
  const [userLogsLoaded, setUserLogsLoaded] = useState(false);
  const { user } = useAuth();

  const addLog = (movieId, log, movie, log_id) => {
    const newLog = {
      id:log_id,
      imdb_movie_id: movieId,
      user_id: user.id,
      log: log,
      movie_object: movie,
      created_at: new Date().toISOString(), 

    };
    setUserLogs(prev => [newLog, ...prev]);
  };

  const updateLog = (log_id, newLog) => {
    setUserLogs(prev => 
      prev.map(log => 
        log.id === log_id 
          ? { ...log, log: newLog}
          : log
      )
    );
  };

  const updateDate = (log_id, newCreated_at) => {
    setUserLogs(prev => 
      prev.map(log => 
        log.id === log_id 
          ? { ...log, created_at: newCreated_at}
          : log
      )
    );
  }

  const removeLog = (log_id) => {
    setUserLogs(prev => 
      prev.filter(log => log.id !== log_id)
    );
  };


  useEffect(() => {
    const loadLogs = async () => {
      if (user) {
        try {
          setUserLogsLoaded(false);
          const logs = await getUserLogs();
          setUserLogs(logs);
          setUserLogsLoaded(true); 
        } catch (err) {
          setUserLogsLoaded(false);
          console.log(err)
        }
      } else {
        setUserLogs([]);
        setUserLogsLoaded(false);
      }
    };
    loadLogs();
}, [user]);

  return (
    <UserLogsContext.Provider value={{
      userLogs,
      userLogsLoaded,
      setUserLogs,
      addLog,
      removeLog,
      updateLog,
      updateDate
    }}>
      {children}
    </UserLogsContext.Provider>
  );
};