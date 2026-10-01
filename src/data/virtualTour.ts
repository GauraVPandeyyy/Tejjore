import { assets } from "./assets";
import { panoramaAssets } from "./panoramaAssets";

export type VirtualTourHotspot = {
  id: string;
  type: "scene" | "room" | "booking";
  label: string;
  target?: string;
  roomId?: "deluxe" | "super-deluxe" | "premium";
  position: {
    yaw: number;
    pitch: number;
  };
};

export type VirtualTourMediaKind = "property" | "development-demo" | "pending";

export type VirtualTourScene = {
  id: string;
  title: string;
  eyebrow: string;
  description: string;
  panorama: string;
  panoramaReady: boolean;
  mediaKind?: VirtualTourMediaKind;
  sourceNote?: string;
  panoramaWidth: number;
  fallbackImage: string;
  initialView: {
    yaw: number;
    pitch: number;
    fov: number;
  };
  hotspots: VirtualTourHotspot[];
};

/**
 * Stage 11 ships the complete Marzipano scene architecture, but the hotel's
 * real equirectangular 360 photography has not been supplied yet. Every scene
 * therefore stays in a truthful still-image fallback state until its
 * `panoramaReady` flag is explicitly switched to true after asset QA.
 *
 * Hotspot positions are placement seeds only. Re-tune them against the final
 * spherical captures before launch.
 */
