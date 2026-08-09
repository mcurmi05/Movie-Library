import { useCallback, useEffect, useRef, useState } from "react";

// Pointer-driven list reordering, mouse and touch alike.
//
// Rows are spread with `rowProps(id)` and keep their source order in the DOM
// for the whole drag; what moves is a transform on each row. The dragged row
// follows the pointer, the rows it passes slide out of its way, and only on
// release does the list actually re-render in the new order. Reordering the
// DOM mid-drag is what made the old version look like nothing was moving:
// every swap re-rendered the row under the cursor, so there was no continuous
// thing to watch.
//
// `order` is the live preview order, for rank numbers that should count along
// with the drag rather than with the DOM.
// How close to the edge the pointer has to get before the page starts moving,
// and the fastest it may move, per frame.
const SCROLL_ZONE = 90;
const SCROLL_MAX = 18;

// The element the list actually scrolls inside - an overflow container if one
// wraps it, otherwise the window.
function scrollParentOf(node) {
  const root = document.documentElement;
  for (let el = node?.parentElement; el && el !== root; el = el.parentElement) {
    // <html>/<body> are skipped on purpose: they carry overflow-y:auto here,
    // but their box is the whole document, so their "bottom edge" sits far
    // below the screen and the edge zone would never be reached.
    if (el === document.body) continue;
    const { overflowY } = getComputedStyle(el);
    if (
      (overflowY === "auto" || overflowY === "scroll") &&
      el.scrollHeight > el.clientHeight
    ) {
      return el;
    }
  }
  return window;
}

const scrollTopOf = (s) => (s === window ? window.scrollY : s.scrollTop);

const scrollBoundsOf = (s) =>
  s === window
    ? { top: 0, bottom: window.innerHeight, max: document.documentElement.scrollHeight - window.innerHeight }
    : (() => {
        const r = s.getBoundingClientRect();
        return { top: r.top, bottom: r.bottom, max: s.scrollHeight - s.clientHeight };
      })();

