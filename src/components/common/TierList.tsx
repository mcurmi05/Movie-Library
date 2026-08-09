import { useState } from "react";
import "../../styles/common/TierList.css";

// A tier list whose tiers are rating values: one row per value, posters live in
// the row matching their rating. Dragging a poster to another row re-rates it,
// dragging it inside a row re-ranks it.
//
// Desktop uses native HTML5 drag. Touch has no equivalent, so tapping a poster
// picks it up and the next tap on a row (or on another poster) drops it there.
//
// rows: [{ value, label, items: [{ id, title, image, rating }] }]
// onMove(itemId, rowValue, index) - index is the slot in the target row after
// the item has been taken out of wherever it was.
function TierList({ rows, onMove }) {
  const [dragId, setDragId] = useState(null);
  const [pickedId, setPickedId] = useState(null);
  const [overRow, setOverRow] = useState(null);

  const activeId = dragId ?? pickedId;

  const rowOf = (id) => rows.find((row) => row.items.some((i) => i.id === id));

  // Where in the row a drop at these coordinates lands: before the first tile
  // whose horizontal midpoint is past the pointer, on the pointer's own line.
  const dropIndexAt = (container, clientX, clientY) => {
    const tiles = Array.from(container.querySelectorAll("[data-tier-id]"));
    for (let i = 0; i < tiles.length; i += 1) {
      const box = tiles[i].getBoundingClientRect();
      if (clientY < box.bottom && clientX < box.left + box.width / 2) return i;
    }
    return tiles.length;
  };

  const commit = (id, row, index) => {
    const from = rowOf(id);
    let target = index;
    if (from && from.value === row.value) {
      const current = from.items.findIndex((i) => i.id === id);
      if (current === target || current + 1 === target) return;
      if (current < target) target -= 1;
    }
    onMove(id, row.value, target);
  };

  const finishDrop = (event, row) => {
    const id = activeId;
    setDragId(null);
    setPickedId(null);
    setOverRow(null);
    if (!id) return;
    commit(id, row, dropIndexAt(event.currentTarget, event.clientX, event.clientY));
  };

  return (
    <div className="tl-board">
      {rows.map((row) => (
        <div
          key={row.value}
          className={`tl-row${overRow === row.value ? " tl-row-over" : ""}`}
          onDragOver={(e) => {
            if (!activeId) return;
            e.preventDefault();
            setOverRow(row.value);
          }}
          onDragLeave={() => setOverRow((v) => (v === row.value ? null : v))}
          onDrop={(e) => {
            e.preventDefault();
            finishDrop(e, row);
          }}
          onClick={(e) => {
            if (!pickedId) return;
            finishDrop(e, row);
          }}
        >
          <div className="tl-label">
            <span className="tl-label-value">{row.label}</span>
            <span className="tl-label-count">{row.items.length}</span>
          </div>
          <div className="tl-items">
            {row.items.map((item) => (
              <div
                key={item.id}
                data-tier-id={item.id}
                className={`tl-tile${activeId === item.id ? " tl-tile-active" : ""}`}
                title={item.title}
                draggable
                onDragStart={() => {
                  setPickedId(null);
                  setDragId(item.id);
                }}
                onDragEnd={() => {
                  setDragId(null);
                  setOverRow(null);
                }}
                onClick={(e) => {
                  // With something already picked up the row handles the drop,
                  // so only a bare tap picks a poster up.
                  if (pickedId && pickedId !== item.id) return;
                  e.stopPropagation();
                  setPickedId((v) => (v === item.id ? null : item.id));
                }}
              >
                <img
                  src={item.image || "/images/placeholderimage.jpg"}
                  alt={item.title || ""}
                  loading="lazy"
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = "/images/placeholderimage.jpg";
                  }}
                />
              </div>
            ))}
            {!row.items.length && <span className="tl-empty">Drop here</span>}
          </div>
        </div>
      ))}
      {pickedId && (
        <div className="tl-hint">
          Poster picked up. Tap a tier to drop it there.
          <button type="button" onClick={() => setPickedId(null)}>
            Cancel
          </button>
        </div>
      )}
    </div>
  );
}

export default TierList;
