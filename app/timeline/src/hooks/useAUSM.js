import { useCallback, useEffect, useMemo, useRef, useState } from "react";

/**
 * Timeline hooks that subscribe to `window.ausm`:
 *   useAUSMTimeline — event tracks + live clock
 *   usePreviewFps   — screen/camera preview capture rates
 */

// Track ordering + display config, top to bottom. Tracks are told apart by
// their row, label and icon, not by color: the one accent is kept for what's
// live (the current task, the playhead).
export const TRACK_DEFINITIONS = [
  { id: "task",          label: "Tasks",       icon: "ListChecks", liveSpan: true },
  { id: "material",      label: "Materials",   icon: "FileText" },
  { id: "windowState",   label: "Windows",     icon: "AppWindow" },
  { id: "textInput",     label: "Typing",      icon: "Keyboard" },
  { id: "textSelection", label: "Selection",   icon: "TextCursorInput" },
  { id: "copyPaste",     label: "Clipboard",   icon: "Clipboard" },
  { id: "screenshot",    label: "Screenshots", icon: "Camera" },
  { id: "cursor",        label: "Cursor",      icon: "MousePointer2" },
  { id: "detector",      label: "Detectors",   icon: "Radar" },
];

const TRACK_BY_ID = TRACK_DEFINITIONS.reduce((acc, t) => {
  acc[t.id] = t;
  return acc;
}, {});

// Lifecycle pairing for events that come in start/update/finish triplets.
// We collapse matching pairs into one span so the timeline shows a duration.
const RAW_TASK_SPAN_KEY = "task:detector-response";

const SPAN_LIFECYCLES = {
  screenshot: {
    start: ["SCREENSHOT_STARTED"],
    update: ["SCREENSHOT_UPDATED"],
    end: ["SCREENSHOT_FINISHED"],
    statusKey: "status",
  },
  textInput: {
    start: ["TEXT_EDITING_STARTED"],
    update: ["TEXT_EDITING_UPDATED"],
    end: ["TEXT_EDITING_FINISHED"],
    statusKey: "status",
  },
  windowState: {
    start: ["APPEAR", "FOCUSED"],
    update: ["UNFOCUSED"],
    end: ["VANISHED"],
    statusKey: "state",
  },
};

function formatModelLatency(payload) {
  const ms = payload?.modelLatencyMs
    ?? (payload?.requestTimestamp != null && payload?.responseTimestamp != null
      ? payload.responseTimestamp - payload.requestTimestamp
      : null);
  return ms != null && Number.isFinite(ms) ? `${Math.round(ms)}ms` : "";
}

