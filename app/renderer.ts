import { BrowserWindow } from "electron";

export function rendererPreferences(
  preloadPath: string,
): Electron.WebPreferences {
  return {
    nodeIntegration: false,
    contextIsolation: true,
    // Preload imports ausm/bridge/preload-api. Electron 20+
    // sandboxes renderers by default, and that isolate cannot resolve
    // package exports — so exposeAUSM() never runs and window.ausm is missing.
    sandbox: false,
    preload: preloadPath,
  };
}

export function attachPreloadErrorLogging(
  win: BrowserWindow,
  label: string,
): void {
  win.webContents.on("preload-error", (_event, preloadPath, error) => {
    console.error(`[Main] ${label} preload failed (${preloadPath}):`, error);
  });
}
