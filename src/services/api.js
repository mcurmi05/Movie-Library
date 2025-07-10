const VITE_IMDB_API_KEY = import.meta.env.VITE_IMDB_API_KEY;

export const getPopularMovies = async () => {
    const url = 'https://imdb236.p.rapidapi.com/api/imdb/most-popular-movies';
    const options = {
      method: 'GET',
      headers: {
        'x-rapidapi-key': VITE_IMDB_API_KEY,
        'x-rapidapi-host': 'imdb236.p.rapidapi.com'
      }
    };

    try {
      const response = await fetch(url, options);
      const results = await response.json();
      console.log(results);
      return results
    } catch (error) {
      console.error(error);
    }
    
  };

export const searchMovies = async (query) => {
    const url = `https://imdb236.p.rapidapi.com/api/imdb/search?primaryTitleAutocomplete=${query}&rows=25&sortOrder=DESC&sortField=numVotes`;
    const options = {
      method: 'GET',
      headers: {
        'x-rapidapi-key': VITE_IMDB_API_KEY,
        'x-rapidapi-host': 'imdb236.p.rapidapi.com'
      }
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
