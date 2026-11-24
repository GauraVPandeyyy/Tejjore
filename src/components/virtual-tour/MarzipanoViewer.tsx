"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from "react";
import type { VirtualTourScene } from "@/data/virtualTour";
import { TourControls } from "./TourControls";
import { isPlaceholderStill } from "./TourSceneRail";
import { Icon } from "@/components/ui/Icon";

type MarzipanoViewerProps = {
  scene: VirtualTourScene;
  onSceneChange: (sceneId: string) => void;
};

type ViewerState = "fallback" | "loading" | "immersive" | "error";

// Minimal shapes of the untyped Marzipano objects this component touches.
type MarzipanoViewerInstance = { destroy?: () => void };
type MarzipanoView = {
  yaw: () => number;
  setYaw: (yaw: number) => void;
  fov: () => number;
  setFov: (fov: number) => void;
  setParameters: (params: VirtualTourScene["initialView"]) => void;
};

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function isEditableTarget(target: EventTarget | null) {
  if (!target || typeof (target as HTMLElement).tagName !== "string") return false;
  const element = target as HTMLElement;
  const tag = element.tagName.toLowerCase();
  return tag === "input" || tag === "textarea" || tag === "select" || element.isContentEditable;
}

export function MarzipanoViewer({ scene, onSceneChange }: MarzipanoViewerProps) {
  const stageRef = useRef<HTMLDivElement>(null);
  const shellRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<MarzipanoViewerInstance | null>(null);
  const viewRef = useRef<MarzipanoView | null>(null);
  // Only the async outcome for a scene is stored; "fallback" and "loading" are derived.
  const [attempt, setAttempt] = useState(0);
  const [outcome, setOutcome] = useState<{ key: string; state: "immersive" | "error" } | null>(null);
  const outcomeKey = `${scene.id}:${attempt}`;
  const viewerState: ViewerState = !scene.panoramaReady
    ? "fallback"
    : outcome?.key === outcomeKey ? outcome.state : "loading";
  const [fullscreen, setFullscreen] = useState(false);
  // iOS Safari has no element fullscreen: fall back to a fixed, edge-to-edge "pseudo" fullscreen.
  const [pseudoFullscreen, setPseudoFullscreen] = useState(false);
  // The "drag to look" hint shows until the guest first touches the scene.
  const [touchedScene, setTouchedScene] = useState<string | null>(null);

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

    if (!scene.panoramaReady) return () => destroyViewer();

    async function boot() {
      try {
        const marzipanoModule = await import("marzipano");
        if (cancelled || !stageRef.current) return;

        const Marzipano = marzipanoModule.default ?? marzipanoModule;
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
        if (!cancelled) setOutcome({ key: `${scene.id}:${attempt}`, state: "immersive" });
      } catch (error) {
        console.error("Virtual tour failed to initialize", error);
        destroyViewer();
        if (!cancelled) setOutcome({ key: `${scene.id}:${attempt}`, state: "error" });
      }
    }

    void boot();

    return () => {
      cancelled = true;
      destroyViewer();
    };
  }, [destroyViewer, onSceneChange, scene, attempt]);

  useEffect(() => {
    const onFullscreenChange = () => setFullscreen(document.fullscreenElement === shellRef.current);
    document.addEventListener("fullscreenchange", onFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", onFullscreenChange);
  }, []);

  // Keyboard look/zoom only applies while the viewer itself has focus. It never listens on
  // window, so typing arrows, "+", "-" or "0" in any field (e.g. the concierge) is unaffected.
  function onViewerKeyDown(event: ReactKeyboardEvent<HTMLDivElement>) {
    if (event.altKey || event.ctrlKey || event.metaKey) return;
    if (isEditableTarget(event.target)) return;
    const actions: Record<string, () => void> = {
      ArrowLeft: () => rotate(-0.15),
      ArrowRight: () => rotate(0.15),
      "+": () => zoom(-0.12),
      "=": () => zoom(-0.12),
      "-": () => zoom(0.12),
      "0": () => resetView(),
    };
    const action = actions[event.key];
    if (!action || !viewRef.current) return;
    event.preventDefault();
    action();
  }

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
    if (!shell.requestFullscreen) {
      // No element fullscreen (iOS Safari): toggle the fixed edge-to-edge layout instead.
      setPseudoFullscreen((current) => !current);
      return;
    }
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
  const pending = unavailable && isPlaceholderStill(scene);
  const statusLabel = immersive ? (isDemo ? "360° DEMO" : "360° VIEW") : pending ? "PHOTOGRAPHY PENDING" : "STILL PREVIEW";
  const showHint = immersive && touchedScene !== scene.id;

  return (
    <div
      className="vt-viewer-shell"
      ref={shellRef}
      data-mode={viewerState}
      data-pseudo-fullscreen={pseudoFullscreen ? "true" : undefined}
      tabIndex={immersive ? 0 : -1}
      role="group"
      aria-label={immersive ? `${scene.title} 360 degree viewer. When focused, use the left and right arrow keys to look around, plus and minus to zoom, and 0 to reset.` : `${scene.title} preview`}
      onKeyDown={(event) => {
        if (event.key === "Escape" && pseudoFullscreen) setPseudoFullscreen(false);
        onViewerKeyDown(event);
      }}
      onPointerDown={() => setTouchedScene(scene.id)}
    >
      <div className="vt-viewer-stage" ref={stageRef} aria-label={`${scene.title} 360 degree view`} />

      {unavailable && !pending ? (
        <div className="vt-viewer-fallback">
          <Image
            key={scene.fallbackImage}
            src={scene.fallbackImage}
            alt={isDemo ? `${scene.title} development preview` : `${scene.title} at Tejjora Lake View`}
            fill
            priority={scene.id === "demo-room" || scene.id === "entrance"}
            sizes="100vw"
          />
          <span className="vt-viewer-fallback__veil" aria-hidden="true" />
        </div>
      ) : null}

      {pending ? (
        // The scene's only image is a placeholder illustration: never show it as the hotel.
        <div className="vt-viewer-pending">
          <Icon name="camera" size={28} />
          <p className="vt-viewer-pending__title">Not yet photographed</p>
          <p>This stop opens here once the hotel&rsquo;s own photography is ready.</p>
        </div>
      ) : null}

      {viewerState === "loading" ? (
        <div className="vt-viewer-loading" role="status" aria-live="polite">
          <span />
          <p>Opening 360° scene…</p>
        </div>
      ) : null}

      {viewerState === "error" ? (
        <div className="vt-viewer-retry">
          <button type="button" className="tj-pill tj-pill--cream tj-pill--small" onClick={() => setAttempt((current) => current + 1)}>
            <span>Try the 360° view again</span>
          </button>
        </div>
      ) : null}

      {showHint ? (
        <div className="vt-viewer-hint" aria-hidden="true">
          <Icon name="drag" size={18} />
          <span>Drag to look around</span>
        </div>
      ) : null}

      <div className="vt-viewer-status">
        <span className="vt-viewer-status__label">{statusLabel}</span>
        {isDemo ? (
          <span className="vt-viewer-status__note">Demo panorama · Not Tejjora property media</span>
        ) : pending ? null : !scene.panoramaReady ? (
          <span className="vt-viewer-status__note">Photo of the hotel · 360° view to follow</span>
        ) : viewerState === "error" ? (
          <span className="vt-viewer-status__note">360° view unavailable — still preview shown</span>
        ) : null}
      </div>

      {!immersive && scene.hotspots.length ? (
        <div className="vt-fallback-actions" role="group" aria-label="Continue virtual tour">
          {scene.hotspots.map((hotspot) => {
            if (hotspot.type === "booking" && hotspot.roomId) {
              return (
                <a key={hotspot.id} className="tj-pill tj-pill--cream tj-pill--small" href={`/book?room=${hotspot.roomId}`}>
                  {hotspot.label} <span className="tj-pill__dot" aria-hidden="true" />
                </a>
              );
            }
            if (!hotspot.target) return null;
            return (
              <button key={hotspot.id} type="button" className="tj-pill tj-pill--outline-light tj-pill--small" onClick={() => onSceneChange(hotspot.target!)}>
                {hotspot.label} <span aria-hidden="true">→</span>
              </button>
            );
          })}
        </div>
      ) : null}

      <TourControls
        immersive={immersive}
        fullscreen={fullscreen || pseudoFullscreen}
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
