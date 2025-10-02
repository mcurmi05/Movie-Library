// Update a user's rating in Supabase
export const updateUserRating = async (userId, imdbMovieId, newRating) => {
  const { data, error } = await supabase
    .from("ratings")
    .update({ rating: newRating, created_at: new Date().toISOString() })
    .eq("user_id", userId)
    .eq("imdb_movie_id", imdbMovieId);
  if (error) throw error;
  return data;
};
import { supabase } from "./supabase-client.js";

export const getUserRatings = async (user) => {
  if (!user) throw new Error("User must be authenticated to view ratings");
  const { data, error } = await supabase
    .from("ratings")
    .select("*")
    .eq("user_id", user.id);
  if (error) throw error;
  return data || [];
};

export const getRatingFromArray = (ratingsArray, imdbMovieId) => {
  const rating = ratingsArray.find((r) => r.imdb_movie_id === imdbMovieId);
  return rating ? rating.rating : null;
};

export const getUserLogs = async (user) => {
  if (!user) throw new Error("User must be authenticated to view logs");
  const { data, error } = await supabase
    .from("logs")
    .select("*")
    .order("created_at", { ascending: false })
    .eq("user_id", user.id);
  if (error) throw error;
  return data || [];
};

export const getUserWatchlist = async (user) => {
  if (!user) throw new Error("User must be authenticated to view watchlist");
  const { data, error } = await supabase
    .from("watchlist")
    .select("*")
    .order("created_at", { ascending: false })
    .eq("user_id", user.id);
  if (error) throw error;
  return data || [];
};
