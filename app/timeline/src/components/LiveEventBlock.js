import React, { useRef, useState } from "react";
import { createPortal } from "react-dom";
import TrackIcon from "./TrackIcon";
import { taskDetail } from "../hooks/useAUSM";

// Cursor moves stream constantly, so they draw as faint specks; anything the
// person actually did (a click, a copy, a focus change) gets a full dot.
const QUIET_SUBTYPES = new Set(["MOVE", "FRAME_CAPTURED", "UPDATED"]);

function formatTime(t) {
  if (t == null) return "—";
  return `${t.toFixed(2)}s`;
}

function formatModelLatency(payload) {
  const ms = payload?.modelLatencyMs
    ?? (payload?.requestTimestamp != null && payload?.responseTimestamp != null
      ? payload.responseTimestamp - payload.requestTimestamp
      : null);
  return ms != null && Number.isFinite(ms) ? `${Math.round(ms)}ms` : "";
}

function humanize(subtype) {
  if (!subtype) return "";
  const s = String(subtype).replace(/^(MATERIAL|TASK|TEXT_EDITING|SCREENSHOT)_/, "").replace(/_/g, " ");
  return s.charAt(0) + s.slice(1).toLowerCase();
}

function summarizePayload(payload, max = 4) {
  if (!payload) return [];
  const entries = [];
  for (const [key, value] of Object.entries(payload)) {
    if (entries.length >= max) break;
    if (value == null) continue;
    if (typeof value === "object") {
      const inner = Object.keys(value).slice(0, 3).map((k) => {
        const v = value[k];
        if (v == null || typeof v === "object") return null;
        return `${k}=${String(v).slice(0, 24)}`;
      }).filter(Boolean).join(" ");
      if (inner) entries.push([key, inner]);
    } else {
      entries.push([key, String(value).slice(0, 80)]);
    }
  }
  return entries;
}

function LiveEventBlock({ event, track, xScale, height, isLive = false }) {
  const [hovered, setHovered] = useState(false);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const ref = useRef(null);

  const startX = xScale(event.presentation_time);
  const endX = event.endTime != null ? xScale(event.endTime) : null;
  const isSpan = endX != null && endX - startX > 1;
  const latency = formatModelLatency(event.payload);
  const summary = event.payload?.summary || event.description;
  const detail = event.source === "task" ? taskDetail(event.payload, summary) : null;

  const handleMouseEnter = () => {
    if (ref.current) {
      const rect = ref.current.getBoundingClientRect();
      setTooltipPos({ x: rect.left + Math.min(rect.width / 2, 120), y: rect.top });
    }
    setHovered(true);
  };

  const tooltip = hovered
    ? createPortal(
        <div
          className="tl-tooltip"
          style={{ left: `${tooltipPos.x}px`, top: `${tooltipPos.y}px` }}
        >
          <div className="tl-tooltip__head">
            <TrackIcon name={track.icon} size={13} />
            <span className="tl-tooltip__kind">
              {track.label}
              {event.subtype ? ` · ${humanize(event.subtype)}` : ""}
            </span>
            <span className="tl-tooltip__time">
              {formatTime(event.presentation_time)}
              {event.endTime != null ? ` → ${formatTime(event.endTime)}` : ""}
              {latency ? ` · ${latency}` : ""}
            </span>
          </div>
          {summary && <div className="tl-tooltip__summary">{summary}</div>}
          {detail && <div className="tl-tooltip__detail">{detail}</div>}
          <dl className="tl-tooltip__fields">
            {summarizePayload(event.payload).map(([k, v]) => (
              <React.Fragment key={k}>
                <dt>{k}</dt>
                <dd>{v}</dd>
              </React.Fragment>
            ))}
          </dl>
        </div>,
        document.body
      )
    : null;

  const hoverProps = {
    onMouseEnter: handleMouseEnter,
    onMouseLeave: () => setHovered(false),
  };

  if (isSpan) {
    const classes = [
      "tl-span",
      `tl-span--${event.source}`,
      isLive ? "is-live" : "",
      hovered ? "is-hovered" : "",
    ].filter(Boolean).join(" ");
    return (
      <>
        <div
          ref={ref}
          className={classes}
          style={{
            left: `${startX}px`,
            width: `${Math.max(4, endX - startX)}px`,
            top: `${(height - 18) / 2}px`,
          }}
          {...hoverProps}
        >
          {event.description && <span className="tl-span__label">{event.description}</span>}
        </div>
        {tooltip}
      </>
    );
  }

  const quiet = QUIET_SUBTYPES.has(event.subtype);
  return (
    <>
      <div
        ref={ref}
        className={`tl-dot${quiet ? " tl-dot--quiet" : ""}${hovered ? " is-hovered" : ""}`}
        style={{ left: `${startX}px`, top: `${height / 2}px` }}
        {...hoverProps}
      />
      {tooltip}
    </>
  );
}

export default React.memo(LiveEventBlock);
