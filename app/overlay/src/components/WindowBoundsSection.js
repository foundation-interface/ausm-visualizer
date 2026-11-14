import React, { useRef, useEffect, useCallback, memo } from 'react';
import { LIVE, QUIET } from './palette';
import { isOnDisplay, toOverlayRect } from './displayUtils';

const WINDOW_STATE_COLORS = {
  FOCUSED: LIVE,
  UNFOCUSED: QUIET,
  APPEAR: QUIET,
  VANISHED: QUIET,
  BOUNDS_CHANGED: QUIET,
  TITLE_CHANGED: QUIET,
};

function getColor(state) {
  return WINDOW_STATE_COLORS[state] || QUIET;
}

function WindowBoundsSectionInner({ screenOrigin, displayId, displayBounds, scaleX, scaleY }) {
  const boxRef = useRef(null);
  const labelRef = useRef(null);
  const spanRefs = useRef({});
  const timerRef = useRef(null);
  const cacheRef = useRef(new Map());
  const pendingRef = useRef(null);
  const rafRef = useRef(null);
  const propsRef = useRef({ screenOrigin, displayId, displayBounds, scaleX, scaleY });

  propsRef.current = { screenOrigin, displayId, displayBounds, scaleX, scaleY };

  const flush = useCallback(() => {
    rafRef.current = null;
    const data = pendingRef.current;
    if (!data) return;
    pendingRef.current = null;

    const { x, y, w, h, color, bgColor, labelBg, displayIdText, app, title, coords, stateText } = data;

    const box = boxRef.current;
    if (box) {
      box.style.transform = `translate(${x}px, ${y}px)`;
      box.style.width = `${w}px`;
      box.style.height = `${h}px`;
      box.style.borderColor = color;
      box.style.backgroundColor = bgColor;
      box.style.display = '';
    }

    const label = labelRef.current;
    if (label) {
      label.style.transform = `translate(${x}px, ${y - 28}px)`;
      label.style.background = labelBg;
      label.style.maxWidth = `${w}px`;
      label.style.display = '';
    }
    const s = spanRefs.current;
    if (s.display) s.display.textContent = displayIdText;
    if (s.app) s.app.textContent = app;
    if (s.title) s.title.textContent = title;
    if (s.coords) s.coords.textContent = coords;
    if (s.state) s.state.textContent = stateText;
  }, []);

  useEffect(() => {
    if (!window.ausm?.onWindowState) return;

    const hide = () => {
      if (boxRef.current) boxRef.current.style.display = 'none';
      if (labelRef.current) labelRef.current.style.display = 'none';
    };

    hide();

    const cleanup = window.ausm.onWindowState((event) => {
      const cache = cacheRef.current;
      const key = event.windowId ?? event.eventID ?? `${event.application ?? ''}-${event.title ?? ''}`;
      if (event.bounds) cache.set(key, event.bounds);
      const bounds = event.bounds ?? cache.get(key);
      if (!bounds) return;

      const { screenOrigin: so, displayId: did, displayBounds: db, scaleX: sx, scaleY: sy } = propsRef.current;

      if (db) {
        if (!isOnDisplay(bounds, db)) return;
      } else if (did !== null && event.displayId !== undefined) {
        if (event.displayId !== did) return;
      }

      const color = getColor(event.state);
      const rect = toOverlayRect(bounds, { screenOrigin: so, scaleX: sx, scaleY: sy });
      if (!rect) return;

      pendingRef.current = {
        x: rect.x,
        y: rect.y,
        w: rect.width,
        h: rect.height,
        color,
        bgColor: color.replace(/[\d.]+\)$/, '0.05)'),
        labelBg: color.replace(/[\d.]+\)$/, '0.9)'),
        displayIdText: `Display ${event.displayId ?? '?'}`,
        app: event.application || 'Unknown',
        title: (event.title?.slice(0, 50) || 'Untitled') + (event.title?.length > 50 ? '...' : ''),
        coords: `(${Math.round(bounds.x)}, ${Math.round(bounds.y)}) ${Math.round(bounds.width)}×${Math.round(bounds.height)}`,
        stateText: event.state,
      };

      if (!rafRef.current) {
        rafRef.current = requestAnimationFrame(flush);
      }

      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(hide, 3000);
    });

    return () => {
      cleanup();
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [flush]);

  return (
    <>
      <div
        ref={boxRef}
        style={{
          display: 'none',
          position: 'fixed',
          left: 0,
          top: 0,
          border: '1.5px solid transparent',
          borderRadius: 10,
          pointerEvents: 'none',
          zIndex: 998,
          willChange: 'transform',
          contain: 'layout style',
        }}
      />
      <div
        ref={labelRef}
        className="window-label"
        style={{ display: 'none', left: 0, top: 0, willChange: 'transform', contain: 'layout style' }}
      >
        <span className="window-label-display-badge" ref={el => { spanRefs.current.display = el; }} />
        <span className="window-label-app" ref={el => { spanRefs.current.app = el; }} />
        <span className="window-label-separator">|</span>
        <span className="window-label-title" ref={el => { spanRefs.current.title = el; }} />
        <span className="window-label-coords" ref={el => { spanRefs.current.coords = el; }} />
        <span className="window-label-state" ref={el => { spanRefs.current.state = el; }} />
      </div>
    </>
  );
}

const WindowBoundsSection = memo(WindowBoundsSectionInner);
export default WindowBoundsSection;
