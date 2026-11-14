import { useEffect, useState } from "react";
import { overlayMetrics } from "../components/displayUtils";

/** Overlay display metrics for the current renderer window. */
export function useScreenInfo() {
  const [info, setInfo] = useState(null);
  const [viewport, setViewport] = useState(() => ({
    width: typeof window !== "undefined" ? window.innerWidth : 1,
    height: typeof window !== "undefined" ? window.innerHeight : 1,
  }));

  useEffect(() => {
    if (!window.ausm?.onScreenInfo) return;
    return window.ausm.onScreenInfo(setInfo);
  }, []);

  useEffect(() => {
    const onResize = () => {
      setViewport({ width: window.innerWidth, height: window.innerHeight });
    };
    window.addEventListener("resize", onResize);
    onResize();
    return () => window.removeEventListener("resize", onResize);
  }, []);

  return overlayMetrics(info, viewport);
}
