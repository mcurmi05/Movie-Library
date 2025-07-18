import { createContext, useContext, useState } from 'react';
import { getUserWatchlist } from "../services/ratingsfromtable.js"
import { useAuth } from './AuthContext.jsx';
import { useEffect } from 'react';  

/* eslint-disable react-refresh/only-export-components */

const UserWatchlistContext = createContext();

export const useWatchlist = () => {
  const context = useContext(UserWatchlistContext);
  if (!context) {
    throw new Error('useWatchlist must be used within a UserWatchlistProvider');
  }
  return context;
};

export const UserWatchlistProvider = ({ children }) => {
  const [userWatchlist, setUserWatchlist] = useState([]);
  const [userWatchlistLoaded, setUserWatchlistLoaded] = useState(false);
  const { isAuthenticated, user } = useAuth();

  const addWatchlist = (watchlist_id, movie) => {
    const newWatchlistEntry = {
      id:watchlist_id,
      movie_id: movie.id,
      user_id: user.id,
      movie_object: movie,
      created_at: new Date().toISOString(), 
    };
    setUserWatchlist(prev => [newWatchlistEntry, ...prev]);
  };

  const removeWatchlist = (watchlist_id) => {
    setUserWatchlist(prev => 
      prev.filter(watchlist => watchlist.id !== watchlist_id)
    );
  };

  useEffect(() => {
  const loadWatchlist = async () => {
    if (isAuthenticated && user) {
      try {
        setUserWatchlistLoaded(false);
        const watchlist = await getUserWatchlist();
        setUserWatchlist(watchlist);
        setUserWatchlistLoaded(true); 
      } catch (err) {
        setUserWatchlistLoaded(false);
        console.log(err)
      }
    } else {
      setUserWatchlist([]);
      setUserWatchlistLoaded(false);
    }
  };
  loadWatchlist();
}, [isAuthenticated, user]);

  return (
    <UserWatchlistContext.Provider value={{
      userWatchlist,
      userWatchlistLoaded,
      setUserWatchlist,
      addWatchlist,
      removeWatchlist,
    }}>
      {children}
    </UserWatchlistContext.Provider>
  );
};