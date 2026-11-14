import React, { useCallback, useEffect, useRef, useState } from "react";
import LiveVisualizerPanel from "./components/LiveVisualizerPanel";
import LiveTimelineControls from "./components/LiveTimelineControls";
import LiveScreenPanel from "./components/LiveScreenPanel";
import LiveCameraPanel from "./components/LiveCameraPanel";
import { useAUSMTimeline, usePreviewFps } from "./hooks/useAUSM";
import "./timeline.css";

const MEDIA_SPLIT_KEY = "ausm.mediaSplitRatio";
const DEFAULT_MEDIA_RATIO = 0.34;
const MIN_MEDIA_PX = 80;
const MIN_TRACKS_PX = 160;

function readMediaRatio() {
  try {
    const saved = Number(window.localStorage.getItem(MEDIA_SPLIT_KEY));
    if (Number.isFinite(saved) && saved >= 0.12 && saved <= 0.85) return saved;
  } catch {
    /* ignore */
  }
  return DEFAULT_MEDIA_RATIO;
}

function Visualizer() {
  const {
    isElectron,
    recording,
    live,
    now,
    duration,
    events,
    taskToast,
    tracks,
    trackDefinitions,
    toggleRecording,
    reset,
    setLive,
  } = useAUSMTimeline();

  const [manualTime, setManualTime] = useState(0);
  const [zoomLevel, setZoomLevel] = useState(100);
  const [visibleTimeRange, setVisibleTimeRange] = useState(null);
  const { screenFps, cameraFps, setScreenFps, setCameraFps } = usePreviewFps();
  const [mediaRatio, setMediaRatio] = useState(readMediaRatio);
  const mainRef = useRef(null);
  const mediaRatioRef = useRef(mediaRatio);
  const dragRef = useRef(null);

  useEffect(() => {
    mediaRatioRef.current = mediaRatio;
  }, [mediaRatio]);

  const onSplitPointerDown = useCallback((event) => {
    if (event.button !== 0) return;
    const main = mainRef.current;
    if (!main) return;
    dragRef.current = {
      pointerId: event.pointerId,
      startY: event.clientY,
      startRatio: mediaRatioRef.current,
      height: main.clientHeight,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
    event.preventDefault();
  }, []);

  const onSplitPointerMove = useCallback((event) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const minRatio = MIN_MEDIA_PX / drag.height;
    const maxRatio = 1 - MIN_TRACKS_PX / drag.height;
    const next =
      drag.startRatio + (event.clientY - drag.startY) / drag.height;
    setMediaRatio(Math.max(minRatio, Math.min(maxRatio, next)));
  }, []);

  const onSplitPointerUp = useCallback((event) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    dragRef.current = null;
    try {
      window.localStorage.setItem(
        MEDIA_SPLIT_KEY,
        String(mediaRatioRef.current),
      );
    } catch {
      /* ignore */
    }
  }, []);

  // When live, the playhead tracks `now`; otherwise it follows `manualTime`.
  const currentTime = live ? now : manualTime;

  // Make sure manual time stays in range as new events arrive.
  useEffect(() => {
    if (!live && manualTime > duration) {
      setManualTime(duration);
    }
  }, [live, manualTime, duration]);

  const handleUserSeek = useCallback(
    (time) => {
      const clamped = Math.max(0, Math.min(duration, time));
      setManualTime(clamped);
      // A click/scrub on the track is an explicit "leave live" gesture.
      setLive(false);
    },
    [duration, setLive]
  );

  const handleSeekFromControls = useCallback(
    (time) => handleUserSeek(time),
    [handleUserSeek]
  );

  const handleVisibleRangeChange = useCallback((range) => {
    setVisibleTimeRange(range);
  }, []);

  const statusLabel = !isElectron ? "Not connected" : recording ? "Recording" : "Paused";
  const cameraEnabled = Boolean(window.timeline?.cameraEnabled);

  return (
    <div className="tl-app">
      {/* frosted title bar; the window has no native one, so this is where it drags */}
      <header className="tl-header">
        <div className="tl-header__title">
          <h1>Activity timeline</h1>
          <span className="tl-header__tick" aria-hidden="true" />
          <span className="tl-header__sub">ausm</span>
        </div>
        <div className="tl-status" aria-live="polite">
          <span className={`tl-status__dot${isElectron && recording ? " is-on" : ""}`} />
          <span>{statusLabel}</span>
          {!live && <span className="tl-status__note">Scrubbing · choose Live to follow</span>}
        </div>
      </header>

      {!isElectron ? (
        <div className="tl-offline">
          <h2>Not connected to ausm</h2>
          <p>
            This page reads events from <code>window.ausm</code>, which only the
            desktop app provides. Run <code>npm start</code> in this repo.
          </p>
        </div>
      ) : (
        <div className="tl-main">
          <div className="tl-stack" ref={mainRef}>
            <div
              className={`tl-media${cameraEnabled ? " has-camera" : ""}`}
              style={{ flex: `0 0 ${mediaRatio * 100}%` }}
            >
              <LiveScreenPanel fps={screenFps} paused={!recording} taskToast={taskToast} />
              {cameraEnabled && <LiveCameraPanel fps={cameraFps} paused={!recording} />}
            </div>
            <div
              className="tl-split"
              onPointerDown={onSplitPointerDown}
              onPointerMove={onSplitPointerMove}
              onPointerUp={onSplitPointerUp}
              onPointerCancel={onSplitPointerUp}
              title="Drag to resize previews and event tracks"
            />
            <LiveVisualizerPanel
              trackDefinitions={trackDefinitions}
              tracks={tracks}
              duration={duration}
              currentTime={currentTime}
              onUserSeek={handleUserSeek}
              zoomLevel={zoomLevel}
              onVisibleRangeChange={handleVisibleRangeChange}
              totalEventCount={events.length}
              live={live}
            />
          </div>
        </div>
      )}

      {isElectron && (
        <LiveTimelineControls
          recording={recording}
          live={live}
          currentTime={currentTime}
          duration={duration}
          eventCount={events.length}
          zoomLevel={zoomLevel}
          visibleTimeRange={visibleTimeRange}
          onToggleRecording={toggleRecording}
          onReset={() => {
            reset();
            setManualTime(0);
            setLive(true);
          }}
          onSetLive={setLive}
          onSeek={handleSeekFromControls}
          onZoomChange={setZoomLevel}
          screenFps={screenFps}
          cameraFps={cameraFps}
          onScreenFpsChange={setScreenFps}
          onCameraFpsChange={setCameraFps}
        />
      )}
    </div>
  );
}

export default Visualizer;
