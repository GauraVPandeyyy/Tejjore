import type { GalleryCategoryName, GalleryImage } from "@/lib/content/types";

/**
 * Editorial curation: the strongest photograph of each subject, in presentation order. The gallery
 * features these first and keeps every other photograph one click away in the full set, so repeated
 * angles never carry equal weight. Matching is by file name, so it still works when an admin
 * re-uploads or re-orders media; categories with no curated match fall back to their first photos.
 */
const CURATED: Record<GalleryCategoryName, string[]> = {
  Hotel: ["exterior-blue-sky-01", "lobby-wide-01", "reception-01", "exterior-front-01"],
  Stay: ["super-deluxe-front-01", "deluxe-wide-01", "premium-wide-01", "premium-curtain-01", "super-deluxe-wide-01", "deluxe-bed-01"],
  Dining: ["restaurant-wide-01", "restaurant-editorial-01", "restaurant-daylight-01", "restaurant-depth-01"],
};

const FEATURE_COUNT: Record<GalleryCategoryName, number> = { Hotel: 4, Stay: 6, Dining: 4 };

export function pickFeatured(items: GalleryImage[], category: GalleryCategoryName): GalleryImage[] {
  const pool = items.filter((item) => item.category === category);
  const chosen: GalleryImage[] = [];
  for (const key of CURATED[category]) {
    const match = pool.find((item) => item.src.includes(key) && !chosen.includes(item));
    if (match) chosen.push(match);
  }
  for (const item of pool) {
    if (chosen.length >= Math.min(FEATURE_COUNT[category], pool.length)) break;
    if (!chosen.includes(item)) chosen.push(item);
  }
  return chosen.slice(0, FEATURE_COUNT[category]);
}

/** Hero fan: one strong photograph per subject. */
export function pickHeroSet(items: GalleryImage[]): GalleryImage[] {
  return (["Hotel", "Stay", "Dining"] as const).flatMap((category) => pickFeatured(items, category).slice(0, 1));
}
