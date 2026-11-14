import React, { useState, useEffect, memo } from 'react';
import { INK, FAINT } from './palette';

const CURSOR_COLORS = {
  CLICK: INK,
  DOUBLE_CLICK: INK,
  RIGHT_CLICK: INK,
  SCROLL: INK,
  HOLD_START: INK,
  HOLD_END: INK,
  DRAG: INK,
};

function getColor(action) { return CURSOR_COLORS[action] || FAINT; }

function CursorSectionInner() {
  const [current, setCurrent] = useState(null);

  useEffect(() => {
    if (!window.ausm?.onCursorPlusPlusEvent) return;
    return window.ausm.onCursorPlusPlusEvent((event) => {
      if (event.action !== 'MOVE') setCurrent(event);
    });
  }, []);

  if (!current) return null;

  const color = getColor(current.action);

  return (
    <div className="cursor-panel">
      <div className="panel-header">Cursor++</div>
      <div className="cursor-panel-item" style={{ borderLeft: `4px solid ${color}` }}>
        <div className="cursor-panel-action">
          <span className="cursor-panel-action-badge" style={{ background: color }}>
            {current.action || '—'}
          </span>
          <span className="cursor-panel-coords">
            ({Math.round(current.x ?? 0)}, {Math.round(current.y ?? 0)})
          </span>
        </div>
        <div className="cursor-panel-meta">
          {current.application && (
            <div className="cursor-panel-meta-row">
              <span className="cursor-panel-meta-label">App</span>
              <span>{current.application}</span>
            </div>
          )}
          {current.windowTitle && (
            <div className="cursor-panel-meta-row">
              <span className="cursor-panel-meta-label">Window</span>
              <span>{current.windowTitle.slice(0, 50)}{current.windowTitle.length > 50 ? '…' : ''}</span>
            </div>
          )}
          {current.uiElementRole && (
            <div className="cursor-panel-meta-row">
              <span className="cursor-panel-meta-label">Element</span>
              <span>{current.uiElementRole}{current.uiElementLabel ? `: ${current.uiElementLabel}` : ''}</span>
            </div>
          )}
          {current.holdDurationMs != null && (
            <div className="cursor-panel-meta-row">
              <span className="cursor-panel-meta-label">Hold</span>
              <span>{(current.holdDurationMs / 1000).toFixed(2)} s</span>
            </div>
          )}
          {(current.scrollDeltaX != null || current.scrollDeltaY != null) && (
            <div className="cursor-panel-meta-row">
              <span className="cursor-panel-meta-label">Scroll</span>
              <span>Δx={current.scrollDeltaX ?? 0} Δy={current.scrollDeltaY ?? 0}</span>
            </div>
          )}
          {current.materialId && (
            <div className="cursor-panel-meta-row">
              <span className="cursor-panel-meta-label">Material</span>
              <span className="task-panel-mono">{current.materialId.slice(0, 16)}</span>
            </div>
          )}
        </div>
        {current.interactionScreenshot && (
          <img
            src={`data:${current.interactionScreenshot.mimeType || 'image/jpeg'};base64,${current.interactionScreenshot.dataBase64}`}
            alt="Cursor interaction"
            className="cursor-panel-screenshot"
            title={`${current.interactionScreenshot.width}×${current.interactionScreenshot.height}`}
          />
        )}
      </div>
    </div>
  );
}

const CursorSection = memo(CursorSectionInner);
export default CursorSection;
