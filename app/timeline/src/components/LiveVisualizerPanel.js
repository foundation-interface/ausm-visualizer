import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import LiveEventBlock from "./LiveEventBlock";
import VisualizerTimeline from "./VisualizerTimeline";
import Playhead from "./Playhead";
import TrackIcon from "./TrackIcon";
import { TRACK_LABEL_WIDTH } from "../layout";

const MIN_TRACK_HEIGHT = 28;
const MAX_TRACK_HEIGHT = 52;
const TIMELINE_HEIGHT = 26;

function LiveVisualizerPanel({
  trackDefinitions,
  tracks,
  duration,
  currentTime,
  onSeek,
  onUserSeek,
  zoomLevel = 100,
  onVisibleRangeChange,
  totalEventCount = 0,
  live = true,
}) {
  const containerRef = useRef(null);
  const [containerWidth, setContainerWidth] = useState(800);
  const [containerHeight, setContainerHeight] = useState(600);

  // Always render every defined track so the user can see the full set of
  // channels even before any events have arrived. Tracks with no events still
  // appear (greyed out via the count badge).
  const visibleTracks = trackDefinitions;

  // Distribute the available vertical space across the visible tracks so the
  // panel uses the full pane instead of leaving empty space at the bottom.
  const trackHeight = Math.min(
    MAX_TRACK_HEIGHT,
    Math.max(MIN_TRACK_HEIGHT, Math.floor(containerHeight / Math.max(1, visibleTracks.length)))
  );

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return undefined;
    const update = () => {
      setContainerWidth(el.clientWidth || 800);
      setContainerHeight(el.clientHeight || 600);
    };
    update();
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(update) : null;
    if (ro) ro.observe(el);
    window.addEventListener("resize", update);
    return () => {
      if (ro) ro.disconnect();
      window.removeEventListener("resize", update);
    };
  }, []);

  // Width of the data area (excluding the track label column).
  const dataWidth = Math.max(containerWidth - TRACK_LABEL_WIDTH, duration * zoomLevel);
  const totalWidth = dataWidth + TRACK_LABEL_WIDTH;

  const xScale = useCallback(
    (time) => {
      if (!duration) return 0;
      return (time / duration) * dataWidth;
    },
    [dataWidth, duration]
  );

  const xToTime = useCallback(
    (xPosition) => {
      if (!dataWidth) return 0;
      return (xPosition / dataWidth) * duration;
    },
    [dataWidth, duration]
  );

  // Tell the parent which slice of the timeline is currently in view so the
  // top scrubber can render a "visible window" indicator.
  useEffect(() => {
    const container = containerRef.current;
    if (!container || !onVisibleRangeChange) return undefined;
    const update = () => {
      const scrollLeft = container.scrollLeft;
      const viewportWidth = container.clientWidth;
      const startX = Math.max(0, scrollLeft - TRACK_LABEL_WIDTH);
      const endX = startX + viewportWidth;
      onVisibleRangeChange({
        startTime: Math.max(0, xToTime(startX)),
        endTime: Math.min(duration, xToTime(endX)),
      });
    };
    update();
    container.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      container.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [duration, xToTime, onVisibleRangeChange]);

  const handleTrackClick = (e) => {
    if (!onUserSeek) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left - TRACK_LABEL_WIDTH;
    if (x < 0) return;
    onUserSeek(xToTime(x));
  };

  const totalTracksHeight = visibleTracks.length * trackHeight;

  return (
    <div className="tl-panel">
      <div className="tl-scroll" ref={containerRef}>
        <div
          className="tl-inner"
          style={{
            minWidth: `${totalWidth}px`,
            minHeight: "100%",
          }}
        >
          {totalEventCount === 0 && (
            <div className="tl-empty">
              Nothing yet. Move the cursor, select some text or switch windows.
            </div>
          )}

          {visibleTracks.map((track) => {
            const items = tracks[track.id] || [];
            return (
              <div
                key={track.id}
                className={`tl-track${items.length ? "" : " is-empty"}`}
                style={{
                  height: `${trackHeight}px`,
                  minHeight: `${trackHeight}px`,
                }}
                onClick={handleTrackClick}
              >
                <div className="tl-track__label" style={{ width: TRACK_LABEL_WIDTH }}>
                  <TrackIcon name={track.icon} />
                  <span className="tl-track__name">{track.label}</span>
                  <span className="tl-track__count">{items.length}</span>
                </div>
                <div className="tl-track__content">
                  {items.map((evt) => (
                    <LiveEventBlock
                      key={evt.id}
                      event={
                        track.liveSpan && evt.endTime == null
                          ? { ...evt, endTime: currentTime }
                          : evt
                      }
                      track={track}
                      isLive={track.liveSpan && evt.endTime == null}
                      xScale={xScale}
                      height={trackHeight}
                    />
                  ))}
                </div>
              </div>
            );
          })}

          <Playhead
            xScale={xScale}
            currentTime={currentTime}
            totalHeight={totalTracksHeight}
            containerRef={containerRef}
            live={live}
          />
        </div>
      </div>
      <VisualizerTimeline
        minTime={0}
        maxTime={duration}
        xScale={xScale}
        height={TIMELINE_HEIGHT}
        scrollContainerRef={containerRef}
      />
    </div>
  );
}

export default React.memo(LiveVisualizerPanel);
