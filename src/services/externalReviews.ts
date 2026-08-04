// Live IMDb / Letterboxd extras for the media details page: the IMDb rating
// breakdown and user reviews from both sites. None of this is cached in our
// own tables - it changes constantly and is only ever needed for the one title
// currently on screen.

export type ExternalReview = {
  id: string;
  url: string;
  author: string;
  text: string;
  rating: number | null;
  likes: number | null;
  spoiler: boolean;
  title?: string | null;
  date?: string | null;
};

export type ImdbHistogram = {
  histogram: { rating: number; votes: number }[];
  total: number | null;
  average: number | null;
};

export type ReviewPage = {
  reviews: ExternalReview[];
  cursor: string | null;
  hasMore: boolean;
  total: number | null;
};

async function requestJson(url: string) {
  const res = await fetch(url);
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body?.error || `Request failed (${res.status})`);
  return body;
}

export async function getImdbHistogram(
  imdbId: string,
): Promise<ImdbHistogram> {
  return requestJson(
    `/api/imdb?action=histogram&imdbId=${encodeURIComponent(imdbId)}`,
  );
}

export async function getImdbReviews(
  imdbId: string,
  { first = 5, after }: { first?: number; after?: string | null } = {},
): Promise<ReviewPage> {
  const cursor = after ? `&after=${encodeURIComponent(after)}` : "";
  return requestJson(
    `/api/imdb?action=reviews&imdbId=${encodeURIComponent(imdbId)}` +
      `&first=${first}${cursor}`,
  );
}

// Letterboxd only exposes its twelve popular reviews to us (everything else is
// behind a bot challenge), so this comes back as one page with no cursor.
export async function getLetterboxdReviews(
  tmdbId: number,
): Promise<ExternalReview[]> {
  const body = await requestJson(`/api/letterboxd?action=reviews&tmdb_id=${tmdbId}`);
  return body.reviews || [];
}
