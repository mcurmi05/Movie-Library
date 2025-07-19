const VITE_IMDB_API_KEY = import.meta.env.VITE_IMDB_API_KEY;

export const getPopularMovies = async () => {
  const url = "https://imdb236.p.rapidapi.com/api/imdb/most-popular-movies";
  const options = {
    method: "GET",
    headers: {
      "x-rapidapi-key": VITE_IMDB_API_KEY,
      "x-rapidapi-host": "imdb236.p.rapidapi.com",
    },
  };

  try {
    const response = await fetch(url, options);
    const results = await response.json();
    console.log("Top 100 Popular Movies (received directly from api):", results);
    return results;
  } catch (error) {
    console.error(error);
  }
};

export const getPopularTV = async () => {
  const url = "https://imdb236.p.rapidapi.com/api/imdb/most-popular-tv";
  const options = {
    method: "GET",
    headers: {
      "x-rapidapi-key": VITE_IMDB_API_KEY,
      "x-rapidapi-host": "imdb236.p.rapidapi.com",
    },
  };

  try {
    const response = await fetch(url, options);
    const results = await response.json();
    console.log("Top 100 TV Shows (received directly from api):", results);
    return results;
  } catch (error) {
    console.error(error);
  }
};

export const searchMovies = async (query) => {
  const url = `https://imdb236.p.rapidapi.com/api/imdb/search?primaryTitleAutocomplete=${query}&rows=100&sortOrder=DESC&sortField=numVotes`;
  const options = {
    method: "GET",
    headers: {
      "x-rapidapi-key": VITE_IMDB_API_KEY,
      "x-rapidapi-host": "imdb236.p.rapidapi.com",
    },
  };

  try {
    const response = await fetch(url, options);
    const results = await response.json();
    console.log("Searched movie received from api:", results.results);
    return results.results;
  } catch (error) {
    console.error(error);
  }
};

export const searchMoviesFIRSTFIVEONLY = async (query) => {
  const url = `https://imdb236.p.rapidapi.com/api/imdb/search?primaryTitleAutocomplete=${query}&rows=5&sortOrder=DESC&sortField=numVotes`;
  const options = {
    method: "GET",
    headers: {
      "x-rapidapi-key": VITE_IMDB_API_KEY,
      "x-rapidapi-host": "imdb236.p.rapidapi.com",
    },
  };

  try {
    const response = await fetch(url, options);
    const results = await response.json();
    console.log("5 dropdown movies (received directly from API:)",results.results);
    return results.results;
  } catch (error) {
    console.error(error);
  }
};

export const getMovieById = async (id) => {
  const url = `https://imdb236.p.rapidapi.com/api/imdb/${id}`;
  const options = {
    method: "GET",
    headers: {
      "x-rapidapi-key": VITE_IMDB_API_KEY,
      "x-rapidapi-host": "imdb236.p.rapidapi.com",
    },
  };

  try {
    const response = await fetch(url, options);
    const result = await response.json();
    console.log("Movie with extra detail, received by ID (directly from API)", result);
    console.log(result);
    return result;
  } catch (error) {
    console.error(error);
  }
};
