import React, { useState, useRef, useEffect, memo } from 'react';
import { INK, FAINT } from './palette';

const COPYPASTE_COLORS = {
  COPY: INK,
  PASTE: INK,
};

function getColor(action) { return COPYPASTE_COLORS[action] || FAINT; }

function CopyPasteSectionInner() {
  const [current, setCurrent] = useState(null);
  const [visible, setVisible] = useState(false);
  const timerRef = useRef(null);

  useEffect(() => {
    if (!window.ausm?.onCopyPasteEvent) return;
    return window.ausm.onCopyPasteEvent((event) => {
      if (timerRef.current) clearTimeout(timerRef.current);
      setCurrent(event);
      setVisible(true);
      timerRef.current = setTimeout(() => setVisible(false), 5000);
    });
  }, []);

  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);

  if (!visible || !current) return null;

  const color = getColor(current.action);

  return (
    <div className="copy-paste-panel">
      <div className="panel-header">Copy / Paste</div>
      <div className="copy-paste-panel-item" style={{ borderLeft: `4px solid ${color}` }}>
        <div className="copy-paste-panel-action">
          <span className="copy-paste-panel-action-badge" style={{ background: color }}>
            {current.action || 'COPY'}
          </span>
          {current.contentType && (
            <span className="copy-paste-panel-type-badge">{current.contentType}</span>
          )}
          {current.changeCount != null && (
            <span className="copy-paste-panel-meta">changeCount: {current.changeCount}</span>
          )}
          <span className="copy-paste-panel-time">
            {current.timestamp != null
              ? new Date(current.timestamp).toLocaleTimeString(undefined, { hour12: false })
              : ''}
          </span>
        </div>
        {current.content != null && current.content !== '' && (
          <div className="copy-paste-panel-content">
            {current.content.length > 200 ? `${current.content.slice(0, 200)}…` : current.content}
          </div>
        )}
        {current.contentPaths && current.contentPaths.length > 0 && (
          <div className="copy-paste-panel-paths">
            {current.contentPaths.slice(0, 3).map((p, i) => (
              <div key={i} className="copy-paste-panel-path-item">{p.split('/').pop()}</div>
            ))}
            {current.contentPaths.length > 3 && (
              <div className="copy-paste-panel-path-item">+{current.contentPaths.length - 3} more</div>
            )}
          </div>
        )}
        {(current.content != null && current.content !== '') && (
          <div className="copy-paste-panel-footer">{current.content.length} chars</div>
        )}
      </div>
    </div>
  );
}

const CopyPasteSection = memo(CopyPasteSectionInner);
export default CopyPasteSection;
