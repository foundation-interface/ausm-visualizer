/**
 * Timeline renderer preload.
 *
 * Call exposeAUSM() so window.ausm is the full AUSM API. Host-only
 * methods live on window.timeline.
 */
import { contextBridge, ipcRenderer } from "electron";
import { exposeAUSM } from "@ausm/ausm/bridge/preload-api";

try {
  exposeAUSM();
} catch (error) {
  console.error("[Preload] Failed to expose window.ausm:", error);
}

for (const channel of [
  "ausm:materialEvent",
  "ausm:detectorEvent",
  "ausm:taskEvent",
]) {
  ipcRenderer.on(channel, (_event, payload) => {
    const kind =
      payload?.materialEventType ||
      payload?.status ||
      payload?.eventType ||
      payload?.detectorName ||
      "";
    console.log(`[Timeline preload] ${channel} ${kind}`);
  });
}

contextBridge.exposeInMainWorld("timeline", {
  appName: () => "Timeline",
  // runtime.ts only starts the camera when AUSM_VISUALIZER_CAMERA=1
  cameraEnabled: process.env.AUSM_VISUALIZER_CAMERA === "1",
});
