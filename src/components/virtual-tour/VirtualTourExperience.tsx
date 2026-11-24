"use client";

import dynamic from "next/dynamic";
import { useCallback, useMemo, useState } from "react";
import { getVirtualTourScene, virtualTourScenes } from "@/data/virtualTour";
import { BlurText } from "@/components/motion/BlurText";
import { CircleButton, PillLink } from "@/components/ui/Buttons";
import { Icon, type IconName } from "@/components/ui/Icon";
import { Ornament } from "@/components/ui/Waterline";
import { MarzipanoViewer } from "./MarzipanoViewer";
import { TourSceneRail } from "./TourSceneRail";
import { PanoramaDemoLab } from "./PanoramaDemoLab";

// Living water behind the title: client-only, loaded after hydration, absent with reduced motion.
const LakeAmbient = dynamic(() => import("@/components/immersive/LakeAmbient").then((mod) => mod.LakeAmbient), { ssr: false });

const roomIds = new Set(["deluxe", "super-deluxe", "premium"]);
const route = virtualTourScenes.filter((scene) => scene.mediaKind !== "development-demo");

const HOW_TO: Array<{ icon: IconName; title: string; copy: string }> = [
  { icon: "drag", title: "Drag to look", copy: "Swipe or drag inside a 360° scene to turn around." },
  { icon: "plus", title: "Zoom", copy: "Pinch, scroll, or use the + and − controls." },
  { icon: "arrow-right", title: "Keys", copy: "Focus the viewer: arrow keys look, + − zoom, 0 resets." },
  { icon: "expand", title: "Full screen", copy: "Open the viewer edge to edge on any device." },
];

/**
 * 360° tour (masterplan §4, §11 — the Marzipano viewer architecture is unchanged): an immersive lake
 * page with the title, an honest media legend, the viewer with its scene head and prev/next, the
 * route progress, the scene's story and booking links, how to look around, and the scene discovery
 * grouped by the guest's route. Scenes without 360° photography show a labelled still; the only
 * interactive panorama today is the labelled non-Tejjora demo.
 */
export function VirtualTourExperience({ initialSceneId, demo360 = false }: { initialSceneId?: string; demo360?: boolean }) {
  const initialScene = useMemo(() => getVirtualTourScene(initialSceneId), [initialSceneId]);
  const [activeSceneId, setActiveSceneId] = useState(initialScene.id);
  const activeScene = getVirtualTourScene(activeSceneId);
  const activeIndex = virtualTourScenes.findIndex((scene) => scene.id === activeScene.id);
  const previous = virtualTourScenes[(activeIndex - 1 + virtualTourScenes.length) % virtualTourScenes.length];
  const next = virtualTourScenes[(activeIndex + 1) % virtualTourScenes.length];
  const isRoom = roomIds.has(activeScene.id);
  const routeIndex = route.findIndex((scene) => scene.id === activeScene.id);

  const selectScene = useCallback((sceneId: string) => {
    const resolved = getVirtualTourScene(sceneId);
    setActiveSceneId(resolved.id);
    const url = new URL(window.location.href);
    url.searchParams.set("scene", resolved.id);
    window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
  }, []);

  return (
    <main className="tj-page tj-tour-page" data-header-tone="dark">
      <section className="tj-tour-intro" aria-labelledby="tour-title">
        <div className="tj-tour-intro__water" aria-hidden="true">
          <LakeAmbient variant="hero" />
        </div>
        <div className="tj-container tj-tour-intro__inner">
          <div>
            <Ornament />
            <p className="tj-eyebrow">360° tour · Tejjora Lake View</p>
            <h1 id="tour-title" className="sr-only">
              Walk through the hotel
            </h1>
            <p className="tj-tour-intro__title" aria-hidden="true">
              <BlurText as="span" text="Walk through the hotel" effect="focus" blur={14} distance={0} delay={140} stepDuration={0.7} trigger="load" />
            </p>
          </div>
          <div className="tj-tour-intro__aside">
            <p>
              From the entrance to the rooms and the restaurant, in the order you would walk it. The hotel&rsquo;s own 360° photography is on its way — until
              then each stop shows a photograph of the hotel.
            </p>
            <ul className="tj-tour-legend" aria-label="What you will see">
              <li>
                <Icon name="camera" size={16} /> Photo of the hotel
              </li>
              <li>
                <Icon name="orbit" size={16} /> 360° demo · not Tejjora
              </li>
            </ul>
          </div>
        </div>
      </section>

      {demo360 ? <PanoramaDemoLab /> : null}

      <section className="tj-tour" aria-labelledby="vt-scene-title">
        <div className="tj-container">
          <div className="tj-tour__head">
            <div>
              <p className="tj-eyebrow">
                {routeIndex >= 0 ? `Stop ${routeIndex + 1} of ${route.length}` : "Viewer demo"} · {activeScene.eyebrow.replace(/^\d+\s*\/\s*/, "")}
              </p>
              <h2 id="vt-scene-title" className="tj-tour__title" aria-live="polite">
                {activeScene.title}
              </h2>
            </div>
            <div className="tj-tour__step" role="group" aria-label="Previous and next scene">
              <CircleButton icon="arrow-left" label={`Previous scene: ${previous.title}`} tone="outline-light" onClick={() => selectScene(previous.id)} />
              <CircleButton icon="arrow-right" label={`Next scene: ${next.title}`} tone="outline-light" onClick={() => selectScene(next.id)} />
            </div>
          </div>
        </div>

        <div className="tj-container tj-container--bleed-mobile">
          <MarzipanoViewer scene={activeScene} onSceneChange={selectScene} />
        </div>

        <div className="tj-container">
          <ol className="tj-tour-route" aria-label="Tour route">
            {route.map((scene, index) => (
              <li key={scene.id} data-state={index === routeIndex ? "current" : routeIndex >= 0 && index < routeIndex ? "done" : undefined}>
                <button type="button" onClick={() => selectScene(scene.id)} aria-label={`Stop ${index + 1}: ${scene.title}`} aria-current={index === routeIndex ? "step" : undefined}>
                  <span className="tj-tour-route__dot" aria-hidden="true" />
                  <span className="tj-tour-route__label" aria-hidden="true">
                    {scene.title}
                  </span>
                </button>
              </li>
            ))}
          </ol>

          <div className="tj-tour__details">
            <p className="tj-tour__description">{activeScene.description}</p>
            <div className="tj-tour__actions">
              <PillLink href={isRoom ? `/book?room=${activeScene.id}` : "/book"} variant="cream" dot>
                {isRoom ? "Check this room" : "Check dates"}
              </PillLink>
              <PillLink href={isRoom ? `/rooms/${activeScene.id}` : "/rooms"} variant="outline-light">
                {isRoom ? "Room details" : "Explore rooms"}
              </PillLink>
            </div>
          </div>

          <ul className="tj-tour-howto" aria-label="How to look around">
            {HOW_TO.map((item) => (
              <li key={item.title}>
                <span className="tj-tour-howto__icon" aria-hidden="true">
                  <Icon name={item.icon} size={20} />
                </span>
                <span>
                  <strong>{item.title}</strong>
                  <small>{item.copy}</small>
                </span>
              </li>
            ))}
          </ul>

          <h2 className="tj-tour__rail-title">Every stop</h2>
          <TourSceneRail
            scenes={virtualTourScenes}
            activeSceneId={activeScene.id}
            onSelect={(sceneId) => {
              selectScene(sceneId);
              document.getElementById("vt-scene-title")?.scrollIntoView({ behavior: "smooth", block: "start" });
            }}
          />
        </div>
      </section>
    </main>
  );
}
