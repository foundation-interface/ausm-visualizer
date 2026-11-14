import React, { useState, useRef, useEffect, memo } from 'react';
import { LIVE, QUIET } from './palette';
import ScreenBoundOverlay from './ScreenBoundOverlay';
import { isOnDisplay, toOverlayRect } from './displayUtils';

const TEXT_INPUT_COLORS = {
  TEXT_EDITING_STARTED: LIVE,
  TEXT_EDITING_UPDATED: LIVE,
  TEXT_EDITING_FINISHED: QUIET,
};

function getColor(status) {
  return TEXT_INPUT_COLORS[status] || QUIET;
}

function TextInputSectionInner({ screenOrigin, displayBounds, scaleX, scaleY }) {
  const [current, setCurrent] = useState(null);
  const [visible, setVisible] = useState(false);
  const timerRef = useRef(null);
  const displayBoundsRef = useRef(displayBounds);

  displayBoundsRef.current = displayBounds;

  useEffect(() => {
    if (!window.ausm?.onTextInput) return;
    return window.ausm.onTextInput((event) => {
      const bounds = event.sourceElement?.screenBounds;
      if (bounds && !isOnDisplay(bounds, displayBoundsRef.current)) return;
      if (timerRef.current) clearTimeout(timerRef.current);
      setCurrent(event);
      setVisible(true);
      timerRef.current = setTimeout(() => setVisible(false), 3000);
    });
  }, []);

  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);

  const bounds = current?.sourceElement?.screenBounds;
  if (!visible || !bounds) return null;

  const color = getColor(current.status);
  const rect = toOverlayRect(bounds, { screenOrigin, scaleX, scaleY });

  return (
    <>
      <ScreenBoundOverlay
        bounds={bounds}
        screenOrigin={screenOrigin}
        scaleX={scaleX}
        scaleY={scaleY}
        borderColor={color}
        backgroundColor={color.replace(/[\d.]+\)$/, '0.05)')}
        borderStyle="solid"
        borderWidth={3}
        borderRadius={6}
        zIndex={997}
        id={`text-input-${current.eventID || '0'}`}
      />
      <div
        className="window-label text-input-label"
        style={{
          left: rect?.x ?? 0,
          top: (rect?.y ?? 0) - 28,
          background: color.replace(/[\d.]+\)$/, '0.9)'),
          maxWidth: rect?.width,
        }}
      >
        <span className="window-label-display-badge">Text input</span>
        <span className="window-label-app">
          {current.sourceElement?.application || current.sourceElement?.applicationLocalizedName || 'Unknown'}
        </span>
        <span className="window-label-separator">|</span>
        <span className="window-label-title">
          {current.sourceElement?.type || 'input'}
        </span>
        <span className="window-label-state">
          {current.status?.replace('TEXT_EDITING_', '') || '—'}
        </span>
        {(current.text != null && current.text !== '') && (
          <span className="window-label-coords" title={current.text}>
            "{String(current.text).slice(-10)}"
          </span>
        )}
      </div>
      <div className="selections-panel text-input-panel">
        <div className="panel-header">Text input</div>
        <div className="selection-item" style={{ borderLeft: `3px solid ${color}` }}>
          <div className="selection-text">
            {current.text != null && current.text !== ''
              ? `"${String(current.text).slice(-10)}"`
              : '(empty)'}
          </div>
          <div className="selection-meta">
            <div>{current.sourceElement?.application || current.sourceElement?.applicationLocalizedName || 'Unknown app'}</div>
            <div className="selection-meta-secondary">
              {current.sourceElement?.type || 'input'} · {current.status?.replace('TEXT_EDITING_', '') || '—'}
            </div>
            {current.caretScreenPosition && (
              <div className="selection-meta-secondary">
                Caret: ({Math.round(current.caretScreenPosition.x)}, {Math.round(current.caretScreenPosition.y)})
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

const TextInputSection = memo(TextInputSectionInner);
export default TextInputSection;
