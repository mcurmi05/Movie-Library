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
  const { isAuthenticated, user } = useAuth();

  const addLog = (movieId, log, movie) => {
    const newLog = {
      imdb_movie_id: movieId,
      user_id: user.id,
      log: log,
      movie_object: movie,
      created_at: new Date().toISOString(), 

    };
    setUserLogs(prev => [...prev, newLog]);
  };

  const updateLog = (movieId, newLog, movie, created_at) => {
    setUserLogs(prev => 
      prev.map(log => 
        log.created_at === created_at 
          ? { ...prev, log: newLog}
          : log
      )
    );
  };

  const removeLog = (created_at) => {
    setUserLogs(prev => 
      prev.filter(log => log.created_at !== created_at)
    );
  };


  useEffect(() => {
  const loadLogs = async () => {
    if (isAuthenticated && user) {
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
}, [isAuthenticated, user]);

  return (
    <UserLogsContext.Provider value={{
      userLogs,
      userLogsLoaded,
      setUserLogs,
      addLog,
      removeLog,
      updateLog
    }}>
      {children}
    </UserLogsContext.Provider>
  );
};