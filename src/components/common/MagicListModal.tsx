import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useCovers } from "../../contexts/UserCoversContext";
import { useMagicLibrary } from "../../hooks/useMagicLibrary";
import { useDebouncedValue } from "../../utils/useDebouncedValue";
import { searchPeople, searchBooksHardcover } from "../../services/api";
import {
  MAGIC_FIELDS,
  MAGIC_OPS,
  GLOBAL_FIELDS,
  GLOBAL_SEED_FIELDS,
  fieldMeta,
  newMagicRule,
  newMagicGroup,
  isGroup,
  magicTree,
  magicRules,
  computeMagicSnapshots,
  computeGlobalSnapshots,
  validateGlobalRules,
  validateRuleLogic,
  allowedKindsForRule,
  FIELD_KINDS,
  KIND_LABELS,
} from "../../utils/magicLists";
import { Spinner } from "../layout/Loader";
import "../../styles/search/Toolbar.css";
import "../../styles/pages/Lists.css";

// Search-as-you-type selector for director/actor/author rules. Free text is
// never committed: the rule only gets a value when an option is picked, so
// "Chris" can't silently resolve to whichever Chris TMDB ranks first, and the
// preview stays empty until a real person/author is chosen.
function SuggestPicker({ rule, onPick, fetchOptions, placeholder }) {
  const [text, setText] = useState(rule.value || "");
  const [open, setOpen] = useState(false);
  const [options, setOptions] = useState([]);
  const [searching, setSearching] = useState(false);
  const debounced = useDebouncedValue(text, 350);

  // External changes (switching the rule's field) reset the input.
  useEffect(() => {
    setText(rule.value || "");
  }, [rule.field, rule.value]);

  useEffect(() => {
    const term = debounced.trim();
    if (!open || term.length < 2 || term === rule.value) {
      setOptions([]);
      setSearching(false);
      return;
    }
    let cancelled = false;
    setSearching(true);
    fetchOptions(term)
      .then((opts) => {
        if (!cancelled) setOptions(opts);
      })
      .catch(() => {
        if (!cancelled) setOptions([]);
      })
      .finally(() => {
        if (!cancelled) setSearching(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debounced, open, rule.value]);

  const unset = text.trim() !== "" && !rule.value;

  return (
    <div className="magic-person">
      <input
        className={`magic-value${unset ? " magic-value-unset" : ""}`}
        type="text"
        placeholder={placeholder}
        value={text}
        title={unset ? "Pick from the dropdown to use this rule" : undefined}
        onChange={(e) => {
          setText(e.target.value);
          setOpen(true);
          // Typing invalidates any previous pick.
          if (rule.value) onPick({ value: "", person_id: null });
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
      />
      {open && (searching || options.length > 0) && (
        <div className="menu-pop magic-person-pop">
          {searching ? (
            <div className="menu-pop-item magic-person-note">Searching...</div>
          ) : (
            options.map((opt) => (
              <button
                type="button"
                className="menu-pop-item"
                key={opt.key}
                onMouseDown={(e) => {
                  e.preventDefault();
                  setText(opt.label);
                  setOpen(false);
                  setOptions([]);
                  onPick(opt.patch);
                }}
              >
                {opt.label}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}

// Rank the full result page ourselves: exact and whole-word name matches
// ("Kubrick" → Stanley Kubrick) beat TMDB's raw relevance order, which is
// kept only as the tie-break. Having credits/a photo nudges real notables up.
function personScore(p, term, index) {
  const name = (p.name || "").toLowerCase();
  const needle = term.toLowerCase().trim();
  let score = 0;
  if (name === needle) score = 100;
  else if (name.split(/\s+/).includes(needle)) score = 80;
  else if (name.startsWith(needle)) score = 70;
  else if (name.includes(needle)) score = 50;
  if ((p.known_for || []).length) score += 5;
  if (p.profile) score += 3;
  return score - index * 0.5;
}

async function fetchPersonOptions(term) {
  const people = (await searchPeople(term)) || [];
  // Person search hits carry `name` (not the `fullName` used on credits).
  return people
    .filter((p) => p.person_id != null && p.name)
    .map((p, i) => ({ p, score: personScore(p, term, i) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 8)
    .map(({ p }) => ({
      key: p.person_id,
      label: p.name,
      sub: [p.department, (p.known_for || [])[0]].filter(Boolean).join(" · "),
      image: p.profile || null,
      patch: {
        value: p.name,
        person_id: p.person_id,
        person_image: p.profile || null,
      },
    }));
}

// Dedicated search modal for picking a director/actor, with headshots so
// same-named people are tellable apart. Renders on top of the magic modal.
function PersonPickModal({ title, onPick, onClose }) {
  const [query, setQuery] = useState("");
  const [options, setOptions] = useState([]);
  const [searching, setSearching] = useState(false);
  const debounced = useDebouncedValue(query, 350);

  useEffect(() => {
    const term = debounced.trim();
    if (term.length < 2) {
      setOptions([]);
      setSearching(false);
      return;
    }
    let cancelled = false;
    setSearching(true);
    fetchPersonOptions(term)
      .then((opts) => {
        if (!cancelled) setOptions(opts);
      })
      .catch(() => {
        if (!cancelled) setOptions([]);
      })
      .finally(() => {
        if (!cancelled) setSearching(false);
      });
    return () => {
      cancelled = true;
    };
  }, [debounced]);

  return createPortal(
    <div className="lists-modal-overlay" onClick={onClose}>
      <div className="lists-modal" onClick={(e) => e.stopPropagation()}>
        <div className="lists-modal-head">
          <h3>{title}</h3>
          <button
            className="lists-modal-close"
            onClick={onClose}
            aria-label="Close"
          >
            {String.fromCharCode(0x2715)}
          </button>
        </div>
        <input
          className="person-pick-input"
          type="text"
          placeholder="Search TMDB for a person..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          autoFocus
        />
        <div className="person-pick-results">
          {searching ? (
            <div className="lists-modal-loading">
              <Spinner />
            </div>
          ) : options.length === 0 ? (
            <p className="lists-modal-empty">
              {debounced.trim().length < 2
                ? "Type a name to search."
                : "No people found."}
            </p>
          ) : (
            options.map((opt) => (
              <button
                type="button"
                className="person-pick-row"
                key={opt.key}
                onClick={() => onPick(opt.patch)}
              >
                <img
                  src={opt.image || "/images/placeholderimage.jpg"}
                  alt=""
                  loading="lazy"
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = "/images/placeholderimage.jpg";
                  }}
                />
                <span className="person-pick-info">
                  <span className="person-pick-name">{opt.label}</span>
                  {opt.sub && (
                    <span className="person-pick-sub">{opt.sub}</span>
                  )}
                </span>
              </button>
            ))
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}

// Hardcover has no author-search endpoint, so author suggestions are the
// distinct author names on the books a title search returns.
async function fetchAuthorOptions(term) {
  const books = (await searchBooksHardcover(term)) || [];
  const needle = term.toLowerCase();
  const seen = new Set();
  const out = [];
  for (const b of books) {
    const author = (b.author || "").trim();
    const key = author.toLowerCase();
    if (!author || seen.has(key) || !key.includes(needle)) continue;
    seen.add(key);
    out.push({ key, label: author, patch: { value: author, person_id: null } });
    if (out.length >= 6) break;
  }
  return out;
}

/* ---------- rule tree editing ---------- */

const newRoot = (withRule = 1) => ({
  type: "group",
  combinator: "and",
  children: withRule ? [newMagicRule()] : [],
});

const nodeAt = (node, path) =>
  path.reduce((n, i) => n?.children?.[i], node);

// Replace the node at `path` (child indices from the root) with fn(node).
function updateAt(node, path, fn) {
  if (!path.length) return fn(node);
  const [i, ...rest] = path;
  return {
    ...node,
    children: node.children.map((c, ci) =>
      ci === i ? updateAt(c, rest, fn) : c,
    ),
  };
}

function removeAt(node, path) {
  const [i, ...rest] = path;
  if (!rest.length) {
    return { ...node, children: node.children.filter((_, ci) => ci !== i) };
  }
  return {
    ...node,
    children: node.children.map((c, ci) => (ci === i ? removeAt(c, rest) : c)),
  };
}

// Drop rules with no value, and any group left empty by that.
function pruneTree(node) {
  if (isGroup(node)) {
    const children = (node.children || []).map(pruneTree).filter(Boolean);
    return children.length ? { ...node, children } : null;
  }
  const meta = fieldMeta(node.field);
  const filled =
    meta.kind === "select" ? !!node.value : String(node.value).trim() !== "";
  return filled ? node : null;
}

// Old lists stored ops these fields no longer offer; pin them to the current
// one so an existing list opens on a valid selection.
function fixLegacyOps(node) {
  if (isGroup(node)) {
    return { ...node, children: (node.children || []).map(fixLegacyOps) };
  }
  return {
    ...node,
    ...(node.field === "director" || node.field === "author"
      ? { op: "is" }
      : node.field === "actor"
        ? { op: "contains" }
        : node.field === "source"
          ? { op: "in" }
          : {}),
  };
}

// One rule: NOT, field, operator, value, remove. `path` is where it lives in
// the tree, which is all any edit needs.
function RuleRow({ rule, path, root, scope, actions }) {
  const meta = fieldMeta(rule.field);
  // What the rules certain to hold alongside this one still allow;
  // incompatible fields/type values gray out instead of erroring.
  const allowedKinds = allowedKindsForRule(root, path);
  const kindSuffix = (field) => {
    const kinds = FIELD_KINDS[field];
    if (!kinds || kinds.some((k) => allowedKinds.has(k))) return "";
    return ` (only for ${kinds.map((k) => KIND_LABELS[k]).join(" & ")})`;
  };
  return (
    <div
      className={`magic-rule${meta.ops.length > 1 ? "" : " magic-rule-noop"}`}
    >
      <button
        type="button"
        className={`magic-not${rule.not ? " magic-not-on" : ""}`}
        onClick={() => actions.setRule(path, { not: !rule.not })}
        disabled={scope === "global" && GLOBAL_SEED_FIELDS.has(rule.field)}
        title={
          scope === "global" && GLOBAL_SEED_FIELDS.has(rule.field)
            ? "Director, actor and author rules anchor a global search and can't be negated"
            : rule.not
              ? "Rule is negated"
              : "Negate rule"
        }
      >
        NOT
      </button>
      <select
        value={rule.field}
        onChange={(e) => actions.changeField(path, e.target.value)}
      >
        {MAGIC_FIELDS.map((f) => {
          const globalBlocked =
            scope === "global" && !GLOBAL_FIELDS.has(f.value);
          const suffix = globalBlocked
            ? " (library only)"
            : kindSuffix(f.value);
          return (
            <option
              key={f.value}
              value={f.value}
              disabled={globalBlocked || suffix !== ""}
            >
              {f.label}
              {suffix}
            </option>
          );
        })}
      </select>
      {meta.ops.length > 1 && (
        <select
          className="magic-op"
          value={rule.op}
          onChange={(e) => actions.setRule(path, { op: e.target.value })}
        >
          {meta.ops.map((op) => (
            <option key={op} value={op}>
              {MAGIC_OPS[op]}
            </option>
          ))}
        </select>
      )}
      {meta.kind === "person" ? (
        <button
          type="button"
          className={`magic-value magic-person-select${rule.value ? "" : " magic-person-select-empty"}`}
          onClick={() => actions.setPersonPickPath(path)}
          title={rule.value ? "Change person" : "Select a person"}
        >
          {rule.value ? (
            <>
              <img
                className="magic-person-thumb"
                src={rule.person_image || "/images/placeholderimage.jpg"}
                alt=""
                loading="lazy"
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.src = "/images/placeholderimage.jpg";
                }}
              />
              <span className="magic-person-name">{rule.value}</span>
            </>
          ) : (
            "Select person..."
          )}
        </button>
      ) : meta.kind === "author" ? (
        <SuggestPicker
          rule={rule}
          onPick={(patch) => actions.setRule(path, patch)}
          fetchOptions={fetchAuthorOptions}
          placeholder="Search an author..."
        />
      ) : meta.kind === "select" ? (
        <select
          className="magic-value"
          value={rule.value}
          onChange={(e) => actions.setRule(path, { value: e.target.value })}
        >
          {meta.options.map((o) => {
            const blocked =
              rule.field === "type" && !rule.not && !allowedKinds.has(o.value);
            return (
              <option key={o.value} value={o.value} disabled={blocked}>
                {o.label}
                {blocked ? " (conflicts with other rules)" : ""}
              </option>
            );
          })}
        </select>
      ) : (
        <input
          className="magic-value"
          type={meta.kind === "number" ? "number" : "text"}
          step={meta.step}
          min={meta.min}
          max={meta.max}
          placeholder={
            meta.kind === "number" ? "0" : "e.g. Sci-Fi, Science Fiction"
          }
          title={
            meta.kind === "text"
              ? "Separate alternatives with commas to match any of them"
              : undefined
          }
          value={rule.value}
          onChange={(e) => actions.setRule(path, { value: e.target.value })}
        />
      )}
      <button
        type="button"
        className="magic-rule-remove"
        onClick={() => actions.remove(path)}
        aria-label="Remove rule"
      >
        {String.fromCharCode(0x2715)}
      </button>
    </div>
  );
}

// A group and everything under it. Nesting these is what makes
// "A AND (B OR C)" possible: each box carries its own ALL/ANY choice, and the
// indentation shows what it applies to.
function GroupEditor({ node, path, root, scope, depth, actions }) {
  const any = node.combinator === "or";
  return (
    <div className={`magic-group${depth ? " magic-group-nested" : ""}`}>
      <div className="magic-group-head">
        <button
          type="button"
          className={`magic-join${any ? " magic-join-or" : ""}`}
          onClick={() =>
            actions.setCombinator(path, any ? "and" : "or")
          }
          title="Whether everything in this group has to match, or just one of them"
        >
          {any ? "MATCH ANY" : "MATCH ALL"}
        </button>
        <span className="magic-group-hint">of the following</span>
        {depth > 0 && (
          <button
            type="button"
            className="magic-rule-remove magic-group-remove"
            onClick={() => actions.remove(path)}
            aria-label="Remove group"
          >
            {String.fromCharCode(0x2715)}
          </button>
        )}
      </div>
      {node.children.map((child, i) =>
        isGroup(child) ? (
          <GroupEditor
            key={i}
            node={child}
            path={[...path, i]}
            root={root}
            scope={scope}
            depth={depth + 1}
            actions={actions}
          />
        ) : (
          <RuleRow
            key={i}
            rule={child}
            path={[...path, i]}
            root={root}
            scope={scope}
            actions={actions}
          />
        ),
      )}
      <div className="magic-group-actions">
        <button
          type="button"
          className="magic-add-rule"
          onClick={() => actions.addRule(path)}
        >
          + Add rule
        </button>
        <button
          type="button"
          className="magic-add-rule magic-add-group"
          onClick={() => actions.addGroup(path)}
        >
          + Add group
        </button>
      </div>
    </div>
  );
}

export default function MagicListModal({
  mode = "create",
  initialMagic = null,
  initialTitle = "",
  initialDescription = "",
  saving = false,
  onClose,
  onSubmit, // create: ({ title, description, magic, snapshots }) / edit: ({ magic, snapshots })
}) {
  const { universe, ready } = useMagicLibrary();
  const { coverForTmdb, coverForHardcover } = useCovers();

  const [title, setTitle] = useState(initialTitle);
  const [description, setDescription] = useState(initialDescription);
  const [scope, setScope] = useState(initialMagic?.scope || "library");
  // Path (child indices from the root) of the rule whose director/actor is
  // being picked in the modal.
  const [personPickPath, setPersonPickPath] = useState(null);
  const [root, setRoot] = useState(() =>
    initialMagic ? fixLegacyOps(magicTree(initialMagic)) : newRoot(),
  );

  const patchAt = (path, fn) => setRoot((prev) => updateAt(prev, path, fn));

  const setRule = (path, patch) =>
    patchAt(path, (rule) => ({ ...rule, ...patch }));

  const changeField = (path, field) => {
    const meta = fieldMeta(field);
    setRule(path, {
      field,
      op: meta.ops[0],
      value: meta.kind === "select" ? meta.options[0].value : "",
      person_id: null,
    });
  };

  // Everything the group editor can do to the tree, handed down as one object
  // so the recursion doesn't need a dozen props.
  const actions = {
    setRule,
    changeField,
    setCombinator: (path, combinator) =>
      patchAt(path, (group) => ({ ...group, combinator })),
    addRule: (path) =>
      patchAt(path, (group) => ({
        ...group,
        children: [...group.children, newMagicRule()],
      })),
    addGroup: (path) =>
      patchAt(path, (group) => ({
        ...group,
        children: [
          ...group.children,
          newMagicGroup(group.combinator === "and" ? "or" : "and"),
        ],
      })),
    remove: (path) => setRoot((prev) => removeAt(prev, path)),
    personPickPath,
    setPersonPickPath,
  };

  // Rules missing a value can't match anything, and a group left empty by that
  // pruning would drag a whole AND section down with it — leave both out of
  // the preview and out of what gets saved.
  const prunedRoot = useMemo(() => pruneTree(root) || newRoot(0), [root]);
  const validRules = useMemo(
    () => magicRules({ root: prunedRoot }),
    [prunedRoot],
  );

  const magic = useMemo(
    () => ({ scope, root: prunedRoot }),
    [scope, prunedRoot],
  );

  // Impossible AND sections (e.g. "type is book AND director contains X")
  // and global-scope restrictions both block the preview and submit.
  const logicError = validRules.length ? validateRuleLogic(magic) : null;
  const globalError =
    scope === "global" && validRules.length && !logicError
      ? validateGlobalRules(magic)
      : null;
  const rulesError = logicError || globalError;

  const libraryPreview = useMemo(() => {
    if (scope !== "library" || !ready || !validRules.length || logicError)
      return { snapshots: [], matchedCount: 0, truncated: false };
    return computeMagicSnapshots(universe, magic);
  }, [scope, universe, ready, magic, validRules.length, logicError]);

  // Global previews hit TMDB/Hardcover, so they're debounced and show their
  // own loading state.
  const [globalPreview, setGlobalPreview] = useState({
    snapshots: [],
    matchedCount: 0,
    truncated: false,
  });
  const [globalLoading, setGlobalLoading] = useState(false);
  const [globalFetchError, setGlobalFetchError] = useState(false);

  useEffect(() => {
    if (scope !== "global") return;
    if (!validRules.length || rulesError) {
      setGlobalPreview({ snapshots: [], matchedCount: 0, truncated: false });
      setGlobalLoading(false);
      return;
    }
    let cancelled = false;
    setGlobalLoading(true);
    setGlobalFetchError(false);
    const t = setTimeout(async () => {
      try {
        const res = await computeGlobalSnapshots(magic);
        if (!cancelled) setGlobalPreview(res);
      } catch (err) {
        console.error("Global preview failed:", err);
        if (!cancelled) {
          setGlobalPreview({ snapshots: [], matchedCount: 0, truncated: false });
          setGlobalFetchError(true);
        }
      } finally {
        if (!cancelled) setGlobalLoading(false);
      }
    }, 700);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [scope, magic, validRules.length, rulesError]);

  const preview = scope === "global" ? globalPreview : libraryPreview;

  const previewCover = (s) =>
    s.media_type === "book"
      ? coverForHardcover(s.item_data.hardcover_id) || s.item_data.cover_image
      : coverForTmdb(s.item_data.media_type, s.item_data.tmdb_id) ||
        s.item_data.primaryImage;

  const canSubmit =
    !saving &&
    validRules.length > 0 &&
    (mode === "edit" || title.trim().length > 0) &&
    !rulesError &&
    (scope === "library" || !globalLoading);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!canSubmit) return;
    if (mode === "create") {
      onSubmit({
        title: title.trim(),
        description: description.trim(),
        magic,
        snapshots: preview.snapshots,
      });
    } else {
      onSubmit({ magic, snapshots: preview.snapshots });
    }
  };

  return createPortal(
    <div className="lists-modal-overlay" onClick={onClose}>
      <div
        className="lists-modal magic-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="lists-modal-head">
          <h3>{mode === "create" ? "✨ New magic list" : "✨ Edit magic rules"}</h3>
          <button
            className="lists-modal-close"
            onClick={onClose}
            aria-label="Close"
          >
            {String.fromCharCode(0x2715)}
          </button>
        </div>

        <form className="lists-create-form magic-form" onSubmit={handleSubmit}>
          {mode === "create" && (
            <>
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
                rows={2}
              />
            </>
          )}

          <div className="magic-scope">
            <button
              type="button"
              className={`magic-scope-btn${scope === "library" ? " magic-scope-btn-active" : ""}`}
              onClick={() => setScope("library")}
            >
              My library
            </button>
            <button
              type="button"
              className={`magic-scope-btn${scope === "global" ? " magic-scope-btn-active" : ""}`}
              onClick={() => setScope("global")}
            >
              Global
            </button>
            <span className="magic-scope-hint">
              {scope === "library"
                ? "Matches only titles you've logged, rated or watchlisted."
                : "Searches all of TMDB and Hardcover, anchored by people/authors."}
            </span>
          </div>

          <div className="magic-rules">
            <GroupEditor
              node={root}
              path={[]}
              root={root}
              scope={scope}
              depth={0}
              actions={actions}
            />
          </div>

          <div className="magic-preview">
            {rulesError ? (
              <span className="magic-preview-note magic-preview-error">
                {rulesError}
              </span>
            ) : scope === "library" && !ready ? (
              <span className="magic-preview-note">
                <Spinner /> Loading your library...
              </span>
            ) : !validRules.length ? (
              <span className="magic-preview-note">
                {scope === "global"
                  ? "Add a director, actor or author rule to search."
                  : "Add a rule to see matches from your library."}
              </span>
            ) : scope === "global" && globalLoading ? (
              <span className="magic-preview-note">
                <Spinner /> Searching TMDB & Hardcover... this can take a few
                seconds.
              </span>
            ) : globalFetchError ? (
              <span className="magic-preview-note magic-preview-error">
                Search failed. Check the names in your rules and try again.
              </span>
            ) : (
              <>
                <span className="magic-preview-count">
                  {preview.matchedCount}{" "}
                  {preview.matchedCount === 1 ? "match" : "matches"}
                  {scope === "library" ? " in your library" : ""}
                  {preview.truncated ? " (showing the first 500)" : ""}
                </span>
                <div className="magic-preview-covers">
                  {preview.snapshots.slice(0, 8).map((s, i) => (
                    <img
                      key={i}
                      src={previewCover(s) || "/images/placeholderimage.jpg"}
                      alt=""
                      loading="lazy"
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = "/images/placeholderimage.jpg";
                      }}
                    />
                  ))}
                </div>
              </>
            )}
          </div>

          {personPickPath && (
            <PersonPickModal
              title={
                fieldMeta(nodeAt(root, personPickPath)?.field).value === "actor"
                  ? "Pick a cast member"
                  : "Pick a director / creator"
              }
              onPick={(patch) => {
                setRule(personPickPath, patch);
                setPersonPickPath(null);
              }}
              onClose={() => setPersonPickPath(null)}
            />
          )}

          <p className="magic-hint">
            {scope === "library"
              ? "Library lists only match titles already in your log, ratings, watchlist or TBR. Switch to Global to pull from everything on TMDB and Hardcover."
              : "Global lists look up each director/actor's full filmography and each author's books, then your other rules narrow those results. Ratings and log-based rules aren't available here."}
          </p>

          <button type="submit" disabled={!canSubmit}>
            {saving ? (
              <Spinner />
            ) : mode === "create" ? (
              "Create magic list"
            ) : (
              "Save rules"
            )}
          </button>
        </form>
      </div>
    </div>,
    document.body,
  );
}
