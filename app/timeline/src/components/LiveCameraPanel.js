import React, { useEffect, useRef, useState } from "react";
import PannableViewport from "./PannableViewport";
import { jpegBytesFromFrame, paintJpegFrame, revokeFrameUrls } from "./liveFrame";

/**
 * LiveCameraPanel
 *
 * Renders the live webcam capture from every camera known to the AUSM
 * camera-stream service. Frames arrive from the Electron main process at
 * the camera service's default capture rate (10 fps).
 *
 * Object URLs are reused per device and revoked on replacement so the
 * renderer doesn't accumulate Blob memory — same pattern as LiveScreenPanel.
 */
function LiveCameraPanel({ fps = 10, paused = false }) {
  const [devices, setDevices] = useState([]);
  const [error, setError] = useState(null);
  const [readyIds, setReadyIds] = useState(() => new Set());
  const urlsRef = useRef({});
  const imgRefs = useRef(new Map());
  const readyRef = useRef(new Set());

  useEffect(() => {
    if (!window.ausm?.getCameraDevices) {
      setError("Camera-stream API not available on window.ausm");
      return undefined;
    }

    let cancelled = false;
    const refresh = async () => {
      try {
        const list = await window.ausm.getCameraDevices();
        if (cancelled) return;
        setDevices(Array.isArray(list) ? list : []);
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

  useEffect(() => {
    // Paused: drop the subscription but keep the last frame on screen. With no
    // subscribers left the main process stops encoding preview frames too.
    if (paused || !window.ausm?.subscribeCameraStream) {
      return undefined;
    }

    const cleanup = window.ausm.subscribeCameraStream((frame) => {
      const bytes = jpegBytesFromFrame(frame);
      if (!bytes || !frame.deviceId) return;
      paintJpegFrame(
        imgRefs.current.get(frame.deviceId),
        urlsRef,
        frame.deviceId,
        bytes,
      );
      if (!readyRef.current.has(frame.deviceId)) {
        readyRef.current.add(frame.deviceId);
        setReadyIds(new Set(readyRef.current));
      }
    });

    return () => {
      if (typeof cleanup === "function") cleanup();
    };
  }, [paused]);

  // Free the frame blobs only when the panel goes away, not on pause.
  useEffect(() => () => revokeFrameUrls(urlsRef), []);

  if (error) {
    return (
      <div className="live-camera-panel live-camera-panel--error">
        <div className="live-camera-panel__title">Camera</div>
        <div className="live-camera-panel__message">{error}</div>
      </div>
    );
  }

  if (!devices.length) {
    return (
      <div className="live-camera-panel live-camera-panel--empty">
        <div className="live-camera-panel__title">Camera</div>
        <div className="live-camera-panel__message">
          No camera yet.
        </div>
      </div>
    );
  }

  return (
    <div className="live-camera-panel">
      <div className="live-camera-panel__title">
        Camera · {devices.length} device
        {devices.length === 1 ? "" : "s"}{" "}
        <span className="live-camera-panel__hint">{paused ? "Paused" : `${fps} fps`} · drag to pan</span>
      </div>
      <PannableViewport className="live-camera-panel__row">
        {devices.map((d) => {
          const label = d.name || d.id;
          return (
            <div
              className="live-camera-tile"
              key={d.id}
              title={`${label}${d.position && d.position !== "unspecified" ? ` · ${d.position}` : ""}`}
            >
              <img
                ref={(el) => {
                  if (el) imgRefs.current.set(d.id, el);
                  else imgRefs.current.delete(d.id);
                }}
                className="live-camera-tile__img"
                alt={label}
                draggable={false}
                style={{ visibility: readyIds.has(d.id) ? "visible" : "hidden" }}
              />
              {!readyIds.has(d.id) && (
                <div className="live-camera-tile__placeholder">
                  Waiting for {label}…
                </div>
              )}
              <div className="live-camera-tile__label">
                {label}
                {d.active ? " · live" : ""}
              </div>
            </div>
          );
        })}
      </PannableViewport>
    </div>
  );
}

export default LiveCameraPanel;
