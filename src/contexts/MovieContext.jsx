//state manager for our favourite movies
/* eslint-disable react-refresh/only-export-components */

import { createContext, useState, useContext, useEffect } from "react";

const MovieContext = createContext();

export const useMovieContext = () => useContext(MovieContext);

//children is a reserved prop when you write a component and children is anything thats inside of the component you rendered
//eg <MovieProvider>
//        <Thing></Thing>
//   </MovieProvider>
// here thing is a child of movieprovider so the children prop of movieprovider contains the thing component

export const MovieProvider = ({ children }) => {
  const [favourites, setFavourites] = useState(() => {
    const storedFavourites = localStorage.getItem("favourites");
    return storedFavourites ? JSON.parse(storedFavourites) : [];
  });

  useEffect(() => {
    localStorage.setItem("favourites", JSON.stringify(favourites));
  }, [favourites]);

  const addToFavourites = (movie) => {
    //this is how you add to a state cant just push a value to favourites
    setFavourites((prev) => [...prev, movie]);
  };

  const removeFromFavourites = (movieId) => {
    setFavourites((prev) => prev.filter((movie) => movie.id !== movieId));
  };

  const isFavourite = (movieId) => {
    return favourites.some((movie) => movie.id === movieId);
  };

  const value = {
    favourites,
    addToFavourites,
    removeFromFavourites,
    isFavourite,
  };

  return (
    <MovieContext.Provider value={value}>{children}</MovieContext.Provider>
  );
};