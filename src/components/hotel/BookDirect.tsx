import Link from "next/link";
import { hotel } from "@/data/hotel";
import { Icon, type IconName } from "@/components/ui/Icon";

/**
 * Booking confidence, limited to what this site actually does: live direct rates from the hotel's
 * booking system (room only, as the cards say), a reference as soon as a room is held, an online
 * lookup with that reference and the registered mobile, and a person to talk to.
 * No "best price", refund or payment-method claims.
 */
const POINTS: Array<{ icon: IconName; title: string; copy: string }> = [
  { icon: "key", title: "One price source", copy: "Prices on this website come from the same current booking system, and you see the full total before you pay." },
  { icon: "shield", title: "A reference straight away", copy: "Your booking reference appears the moment your room is held, ready to copy." },
  { icon: "clock", title: "Look it up any time", copy: "Check a booking online with its reference and your registered mobile number." },
  { icon: "chat", title: "A person to ask", copy: "Call or message the hotel on WhatsApp before or after you book." },
];

export function BookDirect({ tone = "lake" }: { tone?: "paper" | "lake" }) {
  return (
    <div className={`tj-direct tj-direct--${tone}`}>
      <ul className="tj-direct__points">
        {POINTS.map((point) => (
          <li key={point.title}>
            <span className="tj-direct__icon" aria-hidden="true">
              <Icon name={point.icon} size={22} />
            </span>
            <strong>{point.title}</strong>
            <span>{point.copy}</span>
          </li>
        ))}
      </ul>
      <div className="tj-actions-row">
        <Link href="/book" className={`tj-pill ${tone === "lake" ? "tj-pill--cream" : "tj-pill--lake"}`}>
          <span>Check dates</span>
          <span className="tj-pill__dot" aria-hidden="true" />
        </Link>
        <a href={`https://wa.me/${hotel.whatsappE164}`} target="_blank" rel="noreferrer" className={`tj-pill ${tone === "lake" ? "tj-pill--outline-light" : "tj-pill--outline"}`}>
          <span>
            <Icon name="whatsapp" size={16} /> Ask on WhatsApp
          </span>
        </a>
        <Link href="/manage-booking" className={`tj-pill ${tone === "lake" ? "tj-pill--outline-light" : "tj-pill--outline"}`}>
          <span>Manage a booking</span>
        </Link>
      </div>
    </div>
  );
}
