import React, {
  useEffect,
  useRef,
  useMemo,
  useCallback,
  useState,
} from "react";
import { TRACK_LABEL_WIDTH } from "../layout";

function VisualizerTimeline({
  minTime,
  maxTime,
  xScale,
  height,
  scrollContainerRef, // Reference to the scroll container for listening to scroll events
}) {
  const canvasRef = useRef(null);
  const timelineContainerRef = useRef(null);
  const scrollLeftRef = useRef(0);
  const rafIdRef = useRef(null);
  const retryCountRef = useRef(0);
  const [isReady, setIsReady] = useState(false);
  const tickHeight = 4;
  const trackPaddingLeft = TRACK_LABEL_WIDTH;

  // m:ss, with tenths when the ticks are closer than a second apart.
  const formatTime = (seconds, interval = 1) => {
    const mins = Math.floor(seconds / 60);
    const rest = seconds - mins * 60;
    const secs = interval < 1 ? rest.toFixed(1).padStart(4, "0") : String(Math.floor(rest)).padStart(2, "0");
    return `${mins}:${secs}`;
  };

  // Calculate adaptive tick interval based on time range and zoom level
  const calculateTickInterval = useCallback(
    (range) => {
      // Aim for approximately one tick every 60-100 pixels
      const targetPixelsPerTick = 80;

      // Estimate pixels per second from the xScale
      // Sample two points to determine scale
      const x1 = xScale(minTime);
      const x2 = xScale(minTime + 1);
      const pixelsPerSecond = Math.abs(x2 - x1);

      // Calculate how many seconds we want per tick
      const secondsPerTick = targetPixelsPerTick / pixelsPerSecond;

      // Round to nice intervals: 0.1, 0.5, 1, 2, 5, 10, 30, 60, 120, 300, 600, etc.
      const niceIntervals = [
        0.1, 0.2, 0.5, 1, 2, 5, 10, 15, 30, 60, 120, 300, 600, 1800, 3600,
      ];

      let bestInterval = niceIntervals[0];
      for (const interval of niceIntervals) {
        if (interval >= secondsPerTick) {
          bestInterval = interval;
          break;
        }
        bestInterval = interval;
      }

      return bestInterval;
    },
    [xScale, minTime]
  );

  // Memoize tick marks - recalculate when time range or scale changes
  const ticks = useMemo(() => {
    const tickArray = [];
    const range = maxTime - minTime;
    const interval = calculateTickInterval(range);

    // Start from a nice round number
    const startTick = Math.ceil(minTime / interval) * interval;

    for (let t = startTick; t <= maxTime + 1e-9; t += interval) {
      tickArray.push(Math.round(t * 1000) / 1000);
    }
    tickArray.interval = interval;
    return tickArray;
  }, [minTime, maxTime, calculateTickInterval]);

  // Draw ticks function - uses current scrollLeft to offset positions
  const drawTicks = useCallback(() => {
    const canvas = canvasRef.current;
    const container = timelineContainerRef.current;

    if (!canvas || !container) {
      // Retry if refs aren't ready yet
      if (retryCountRef.current < 10) {
        retryCountRef.current++;
        setTimeout(() => requestAnimationFrame(drawTicks), 50);
      }
      return;
    }

    if (ticks.length === 0) return;

    try {
      const scrollLeft = scrollLeftRef.current;

      // Get the scroll container for viewport width
      const scrollContainer = scrollContainerRef?.current;
      const viewportWidth = scrollContainer
        ? scrollContainer.clientWidth
        : container.clientWidth || container.offsetWidth || 800;

      const canvasWidth = viewportWidth;
      const canvasHeight = height || 30;

      if (
        !canvasWidth ||
        !canvasHeight ||
        canvasWidth <= 0 ||
        canvasHeight <= 0
      ) {
        // Retry if dimensions aren't ready
        if (retryCountRef.current < 10) {
          retryCountRef.current++;
          setTimeout(() => requestAnimationFrame(drawTicks), 50);
        }
        return;
      }

      // Reset retry count on success
      retryCountRef.current = 0;
      if (!isReady) setIsReady(true);

      // Set canvas size (accounting for device pixel ratio)
      const dpr = window.devicePixelRatio || 1;
      const expectedWidth = Math.floor(canvasWidth * dpr);
      const expectedHeight = Math.floor(canvasHeight * dpr);

      if (canvas.width !== expectedWidth || canvas.height !== expectedHeight) {
        canvas.width = expectedWidth;
        canvas.height = expectedHeight;
        canvas.style.width = `${canvasWidth}px`;
        canvas.style.height = `${canvasHeight}px`;
      }

      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      ctx.setTransform(1, 0, 0, 1, 0, 0); // Reset transform
      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, canvasWidth, canvasHeight);

      // Draw tick marks and labels
      // Ruler ink matches the faint text step, so it reads as scale, not content.
      ctx.strokeStyle = "rgba(15, 23, 42, 0.14)";
      ctx.fillStyle = "#a1a1a6";
      ctx.font = '500 10px "Barlow", -apple-system, sans-serif';
      ctx.textAlign = "center";
      ctx.textBaseline = "top";
      ctx.lineWidth = 1;

      // Draw only visible ticks (virtual rendering)
      ticks.forEach((tick) => {
        const scaledPos = xScale(tick);
        if (!isFinite(scaledPos)) return;

        // Calculate position: add trackPaddingLeft to match track content offset
        // Subtract scrollLeft because canvas is sticky (doesn't scroll with content)
        const xPosition = scaledPos + trackPaddingLeft - scrollLeft;

        // Only draw if within visible area (with some margin)
        if (xPosition >= -50 && xPosition <= canvasWidth + 50) {
          ctx.beginPath();
          ctx.moveTo(xPosition, 0);
          ctx.lineTo(xPosition, tickHeight);
          ctx.stroke();

          ctx.fillText(formatTime(tick, ticks.interval), xPosition, 7);
        }
      });
    } catch (error) {
      console.error("Error drawing canvas ticks:", error);
    }
  }, [ticks, xScale, height, scrollContainerRef, isReady]);

  // Initial draw and redraw on dependencies change
  useEffect(() => {
    retryCountRef.current = 0;
    // Wait for layout to complete with multiple RAF calls
    const timeoutId = setTimeout(() => {
      requestAnimationFrame(() => {
        requestAnimationFrame(drawTicks);
      });
    }, 0);

    return () => clearTimeout(timeoutId);
  }, [drawTicks]);

  // Listen to scroll events on the scroll container
  useEffect(() => {
    const scrollContainer = scrollContainerRef?.current;
    if (!scrollContainer) {
      // Retry after a short delay if scroll container isn't ready
      const timeoutId = setTimeout(() => {
        if (scrollContainerRef?.current) {
          scrollLeftRef.current = scrollContainerRef.current.scrollLeft;
          drawTicks();
        }
      }, 100);
      return () => clearTimeout(timeoutId);
    }

    const handleScroll = () => {
      scrollLeftRef.current = scrollContainer.scrollLeft;

      // Use RAF to batch redraws and avoid jank
      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current);
      }
      rafIdRef.current = requestAnimationFrame(drawTicks);
    };

    scrollContainer.addEventListener("scroll", handleScroll, { passive: true });

    // Initial scroll position
    scrollLeftRef.current = scrollContainer.scrollLeft;
    drawTicks();

    return () => {
      scrollContainer.removeEventListener("scroll", handleScroll);
      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current);
      }
    };
  }, [scrollContainerRef, drawTicks]);

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current);
      }
      rafIdRef.current = requestAnimationFrame(drawTicks);
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [drawTicks]);

  return (
    <div
      ref={timelineContainerRef}
      className="tl-ruler"
      style={{
        height: `${height}px`,
      }}
    >
      {/* Fixed-size canvas that redraws based on scroll */}
      <canvas ref={canvasRef} className="tl-ruler__canvas" />
    </div>
  );
}

export default React.memo(VisualizerTimeline);
