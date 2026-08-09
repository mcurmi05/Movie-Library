import { useState } from "react";
import "../../styles/common/RankedRatingsPicker.css";
import { useAuth } from "../../contexts/AuthContext";
import {
  getRankedRatings,
  ratingLadder,
  saveRankedRatings,
} from "../../utils/rankedRatings";

// Which rating values keep a ranked 1..n order. Most people care about their
// 10s and maybe their 9.5s, so it's a per-user choice rather than all-or-nothing.
function RankedRatingsPicker({ extraValues = [] }) {
  const { user, refreshUser } = useAuth();
  const [saving, setSaving] = useState(false);
  const selected = getRankedRatings(user);

  // The custom scale has no fixed ladder, so fall back to the values the
  // user's own ratings actually use.
  const ladder =
    ratingLadder(user) ??
    Array.from(new Set([...selected, ...extraValues])).sort((a, b) => b - a);

  const toggle = async (value) => {
    const next = selected.includes(value)
      ? selected.filter((v) => v !== value)
      : [...selected, value].sort((a, b) => b - a);
    setSaving(true);
    await saveRankedRatings(next);
    await refreshUser();
    setSaving(false);
  };

  return (
    <div className={`rrp${saving ? " rrp-saving" : ""}`}>
      <span className="rrp-label">Ranked ratings</span>
      <div className="rrp-values">
        {ladder.map((value) => (
          <button
            key={value}
            type="button"
            className={`rrp-chip${selected.includes(value) ? " rrp-chip-on" : ""}`}
            onClick={() => toggle(value)}
            disabled={saving}
          >
            {value}
          </button>
        ))}
      </div>
    </div>
  );
}

export default RankedRatingsPicker;