// "SELECTION" -> "Selection": raw enum values never reach the screen.
function humanize(value) {
  if (!value) return "";
  const s = String(value).replace(/_/g, " ").toLowerCase();
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// Build a short, scannable label for each kind of event so the tooltip and
// preview pane can show something useful without users opening the JSON.
function describeEvent(source, payload) {
  if (!payload || typeof payload !== "object") return "";

  switch (source) {
    case "textSelection":
      return (payload.selectedText || "").trim().slice(0, 80);
    case "textHighlight":
      return `${payload.highlights?.length ?? 0} highlight(s)`;
    case "screenshot":
      return payload.type ? `${humanize(payload.type)} screenshot` : "Screenshot";
    case "windowState":
      return [payload.state, payload.application, payload.title]
        .filter(Boolean).join(" · ").slice(0, 100);
    case "textInput": {
      const text = (payload.text || "").trim().slice(0, 60);
      const app = payload.sourceElement?.application || payload.application;
      return text || (app ? `Typing in ${app}` : "Typing");
    }
    case "timeline":
      return payload.eventType || "";
    case "trigger":
      return payload.trigger || "";
    case "material":
      return [
        payload.materialEventType,
        payload.title,
        payload.application,
      ].filter(Boolean).join(" · ").slice(0, 100);
    case "cursor":
      return [payload.action, payload.application].filter(Boolean).join(" · ");
    case "copyPaste":
      return [payload.action, payload.contentType].filter(Boolean).join(" · ");
    case "task":
      // the chip shows the task itself; app and model latency live in the tooltip
      return (payload.summary || payload.taskLabel || "").trim().slice(0, 160);
    case "detector":
      return [
        payload.summary || payload.detectorName,
        payload.eventType,
        formatModelLatency(payload),
      ].filter(Boolean).join(" · ").slice(0, 160);
    default:
      return "";
  }
}

// Map specific event kinds to a more granular "subtype" so blocks can pick
// distinct icons/colors (e.g. cursor CLICK vs MOVE).
function eventSubtype(source, payload) {
  if (!payload) return null;
  switch (source) {
    case "cursor":      return payload.action || null;
    case "material":    return payload.materialEventType || null;
    case "windowState": return payload.state  || null;
    case "screenshot":  return payload.status || null;
    case "textInput":   return payload.status || null;
    case "copyPaste":   return payload.action || null;
    case "task":        return payload.detectorName || payload.eventType || payload.status || null;
    case "detector":    return payload.detectorName || payload.eventType || null;
    default:            return null;
  }
}

// Best-effort key for pairing start/end events into a span. Falls back to
// source-application so unrelated events from different windows don't merge.
function spanKey(source, payload) {
  if (!payload) return source;
  if (source === "task") {
    return RAW_TASK_SPAN_KEY;
  }
  if (payload.eventID) return `${source}:${payload.eventID}`;
  if (source === "windowState") {
    return `${source}:${payload.application || "unknown"}:${payload.bounds?.x ?? "?"}`;
  }
  if (source === "textInput") {
    return `${source}:${payload.sourceElement?.application || "unknown"}`;
  }
  if (source === "screenshot") {
    return `${source}:${payload.bounds?.x ?? "?"}:${payload.type || "?"}`;
  }
  return source;
}

/**
 * The one-sentence "what exactly, right now" line for a task, or null when it
 * would only repeat the label (older detectors put the label's subject there).
 */
export function taskDetail(payload, summary = "") {
  const detail = (payload?.taskDescription || "").trim();
  if (!detail) return null;
  const norm = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  const d = norm(detail);
  const s = norm(summary || payload?.summary || payload?.taskLabel || "");
  return d && !s.includes(d) ? detail : null;
}

let nextEventSeq = 0;

export function useAUSMTimeline({ tickIntervalMs = 100 } = {}) {
  const [isElectron, setIsElectron] = useState(false);
  const [events, setEvents] = useState([]);
  const [recording, setRecording] = useState(true);
  const [live, setLive] = useState(true);
  const [now, setNow] = useState(0);
  const [taskToast, setTaskToast] = useState(null);

  // Mutable refs so listeners read the latest values without re-subscribing.
  const recordingRef = useRef(recording);
  const startMsRef = useRef(Date.now());
  const pauseAccumRef = useRef(0);   // total seconds the clock has been paused
  const pauseStartRef = useRef(null); // wall ms when the latest pause began
  const openSpansRef = useRef(new Map()); // spanKey -> eventId of start
  const lastTaskRequestTsRef = useRef(0);

  // Pending mutations are batched per animation frame to keep up with
  // high-frequency streams (cursor MOVE in particular).
  const pendingAppendsRef = useRef([]);
  const pendingPatchesRef = useRef(new Map()); // id -> patch
  const flushScheduledRef = useRef(false);

  recordingRef.current = recording;

  const scheduleFlush = useCallback(() => {
    if (flushScheduledRef.current) return;
    flushScheduledRef.current = true;
    requestAnimationFrame(() => {
      flushScheduledRef.current = false;
      const appends = pendingAppendsRef.current;
      const patches = pendingPatchesRef.current;
      if (appends.length === 0 && patches.size === 0) return;
      pendingAppendsRef.current = [];
      pendingPatchesRef.current = new Map();
      setEvents((prev) => {
        let next = prev;
        if (patches.size > 0) {
          next = next.map((e) => (patches.has(e.id) ? { ...e, ...patches.get(e.id) } : e));
        }
        if (appends.length > 0) {
          next = next.concat(appends);
        }
        return next;
      });
    });
  }, []);

  const enqueueAppend = useCallback((evt) => {
    pendingAppendsRef.current.push(evt);
    scheduleFlush();
  }, [scheduleFlush]);

  const enqueuePatch = useCallback((id, patch) => {
    // If the event hasn't been flushed yet, mutate it in the pending queue
    // so we don't have to wait for the patch to flush separately.
    const pending = pendingAppendsRef.current.find((e) => e.id === id);
    if (pending) {
      Object.assign(pending, patch);
    } else {
      const existing = pendingPatchesRef.current.get(id);
      pendingPatchesRef.current.set(id, { ...(existing || {}), ...patch });
    }
    scheduleFlush();
  }, [scheduleFlush]);

  const elapsedSeconds = useCallback(() => {
    if (pauseStartRef.current != null) {
      return (pauseStartRef.current - startMsRef.current) / 1000 - pauseAccumRef.current;
    }
    return (Date.now() - startMsRef.current) / 1000 - pauseAccumRef.current;
  }, []);

  const wallToElapsed = useCallback((wallMs) => {
    return (wallMs - startMsRef.current) / 1000 - pauseAccumRef.current;
  }, []);

  const payloadWallMs = (payload) => {
    const raw = payload?.requestTimestamp ?? payload?.timestamp ?? Date.now();
    let ms = Number(raw);
    if (!Number.isFinite(ms)) return Date.now();
    // Some producers still report seconds (or boot-relative seconds).
    if (ms > 0 && ms < 1e12) ms *= 1000;
    const start = startMsRef.current;
    if (ms < start - 5000 || ms > Date.now() + 5000) return Date.now();
    return ms;
  };

  // Tick the clock while we're live so the playhead follows real time.
  useEffect(() => {
    if (!live) return;
    let raf = null;
    let timeoutId = null;
    const tick = () => {
      setNow(elapsedSeconds());
      timeoutId = setTimeout(() => {
        raf = requestAnimationFrame(tick);
      }, tickIntervalMs);
    };
    tick();
    return () => {
      if (raf) cancelAnimationFrame(raf);
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [live, elapsedSeconds, tickIntervalMs]);

  // Subscribe to every AUSM event source. We register once; the closure
  // reads `recordingRef` to decide whether to actually buffer.
  useEffect(() => {
    const hasAUSM = typeof window !== "undefined" && window.ausm;
    setIsElectron(!!hasAUSM);
    if (!hasAUSM) return undefined;

    const handleEvent = (source, payload) => {
      if (!recordingRef.current) return;
      const t = wallToElapsed(payloadWallMs(payload));
      const id = `${source}-${++nextEventSeq}`;
      const subtype = eventSubtype(source, payload);
      const description = describeEvent(source, payload);

      // If this is a span-style event, fold it into an open span (if any)
      // or open a new one.
      const lifecycle = SPAN_LIFECYCLES[source];
      if (lifecycle) {
        const status = payload?.[lifecycle.statusKey];
        const isStart  = status && lifecycle.start.includes(status);
        const isEnd    = status && lifecycle.end.includes(status);
        const key = spanKey(source, payload);

        if (isStart) {
          const startEvent = {
            id, source, subtype, description,
            presentation_time: t,
            endTime: null,
            spanKey: key,
            wallTimestamp: payload?.timestamp ?? Date.now(),
            payload,
          };
          openSpansRef.current.set(key, id);
          enqueueAppend(startEvent);
          return;
        }

        if (isEnd) {
          const startId = openSpansRef.current.get(key);
          openSpansRef.current.delete(key);
          if (startId) {
            enqueuePatch(startId, { endTime: t, lastUpdate: payload });
            return;
          }
          // No open span — fall through and render the end as a tick.
        }

        if (status && lifecycle.update.includes(status)) {
          const startId = openSpansRef.current.get(key);
          if (startId) {
            enqueuePatch(startId, { lastUpdate: payload });
            return;
          }
        }
      }

      enqueueAppend({
        id, source, subtype, description,
        presentation_time: t,
        endTime: null,
        wallTimestamp: payload?.timestamp ?? Date.now(),
        payload,
      });
    };

    const missing = ["onMaterialEvent", "onDetectorEvent", "onTaskEvent"]
      .filter((name) => typeof window.ausm[name] !== "function");
    if (missing.length) {
      console.warn("[Timeline] window.ausm is missing", missing.join(", "));
    }

    const textSelectionUnsubHandle = window.ausm.onTextSelection?.((payload) => handleEvent("textSelection", payload));
    const screenshotUnsubHandle = window.ausm.onScreenshot?.((payload) => handleEvent("screenshot", payload));
    const windowStateUnsubHandle = window.ausm.onWindowState?.((payload) => handleEvent("windowState", payload));
    const textInputUnsubHandle = window.ausm.onTextInput?.((payload) => handleEvent("textInput", payload));
    const materialUnsubHandle = window.ausm.onMaterialEvent?.((payload) => handleEvent("material", payload));
    const cursorUnsubHandle = window.ausm.onCursorPlusPlusEvent?.((payload) => handleEvent("cursor", payload));
    const copyPasteUnsubHandle = window.ausm.onCopyPasteEvent?.((payload) => handleEvent("copyPaste", payload));
    const plotTaskResponse = (payload) => {
      if (!recordingRef.current) return;
      const wall = payloadWallMs(payload);
      // Concurrent Vertex calls finish out of order. A slower older eval
      // must not close the current bar or appear to the right of a newer one.
      if (wall < lastTaskRequestTsRef.current) return;
      lastTaskRequestTsRef.current = wall;

      const t = wallToElapsed(wall);
      const prevId = openSpansRef.current.get(RAW_TASK_SPAN_KEY);
      if (prevId) {
        openSpansRef.current.delete(RAW_TASK_SPAN_KEY);
        enqueuePatch(prevId, { endTime: t, lastUpdate: payload });
      }

      const id = `task-${++nextEventSeq}`;
      const description = describeEvent("task", payload);
      openSpansRef.current.set(RAW_TASK_SPAN_KEY, id);
      enqueueAppend({
        id,
        source: "task",
        subtype: payload.status || payload.detectorName || payload.eventType || "task",
        description,
        presentation_time: t,
        endTime: null,
        spanKey: RAW_TASK_SPAN_KEY,
        wallTimestamp: payload?.timestamp ?? Date.now(),
        payload,
      });
      const toastSummary = (payload.summary || payload.taskLabel || "").trim() || description;
      setTaskToast({
        id,
        summary: toastSummary,
        detail: taskDetail(payload, toastSummary),
        application: payload.application || "",
      });
    };
    const plotDetectorResponse = (payload) => {
      handleEvent("detector", payload);
      const isTask =
        payload?.eventType === "task" || payload?.detectorName === "rapid-task";
      if (isTask && typeof window.ausm.onTaskEvent !== "function") {
        plotTaskResponse(payload);
      }
    };

    const detectorUnsubHandle = window.ausm.onDetectorEvent?.(plotDetectorResponse);
    const taskUnsubHandle = window.ausm.onTaskEvent?.(plotTaskResponse);

    return () => {
      textSelectionUnsubHandle?.();
      screenshotUnsubHandle?.();
      windowStateUnsubHandle?.();
      textInputUnsubHandle?.();
      materialUnsubHandle?.();
      cursorUnsubHandle?.();
      copyPasteUnsubHandle?.();
      detectorUnsubHandle?.();
      taskUnsubHandle?.();
    };
    // We deliberately depend only on stable callbacks so we don't
    // re-subscribe on every state change.
  }, [elapsedSeconds, wallToElapsed, enqueueAppend, enqueuePatch]);

  const startRecording = useCallback(() => {
    setRecording(true);
    if (pauseStartRef.current != null) {
      pauseAccumRef.current += (Date.now() - pauseStartRef.current) / 1000;
      pauseStartRef.current = null;
    }
  }, []);

  const pauseRecording = useCallback(() => {
    setRecording(false);
    if (pauseStartRef.current == null) {
      pauseStartRef.current = Date.now();
    }
  }, []);

  const toggleRecording = useCallback(() => {
    if (recordingRef.current) pauseRecording();
    else startRecording();
  }, [pauseRecording, startRecording]);

  const reset = useCallback(() => {
    pendingAppendsRef.current = [];
    pendingPatchesRef.current = new Map();
    setEvents([]);
    openSpansRef.current.clear();
    lastTaskRequestTsRef.current = 0;
    setTaskToast(null);
    startMsRef.current = Date.now();
    pauseAccumRef.current = 0;
    pauseStartRef.current = recordingRef.current ? null : Date.now();
    setNow(0);
  }, []);

  const goLive = useCallback(() => setLive(true), []);
  const goManual = useCallback(() => setLive(false), []);

  // Bucket events by source so each track gets its own array. Memoized so
  // tracks only rebuild when the event log actually changes.
  const tracks = useMemo(() => {
    const grouped = {};
    TRACK_DEFINITIONS.forEach((def) => { grouped[def.id] = []; });
    for (const evt of events) {
      if (!grouped[evt.source]) grouped[evt.source] = [];
      grouped[evt.source].push(evt);
    }
    return grouped;
  }, [events]);

  const duration = useMemo(() => {
    if (events.length === 0) return Math.max(now, 1);
    const last = events[events.length - 1];
    const lastT = Math.max(last.presentation_time, last.endTime ?? 0);
    return Math.max(lastT, now, 1);
  }, [events, now]);

  return {
    isElectron,
    recording,
    live,
    now,
    duration,
    events,
    taskToast,
    tracks,
    trackDefinitions: TRACK_DEFINITIONS,
    trackById: TRACK_BY_ID,
    startRecording,
    pauseRecording,
    toggleRecording,
    reset,
    goLive,
    goManual,
    setLive,
  };
}

const DEFAULT_RATES = { screenFps: 10, cameraFps: 10 };

/** Mirror the main-process preview capture rates for the timeline UI. */
export function usePreviewFps() {
  const [rates, setRates] = useState(DEFAULT_RATES);

  useEffect(() => {
    if (!window.ausm?.getPreviewFps) return undefined;

    let cancelled = false;
    window.ausm.getPreviewFps().then((next) => {
      if (!cancelled && next) setRates(next);
    });
    const cleanup = window.ausm.onPreviewFps?.((next) => {
      if (next) setRates(next);
    });
    return () => {
      cancelled = true;
      if (typeof cleanup === "function") cleanup();
    };
  }, []);

  const setScreenFps = useCallback((fps) => {
    window.ausm?.setPreviewFps?.({ screenFps: fps });
  }, []);

  const setCameraFps = useCallback((fps) => {
    window.ausm?.setPreviewFps?.({ cameraFps: fps });
  }, []);

  return {
    screenFps: rates.screenFps,
    cameraFps: rates.cameraFps,
    setScreenFps,
    setCameraFps,
  };
}
