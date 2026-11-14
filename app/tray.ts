import { app, Tray, Menu, nativeImage, shell } from "electron";
import * as path from "path";
import { appState } from "./state";
import { createTimelineWindow } from "./timeline/window";
import {
  createOverlayWindows,
  closeOverlayWindows,
  isOverlayOpen,
  onOverlayChange,
} from "./overlay/windows";

export function createTray(): void {
  // Prevent creating duplicate tray icons
  if (appState.tray && !appState.tray.isDestroyed()) {
    console.log("[Main] Tray already exists, skipping creation");
    return;
  }

  // Load custom tray icon from assets
  // __dirname is app/dist/, so ../assets is app/assets
  const iconPath = path.join(__dirname, "../assets/tray-icon.png");
  console.log("[Main] Loading tray icon from:", iconPath);

  let trayIcon = nativeImage.createFromPath(iconPath);

  if (trayIcon.isEmpty()) {
    console.error("[Main] Tray icon not found or empty at:", iconPath);
    // Fallback to a colored circle
    trayIcon = nativeImage.createFromDataURL(
      "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABIAAAASCAYAAABWzo5XAAAACXBIWXMAAAsTAAALEwEAmpwYAAABG0lEQVR4nK3UvytFYRzH8dcxGCwsFkYDZbP4B2Q2kMVkI/4BBhaDxeJv0G0yGBi4/4FNBn+ADBKLcl3du4xePvW0nOd8n+/zfZ/znHOi+ENVsY4rnOEdh+iJP+2fag6XqMUNBtGGfnTgBGM/QSYRUB0eMIxzDOAW4zjC4E+gSsQTpjCBETTgEuPYwzAmf4J6EuAF05jFMOawiCPMYBHD6EhAl8Q0g1jELGoxhBJwgBV0pYKuC+hGL/bRjV3cYg4zKf2v0P/EWgOqRxnOsIkdzCPqEq+4x3AQ+w26gip0gLXvDr7E5gRdzGAYOyhgJgl9FVsQ0AdKGMY+ZlGLQZTiqEuwJkH9GEK3v4VSwdtoxznOkv4r6AuqBT6BG2LJNjK4AAAAAElFTkSuQmCC",
    );
  } else {
    // Resize to square 18x18 for menu bar
    trayIcon = trayIcon.resize({ width: 18, height: 18 });
    console.log("[Main] Tray icon loaded successfully");
  }

  appState.tray = new Tray(trayIcon);
  appState.tray.setToolTip("AUSM Activity Monitor");
  onOverlayChange(updateTrayMenu);
  updateTrayMenu();

  // On macOS, clicking the tray icon shows the menu
  // On Windows/Linux, you might want left-click to open Timeline
  appState.tray.on("click", () => {
    if (process.platform !== "darwin") {
      createTimelineWindow();
    }
  });

  console.log("[Main] System tray created");
}

export function updateTrayMenu(): void {
  if (!appState.tray || appState.tray.isDestroyed()) return;

  const contextMenu = Menu.buildFromTemplate([
    {
      label: "Timeline",
      click: () => {
        createTimelineWindow();
      },
    },
    {
      label: "Overlay",
      type: "checkbox",
      checked: isOverlayOpen(),
      click: (item) => {
        if (item.checked) {
          createOverlayWindows();
        } else {
          closeOverlayWindows();
        }
      },
    },
    {
      label: "Open Database",
      click: () => {
        shell.openPath(app.getPath("userData"));
      },
    },
    { type: "separator" },
    {
      label: "Quit",
      click: () => {
        app.quit();
      },
    },
  ]);

  appState.tray.setContextMenu(contextMenu);
}

export function destroyTray(): void {
  if (appState.tray) {
    appState.tray.destroy();
    appState.tray = null;
  }
}
