/**
 * ausm visualizer: Electron host for the timeline and overlay apps.
 *
 * Layout:
 *   main.ts              — Electron main process
 *   timeline/            — timeline app (window, preload, renderer)
 *   overlay/             — overlay app (windows, preload, renderer)
 *   assets/              — tray icon
 *
 * Shared host:
 *   config.ts            — logging + material blacklist
 *   state.ts             — shared window/tray refs
 *   runtime.ts           — AUSM runtime construction
 *   tray.ts              — menu-bar tray
 *   startupTimer.ts      — startup profiling
 */
import "./env";
import { app, ipcMain } from "electron";
import { setupAUSMIPCHandlers } from "ausm/bridge/electron";
import { isDev, ausmLogging } from "./config";
import { appState } from "./state";
import { ausmRuntime } from "./runtime";
import {
  setDockVisible,
  destroyTimelineWindow,
} from "./timeline/window";
import {
  setupDisplayChangeListeners,
  setupSpaceChangeHandling,
  destroyOverlayWindows,
} from "./overlay/windows";
import { createTray, destroyTray } from "./tray";
import { StartupTimer } from "./startupTimer";

const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  console.log("[Main] Another instance is already running, quitting...");
  app.quit();
} else {
  app.on("second-instance", () => {
    console.log("[Main] Second instance detected, focusing existing window");
    if (appState.timelineWindow) {
      setDockVisible(true);
      if (appState.timelineWindow.isMinimized()) {
        appState.timelineWindow.restore();
      }
      appState.timelineWindow.focus();
    }
  });
}

app.whenReady().then(async () => {
  const timer = new StartupTimer();

  if (!gotTheLock) {
    return;
  }

  if (process.platform === "darwin") {
    app.dock.hide();
  }

  timer.checkpoint("App ready & dock hidden");

  await ausmRuntime.initialize();
  timer.checkpoint("AUSM runtime initialized");
  console.log(
    `[Main] Material manager running: ${ausmRuntime.isMaterialManagerRunning()}`,
  );
  const httpUrl = ausmRuntime.getHttpUrl();
  console.log(`[Main] AUSM HTTP host: ${httpUrl ?? "(disabled)"}`);

  const streamingService = ausmRuntime.getScreenStreamingService();
  if (streamingService) {
    streamingService
      .getDisplays()
      .then((displays: any[]) => {
        console.log(
          "[Main] Screen streaming displays:",
          displays
            .map(
              (d: any) => `${d.id} (${d.width}x${d.height}, main=${d.isMain})`,
            )
            .join(", "),
        );
      })
      .catch((err: any) => {
        console.warn("[Main] Failed to get displays:", err.message);
      });
    streamingService
      .isStreaming()
      .then((isStreaming: boolean) => {
        console.log("[Main] Screen streaming active:", isStreaming);
      })
      .catch(() => {});
  } else {
    console.log("[Main] Screen streaming service not available");
  }
  timer.checkpoint("Screen streaming status checked");

  const cameraService = ausmRuntime.getCameraStreamingService();
  if (cameraService) {
    cameraService
      .getDevices()
      .then((devices: any[]) => {
        console.log(
          "[Main] Camera streaming devices:",
          devices
            .map(
              (d: any) =>
                `${d.name ?? d.id} (${d.position ?? "unspecified"}, active=${d.active})`,
            )
            .join(", ") || "(none)",
        );
      })
      .catch((err: any) => {
        console.warn("[Main] Failed to get cameras:", err.message);
      });
    cameraService
      .isStreaming()
      .then((isStreaming: boolean) => {
        console.log("[Main] Camera streaming active:", isStreaming);
      })
      .catch(() => {});
  } else {
    console.log("[Main] Camera streaming service not available");
  }
  timer.checkpoint("Camera streaming status checked");

  setupAUSMIPCHandlers(ipcMain, ausmRuntime, {
    logging: { ...ausmLogging, global_default: isDev },
  });
  timer.checkpoint("AUSM IPC handlers setup");

  createTray();
  timer.checkpoint("System tray created");

  setupDisplayChangeListeners();
  timer.checkpoint("Display listeners setup");

  setupSpaceChangeHandling(ausmRuntime);
  timer.checkpoint("Space change handling setup");

  timer.summary();

  console.log("[Main] App ready - click menu bar icon to open windows");

  app.on("activate", () => {
    if (!appState.tray) {
      createTray();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    if (!appState.tray) {
      app.quit();
    }
  }
});

app.on("before-quit", () => {
  console.log("[Main] App quitting...");

  destroyTray();
  destroyTimelineWindow();
  destroyOverlayWindows();

  ausmRuntime.shutdown();

  console.log("[Main] Cleanup complete");
});

console.log("[Main] ausm visualizer starting...");
console.log(
  "[Main] Native selection monitoring:",
  process.platform === "darwin" ? "enabled" : "not available (macOS only)",
);
