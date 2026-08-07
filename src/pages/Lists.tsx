import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Link } from "react-router-dom";
import {
  ChevronDown,
  Folder,
  FolderPlus,
  GripVertical,
  Pencil,
  Trash2,
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { useCovers } from "../contexts/UserCoversContext";
import { getDisplayName } from "../utils/profile";
import {
  getMyLists,
  getSavedLists,
  getListItemPreviews,
  getListSaveCounts,
  createList,
  setListMagic,
  bulkAddListItems,
  getListFolders,
  createListFolder,
  renameListFolder,
  deleteListFolder,
  getListPlacements,
  setListPlacements,
} from "../services/lists";
import MagicListModal from "../components/common/MagicListModal";
import { SignIn } from "./SignIn";
import Loader, { Spinner } from "../components/layout/Loader";
import "../styles/search/Toolbar.css";
import "../styles/pages/Lists.css";

function itemCount(list) {
  // PostgREST returns the aggregate as list_items: [{ count: N }]
  return list.list_items?.[0]?.count ?? 0;
}

function timeAgo(value) {
  if (!value) return "";
  const diff = Date.now() - new Date(value).getTime();
  const day = 86400000;
  if (diff < 0) return "soon";
  if (diff < day) return "today";
  const days = Math.floor(diff / day);
  if (days === 1) return "yesterday";
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  if (days < 365) return `${Math.floor(days / 30)}mo ago`;
  return `${Math.floor(days / 365)}y ago`;
}

const shortDate = (value) =>
  value
    ? new Date(value).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    : "";

const SORT_OPTIONS = [
  { value: "manual", label: "Custom order" },
  { value: "recent", label: "Most recent" },
  { value: "title", label: "Title (A–Z)" },
  { value: "author", label: "Author (A–Z)" },
  { value: "items", label: "Most items" },
];

// The drop zone under the pointer. Rects are hit-tested by hand rather than
// with elementFromPoint, which would only ever return the card being dragged.
// Cards sit inside folders, so the innermost match wins. The dragged card
// still holds a slot in the grid as the gap it will drop into; hovering that
// gap reports `self`, which leaves the pending drop where it already is
// instead of flipping it to whatever band sits behind the gap.
// `rects` holds each card's settled layout box: cards mid-reflow are part way
// through an animation, and hit-testing where they are drawn rather than
// where they belong would bounce the drop back and forth.
function dropTargetAt(x, y, dragId, rects) {
  let hit = null;
  let overSelf = false;
  document.querySelectorAll("[data-drop]").forEach((el) => {
    const rect =
      rects.get(el.getAttribute("data-drop")) || el.getBoundingClientRect();
    if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom)
      return;
    const key = el.getAttribute("data-drop");
    if (key === `card:${dragId}`) {
      overSelf = true;
      return;
    }
    if (!hit || key.startsWith("card:")) hit = { key, rect };
  });
  return overSelf ? { self: true } : hit;
}

