import React, { useRef } from "react";

/**
 * Overflow viewport that can be dragged to pan (in addition to scroll
 * wheels / trackpads). Used by the live screen and camera previews so
 * those views can stay compact while the timeline tracks remain visible.
 */
function PannableViewport({ className, children }) {
  const ref = useRef(null);
  const dragRef = useRef(null);

  const onPointerDown = (event) => {
    if (event.button !== 0) return;
    const el = ref.current;
    if (!el) return;
    if (event.target.closest("button, a, input, textarea, select")) return;

    dragRef.current = {
      pointerId: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      scrollLeft: el.scrollLeft,
      scrollTop: el.scrollTop,
    };
    el.setPointerCapture(event.pointerId);
    el.classList.add("is-panning");
  };

  const onPointerMove = (event) => {
    const drag = dragRef.current;
    const el = ref.current;
    if (!drag || drag.pointerId !== event.pointerId || !el) return;
    el.scrollLeft = drag.scrollLeft - (event.clientX - drag.x);
    el.scrollTop = drag.scrollTop - (event.clientY - drag.y);
  };

  const endPan = (event) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    dragRef.current = null;
    ref.current?.classList.remove("is-panning");
  };

  return (
    <div
      ref={ref}
      className={`pannable-viewport${className ? ` ${className}` : ""}`}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endPan}
      onPointerCancel={endPan}
    >
      {children}
    </div>
  );
}

export default PannableViewport;
