import { supabase } from "./supabase-client";
import { fetchAllPages } from "./pageRows";

// Shareable media lists. Each list_items row stores a self-contained snapshot
// (item_data) of the movie/TV/book so a list renders for anonymous visitors
// without touching any user-scoped table. See the lists/list_items/saved_lists
// tables and their RLS policies in Supabase.

/* ---------- snapshot builders ---------- */

// Build the { media_type, item_data } snapshot for a movie/TV object.
export function movieToListItem(movie) {
  return {
    media_type: movie.media_type, // "movie" | "tv"
    item_data: {
      tmdb_id: movie.tmdb_id ?? null,
      media_type: movie.media_type ?? null,
      primaryTitle: movie.primaryTitle ?? null,
      primaryImage: movie.primaryImage ?? null,
      startYear: movie.startYear ?? null,
    },
  };
}

// Build the snapshot for a book_entries-shaped object.
export function bookToListItem(book) {
  return {
    media_type: "book",
    item_data: {
      hardcover_id: book.hardcover_id ?? null,
      isbn13: book.isbn13 ?? null,
      goodreads_link: book.goodreads_link ?? null,
      title: book.title ?? null,
      author: book.author ?? null,
      cover_image: book.cover_image ?? null,
      release_year: book.release_year ?? null,
    },
  };
}

// The value that uniquely identifies a media item within a list, used for
// dedupe and membership checks.
export function mediaKey(snapshot) {
  if (snapshot.media_type !== "book") {
    return String(snapshot.item_data.tmdb_id);
  }
  return (
    snapshot.item_data.hardcover_id ||
    snapshot.item_data.goodreads_link ||
    `${snapshot.item_data.title}:${snapshot.item_data.author}`
  );
}

/* ---------- lists ---------- */

