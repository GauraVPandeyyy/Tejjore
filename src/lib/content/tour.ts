import "server-only";
import { tourHotspotRows, tourSceneRows } from "./catalog";
import { ROOM_IDS } from "./rooms";
import { isPropertyMedia } from "./rules";
import type { TourHotspotRow, TourSceneRow } from "./rows";
import { readContent, type ReadOptions } from "./source";
import type { ContentResult, TourHotspot, TourScene } from "./types";
import { InvalidRow, bool, mapRows, number, oneOf, optionalNumber, optionalText, sitePath, text } from "./validate";

const PROVENANCES = ["tejjora", "licensed", "illustrative", "placeholder"] as const;
const TARGETS = ["scene", "room", "booking", "url"] as const;

function mapHotspot(row: TourHotspotRow): TourHotspot {
  const targetType = oneOf(row, "target_type", TARGETS);
  const targetValue = text(row, "target_value", 300);
  if ((targetType === "room" || targetType === "booking") && !(ROOM_IDS as readonly string[]).includes(targetValue)) {
    throw new InvalidRow("target_value: unknown room id");
  }
  if (targetType === "url" && !/^(\/|https:\/\/)/.test(targetValue)) throw new InvalidRow("target_value: unsafe url");
  return {
    id: text(row, "id", 200),
    yaw: number(row, "yaw", -6.2832, 6.2832),
    pitch: number(row, "pitch", -1.5708, 1.5708),
    label: text(row, "label", 80),
    targetType,
    targetValue,
  };
}

function mapScene(row: TourSceneRow, hotspots: TourHotspotRow[]): TourScene {
  const provenance = oneOf(row, "provenance", PROVENANCES);
  return {
    id: text(row, "id", 200),
    slug: text(row, "slug", 120),
    label: text(row, "label", 120),
    eyebrow: optionalText(row, "eyebrow", 120),
    description: optionalText(row, "description", 2000),
    panoramaPath: sitePath(row.panorama_path),
    panoramaWidth: optionalNumber(row, "panorama_width", 256, 32768),
    fallbackImagePath: sitePath(row.fallback_image_path),
    initialView: { yaw: number(row, "initial_yaw"), pitch: number(row, "initial_pitch"), fov: number(row, "initial_fov", 0.1, 3.2) },
    ready: bool(row, "ready"),
    provenance,
    isPropertyMedia: isPropertyMedia(provenance),
    sourceNote: optionalText(row, "source_note", 2000),
    hotspots: mapRows("tour_hotspots", hotspots.filter((hotspot) => hotspot.scene_id === row.id), mapHotspot),
  };
}

function toReadyScenes(scenes: TourSceneRow[], hotspots: TourHotspotRow[]) {
  const ordered = [...hotspots].sort((a, b) => a.sort_order - b.sort_order);
  return mapRows("tour_scenes", scenes.filter((scene) => scene.ready === true), (scene) => mapScene(scene, ordered)).filter(
    (scene) => scene.panoramaPath !== null,
  );
}

/**
 * Scenes ready for the 360 viewer, each with its hotspots (two queries in total). Provenance
 * travels with every scene: demo/placeholder panoramas must keep their "not Tejjora" label.
 * Phase 8 wires this into the viewer; the page still reads src/data/virtualTour.ts today.
 */
export async function getReadyTourScenes(options?: ReadOptions): Promise<ContentResult<TourScene[]>> {
  return readContent(
    {
      domain: "tour",
      key: "tour:ready",
      tags: ["media"],
      load: async (db) => {
        const scenes = (
          await db.query<TourSceneRow>(
            `SELECT id, slug, label, eyebrow, description, media_id, panorama_path, panorama_width, fallback_image_path,
                    initial_yaw, initial_pitch, initial_fov, ready, provenance, source_note, sort_order
               FROM tour_scenes ORDER BY sort_order, slug`,
          )
        ).rows;
        if (!scenes.length) return null;
        const readyIds = scenes.filter((scene) => scene.ready).map((scene) => scene.id);
        const hotspots = readyIds.length
          ? (
              await db.query<TourHotspotRow>(
                `SELECT id, scene_id, yaw, pitch, label, target_type, target_value, sort_order
                   FROM tour_hotspots WHERE scene_id = ANY($1::text[]) ORDER BY scene_id, sort_order`,
                [readyIds],
              )
            ).rows
          : [];
        return toReadyScenes(scenes, hotspots);
      },
      fallback: () => toReadyScenes(tourSceneRows(), tourHotspotRows()),
    },
    options,
  );
}
