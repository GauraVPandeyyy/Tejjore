import type { CSSProperties } from "react";
import { amenities } from "@/data/amenities";
import { Icon, type IconName } from "@/components/ui/Icon";

type AmenityId = (typeof amenities)[number]["id"];

/** Icons for the ledger-verified amenities (`data/amenities.ts`). Nothing here adds a fact. */
const ICONS: Record<AmenityId, IconName> = {
  "air-conditioning": "snow",
  wifi: "wifi",
  parking: "parking",
  "front-desk": "clock",
  "room-service": "tray",
  restaurant: "dish",
  breakfast: "sun",
  tv: "screen",
  "work-desk": "desk",
  "private-bathroom": "bath",
};

/** Hotel-wide facilities vs. what every room has, split from the same verified list. */
export const HOTEL_FACILITIES: AmenityId[] = ["front-desk", "parking", "restaurant", "room-service", "breakfast", "wifi"];
export const ROOM_FACILITIES: AmenityId[] = ["air-conditioning", "wifi", "tv", "work-desk", "private-bathroom"];

/**
 * Hairline icon grid of verified amenities. `ids` picks and orders a subset; the label always
 * comes from the verified list, so the grid cannot drift from the content ledger.
 */
export function FacilityGrid({ ids, tone = "paper", label, columns }: { ids?: AmenityId[]; tone?: "paper" | "lake"; label: string; columns?: number }) {
  const list = (ids ?? amenities.map((item) => item.id)).flatMap((id) => {
    const item = amenities.find((amenity) => amenity.id === id);
    return item ? [item] : [];
  });
  return (
    <ul className={`tj-facilities tj-facilities--${tone}`} aria-label={label} style={columns ? ({ "--tj-facility-cols": columns } as CSSProperties) : undefined}>
      {list.map((item) => (
        <li key={item.id} className="tj-facilities__item">
          <span className="tj-facilities__icon" aria-hidden="true">
            <Icon name={ICONS[item.id]} size={26} />
          </span>
          <span className="tj-facilities__label">{item.label}</span>
        </li>
      ))}
    </ul>
  );
}
