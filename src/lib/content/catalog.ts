import { assets } from "@/data/assets";
import { galleryItems } from "@/data/gallery";
import { homeFaqs } from "@/data/hospitality";
import { restaurantMenu, restaurantMenuSettings } from "@/data/menu";
import { offers } from "@/data/offers";
import { panoramaAssets } from "@/data/panoramaAssets";
import { hotelPolicies } from "@/data/policies";
import { propertyFactSources } from "@/data/propertyFacts";
import { rooms } from "@/data/rooms";
import { virtualTourScenes } from "@/data/virtualTour";
import type {
  EntityMediaRow,
  FaqRow,
  MediaAssetRow,
  MenuCategoryRow,
  MenuItemRow,
  OfferRow,
  PolicyRow,
  PropertyFactRow,
  RestaurantSettingsRow,
  RoomRow,
  TourHotspotRow,
  TourSceneRow,
} from "./rows";

/**
 * The existing src/data content expressed as database rows. One mapping feeds both
 * `npm run db:seed` and the read fallback, so a freshly seeded database and the fallback render
 * the same public content. Statuses follow the content ledger: demo offers and placeholder
 * policies stay unpublished, demo reviews are omitted, unknown room specs stay null.
 *
 * No server-only import: scripts/db-seed.mjs loads this through tsx.
 */

const slug = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

/** Stable media id derived from the site path, so re-seeding never duplicates an asset. */
export const mediaIdFor = (path: string) => `media-${slug(path.replace(/^\//, ""))}`;

type MediaSpec = { path: string; alt: string; provenance: MediaAssetRow["provenance"]; width?: number; height?: number; notes?: string };

function mediaSpecs(): MediaSpec[] {
  const specs: MediaSpec[] = [];
  const galleryAlt = new Map<string, string>(galleryItems.map((item) => [item.src, item.alt]));
  const photo = (path: string, alt: string) =>
    specs.push({ path, alt: galleryAlt.get(path) ?? alt, provenance: "tejjora", notes: "Hotel photography (SRC-DRIVE)." });

  photo(assets.hero.image, "Tejjora Lake View exterior in Gomti Nagar");
  for (const path of assets.hero.alternateImages) photo(path, "Exterior of Tejjora Lake View");
  for (const path of assets.lobby) photo(path, "Lobby at Tejjora Lake View");
  for (const room of rooms) {
    for (const path of room.imageSet) {
      specs.push({
        path,
        alt: galleryAlt.get(path) ?? `${room.name} at Tejjora Lake View`,
        provenance: "tejjora",
        notes: "Hotel photography. Room-category mapping is PROVISIONAL until the hotel confirms it.",
      });
    }
  }
  for (const path of assets.restaurant) photo(path, "Restaurant at Tejjora Lake View");

  specs.push({ path: "/brand/tejjora-logo.png", alt: "Tejjora Lake View logo", provenance: "tejjora", notes: "Hotel brand asset." });
  for (const [index, path] of ["/d1.png", "/d2.png", "/d3.png", "/d4.png", "/m1.png", "/m2.png", "/m3.png", "/m4.png"].entries()) {
    specs.push({
      path,
      alt: `Illustration of a terrace (frame ${(index % 4) + 1}; illustrative image, not a photograph of Tejjora Lake View)`,
      provenance: "illustrative",
      notes: "Terrace sequence; appears AI-rendered, origin unrecorded. Always label as illustrative.",
    });
  }
  for (const path of [...Object.values(assets.terraceView), ...Object.values(assets.food)]) {
    specs.push({ path, alt: "", provenance: "placeholder", notes: "Project-made neutral placeholder graphic." });
  }
  for (const asset of [panoramaAssets.demoLiving, panoramaAssets.demoKitchen, panoramaAssets.widePreview]) {
    specs.push({
      path: asset.src,
      alt: `${asset.label} (not Tejjora Lake View property media)`,
      provenance: "placeholder",
      width: asset.width,
      height: asset.height,
      notes: `${asset.note} Licence not recorded.`,
    });
  }
  return specs;
}

export function mediaAssetRows(): MediaAssetRow[] {
  const seen = new Set<string>();
  return mediaSpecs()
    .filter((spec) => (seen.has(spec.path) ? false : (seen.add(spec.path), true)))
    .map((spec) => ({
      id: mediaIdFor(spec.path),
      storage_path: spec.path,
      width: spec.width ?? null,
      height: spec.height ?? null,
      blur_data: null,
      alt: spec.alt,
      credit: spec.provenance === "tejjora" ? "Tejjora Lake View" : null,
      provenance: spec.provenance,
      licence: null,
      source_url: null,
      notes: spec.notes ?? null,
    }));
}

export function entityMediaRows(): EntityMediaRow[] {
  const rows: EntityMediaRow[] = [];
  for (const room of rooms) {
    room.imageSet.forEach((path, index) =>
      rows.push({ entity_type: "room", entity_id: room.id, media_id: mediaIdFor(path), role: "gallery", sort_order: index, layout_hint: null }),
    );
  }
  // Gallery order is global (the "All" view), so sort_order is the position in galleryItems.
  galleryItems.forEach((item, index) =>
    rows.push({ entity_type: "gallery", entity_id: item.category.toLowerCase(), media_id: mediaIdFor(item.src), role: "gallery", sort_order: index, layout_hint: item.shape }),
  );
  assets.restaurant.forEach((path, index) =>
    rows.push({ entity_type: "restaurant", entity_id: "main", media_id: mediaIdFor(path), role: "gallery", sort_order: index, layout_hint: null }),
  );
  for (const offer of offers) {
    rows.push({ entity_type: "offer", entity_id: offer.id, media_id: mediaIdFor(offer.image), role: "cover", sort_order: 0, layout_hint: null });
  }
  return rows;
}

