"use client";

import Image from "next/image";
import type { VirtualTourScene } from "@/data/virtualTour";

type TourSceneRailProps = {
  scenes: VirtualTourScene[];
  activeSceneId: string;
  onSelect: (sceneId: string) => void;
};

export function TourSceneRail({ scenes, activeSceneId, onSelect }: TourSceneRailProps) {
  return (
    <nav className="vt-scene-rail" aria-label="Virtual tour scenes">
      {scenes.map((scene, index) => {
        const active = scene.id === activeSceneId;
        return (
          <button
            key={scene.id}
            type="button"
            className="vt-scene-rail__item"
            data-active={active ? "true" : "false"}
            aria-current={active ? "true" : undefined}
            onClick={() => onSelect(scene.id)}
          >
            <span className="vt-scene-rail__thumb">
              <Image src={scene.fallbackImage} alt="" fill sizes="96px" />
              <span aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
            </span>
            <span className="vt-scene-rail__name">{scene.title}</span>
          </button>
        );
      })}
    </nav>
  );
}
