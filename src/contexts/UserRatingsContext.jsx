import { createContext, useContext, useState } from 'react';
import {getUserRatings} from "../services/ratingsfromtable.js"
import { useAuth } from './AuthContext.jsx';
import { useEffect } from 'react';  

/* eslint-disable react-refresh/only-export-components */

const UserRatingsContext = createContext();

export const useRatings = () => {
  const context = useContext(UserRatingsContext);
  if (!context) {
    throw new Error('useRatings must be used within a UserRatingsProvider');
  }
  return context;
};

export const UserRatingsProvider = ({ children }) => {
  const [userRatings, setUserRatings] = useState([]);
  const [userRatingsLoaded, setUserRatingsLoaded] = useState(false);
  const { isAuthenticated, user } = useAuth();


  useEffect(() => {
  const loadRatings = async () => {
    if (isAuthenticated && user) {
      try {
        setUserRatingsLoaded(false);
        const ratings = await getUserRatings();
        setUserRatings(ratings);
        setUserRatingsLoaded(true); 
      } catch (err) {
        setUserRatingsLoaded(false);
        console.log(err)
      }
    } else {
      setUserRatings([]);
      setUserRatingsLoaded(false);
    }
  };

  loadRatings();
}, [isAuthenticated, user]);

  return (
    <UserRatingsContext.Provider value={{
      userRatings,
      userRatingsLoaded,
      setUserRatings
    }}>
      {children}
    </UserRatingsContext.Provider>
  );
};