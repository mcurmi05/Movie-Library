import { useCallback, useEffect, useRef, useState } from "react";

// Pointer-driven list reordering, mouse and touch alike.
//
// Rows live inside `containerRef` and each carries a `data-drag-id`. Press a
// drag handle and the rows shuffle live as you move; releasing commits the new
// order via `onCommit`, which only fires when the order actually changed.
//
// The dragged row is not floated above the list: it swaps places with its
// neighbours as the pointer crosses their midpoints, which keeps the maths to
// a single rect read per move and needs no placeholder element.
export function useDragOrder(ids, onCommit) {
  const containerRef = useRef(null);
  const [draggingId, setDraggingId] = useState(null);
  const [order, setOrder] = useState(ids);
  // Order at the moment the drag started, to tell a real move from a stray click.
  const startOrderRef = useRef(null);
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

  const rowsInDom = () => {
    const el = containerRef.current;
    if (!el) return [];
    return Array.from(el.querySelectorAll("[data-drag-id]"));
  };

  const handlePointerMove = useCallback(
    (e) => {
      const id = draggingId;
      if (id == null) return;
      const y = e.clientY;
      const current = orderRef.current;
      const from = current.indexOf(id);
      if (from === -1) return;

      // Rows are rendered in `order`, so DOM position i is order position i.
      const rows = rowsInDom();
      if (rows.length !== current.length) return;
      let to = from;
      for (let i = 0; i < rows.length; i++) {
        if (i === from) continue;
        const rect = rows[i].getBoundingClientRect();
        const mid = rect.top + rect.height / 2;
        if (i < from && y < mid) {
          to = i;
          break;
        }
        if (i > from && y > mid) to = i;
      }
      if (to === from) return;

      const next = [...current];
      next.splice(from, 1);
      next.splice(to, 0, id);
      setOrder(next);
    },
    [draggingId],
  );

  const endDrag = useCallback(() => {
    const started = startOrderRef.current;
    const current = orderRef.current;
    setDraggingId(null);
    startOrderRef.current = null;
    if (!started) return;
    const changed =
      started.length !== current.length ||
      started.some((v, i) => v !== current[i]);
    if (changed) onCommit(current);
  }, [onCommit]);

  useEffect(() => {
    if (draggingId == null) return;
    const move = (e) => {
      e.preventDefault();
      handlePointerMove(e);
    };
    window.addEventListener("pointermove", move, { passive: false });
    window.addEventListener("pointerup", endDrag);
    window.addEventListener("pointercancel", endDrag);
    // Stop the page scrolling under a touch drag.
    const prevTouchAction = document.body.style.touchAction;
    document.body.style.touchAction = "none";
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", endDrag);
      window.removeEventListener("pointercancel", endDrag);
      document.body.style.touchAction = prevTouchAction;
    };
  }, [draggingId, handlePointerMove, endDrag]);

  // Spread onto a drag handle inside the row with the matching id.
  const handleProps = useCallback(
    (id) => ({
      onPointerDown: (e) => {
        if (e.button != null && e.button !== 0) return;
        e.preventDefault();
        startOrderRef.current = orderRef.current;
        setDraggingId(id);
      },
    }),
    [],
  );

  return { containerRef, order, draggingId, handleProps };
}

export default useDragOrder;
