import "./env";
import { app } from "electron";
import * as path from "path";
import { createRuntime } from "ausm/runtime";
import { ausmLogging, materialBlacklist } from "./config";

export type AusmRuntime = ReturnType<typeof createRuntime>;

export const ausmRuntime: AusmRuntime = createRuntime({
  // Text selection monitoring (macOS Accessibility API + clipboard fallback)
  textSelection: {
    enableNativeSelection: true,
    enableClipboard: true,
  },
  // Text input monitoring (macOS Accessibility API via TextInputHelper)
  textInput: {
    enableNativeTextInput: true,
  },
  // Screen streaming (needed for material manager and live screen preview)
  enableScreenStreaming: true,
  screenStreaming: {
    fps: 10,
    targetHeight: 1080,
  },
  // Camera streaming (webcam frames, same SHM/poll model as screen-stream).
  // Off unless AUSM_VISUALIZER_CAMERA=1, since it needs Camera permission.
  enableCameraStreaming: process.env.AUSM_VISUALIZER_CAMERA === "1",
  cameraStreaming: {
    fps: 10,
    targetHeight: 720,
  },
  memory: {
    frozen: false,
    // Live material OCR (Apple Vision): on every unfocus, OCR the frames
    // captured during that focus session and merge into the material's
    // accumulated text. Emits MATERIAL_CONTENT_UPDATED events.
    ocrEnabled: true,
  },
  materialManager: {
    enabled: true,
    dbPath: path.join(app.getPath("userData"), "ausm-materials.db"),
    materialBlacklist: {
      apps: [...materialBlacklist.apps],
      titleIncludes: [...materialBlacklist.titleIncludes],
      bundleIds: [...materialBlacklist.bundleIds],
    },
  },
  cursorPlusPlus: { enabled: true },
  clipboardMonitor: { enabled: true, includeContent: true },
  detectorPipeline: {
    provider: process.env.TASK_DETECTOR_PROVIDER === 'cerebras'
      ? 'cerebras'
      : process.env.TASK_DETECTOR_PROVIDER === 'vertex'
        ? 'vertex'
        : undefined,
    projectId: process.env.TASK_DETECTOR_PROJECT_ID || process.env.AUSM_DETECTOR_PROJECT_ID,
    apiKey: process.env.CEREBRAS_API_KEY,
    apiBaseUrl: process.env.CEREBRAS_BASE_URL,
    location: process.env.TASK_DETECTOR_LOCATION,
    model: process.env.TASK_DETECTOR_MODEL,
  },
  logging: ausmLogging,
});
