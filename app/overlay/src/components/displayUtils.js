export function isOnDisplay(bounds, displayBounds) {
  if (!displayBounds || !bounds) return true;
  const centerX = bounds.x + (bounds.width || 0) / 2;
  const centerY = bounds.y + (bounds.height || 0) / 2;
  return (
    centerX >= displayBounds.x &&
    centerX < displayBounds.x + displayBounds.width &&
    centerY >= displayBounds.y &&
    centerY < displayBounds.y + displayBounds.height
  );
}

/**
 * Convert AUSM/Quartz global point bounds into overlay CSS pixels.
 *
 * Window / text-input / screenshot events are in logical points (origin at
 * the top-left of the main display). The overlay BrowserWindow may not be
 * 1:1 with that space — Electron DIP vs AUSM points, Retina scale, or a
 * clamped window — so we scale by the overlay's actual inner size.
 */
export function toOverlayRect(bounds, { screenOrigin, scaleX = 1, scaleY = 1 } = {}) {
  if (!bounds) return null;
  const origin = screenOrigin ?? { x: 0, y: 0 };
  return {
    x: (bounds.x - origin.x) * scaleX,
    y: (bounds.y - origin.y) * scaleY,
    width: (bounds.width || 0) * scaleX,
    height: (bounds.height || 0) * scaleY,
  };
}

export function overlayMetrics(screenInfo, viewport) {
  const displayBounds = screenInfo?.displayBounds ?? {
    x: 0,
    y: 0,
    width: viewport.width,
    height: viewport.height,
  };
  const screenOrigin = screenInfo?.screenOrigin ?? {
    x: displayBounds.x,
    y: displayBounds.y,
  };
  const scaleX =
    displayBounds.width > 0 ? viewport.width / displayBounds.width : 1;
  const scaleY =
    displayBounds.height > 0 ? viewport.height / displayBounds.height : 1;
  return {
    displayId: screenInfo?.displayId ?? null,
    displayBounds,
    screenOrigin,
    scaleX,
    scaleY,
  };
}