export function useDragOrder(ids, onCommit) {
  const containerRef = useRef(null);
  const [draggingId, setDraggingId] = useState(null);
  const [order, setOrder] = useState(ids);
  // Pixel shift applied to each row for the current pointer position.
  const [offsets, setOffsets] = useState(null);
  // Row geometry measured once at drag start, so a moving row never feeds its
  // own transform back into the maths.
  const dragRef = useRef(null);
  const orderRef = useRef(ids);

  orderRef.current = order;

  // Follow the source list whenever a drag isn't in flight. Compared by value,
  // not by reference: callers rebuild `ids` as the page re-renders, and
  // adopting every new array would set state on each render forever.
  useEffect(() => {
    if (draggingId != null) return;
    setOrder((prev) =>
      prev.length === ids.length && prev.every((v, i) => v === ids[i])
        ? prev
        : ids,
    );
  }, [ids, draggingId]);

  // Rect per row, in DOM order, plus the gap between them.
  const measure = () => {
    const el = containerRef.current;
    if (!el) return null;
    const rows = Array.from(el.querySelectorAll("[data-drag-id]")).map((n) => {
      const r = n.getBoundingClientRect();
      return { id: n.getAttribute("data-drag-id"), top: r.top, height: r.height };
    });
    if (rows.length < 2) return null;
    const gap = Math.max(rows[1].top - (rows[0].top + rows[0].height), 0);
    return { rows, gap };
  };

  const applyPointer = useCallback((clientY) => {
    const drag = dragRef.current;
    if (!drag) return;
    const { rows, gap, index, startY, startScroll, scroller } = drag;
    drag.clientY = clientY;
    // Grabbing a row that already sits in the edge zone must not scroll the
    // page out from under the pointer; edge scrolling arms once you move.
    if (Math.abs(clientY - startY) > 3) drag.moved = true;
    const row = rows[index];
    const step = row.height + gap;

    // Rows were measured in viewport coordinates at drag start, so anything
    // the page has scrolled since has to be added back in - otherwise the row
    // lags behind the pointer as soon as auto-scrolling kicks in.
    const scrolled = scrollTopOf(scroller) - startScroll;

    // Clamp so the row can't be dragged past either end of the list.
    const first = rows[0].top;
    const last = rows[rows.length - 1].top + rows[rows.length - 1].height;
    const dy = Math.min(
      Math.max(clientY - startY + scrolled, first - row.top),
      last - (row.top + row.height),
    );
    const centre = row.top + row.height / 2 + dy;

    // Where the row would land: the last position whose midpoint it has passed.
    let to = index;
    for (let i = 0; i < rows.length; i++) {
      if (i === index) continue;
      const mid = rows[i].top + rows[i].height / 2;
      // Inclusive: dragging fully to either end lands the row's centre exactly
      // on the end row's midpoint, and a strict compare would refuse the swap,
      // making the first and last positions unreachable.
      if (i < index && centre <= mid) {
        to = Math.min(to, i);
      } else if (i > index && centre >= mid) {
        to = Math.max(to, i);
      }
    }

    const next = {};
    rows.forEach((r, i) => {
      if (i === index) next[r.id] = dy;
      else if (to > index && i > index && i <= to) next[r.id] = -step;
      else if (to < index && i < index && i >= to) next[r.id] = step;
      else next[r.id] = 0;
    });
    setOffsets(next);

    if (to !== drag.to) {
      drag.to = to;
      const ordered = rows.map((r) => r.id);
      const [moved] = ordered.splice(index, 1);
      ordered.splice(to, 0, moved);
      setOrder(ordered);
    }
  }, []);

  const endDrag = useCallback(() => {
    const drag = dragRef.current;
    dragRef.current = null;
    setDraggingId(null);
    setOffsets(null);
    if (!drag) return;
    const started = drag.rows.map((r) => r.id);
    const current = orderRef.current;
    const changed =
      started.length !== current.length ||
      started.some((v, i) => v !== current[i]);
    if (changed) onCommit(current);
  }, [onCommit]);

  useEffect(() => {
    if (draggingId == null) return;
    const move = (e) => {
      e.preventDefault();
      applyPointer(e.clientY);
    };
    window.addEventListener("pointermove", move, { passive: false });
    window.addEventListener("pointerup", endDrag);
    window.addEventListener("pointercancel", endDrag);

    // Hold the pointer near the top or bottom edge and the list keeps
    // scrolling, so a row can be moved further than one screenful. The touch
    // gesture is suppressed below, so this is the only way to scroll mid-drag.
    let frame = requestAnimationFrame(function step() {
      frame = requestAnimationFrame(step);
      const drag = dragRef.current;
      if (!drag?.moved) return;
      const { scroller, clientY } = drag;
      const { top, bottom, max } = scrollBoundsOf(scroller);
      const above = clientY - (top + SCROLL_ZONE);
      const below = clientY - (bottom - SCROLL_ZONE);
      const speed =
        above < 0
          ? Math.max(above / SCROLL_ZONE, -1) * SCROLL_MAX
          : below > 0
            ? Math.min(below / SCROLL_ZONE, 1) * SCROLL_MAX
            : 0;
      if (!speed) return;
      const at = scrollTopOf(scroller);
      const next = Math.min(Math.max(at + speed, 0), max);
      if (next === at) return;
      scroller === window
        ? window.scrollTo(0, next)
        : (scroller.scrollTop = next);
      applyPointer(clientY);
    });

    // Stop the page scrolling under a touch drag.
    const prevTouchAction = document.body.style.touchAction;
    const prevSelect = document.body.style.userSelect;
    document.body.style.touchAction = "none";
    document.body.style.userSelect = "none";
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", endDrag);
      window.removeEventListener("pointercancel", endDrag);
      document.body.style.touchAction = prevTouchAction;
      document.body.style.userSelect = prevSelect;
    };
  }, [draggingId, applyPointer, endDrag]);

  // Spread onto a drag handle inside the row with the matching id.
  const handleProps = useCallback(
    (id) => ({
      // Touch drags only produce pointermove if the handle opts out of the
      // browser's own scroll gesture.
      style: { touchAction: "none" },
      onPointerDown: (e) => {
        if (e.button != null && e.button !== 0) return;
        const measured = measure();
        const index = measured
          ? measured.rows.findIndex((r) => r.id === String(id))
          : -1;
        if (index === -1) return;
        e.preventDefault();
        e.currentTarget.setPointerCapture?.(e.pointerId);
        const scroller = scrollParentOf(containerRef.current);
        dragRef.current = {
          ...measured,
          index,
          to: index,
          startY: e.clientY,
          clientY: e.clientY,
          scroller,
          startScroll: scrollTopOf(scroller),
        };
        setOffsets(
          Object.fromEntries(measured.rows.map((r) => [r.id, 0])),
        );
        setDraggingId(id);
      },
    }),
    [],
  );

  // Spread onto each row. Rows stay in source order; the transform is what
  // moves them.
  const rowProps = useCallback(
    (id) => {
      const dragging = draggingId === id;
      const shift = offsets?.[String(id)] || 0;
      return {
        "data-drag-id": id,
        style: {
          transform: shift ? `translateY(${shift}px)` : undefined,
          // The dragged row must track the pointer exactly; the rest ease.
          transition: dragging
            ? "none"
            : offsets
              ? "transform 180ms cubic-bezier(0.2, 0, 0, 1)"
              : undefined,
          position: dragging ? "relative" : undefined,
          zIndex: dragging ? 20 : undefined,
        },
      };
    },
    [draggingId, offsets],
  );

  return { containerRef, order, draggingId, handleProps, rowProps };
}

