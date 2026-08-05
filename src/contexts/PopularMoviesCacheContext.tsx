import { createContext, useCallback, useContext, useState } from 'react';
/* eslint-disable react-refresh/only-export-components */

const PopularMoviesCacheContext = createContext();

export const useCache = () => {
  const context = useContext(PopularMoviesCacheContext);
  if (!context) {
    throw new Error('useCache must be used within a CacheProvider');
  }
  return context;
};

export const PopularMoviesCacheProvider = ({ children }) => {
  const [popularMovies, setPopularMovies] = useState(null);
  const [popularMoviesLoaded, setPopularMoviesLoaded] = useState(false);
  const [popularTV, setPopularTV] = useState(null);
  const [popularTVLoaded, setPopularTVLoaded] = useState(false);

  // Stable identities: callers pass these as effect dependencies, and a fresh
  // function each render re-fires the fetch on every re-render of the page.
  const cachePopularMovies = useCallback((movies) => {
    setPopularMovies(movies);
    setPopularMoviesLoaded(true);
  }, []);

  const cachePopularTV = useCallback((tv) => {
    setPopularTV(tv);
    setPopularTVLoaded(true);
  }, []);

  return (
    <PopularMoviesCacheContext.Provider value={{
      popularMovies,
      popularMoviesLoaded,
      cachePopularMovies,
      popularTV,
      popularTVLoaded,
      cachePopularTV,
    }}>
      {children}
    </PopularMoviesCacheContext.Provider>
  );
};