import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../services/supabase-client";

const CATS = [
  { key: "movies", label: "Movies", noun: "movie" },
  { key: "tv", label: "TV Shows", noun: "show" },
  { key: "books", label: "Books", noun: "book" },
];

// Four slots per category, padded with nulls so an emptied slot keeps its place.
const toSlots = (ids) => {
  const out = (ids || []).slice(0, 4);
  while (out.length < 4) out.push(null);
  return out;
};

// Pick-your-own 4 favourites editor. Selections live in auth user_metadata
// (favourites_v1), so no extra tables: { manual, movies: [], tv: [], books: [] }
// holding entry ids in slot order. When manual is off the home page keeps
// using the top-ranked titles.
//
// Editing is per slot: click a slot to swap just that one, or clear it and
// leave it empty.
export default function EditFavouritesModal({
  onClose,
  options, // { movies: [{id,title,cover,rating}], tv: [...], books: [...] }
  initial,
}) {
  const [manual, setManual] = useState(!!initial?.manual);
  const [sel, setSel] = useState({
    movies: toSlots(initial?.movies),
    tv: toSlots(initial?.tv),
    books: toSlots(initial?.books),
  });
  // The slot being filled, as { cat, index }. Null means the slots overview.
  const [editing, setEditing] = useState(null);
  const [search, setSearch] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setSearch("");
  }, [editing]);

  const byId = useMemo(() => {
    const map = new Map();
    CATS.forEach((c) =>
      (options[c.key] || []).forEach((o) => map.set(`${c.key}:${o.id}`, o)),
    );
    return map;
  }, [options]);

  const list = useMemo(() => {
    if (!editing) return [];
    const items = options[editing.cat] || [];
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter((o) => (o.title || "").toLowerCase().includes(q));
  }, [options, editing, search]);

  const setSlot = (cat, index, id) =>
    setSel((prev) => {
      const next = [...prev[cat]];
      // A title can only sit in one slot, so picking it elsewhere moves it.
      if (id != null) {
        const existing = next.indexOf(id);
        if (existing !== -1) next[existing] = null;
      }
      next[index] = id;
      return { ...prev, [cat]: next };
    });

  async function save() {
    setSaving(true);
    const { error } = await supabase.auth.updateUser({
      data: {
        favourites_v1: {
          manual,
          movies: sel.movies.filter(Boolean),
          tv: sel.tv.filter(Boolean),
          books: sel.books.filter(Boolean),
        },
      },
    });
    setSaving(false);
    if (error) {
      console.error("Failed to save favourites:", error);
      alert("Failed to save favourites. Please try again.");
      return;
    }
    onClose();
  }

  const editingCat = editing && CATS.find((c) => c.key === editing.cat);

  return (
    <div
      className="hp-rec-modal-backdrop"
      onClick={onClose}
      role="button"
      tabIndex={-1}
    >
      <div
        className="hp-rec-modal hp-fav-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          className="hp-rec-close"
          onClick={onClose}
          aria-label="Close"
        >
          {String.fromCharCode(0x00d7)}
        </button>
        <div className="hp-fav-title">Edit 4 Favourites</div>

        <button
          type="button"
          className={`hp-toggle hp-fav-manual${manual ? " hp-toggle-on" : ""}`}
          onClick={() => setManual((v) => !v)}
          aria-pressed={manual}
        >
          <span className="hp-toggle-box">
            {manual && (
              <svg
                className="hp-toggle-tick"
                viewBox="0 0 12 12"
                aria-hidden="true"
              >
                <path
                  d="M2.5 6.2l2.3 2.3 4.7-5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            )}
          </span>
          <span className="hp-toggle-label">Choose 4 favourites freely</span>
        </button>

        {!manual ? (
          <p className="hp-fav-hint">
            Your 4 favourites are taken from your top-ranked titles. Tick the
            box above to pick any 4 of your rated titles instead.
          </p>
        ) : editing ? (
          <>
            <div className="hp-fav-picker-head">
              <button
                type="button"
                className="hp-fav-back"
                onClick={() => setEditing(null)}
              >
                {String.fromCharCode(0x2190)} Back
              </button>
              <span>
                Pick a {editingCat.noun} for slot {editing.index + 1}
              </span>
            </div>
            <input
              className="hp-fav-search"
              type="text"
              placeholder="Search your rated titles..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {list.length === 0 ? (
              <p className="hp-empty">No rated titles found.</p>
            ) : (
              <div className="hp-fav-grid">
                {list.map((o) => (
                  <div
                    key={o.id}
                    className={`hp-fav-option${
                      sel[editing.cat][editing.index] === o.id
                        ? " is-picked"
                        : ""
                    }`}
                    onClick={() => {
                      setSlot(editing.cat, editing.index, o.id);
                      setEditing(null);
                    }}
                    title={o.title}
                  >
                    <img
                      src={o.cover || "/images/placeholderimage.jpg"}
                      alt={o.title || ""}
                      loading="lazy"
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = "/images/placeholderimage.jpg";
                      }}
                    />
                  </div>
                ))}
              </div>
            )}
          </>
        ) : (
          CATS.map((c) => (
            <div key={c.key} className="hp-fav-cat">
              <div className="hp-sub-label">{c.label}</div>
              <div className="hp-fav-slots">
                {sel[c.key].map((id, i) => {
                  const o = id != null ? byId.get(`${c.key}:${id}`) : null;
                  return (
                    <div className="hp-fav-slot" key={`${c.key}-${i}`}>
                      <button
                        type="button"
                        className={`hp-fav-slot-btn${o ? " is-filled" : ""}`}
                        onClick={() => setEditing({ cat: c.key, index: i })}
                        title={o ? o.title : `Add a ${c.noun}`}
                      >
                        {o ? (
                          <img
                            src={o.cover || "/images/placeholderimage.jpg"}
                            alt={o.title || ""}
                            loading="lazy"
                            onError={(e) => {
                              e.target.onerror = null;
                              e.target.src = "/images/placeholderimage.jpg";
                            }}
                          />
                        ) : (
                          <span className="hp-fav-slot-plus">+</span>
                        )}
                      </button>
                      {o && (
                        <button
                          type="button"
                          className="hp-fav-slot-clear"
                          onClick={() => setSlot(c.key, i, null)}
                          aria-label={`Clear slot ${i + 1}`}
                          title="Clear this slot"
                        >
                          {String.fromCharCode(0x00d7)}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        )}

        <div className="hp-fav-actions">
          <button
            type="button"
            className="hp-fav-save"
            onClick={save}
            disabled={saving}
          >
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}