// The same idea in two dimensions, for a grid of posters.
//
// Tiles keep their DOM order for the whole drag; each one is transformed from
// the slot it started in to the slot the preview order gives it, so everything
// slides around the poster being dragged instead of snapping on release.
export function useGridDragOrder(ids, onCommit) {
  const containerRef = useRef(null);
  const [draggingId, setDraggingId] = useState(null);
  const [order, setOrder] = useState(ids);
  const [offsets, setOffsets] = useState(null);
  const dragRef = useRef(null);
  const orderRef = useRef(ids);

  orderRef.current = order;

  useEffect(() => {
    if (draggingId != null) return;
    setOrder((prev) =>
      prev.length === ids.length && prev.every((v, i) => v === ids[i])
        ? prev
        : ids,
    );
  }, [ids, draggingId]);

  // Slot geometry, in DOM order, measured once at drag start.
  const measure = () => {
    const el = containerRef.current;
    if (!el) return null;
    const tiles = Array.from(el.querySelectorAll("[data-drag-id]")).map((n) => {
      const r = n.getBoundingClientRect();
      return {
        id: n.getAttribute("data-drag-id"),
        left: r.left,
        top: r.top,
        width: r.width,
        height: r.height,
      };
    });
    return tiles.length >= 2 ? tiles : null;
  };

  const applyPointer = useCallback((clientX, clientY) => {
    const drag = dragRef.current;
    if (!drag) return;
    const { tiles, slotOf, index, startX, startY, startScroll, scroller } = drag;
    drag.clientX = clientX;
    drag.clientY = clientY;
    if (Math.abs(clientX - startX) > 3 || Math.abs(clientY - startY) > 3) {
      drag.moved = true;
    }

    // Slots were measured in viewport coordinates, so page scrolling since the
    // drag started has to be added back in.
    const dx = clientX - startX;
    const dy = clientY - startY + scrollTopOf(scroller) - startScroll;
    const source = tiles[index];
    const cx = source.left + source.width / 2 + dx;
    const cy = source.top + source.height / 2 + dy;

    // The slot whose centre the poster is closest to.
    let to = index;
    let best = Infinity;
    tiles.forEach((tile, i) => {
      const ox = tile.left + tile.width / 2 - cx;
      const oy = tile.top + tile.height / 2 - cy;
      const distance = ox * ox + oy * oy;
      if (distance < best) {
        best = distance;
        to = i;
      }
    });

    const ordered = tiles.map((t) => t.id);
    const [moved] = ordered.splice(index, 1);
    ordered.splice(to, 0, moved);

    const next = {};
    ordered.forEach((id, position) => {
      const from = slotOf.get(id);
      if (from === index) return;
      next[id] = {
        x: tiles[position].left - tiles[from].left,
        y: tiles[position].top - tiles[from].top,
      };
    });
    next[source.id] = { x: dx, y: dy };
    setOffsets(next);

    if (to !== drag.to) {
      drag.to = to;
      setOrder(ordered);
    }
  }, []);

  const endDrag = useCallback(() => {
    const drag = dragRef.current;
    dragRef.current = null;
    setDraggingId(null);
    setOffsets(null);
    if (!drag) return;
    const started = drag.tiles.map((t) => t.id);
    const current = orderRef.current;
    const changed =
      started.length !== current.length ||
      started.some((v, i) => v !== current[i]);
    if (changed) onCommit(current);
  }, [onCommit]);

  useEffect(() => {
    if (draggingId == null) return;
    const move = (e) => {
      e.preventDefault();
      applyPointer(e.clientX, e.clientY);
    };
    window.addEventListener("pointermove", move, { passive: false });
    window.addEventListener("pointerup", endDrag);
    window.addEventListener("pointercancel", endDrag);

    let frame = requestAnimationFrame(function step() {
      frame = requestAnimationFrame(step);
      const drag = dragRef.current;
      if (!drag?.moved) return;
      const { scroller, clientX, clientY } = drag;
      const { top, bottom, max } = scrollBoundsOf(scroller);
      const above = clientY - (top + SCROLL_ZONE);
      const below = clientY - (bottom - SCROLL_ZONE);
      const speed =
        above < 0
          ? Math.max(above / SCROLL_ZONE, -1) * SCROLL_MAX
          : below > 0
            ? Math.min(below / SCROLL_ZONE, 1) * SCROLL_MAX
            : 0;
      if (!speed) return;
      const at = scrollTopOf(scroller);
      const next = Math.min(Math.max(at + speed, 0), max);
      if (next === at) return;
      scroller === window
        ? window.scrollTo(0, next)
        : (scroller.scrollTop = next);
      applyPointer(clientX, clientY);
    });

    const prevTouchAction = document.body.style.touchAction;
    const prevSelect = document.body.style.userSelect;
    document.body.style.touchAction = "none";
    document.body.style.userSelect = "none";
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", endDrag);
      window.removeEventListener("pointercancel", endDrag);
      document.body.style.touchAction = prevTouchAction;
      document.body.style.userSelect = prevSelect;
    };
  }, [draggingId, applyPointer, endDrag]);

  // The whole tile is the handle here - there's nowhere to put a grip on a
  // poster this small.
  const handleProps = useCallback(
    (id) => ({
      style: { touchAction: "none" },
      onPointerDown: (e) => {
        if (e.button != null && e.button !== 0) return;
        const tiles = measure();
        const index = tiles ? tiles.findIndex((t) => t.id === String(id)) : -1;
        if (index === -1) return;
        e.preventDefault();
        e.currentTarget.setPointerCapture?.(e.pointerId);
        const scroller = scrollParentOf(containerRef.current);
        dragRef.current = {
          tiles,
          slotOf: new Map(tiles.map((t, i) => [t.id, i])),
          index,
          to: index,
          startX: e.clientX,
          startY: e.clientY,
          clientX: e.clientX,
          clientY: e.clientY,
          scroller,
          startScroll: scrollTopOf(scroller),
        };
        setOffsets(Object.fromEntries(tiles.map((t) => [t.id, { x: 0, y: 0 }])));
        setDraggingId(id);
      },
    }),
    [],
  );

  const tileProps = useCallback(
    (id) => {
      const dragging = draggingId === id;
      const shift = offsets?.[String(id)];
      return {
        "data-drag-id": id,
        style: {
          transform: shift
            ? `translate(${shift.x}px, ${shift.y}px)`
            : undefined,
          transition: dragging
            ? "none"
            : offsets
              ? "transform 180ms cubic-bezier(0.2, 0, 0, 1)"
              : undefined,
          position: dragging ? "relative" : undefined,
          zIndex: dragging ? 20 : undefined,
        },
      };
    },
    [draggingId, offsets],
  );

  return { containerRef, order, draggingId, handleProps, tileProps };
}

export default useDragOrder;
