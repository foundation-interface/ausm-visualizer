import React from "react";
import { useScreenInfo } from "./hooks/useScreenInfo";
import "./OverlayStyles.css";
import WindowBoundsSection from "./components/WindowBoundsSection";
import SelectionSection from "./components/SelectionSection";
import TextInputSection from "./components/TextInputSection";
import ScreenshotSection from "./components/ScreenshotSection";
import CursorSection from "./components/CursorSection";
import CopyPasteSection from "./components/CopyPasteSection";

function Overlay() {
  const { displayId, displayBounds, screenOrigin, scaleX, scaleY } =
    useScreenInfo();

  const metrics = { screenOrigin, displayBounds, scaleX, scaleY, displayId };

  return (
    <div className="overlay-container">
      {/* Panels dock here and stack instead of overlapping; rings and labels stay fixed on screen. */}
      <div className="overlay-dock">
        <CursorSection />
        <SelectionSection {...metrics} />
        <TextInputSection {...metrics} />
        <CopyPasteSection />
        <ScreenshotSection {...metrics} />
        <WindowBoundsSection {...metrics} />
      </div>

      <div className="status-indicator">
        <div className="status-dot" />
        {displayId !== null ? `ausm · display ${displayId}` : "ausm"}
      </div>
    </div>
  );
}

export default Overlay;
