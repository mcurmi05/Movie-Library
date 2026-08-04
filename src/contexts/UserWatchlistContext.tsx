import { createContext, useContext, useState } from "react";
import {
  getUserWatchlist,
  getUserWatchlistQueue,
  addToWatchlistQueue,
  removeFromWatchlistQueue,
  updateWatchlistQueueRank,
} from "../services/ratingsfromtable";
import { useAuth } from "./AuthContext";
import { useEffect, useRef } from "react";

/* eslint-disable react-refresh/only-export-components */

const UserWatchlistContext = createContext();

export const useWatchlist = () => {
  const context = useContext(UserWatchlistContext);
  if (!context) {
    throw new Error("useWatchlist must be used within a UserWatchlistProvider");
  }
  return context;
};

export const UserWatchlistProvider = ({ children }) => {
  const [userWatchlist, setUserWatchlist] = useState([]);
  const [userWatchlistLoaded, setUserWatchlistLoaded] = useState(false);
  const [watchlistQueue, setWatchlistQueue] = useState([]);
  const [watchlistQueueLoaded, setWatchlistQueueLoaded] = useState(false);
  const { user } = useAuth();
  const hasFetched = useRef(false);

  const addWatchlist = (watchlist_id, movie) => {
    const newWatchlistEntry = {
      id: watchlist_id,
      movie_id: movie.id,
      user_id: user.id,
      movie_object: movie,
      created_at: new Date().toISOString(),
    };
    setUserWatchlist((prev) => [newWatchlistEntry, ...prev]);
  };

  const removeWatchlist = (watchlist_id) => {
    setUserWatchlist((prev) =>
      prev.filter((watchlist) => watchlist.id !== watchlist_id),
    );
    // Drop any queue entry that pointed at this watchlist row.
    setWatchlistQueue((prev) =>
      prev.filter((q) => q.watchlist_id !== watchlist_id),
    );
  };

  const nextQueueRank = () =>
    watchlistQueue.length
      ? Math.max(...watchlistQueue.map((q) => q.queue_rank || 0)) + 1
      : 1;

  // Add a watchlist (movie/TV) item to the end of the queue.
  const addToQueue = async (watchlist_id) => {
    if (!user) return;
    if (watchlistQueue.some((q) => q.watchlist_id === watchlist_id)) return;
    try {
      const row = await addToWatchlistQueue(
        user.id,
        { watchlistId: watchlist_id },
        nextQueueRank(),
      );
      setWatchlistQueue((prev) => [...prev, row]);
    } catch (err) {
      console.error("Error adding to watchlist queue:", err);
    }
  };

  // Add a book (book_tbr) item to the end of the queue.
  const addBookToQueue = async (book_tbr_id) => {
    if (!user) return;
    if (watchlistQueue.some((q) => q.book_tbr_id === book_tbr_id)) return;
    try {
      const row = await addToWatchlistQueue(
        user.id,
        { bookTbrId: book_tbr_id },
        nextQueueRank(),
      );
      setWatchlistQueue((prev) => [...prev, row]);
    } catch (err) {
      console.error("Error adding book to watchlist queue:", err);
    }
  };

  const removeFromQueue = async (queue_id) => {
    const previous = watchlistQueue;
    setWatchlistQueue((prev) => prev.filter((q) => q.id !== queue_id));
    try {
      await removeFromWatchlistQueue(queue_id);
    } catch (err) {
      console.error("Error removing from watchlist queue:", err);
      setWatchlistQueue(previous);
    }
  };

  // Renumber a whole queue in one go. The in-memory queue updates once and
  // only the rows that actually moved are written, in parallel - reordering
  // one row at a time meant a round trip per entry.
  const applyQueueRanks = async (orderedQueueIds) => {
    const target = new Map(orderedQueueIds.map((id, i) => [id, i + 1]));
    const changed = watchlistQueue.filter((q) => {
      const next = target.get(q.id);
      return next != null && q.queue_rank !== next;
    });
    if (!changed.length) return;
    setWatchlistQueue((prev) =>
      prev.map((q) => {
        const next = target.get(q.id);
        return next != null && q.queue_rank !== next
          ? { ...q, queue_rank: next }
          : q;
      }),
    );
    try {
      await Promise.all(
        changed.map((q) => updateWatchlistQueueRank(q.id, target.get(q.id))),
      );
    } catch (err) {
      console.error("Error updating watchlist queue ranks:", err);
    }
  };

  const updateNewSeason = (watchlist_id, value) => {
    setUserWatchlist((prev) =>
      prev.map((item) =>
        item.id === watchlist_id
          ? { ...item, new_season_to_watch: value }
          : item,
      ),
    );
  };

  useEffect(() => {
    const loadWatchlist = async () => {
      if (user && !hasFetched.current) {
        hasFetched.current = true;
        try {
          setUserWatchlistLoaded(false);
          const watchlist = await getUserWatchlist(user);
          setUserWatchlist(watchlist);
          setUserWatchlistLoaded(true);
        } catch (err) {
          // Mark loaded even on failure so pages gated on this flag (home,
          // magic lists) don't hang forever on one bad fetch.
          setUserWatchlistLoaded(true);
          console.error(err);
        }
        try {
          const queue = await getUserWatchlistQueue(user);
          setWatchlistQueue(queue);
          setWatchlistQueueLoaded(true);
        } catch (err) {
          setWatchlistQueueLoaded(false);
          console.error(err);
        }
      }
    };
    loadWatchlist();
  }, [user]);

  return (
    <UserWatchlistContext.Provider
      value={{
        userWatchlist,
        userWatchlistLoaded,
        setUserWatchlist,
        addWatchlist,
        removeWatchlist,
        updateNewSeason,
        watchlistQueue,
        watchlistQueueLoaded,
        addToQueue,
        addBookToQueue,
        removeFromQueue,
        applyQueueRanks,
      }}
    >
      {children}
    </UserWatchlistContext.Provider>
  );
};
