import { supabase } from "./supabase-client";
import { archiveRatingHistory, getArchivedRatingHistory } from "./ratingsfromtable";
import { upsertMovie, resolveFullMovie } from "./movieMetadata";

// Writing a movie/TV rating takes the same three steps everywhere: make sure
// the title has full metadata cached, write the row, then tell the ratings
// context. Shared so the star and the tier list can't drift apart.
export async function writeMovieRating({
  user,
  movie,
  isRated,
  newRating,
  addRating,
  updateRating,
}) {
  // Browse cards only carry tmdb_id, so fill the title in before caching it.
  const full =
    movie.tmdb_id != null && movie.id ? movie : await resolveFullMovie(movie);
  const movieEntryId = await upsertMovie(full);
  try {
    if (isRated) {
      const { error } = await supabase
        .from("user_ratings")
        .update({ rating: newRating })
        .eq("entry_id", movieEntryId)
        .eq("user_id", user.id);
      if (error) throw error;
      updateRating(movieEntryId, newRating, full);
    } else {
      // Rating a title that was unrated before picks its old timeline back up
      // rather than starting from scratch.
      const archived = await getArchivedRatingHistory(user.id, movieEntryId);
      const history = [
        ...archived,
        { rating: newRating, at: new Date().toISOString() },
      ];
      const { error } = await supabase.from("user_ratings").insert({
        user_id: user.id,
        rating: newRating,
        entry_id: movieEntryId,
        rating_history: history,
      });
      if (error) throw error;
      addRating(movieEntryId, newRating, full, history);
    }
    return movieEntryId;
  } catch (err) {
    console.error(err);
    return null;
  }
}

export async function removeMovieRating({
  user,
  movieEntryId,
  ratingHistory,
  removeRating,
}) {
  if (!movieEntryId) return false;
  try {
    // The row is about to go, and rating_history goes with it - park the
    // timeline so re-rating this title can pick it up again.
    await archiveRatingHistory(user.id, movieEntryId, ratingHistory);
    const { error } = await supabase
      .from("user_ratings")
      .delete()
      .eq("entry_id", movieEntryId)
      .eq("user_id", user.id);
    if (error) throw error;
    removeRating(movieEntryId);
    return true;
  } catch (err) {
    console.error(err);
    return false;
  }
}