function ListCard({
  list,
  previews,
  saved,
  saveCount = 0,
  dragging = false,
  ghost = false,
  onGripDown,
  onCardDown,
  onCardClick,
}) {
  const { coverForTmdb, coverForHardcover } = useCovers();
  const count = itemCount(list);

  // User's per-title cover override wins over the stored snapshot image,
  // matching how ListView renders the same items.
  const coverOf = (it) =>
    it.media_type === "book"
      ? coverForHardcover(it.item_data?.hardcover_id) || it.item_data?.cover_image
      : coverForTmdb(it.item_data?.media_type, it.item_data?.tmdb_id) ||
        it.item_data?.primaryImage;

  return (
    <Link
      to={`/lists/${list.id}`}
      // The floating copy is not a drop zone; only the slot it left behind is.
      data-drop={ghost ? undefined : `card:${list.id}`}
      className={`list-card${dragging ? " list-card-dragging" : ""}`}
      onPointerDown={onCardDown}
      onClick={onCardClick}
      draggable={false}
      // A press anywhere on the card is a list drag; the browser's own drag
      // of the link and the poster images would fight it.
      onDragStart={(e) => e.preventDefault()}
    >
      <button
        type="button"
        className="list-card-grip"
        onPointerDown={onGripDown}
        // The card is a link; a grip press must not follow it.
        onClick={(e) => e.preventDefault()}
        title="Drag to reorder, or onto a folder to file it"
        aria-label="Drag list"
      >
        <GripVertical size={14} />
      </button>
      <div className="list-card-covers">
        {count === 0 ? (
          <div className="list-card-covers-blank">
            <img src="/images/lists.png" alt="" aria-hidden="true" />
          </div>
        ) : (
          Array.from({ length: 4 }, (_, i) => {
            const it = previews[i];
            if (!it) return <div key={i} className="list-card-cover-empty" />;
            return (
              <div key={i} className="list-card-cover">
                <img
                  src={coverOf(it) || "/images/placeholderimage.jpg"}
                  alt=""
                  loading="lazy"
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = "/images/placeholderimage.jpg";
                  }}
                />
              </div>
            );
          })
        )}
      </div>
      <div className="list-card-body">
        <h3 className="list-card-title">{list.title}</h3>
        <p className="list-card-owner">
          by {list.owner_name || "Unknown"}
          <span
            className="list-saves"
            title={`Saved by ${saveCount} ${saveCount === 1 ? "person" : "people"}`}
          >
            <svg
              width="11"
              height="11"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
            {saveCount}
          </span>
        </p>
        <span className="list-card-dates">
          <span className="list-card-updated">
            updated {timeAgo(list.updated_at)}
          </span>
          <span className="list-card-created">
            created {shortDate(list.created_at)}
          </span>
        </span>
        {list.description && (
          <p className="list-card-desc">{list.description}</p>
        )}
      </div>
      <div className="list-card-foot">
        <span
          className="toolbar-count list-card-count"
          title={`${count} ${count === 1 ? "item" : "items"}`}
        >
          {count}
        </span>
        {list.magic && (
          <span className="list-card-magic-stack">
            <span
              className="list-card-magic"
              title={
                list.magic.scope === "global"
                  ? "Magic list, built from rules over TMDB & Hardcover"
                  : "Magic list, built from rules over your library"
              }
            >
              ✨ Magic
            </span>
            <span
              className={`list-card-magic${
                list.magic.scope === "global"
                  ? " lv-magic-global"
                  : " list-card-scope-library"
              }`}
            >
              {list.magic.scope === "global" ? "Global" : "Library"}
            </span>
          </span>
        )}
        {saved && <span className="list-card-saved">Saved</span>}
      </div>
    </Link>
  );
}

