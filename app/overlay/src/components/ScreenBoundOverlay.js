import React from 'react';
import { LIVE, LIVE_FILL } from './palette';
import { toOverlayRect } from './displayUtils';

/**
 * Draws a bounding box in the overlay window.
 *
 * `bounds` are AUSM global logical points. They are mapped into this
 * window's CSS pixels via screenOrigin + scaleX/scaleY.
 */
function ScreenBoundOverlay({
  bounds,
  screenOrigin = { x: 0, y: 0 },
  scaleX = 1,
  scaleY = 1,
  borderColor = LIVE,
  backgroundColor = LIVE_FILL,
  borderStyle = 'solid',
  borderWidth = 1.5,
  borderRadius = 6,
  zIndex = 1000,
  id = 'overlay',
}) {
  const rect = toOverlayRect(bounds, { screenOrigin, scaleX, scaleY });
  if (!rect || !rect.width || !rect.height) {
    return null;
  }

  return (
    <div
      key={id}
      style={{
        position: 'fixed',
        left: rect.x,
        top: rect.y,
        width: rect.width,
        height: rect.height,
        border: `${borderWidth}px ${borderStyle} ${borderColor}`,
        borderRadius,
        backgroundColor,
        pointerEvents: 'none',
        transition: 'opacity 0.3s ease',
        zIndex,
      }}
    />
  );
}

export default ScreenBoundOverlay;
