/**
 * Type declarations for the AUSM API exposed via Electron's contextBridge
 */

interface Point {
    x: number;
    y: number;
}

interface Rect {
    x: number;
    y: number;
    width: number;
    height: number;
}

interface AUSMTextSelectionEvent {
    eventID: string | null;
    timestamp: number;
    selectedText: string;
    screenBound: Rect | null;
    selectionMethod: 'MOUSE' | 'KEYBOARD' | 'DOUBLE_CLICK' | 'TRIPLE_CLICK' | 'OTHER' | null;
    sourceElement: {
        type: string | null;
        application: string | null;
        screenPosition: Point | null;
        screenContent: string | null;
    } | null;
}

interface AUSMScreenshotImageData {
    dataBase64: string;
    width: number;
    height: number;
    mimeType?: string;
}

interface AUSMScreenshotEvent {
    eventID: string | null;
    timestamp: number;
    bounds: Rect | null;
    status: 'SCREENSHOT_STARTED' | 'SCREENSHOT_UPDATED' | 'SCREENSHOT_FINISHED' | null;
    type: 'FULL_SCREEN' | 'PARTIAL_SCREEN' | 'WINDOW_SCREEN' | null;
    /** URL to the screenshot image (custom protocol or data: URL) — set on FINISHED */
    imageUrl?: string | null;
    imageWidth?: number | null;
    imageHeight?: number | null;
    /** Legacy: raw image data (only when bridge falls back to inline base64) */
    imageData?: AUSMScreenshotImageData | null;
}

/** CopyPasteEvent from AUSM (clipboard copy detection) */
interface AUSMCopyPasteEvent {
    eventID: string | null;
    timestamp: number;
    action: 'COPY' | 'PASTE' | null;
    /** Primary content type (TEXT, HTML, RTF, IMAGE, FILE, URL) */
    contentType?: 'TEXT' | 'HTML' | 'RTF' | 'IMAGE' | 'FILE' | 'URL' | null;
    content: string | null;
    /** For FILE type: array of file paths */
    contentPaths?: string[] | null;
    changeCount: number | null;
}

interface AUSMWindowStateEvent {
    eventID: string | null;
    timestamp: number;
    application: string | null;
    state: 'APPEAR' | 'UNFOCUSED' | 'FOCUSED' | 'VANISHED' | null;
    bounds: Rect | null;
}

/** TextInputEvent from AUSM (text focus / typing / blur in editable elements) */
interface AUSMTextInputEvent {
    eventID: string | null;
    timestamp: number;
    text: string | null;
    status: 'TEXT_EDITING_STARTED' | 'TEXT_EDITING_UPDATED' | 'TEXT_EDITING_FINISHED' | null;
    caretScreenPosition: Point | null;
    sourceElement: {
        type: string | null;
        application: string | null;
        applicationLocalizedName?: string | null;
        screenBounds: Rect | null;
        content?: string | null;
    } | null;
}

/** Structured interaction screenshot payload */
interface AUSMInteractionScreenshot {
    dataBase64: string;
    width: number;
    height: number;
    mimeType: 'image/jpeg';
}

/** CursorPlusPlusEvent from AUSM (mouse interaction tracking) */
interface AUSMCursorPlusPlusEvent {
    eventID: string | null;
    timestamp: number;
    action: 'MOVE' | 'CLICK' | 'DOUBLE_CLICK' | 'RIGHT_CLICK' | 'SCROLL' | 'HOLD_START' | 'HOLD_END' | 'DRAG' | null;
    x: number | null;
    y: number | null;
    button: number | null;
    clickCount: number | null;
    scrollDeltaX: number | null;
    scrollDeltaY: number | null;
    holdDurationMs: number | null;
    windowId: number | null;
    windowTitle: string | null;
    application: string | null;
    bundleId: string | null;
    materialId: string | null;
    uiElementRole: string | null;
    uiElementLabel: string | null;
    uiElementDescription: string | null;
    uiElementValue: string | null;
    interactionScreenshot: AUSMInteractionScreenshot | null;
}

/** TaskEvent from AUSM (rapid-task detector via detector pipeline) */
interface AUSMTaskEvent {
    eventID: string | null;
    timestamp: number;
    status: 'TASK_DETECTED' | 'TASK_UPDATED' | 'TASK_COMPLETED' | null;
    taskId: string | null;
    parentTaskId?: string | null;
    level?: 'goal' | 'leaf' | null;
    taskLabel: string | null;
    taskDescription: string | null;
    confidence: number | null;
    application: string | null;
    detectorName: string | null;
    evidence: string | null;
    requestTimestamp?: number | null;
    responseTimestamp?: number | null;
    /** Vertex generateContent wall time (send → response), ms */
    modelLatencyMs?: number | null;
}

/** DetectorEvent from AUSM (any detector-pipeline firing) */
interface AUSMDetectorEvent {
    eventID: string | null;
    timestamp: number;
    detectorName: string;
    eventType: string;
    confidence: number;
    summary: string;
    evidence: string;
    application: string | null;
    bundleId: string | null;
    windowTitle: string | null;
    suggestedDetectors?: string[];
    modelLatencyMs?: number | null;
}

