import Image from "next/image";
import Link from "next/link";
import { assets } from "@/data/assets";
import { FacilityGrid, HOTEL_FACILITIES, ROOM_FACILITIES } from "@/components/hotel/FacilityGrid";
import { Icon } from "@/components/ui/Icon";

/**
 * "Included in your stay": the verified in-room and hotel amenities (data/amenities.ts via
 * FacilityGrid) beside the stay support the site can stand behind — the always-open front desk,
 * and help before and after booking. No inclusions
 * (breakfast in the rate, transfers, upgrades) are implied.
 */
export function StayIncluded({ headingId = "included-title", title = "Included in your stay" }: { headingId?: string; title?: string }) {
  const support = [
    { icon: "clock" as const, title: "Front desk, 24 hours", copy: "Arrive late or leave early; someone is always at the desk." },
    { icon: "parking" as const, title: "Free private parking", copy: "Parking at the hotel is free for guests." },
    { icon: "chat" as const, title: "One number for everything", copy: "Call or WhatsApp the hotel before, during and after your stay." },
  ];
  return (
    <section className="tj-included" aria-labelledby={headingId}>
      <div className="tj-container tj-included__grid">
        <div className="tj-included__intro">
          <p className="tj-eyebrow">The stay</p>
          <h2 id={headingId} className="tj-heading">{title}</h2>
          <p className="tj-included__lead">Every room shares the same essentials and the same hotel around it, so you choose by space and feel — never by what is missing.</p>
          <figure className="tj-included__photo">
            <Image src={assets.lobby[2]} alt="Reception at Tejjora Lake View" fill sizes="(min-width: 1024px) 34vw, 92vw" />
          </figure>
        </div>
        <div className="tj-included__lists">
          <h3 className="tj-included__sub">In every room</h3>
          <FacilityGrid ids={ROOM_FACILITIES} label="In every room" />
          <h3 className="tj-included__sub">Around your room</h3>
          <FacilityGrid ids={HOTEL_FACILITIES} label="Hotel facilities" columns={3} />
          <h3 className="tj-included__sub">Looking after you</h3>
          <ul className="tj-included__support">
            {support.map((item) => (
              <li key={item.title}>
                <span className="tj-included__icon" aria-hidden="true">
                  <Icon name={item.icon} size={20} />
                </span>
                <strong>{item.title}</strong>
                <span>{item.copy}</span>
              </li>
            ))}
          </ul>
          <Link href="/dining" className="tj-text-link">
            See the restaurant and menu <Icon name="arrow-right" size={16} />
          </Link>
        </div>
      </div>
    </section>
  );
}
