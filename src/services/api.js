const VITE_IMDB_API_KEY = import.meta.env.VITE_IMDB_API_KEY;
//apis
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
    console.log("movies received from api (not cached):");
    console.log(results);
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
    console.log("movies received from api (not cached):");
    console.log(results.results);
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
    console.log(results.results);
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
      "x-rapidapi-key": "46b22bd385mshe768d6b11d1a286p1ce852jsn385e4fb1e9e3",
      "x-rapidapi-host": "imdb236.p.rapidapi.com",
    },
  };

  try {
    const response = await fetch(url, options);
    const result = await response.json();
    console.log("movies received from api (not cached):");
    console.log(result);
    return result;
  } catch (error) {
    console.error(error);
  }
};
