import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useGridDragOrder } from "../../hooks/useDragOrder";
import { wallPosterSrc } from "../../utils/posterSrc";
import "../../styles/common/PosterWall.css";

const EMPTY_IDS = [];

// One poster. Split out and memoised because a wall can be thousands of tiles
// and most renders only change one of them.
const PosterTile = memo(function PosterTile({
  item,
  rank,
  isOpen,
  isDragging,
  onSelect,
  dragProps,
}) {
  const { src, srcSet } = wallPosterSrc(item.image);
  const { style, ...rest } = dragProps || {};
  return (
    <button
      type="button"
      data-pw-id={item.id}
      className={`pw-tile${isOpen ? " pw-tile-open" : ""}${
        isDragging ? " pw-tile-dragging" : ""
      }`}
      title={item.title}
      style={style}
      {...rest}
      onClick={() => onSelect(item)}
    >
      <span className="pw-poster">
        <img
          src={src || "/images/placeholderimage.jpg"}
          srcSet={srcSet}
          sizes="(max-width: 700px) 72px, 100px"
          alt={item.title || ""}
          loading="lazy"
          decoding="async"
          draggable={false}
          onError={(e) => {
            e.target.onerror = null;
            e.target.srcset = "";
            e.target.src = "/images/placeholderimage.jpg";
          }}
        />
        {rank != null && <span className="pw-rank">{rank}</span>}
      </span>
      {item.rating != null && (
        <span className="pw-caption">
          <img className="pw-star" src="/images/user-rating-star2.png" alt="" />
          {item.rating}
        </span>
      )}
    </button>
  );
});

// A wall of small posters - the whole page at a glance.
//
// Items are plain data: { id, title, image, rating?, onClick? }. Pass
// renderExpanded to make a click open a full-width panel underneath the
// clicked poster's row instead of firing onClick. Which row that is depends on
// how many columns the grid actually resolved to, so the track count is
// measured off the live grid.
//
// Pass onReorder to make the posters draggable: it gets the item ids in their
// new order once a poster is dropped.
function PosterWall({ items, renderExpanded = null, onReorder = null }) {
  const gridRef = useRef(null);
  const [cols, setCols] = useState(1);
  const [openId, setOpenId] = useState(null);

  const dragIds = useMemo(
    () => (onReorder ? items.map((item) => item.id) : EMPTY_IDS),
    [items, onReorder],
  );
  const commit = useCallback(
    (ordered) => onReorder?.(ordered),
    [onReorder],
  );
  const drag = useGridDragOrder(dragIds, commit);

  useEffect(() => {
    const el = gridRef.current;
    if (!el) return;
    const measure = () => {
      const tracks = getComputedStyle(el)
        .gridTemplateColumns.split(" ")
        .filter(Boolean).length;
      setCols(tracks || 1);
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Rank numbers count along with the drag, so the number under the pointer is
  // the rank the poster will actually get.
  const previewRank = useMemo(() => {
    if (!onReorder) return null;
    return new Map(drag.order.map((id, i) => [id, i + 1]));
  }, [onReorder, drag.order]);

  // Paging, filtering or sorting can take the open item off the screen - then
  // the lookup misses and no panel renders, no cleanup needed.
  const openIndex =
    openId == null ? -1 : items.findIndex((item) => item.id === openId);
  const expandAfter =
    openIndex >= 0
      ? Math.min((Math.floor(openIndex / cols) + 1) * cols, items.length) - 1
      : -1;

  const handleSelect = (item) => {
    if (onReorder) return;
    if (renderExpanded) setOpenId((v) => (v === item.id ? null : item.id));
    else item.onClick?.();
  };

  // Both halves of the hook carry a style (touch-action on the handle, the
  // transform on the tile), so they're merged rather than spread over.
  const dragPropsFor = (id) => {
    if (!onReorder) return null;
    const handle = drag.handleProps(id);
    const tile = drag.tileProps(id);
    return {
      ...handle,
      ...tile,
      style: { ...handle.style, ...tile.style },
    };
  };

  const nodes = [];
  items.forEach((item, index) => {
    nodes.push(
      <PosterTile
        key={item.id}
        item={item}
        rank={
          previewRank && item.rank != null
            ? previewRank.get(item.id)
            : item.rank
        }
        isOpen={index === openIndex}
        isDragging={drag.draggingId === item.id}
        onSelect={handleSelect}
        dragProps={dragPropsFor(item.id)}
      />,
    );
    if (index === expandAfter) {
      nodes.push(
        <div className="pw-expand" key={`expand-${openId}`}>
          {renderExpanded(items[openIndex])}
        </div>,
      );
    }
  });

  return (
    <div
      className={`pw-grid${onReorder ? " pw-grid-reorder" : ""}`}
      ref={(node) => {
        gridRef.current = node;
        drag.containerRef.current = node;
      }}
    >
      {nodes}
    </div>
  );
}

export default memo(PosterWall);
