import { getBookInfo } from "./bookInfo";

// Poster/cover resolution for the compact views, matching what ListComponent
// and EditableBookCover do: the user's own override first (looked up by entry
// id, then by tmdb/hardcover id in case the row points at a different entry),
// then the shared image. `covers` is the useCovers() context value.
export function movieCoverFor(covers, movieObject, entryId) {
  return (
    covers.coverFor(entryId) ??
    covers.coverForTmdb(movieObject?.media_type, movieObject?.tmdb_id) ??
    movieObject?.primaryImage ??
    null
  );
}

export function bookCoverFor(covers, bookRow) {
  const book = getBookInfo(bookRow);
  return (
    covers.coverFor(bookRow?.book_id ?? bookRow?.book_entries?.id) ??
    covers.coverForHardcover(book.hardcover_id) ??
    book.cover_image ??
    null
  );
}
