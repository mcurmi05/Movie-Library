// Live IMDb / Letterboxd extras for the media details page: rating
// distributions and user reviews from both sites. None of this is cached in our
// own tables - it changes constantly and is only ever needed for the one title
// currently on screen.

export type ExternalReview = {
  id: string;
  url: string;
  author: string;
  authorUrl: string | null;
  text: string;
  rating: number | null;
  likes: number | null;
  spoiler: boolean;
  title?: string | null;
  date?: string | null;
};

export type RatingDistribution = {
  histogram: { rating: number; votes: number }[];
  total: number | null;
  average: number | null;
};

export type ReviewSort = "helpful" | "votes" | "newest";

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
): Promise<RatingDistribution> {
  return requestJson(
    `/api/imdb?action=histogram&imdbId=${encodeURIComponent(imdbId)}`,
  );
}

// Letterboxd's distribution comes from an edge function; it can fail where the
// rest of the Letterboxd scraping works (see api/letterboxd-histogram.ts).
export async function getLetterboxdHistogram(
  tmdbId: number,
): Promise<RatingDistribution> {
  return requestJson(`/api/letterboxd-histogram?tmdb_id=${tmdbId}`);
}

export async function getImdbReviews(
  imdbId: string,
  {
    first = 5,
    after,
    sort = "helpful",
    rating,
  }: {
    first?: number;
    after?: string | null;
    sort?: ReviewSort;
    rating?: number | null;
  } = {},
): Promise<ReviewPage> {
  const params = new URLSearchParams({
    action: "reviews",
    imdbId,
    first: String(first),
    sort,
  });
  if (after) params.set("after", after);
  if (rating) params.set("rating", String(rating));
  return requestJson(`/api/imdb?${params}`);
}

// Letterboxd pages by number rather than cursor: page 1 is the film page's
// popular reviews, the rest come off the reviews listing. `hasMore` is false as
// soon as a page comes back empty or blocked.
export async function getLetterboxdReviews(
  tmdbId: number,
  page = 1,
): Promise<{ reviews: ExternalReview[]; hasMore: boolean; slug: string | null }> {
  const body = await requestJson(
    `/api/letterboxd?action=reviews&tmdb_id=${tmdbId}&page=${page}`,
  );
  return {
    reviews: body.reviews || [],
    hasMore: !!body.hasMore,
    slug: body.slug ?? null,
  };
}
