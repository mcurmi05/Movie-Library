import {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
} from "react";
import {
  getUserBookRatings,
  createBookRating as createBookRatingService,
  updateBookRating as updateBookRatingService,
  deleteBookRating as deleteBookRatingService,
  findOrCreateBookEntry,
  archiveRatingHistory,
  getArchivedRatingHistory,
} from "../services/ratingsfromtable";
import { useAuth } from "./AuthContext";
import { isSameBook } from "./UserBookTbrContext";

/* eslint-disable react-refresh/only-export-components */

const UserBookRatingsContext = createContext();

export const useBookRatings = () => {
  const context = useContext(UserBookRatingsContext);
  if (!context) {
    throw new Error(
      "useBookRatings must be used within a UserBookRatingsProvider",
    );
  }
  return context;
};

export const UserBookRatingsProvider = ({ children }) => {
  const [bookRatings, setBookRatings] = useState([]);
  const [bookRatingsLoaded, setBookRatingsLoaded] = useState(false);
  const { user } = useAuth();
  const hasFetched = useRef(false);

  // Resolve a "book" argument (which can be a row from any table or loose form data)
  // into a book_entries id. Find-or-create the entry when only loose data is provided.
  const resolveBookId = async (book) => {
    if (!book) return null;
    if (book.book_id) return book.book_id;
    // book_entries row passed directly?
    if (book.id && !book.user_id && book.title) return book.id;
    const source = book.book_entries || book;
    const entry = await findOrCreateBookEntry(source);
    return entry?.id || null;
  };

  // Try book_id first (post-migration), otherwise fall back to title/author/
  // goodreads_link matching (handles legacy rows without book_id, or rows
  // created separately that haven't been linked yet).
  const matchesBook = (row, book) => {
    if (!row || !book) return false;
    const rId = row.book_id || row.book_entries?.id;
    const bId =
      book.book_id ||
      book.book_entries?.id ||
      (book.id && !book.user_id && book.title ? book.id : null);
    if (rId && bId && rId === bId) return true;
    return isSameBook(row.book_entries || row, book.book_entries || book);
  };

  const findRatingForBook = (book) =>
    bookRatings.find((r) => r.user_id === user?.id && matchesBook(r, book));

  // Bottom of the ranked bucket a book rated `value` belongs to.
  const bottomRankFor = (value) =>
    bookRatings.reduce(
      (max, r) =>
        Number(r.book_rating) === Number(value) && Number.isInteger(r.ranking)
          ? Math.max(max, r.ranking)
          : max,
      0,
    ) + 1;

  const rateBook = async (book, newRating) => {
    if (!user) return;
    const isClear = newRating == null || Number(newRating) === 0;
    const existing = findRatingForBook(book);
    const bookId = existing?.book_id || (await resolveBookId(book));

    if (isClear) {
      if (existing) {
        try {
          // The row carries rating_history, so park it before the delete and
          // rating this book again picks the timeline back up.
          await archiveRatingHistory(user.id, bookId, existing.rating_history);
          await deleteBookRatingService(existing.id);
          setBookRatings((prev) => prev.filter((r) => r.id !== existing.id));
        } catch (err) {
          console.error("Error deleting book rating:", err);
        }
      }
      return;
    }

    if (existing) {
      // No-op if the rating value hasn't actually changed, so updated_at
      // keeps pointing at the last real change.
      if (Number(existing.book_rating) === Number(newRating)) {
        return;
      }
      try {
        const updated = await updateBookRatingService(existing.id, {
          book_rating: newRating,
          // Ranking is per rating value, so a new value means a new bucket -
          // the book lands at the bottom of it.
          ranking: bottomRankFor(newRating),
          previous_rating: existing.book_rating ?? null,
          updated_at: new Date().toISOString(),
          rating_history: [
            ...(existing.rating_history ?? []),
            { rating: newRating, at: new Date().toISOString() },
          ],
        });
        setBookRatings((prev) =>
          prev.map((r) =>
            r.id === existing.id ? { ...r, ...(updated || {}) } : r,
          ),
        );
      } catch (err) {
        console.error("Error updating book rating:", err);
      }
    } else {
      try {
        const archived = await getArchivedRatingHistory(user.id, bookId);
        const newRow = await createBookRatingService({
          user_id: user.id,
          book_id: bookId,
          book_rating: newRating,
          ranking: bottomRankFor(newRating),
          rating_history: [
            ...archived,
            { rating: newRating, at: new Date().toISOString() },
          ],
        });
        setBookRatings((prev) => [newRow, ...prev]);
      } catch (err) {
        console.error("Error creating book rating:", err);
      }
    }
  };

  // Remove one event (by index in the history array) from a rating's history.
  const deleteBookRatingHistoryEvent = async (ratingId, index) => {
    const row = bookRatings.find((r) => r.id === ratingId);
    if (!row) return;
    const history = (row.rating_history ?? []).filter((_, i) => i !== index);
    setBookRatings((prev) =>
      prev.map((r) =>
        r.id === ratingId ? { ...r, rating_history: history } : r,
      ),
    );
    try {
      await updateBookRatingService(ratingId, { rating_history: history });
    } catch (err) {
      console.error("Error deleting book rating history event:", err);
    }
  };

  const syncBookEntry = (bookId, updatedEntry) => {
    if (!bookId) return;
    setBookRatings((prev) =>
      prev.map((r) =>
        r.book_id === bookId
          ? { ...r, book_entries: { ...(r.book_entries || {}), ...updatedEntry } }
          : r,
      ),
    );
  };

  const updateBookRankingValue = async (ratingId, newRanking) => {
    setBookRatings((prev) =>
      prev.map((r) =>
        r.id === ratingId ? { ...r, ranking: newRanking } : r,
      ),
    );
    try {
      await updateBookRatingService(ratingId, { ranking: newRanking });
    } catch (err) {
      console.error("Error updating book ranking:", err);
    }
  };

  // Renumber a whole book ranking at once: one state update, and only the
  // rows that actually moved get written, in parallel.
  const applyBookRankings = async (orderedRatingIds) => {
    const target = new Map(orderedRatingIds.map((id, i) => [id, i + 1]));
    const changed = bookRatings
      .filter((r) => {
        const next = target.get(r.id);
        return next != null && r.ranking !== next;
      })
      .map((r) => r.id);
    if (!changed.length) return;
    setBookRatings((prev) =>
      prev.map((r) => {
        const next = target.get(r.id);
        return next != null && r.ranking !== next ? { ...r, ranking: next } : r;
      }),
    );
    try {
      await Promise.all(
        changed.map((id) =>
          updateBookRatingService(id, { ranking: target.get(id) }),
        ),
      );
    } catch (err) {
      console.error("Error updating book rankings:", err);
    }
  };

  useEffect(() => {
    const load = async () => {
      if (!user || hasFetched.current) return;
      try {
        hasFetched.current = true;
        const rows = await getUserBookRatings(user);

        // Backfill rankings for ratings missing a ranking
        const unranked = rows.filter((r) => r.ranking == null);
        let finalRows = rows;
        if (unranked.length > 0) {
          const maxRank = rows.reduce(
            (m, r) =>
              Number.isInteger(r.ranking) ? Math.max(m, r.ranking) : m,
            0,
          );
          const sorted = [...unranked].sort(
            (a, b) => new Date(b.created_at) - new Date(a.created_at),
          );
          const ranks = new Map(
            sorted.map((r, i) => [r.id, maxRank + i + 1]),
          );
          finalRows = rows.map((r) =>
            ranks.has(r.id) ? { ...r, ranking: ranks.get(r.id) } : r,
          );
          try {
            await Promise.all(
              [...ranks].map(([id, ranking]) =>
                updateBookRatingService(id, { ranking }),
              ),
            );
          } catch (err) {
            console.error("Error backfilling book rating rankings:", err);
          }
        }

        setBookRatings(finalRows);
        setBookRatingsLoaded(true);
      } catch (err) {
        console.error("Error fetching book ratings:", err);
        setBookRatingsLoaded(true);
      }
    };
    load();
  }, [user]);

  useEffect(() => {
    if (!user) {
      setBookRatings([]);
      setBookRatingsLoaded(false);
      hasFetched.current = false;
    }
  }, [user]);

  return (
    <UserBookRatingsContext.Provider
      value={{
        bookRatings,
        bookRatingsLoaded,
        rateBook,
        findRatingForBook,
        updateBookRanking: updateBookRankingValue,
        applyBookRankings,
        deleteBookRatingHistoryEvent,
        syncBookEntry,
      }}
    >
      {children}
    </UserBookRatingsContext.Provider>
  );
};
