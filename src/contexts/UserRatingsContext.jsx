import { createContext, useContext, useState } from "react";
import {
  getUserRatings,
  updateUserRating,
} from "../services/ratingsfromtable.js";
import { useAuth } from "./AuthContext.jsx";
import { useEffect, useRef } from "react";

/* eslint-disable react-refresh/only-export-components */

const UserRatingsContext = createContext();

export const useRatings = () => {
  const context = useContext(UserRatingsContext);
  if (!context) {
    throw new Error("useRatings must be used within a UserRatingsProvider");
  }
  return context;
};

export const UserRatingsProvider = ({ children }) => {
  const [userRatings, setUserRatings] = useState([]);
  const [userRatingsLoaded, setUserRatingsLoaded] = useState(false);
  const { user } = useAuth();
  const hasFetched = useRef(false);

  const addRating = (movieId, rating, movie) => {
    const newRating = {
      imdb_movie_id: movieId,
      user_id: user.id,
      rating: rating,
      movie_object: movie,
      created_at: new Date().toISOString(),
    };
    setUserRatings((prev) => [...prev, newRating]);
  };

  const updateRating = async (movieId, newRating, movie) => {
    setUserRatings((prev) =>
      prev.map((rating) =>
        rating.imdb_movie_id === movieId
          ? {
              ...rating,
              rating: newRating,
              movie_object: movie,
              created_at: new Date().toISOString(),
            }
          : rating
      )
    );
    if (user && movieId) {
      try {
        await updateUserRating(user.id, movieId, newRating);
      } catch (err) {
        console.error("Failed to update rating in Supabase:", err);
      }
    }
  };

  const removeRating = (movieId) => {
    setUserRatings((prev) =>
      prev.filter((rating) => rating.imdb_movie_id !== movieId)
    );
  };

  useEffect(() => {
    const loadRatings = async () => {
      if (user && !hasFetched.current) {
        hasFetched.current = true;
        try {
          const ratings = await getUserRatings(user);
          console.log(ratings);
          setUserRatings(ratings);
          setUserRatingsLoaded(true);
        } catch (err) {
          setUserRatingsLoaded(false);
          console.log(err);
        }
      }
    };
    loadRatings();
  }, [user]);

  return (
    <UserRatingsContext.Provider
      value={{
        userRatings,
        userRatingsLoaded,
        setUserRatings,
        addRating,
        removeRating,
        updateRating,
      }}
    >
      {children}
    </UserRatingsContext.Provider>
  );
};