export function roomRows(): RoomRow[] {
  return rooms.map((room, index) => ({
    id: room.id,
    slug: room.id,
    name: room.name,
    summary: room.shortDescription,
    body: room.longDescription,
    size_sqft: room.sizeSqFt,
    bed_type: room.bedType,
    max_adults: 2,
    max_children: null,
    view: room.view,
    amenities: room.amenities.map((amenity) => ({ id: amenity.id, label: amenity.label })),
    sort_order: index,
    published: true,
  }));
}

export function propertyFactRows(): PropertyFactRow[] {
  return propertyFactSources.map((fact) => ({
    key: fact.key,
    value: fact.value,
    status: fact.status,
    source: fact.source,
    public: fact.public,
    notes: fact.notes ?? null,
  }));
}

/** Demo offers are kept for layout work only: is_demo, never published. */
export function offerRows(): OfferRow[] {
  return offers.map((offer, index) => ({
    id: offer.id,
    slug: offer.id,
    title: offer.title,
    summary: offer.copy,
    terms: `Demo concept, not a hotel offer. Inclusions: ${offer.inclusions.join("; ")}.`,
    valid_from: null,
    valid_to: null,
    room_ids: [],
    adjustment_type: null,
    adjustment_value: null,
    promo_code: null,
    is_demo: true,
    sort_order: index,
    published: false,
  }));
}

const FAQ_IDS = ["faq-location", "faq-direct-booking", "faq-parking", "faq-breakfast", "faq-whatsapp"];

/**
 * The FAQs currently live on the home and contact pages. Their answers restate VERIFIED ledger
 * facts and the live booking flow, so they stay published. They are not hotel-approved yet
 * (approved_by is null). The stale src/data/faq.ts entries are not imported.
 */
export function faqRows(): FaqRow[] {
  return homeFaqs.map((item, index) => ({
    id: FAQ_IDS[index] ?? `faq-${index + 1}`,
    category: "general",
    question: item.q,
    answer: item.a,
    sort_order: index,
    published: true,
    approved_by: null,
    approved_at: null,
  }));
}

/** Generic placeholder guidance: stored unpublished until the hotel approves real policy text. */
export function policyRows(): PolicyRow[] {
  return hotelPolicies.map((policy, index) => ({
    id: `policy-${slug(policy.title)}`,
    slug: slug(policy.title),
    title: policy.title,
    body: policy.body,
    sort_order: index,
    published: false,
    approved_by: null,
    approved_at: null,
  }));
}

const tourProvenance = (kind: string | undefined): TourSceneRow["provenance"] => (kind === "property" ? "tejjora" : "placeholder");

export function tourSceneRows(): TourSceneRow[] {
  return virtualTourScenes.map((scene, index) => ({
    id: scene.id,
    slug: scene.id,
    label: scene.title,
    eyebrow: scene.eyebrow,
    description: scene.description,
    media_id: null,
    panorama_path: scene.panorama,
    panorama_width: scene.panoramaWidth,
    fallback_image_path: scene.fallbackImage,
    initial_yaw: scene.initialView.yaw,
    initial_pitch: scene.initialView.pitch,
    initial_fov: scene.initialView.fov,
    ready: scene.panoramaReady,
    provenance: tourProvenance(scene.mediaKind),
    source_note: scene.sourceNote ?? (scene.mediaKind === "pending" ? "Tejjora 360 photography not supplied yet." : null),
    sort_order: index,
  }));
}

export function tourHotspotRows(): TourHotspotRow[] {
  return virtualTourScenes.flatMap((scene) =>
    scene.hotspots.map((hotspot, index) => ({
      id: `${scene.id}--${hotspot.id}`,
      scene_id: scene.id,
      yaw: hotspot.position.yaw,
      pitch: hotspot.position.pitch,
      label: hotspot.label,
      target_type: hotspot.type,
      target_value: hotspot.type === "scene" ? hotspot.target ?? "" : hotspot.roomId ?? hotspot.target ?? "",
      sort_order: index,
    })),
  );
}

export function menuCategoryRows(): MenuCategoryRow[] {
  return restaurantMenu.map((category, index) => ({
    id: category.id,
    name: category.name,
    slug: category.id,
    sort_order: index,
    note: category.note ?? null,
    published: true,
  }));
}

export function menuItemRows(): MenuItemRow[] {
  return restaurantMenu.flatMap((category) =>
    category.items.map((item, index) => ({
      id: item.id,
      category_id: category.id,
      name: item.name,
      source_name: item.sourceName ?? null,
      description: item.description ?? null,
      portion: item.portion ?? null,
      variants: item.variants ?? [],
      price_full: item.priceFull,
      price_half: null,
      contains_egg: item.containsEgg ?? false,
      available: true,
      signature: false,
      sort_order: index,
      published: true,
      review_note: item.reviewNote ?? null,
    })),
  );
}

export function restaurantSettingsRow(): RestaurantSettingsRow {
  const settings = restaurantMenuSettings;
  return {
    id: 1,
    public_name: settings.publicName,
    opening_time: settings.openingTime,
    prep_minutes_min: settings.prepMinutesMin,
    prep_minutes_max: settings.prepMinutesMax,
    service_charge_pct: settings.serviceChargePct,
    taxes_note: settings.taxesNote,
    allergy_note: settings.allergyNote,
    no_cancel_note: settings.noCancelNote,
    price_change_note: settings.priceChangeNote,
    service_charge_note: settings.serviceChargeNote,
    ordering_enabled: settings.orderingEnabled,
    room_delivery_enabled: settings.roomDeliveryEnabled,
  };
}
