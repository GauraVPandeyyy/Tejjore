import { hotel } from "@/data/hotel";
import { nearbyPlaces } from "@/data/nearby";
import { Icon, type IconName } from "@/components/ui/Icon";

const FROM = `${hotel.address.line1}, ${hotel.address.locality}, ${hotel.address.city} ${hotel.address.postalCode}`;
const ICONS: Record<string, IconName> = { Shopping: "tray", "Business / Events": "desk", Landmark: "pin", Airport: "compass", Railway: "compass" };

function directions(to: string) {
  const params = new URLSearchParams({ api: "1", origin: FROM, destination: to, travelmode: "driving" });
  return `https://www.google.com/maps/dir/?${params.toString()}`;
}

/**
 * Local discovery from the verified nearby list (names and categories only). No distances or
 * travel times are published, so each card opens live directions from the hotel instead.
 */
export function LocalDiscovery({ tone = "paper" }: { tone?: "paper" | "lake" }) {
  return (
    <ul className={`tj-discover tj-discover--${tone}`}>
      {nearbyPlaces.map((place, index) => (
        <li key={place.id}>
          <a className="tj-discover__card" href={directions(place.mapsQuery)} target="_blank" rel="noreferrer" aria-label={`${place.name}: directions from the hotel in Google Maps`}>
            <span className="tj-discover__top">
              <span className="tj-discover__no" aria-hidden="true">
                {String(index + 1).padStart(2, "0")}
              </span>
              <Icon name={ICONS[place.category] ?? "pin"} size={22} />
            </span>
            <span className="tj-eyebrow">{place.category}</span>
            <span className="tj-discover__name">{place.name}</span>
            <span className="tj-discover__go">
              Directions <Icon name="arrow-up-right" size={16} />
            </span>
          </a>
        </li>
      ))}
    </ul>
  );
}
