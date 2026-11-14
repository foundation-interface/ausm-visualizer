import React, { useEffect, useRef } from "react";
import { TRACK_LABEL_WIDTH } from "../layout";

function Playhead({ xScale, currentTime, totalHeight, containerRef, live = true }) {
  const playheadRef = useRef(null);

  useEffect(() => {
    if (
      !playheadRef.current ||
      currentTime === undefined ||
      currentTime === null
    ) {
      return;
    }

    const xPosition = xScale(currentTime);
    const paddingLeft = TRACK_LABEL_WIDTH;
    // xScale returns position relative to content area, so add padding
    playheadRef.current.style.left = `${xPosition + paddingLeft}px`;

    // Scroll to keep playhead in view only if it's outside visible area
    if (containerRef?.current && xPosition > 0) {
      const container = containerRef.current;
      const playheadX = xPosition + paddingLeft;
      const visibleLeft = container.scrollLeft;
      const visibleRight = container.scrollLeft + container.clientWidth;
      const margin_buffer = 50; // Buffer zone before scrolling

      // Only scroll if playhead is outside visible area (with buffer)
      if (
        playheadX < visibleLeft + margin_buffer ||
        playheadX > visibleRight - margin_buffer
      ) {
        const scrollLeft = playheadX - container.clientWidth / 2;
        container.scrollTo({
          left: Math.max(0, scrollLeft),
          behavior: "instant",
        });
      }
    }
  }, [currentTime, xScale, containerRef]);

  return (
    <div
      ref={playheadRef}
      className={`tl-playhead${live ? " is-live" : ""}`}
      style={{
        left: `${TRACK_LABEL_WIDTH}px`, // updated by the effect above
        height: `${totalHeight}px`,
      }}
    />
  );
}

export default React.memo(Playhead);
