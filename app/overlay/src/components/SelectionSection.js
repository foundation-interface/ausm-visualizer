import React, { useState, useRef, useEffect, memo } from 'react';
import ScreenBoundOverlay from './ScreenBoundOverlay';
import { isOnDisplay } from './displayUtils';
import { LIVE, LIVE_SOFT, QUIET } from './palette';

// Older selections fade instead of changing hue.
function getSelectionColor(index) {
  const opacity = Math.max(0.3, 0.9 - index * 0.15);
  return `hsla(212, 60%, 56%, ${opacity})`;
}

// A settled highlight is solid accent; one still moving is softer.
function getHighlightColor(highlight) {
  return highlight.stable ? LIVE : LIVE_SOFT;
}

function SelectionSectionInner({ screenOrigin, displayId, displayBounds, scaleX, scaleY }) {
  const [current, setCurrent] = useState(null);
  const [visible, setVisible] = useState(false);
  const [highlights, setHighlights] = useState([]);
  const timerRef = useRef(null);
  const displayBoundsRef = useRef(displayBounds);
  const displayIdRef = useRef(displayId);

  displayBoundsRef.current = displayBounds;
  displayIdRef.current = displayId;

  useEffect(() => {
    const cleanups = [];
    if (window.ausm?.onTextSelection) {
      cleanups.push(window.ausm.onTextSelection((event) => {
        if (!isOnDisplay(event.screenBound, displayBoundsRef.current)) return;
        if (timerRef.current) clearTimeout(timerRef.current);
        setCurrent(event);
        setVisible(true);
        timerRef.current = setTimeout(() => setVisible(false), 3000);
      }));
    }
    if (window.ausm?.onTextHighlight) {
      cleanups.push(window.ausm.onTextHighlight((event) => {
        if (event?.highlights) {
          const did = displayIdRef.current;
          if (did !== null && event.displayID) {
            const match = event.displayID.match(/display-(\d+)/);
            const eventDisplayId = match ? parseInt(match[1], 10) : null;
            if (eventDisplayId !== null && eventDisplayId !== did) return;
          }
          setHighlights(event.highlights.filter(h => h.bbox));
        }
      }));
    }
    return () => cleanups.forEach(fn => fn?.());
  }, []);

  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);

  return (
    <>
      {visible && current && (
        <ScreenBoundOverlay
          bounds={current.sourceElement?.screenBounds}
          screenOrigin={screenOrigin}
          scaleX={scaleX}
          scaleY={scaleY}
          borderColor={QUIET}
          backgroundColor="transparent"
          borderStyle="dashed"
          borderWidth={1.5}
          borderRadius={6}
          zIndex={999}
          id={`element-${current.eventID || '0'}`}
        />
      )}
      {visible && current && (
        <ScreenBoundOverlay
          bounds={current.screenBound}
          screenOrigin={screenOrigin}
          scaleX={scaleX}
          scaleY={scaleY}
          borderColor={getSelectionColor(0)}
          backgroundColor={getSelectionColor(0).replace(/[\d.]+\)$/, '0.1)')}
          borderStyle="solid"
          borderWidth={2}
          borderRadius={4}
          zIndex={1000}
          id={current.eventID || 'bound-0'}
        />
      )}
      {highlights.map((highlight, index) => (
        <ScreenBoundOverlay
          key={`highlight-${highlight.trackId}`}
          bounds={highlight.bbox}
          screenOrigin={{ x: 0, y: 0 }}
          scaleX={scaleX}
          scaleY={scaleY}
          borderColor={getHighlightColor(highlight)}
          backgroundColor={getHighlightColor(highlight).replace(/[\d.]+\)$/, '0.15)')}
          borderStyle="solid"
          borderWidth={3}
          borderRadius={4}
          zIndex={1001 + index}
          id={`highlight-${highlight.trackId}`}
        />
      ))}
      {highlights.length > 0 && (
        <div className="highlight-count">
          {highlights.length} highlight{highlights.length !== 1 ? 's' : ''} detected
        </div>
      )}
      {visible && current && (
        <div className="selections-panel">
          <div className="panel-header">Selection</div>
          <div className="selection-item" style={{ borderLeft: `3px solid ${getSelectionColor(0)}` }}>
            <div className="selection-text">
              {current.selectedText?.slice(0, 50)}
              {current.selectedText?.length > 50 ? '...' : ''}
            </div>
            <div className="selection-meta">
              <div>{current.sourceElement?.applicationLocalizedName || 'Unknown app'}</div>
              <div className="selection-meta-secondary">
                {current.sourceElement?.type || 'Unknown type'}
              </div>
              {current.screenBound && (
                <div className="selection-meta-secondary">
                  Position: ({current.screenBound.x}, {current.screenBound.y})
                </div>
              )}
              <div className="selection-meta-secondary">
                Source: {current.detectionSource || 'UNKNOWN'}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

const SelectionSection = memo(SelectionSectionInner);
export default SelectionSection;
