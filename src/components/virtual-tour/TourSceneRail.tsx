"use client";

import Image from "next/image";
import type { CSSProperties } from "react";
import type { VirtualTourScene } from "@/data/virtualTour";
import { Icon } from "@/components/ui/Icon";

type TourSceneRailProps = {
  scenes: VirtualTourScene[];
  activeSceneId: string;
  onSelect: (sceneId: string) => void;
};

/** The route through the hotel, in the order a guest walks it. Unknown ids fall into "More". */
const GROUPS: Array<{ title: string; ids: string[] }> = [
  { title: "Arrive", ids: ["entrance", "reception", "lobby"] },
  { title: "Stay", ids: ["corridor", "deluxe", "super-deluxe", "premium"] },
  { title: "Dine", ids: ["restaurant"] },
  { title: "Still to come", ids: ["lake-view"] },
  { title: "Try the viewer", ids: ["demo-room"] },
];

/** A scene still waiting for photography uses a placeholder illustration — never shown as the hotel. */
export const isPlaceholderStill = (scene: VirtualTourScene) => scene.fallbackImage.startsWith("/images/placeholders/");

function badge(scene: VirtualTourScene) {
  if (scene.mediaKind === "development-demo") return "360° demo · not Tejjora";
  if (scene.panoramaReady) return "360° view";
  if (isPlaceholderStill(scene)) return "Not yet photographed";
  return "Photo · 360° to follow";
}

/**
 * Scene discovery (masterplan §11): a <nav> of the tour grouped by the guest's route, each stop a
 * button card with a thumbnail of the hotel, its stop number and an honest media badge. The
 * current stop carries aria-current.
 */
export function TourSceneRail({ scenes, activeSceneId, onSelect }: TourSceneRailProps) {
  const known = new Set(GROUPS.flatMap((group) => group.ids));
  const groups = [...GROUPS, { title: "More", ids: scenes.filter((scene) => !known.has(scene.id)).map((scene) => scene.id) }]
    .map((group) => ({ ...group, scenes: group.ids.flatMap((id) => scenes.filter((scene) => scene.id === id)) }))
    .filter((group) => group.scenes.length);
  const stopNumber = (scene: VirtualTourScene) => scenes.filter((item) => item.mediaKind !== "development-demo").findIndex((item) => item.id === scene.id) + 1;

  return (
    <nav className="tj-tour__rail" aria-label="Virtual tour scenes">
      {groups.map((group) => (
        <div key={group.title} className="tj-tour-group" style={{ "--span": Math.min(4, group.scenes.length) } as CSSProperties}>
          <p className="tj-eyebrow">{group.title}</p>
          <ul className="tj-tour-cards">
            {group.scenes.map((scene) => {
              const number = stopNumber(scene);
              return (
                <li key={scene.id}>
                  <button type="button" className="tj-tour-card" aria-current={scene.id === activeSceneId ? "true" : undefined} onClick={() => onSelect(scene.id)}>
                    <span className="tj-tour-card__thumb" aria-hidden="true">
                      {isPlaceholderStill(scene) ? (
                        <span className="tj-tour-card__pending">
                          <Icon name="camera" size={22} />
                        </span>
                      ) : (
                        <Image src={scene.fallbackImage} alt="" fill sizes="(min-width: 1024px) 200px, 40vw" />
                      )}
                      {scene.panoramaReady ? (
                        <span className="tj-tour-card__orbit">
                          <Icon name="orbit" size={16} />
                        </span>
                      ) : null}
                    </span>
                    <span className="tj-tour-card__copy">
                      <span className="tj-tour-card__no">{number > 0 ? `Stop ${String(number).padStart(2, "0")}` : "Demo"}</span>
                      <span className="tj-tour-card__title">{scene.title}</span>
                      <span className="tj-tour-card__badge">{badge(scene)}</span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}
