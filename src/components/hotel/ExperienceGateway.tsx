import Image from "next/image";
import Link from "next/link";
import { assets } from "@/data/assets";
import { SectionLabel } from "@/components/shared/SectionLabel";

const entries = [
  {
    id: "dining",
    eyebrow: "DINE",
    title: "Breakfast downstairs. Dinner without another journey.",
    copy: "See the restaurant, breakfast story and the spaces around the table.",
    href: "/experience#restaurant",
    image: assets.restaurant[0],
  },
  {
    id: "tour",
    eyebrow: "STEP INSIDE",
    title: "Look around before the room becomes yours.",
    copy: "Move from arrival to rooms and dining through the immersive hotel tour.",
    href: "/virtual-tour",
    image: assets.rooms.premium[0],
  },
  {
    id: "planner",
    eyebrow: "PLAN",
    title: "Shape the stay around why you are in Lucknow.",
    copy: "Tell us the trip, arrival and preferences; the planner narrows the next steps.",
    href: "/plan-your-stay",
    image: assets.lobby[0],
  },
] as const;

export function ExperienceGateway() {
  return (
    <section className="experience-gateway" aria-labelledby="experience-gateway-title">
      <div className="site-container">
        <div className="experience-gateway__topline">
          <SectionLabel index="04">BEYOND THE ROOM</SectionLabel>
          <Link href="/experience" className="experience-gateway__all">Explore the hotel ↗</Link>
        </div>

        <div className="experience-gateway__heading">
          <h2 id="experience-gateway-title">The stay keeps going<br /><em>after the key turns.</em></h2>
          <p>Dining, immersive previews and trip planning now live as deeper experiences instead of extending the homepage indefinitely.</p>
        </div>

        <div className="experience-gateway__grid">
          {entries.map((entry, index) => (
            <Link key={entry.id} href={entry.href} className="experience-gateway__card">
              <span className="experience-gateway__media">
                <Image src={entry.image} alt="" fill sizes="(max-width: 760px) 100vw, 33vw" />
                <span className="experience-gateway__shade" aria-hidden="true" />
              </span>
              <span className="experience-gateway__copy">
                <small>{String(index + 1).padStart(2, "0")} / {entry.eyebrow}</small>
                <strong>{entry.title}</strong>
                <span>{entry.copy}</span>
                <i aria-hidden="true">↗</i>
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
