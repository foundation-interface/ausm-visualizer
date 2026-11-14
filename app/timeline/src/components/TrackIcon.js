import React from "react";
import {
  AppWindow,
  Camera,
  Clipboard,
  FileText,
  Keyboard,
  ListChecks,
  MousePointer2,
  Radar,
  TextCursorInput,
} from "lucide-react";

// Track definitions name their icon as a string, so the hook stays free of JSX.
const ICONS = {
  AppWindow,
  Camera,
  Clipboard,
  FileText,
  Keyboard,
  ListChecks,
  MousePointer2,
  Radar,
  TextCursorInput,
};

export default function TrackIcon({ name, size = 14 }) {
  const Icon = ICONS[name];
  return Icon ? <Icon size={size} strokeWidth={1.75} aria-hidden="true" /> : null;
}
