const isDev = process.env.NODE_ENV === "development";

// Shared logging config — used by both runtime and bridge
const ausmLogging = {
  global_default: false,
  cursorPlusPlus: false,
  screenshot: true,
  windowState: false,
  eventFrequency: true,
  materialManager: true,
  detectorPipeline: true,
};

// Material blacklist — passed to the AUSM runtime so it does not track
// these windows. Filtering happens at the source, not in a host event path.
const materialBlacklist = {
  apps: new Set(
    [
      "dock",
      "siri",
      "battery",
      "clock",
      "wifi",
      "bentobox",
      "focusmodes",
      "lpspringboard",
      "photo booth",
      "notification center",
      "cursor",
      "iterm2",
    ].map((s) => s.toLowerCase()),
  ),
  titleIncludes: [
    "activity-visualizer",
    "item-0",
    "untitled",
    "drag guide window",
    "system status item clone",
    "login window",
  ].map((s) => s.toLowerCase()),
  bundleIds: new Set(
    ["com.apple.dock", "com.apple.notificationcenterui"].map((s) =>
      s.toLowerCase(),
    ),
  ),
};

export { isDev, ausmLogging, materialBlacklist };