// Lists owned by the user, with an item count for the card badge.
export async function getMyLists(userId) {
  const { data, error } = await supabase
    .from("lists")
    .select("*, list_items(count)")
    .eq("owner_id", userId)
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

// Lists the user has saved from other people (flattened, dropping any whose
// underlying list has since been deleted).
export async function getSavedLists(userId) {
  const { data, error } = await supabase
    .from("saved_lists")
    .select("saved_at, lists(*, list_items(count))")
    .eq("user_id", userId)
    .order("saved_at", { ascending: false });
  if (error) throw error;
  return (data ?? [])
    .filter((row) => row.lists)
    .map((row) => ({ ...row.lists, saved_at: row.saved_at }));
}

// The first few item snapshots of each list, for the cover previews on the
// Lists landing page. One small query per list: PostgREST can't cap rows per
// group, so a single query would have to pull every item of every list.
export async function getListItemPreviews(listIds, perList = 4) {
  if (!listIds.length) return new Map();
  const results = await Promise.all(
    listIds.map(async (listId) => {
      const { data, error } = await supabase
        .from("list_items")
        .select("list_id, media_type, item_data")
        .eq("list_id", listId)
        .order("position", { ascending: true })
        .order("created_at", { ascending: true })
        .limit(perList);
      if (error) throw error;
      return [listId, data ?? []];
    }),
  );
  return new Map(results.filter(([, rows]) => rows.length));
}

// A single list plus its items, ordered for display. Public — works for
// anonymous visitors. Returns null if the list doesn't exist.
export async function getListWithItems(listId) {
  const { data: list, error } = await supabase
    .from("lists")
    .select("*")
    .eq("id", listId)
    .maybeSingle();
  if (error) throw error;
  if (!list) return null;

  const items = await fetchAllPages(() =>
    supabase
      .from("list_items")
      .select("*")
      .eq("list_id", listId)
      .order("position", { ascending: true })
      .order("created_at", { ascending: true })
      // Tiebreaker, so rows can't shuffle between pages and get skipped.
      .order("id", { ascending: true }),
  );

  return { ...list, items };
}

export async function createList(ownerId, { title, description, ownerName }) {
  const { data, error } = await supabase
    .from("lists")
    .insert({
      owner_id: ownerId,
      title,
      description: description || null,
      owner_name: ownerName || null,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateList(listId, fields) {
  const { data, error } = await supabase
    .from("lists")
    .update({ ...fields, updated_at: new Date().toISOString() })
    .eq("id", listId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteList(listId) {
  const { error } = await supabase.from("lists").delete().eq("id", listId);
  if (error) throw error;
}

/* ---------- list items ---------- */

// Append a media snapshot to the end of a list.
export async function addMediaToList(listId, snapshot) {
  const { count } = await supabase
    .from("list_items")
    .select("id", { count: "exact", head: true })
    .eq("list_id", listId);

  const { data, error } = await supabase
    .from("list_items")
    .insert({
      list_id: listId,
      media_type: snapshot.media_type,
      item_data: snapshot.item_data,
      position: count ?? 0,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

// Persist a new manual order. `orderedIds` is the full list of item ids in the
// order they should appear; only rows whose position actually moved are
// written, and those go out in parallel.
export async function reorderListItems(orderedIds, currentPositions) {
  const writes = [];
  orderedIds.forEach((id, i) => {
    if (currentPositions?.get(id) === i) return;
    writes.push(
      supabase.from("list_items").update({ position: i }).eq("id", id),
    );
  });
  if (!writes.length) return;
  const results = await Promise.all(writes);
  const failed = results.find((r) => r.error);
  if (failed) throw failed.error;
}

export async function removeListItem(itemId) {
  const { error } = await supabase
    .from("list_items")
    .delete()
    .eq("id", itemId);
  if (error) throw error;
}

/* ---------- magic lists ---------- */

// Persist a list's magic config ({ enabled, combinator, rules }) or null to
// turn a magic list back into a plain one. Lives in the lists.magic jsonb
// column (see docs/magic-lists.sql).
export async function setListMagic(listId, magic) {
  const { data, error } = await supabase
    .from("lists")
    .update({ magic, updated_at: new Date().toISOString() })
    .eq("id", listId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

// Bulk insert for magic syncs — one round trip instead of one per item.
export async function bulkAddListItems(listId, snapshots, startPosition = 0) {
  if (!snapshots.length) return [];
  const rows = snapshots.map((s, i) => ({
    list_id: listId,
    media_type: s.media_type,
    item_data: s.item_data,
    position: startPosition + i,
  }));
  const { data, error } = await supabase
    .from("list_items")
    .insert(rows)
    .select();
  if (error) throw error;
  return data ?? [];
}

export async function bulkRemoveListItems(itemIds) {
  if (!itemIds.length) return;
  const { error } = await supabase
    .from("list_items")
    .delete()
    .in("id", itemIds);
  if (error) throw error;
}

// Of the given lists, which already contain this media item. One query for the
// whole set so the add-to-list modal can show "Added" up front.
export async function listsContainingMedia(listIds, snapshot) {
  if (!listIds.length) return new Set();
  let query = supabase
    .from("list_items")
    .select("list_id")
    .in("list_id", listIds);

  if (snapshot.media_type === "book") {
    if (snapshot.item_data.hardcover_id) {
      query = query.eq(
        "item_data->>hardcover_id",
        String(snapshot.item_data.hardcover_id),
      );
    } else {
      query = query.eq(
        "item_data->>goodreads_link",
        snapshot.item_data.goodreads_link,
      );
    }
  } else {
    query = query
      .eq("media_type", snapshot.media_type)
      .eq("item_data->>tmdb_id", String(snapshot.item_data.tmdb_id));
  }

  const { data, error } = await query;
  if (error) throw error;
  return new Set((data ?? []).map((row) => row.list_id));
}

// The viewer's own lists that already hold this media item, for the "In your
// lists" line on a details page. One query - the join back to lists is what
// keeps other people's lists out.
export async function getMyListsWithMedia(userId, snapshot) {
  let query = supabase
    .from("list_items")
    .select("lists!inner(id, title)")
    .eq("lists.owner_id", userId);

  if (snapshot.media_type === "book") {
    if (snapshot.item_data.hardcover_id) {
      query = query.eq(
        "item_data->>hardcover_id",
        String(snapshot.item_data.hardcover_id),
      );
    } else if (snapshot.item_data.goodreads_link) {
      query = query.eq(
        "item_data->>goodreads_link",
        snapshot.item_data.goodreads_link,
      );
    } else {
      return [];
    }
  } else {
    if (snapshot.item_data.tmdb_id == null) return [];
    query = query
      .eq("media_type", snapshot.media_type)
      .eq("item_data->>tmdb_id", String(snapshot.item_data.tmdb_id));
  }

  const { data, error } = await query;
  if (error) throw error;
  // A list could hold the same title twice; show it once.
  const seen = new Map();
  (data ?? []).forEach((row) => {
    if (row.lists) seen.set(row.lists.id, row.lists);
  });
  return Array.from(seen.values());
}

// The user's lists with their items, used to build the home-page activity feed
// (list created + items added events).
export async function getListsActivity(userId) {
  const { data, error } = await supabase
    .from("lists")
    .select("id, title, created_at, list_items(id, item_data, media_type, created_at)")
    .eq("owner_id", userId);
  if (error) throw error;
  return data ?? [];
}

/* ---------- folders & placement ---------- */

// Folders are per-user, and so is placement: the Lists page also shows lists
// saved from other people, which the viewer can't write to, so where a list
// sits is stored against the viewer instead of the list.

export async function getListFolders(userId) {
  const { data, error } = await supabase
    .from("list_folders")
    .select("*")
    .eq("user_id", userId)
    .order("position", { ascending: true })
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function createListFolder(userId, name, position = 0) {
  const { data, error } = await supabase
    .from("list_folders")
    .insert({ user_id: userId, name, position })
    .select()
    .single();
  if (error) throw error;
  return data;
}

// Folders are drawn in `position` order. There are only ever a handful, so
// writing them one at a time beats round-tripping every column for an upsert.
export async function reorderListFolders(orderedIds) {
  const results = await Promise.all(
    orderedIds.map((id, position) =>
      supabase.from("list_folders").update({ position }).eq("id", id),
    ),
  );
  const failed = results.find((r) => r.error);
  if (failed) throw failed.error;
}

export async function renameListFolder(folderId, name) {
  const { error } = await supabase
    .from("list_folders")
    .update({ name })
    .eq("id", folderId);
  if (error) throw error;
}

// The folder's lists aren't deleted with it: the placement rows' folder_id is
// nulled by the FK, dropping those lists back to the root.
export async function deleteListFolder(folderId) {
  const { error } = await supabase
    .from("list_folders")
    .delete()
    .eq("id", folderId);
  if (error) throw error;
}

// list_id -> { folder_id, position } for everything the user has filed.
export async function getListPlacements(userId) {
  const { data, error } = await supabase
    .from("list_placements")
    .select("list_id, folder_id, position")
    .eq("user_id", userId);
  if (error) throw error;
  return new Map(
    (data ?? []).map((r) => [
      r.list_id,
      { folder_id: r.folder_id, position: r.position },
    ]),
  );
}

// Upsert placement for a batch of lists in one round trip. `rows` is
// [{ listId, folderId, position }].
export async function setListPlacements(userId, rows) {
  if (!rows.length) return;
  const { error } = await supabase.from("list_placements").upsert(
    rows.map((r) => ({
      user_id: userId,
      list_id: r.listId,
      folder_id: r.folderId ?? null,
      position: r.position,
    })),
    { onConflict: "user_id,list_id" },
  );
  if (error) throw error;
}

/* ---------- saving others' lists ---------- */

export async function isListSaved(userId, listId) {
  const { data, error } = await supabase
    .from("saved_lists")
    .select("list_id")
    .eq("user_id", userId)
    .eq("list_id", listId)
    .maybeSingle();
  if (error) throw error;
  return !!data;
}

// Map of list_id -> save count (author's own saves excluded), from the
// list_save_counts view (see docs/list-save-counts.sql). Lists with no saves
// simply have no row.
export async function getListSaveCounts(listIds) {
  if (!listIds.length) return new Map();
  const { data, error } = await supabase
    .from("list_save_counts")
    .select("list_id, save_count")
    .in("list_id", listIds);
  if (error) throw error;
  return new Map((data ?? []).map((r) => [r.list_id, r.save_count]));
}

export async function saveList(userId, listId) {
  const { error } = await supabase
    .from("saved_lists")
    .insert({ user_id: userId, list_id: listId });
  if (error) throw error;
}

export async function unsaveList(userId, listId) {
  const { error } = await supabase
    .from("saved_lists")
    .delete()
    .eq("user_id", userId)
    .eq("list_id", listId);
  if (error) throw error;
}
