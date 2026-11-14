import { BrowserWindow, screen } from "electron";
import * as path from "path";
import { setupAUSMElectronBridge } from "ausm/bridge/electron";
import { isDev, ausmLogging } from "../config";
import { appState } from "../state";
import { ausmRuntime } from "../runtime";
import type { AusmRuntime } from "../runtime";
import { attachPreloadErrorLogging, rendererPreferences } from "../renderer";

let overlayChangeListener: (() => void) | null = null;

/** Tray registers this so overlay open/close can refresh the menu without a cycle. */
export function onOverlayChange(listener: () => void): void {
  overlayChangeListener = listener;
}

function notifyOverlayChange(): void {
  overlayChangeListener?.();
}

export function getDisplayKey(bounds: {
  x: number;
  y: number;
  width: number;
  height: number;
}): string {
  return `${bounds.x},${bounds.y},${bounds.width}x${bounds.height}`;
}

export function isOverlayOpen(): boolean {
  return appState.overlayWindows.size > 0;
}

function ausmLogicalBounds(
  electronDisplay: Electron.Display,
  ausmDisplays: Array<{
    displayId?: number;
    originX?: number;
    originY?: number;
    logicalWidth?: number;
    logicalHeight?: number;
    scaleFactor?: number;
    isMain?: boolean;
  }>,
): { x: number; y: number; width: number; height: number } | null {
  const byId = ausmDisplays.find((d) => d.displayId === electronDisplay.id);
  const match =
    byId ??
    ausmDisplays
      .slice()
      .sort((a, b) => {
        const score = (d: (typeof ausmDisplays)[number]) =>
          Math.abs((d.logicalWidth ?? 0) - electronDisplay.bounds.width) +
          Math.abs((d.logicalHeight ?? 0) - electronDisplay.bounds.height) +
          Math.abs((d.originX ?? 0) - electronDisplay.bounds.x) +
          Math.abs((d.originY ?? 0) - electronDisplay.bounds.y);
        return score(a) - score(b);
      })[0];
  if (
    match &&
    Number.isFinite(match.originX) &&
    Number.isFinite(match.originY) &&
    Number.isFinite(match.logicalWidth) &&
    Number.isFinite(match.logicalHeight) &&
    (match.logicalWidth ?? 0) > 0 &&
    (match.logicalHeight ?? 0) > 0
  ) {
    return {
      x: match.originX as number,
      y: match.originY as number,
      width: match.logicalWidth as number,
      height: match.logicalHeight as number,
    };
  }
  return null;
}

export function createOverlayWindows(): void {
  if (appState.overlayWindows.size > 0) {
    console.log("[Main] Overlay windows already exist");
    return;
  }

  void createOverlayWindowsAsync();
}

