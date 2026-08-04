// Compact vote/rating counts: 1234567 -> "1.2M", 12000 -> "12K".
// Returns null for 0/missing so callers can skip rendering entirely.
export function formatCount(value) {
  if (!value) return null;
  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `${Math.round(value / 1000)}K`;
  return String(value);
}

// Same thing in the parenthesised form the rating badges use.
export function formatCountParens(value) {
  const compact = formatCount(value);
  return compact && `(${compact})`;
}
