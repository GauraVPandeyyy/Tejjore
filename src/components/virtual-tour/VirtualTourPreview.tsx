import Image from "next/image";
import Link from "next/link";
import { assets } from "@/data/assets";
import { SectionLabel } from "@/components/shared/SectionLabel";

const tourEntries = [
  { label: "Deluxe", href: "/virtual-tour?scene=deluxe", image: assets.rooms.deluxe[0] },
  { label: "Super Deluxe", href: "/virtual-tour?scene=super-deluxe", image: assets.rooms.superDeluxe[0] },
  { label: "Premium", href: "/virtual-tour?scene=premium", image: assets.rooms.premium[0] },
] as const;

export function VirtualTourPreview({ index = "04" }: { index?: string }) {
  return (
    <section className="tour-preview" aria-labelledby="tour-preview-title">
      <div className="site-container">
        <div className="tour-preview__topline">
          <SectionLabel index={index}>STEP INSIDE</SectionLabel>
          <span className="micro">IMMERSIVE HOTEL TOUR</span>
        </div>

        <div className="tour-preview__intro">
          <h2 id="tour-preview-title">Step inside<br /><em>before you arrive.</em></h2>
          <p>
            Explore the spaces that shape a stay at Tejjora—from the rooms to reception, dining and
            the lake-facing side of the hotel. The immersive tour keeps each scene close to the room
            and booking journey.
          </p>
        </div>

        <div className="tour-preview__portal">
          <Link className="tour-preview__main" href="/virtual-tour?scene=premium" aria-label="Open Tejjora virtual tour">
            <Image
              src={assets.rooms.premium[0]}
              alt="Premium Room preview at Tejjora Lake View"
              fill
              sizes="(max-width: 820px) 100vw, 78vw"
              className="tour-preview__main-image"
            />
            <span className="tour-preview__shade" aria-hidden="true" />
            <span className="tour-preview__corner micro">VIRTUAL TOUR / ROOM PREVIEW</span>
            <span className="tour-preview__enter">
              <span>Preview the hotel</span>
              <span aria-hidden="true">↗</span>
            </span>
          </Link>

          <div className="tour-preview__rail" aria-label="Jump to room scenes">
            {tourEntries.map((entry, index) => (
              <Link key={entry.href} href={entry.href} className="tour-preview__rail-item">
                <span className="tour-preview__rail-thumb">
                  <Image src={entry.image} alt="" fill sizes="120px" />
                </span>
                <span className="tour-preview__rail-copy">
                  <small>{String(index + 1).padStart(2, "0")}</small>
                  <strong>{entry.label}</strong>
                </span>
                <span aria-hidden="true">↗</span>
              </Link>
            ))}
          </div>
        </div>

        <div className="tour-preview__footnote">
          <span>Entrance · Reception · Lobby · Rooms · Dining · Lake View</span>
          <Link href="/virtual-tour">Open full tour ↗</Link>
        </div>
      </div>
    </section>
  );
}