async function createOverlayWindowsAsync(): Promise<void> {
  if (appState.overlayWindows.size > 0) {
    return;
  }

  const allDisplays = screen.getAllDisplays();
  const primaryDisplay = screen.getPrimaryDisplay();
  const ausmDisplays = await ausmRuntime.getScreenDisplays().catch(() => []);

  console.log("[Main] AUSM displays:");
  ausmDisplays.forEach((d, i) => {
    console.log(
      `  [${i}] id=${d.id} cg=${d.displayId} logical=(${d.originX},${d.originY}) ${d.logicalWidth}x${d.logicalHeight} capture=${d.width}x${d.height} scale=${d.scaleFactor} main=${d.isMain}`,
    );
  });

  console.log("[Main] Detected displays:");
  allDisplays.forEach((d, i) => {
    console.log(
      `  [${i}] id=${d.id}, bounds=(${d.bounds.x},${d.bounds.y}) ${d.bounds.width}x${d.bounds.height}, internal=${d.internal}, scaleFactor=${d.scaleFactor}`,
    );
  });

  const validDisplays = allDisplays.filter(
    (d) => d.bounds.width >= 800 && d.bounds.height >= 600,
  );

  console.log(
    `[Main] Creating overlay windows for ${validDisplays.length} valid displays (filtered from ${allDisplays.length}):`,
  );

  validDisplays.forEach((display, index) => {
    const bounds = display.bounds;
    const workArea = display.workArea;
    const menuBarHeight = workArea.y - bounds.y;

    console.log(
      `  Display ${index}: id=${display.id}, bounds=(${bounds.x}, ${bounds.y}) ${bounds.width}x${bounds.height}, menuBar=${menuBarHeight}`,
    );

    const overlayWindow = new BrowserWindow({
      width: bounds.width,
      height: bounds.height,
      x: bounds.x,
      y: bounds.y,
      frame: false,
      transparent: true,
      alwaysOnTop: true,
      resizable: false,
      skipTaskbar: true,
      hasShadow: false,
      enableLargerThanScreen: true,
      roundedCorners: false,
      webPreferences: {
        ...rendererPreferences(path.join(__dirname, "preload.js")),
        zoomFactor: 1,
      },
    });
    attachPreloadErrorLogging(overlayWindow, "Overlay");

    overlayWindow.setIgnoreMouseEvents(true, { forward: true });
    overlayWindow.setBounds(bounds, false);
    overlayWindow.webContents.setZoomFactor(1);
    overlayWindow.setVisibleOnAllWorkspaces(true);
    overlayWindow.setMenu(null);

    if (isDev) {
      overlayWindow.loadURL("http://localhost:3003/");
    } else {
      overlayWindow.loadFile(
        path.join(__dirname, "../ui/overlay/index.html"),
      );
    }

    overlayWindow.webContents.once("did-finish-load", () => {
      if (overlayWindow && !overlayWindow.isDestroyed()) {
        try {
          overlayWindow.setContentProtection(false);
          console.log(
            `    -> Content protection enabled for display ${display.id}`,
          );
        } catch (err) {
          console.warn(
            `    -> Failed to enable content protection for display ${display.id}:`,
            err,
          );
        }

        overlayWindow.setBounds(bounds, false);
        overlayWindow.webContents.setZoomFactor(1);

        const logical = ausmLogicalBounds(display, ausmDisplays);
        const mapBounds = logical ?? bounds;
        if (logical) {
          console.log(
            `    -> AUSM logical bounds=(${logical.x}, ${logical.y}) ${logical.width}x${logical.height} (electron ${bounds.width}x${bounds.height} @${display.scaleFactor}x)`,
          );
        } else {
          console.log(
            `    -> No AUSM display match; using Electron bounds ${bounds.width}x${bounds.height}`,
          );
        }

        overlayWindow.webContents.send("ausm:screenInfo", {
          displayId: display.id,
          menuBarHeight: menuBarHeight,
          displayBounds: mapBounds,
          screenOrigin: { x: mapBounds.x, y: mapBounds.y },
          allDisplays: allDisplays.map((d) => ({
            id: d.id,
            bounds: d.bounds,
            workArea: d.workArea,
            scaleFactor: d.scaleFactor,
          })),
          isPrimaryDisplay: display.id === primaryDisplay.id,
        });

        if (isDev && display.id === primaryDisplay.id) {
          overlayWindow.webContents.openDevTools({ mode: "detach" });
        }
      }
    });

    const displayKey = getDisplayKey(bounds);

    overlayWindow.on("closed", () => {
      appState.overlayWindows.delete(displayKey);
    });

    setupAUSMElectronBridge(overlayWindow, ausmRuntime, {
      logging: ausmLogging,
    });

    appState.overlayWindows.set(displayKey, overlayWindow);
    console.log(`    -> Created overlay for display key: ${displayKey}`);
  });

  console.log(`[Main] Created ${appState.overlayWindows.size} overlay windows`);
  notifyOverlayChange();
}

export function closeOverlayWindows(): void {
  appState.overlayWindows.forEach((window) => {
    if (window && !window.isDestroyed()) {
      window.close();
    }
  });
  appState.overlayWindows.clear();
  notifyOverlayChange();
}

export function recreateOverlayWindows(): void {
  const hadOverlay = appState.overlayWindows.size > 0;

  if (!hadOverlay) {
    return;
  }

  console.log(
    "[Main] Display configuration changed, recreating overlay windows...",
  );
  closeOverlayWindows();

  setTimeout(() => {
    createOverlayWindows();
  }, 500);
}

export function setupDisplayChangeListeners(): void {
  screen.on("display-added", (_event, newDisplay) => {
    console.log(
      `[Main] Display added: id=${newDisplay.id}, bounds=${JSON.stringify(newDisplay.bounds)}`,
    );
    recreateOverlayWindows();
  });

  screen.on("display-removed", (_event, oldDisplay) => {
    console.log(`[Main] Display removed: id=${oldDisplay.id}`);
    recreateOverlayWindows();
  });

  screen.on("display-metrics-changed", (_event, display, changedMetrics) => {
    console.log(
      `[Main] Display metrics changed: id=${display.id}, changed=${changedMetrics.join(", ")}`,
    );
    if (
      changedMetrics.includes("bounds") ||
      changedMetrics.includes("workArea")
    ) {
      recreateOverlayWindows();
    }
  });

  console.log("[Main] Display change listeners registered");
}

export function setupSpaceChangeHandling(runtime: AusmRuntime): void {
  const r = runtime as unknown as {
    onSpaceChangeEvent?: (cb: () => void) => void;
  };
  if (typeof r.onSpaceChangeEvent !== "function") return;

  r.onSpaceChangeEvent(() => {
    const opts = { visibleOnFullScreen: true };
    appState.overlayWindows.forEach((win) => {
      if (win && !win.isDestroyed()) {
        win.setVisibleOnAllWorkspaces(false, opts);
        win.setVisibleOnAllWorkspaces(true, opts);
      }
    });
    if (appState.overlayWindows.size > 0) {
      console.log("[Main] Space change: re-attached overlay to all workspaces");
    }
  });

  console.log("[Main] Space change handling registered");
}

export function destroyOverlayWindows(): void {
  appState.overlayWindows.forEach((win) => {
    if (win && !win.isDestroyed()) {
      win.destroy();
    }
  });
  appState.overlayWindows.clear();
}
