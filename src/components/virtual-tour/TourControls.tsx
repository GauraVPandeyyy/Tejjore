"use client";

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

export function TourControls({
  immersive,
  fullscreen,
  onRotateLeft,
  onRotateRight,
  onZoomIn,
  onZoomOut,
  onReset,
  onToggleFullscreen,
}: TourControlsProps) {
  return (
    <div className="vt-controls" aria-label="Virtual tour controls">
      <div className="vt-controls__cluster" aria-label="View controls">
        <button type="button" onClick={onRotateLeft} disabled={!immersive} aria-label="Look left">←</button>
        <button type="button" onClick={onRotateRight} disabled={!immersive} aria-label="Look right">→</button>
        <button type="button" onClick={onZoomIn} disabled={!immersive} aria-label="Zoom in">+</button>
        <button type="button" onClick={onZoomOut} disabled={!immersive} aria-label="Zoom out">−</button>
        <button type="button" onClick={onReset} disabled={!immersive}>Reset</button>
      </div>

      <button type="button" className="vt-controls__fullscreen" onClick={onToggleFullscreen}>
        {fullscreen ? "Exit full screen" : "Full screen"}
      </button>
    </div>
  );
}
