import { createContext, useContext, useState } from 'react';
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
  const [popularMedia, setPopularMedia] = useState(null);
  const [popularMediaType, setPopularMediaType] = useState(null);
  const [popularMediaLoaded, setPopularMediaLoaded] = useState(false);

  const cachePopularMedia = (media, type) => {
    setPopularMedia(media);
    setPopularMediaType(type);
    setPopularMediaLoaded(true);
  };

  const clearCache = () => {
    setPopularMedia(null);
    setPopularMediaType(null);
    setPopularMediaLoaded(false);
  };

  return (
    <PopularMoviesCacheContext.Provider value={{
      popularMedia,
      popularMediaType,
      popularMediaLoaded,
      cachePopularMedia,
      clearCache
    }}>
      {children}
    </PopularMoviesCacheContext.Provider>
  );
};