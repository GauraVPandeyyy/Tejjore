import Link from "next/link";
import { hotel } from "@/data/hotel";
import { Icon, type IconName } from "@/components/ui/Icon";

type Moment = { id: string; icon: IconName; label: string; title: string; copy: string; link?: { href: string; label: string } };

/**
 * A stay from booking to departure, told only with what the site can stand behind: the direct
 * booking flow and its reference, the verified address, the ledger-verified amenities (24-hour
 * front desk, free private parking, room service, the restaurant, in-room essentials) and the
 * manage-booking lookup. No check-in times or services that are not confirmed.
 */
const MOMENTS: Moment[] = [
  {
    id: "book",
    icon: "key",
    label: "Before",
    title: "Book direct",
    copy: "Live rates from the hotel’s own booking system and a booking reference the moment your room is held.",
    link: { href: "/book", label: "Check dates" },
  },
  {
    id: "route",
    icon: "compass",
    label: "On the way",
    title: "Head for Vikalp Khand",
    copy: `${hotel.address.line1}, ${hotel.address.locality}. Live directions open in Google Maps, from wherever you are.`,
    link: { href: "/location", label: "Getting here" },
  },
  {
    id: "arrive",
    icon: "clock",
    label: "Arrival",
    title: "A desk that is always open",
    copy: "The front desk runs around the clock, and there is free private parking if you drive in.",
    link: { href: "/arrival", label: "Smart arrival" },
  },
  {
    id: "stay",
    icon: "bed",
    label: "In the room",
    title: "Settle in",
    copy: "Air conditioning, free Wi-Fi, a flat-screen TV, a work desk and a private bathroom in every category.",
    link: { href: "/rooms", label: "The rooms" },
  },
  {
    id: "dine",
    icon: "dish",
    label: "Meals",
    title: "Dine in, or in your room",
    copy: "Breakfast and the full menu at the hotel’s restaurant, with room service as part of the stay.",
    link: { href: "/dining", label: "The restaurant" },
  },
  {
    id: "manage",
    icon: "shield",
    label: "Any time",
    title: "Your booking, in hand",
    copy: "Look up a booking with its reference and your registered mobile — or simply call or message the hotel.",
    link: { href: "/manage-booking", label: "Manage booking" },
  },
];

export function StayMoments({ tone = "paper", limit }: { tone?: "paper" | "lake"; limit?: number }) {
  const moments = typeof limit === "number" ? MOMENTS.slice(0, limit) : MOMENTS;
  return (
    <ol className={`tj-moments tj-moments--${tone}`}>
      {moments.map((moment, index) => (
        <li key={moment.id} className="tj-moments__item">
          <span className="tj-moments__no" aria-hidden="true">
            {String(index + 1).padStart(2, "0")}
          </span>
          <span className="tj-moments__icon" aria-hidden="true">
            <Icon name={moment.icon} size={24} />
          </span>
          <p className="tj-eyebrow">{moment.label}</p>
          <h3 className="tj-moments__title">{moment.title}</h3>
          <p className="tj-moments__copy">{moment.copy}</p>
          {moment.link ? (
            <Link className="tj-text-link" href={moment.link.href}>
              {moment.link.label} <Icon name="arrow-right" size={16} />
            </Link>
          ) : null}
        </li>
      ))}
    </ol>
  );
}
