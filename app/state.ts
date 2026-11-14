import { BrowserWindow, Tray } from "electron";

/**
 * Mutable main-process state shared across window and tray modules.
 * Kept in one place so those modules can stay independent.
 */
export const appState = {
  tray: null as Tray | null,
  timelineWindow: null as BrowserWindow | null,
  //user may have multiple monitors, so we need to store the overlay windows for each monitor
  overlayWindows: new Map<string, BrowserWindow>(),
};
