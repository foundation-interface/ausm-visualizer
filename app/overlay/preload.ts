/**
 * Overlay renderer preload.
 *
 * Call exposeAUSM() so window.ausm is the full AUSM API. Host-only
 * methods live on window.overlay.
 */
import { contextBridge } from "electron";
import { exposeAUSM } from "@ausm/ausm/bridge/preload-api";

try {
  exposeAUSM();
} catch (error) {
  console.error("[Preload] Failed to expose window.ausm:", error);
}

contextBridge.exposeInMainWorld("overlay", {
  appName: () => "Overlay",
});
