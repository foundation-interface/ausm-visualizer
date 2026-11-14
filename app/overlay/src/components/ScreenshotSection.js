import React, { useState, useRef, useEffect, memo } from 'react';
import { LIVE, QUIET } from './palette';
import ScreenBoundOverlay from './ScreenBoundOverlay';
import { isOnDisplay, toOverlayRect } from './displayUtils';

const SCREENSHOT_COLORS = {
  SCREENSHOT_STARTED: LIVE,
  SCREENSHOT_UPDATED: LIVE,
  SCREENSHOT_FINISHED: QUIET,
};

function getColor(status) {
  return SCREENSHOT_COLORS[status] || QUIET;
}

function ScreenshotSectionInner({ screenOrigin, displayBounds, scaleX, scaleY }) {
  const [current, setCurrent] = useState(null);
  const [boundsVisible, setBoundsVisible] = useState(false);
  const [finished, setFinished] = useState(null);
  const [finishedVisible, setFinishedVisible] = useState(false);
  const boundsTimer = useRef(null);
  const finishedTimer = useRef(null);
  const displayBoundsRef = useRef(displayBounds);

  displayBoundsRef.current = displayBounds;

  useEffect(() => {
    if (!window.ausm?.onScreenshot) return;
    return window.ausm.onScreenshot((event) => {
      const bounds = event.bounds;
      if (bounds && !isOnDisplay(bounds, displayBoundsRef.current)) return;

      if (boundsTimer.current) clearTimeout(boundsTimer.current);
      setCurrent(event);
      setBoundsVisible(true);
      boundsTimer.current = setTimeout(() => setBoundsVisible(false), 3000);

      const hasImage = event.imageUrl || event.imageData;
      if (event.status === 'SCREENSHOT_FINISHED' && hasImage) {
        if (finishedTimer.current) clearTimeout(finishedTimer.current);
        setFinished(event);
        setFinishedVisible(true);
        finishedTimer.current = setTimeout(() => setFinishedVisible(false), 8000);
      }
    });
  }, []);

  useEffect(() => () => {
    if (boundsTimer.current) clearTimeout(boundsTimer.current);
    if (finishedTimer.current) clearTimeout(finishedTimer.current);
  }, []);

  return (
    <>
      {boundsVisible && current?.bounds && (() => {
        const rect = toOverlayRect(current.bounds, { screenOrigin, scaleX, scaleY });
        return (
        <>
          <ScreenBoundOverlay
            bounds={current.bounds}
            screenOrigin={screenOrigin}
            scaleX={scaleX}
            scaleY={scaleY}
            borderColor={getColor(current.status)}
            backgroundColor={getColor(current.status).replace(/[\d.]+\)$/, '0.08)')}
            borderStyle="dashed"
            borderWidth={3}
            borderRadius={6}
            zIndex={996}
            id={`screenshot-${current.eventID || '0'}`}
          />
          <div
            className="window-label screenshot-label"
            style={{
              left: rect?.x ?? 0,
              top: (rect?.y ?? 0) - 28,
              background: getColor(current.status).replace(/[\d.]+\)$/, '0.9)'),
              maxWidth: rect?.width,
            }}
          >
            <span className="window-label-display-badge">Screenshot</span>
            <span className="window-label-app">
              {current.type?.replace('_', ' ') || 'Unknown'}
            </span>
            <span className="window-label-state">
              {current.status?.replace('SCREENSHOT_', '') || '—'}
            </span>
            <span className="window-label-coords">
              ({Math.round(current.bounds.x)}, {Math.round(current.bounds.y)}) {Math.round(current.bounds.width)}×{Math.round(current.bounds.height)}
            </span>
          </div>
        </>
        );
      })()}
      {finishedVisible && finished && (finished.imageUrl || finished.imageData) && (
        <div className="screenshot-panel">
          <div className="panel-header">Screenshot Captured</div>
          <div
            className="screenshot-panel-item"
            style={{ borderLeft: `4px solid ${getColor(finished.status)}` }}
          >
            <div className="screenshot-panel-meta">
              <span className="screenshot-panel-type-badge" style={{ background: getColor(finished.status) }}>
                {finished.type?.replace('_', ' ') || 'Screenshot'}
              </span>
              {(finished.imageWidth || finished.imageData?.width) && (
                <span className="screenshot-panel-dims">
                  {finished.imageWidth || finished.imageData?.width}×{finished.imageHeight || finished.imageData?.height}
                </span>
              )}
              <span className="screenshot-panel-time">
                {finished.timestamp != null
                  ? new Date(finished.timestamp).toLocaleTimeString(undefined, { hour12: false })
                  : ''}
              </span>
            </div>
            <img
              src={finished.imageUrl || `data:${finished.imageData?.mimeType || 'image/jpeg'};base64,${finished.imageData?.dataBase64}`}
              alt="Screenshot capture"
              className="screenshot-panel-image"
              title={`${finished.imageWidth || finished.imageData?.width || '?'}×${finished.imageHeight || finished.imageData?.height || '?'}`}
            />
            {finished.bounds && (
              <div className="screenshot-panel-bounds">
                ({Math.round(finished.bounds.x)}, {Math.round(finished.bounds.y)}) {Math.round(finished.bounds.width)}×{Math.round(finished.bounds.height)}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

const ScreenshotSection = memo(ScreenshotSectionInner);
export default ScreenshotSection;
