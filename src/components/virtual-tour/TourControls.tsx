"use client";

import { CircleButton, PillButton } from "@/components/ui/Buttons";
import { Icon } from "@/components/ui/Icon";

type TourControlsProps = {
  immersive: boolean;
  fullscreen: boolean;
  onRotateLeft: () => void;
  onRotateRight: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onReset: () => void;
  onToggleFullscreen: () => void;
};

/** Circle controls over the viewer: look, zoom and reset only work in the 360° view; full screen always does. */
export function TourControls({ immersive, fullscreen, onRotateLeft, onRotateRight, onZoomIn, onZoomOut, onReset, onToggleFullscreen }: TourControlsProps) {
  return (
    <div className="vt-controls" role="group" aria-label="Virtual tour controls">
      {immersive ? (
        <div className="vt-controls__cluster" role="group" aria-label="View controls">
          <CircleButton icon="arrow-left" label="Look left" tone="cream" onClick={onRotateLeft} />
          <CircleButton icon="arrow-right" label="Look right" tone="cream" onClick={onRotateRight} />
          <CircleButton icon="plus" label="Zoom in" tone="cream" onClick={onZoomIn} />
          <CircleButton icon="minus" label="Zoom out" tone="cream" onClick={onZoomOut} />
          <PillButton variant="cream" className="tj-pill--small" onClick={onReset}>
            Reset
          </PillButton>
        </div>
      ) : (
        <span />
      )}

      <button type="button" className="tj-pill tj-pill--cream tj-pill--small vt-controls__fullscreen" onClick={onToggleFullscreen}>
        <Icon name="expand" size={16} />
        <span>{fullscreen ? "Exit full screen" : "Full screen"}</span>
      </button>
    </div>
  );
}
