import { app, BrowserWindow } from "electron";
import * as path from "path";
import { setupAUSMElectronBridge } from "@ausm/ausm/bridge/electron";
import { isDev, ausmLogging } from "../config";
import { appState } from "../state";
import { ausmRuntime } from "../runtime";
import { attachPreloadErrorLogging, rendererPreferences } from "../renderer";

export function setDockVisible(visible: boolean): void {
  if (process.platform !== "darwin") return;
  if (visible) {
    app.dock.show();
  } else {
    app.dock.hide();
  }
}

export function createTimelineWindow(): void {
  if (appState.timelineWindow && !appState.timelineWindow.isDestroyed()) {
    setDockVisible(true);
    appState.timelineWindow.focus();
    return;
  }

  // Accessory (dock-hidden) apps are omitted from Cmd+Tab / Mission Control.
  // Show the dock before creating the window so it participates as a regular app.
  setDockVisible(true);

  appState.timelineWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 760,
    minHeight: 520,
    skipTaskbar: false,
    // No grey title bar: the page's own frosted header holds the traffic lights,
    // and the window opens on the page color instead of flashing white.
    titleBarStyle: "hiddenInset",
    trafficLightPosition: { x: 18, y: 18 },
    backgroundColor: "#f6f6f4",
    webPreferences: rendererPreferences(path.join(__dirname, "preload.js")),
  });
  attachPreloadErrorLogging(appState.timelineWindow, "Timeline");
  if (isDev) {
    appState.timelineWindow.loadURL("http://localhost:3002/");
  } else {
    appState.timelineWindow.loadFile(
      path.join(__dirname, "../ui/timeline/index.html"),
    );
  }

  appState.timelineWindow.on("closed", () => {
    appState.timelineWindow = null;
    setDockVisible(false);
  });

  setupAUSMElectronBridge(appState.timelineWindow, ausmRuntime, {
    logging: ausmLogging,
  });

  console.log("[Main] Timeline window created");
}

export function destroyTimelineWindow(): void {
  if (appState.timelineWindow && !appState.timelineWindow.isDestroyed()) {
    appState.timelineWindow.destroy();
  }
  appState.timelineWindow = null;
}