/** MaterialEvent produced by AUSM (material manager) */
interface AUSMMaterialEvent {
    eventID?: string | null;
    timestamp: number;
    type?: string | null;
    displayId?: number | null;
    bounds?: Rect | null;
    materialType?: string | null;
    materialTypeConfidence?: number | null;
    material?: {
        type?: string;
        label?: string;
        application?: string;
        materialType?: string;
        materialTypeConfidence?: number;
        [key: string]: unknown;
    } | null;
    [key: string]: unknown;
}

/** Display info from the live screen-stream service. */
interface AUSMScreenDisplayInfo {
    id: string;
    width: number;
    height: number;
    isMain: boolean;
    isBuiltIn?: boolean;
    /** Numeric CGDirectDisplayID */
    displayId?: number;
    /** Backing scale factor (e.g. 2.0 for Retina) */
    scaleFactor?: number;
    /** Logical-point origin X in the global desktop coordinate space */
    originX?: number;
    /** Logical-point origin Y in the global desktop coordinate space */
    originY?: number;
    /** Logical-point width (CSS pixels) */
    logicalWidth?: number;
    /** Logical-point height (CSS pixels) */
    logicalHeight?: number;
}

/** A single live screen frame pushed from the main process. */
interface AUSMScreenFrame {
    displayId: string;
    width: number;
    height: number;
    jpegSize: number;
    timestamp: number;
    frameNumber: number;
    /** Raw JPEG bytes (preferred). */
    data?: Uint8Array;
    /** Legacy: base64-encoded JPEG image data. */
    dataBase64?: string;
}

/** Camera info from the live camera-stream service. */
interface AUSMCameraDeviceInfo {
    id: string;
    name: string;
    position: 'front' | 'back' | 'unspecified';
    active: boolean;
    manufacturer?: string;
}

/** A single live camera frame pushed from the main process. */
interface AUSMCameraFrame {
    deviceId: string;
    width: number;
    height: number;
    jpegSize: number;
    timestamp: number;
    frameNumber: number;
    /** Raw JPEG bytes (preferred). */
    data?: Uint8Array;
    /** Legacy: base64-encoded JPEG image data. */
    dataBase64?: string;
}

interface AUSMAPI {
    onTextSelection: (callback: (event: AUSMTextSelectionEvent) => void) => void;
    onScreenshot: (callback: (event: AUSMScreenshotEvent) => void) => void;
    onWindowState: (callback: (event: AUSMWindowStateEvent) => void) => void;
    onTextInput: (callback: (event: AUSMTextInputEvent) => void) => void;
    onMaterialEvent: (callback: (event: AUSMMaterialEvent) => void) => void;
    onCursorPlusPlusEvent: (callback: (event: AUSMCursorPlusPlusEvent) => void) => void;
    onCopyPasteEvent: (callback: (event: AUSMCopyPasteEvent) => void) => void;
    onTaskEvent?: (callback: (event: AUSMTaskEvent) => void) => (() => void);
    onDetectorEvent?: (callback: (event: AUSMDetectorEvent) => void) => (() => void);
    onScreenInfo?: (callback: (info: any) => void) => (() => void);
    onTextHighlight?: (callback: (event: any) => void) => (() => void);
    /** Live screen stream: list displays (with layout bounds). */
    getScreenDisplays?: () => Promise<AUSMScreenDisplayInfo[]>;
    /** Live screen stream: subscribe to JPEG frames pushed from main at ~10fps.
     *  Calling this signals the main process to start polling. The returned
     *  cleanup function removes the listener and signals main to stop. */
    subscribeScreenStream?: (callback: (frame: AUSMScreenFrame) => void) => (() => void);
    /** Live camera stream: list cameras. */
    getCameraDevices?: () => Promise<AUSMCameraDeviceInfo[]>;
    /** Live camera stream: subscribe to JPEG frames pushed from main at ~10fps.
     *  Calling this signals the main process to start polling. The returned
     *  cleanup function removes the listener and signals main to stop. */
    subscribeCameraStream?: (callback: (frame: AUSMCameraFrame) => void) => (() => void);
    /** Current preview capture/poll rates for screens and cameras. */
    getPreviewFps?: () => Promise<{ screenFps: number; cameraFps: number }>;
    /** Update preview fps (1–60). Omit a field to leave that stream unchanged. */
    setPreviewFps?: (next: { screenFps?: number; cameraFps?: number }) => Promise<{ screenFps: number; cameraFps: number }>;
    onPreviewFps?: (callback: (rates: { screenFps: number; cameraFps: number }) => void) => (() => void);
}

interface OverlayPreloadAPI {
    appName: () => string;
}

declare global {
    interface Window {
        ausm?: AUSMAPI;
        overlay?: OverlayPreloadAPI;
    }
}

export {};
