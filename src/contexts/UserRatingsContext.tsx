import { createContext, useContext, useState } from "react";
import {
  getUserRatings,
  updateUserRating,
  updateUserRanking,
  updateUserRatingHistory,
} from "../services/ratingsfromtable";
import { useAuth } from "./AuthContext";
import { mediaGroupOf } from "../utils/rankedRatings";
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

  // Ratings are identified in memory by movie_entry_id (the movies_and_tv_entries
  // uuid), matching how they're stored and referenced in the DB.
  // `history` is passed when the title was rated before: unrating archives the
  // timeline, and rating it again carries on from there.
  const addRating = (movieEntryId, rating, movie, history = null) => {
    const newRating = {
      movie_entry_id: movieEntryId,
      user_id: user.id,
      rating: rating,
      movie_object: movie,
      created_at: new Date().toISOString(),
      rating_history: history ?? [{ rating, at: new Date().toISOString() }],
    };
    setUserRatings((prev) => [...prev, newRating]);
  };

  const updateRating = async (movieEntryId, newRating, movie) => {
    const current = userRatings.find((r) => r.movie_entry_id === movieEntryId);
    // The value the rating had before this change, recorded so the UI can
    // show what it was updated from.
    const previousRating = current?.rating ?? null;
    // Ranking is per rating value and per media type, so changing the rating
    // moves the title into a different ranked bucket - it lands at the bottom
    // of the new one. An unchanged value keeps the rank it already had.
    const valueChanged = Number(previousRating) !== Number(newRating);
    const group = mediaGroupOf(movie?.media_type);
    const nextRanking = valueChanged
      ? userRatings.reduce(
          (max, r) =>
            Number(r.rating) === Number(newRating) &&
            mediaGroupOf(r.movie_object?.media_type) === group &&
            Number.isInteger(r.ranking)
              ? Math.max(max, r.ranking)
              : max,
          0,
        ) + 1
      : null;
    setUserRatings((prev) =>
      prev.map((rating) => {
        if (rating.movie_entry_id !== movieEntryId) return rating;
        return {
          ...rating,
          rating: newRating,
          previous_rating: previousRating,
          movie_object: movie,
          updated_at: new Date().toISOString(),
          rating_history: [
            ...(rating.rating_history ?? []),
            { rating: newRating, at: new Date().toISOString() },
          ],
          ...(nextRanking != null ? { ranking: nextRanking } : {}),
        };
      }),
    );
    if (user && movieEntryId) {
      try {
        await updateUserRating(user.id, movieEntryId, newRating, previousRating);
        if (nextRanking != null) {
          await updateUserRanking(user.id, movieEntryId, nextRanking);
        }
      } catch (err) {
        console.error("Failed to update rating in Supabase:", err);
      }
    }
  };

  const removeRating = (movieEntryId) => {
    setUserRatings((prev) =>
      prev.filter((rating) => rating.movie_entry_id !== movieEntryId)
    );
  };

  // Remove one event (by index in the history array) from a rating's history.
  const deleteRatingHistoryEvent = async (movieEntryId, index) => {
    const row = userRatings.find((r) => r.movie_entry_id === movieEntryId);
    if (!row) return;
    const history = (row.rating_history ?? []).filter((_, i) => i !== index);
    setUserRatings((prev) =>
      prev.map((r) =>
        r.movie_entry_id === movieEntryId
          ? { ...r, rating_history: history }
          : r,
      ),
    );
    if (user) {
      try {
        await updateUserRatingHistory(user.id, movieEntryId, history);
      } catch (err) {
        console.error("Failed to delete rating history event:", err);
      }
    }
  };

  const updateRanking = async (movieEntryId, newRanking) => {
    // optimistic update in memory
    setUserRatings((prev) =>
      prev.map((r) =>
        r.movie_entry_id === movieEntryId ? { ...r, ranking: newRanking } : r
      )
    );
    if (user && movieEntryId) {
      try {
        await updateUserRanking(user.id, movieEntryId, newRanking);
      } catch (err) {
        console.error("Failed to update ranking in Supabase:", err);
      }
    }
  };

  // Renumber a whole ranking in one go. The in-memory list updates once and
  // only the rows whose ranking actually moved are written, in parallel -
  // ranking one-by-one used to mean a round trip per entry.
  const applyRankings = async (orderedEntryIds) => {
    const target = new Map(orderedEntryIds.map((id, i) => [id, i + 1]));
    const changed = userRatings
      .filter((r) => {
        const next = target.get(r.movie_entry_id);
        return next != null && r.ranking !== next;
      })
      .map((r) => r.movie_entry_id);
    if (!changed.length) return;
    setUserRatings((prev) =>
      prev.map((r) => {
        const next = target.get(r.movie_entry_id);
        return next != null && r.ranking !== next ? { ...r, ranking: next } : r;
      }),
    );
    if (!user) return;
    try {
      await Promise.all(
        changed.map((id) => updateUserRanking(user.id, id, target.get(id))),
      );
    } catch (err) {
      console.error("Failed to update rankings in Supabase:", err);
    }
  };

  useEffect(() => {
    const loadRatings = async () => {
      if (user && !hasFetched.current) {
        hasFetched.current = true;
        try {
          const ratings = await getUserRatings(user);
          setUserRatings(ratings);
          setUserRatingsLoaded(true);
        } catch (err) {
          // Mark loaded even on failure so pages gated on this flag (home,
          // magic lists) don't hang forever on one bad fetch.
          setUserRatingsLoaded(true);
          console.error(err);
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
        updateRanking,
        applyRankings,
        deleteRatingHistoryEvent,
      }}
    >
      {children}
    </UserRatingsContext.Provider>
  );
};
