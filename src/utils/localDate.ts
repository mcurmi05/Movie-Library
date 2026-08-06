// Format a Date as YYYY-MM-DD in the user's local timezone. The date pickers
// hand back local midnight, so toISOString() would shift the day for anyone
// east of UTC (picked Tuesday, stored Monday).
export function toLocalDateString(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

// Air dates as "Jan 1, 2025". Unparseable values are shown as they came in.
export function formatEpisodeDate(d) {
  if (!d) return null;
  const parsed = new Date(d);
  if (Number.isNaN(parsed.getTime())) return d;
  return parsed.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}