export default function Lists() {
  const { user, isAuthenticated, loading } = useAuth();

  const [myLists, setMyLists] = useState([]);
  const [savedLists, setSavedLists] = useState([]);
  const [previews, setPreviews] = useState(new Map());
  const [saveCounts, setSaveCounts] = useState(new Map());
  const [dataLoading, setDataLoading] = useState(true);

  const [searchTerm, setSearchTerm] = useState("");
  const [ownerFilter, setOwnerFilter] = useState("all"); // "all" | "mine" | "saved"
  const [authorFilter, setAuthorFilter] = useState("all");
  const [sortKey, setSortKey] = useState("manual");

  // Folders and where each list sits, both per-viewer.
  const [folders, setFolders] = useState([]);
  const [placements, setPlacements] = useState(new Map());
  const [collapsed, setCollapsed] = useState(() => new Set());
  const [showFolderCreate, setShowFolderCreate] = useState(false);
  const [folderName, setFolderName] = useState("");
  const [renamingFolder, setRenamingFolder] = useState(null);
  const [deletingFolder, setDeletingFolder] = useState(null);

  // Live drag state. The pointer bookkeeping lives in a ref so the move
  // handler doesn't re-subscribe on every frame.
  const dragRef = useRef(null);
  const [dragId, setDragId] = useState(null);
  // Where the floating copy of the dragged card is drawn, and where the card
  // would land if the pointer were released now.
  // The floating copy: mounted from state, but moved by writing to the node
  // directly, so following the pointer costs no re-render.
  const [ghost, setGhost] = useState(null);
  const ghostRef = useRef(null);
  const settleTimerRef = useRef(null);
  const [preview, setPreview] = useState(null);
  const previewRef = useRef(null);
  // A press on a card that has not become a drag yet, and when the last drag
  // finished, which decides whether the release counts as a click.
  const pendingRef = useRef(null);
  const draggedAtRef = useRef(0);
  // Where every card sat on the last render, for the reflow animation.
  const cardRectsRef = useRef(new Map());

  const [showCreate, setShowCreate] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [creating, setCreating] = useState(false);

  const [showMagic, setShowMagic] = useState(false);
  const [creatingMagic, setCreatingMagic] = useState(false);

  useEffect(() => {
    if (!isAuthenticated || !user) return;
    let active = true;
    (async () => {
      setDataLoading(true);
      try {
        const [mine, saved, folderRows, placementMap] = await Promise.all([
          getMyLists(user.id),
          getSavedLists(user.id),
          // The folder tables are optional until the migration is run, so a
          // failure here leaves the page working as a flat list.
          getListFolders(user.id).catch(() => []),
          getListPlacements(user.id).catch(() => new Map()),
        ]);
        if (!active) return;
        setMyLists(mine);
        setSavedLists(saved);
        setFolders(folderRows);
        setPlacements(placementMap);
        const ids = [...new Set([...mine, ...saved].map((l) => l.id))];
        const [prev, counts] = await Promise.all([
          getListItemPreviews(ids),
          getListSaveCounts(ids).catch(() => new Map()),
        ]);
        if (active) {
          setPreviews(prev);
          setSaveCounts(counts);
        }
      } catch (err) {
        console.error("Failed to load lists:", err);
      } finally {
        if (active) setDataLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [isAuthenticated, user]);

  const savedIds = useMemo(
    () => new Set(savedLists.map((l) => l.id)),
    [savedLists],
  );

  // All lists (owned + saved) together, deduped, each tagged with the date used
  // for the "recent" sort (own lists by update time, saved ones by save time).
  const allLists = useMemo(() => {
    const owned = myLists.map((l) => ({ ...l, sortDate: l.updated_at }));
    const saved = savedLists.map((l) => ({
      ...l,
      sortDate: l.saved_at || l.updated_at,
    }));
    const map = new Map();
    [...owned, ...saved].forEach((l) => {
      if (!map.has(l.id)) map.set(l.id, l);
    });
    return Array.from(map.values());
  }, [myLists, savedLists]);

  const authors = useMemo(() => {
    const set = new Set();
    allLists.forEach((l) => l.owner_name && set.add(l.owner_name));
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [allLists]);

  const visibleLists = useMemo(() => {
    let arr = allLists;
    if (ownerFilter === "mine") {
      arr = arr.filter((l) => l.owner_id === user?.id);
    } else if (ownerFilter === "saved") {
      arr = arr.filter((l) => savedIds.has(l.id));
    }
    if (authorFilter !== "all") {
      arr = arr.filter((l) => l.owner_name === authorFilter);
    }
    const q = searchTerm.trim().toLowerCase();
    if (q) {
      arr = arr.filter(
        (l) =>
          (l.title || "").toLowerCase().includes(q) ||
          (l.description || "").toLowerCase().includes(q) ||
          (l.owner_name || "").toLowerCase().includes(q),
      );
    }
    return [...arr].sort((a, b) => {
      if (sortKey === "title") {
        return (a.title || "").localeCompare(b.title || "");
      }
      if (sortKey === "author") {
        return (a.owner_name || "").localeCompare(b.owner_name || "");
      }
      if (sortKey === "items") {
        return itemCount(b) - itemCount(a);
      }
      return new Date(b.sortDate) - new Date(a.sortDate);
    });
  }, [allLists, ownerFilter, authorFilter, searchTerm, sortKey, savedIds, user]);

  /* ---------- folders ---------- */

  // Lists split by the folder they've been filed into, null being the root.
  // Everything arrives in the chosen sort order; "Custom order" then applies
  // the dragged positions, leaving anything never dragged where it was.
  const grouped = useMemo(() => {
    const map = new Map();
    map.set(null, []);
    folders.forEach((f) => map.set(f.id, []));
    visibleLists.forEach((l) => {
      const folderId = placements.get(l.id)?.folder_id ?? null;
      (map.get(folderId) ?? map.get(null)).push(l);
    });
    if (sortKey === "manual") {
      map.forEach((arr) =>
        arr.sort((a, b) => {
          const pa = placements.get(a.id)?.position;
          const pb = placements.get(b.id)?.position;
          if (pa == null && pb == null) return 0;
          if (pa == null) return 1;
          if (pb == null) return -1;
          return pa - pb;
        }),
      );
    }
    return map;
  }, [visibleLists, folders, placements, sortKey]);

  // What the grids draw mid-drag: the dragged list already sits in the slot
  // it would land in, so the cards shifting around the pointer are the
  // preview of the drop.
  const previewGroups = useMemo(() => {
    const dragged =
      dragId != null && preview
        ? visibleLists.find((l) => l.id === dragId)
        : null;
    if (!dragged) return grouped;
    const next = new Map();
    grouped.forEach((arr, key) =>
      next.set(
        key,
        arr.filter((l) => l.id !== dragId),
      ),
    );
    const dest = [...(next.get(preview.folderId) || [])];
    const at =
      preview.index == null
        ? dest.length
        : Math.min(Math.max(preview.index, 0), dest.length);
    dest.splice(at, 0, dragged);
    next.set(preview.folderId, dest);
    return next;
  }, [grouped, dragId, preview, visibleLists]);

  // Move a list into `folderId` at `index` (end of the folder when null), then
  // renumber both the folder it landed in and the one it came from.
  const moveList = useCallback(
    (id, folderId, index) => {
      const from = placements.get(id)?.folder_id ?? null;
      const dest = (grouped.get(folderId) || [])
        .map((l) => l.id)
        .filter((x) => x !== id);
      const at = index == null ? dest.length : Math.min(Math.max(index, 0), dest.length);
      dest.splice(at, 0, id);

      const rows = dest.map((listId, i) => ({ listId, folderId, position: i }));
      if (from !== folderId) {
        (grouped.get(from) || [])
          .map((l) => l.id)
          .filter((x) => x !== id)
          .forEach((listId, i) =>
            rows.push({ listId, folderId: from, position: i }),
          );
      }

      setPlacements((prev) => {
        const next = new Map(prev);
        rows.forEach((r) =>
          next.set(r.listId, { folder_id: r.folderId, position: r.position }),
        );
        return next;
      });
      // A manual move is meaningless under any other sort, so adopt it.
      setSortKey("manual");
      setListPlacements(user.id, rows).catch((err) =>
        console.error("Failed to save list order:", err),
      );
    },
    [grouped, placements, user],
  );

  // The floating copy keeps the grab point exactly under the pointer, so the
  // cards reflowing underneath it never drag it off course.
  const beginDrag = (id, x, y, rect) => {
    dragRef.current = {
      id,
      grabX: x - rect.left,
      grabY: y - rect.top,
      width: rect.width,
    };
    // A drag started while the last one is still gliding home takes over.
    clearTimeout(settleTimerRef.current);
    setDragId(id);
    setGhost({ id, left: rect.left, top: rect.top, width: rect.width });
    previewRef.current = null;
    setPreview(null);
  };

  const positionGhost = (left, top) => {
    const el = ghostRef.current;
    if (!el) return;
    el.style.left = `${left}px`;
    el.style.top = `${top}px`;
  };

  const startDrag = (id) => (e) => {
    if (e.button != null && e.button !== 0) return;
    e.preventDefault();
    e.currentTarget.setPointerCapture?.(e.pointerId);
    beginDrag(
      id,
      e.clientX,
      e.clientY,
      e.currentTarget.closest(".list-card").getBoundingClientRect(),
    );
  };

  // Pressing the card itself drags it too: a mouse starts once the pointer
  // has moved a few pixels, a finger after a hold, so a tap still opens the
  // list and a swipe still scrolls the page.
  const clearPending = () => {
    const pending = pendingRef.current;
    if (!pending) return;
    clearTimeout(pending.timer);
    window.removeEventListener("pointermove", pending.onMove);
    window.removeEventListener("pointerup", pending.onEnd);
    window.removeEventListener("pointercancel", pending.onEnd);
    pendingRef.current = null;
  };

  const startCardPress = (id) => (e) => {
    if (e.button != null && e.button !== 0) return;
    // The grip runs its own immediate drag.
    if (e.target.closest?.(".list-card-grip")) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const touch = e.pointerType !== "mouse";
    const pending = {
      id,
      x: e.clientX,
      y: e.clientY,
      rect,
      timer: null,
      onMove: null,
      onEnd: null,
    };
    pending.onMove = (ev) => {
      const dist = Math.hypot(ev.clientX - pending.x, ev.clientY - pending.y);
      if (touch) {
        // Moving before the hold lands means they meant to scroll.
        if (dist > 10) clearPending();
      } else if (dist > 5) {
        clearPending();
        beginDrag(id, ev.clientX, ev.clientY, rect);
      }
    };
    pending.onEnd = clearPending;
    if (touch) {
      pending.timer = setTimeout(() => {
        clearPending();
        beginDrag(id, pending.x, pending.y, rect);
      }, 300);
    }
    window.addEventListener("pointermove", pending.onMove);
    window.addEventListener("pointerup", pending.onEnd);
    window.addEventListener("pointercancel", pending.onEnd);
    pendingRef.current = pending;
  };

  // A drag ends on the card it was dropped on, whose link would otherwise
  // open; the release is swallowed rather than followed.
  const handleCardClick = (e) => {
    if (Date.now() - draggedAtRef.current < 300) e.preventDefault();
  };

  useEffect(() => {
    if (dragId == null) return;
    // Folder and slot the pointer is over, in the same shape moveList takes.
    const placementFor = (target, dragId, x) => {
      const [kind, value] = target.key.split(":");
      if (kind === "card") {
        const overFolder = placements.get(value)?.folder_id ?? null;
        const dest = (grouped.get(overFolder) || [])
          .map((l) => l.id)
          .filter((x2) => x2 !== dragId);
        const idx = dest.indexOf(value);
        return {
          folderId: overFolder,
          // Past the card's midpoint means the list lands after it.
          index:
            idx === -1
              ? dest.length
              : x > target.rect.left + target.rect.width / 2
                ? idx + 1
                : idx,
        };
      }
      return { folderId: kind === "folder" ? value : null, index: null };
    };

    const move = (e) => {
      const drag = dragRef.current;
      if (!drag) return;
      e.preventDefault();
      positionGhost(e.clientX - drag.grabX, e.clientY - drag.grabY);
      const target = dropTargetAt(
        e.clientX,
        e.clientY,
        drag.id,
        cardRectsRef.current,
      );
      if (!target || target.self) return;
      const next = placementFor(target, drag.id, e.clientX);
      previewRef.current = next;
      setPreview(next);
    };
    const up = () => {
      const drag = dragRef.current;
      const landing = previewRef.current;
      // The slot the preview left open is exactly where the card belongs, so
      // the floating copy glides into it instead of blinking out mid-air.
      const slot = drag && cardRectsRef.current.get(`card:${drag.id}`);
      dragRef.current = null;
      previewRef.current = null;
      draggedAtRef.current = Date.now();
      setDragId(null);
      setPreview(null);
      // The preview already shows where it goes, so the drop just commits it.
      if (drag && landing) moveList(drag.id, landing.folderId, landing.index);
      if (!slot) {
        setGhost(null);
        return;
      }
      setGhost((prev) => prev && { ...prev, settling: true });
      requestAnimationFrame(() => positionGhost(slot.left, slot.top));
      settleTimerRef.current = setTimeout(() => setGhost(null), 200);
    };
    // A hold-to-drag starts mid-gesture, so the page is still free to scroll
    // under the finger until the touch stream itself is refused.
    const blockScroll = (e) => e.preventDefault();
    window.addEventListener("pointermove", move, { passive: false });
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
    window.addEventListener("touchmove", blockScroll, { passive: false });
    // Stop a touch drag scrolling the page and a mouse drag selecting text.
    const prevTouch = document.body.style.touchAction;
    const prevSelect = document.body.style.userSelect;
    document.body.style.touchAction = "none";
    document.body.style.userSelect = "none";
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
      window.removeEventListener("touchmove", blockScroll);
      document.body.style.touchAction = prevTouch;
      document.body.style.userSelect = prevSelect;
    };
  }, [dragId, grouped, placements, moveList]);

  // Cards jump straight to their new grid slot when the preview changes, so
  // each one is put back where it was and animated across the gap.
  useLayoutEffect(() => {
    if (dragId == null) {
      cardRectsRef.current = new Map();
      return;
    }
    const seen = new Map();
    const cards = [...document.querySelectorAll("[data-drop^='card:']")];
    // Drop any animation still running first, so what gets measured is the
    // real layout box and not a frame of the last move.
    cards.forEach((el) => {
      el.style.transition = "none";
      el.style.transform = "";
    });
    cards.forEach((el) => {
      const key = el.getAttribute("data-drop");
      const rect = el.getBoundingClientRect();
      seen.set(key, rect);
      const was = cardRectsRef.current.get(key);
      if (!was) return;
      const dx = was.left - rect.left;
      const dy = was.top - rect.top;
      if (!dx && !dy) return;
      el.style.transition = "none";
      el.style.transform = `translate(${dx}px, ${dy}px)`;
      requestAnimationFrame(() => {
        el.style.transition = "transform 200ms var(--ease-out, ease)";
        el.style.transform = "";
      });
    });
    cardRectsRef.current = seen;
  });

  const handleCreateFolder = async (e) => {
    e.preventDefault();
    const name = folderName.trim();
    if (!name) return;
    try {
      const folder = await createListFolder(user.id, name, folders.length);
      setFolders((prev) => [...prev, folder]);
      setFolderName("");
      setShowFolderCreate(false);
    } catch (err) {
      console.error("Failed to create folder:", err);
    }
  };

  const handleRenameFolder = async (folderId, name) => {
    setRenamingFolder(null);
    const trimmed = name.trim();
    const current = folders.find((f) => f.id === folderId);
    if (!trimmed || trimmed === current?.name) return;
    setFolders((prev) =>
      prev.map((f) => (f.id === folderId ? { ...f, name: trimmed } : f)),
    );
    try {
      await renameListFolder(folderId, trimmed);
    } catch (err) {
      console.error("Failed to rename folder:", err);
    }
  };

  // Deleting a folder empties it rather than deleting its lists: the placement
  // rows' folder_id is nulled by the FK, dropping them back to the root.
  const handleDeleteFolder = async (folderId) => {
    setDeletingFolder(null);
    setFolders((prev) => prev.filter((f) => f.id !== folderId));
    setPlacements((prev) => {
      const next = new Map(prev);
      next.forEach((v, k) => {
        if (v.folder_id === folderId) next.set(k, { ...v, folder_id: null });
      });
      return next;
    });
    try {
      await deleteListFolder(folderId);
    } catch (err) {
      console.error("Failed to delete folder:", err);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!title.trim() || creating) return;
    setCreating(true);
    try {
      const list = await createList(user.id, {
        title: title.trim(),
        description: description.trim(),
        ownerName: getDisplayName(user),
      });
      setMyLists((prev) => [{ ...list, list_items: [{ count: 0 }] }, ...prev]);
      setTitle("");
      setDescription("");
      setShowCreate(false);
    } catch (err) {
      console.error("Failed to create list:", err);
    } finally {
      setCreating(false);
    }
  };

  // Create the list, store its rules and materialize the current matches in
  // one go, so the card lands populated.
  const handleCreateMagic = async ({ title, description, magic, snapshots }) => {
    if (creatingMagic) return;
    setCreatingMagic(true);
    try {
      const list = await createList(user.id, {
        title,
        description,
        ownerName: getDisplayName(user),
      });
      const withMagic = await setListMagic(list.id, magic);
      const rows = await bulkAddListItems(list.id, snapshots, 0);
      setMyLists((prev) => [
        { ...withMagic, list_items: [{ count: rows.length }] },
        ...prev,
      ]);
      setPreviews((prev) => {
        const next = new Map(prev);
        next.set(
          list.id,
          rows.slice(0, 4).map((r) => ({
            media_type: r.media_type,
            item_data: r.item_data,
          })),
        );
        return next;
      });
      setShowMagic(false);
    } catch (err) {
      console.error("Failed to create magic list:", err);
    } finally {
      setCreatingMagic(false);
    }
  };

  if (loading) return <Loader />;
  if (!isAuthenticated) return <SignIn />;

  const draggedList = ghost
    ? visibleLists.find((l) => l.id === ghost.id)
    : null;

  const renderCard = (list) => (
    <ListCard
      key={list.id}
      list={list}
      previews={previews.get(list.id) || []}
      saved={savedIds.has(list.id)}
      saveCount={saveCounts.get(list.id) || 0}
      dragging={dragId === list.id}
      onGripDown={startDrag(list.id)}
      onCardDown={startCardPress(list.id)}
      onCardClick={handleCardClick}
    />
  );

  return (
    <div className="page-stack">
      <div className="lists-header">
        <h1 className="page-title lists-page-title">Lists</h1>
        <div className="lists-header-actions">
          <button
            className="lists-create-btn lists-magic-btn"
            onClick={() => setShowMagic(true)}
          >
            ✨ Magic list
          </button>
          <button
            className="lists-create-btn lists-folder-btn"
            onClick={() => setShowFolderCreate(true)}
          >
            <FolderPlus size={15} />
            New folder
          </button>
          <button className="lists-create-btn" onClick={() => setShowCreate(true)}>
            + New list
          </button>
        </div>
      </div>

      {dataLoading ? (
        <Loader />
      ) : allLists.length === 0 ? (
        <div className="lists-empty-panel">
          <img src="/images/lists.png" alt="" aria-hidden="true" />
          <h2>No lists yet</h2>
          <p>
            Create a list to start collecting movies, TV and books to share.
            Any lists you save from other people will show up here too.
          </p>
          <div className="lists-empty-ctas">
            <button
              className="lists-create-btn lists-empty-cta"
              onClick={() => setShowCreate(true)}
            >
              + Create your first list
            </button>
            <button
              className="lists-create-btn lists-magic-btn lists-empty-cta"
              onClick={() => setShowMagic(true)}
            >
              ✨ Create a magic list
            </button>
          </div>
        </div>
      ) : (
        <>
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
                  {String.fromCharCode(0x2715)}
                </button>
              )}
            </div>
            <select
              className="toolbar-select"
              value={ownerFilter}
              onChange={(e) => setOwnerFilter(e.target.value)}
            >
              <option value="all">All lists</option>
              <option value="mine">My lists</option>
              <option value="saved">Saved lists</option>
            </select>
            {authors.length > 1 && (
              <select
                className="toolbar-select"
                value={authorFilter}
                onChange={(e) => setAuthorFilter(e.target.value)}
              >
                <option value="all">All authors</option>
                {authors.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            )}
            <select
              className="toolbar-select"
              value={sortKey}
              onChange={(e) => setSortKey(e.target.value)}
            >
              {SORT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
            <span className="toolbar-count">{visibleLists.length}</span>
          </div>

          {visibleLists.length === 0 ? (
            <p className="lists-empty">No lists match this filter.</p>
          ) : (
            <>
              {/* loose lists - also the target for dragging one back out of a
                  folder, so the band stays even when it's empty */}
              <div
                data-drop="root"
                className={`lists-root${
                  preview && preview.folderId === null ? " lists-drop-over" : ""
                }`}
              >
                {(previewGroups.get(null) || []).length === 0 ? (
                  <p className="lists-root-empty">
                    Drag a list here to take it out of its folder.
                  </p>
                ) : (
                  <div className="lists-grid">
                    {(previewGroups.get(null) || []).map((list) =>
                      renderCard(list),
                    )}
                  </div>
                )}
              </div>

              {folders.map((folder) => {
                const inFolder = previewGroups.get(folder.id) || [];
                const open = !collapsed.has(folder.id);
                return (
                  <section
                    key={folder.id}
                    data-drop={`folder:${folder.id}`}
                    className={`lists-folder${
                      preview?.folderId === folder.id ? " lists-drop-over" : ""
                    }`}
                  >
                    <div className="lists-folder-head">
                      <button
                        type="button"
                        className={`lists-folder-toggle${open ? " open" : ""}`}
                        onClick={() =>
                          setCollapsed((prev) => {
                            const next = new Set(prev);
                            next.has(folder.id)
                              ? next.delete(folder.id)
                              : next.add(folder.id);
                            return next;
                          })
                        }
                        aria-expanded={open}
                        aria-label={open ? "Collapse folder" : "Expand folder"}
                      >
                        <ChevronDown size={16} />
                      </button>
                      <Folder size={16} className="lists-folder-icon" />
                      {renamingFolder === folder.id ? (
                        <input
                          className="lists-folder-rename"
                          defaultValue={folder.name}
                          autoFocus
                          onBlur={(e) =>
                            handleRenameFolder(folder.id, e.target.value)
                          }
                          onKeyDown={(e) => {
                            if (e.key === "Enter") e.target.blur();
                            if (e.key === "Escape") setRenamingFolder(null);
                          }}
                        />
                      ) : (
                        <span className="lists-folder-name">{folder.name}</span>
                      )}
                      <span className="toolbar-count">{inFolder.length}</span>
                      <span className="lists-folder-date">
                        created {shortDate(folder.created_at)}
                      </span>
                      <button
                        type="button"
                        className="lists-folder-action"
                        onClick={() => setRenamingFolder(folder.id)}
                        title="Rename folder"
                        aria-label="Rename folder"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        type="button"
                        className="lists-folder-action"
                        onClick={() => setDeletingFolder(folder)}
                        title="Delete folder"
                        aria-label="Delete folder"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                    {open &&
                      (inFolder.length === 0 ? (
                        <p className="lists-root-empty">
                          Empty. Drag a list onto this folder to file it.
                        </p>
                      ) : (
                        <div className="lists-grid">
                          {inFolder.map((list) => renderCard(list))}
                        </div>
                      ))}
                  </section>
                );
              })}
            </>
          )}
        </>
      )}

      {draggedList && ghost && (
        <div
          ref={ghostRef}
          className={`lists-drag-ghost${ghost.settling ? " is-settling" : ""}`}
          style={{ left: ghost.left, top: ghost.top, width: ghost.width }}
        >
          <ListCard
            list={draggedList}
            previews={previews.get(draggedList.id) || []}
            saved={savedIds.has(draggedList.id)}
            saveCount={saveCounts.get(draggedList.id) || 0}
            ghost
          />
        </div>
      )}

      {showMagic && (
        <MagicListModal
          mode="create"
          saving={creatingMagic}
          onClose={() => setShowMagic(false)}
          onSubmit={handleCreateMagic}
        />
      )}

      {showFolderCreate && (
        <div
          className="lists-modal-overlay"
          onClick={() => setShowFolderCreate(false)}
        >
          <div className="lists-modal" onClick={(e) => e.stopPropagation()}>
            <div className="lists-modal-head">
              <h3>New folder</h3>
              <button
                className="lists-modal-close"
                onClick={() => setShowFolderCreate(false)}
                aria-label="Close"
              >
                {String.fromCharCode(0x2715)}
              </button>
            </div>
            <form className="lists-create-form" onSubmit={handleCreateFolder}>
              <input
                type="text"
                placeholder="Folder name"
                value={folderName}
                onChange={(e) => setFolderName(e.target.value)}
                maxLength={60}
                autoFocus
              />
              <button type="submit" disabled={!folderName.trim()}>
                Create folder
              </button>
            </form>
          </div>
        </div>
      )}

      {deletingFolder && (
        <div
          className="lists-modal-overlay"
          onClick={() => setDeletingFolder(null)}
        >
          <div className="lists-modal" onClick={(e) => e.stopPropagation()}>
            <div className="lists-modal-head">
              <h3>Delete folder</h3>
              <button
                className="lists-modal-close"
                onClick={() => setDeletingFolder(null)}
                aria-label="Close"
              >
                {String.fromCharCode(0x2715)}
              </button>
            </div>
            <p className="lists-modal-text">
              Delete “{deletingFolder.name}”? The lists inside it move back out
              to the top level, nothing is deleted.
            </p>
            <div className="lists-modal-actions">
              <button
                className="lists-create-btn"
                onClick={() => setDeletingFolder(null)}
              >
                Cancel
              </button>
              <button
                className="lists-create-btn lists-danger-btn"
                onClick={() => handleDeleteFolder(deletingFolder.id)}
              >
                Delete folder
              </button>
            </div>
          </div>
        </div>
      )}

      {showCreate && (
        <div className="lists-modal-overlay" onClick={() => setShowCreate(false)}>
          <div className="lists-modal" onClick={(e) => e.stopPropagation()}>
            <div className="lists-modal-head">
              <h3>New list</h3>
              <button
                className="lists-modal-close"
                onClick={() => setShowCreate(false)}
                aria-label="Close"
              >
                {String.fromCharCode(0x2715)}
              </button>
            </div>
            <form className="lists-create-form" onSubmit={handleCreate}>
              <input
                type="text"
                placeholder="List name"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={100}
                autoFocus
              />
              <textarea
                placeholder="Description (optional)"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                maxLength={500}
                rows={3}
              />
              <button type="submit" disabled={!title.trim() || creating}>
                {creating ? <Spinner /> : "Create list"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
