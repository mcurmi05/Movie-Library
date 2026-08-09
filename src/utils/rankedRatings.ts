import { supabase } from "../services/supabase-client";
import { RATING_SCALES, getRatingScaleKey } from "./ratingScale";

// Ranking is per rating value, per media type: the 10s hold their own 1..n
// order, the 9.5s hold theirs, and movies, TV and books are ranked separately
// inside each of those. Which rating values are worth ranking is the user's
// call - most people care about their 10s and stop caring somewhere below
// that - so the enabled values are stored per user in auth user_metadata
// (same place as rating_scale), no extra table.
export const DEFAULT_RANKED_RATINGS = [10];

export function getRankedRatings(user) {
  const stored = user?.user_metadata?.ranked_ratings;
  if (!Array.isArray(stored)) return DEFAULT_RANKED_RATINGS;
  return stored
    .map(Number)
    .filter((v) => Number.isFinite(v))
    .sort((a, b) => b - a);
}

export function isRankedRating(rankedRatings, value) {
  const v = Number(value);
  return Number.isFinite(v) && rankedRatings.some((r) => Number(r) === v);
}

export async function saveRankedRatings(values) {
  const { error } = await supabase.auth.updateUser({
    data: { ranked_ratings: values },
  });
  if (error) console.error("Failed to save ranked ratings:", error);
  return !error;
}

// Every rating value on the user's scale, highest first. Returns null for the
// custom scale, which has no fixed ladder - callers fall back to whichever
// values their data actually uses.
export function ratingLadder(user) {
  const scale = RATING_SCALES[getRatingScaleKey(user)];
  if (scale.max == null || !scale.step) return null;
  const values = [];
  for (let v = scale.max; v >= scale.step - 1e-9; v -= scale.step) {
    values.push(Number(v.toFixed(2)));
  }
  return values;
}

// Movies first, then TV, then books - the order ranked buckets read in.
export const MEDIA_GROUP_ORDER = { movie: 0, tv: 1, book: 2 };

export const mediaGroupOf = (mediaType) =>
  mediaType === "book" ? "book" : mediaType === "tv" ? "tv" : "movie";
