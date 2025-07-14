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

  const addRating = (movieId, rating) => {
    const newRating = {
      imdb_movie_id: movieId,
      user_id: user.id,
      rating: rating,
    };
    setUserRatings(prev => [...prev, newRating]);
  };

  const updateRating = (movieId, newRating) => {
    setUserRatings(prev => 
      prev.map(rating => 
        rating.imdb_movie_id === movieId 
          ? { ...rating, rating: newRating }
          : rating
      )
    );
  };

  const removeRating = (movieId) => {
    setUserRatings(prev => 
      prev.filter(rating => rating.imdb_movie_id !== movieId)
    );
  };


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
      setUserRatings,
      addRating,
      removeRating,
      updateRating
    }}>
      {children}
    </UserRatingsContext.Provider>
  );
};