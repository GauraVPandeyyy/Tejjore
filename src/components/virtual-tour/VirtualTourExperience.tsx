"use client";

import Link from "next/link";
import { useCallback, useMemo, useState } from "react";
import { getVirtualTourScene, virtualTourScenes } from "@/data/virtualTour";
import { MarzipanoViewer } from "./MarzipanoViewer";
import { TourSceneRail } from "./TourSceneRail";
import { PanoramaDemoLab } from "./PanoramaDemoLab";

const roomIds = new Set(["deluxe", "super-deluxe", "premium"]);

export function VirtualTourExperience({ initialSceneId, demo360 = false }: { initialSceneId?: string; demo360?: boolean }) {
  const initialScene = useMemo(() => getVirtualTourScene(initialSceneId), [initialSceneId]);
  const [activeSceneId, setActiveSceneId] = useState(initialScene.id);
  const activeScene = getVirtualTourScene(activeSceneId);
  const activeIndex = virtualTourScenes.findIndex((scene) => scene.id === activeScene.id);
  const previous = virtualTourScenes[(activeIndex - 1 + virtualTourScenes.length) % virtualTourScenes.length];
  const next = virtualTourScenes[(activeIndex + 1) % virtualTourScenes.length];
  const isRoom = roomIds.has(activeScene.id);

  const selectScene = useCallback((sceneId: string) => {
    const resolved = getVirtualTourScene(sceneId);
    setActiveSceneId(resolved.id);
    const url = new URL(window.location.href);
    url.searchParams.set("scene", resolved.id);
    window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
  }, []);

  return (
    <main className="virtual-tour-page">
      <header className="vt-intro site-container">
        <div className="vt-intro__kicker">
          <span className="micro">04 / VIRTUAL TOUR</span>
          <span className="micro">TEJJORA LAKE VIEW · LUCKNOW</span>
        </div>
        <div className="vt-intro__copy">
          <h1>Step inside<br /><em>before you arrive.</em></h1>
          <p>
            Move from arrival to rooms, dining and the lake-facing side of Tejjora. Begin with an interactive 360° reference scene, then continue through a visual preview of the hotel.
          </p>
        </div>
      </header>

      {demo360 ? <PanoramaDemoLab /> : null}

      <section className="vt-experience" aria-labelledby="vt-scene-title">
        <div className="vt-experience__topbar site-container">
          <div>
            <span className="micro">{activeScene.eyebrow}</span>
            <h2 id="vt-scene-title" aria-live="polite">{activeScene.title}</h2>
          </div>
          <div className="vt-experience__counter" aria-label={`Scene ${activeIndex + 1} of ${virtualTourScenes.length}`}>
            <strong>{String(activeIndex + 1).padStart(2, "0")}</strong>
            <span>/ {String(virtualTourScenes.length).padStart(2, "0")}</span>
          </div>
        </div>

        <div className="vt-experience__viewer-wrap">
          <MarzipanoViewer scene={activeScene} onSceneChange={selectScene} />
        </div>

        <div className="vt-experience__details site-container">
          <div className="vt-experience__description">
            <span className="micro">CURRENT SPACE</span>
            <p>{activeScene.description}</p>
          </div>

          <div className="vt-experience__actions">
            {isRoom ? (
              <Link className="vt-experience__primary" href={`/book?room=${activeScene.id}`}>
                Check this room <span aria-hidden="true">↗</span>
              </Link>
            ) : (
              <Link className="vt-experience__primary" href="/book">
                Check dates <span aria-hidden="true">↗</span>
              </Link>
            )}
            <Link href="/rooms">Explore rooms</Link>
          </div>

          <div className="vt-experience__stepper" aria-label="Previous and next scene">
            <button type="button" onClick={() => selectScene(previous.id)}>
              <span aria-hidden="true">←</span>
              <span><small>Previous</small><strong>{previous.title}</strong></span>
            </button>
            <button type="button" onClick={() => selectScene(next.id)}>
              <span><small>Next</small><strong>{next.title}</strong></span>
              <span aria-hidden="true">→</span>
            </button>
          </div>
        </div>

        <div className="site-container">
          <TourSceneRail scenes={virtualTourScenes} activeSceneId={activeScene.id} onSelect={selectScene} />
        </div>
      </section>

      <section className="vt-capture-note site-container" aria-label="360 media note">
        <span className="micro">REFERENCE MEDIA</span>
        <p>The interactive 360° opening scene is reference imagery and is labelled accordingly. The remaining scenes use the current Tejjora visual library.</p>
      </section>
    </main>
  );
}
