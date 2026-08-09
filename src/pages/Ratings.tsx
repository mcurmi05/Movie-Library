import { useRatings } from "../contexts/UserRatingsContext";
import { useBookRatings } from "../contexts/UserBookRatingsContext";
import ListComponent from "../components/common/ListComponent";
import AddToList from "../components/common/AddToList";
import BookRating from "../components/books/BookRating";
import PaginationControls from "../components/common/PaginationControls";
import { usePagination, pageBounds } from "../hooks/usePagination";
import PosterWall from "../components/common/PosterWall";
import { useMemo, useState, useEffect, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { getBookInfo } from "../utils/bookInfo";
import { bookDetailsRouteForBook } from "../utils/goodreads";
import { movieCoverFor, bookCoverFor } from "../utils/coverImage";
import { useCovers } from "../contexts/UserCoversContext";
import { useAuth } from "../contexts/AuthContext";
import RankedRatingsPicker from "../components/common/RankedRatingsPicker";
import {
  getRankedRatings,
  isRankedRating,
  MEDIA_GROUP_ORDER,
  mediaGroupOf,
} from "../utils/rankedRatings";
import SortByMenu from "../components/filters/SortByMenu";
import ReleaseYearFilter from "../components/filters/ReleaseYearFilter";
import DateAddedFilter from "../components/filters/DateAddedFilter";
import Loader from "../components/layout/Loader";
import { useImdbRatings } from "../contexts/ImdbRatingsContext";
import { useLetterboxdRatings } from "../contexts/LetterboxdRatingsContext";
import { useGoodreadsRatings } from "../contexts/GoodreadsRatingsContext";
import ExtraFiltersPanel from "../components/filters/ExtraFiltersPanel";
import { useDebouncedValue } from "../utils/useDebouncedValue";
import { useDragOrder } from "../hooks/useDragOrder";
import { GripVertical } from "lucide-react";
import "../styles/search/Toolbar.css";
import { isTV, movieYear, bookYear, compareNums, yearInRange, addedInRange, imdbRatingFor, imdbVotesFor, letterboxdRatingFor, letterboxdCountFor, goodreadsRatingFor, goodreadsCountFor } from "../utils/mediaFilters";

const SORT_OPTIONS = [
  { value: "date", label: "Date Added" },
  { value: "year", label: "Release Date" },
  { value: "rating", label: "Rating" },
  { value: "imdb", label: "IMDb Rating" },
  { value: "imdbVotes", label: "IMDb Votes" },
  { value: "letterboxd", label: "Letterboxd Rating" },
  { value: "letterboxdCount", label: "Letterboxd Votes" },
  { value: "goodreads", label: "Goodreads Rating" },
  { value: "goodreadsCount", label: "Goodreads Votes" },
];

function Ratings() {
  const { userRatings, userRatingsLoaded, applyRankings } = useRatings();
  const { bookRatings, bookRatingsLoaded, applyBookRankings } =
    useBookRatings();
  const { ratings: imdbRatings } = useImdbRatings();
  const { ratings: lbRatings } = useLetterboxdRatings();
  const { ratings: grRatings } = useGoodreadsRatings();
  const covers = useCovers();
  const { user } = useAuth();
  const rankedRatings = useMemo(() => getRankedRatings(user), [user]);

  const navigate = useNavigate();
  const location = useLocation();
  // posters = the poster wall (default), default = the detailed list.
  const [viewMode, setViewMode] = useState(() => {
    const saved = localStorage.getItem("ratings-view-mode");
    if (saved === "default") return saved;
    // Older builds stored wall/extended.
    return saved === "extended" ? "default" : "posters";
  });
  useEffect(() => {
    localStorage.setItem("ratings-view-mode", viewMode);
  }, [viewMode]);
  const [searchTerm, setSearchTerm] = useState(
    location.state?.searchTerm || "",
  );
  // Debounced copy used for filtering so it doesn't run on every keystroke.
  const debouncedSearch = useDebouncedValue(searchTerm);
  const [ratingFilter, setRatingFilter] = useState(
    location.state?.ratingFilter || "all",
  );
  const [mediaTypeFilter, setMediaTypeFilter] = useState(
    location.state?.mediaTypeFilter || "all",
  );
  const [sortKey, setSortKey] = useState(
    location.state?.sortKey || "date",
  );
  const [sortDir, setSortDir] = useState(location.state?.sortDir || "desc");
  const [yearFrom, setYearFrom] = useState(location.state?.yearFrom || "");
  const [yearTo, setYearTo] = useState(location.state?.yearTo || "");
  const [addedFrom, setAddedFrom] = useState(location.state?.addedFrom || "");
  const [addedTo, setAddedTo] = useState(location.state?.addedTo || "");
  const [genreFilter, setGenreFilter] = useState(location.state?.genreFilter || "all");
  const [filtersOpen, setFiltersOpen] = useState(() => {
    const s = location.state || {};
    return (
      (s.ratingFilter && s.ratingFilter !== "all") ||
      (s.genreFilter && s.genreFilter !== "all") ||
      s.yearFrom ||
      s.yearTo ||
      s.addedFrom ||
      s.addedTo ||
      (s.sortKey && s.sortKey !== "date") ||
      (s.sortDir && s.sortDir !== "desc")
    );
  });
  //rank mode: none | movies | tv | books
  const [rankModeType, setRankModeType] = useState("none");
  // Poster view option: split the wall into one panel per rating value.
  const [groupByRating, setGroupByRating] = useState(
    () => localStorage.getItem("ratings-poster-groups") === "1",
  );
  useEffect(() => {
    localStorage.setItem("ratings-poster-groups", groupByRating ? "1" : "0");
  }, [groupByRating]);
  // Drag posters inside a rating panel to set their ranking.
  const [posterRankMode, setPosterRankMode] = useState(false);

  const pag = usePagination(
    [
      debouncedSearch,
      ratingFilter,
      genreFilter,
      mediaTypeFilter,
      sortKey,
      sortDir,
      yearFrom,
      yearTo,
      addedFrom,
      addedTo,
      rankModeType,
    ].join("|"),
  );

  const activeFilterCount =
    (ratingFilter !== "all" ? 1 : 0) +
    (genreFilter !== "all" ? 1 : 0) +
    (yearFrom || yearTo ? 1 : 0) +
    (addedFrom || addedTo ? 1 : 0) +
    (sortKey !== "date" || sortDir !== "desc" ? 1 : 0);

  const goToLog = () => {
    navigate("/log", {
      state: {
        searchTerm,
        ratingFilter,
        genreFilter,
        mediaTypeFilter,
        sortKey,
        sortDir,
        yearFrom,
        yearTo,
        addedFrom,
        addedTo,
      },
    });
  };

  const goToWatchlist = () => {
    navigate("/watchlist", {
      state: {
        searchTerm,
        genreFilter,
        mediaTypeFilter,
        sortKey,
        sortDir,
        yearFrom,
        yearTo,
        addedFrom,
        addedTo,
      },
    });
  };

  //thin wrappers around the shared helpers so call sites stay short
  const yearMatchesFilter = (y) => yearInRange(y, yearFrom, yearTo);
  const addedMatchesFilter = (d) => addedInRange(d, addedFrom, addedTo);
  const compareNumeric = (a, b) => compareNums(a, b, sortDir);
  //live imdb rating/votes, falls back to whats on the movie object until the dataset loads
  const imdbRatingOf = (mo) => imdbRatingFor(imdbRatings, mo);
  const imdbVotesOf = (mo) => imdbVotesFor(imdbRatings, mo);
  const lbRatingOf = (mo) => letterboxdRatingFor(lbRatings, mo);
  const lbCountOf = (mo) => letterboxdCountFor(lbRatings, mo);
  //live goodreads rating/votes for a book row; movies/tv return null
  const grRatingOf = (row) => goodreadsRatingFor(grRatings, row);
  const grCountOf = (row) => goodreadsCountFor(grRatings, row);

  const movieRatingValue = (r) => {
    const v = Number(r.rating);
    return Number.isFinite(v) ? v : null;
  };
  const bookRatingValue = (r) => {
    const v = Number(r.book_rating);
    return Number.isFinite(v) ? v : null;
  };

  const yearRange = useMemo(() => {
    const years = [];
    userRatings.forEach((r) => {
      const y = movieYear(r);
      if (y != null) years.push(y);
    });
    bookRatings.forEach((r) => {
      const y = bookYear(r);
      if (y != null) years.push(y);
    });
    const now = new Date().getFullYear();
    const max = years.length ? Math.max(now + 1, Math.max(...years)) : now + 1;
    return { min: 1500, max };
  }, [userRatings, bookRatings]);

  const availableGenres = useMemo(() => {
    const set = new Set();
    userRatings.forEach((r) => {
      (r.movie_object?.interests || []).forEach((g) => set.add(g));
    });
    return Array.from(set).sort();
  }, [userRatings]);

  // Rank mode ranks one bucket at a time: one media type at one rating value.
  // Turning it on pins the media filter to that type and the rating filter to
  // a value that has ranking switched on.
  useEffect(() => {
    if (rankModeType === "none") return;
    setMediaTypeFilter(rankModeType);
    setRatingFilter((current) =>
      isRankedRating(rankedRatings, current)
        ? current
        : String(rankedRatings[0] ?? 10),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rankModeType]);

  const handleRatingFilterChange = (newValue) => {
    setRatingFilter(newValue);
    // Ranking a value that isn't ranked means nothing, so leave rank mode.
    if (rankModeType !== "none" && !isRankedRating(rankedRatings, newValue)) {
      setRankModeType("none");
    }
  };

  // Is the page currently showing exactly one ranked bucket? That's what makes
  // rank order meaningful, and what the reorder controls need.
  const rankedValue = isRankedRating(rankedRatings, ratingFilter)
    ? Number(ratingFilter)
    : null;

  //no early return before hooks, loading state renders in jsx
  const isTVItem = (item) => isTV(item.movie_object);

  const includeMoviesTV =
    mediaTypeFilter === "all" ||
    mediaTypeFilter === "moviesAndTV" ||
    mediaTypeFilter === "movies" ||
    mediaTypeFilter === "tv";
  const includeBooks =
    mediaTypeFilter === "all" || mediaTypeFilter === "books";

  const filteredRatings = userRatings.filter((rating) => {
    if (!includeMoviesTV) return false;
    const itemIsTV = isTVItem(rating);
    if (mediaTypeFilter === "movies" && itemIsTV) return false;
    if (mediaTypeFilter === "tv" && !itemIsTV) return false;
    if (debouncedSearch.trim()) {
      const title = rating.movie_object?.primaryTitle || "";
      if (!title.toLowerCase().includes(debouncedSearch.toLowerCase())) return false;
    }
    if (ratingFilter !== "all") {
      if (Number(rating.rating) !== Number(ratingFilter)) return false;
    }
    if (genreFilter !== "all") {
      const genres = rating.movie_object?.interests || [];
      if (!genres.includes(genreFilter)) return false;
    }
    if (!yearMatchesFilter(movieYear(rating))) return false;
    if (!addedMatchesFilter(rating.created_at)) return false;
    return true;
  });

  // The rows of the bucket rank mode is currently reordering.
  const rankBucket = useMemo(() => {
    if (rankedValue == null) return [];
    return filteredRatings.filter((r) => Number(r.rating) === rankedValue);
  }, [filteredRatings, rankedValue]);

  // Rank order within a bucket: movies before TV, then rank asc (1..n), then
  // created_at desc for anything still unranked.
  const rankSort = useCallback((a, b) => {
    const ga = MEDIA_GROUP_ORDER[mediaGroupOf(a.movie_object?.media_type)];
    const gb = MEDIA_GROUP_ORDER[mediaGroupOf(b.movie_object?.media_type)];
    if (ga !== gb) return ga - gb;
    const ra = a.ranking ?? Number.MAX_SAFE_INTEGER;
    const rb = b.ranking ?? Number.MAX_SAFE_INTEGER;
    if (ra !== rb) return ra - rb;
    const dateA = new Date(a.created_at);
    const dateB = new Date(b.created_at);
    return dateB - dateA;
  }, []);

  // Display list respects rank when filtering 10s, otherwise default date sort
  const sortedRatings = useMemo(() => {
    if (sortKey === "year") {
      return filteredRatings.slice().sort((a, b) => {
        const yc = compareNumeric(movieYear(a), movieYear(b));
        if (yc !== 0) return yc;
        return new Date(b.created_at) - new Date(a.created_at);
      });
    }
    if (sortKey === "rating") {
      // Rating sort reads as blocks: every 10 (movies in rank order, then TV),
      // then every 9.5, and so on down.
      return filteredRatings.slice().sort((a, b) => {
        const rc = compareNumeric(movieRatingValue(a), movieRatingValue(b));
        if (rc !== 0) return rc;
        return rankSort(a, b);
      });
    }
    if (sortKey === "imdb" || sortKey === "imdbVotes") {
      const valOf = sortKey === "imdb" ? imdbRatingOf : imdbVotesOf;
      return filteredRatings.slice().sort((a, b) => {
        const rc = compareNumeric(valOf(a.movie_object), valOf(b.movie_object));
        if (rc !== 0) return rc;
        return new Date(b.created_at) - new Date(a.created_at);
      });
    }
    if (sortKey === "letterboxd" || sortKey === "letterboxdCount") {
      const valOf = sortKey === "letterboxd" ? lbRatingOf : lbCountOf;
      return filteredRatings.slice().sort((a, b) => {
        const rc = compareNumeric(valOf(a.movie_object), valOf(b.movie_object));
        if (rc !== 0) return rc;
        return new Date(b.created_at) - new Date(a.created_at);
      });
    }
    // Filtered down to a single ranked rating value: show that bucket in its
    // own order rather than by date.
    if (rankedValue != null) {
      return [...rankBucket].sort(rankSort);
    }
    return filteredRatings.slice().sort((a, b) => {
      const dateA = new Date(a.created_at);
      const dateB = new Date(b.created_at);
      return sortDir === "asc" ? dateA - dateB : dateB - dateA;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filteredRatings, rankBucket, rankedValue, rankSort, sortKey, sortDir, imdbRatings, lbRatings]);

  // Books: every row in book_ratings is a rated book
  const filteredBooks = useMemo(() => {
    if (!includeBooks) return [];
    if (genreFilter !== "all") return [];
    return bookRatings.filter((bookRating) => {
      if (debouncedSearch.trim()) {
        const info = getBookInfo(bookRating);
        const title = (info.title || "").toLowerCase();
        const author = (info.author || "").toLowerCase();
        const search = debouncedSearch.toLowerCase();
        if (!title.includes(search) && !author.includes(search)) return false;
      }
      if (ratingFilter !== "all") {
        if (Number(bookRating.book_rating) !== Number(ratingFilter))
          return false;
      }
      if (!yearMatchesFilter(bookYear(bookRating))) return false;
      if (!addedMatchesFilter(bookRating.created_at)) return false;
      return true;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookRatings, debouncedSearch, ratingFilter, includeBooks, yearFrom, yearTo, addedFrom, addedTo]);

  const bookSortDate = (b) => new Date(b.created_at);

  const bookRankSort = useCallback((a, b) => {
    const ra = a.ranking ?? Number.MAX_SAFE_INTEGER;
    const rb = b.ranking ?? Number.MAX_SAFE_INTEGER;
    if (ra !== rb) return ra - rb;
    return bookSortDate(b) - bookSortDate(a);
  }, []);

  const sortedBooks = useMemo(() => {
    if (sortKey === "year") {
      return filteredBooks.slice().sort((a, b) => {
        const yc = compareNumeric(bookYear(a), bookYear(b));
        if (yc !== 0) return yc;
        return bookSortDate(b) - bookSortDate(a);
      });
    }
    if (sortKey === "rating") {
      return filteredBooks.slice().sort((a, b) => {
        const rc = compareNumeric(bookRatingValue(a), bookRatingValue(b));
        if (rc !== 0) return rc;
        return bookRankSort(a, b);
      });
    }
    if (sortKey === "goodreads" || sortKey === "goodreadsCount") {
      const valOf = sortKey === "goodreads" ? grRatingOf : grCountOf;
      return filteredBooks.slice().sort((a, b) => {
        const rc = compareNumeric(valOf(a), valOf(b));
        if (rc !== 0) return rc;
        return bookSortDate(b) - bookSortDate(a);
      });
    }
    if (rankedValue != null) {
      return filteredBooks.slice().sort(bookRankSort);
    }
    return filteredBooks
      .slice()
      .sort((a, b) =>
        sortDir === "asc"
          ? bookSortDate(a) - bookSortDate(b)
          : bookSortDate(b) - bookSortDate(a),
      );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filteredBooks, rankedValue, bookRankSort, sortKey, sortDir, grRatings]);

  // Move rank up/down among 10s by swapping ranking values and normalizing
  // Note: normalization handled implicitly by applyRankOrder indices

  const applyRankOrder = (orderedIds) => applyRankings(orderedIds);

  const handleMove = async (entryId, direction) => {
    const tensSorted = [...rankBucket].sort(rankSort);
    const index = tensSorted.findIndex((r) => r.movie_entry_id === entryId);
    if (index === -1) return;
    const swapWith = direction === "up" ? index - 1 : index + 1;
    if (swapWith < 0 || swapWith >= tensSorted.length) return;
    const ids = tensSorted.map((r) => r.movie_entry_id);
    [ids[index], ids[swapWith]] = [ids[swapWith], ids[index]];
    await applyRankOrder(ids);
  };

  const handleSendTop = async (entryId) => {
    const tensSorted = [...rankBucket].sort(rankSort);
    const index = tensSorted.findIndex((r) => r.movie_entry_id === entryId);
    if (index <= 0) return;
    const ids = tensSorted.map((r) => r.movie_entry_id);
    const [moved] = ids.splice(index, 1);
    ids.unshift(moved);
    await applyRankOrder(ids);
  };

  const handleSendBottom = async (entryId) => {
    const tensSorted = [...rankBucket].sort(rankSort);
    const index = tensSorted.findIndex((r) => r.movie_entry_id === entryId);
    if (index === -1 || index === tensSorted.length - 1) return;
    const ids = tensSorted.map((r) => r.movie_entry_id);
    const [moved] = ids.splice(index, 1);
    ids.push(moved);
    await applyRankOrder(ids);
  };

  // Book rank handlers operate on book log ids and persist via updateBookRanking
  const applyBookRankOrder = (orderedIds) => applyBookRankings(orderedIds);

  // Rank reorder operates on the ranked bucket the page is showing: every
  // book sharing the rating value being ranked.
  const finishedSortedForRank = () =>
    bookRatings
      .filter((b) => Number(b.book_rating) === rankedValue)
      .sort(bookRankSort);

  const handleBookMove = async (bookId, direction) => {
    const sorted = finishedSortedForRank();
    const index = sorted.findIndex((b) => b.id === bookId);
    if (index === -1) return;
    const swapWith = direction === "up" ? index - 1 : index + 1;
    if (swapWith < 0 || swapWith >= sorted.length) return;
    const ids = sorted.map((b) => b.id);
    [ids[index], ids[swapWith]] = [ids[swapWith], ids[index]];
    await applyBookRankOrder(ids);
  };

  const handleBookSendTop = async (bookId) => {
    const sorted = finishedSortedForRank();
    const index = sorted.findIndex((b) => b.id === bookId);
    if (index <= 0) return;
    const ids = sorted.map((b) => b.id);
    const [moved] = ids.splice(index, 1);
    ids.unshift(moved);
    await applyBookRankOrder(ids);
  };

  const handleBookSendBottom = async (bookId) => {
    const sorted = finishedSortedForRank();
    const index = sorted.findIndex((b) => b.id === bookId);
    if (index === -1 || index === sorted.length - 1) return;
    const ids = sorted.map((b) => b.id);
    const [moved] = ids.splice(index, 1);
    ids.push(moved);
    await applyBookRankOrder(ids);
  };

  const isBooksView = mediaTypeFilter === "books";
  const isAllView = mediaTypeFilter === "all";

  // Combined list for "All" view: ratings (movies + TV) and books interleaved by date
  const combinedAll = useMemo(() => {
    if (!isAllView) return null;
    const ratingItems = sortedRatings.map((r) => ({
      kind: "rating",
      id: `rating-${r.id || r.movie_entry_id}`,
      data: r,
      date: new Date(r.created_at),
      year: movieYear(r),
      rating: movieRatingValue(r),
    }));
    const bookItems = sortedBooks.map((b) => ({
      kind: "book",
      id: `book-${b.id}`,
      data: b,
      date: bookSortDate(b),
      year: bookYear(b),
      rating: bookRatingValue(b),
    }));
    const isGoodreads =
      sortKey === "goodreads" || sortKey === "goodreadsCount";
    const grValOf = sortKey === "goodreads" ? grRatingOf : grCountOf;
    return [...ratingItems, ...bookItems].sort((a, b) => {
      if (sortKey === "year") {
        const yc = compareNumeric(a.year, b.year);
        if (yc !== 0) return yc;
      } else if (sortKey === "rating") {
        const rc = compareNumeric(a.rating, b.rating);
        if (rc !== 0) return rc;
      } else if (isGoodreads) {
        // Only books have a Goodreads rating; movies/TV sink to the bottom
        // regardless of direction (compareNums sends nulls down).
        const va = a.kind === "book" ? grValOf(a.data) : null;
        const vb = b.kind === "book" ? grValOf(b.data) : null;
        const rc = compareNumeric(va, vb);
        if (rc !== 0) return rc;
      } else if (sortKey === "date" && sortDir === "asc") {
        return a.date - b.date;
      }
      return b.date - a.date;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAllView, sortedRatings, sortedBooks, sortKey, sortDir, grRatings]);

  const displayCount = isAllView
    ? combinedAll.length
    : isBooksView
      ? sortedBooks.length
      : sortedRatings.length;
  const isLoading = isAllView
    ? !userRatingsLoaded || !bookRatingsLoaded
    : isBooksView
      ? !bookRatingsLoaded
      : !userRatingsLoaded;

  const { pageStart, pageEnd } = pageBounds(pag.page, pag.pageSize, displayCount);

  // Drag to rank. Only offered while the page is actually showing the ranked
  // order - any other sort and a dropped position would mean nothing. Rows are
  // dragged within the current page and spliced back into the full order.
  const rankDragEnabled =
    rankModeType !== "none" &&
    rankedValue != null &&
    !isAllView &&
    sortKey === "date";
  const rankRowId = (row) => (isBooksView ? row.id : row.movie_entry_id);
  const rankedRows = isBooksView ? sortedBooks : sortedRatings;

  const pageRankIds = useMemo(
    () =>
      rankDragEnabled
        ? rankedRows.slice(pageStart, pageEnd).map(rankRowId)
        : [],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [rankDragEnabled, rankedRows, pageStart, pageEnd, isBooksView],
  );

  const commitRankOrder = useCallback(
    (orderedPageIds) => {
      const allIds = rankedRows.map(rankRowId);
      allIds.splice(pageStart, orderedPageIds.length, ...orderedPageIds);
      return isBooksView ? applyBookRankings(allIds) : applyRankings(allIds);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [rankedRows, pageStart, isBooksView, applyBookRankings, applyRankings],
  );

  const rankDrag = useDragOrder(pageRankIds, commitRankOrder);

  const rankRowClass = (id) =>
    `list-row${rankDragEnabled ? " rk-row-draggable" : ""}${
      rankDrag.draggingId === id ? " rk-row-dragging" : ""
    }`;

  const rankGrip = (id) =>
    rankDragEnabled ? (
      <button
        type="button"
        className="rk-drag-handle"
        title="Drag to reorder"
        aria-label="Drag to reorder"
        {...rankDrag.handleProps(id)}
      >
        <GripVertical size={16} />
      </button>
    ) : null;

  // Rows keep their source order for the whole drag - the hook slides them
  // with transforms - so only the rank number follows the live preview order.
  const draggedRankRows = rankedRows.slice(pageStart, pageEnd);
  const rankRowProps = (id) => (rankDragEnabled ? rankDrag.rowProps(id) : null);

  // Poster wall tiles, in the order the list is already sorted in. Clicking a
  // poster opens the title, same as clicking one in the default list.
  const ratingTile = (rating) => ({
    id: `rating-${rating.id || rating.movie_entry_id}`,
    title: rating.movie_object?.primaryTitle || "",
    image: movieCoverFor(covers, rating.movie_object, rating.movie_entry_id),
    rating: movieRatingValue(rating),
    onClick: () => {
      if (rating.movie_object?.tmdb_id == null) return;
      navigate(
        `/mediadetails/${rating.movie_object.media_type}/${rating.movie_object.tmdb_id}`,
      );
    },
  });
  const bookTile = (bookRating) => {
    const info = getBookInfo(bookRating);
    const route = bookDetailsRouteForBook(info);
    return {
      id: `book-${bookRating.id}`,
      title: info.title,
      image: bookCoverFor(covers, bookRating),
      rating: bookRatingValue(bookRating),
      onClick: () => {
        if (!route) return;
        navigate(route, { state: { book: bookRating.book_entries || info } });
      },
    };
  };

  // One shape for the wall whichever media the page is showing, so grouping
  // and rank dragging don't need three code paths.
  const wallRows = useMemo(() => {
    if (viewMode !== "posters") return [];
    if (isAllView) return combinedAll;
    if (isBooksView) return sortedBooks.map((b) => ({ kind: "book", data: b }));
    return sortedRatings.map((r) => ({ kind: "rating", data: r }));
  }, [viewMode, isAllView, isBooksView, combinedAll, sortedBooks, sortedRatings]);

  const rowTile = (row) =>
    row.kind === "book" ? bookTile(row.data) : ratingTile(row.data);
  const rowRating = (row) =>
    row.kind === "book" ? bookRatingValue(row.data) : movieRatingValue(row.data);
  const rowGroup = (row) =>
    row.kind === "book" ? "book" : mediaGroupOf(row.data.movie_object?.media_type);
  const rowRankId = (row) =>
    row.kind === "book" ? row.data.id : row.data.movie_entry_id;

  // The wall shows everything at once - paging a collage defeats the point -
  // so it reads the whole sorted list rather than the current page.
  const wallItems = useMemo(
    () => (groupByRating ? [] : wallRows.map(rowTile)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [wallRows, groupByRating, covers],
  );

  // Grouped wall: one panel per rating value, highest first, unrated last. The
  // value is already in the panel heading, so the posters drop their caption.
  // Inside a panel the order is the ranking (movies, then TV, then books) -
  // that's the whole point of grouping - unless another sort is active.
  const groupsUseRank = sortKey === "date" || posterRankMode;
  const { wallGroups, wallRowIndex } = useMemo(() => {
    if (!groupByRating) return { wallGroups: [], wallRowIndex: new Map() };
    const byValue = new Map();
    wallRows.forEach((row) => {
      const value = rowRating(row);
      const key = value == null ? "none" : Number(value);
      if (!byValue.has(key)) byValue.set(key, []);
      byValue.get(key).push(row);
    });
    const byRank = (a, b) => {
      const ga = MEDIA_GROUP_ORDER[rowGroup(a)];
      const gb = MEDIA_GROUP_ORDER[rowGroup(b)];
      if (ga !== gb) return ga - gb;
      const ra = a.data.ranking ?? Number.MAX_SAFE_INTEGER;
      const rb = b.data.ranking ?? Number.MAX_SAFE_INTEGER;
      if (ra !== rb) return ra - rb;
      return new Date(b.data.created_at) - new Date(a.data.created_at);
    };
    const index = new Map();
    const groups = [...byValue.entries()]
      .sort((a, b) => {
        if (a[0] === "none") return 1;
        if (b[0] === "none") return -1;
        return b[0] - a[0];
      })
      .map(([value, rows]) => {
        const ranked = value !== "none" && isRankedRating(rankedRatings, value);
        // Ranking is per media type, so a panel is split into a movies, a TV
        // and a books section. Each counts its own 1..n, and a drag can only
        // reorder within one section.
        const sorted = groupsUseRank ? [...rows].sort(byRank) : rows;
        const sections = new Map();
        sorted.forEach((row) => {
          const group = rowGroup(row);
          if (!sections.has(group)) sections.set(group, []);
          const tile = rowTile(row);
          index.set(tile.id, row);
          sections.get(group).push({
            ...tile,
            rating: null,
            rank: ranked ? sections.get(group).length + 1 : null,
          });
        });
        return {
          value,
          ranked,
          count: sorted.length,
          sections: [...sections.entries()]
            .sort((a, b) => MEDIA_GROUP_ORDER[a[0]] - MEDIA_GROUP_ORDER[b[0]])
            .map(([group, items]) => ({ group, items })),
        };
      });
    return { wallGroups: groups, wallRowIndex: index };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupByRating, wallRows, groupsUseRank, rankedRatings, covers]);

  // Posters dropped into a new order inside one rating panel. Ranking is per
  // media type, so each type in the panel is renumbered against its own 1..n.
  const handleGroupReorder = async (orderedTileIds) => {
    const rows = orderedTileIds
      .map((tileId) => wallRowIndex.get(tileId))
      .filter(Boolean);
    const byGroup = new Map();
    rows.forEach((row) => {
      const group = rowGroup(row);
      if (!byGroup.has(group)) byGroup.set(group, []);
      byGroup.get(group).push(rowRankId(row));
    });
    for (const [group, ids] of byGroup) {
      if (group === "book") await applyBookRankings(ids);
      else await applyRankings(ids);
    }
  };

  if (isLoading) return <Loader />;

  return (
    <div className="page-stack">
      <h1 className="page-title">Ratings &amp; Rankings</h1>
      <div className="toolbar">
        <div className="toolbar-search">
          <input
            className="toolbar-input"
            type="text"
            placeholder="Search..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          {searchTerm && (
            <button
              className="toolbar-clear"
              onClick={() => setSearchTerm("")}
              aria-label="Clear search"
            >
              ×
            </button>
          )}
        </div>
        <select
          className="toolbar-select"
          value={mediaTypeFilter}
          onChange={(e) => setMediaTypeFilter(e.target.value)}
        >
          <option value="all">All media</option>
          <option value="moviesAndTV">Movies & TV</option>
          <option value="movies">Movies</option>
          <option value="tv">TV</option>
          <option value="books">Books</option>
        </select>
        <ExtraFiltersPanel
          open={filtersOpen}
          onClose={() => setFiltersOpen(false)}
          onToggle={() => setFiltersOpen((v) => !v)}
          activeCount={activeFilterCount}
          onClear={() => {
            setRatingFilter("all");
            setGenreFilter("all");
            setYearFrom("");
            setYearTo("");
            setAddedFrom("");
            setAddedTo("");
            setSortKey("date");
            setSortDir("desc");
          }}
        >
          <select
            value={ratingFilter}
            onChange={(e) => handleRatingFilterChange(e.target.value)}
          >
            <option value="all">All Ratings</option>
            {Array.from({ length: 19 }, (_, i) => 10 - i * 0.5).map((v) => (
              <option key={v} value={v}>
                {v}
              </option>
            ))}
          </select>
          <select
            value={genreFilter}
            onChange={(e) => setGenreFilter(e.target.value)}
          >
            <option value="all">All Genres</option>
            {availableGenres.map((g) => (
              <option key={g} value={g}>{g}</option>
            ))}
          </select>
          <ReleaseYearFilter
            from={yearFrom}
            to={yearTo}
            onChange={({ from, to }) => {
              setYearFrom(from);
              setYearTo(to);
            }}
            minYear={yearRange.min}
            maxYear={yearRange.max}
          />
          <DateAddedFilter
            from={addedFrom}
            to={addedTo}
            onChange={({ from, to }) => {
              setAddedFrom(from);
              setAddedTo(to);
            }}
          />
          <SortByMenu
            sortKey={sortKey}
            sortDir={sortDir}
            onChange={(k, d) => {
              setSortKey(k);
              setSortDir(d);
            }}
            options={SORT_OPTIONS}
          />
        </ExtraFiltersPanel>

        <select
          className="toolbar-select"
          value={viewMode}
          onChange={(e) => {
            const next = e.target.value;
            setViewMode(next);
            // The rank controls only exist in the default list, so leaving it
            // drops rank mode and the filters it forces on.
            if (next !== "default" && rankModeType !== "none") {
              setRankModeType("none");
              setRatingFilter("all");
              setMediaTypeFilter("all");
            }
          }}
          title="View"
        >
          <option value="posters">Posters</option>
          <option value="default">Default</option>
        </select>

        {viewMode === "posters" && (
          <button
            className={`toolbar-text-btn${
              groupByRating ? " toolbar-text-btn--on" : ""
            }`}
            onClick={() => {
              setGroupByRating((v) => !v);
              setPosterRankMode(false);
            }}
            title="Split the wall into a panel per rating"
          >
            Group by rating
          </button>
        )}
        {viewMode === "posters" && groupByRating && (
          <button
            className={`toolbar-text-btn${
              posterRankMode ? " toolbar-text-btn--on" : ""
            }`}
            onClick={() => setPosterRankMode((v) => !v)}
            title="Pick which ratings are rankable, then drag their posters"
          >
            Rank mode
          </button>
        )}

        {/*rank mode: pick what to reorder (single-select, so a dropdown)*/}
        {viewMode === "default" && (
          <select
            className={`toolbar-select${
              rankModeType !== "none" ? " toolbar-select--active" : ""
            }`}
            value={rankModeType}
            onChange={(e) => {
              const value = e.target.value;
              setRankModeType(value);
              // Turning ranking off clears the rating + media filters that the
              // rank modes force on, back to their defaults.
              if (value === "none") {
                setRatingFilter("all");
                setMediaTypeFilter("all");
              }
            }}
            title="Reorder your top-ranked items"
          >
            <option value="none">Rank: Off</option>
            <option value="movies">Rank Movies</option>
            <option value="tv">Rank TV</option>
            <option value="books">Rank Books</option>
          </select>
        )}
        <button
          className="toolbar-icon-btn"
          onClick={goToWatchlist}
          title="View watchlist with these filters"
        >
          <img src="/images/watchlist-navbar.png" alt="Go to Watchlist" />
        </button>
        <button
          className="toolbar-icon-btn"
          onClick={goToLog}
          title="View log with these filters"
        >
          <img src="/images/log.png" alt="Go to Log" />
        </button>
        <span className="toolbar-count">{displayCount}</span>
      </div>
      {displayCount === 0 ? (
        <div className="empty-msg">
          {isAllView
            ? `No ratings found${searchTerm ? ` for "${searchTerm}"` : ""}!`
            : isBooksView
              ? `No rated books found${searchTerm ? ` for "${searchTerm}"` : ""}!`
              : `No ratings found for "${searchTerm}"!`}
        </div>
      ) : null}
      {viewMode === "default" && (
        <PaginationControls pag={pag} totalCount={displayCount} />
      )}
      {viewMode === "posters" && groupByRating && posterRankMode && (
        <div className="pw-rank-panel">
          <RankedRatingsPicker
            extraValues={[
              ...userRatings.map((r) => Number(r.rating)),
              ...bookRatings.map((b) => Number(b.book_rating)),
            ].filter(Number.isFinite)}
          />
          <span className="pw-rank-panel-hint">
            Drag posters inside a highlighted rating to rank them. Movies, TV
            and books are ranked separately.
          </span>
        </div>
      )}
      {viewMode === "posters" ? (
        groupByRating ? (
          <div className="pw-groups">
            {wallGroups.map((group) => (
              <div className="pw-group" key={group.value}>
                <div className="pw-group-head">
                  {group.value === "none" ? (
                    "Unrated"
                  ) : (
                    <>
                      <img src="/images/user-rating-star2.png" alt="" />
                      {group.value}
                    </>
                  )}
                  <span className="pw-group-count">{group.count}</span>
                </div>
                {group.sections.map((section, i) => (
                  <div className="pw-section" key={section.group}>
                    {i > 0 && <div className="pw-section-line" />}
                    <PosterWall
                      items={section.items}
                      onReorder={
                        posterRankMode && group.ranked
                          ? handleGroupReorder
                          : null
                      }
                    />
                  </div>
                ))}
              </div>
            ))}
          </div>
        ) : (
          <PosterWall items={wallItems} />
        )
      ) : (
        <div className="list-col" ref={rankDrag.containerRef}>
          {isAllView
            ? combinedAll.slice(pageStart, pageEnd).map((item) =>
                item.kind === "rating" ? (
                  <div
                    key={item.id}
                    className="list-row"
                  >
                    <div className="div-wrapper-rating-testing">
                      <ListComponent
                        movie_object={item.data.movie_object}
                        betweenSlot={<AddToList movie={item.data.movie_object} />}
                        ratingDate={item.data.created_at}
                        ratingUpdatedDate={item.data.updated_at}
                        ratingPreviousValue={item.data.previous_rating}
                        ratingDateUnknown={item.data.date_unknown}
                        posterEditable={item.data.movie_object?.tmdb_id != null}
                        posterEntryId={item.data.movie_entry_id}
                        ratingHistory={item.data.rating_history}
                        rankNumber={
                          isRankedRating(rankedRatings, item.data.rating)
                            ? item.data.ranking
                            : null
                        }
                      />
                    </div>
                  </div>
                ) : (
                  <div
                    key={item.id}
                    className="list-row"
                  >
                    <div className="div-wrapper-rating-testing">
                      <BookRating
                        bookLog={item.data}
                        rankNumber={
                          isRankedRating(rankedRatings, item.data.book_rating)
                            ? item.data.ranking
                            : null
                        }
                      />
                    </div>
                  </div>
                ),
              )
            : isBooksView
            ? draggedRankRows.map((bookLog) => (
                <div
                  key={bookLog.id}
                  className={rankRowClass(bookLog.id)}
                  {...rankRowProps(bookLog.id)}
                >
                  {rankGrip(bookLog.id)}
                  <div className="div-wrapper-rating-testing">
                    <BookRating
                      bookLog={bookLog}
                      rankNumber={
                        isRankedRating(rankedRatings, bookLog.book_rating)
                          ? bookLog.ranking
                          : null
                      }
                      showRankControls={
                        rankModeType === "books" && rankedValue != null
                      }
                      onMoveUp={() => handleBookMove(bookLog.id, "up")}
                      onMoveDown={() => handleBookMove(bookLog.id, "down")}
                      onSendTop={() => handleBookSendTop(bookLog.id)}
                      onSendBottom={() => handleBookSendBottom(bookLog.id)}
                    />
                  </div>
                </div>
              ))
            : draggedRankRows.map((rating) => (
                <div
                  key={rating.id || rating.movie_entry_id}
                  className={rankRowClass(rating.movie_entry_id)}
                  {...rankRowProps(rating.movie_entry_id)}
                >
                  {rankGrip(rating.movie_entry_id)}
                  <div className="div-wrapper-rating-testing">
                    <ListComponent
                      movie_object={rating.movie_object}
                      betweenSlot={<AddToList movie={rating.movie_object} />}
                      ratingDate={rating.created_at}
                      ratingUpdatedDate={rating.updated_at}
                      ratingPreviousValue={rating.previous_rating}
                      ratingDateUnknown={rating.date_unknown}
                      posterEditable={rating.movie_object?.tmdb_id != null}
                      posterEntryId={rating.movie_entry_id}
                      ratingHistory={rating.rating_history}
                      rankNumber={
                        isRankedRating(rankedRatings, rating.rating)
                          ? rating.ranking
                          : null
                      }
                      showRankControls={
                        rankModeType !== "none" &&
                        Number(rating.rating) === rankedValue
                      }
                      onMoveUp={() => handleMove(rating.movie_entry_id, "up")}
                      onMoveDown={() => handleMove(rating.movie_entry_id, "down")}
                      onSendTop={() => handleSendTop(rating.movie_entry_id)}
                      onSendBottom={() => handleSendBottom(rating.movie_entry_id)}
                    />
                  </div>
                </div>
              ))}
        </div>
      )}
      {viewMode === "default" && (
        <PaginationControls pag={pag} totalCount={displayCount} position="bottom" />
      )}
    </div>
  );
}

export default Ratings;
