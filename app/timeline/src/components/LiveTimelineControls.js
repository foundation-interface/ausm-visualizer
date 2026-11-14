import React from "react";
import { Circle, Pause, RotateCcw, ZoomIn, ZoomOut } from "lucide-react";

function formatTime(seconds) {
  if (seconds == null || isNaN(seconds)) return "0:00.0";
  const mins = Math.floor(seconds / 60);
  const secs = (seconds % 60).toFixed(1);
  return `${mins}:${secs.padStart(4, "0")}`;
}

const FPS_PRESETS = [1, 5, 10, 30];
const ZOOM_MIN = 10;
const ZOOM_MAX = 2000;

// One row of choices on a shared glass track; the chosen one is ink-filled.
function Segmented({ label, options, value, onChange, format = String }) {
  return (
    <div className="tl-segment" role="group" aria-label={label}>
      <span className="tl-segment__label">{label}</span>
      <div className="tl-segment__track">
        {options.map((option) => (
          <button
            type="button"
            key={option}
            className={`tl-segment__option${value === option ? " is-on" : ""}`}
            aria-pressed={value === option}
            onClick={() => onChange?.(option)}
          >
            {format(option)}
          </button>
        ))}
      </div>
    </div>
  );
}

function LiveTimelineControls({
  recording,
  live,
  currentTime,
  duration,
  onToggleRecording,
  onReset,
  onSetLive,
  onSeek,
  zoomLevel,
  onZoomChange,
  visibleTimeRange,
  eventCount,
  screenFps,
  cameraFps,
  onScreenFpsChange,
  onCameraFpsChange,
}) {
  const handleSeek = (e) => {
    const value = parseFloat(e.target.value);
    if (!isNaN(value)) onSeek?.(value);
  };

  const visibleStyle =
    visibleTimeRange && duration
      ? {
          left: `${(visibleTimeRange.startTime / duration) * 100}%`,
          width: `${((visibleTimeRange.endTime - visibleTimeRange.startTime) / duration) * 100}%`,
        }
      : null;
  const progress = duration ? Math.min(1, currentTime / duration) : 0;

  return (
    <footer className="tl-controls">
      {/* the overview: the whole session, the slice in view, and the playhead */}
      <div className="tl-overview">
        <div className="tl-overview__time">
          <span className="tl-overview__now">{formatTime(currentTime)}</span>
          <span className="tl-overview__total">/ {formatTime(duration)}</span>
          <span className="tl-overview__count">{eventCount} events</span>
        </div>
        <div className="tl-overview__bar" style={{ "--progress": progress }}>
          {visibleStyle && <div className="tl-overview__window" style={visibleStyle} />}
          <input
            type="range"
            min="0"
            max={Math.max(duration, 1)}
            step="0.05"
            value={Math.min(currentTime, duration)}
            onChange={handleSeek}
            className="tl-overview__slider"
            aria-label="Scrub the timeline"
          />
        </div>
      </div>

      <div className="tl-toolbar">
        <button
          type="button"
          className={`tl-icon-btn tl-record${recording ? " is-on" : ""}`}
          onClick={onToggleRecording}
          aria-label={recording ? "Pause recording" : "Resume recording"}
          title={recording ? "Pause recording" : "Resume recording"}
        >
          {recording ? <Pause size={15} strokeWidth={2} /> : <Circle size={14} strokeWidth={2} />}
        </button>
        <button
          type="button"
          className="tl-icon-btn"
          onClick={onReset}
          aria-label="Clear the timeline"
          title="Clear the timeline"
        >
          <RotateCcw size={15} strokeWidth={1.75} />
        </button>

        <span className="tl-toolbar__gap" />

        <Segmented
          label="Follow"
          options={["live", "scrub"]}
          value={live ? "live" : "scrub"}
          onChange={(v) => onSetLive?.(v === "live")}
          format={(v) => (v === "live" ? "Live" : "Scrub")}
        />

        <div className="tl-zoom" role="group" aria-label="Zoom">
          <span className="tl-segment__label">Zoom</span>
          <button
            type="button"
            className="tl-icon-btn tl-icon-btn--small"
            onClick={() => onZoomChange?.(Math.max(ZOOM_MIN, Math.round(zoomLevel * 0.7)))}
            aria-label="Zoom out"
          >
            <ZoomOut size={14} strokeWidth={1.75} />
          </button>
          <span className="tl-zoom__value">{zoomLevel} px/s</span>
          <button
            type="button"
            className="tl-icon-btn tl-icon-btn--small"
            onClick={() => onZoomChange?.(Math.min(ZOOM_MAX, Math.round(zoomLevel * 1.4)))}
            aria-label="Zoom in"
          >
            <ZoomIn size={14} strokeWidth={1.75} />
          </button>
        </div>

        <Segmented
          label="Screen fps"
          options={FPS_PRESETS}
          value={screenFps}
          onChange={onScreenFpsChange}
        />
        {window.timeline?.cameraEnabled && (
          <Segmented
            label="Camera fps"
            options={FPS_PRESETS}
            value={cameraFps}
            onChange={onCameraFpsChange}
          />
        )}
      </div>
    </footer>
  );
}

export default LiveTimelineControls;
