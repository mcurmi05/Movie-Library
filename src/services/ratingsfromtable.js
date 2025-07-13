import { supabase } from "./supabase-client.js";

export const getUserRatings = async () => {
  try {
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      throw new Error("User must be authenticated to view ratings");
    }

    const { data, error } = await supabase
      .from("ratings")
      .select("*")
      .eq("user_id", user.id);

    if (error) throw error;

    return data || [];
  } catch (error) {
    console.error("Error getting user ratings:", error);
    throw error;
  }
};

export const getRatingFromArray = (ratingsArray, imdbMovieId) => {
  const rating = ratingsArray.find((r) => r.imdb_movie_id === imdbMovieId);
  return rating ? rating.rating : null;
};
