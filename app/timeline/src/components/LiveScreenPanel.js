import React, { useEffect, useMemo, useRef, useState } from "react";
import PannableViewport from "./PannableViewport";
import TaskToast from "./TaskToast";
import { jpegBytesFromFrame, paintJpegFrame, revokeFrameUrls } from "./liveFrame";

/**
 * LiveScreenPanel
 *
 * Renders the live screen capture from every connected display, arranged in
 * the same physical layout as the user's monitor setup (using each display's
 * logical-point origin/size from CGDisplayBounds).
 *
 * Frames arrive from the Electron main process at the screen-stream service's
 * default capture rate (10 fps). The panel reuses a single Object URL per
 * display and revokes the previous URL whenever a new frame replaces it, so
 * the renderer doesn't accumulate Blob memory.
 */
function LiveScreenPanel({ paused = false, fps = 10, taskToast = null }) {
  const [displays, setDisplays] = useState([]);
  const [error, setError] = useState(null);
  const [readyIds, setReadyIds] = useState(() => new Set());
  const urlsRef = useRef({});
  const imgRefs = useRef(new Map());
  const readyRef = useRef(new Set());

  // Fetch the display layout once on mount, and refresh every few seconds in
  // case a monitor is plugged in or removed.
  useEffect(() => {
    if (!window.ausm?.getScreenDisplays) {
      setError("Screen-stream API not available on window.ausm");
      return undefined;
    }

    let cancelled = false;
    const refresh = async () => {
      try {
        const list = await window.ausm.getScreenDisplays();
        if (cancelled) return;
        setDisplays(Array.isArray(list) ? list : []);
      } catch (err) {
        if (!cancelled) setError(err?.message ?? String(err));
      }
    };
    refresh();
    const id = setInterval(refresh, 5000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  // Subscribe to screen frames. The bridge call also signals the main process
  // to start polling, and the cleanup signals it to stop.
  useEffect(() => {
    // Paused: drop the subscription but keep the last frame on screen. With no
    // subscribers left the main process stops encoding preview frames too.
    if (paused || !window.ausm?.subscribeScreenStream) {
      return undefined;
    }

    const cleanup = window.ausm.subscribeScreenStream((frame) => {
      const bytes = jpegBytesFromFrame(frame);
      if (!bytes || !frame.displayId) return;
      paintJpegFrame(
        imgRefs.current.get(frame.displayId),
        urlsRef,
        frame.displayId,
        bytes,
      );
      if (!readyRef.current.has(frame.displayId)) {
        readyRef.current.add(frame.displayId);
        setReadyIds(new Set(readyRef.current));
      }
    });

    return () => {
      if (typeof cleanup === "function") cleanup();
    };
  }, [paused]);

  // Free the frame blobs only when the panel goes away, not on pause.
  useEffect(() => () => revokeFrameUrls(urlsRef), []);

  // Compute the global bounding rect across all displays so we can lay each
  // one out in proportional space. Falls back to a 16:9 placeholder if the
  // displays don't expose origin/size.
  const layout = useMemo(() => {
    if (!displays.length) return null;

    const usable = displays.filter(
      (d) =>
        Number.isFinite(d.originX) &&
        Number.isFinite(d.originY) &&
        Number.isFinite(d.logicalWidth) &&
        Number.isFinite(d.logicalHeight) &&
        d.logicalWidth > 0 &&
        d.logicalHeight > 0,
    );
    if (!usable.length) return null;

    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (const d of usable) {
      minX = Math.min(minX, d.originX);
      minY = Math.min(minY, d.originY);
      maxX = Math.max(maxX, d.originX + d.logicalWidth);
      maxY = Math.max(maxY, d.originY + d.logicalHeight);
    }

    const width = Math.max(1, maxX - minX);
    const height = Math.max(1, maxY - minY);

    return {
      minX,
      minY,
      width,
      height,
      displays: usable,
    };
  }, [displays]);

  let body;
  if (error) {
    body = (
      <>
        <div className="live-screen-panel__title">Screen</div>
        <div className="live-screen-panel__message">{error}</div>
      </>
    );
  } else if (!displays.length) {
    body = (
      <>
        <div className="live-screen-panel__title">Screen</div>
        <div className="live-screen-panel__message">
          No frames yet. Give the app you started this from (Terminal, iTerm…) Screen
          Recording in System Settings → Privacy &amp; Security, then quit it and run again.
        </div>
      </>
    );
  } else if (!layout) {
    body = (
      <>
        <div className="live-screen-panel__title">
          Screen · {displays.length} display
          {displays.length === 1 ? "" : "s"}
        </div>
        <PannableViewport className="live-screen-panel__row">
          {displays.map((d) => (
              <div
                className="live-screen-tile"
                key={d.id}
                title={`${d.id} · ${d.width}×${d.height}`}
              >
                <img
                  ref={(el) => {
                    if (el) imgRefs.current.set(d.id, el);
                    else imgRefs.current.delete(d.id);
                  }}
                  className="live-screen-tile__img"
                  alt={d.id}
                  draggable={false}
                  style={{ visibility: readyIds.has(d.id) ? "visible" : "hidden" }}
                />
                {!readyIds.has(d.id) && (
                  <div className="live-screen-tile__placeholder">
                    Waiting for {d.id}…
                  </div>
                )}
                <div className="live-screen-tile__label">
                  {d.id}
                  {d.isMain ? " (main)" : ""}
                </div>
              </div>
          ))}
        </PannableViewport>
      </>
    );
  } else {
    body = (
      <>
        <div className="live-screen-panel__title">
          Screen{layout.displays.length > 1 ? ` · ${layout.displays.length} displays` : ""}
          <span className="live-screen-panel__hint">{paused ? "Paused" : `${fps} fps`} · drag to pan</span>
        </div>
        <PannableViewport className="live-screen-panel__stage">
          <div
            className="live-screen-panel__layout"
            style={{
              aspectRatio: `${layout.width} / ${layout.height}`,
              minWidth: Math.round(layout.width * 0.35),
              minHeight: Math.round(layout.height * 0.35),
            }}
          >
            {layout.displays.map((d) => {
              const left = ((d.originX - layout.minX) / layout.width) * 100;
              const top = ((d.originY - layout.minY) / layout.height) * 100;
              const w = (d.logicalWidth / layout.width) * 100;
              const h = (d.logicalHeight / layout.height) * 100;
              return (
                <div
                  className="live-screen-tile live-screen-tile--positioned"
                  key={d.id}
                  style={{
                    left: `${left}%`,
                    top: `${top}%`,
                    width: `${w}%`,
                    height: `${h}%`,
                  }}
                  title={`${d.id} · ${d.logicalWidth}×${d.logicalHeight} pt @ origin (${d.originX}, ${d.originY})`}
                >
                  <img
                    ref={(el) => {
                      if (el) imgRefs.current.set(d.id, el);
                      else imgRefs.current.delete(d.id);
                    }}
                    className="live-screen-tile__img"
                    alt={d.id}
                    draggable={false}
                    style={{ visibility: readyIds.has(d.id) ? "visible" : "hidden" }}
                  />
                  {!readyIds.has(d.id) && (
                    <div className="live-screen-tile__placeholder">
                      Waiting for {d.id}…
                    </div>
                  )}
                  <div className="live-screen-tile__label">
                    {d.id}
                    {d.isMain ? " · main" : ""}
                  </div>
                </div>
              );
            })}
          </div>
        </PannableViewport>
      </>
    );
  }

  const modifier = error
    ? "live-screen-panel--error"
    : !displays.length
      ? "live-screen-panel--empty"
      : !layout
        ? "live-screen-panel--stacked"
        : "";

  return (
    <div className={`live-screen-panel ${modifier}`.trim()}>
      {body}
      <TaskToast toast={taskToast} />
    </div>
  );
}

export default LiveScreenPanel;
