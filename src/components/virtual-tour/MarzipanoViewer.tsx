"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import type { VirtualTourScene } from "@/data/virtualTour";
import { TourControls } from "./TourControls";

type MarzipanoViewerProps = {
  scene: VirtualTourScene;
  onSceneChange: (sceneId: string) => void;
};

type ViewerState = "fallback" | "loading" | "immersive" | "error";

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function MarzipanoViewer({ scene, onSceneChange }: MarzipanoViewerProps) {
  const stageRef = useRef<HTMLDivElement>(null);
  const shellRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<any>(null);
  const viewRef = useRef<any>(null);
  const [viewerState, setViewerState] = useState<ViewerState>(scene.panoramaReady ? "loading" : "fallback");
  const [fullscreen, setFullscreen] = useState(false);

  const destroyViewer = useCallback(() => {
    try {
      viewerRef.current?.destroy?.();
    } catch {
      // Some Marzipano builds do not expose destroy; clearing the stage remains safe.
    }
    viewerRef.current = null;
    viewRef.current = null;
    if (stageRef.current) stageRef.current.innerHTML = "";
  }, []);

  useEffect(() => {
    let cancelled = false;
    destroyViewer();

    if (!scene.panoramaReady) {
      setViewerState("fallback");
      return () => destroyViewer();
    }

    setViewerState("loading");

    async function boot() {
      try {
        const module = await import("marzipano");
        if (cancelled || !stageRef.current) return;

        const Marzipano = (module as any).default ?? module;
        const viewer = new Marzipano.Viewer(stageRef.current, {
          controls: { mouseViewMode: "drag" },
        });

        const source = Marzipano.ImageUrlSource.fromString(scene.panorama);
        const geometry = new Marzipano.EquirectGeometry([{ width: scene.panoramaWidth }]);
        const limiter = Marzipano.RectilinearView.limit.traditional(1024, (120 * Math.PI) / 180);
        const view = new Marzipano.RectilinearView(scene.initialView, limiter);
        const marzipanoScene = viewer.createScene({ source, geometry, view, pinFirstLevel: true });

        scene.hotspots.forEach((hotspot) => {
          const button = document.createElement("button");
          button.type = "button";
          button.className = "vt-hotspot";
          button.setAttribute("aria-label", hotspot.label);
          const dot = document.createElement("span");
          dot.className = "vt-hotspot__dot";
          dot.setAttribute("aria-hidden", "true");
          const label = document.createElement("span");
          label.className = "vt-hotspot__label";
          label.textContent = hotspot.label;
          button.append(dot, label);
          button.addEventListener("click", () => {
            if ((hotspot.type === "scene" || hotspot.type === "room") && hotspot.target) {
              onSceneChange(hotspot.target);
              return;
            }
            if (hotspot.type === "booking" && hotspot.roomId) {
              window.location.assign(`/book?room=${encodeURIComponent(hotspot.roomId)}`);
            }
          });
          marzipanoScene.hotspotContainer().createHotspot(button, hotspot.position);
        });

        marzipanoScene.switchTo({ transitionDuration: 700 });
        viewerRef.current = viewer;
        viewRef.current = view;
        if (!cancelled) setViewerState("immersive");
      } catch (error) {
        console.error("Virtual tour failed to initialize", error);
        destroyViewer();
        if (!cancelled) setViewerState("error");
      }
    }

    void boot();

    return () => {
      cancelled = true;
      destroyViewer();
    };
  }, [destroyViewer, onSceneChange, scene]);

  useEffect(() => {
    const onFullscreenChange = () => setFullscreen(document.fullscreenElement === shellRef.current);
    document.addEventListener("fullscreenchange", onFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", onFullscreenChange);
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "ArrowLeft") rotate(-0.15);
      if (event.key === "ArrowRight") rotate(0.15);
      if (event.key === "+" || event.key === "=") zoom(-0.12);
      if (event.key === "-") zoom(0.12);
      if (event.key === "0") resetView();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  });

  function rotate(deltaYaw: number) {
    const view = viewRef.current;
    if (!view) return;
    view.setYaw(view.yaw() + deltaYaw);
  }

  function zoom(deltaFov: number) {
    const view = viewRef.current;
    if (!view) return;
    view.setFov(clamp(view.fov() + deltaFov, 0.55, 1.95));
  }

  function resetView() {
    const view = viewRef.current;
    if (!view) return;
    view.setParameters(scene.initialView);
  }

  async function toggleFullscreen() {
    const shell = shellRef.current;
    if (!shell) return;
    try {
      if (document.fullscreenElement === shell) {
        await document.exitFullscreen();
      } else {
        await shell.requestFullscreen();
      }
    } catch {
      // Fullscreen is optional; unsupported/blocked browsers keep the embedded view.
    }
  }

  const immersive = viewerState === "immersive";
  const unavailable = viewerState === "fallback" || viewerState === "error";
  const isDemo = scene.mediaKind === "development-demo";
  const statusLabel = immersive ? (isDemo ? "360° REFERENCE" : "360° VIEW") : "PHOTO PREVIEW";

  return (
    <div className="vt-viewer-shell" ref={shellRef} data-mode={viewerState}>
      <div className="vt-viewer-stage" ref={stageRef} aria-label={`${scene.title} 360 degree view`} />

      {unavailable ? (
        <div className="vt-viewer-fallback">
          <Image
            src={scene.fallbackImage}
            alt={isDemo ? `${scene.title} development preview` : `${scene.title} at Tejjora Lake View`}
            fill
            priority={scene.id === "demo-room" || scene.id === "entrance"}
            sizes="100vw"
          />
          <span className="vt-viewer-fallback__veil" aria-hidden="true" />
        </div>
      ) : null}

      {viewerState === "loading" ? (
        <div className="vt-viewer-loading" role="status" aria-live="polite">
          <span />
          <p>Opening 360° scene…</p>
        </div>
      ) : null}

      <div className="vt-viewer-status">
        <span className="micro">{statusLabel}</span>
        {isDemo ? (
          <span className="vt-viewer-status__note">Interactive reference panorama</span>
        ) : !scene.panoramaReady ? (
          <span className="vt-viewer-status__note">Continue through the hotel preview</span>
        ) : viewerState === "error" ? (
          <span className="vt-viewer-status__note">360° view unavailable — still preview shown</span>
        ) : null}
      </div>

      {!immersive && scene.hotspots.length ? (
        <div className="vt-fallback-actions" aria-label="Continue virtual tour">
          {scene.hotspots.map((hotspot) => {
            if (hotspot.type === "booking" && hotspot.roomId) {
              return (
                <a key={hotspot.id} href={`/book?room=${hotspot.roomId}`}>
                  {hotspot.label}<span aria-hidden="true">↗</span>
                </a>
              );
            }
            if (!hotspot.target) return null;
            return (
              <button key={hotspot.id} type="button" onClick={() => onSceneChange(hotspot.target!)}>
                {hotspot.label}<span aria-hidden="true">→</span>
              </button>
            );
          })}
        </div>
      ) : null}

      <TourControls
        immersive={immersive}
        fullscreen={fullscreen}
        onRotateLeft={() => rotate(-0.18)}
        onRotateRight={() => rotate(0.18)}
        onZoomIn={() => zoom(-0.12)}
        onZoomOut={() => zoom(0.12)}
        onReset={resetView}
        onToggleFullscreen={toggleFullscreen}
      />
    </div>
  );
}