export const virtualTourScenes: VirtualTourScene[] = [
  {
    id: "demo-room",
    title: "360 Room Demo",
    eyebrow: "00 / INTERACTIVE PREVIEW",
    description: "Use the supplied reference panorama to try the real drag, touch, zoom and fullscreen viewer now. This reference interior is not Tejjora property photography and is designed to be replaced later without changing the viewer component.",
    panorama: panoramaAssets.demoLiving.src,
    panoramaReady: true,
    mediaKind: "development-demo",
    sourceNote: panoramaAssets.demoLiving.note,
    panoramaWidth: panoramaAssets.demoLiving.width,
    fallbackImage: panoramaAssets.widePreview.src,
    initialView: { yaw: 0, pitch: 0, fov: 1.25 },
    hotspots: [
      { id: "demo-to-entrance", type: "scene", label: "Continue to Tejjora", target: "entrance", position: { yaw: 0.65, pitch: -0.05 } },
    ],
  },
  {
    id: "entrance",
    title: "Entrance",
    eyebrow: "01 / ARRIVAL",
    description: "Begin at the hotel entrance, then move naturally toward reception and the lobby.",
    panorama: assets.panoramas.entrance,
    panoramaReady: false,
    mediaKind: "pending",
    panoramaWidth: 4096,
    fallbackImage: assets.hero.alternateImages[0],
    initialView: { yaw: 0, pitch: 0, fov: 1.35 },
    hotspots: [
      { id: "to-reception", type: "scene", label: "Reception", target: "reception", position: { yaw: 0.55, pitch: -0.05 } },
    ],
  },
  {
    id: "reception",
    title: "Reception",
    eyebrow: "02 / WELCOME",
    description: "The first indoor stop: reception and the transition into Tejjora's quieter interior spaces.",
    panorama: assets.panoramas.reception,
    panoramaReady: false,
    mediaKind: "pending",
    panoramaWidth: 4096,
    fallbackImage: assets.lobby[2],
    initialView: { yaw: 0, pitch: 0, fov: 1.3 },
    hotspots: [
      { id: "to-entrance", type: "scene", label: "Entrance", target: "entrance", position: { yaw: -1.2, pitch: -0.02 } },
      { id: "to-lobby", type: "scene", label: "Lobby", target: "lobby", position: { yaw: 0.65, pitch: -0.04 } },
    ],
  },
  {
    id: "lobby",
    title: "Lobby",
    eyebrow: "03 / PAUSE",
    description: "Move through the lobby before choosing the room corridor or the restaurant.",
    panorama: assets.panoramas.lobby,
    panoramaReady: false,
    mediaKind: "pending",
    panoramaWidth: 4096,
    fallbackImage: assets.lobby[0],
    initialView: { yaw: 0, pitch: 0, fov: 1.25 },
    hotspots: [
      { id: "to-reception", type: "scene", label: "Reception", target: "reception", position: { yaw: -1.25, pitch: -0.02 } },
      { id: "to-corridor", type: "scene", label: "Rooms", target: "corridor", position: { yaw: 0.35, pitch: -0.04 } },
      { id: "to-restaurant", type: "scene", label: "Restaurant", target: "restaurant", position: { yaw: 1.4, pitch: -0.02 } },
    ],
  },
  {
    id: "corridor",
    title: "Room Corridor",
    eyebrow: "04 / CHOOSE",
    description: "Choose one of Tejjora's three room categories from the room corridor.",
    panorama: assets.panoramas.corridor,
    panoramaReady: false,
    mediaKind: "pending",
    panoramaWidth: 4096,
    fallbackImage: assets.lobby[3],
    initialView: { yaw: 0, pitch: 0, fov: 1.2 },
    hotspots: [
      { id: "to-lobby", type: "scene", label: "Lobby", target: "lobby", position: { yaw: -1.55, pitch: -0.02 } },
      { id: "to-deluxe", type: "room", label: "Deluxe Room", target: "deluxe", roomId: "deluxe", position: { yaw: -0.45, pitch: -0.08 } },
      { id: "to-super", type: "room", label: "Super Deluxe", target: "super-deluxe", roomId: "super-deluxe", position: { yaw: 0.35, pitch: -0.08 } },
      { id: "to-premium", type: "room", label: "Premium Room", target: "premium", roomId: "premium", position: { yaw: 1.15, pitch: -0.08 } },
    ],
  },
  {
    id: "deluxe",
    title: "Deluxe Room",
    eyebrow: "05 / STAY",
    description: "A composed, comfortable room category for uncomplicated Lucknow stays.",
    panorama: assets.panoramas.deluxe,
    panoramaReady: false,
    mediaKind: "pending",
    panoramaWidth: 4096,
    fallbackImage: assets.rooms.deluxe[0],
    initialView: { yaw: 0, pitch: -0.02, fov: 1.18 },
    hotspots: [
      { id: "back-deluxe", type: "scene", label: "Room Corridor", target: "corridor", position: { yaw: -1.45, pitch: -0.02 } },
      { id: "book-deluxe", type: "booking", label: "Check this room", roomId: "deluxe", position: { yaw: 0.85, pitch: -0.1 } },
    ],
  },
  {
    id: "super-deluxe",
    title: "Super Deluxe Room",
    eyebrow: "06 / STAY",
    description: "A more spacious expression of the Tejjora stay within the three-category collection.",
    panorama: assets.panoramas.superDeluxe,
    panoramaReady: false,
    mediaKind: "pending",
    panoramaWidth: 4096,
    fallbackImage: assets.rooms.superDeluxe[0],
    initialView: { yaw: 0, pitch: -0.02, fov: 1.18 },
    hotspots: [
      { id: "back-super", type: "scene", label: "Room Corridor", target: "corridor", position: { yaw: -1.45, pitch: -0.02 } },
      { id: "book-super", type: "booking", label: "Check this room", roomId: "super-deluxe", position: { yaw: 0.85, pitch: -0.1 } },
    ],
  },
  {
    id: "premium",
    title: "Premium Room",
    eyebrow: "07 / STAY",
    description: "The most elevated room experience in Tejjora's current three-category collection.",
    panorama: assets.panoramas.premium,
    panoramaReady: false,
    mediaKind: "pending",
    panoramaWidth: 4096,
    fallbackImage: assets.rooms.premium[0],
    initialView: { yaw: 0, pitch: -0.02, fov: 1.18 },
    hotspots: [
      { id: "back-premium", type: "scene", label: "Room Corridor", target: "corridor", position: { yaw: -1.45, pitch: -0.02 } },
      { id: "book-premium", type: "booking", label: "Check this room", roomId: "premium", position: { yaw: 0.85, pitch: -0.1 } },
    ],
  },
  {
    id: "restaurant",
    title: "Restaurant",
    eyebrow: "08 / DINE",
    description: "Continue through the on-site restaurant before moving toward the lake-facing experience.",
    panorama: assets.panoramas.restaurant,
    panoramaReady: false,
    mediaKind: "pending",
    panoramaWidth: 4096,
    fallbackImage: assets.restaurant[0],
    initialView: { yaw: 0, pitch: 0, fov: 1.2 },
    hotspots: [
      { id: "to-lobby-from-restaurant", type: "scene", label: "Lobby", target: "lobby", position: { yaw: -1.2, pitch: -0.03 } },
      { id: "to-lake", type: "scene", label: "Lake View", target: "lake-view", position: { yaw: 0.75, pitch: -0.02 } },
    ],
  },
  {
    id: "lake-view",
    title: "Lake View",
    eyebrow: "09 / THE VIEW",
    description: "The tour closes at Tejjora's lake-facing side. Final 360 photography is still required for this scene.",
    panorama: assets.panoramas.lakeView,
    panoramaReady: false,
    mediaKind: "pending",
    panoramaWidth: 4096,
    fallbackImage: assets.terraceView.evening,
    initialView: { yaw: 0, pitch: -0.02, fov: 1.25 },
    hotspots: [
      { id: "back-to-restaurant", type: "scene", label: "Restaurant", target: "restaurant", position: { yaw: -1.25, pitch: -0.02 } },
    ],
  },
];

export const virtualTourSceneIds = virtualTourScenes.map((scene) => scene.id);

export function getVirtualTourScene(sceneId?: string | null) {
  return virtualTourScenes.find((scene) => scene.id === sceneId) ?? virtualTourScenes[0];
}
