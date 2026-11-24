import Link from "next/link";
import { assets } from "@/data/assets";
import { formatMoney } from "@/data/commerce";
import { getPublicPropertyFacts } from "@/lib/content/facts";
import { getPublishedFaqs } from "@/lib/content/faqs";
import { getRooms } from "@/lib/content/rooms";
import { getReadyTourScenes } from "@/lib/content/tour";
import { FaqAccordion } from "@/components/faq/FaqAccordion";
import { BookDirect } from "@/components/hotel/BookDirect";
import { BlurText } from "@/components/motion/BlurText";
import { ScrollReveal } from "@/components/motion/ScrollReveal";
import { FeatureBands } from "@/components/ui/FeatureBand";
import { Icon } from "@/components/ui/Icon";
import { SectionIntro } from "@/components/ui/SectionIntro";
import { suggestedFor } from "./RoomCard";
import { RoomChapter } from "./RoomChapter";
import { RoomCompare } from "./RoomCompare";
import { RoomsTriptych } from "./RoomsTriptych";
import { StayIncluded } from "./StayIncluded";

/**
 * Rooms, as a journey: a cinematic triptych of the three categories (live rate on each) → the live
 * rate ribbon → each room as a layered editorial chapter → a side-by-side comparison on lake →
 * what every stay includes → booking confidence → published FAQs → explore.
 * Prices come only from the rate card (lib/booking/rateCard.ts); no room spec is shown unless set.
 */
export async function RoomsIndex() {
  const [{ data: rooms }, { data: faqs }, { data: facts }, { data: scenes }] = await Promise.all([getRooms(), getPublishedFaqs(), getPublicPropertyFacts(), getReadyTourScenes()]);
  const totalRooms = facts.get("rooms.total");
  const tourRooms = new Set(scenes.filter((scene) => scene.isPropertyMedia).map((scene) => scene.slug));
  const priced = rooms.filter((room) => room.rate);
  const panels = rooms.map((room) => ({
    id: room.id,
    slug: room.slug,
    name: room.name,
    blurb: room.shortDescription || null,
    image: room.imageSet[0],
    photoCount: room.imageSet.length,
    suggested: suggestedFor(room.id),
    rate: room.rate,
  }));
  return (
    <main className="tj-page tj-rooms-page">
      {/* Old in-page anchors (/rooms#deluxe) now live at /rooms/deluxe. */}
      <script dangerouslySetInnerHTML={{ __html: `(function(){var m=location.hash.match(/^#(deluxe|super-deluxe|premium)$/);if(m)location.replace("/rooms/"+m[1]);})();` }} />

      <section className="tj-rooms-cine" aria-labelledby="rooms-page-title">
        <div className="tj-container tj-rooms-cine__head">
          <div>
            <p className="tj-eyebrow">{typeof totalRooms === "number" ? `Stay · ${totalRooms} rooms in ${rooms.length} categories` : "Stay"}</p>
            <h1 id="rooms-page-title" className="sr-only">
              The rooms
            </h1>
            <p className="tj-rooms-cine__title" aria-hidden="true">
              <BlurText as="span" text="The rooms" effect="focus" blur={14} distance={0} delay={150} stepDuration={0.7} trigger="load" />
            </p>
          </div>
          <p className="tj-rooms-cine__lead">Three room categories at Tejjora Lake View, every one photographed at the hotel. Choose a room to explore it.</p>
        </div>
        <div className="tj-container tj-rooms-cine__stage">
          <RoomsTriptych panels={panels} />
        </div>
      </section>

      <section className="tj-rooms-ribbon-band" aria-label="Rates and sections">
        <div className="tj-container">
          {priced.length ? (
            <div className="tj-rate-ribbon" aria-label="Live direct rates">
              <span className="tj-rate-ribbon__live">
                <span className="tj-ai-live" aria-hidden="true" /> Live direct rates
              </span>
              <ul>
                {priced.map((room) => (
                  <li key={room.id}>
                    <Link href={`/rooms/${room.slug}`}>
                      <span>{room.name.replace(/ Room$/, "")}</span>
                      <strong data-rate-room={room.id} data-from-rate={room.rate!.fromRate}>
                        <small>from</small> {formatMoney(room.rate!.fromRate)}
                      </strong>
                    </Link>
                  </li>
                ))}
              </ul>
              <span className="tj-rate-ribbon__note">Per night · room only · your dates give the exact price</span>
            </div>
          ) : (
            <p className="tj-rooms-ribbon-band__note">Prices are the hotel&rsquo;s own direct rates, shown live for your dates.</p>
          )}
          <nav className="tj-rooms-jump" aria-label="On this page">
            <a href="#rooms-chapters">Room by room</a>
            <a href="#compare-title">Compare</a>
            <a href="#included-title">Included</a>
            {faqs.length ? <a href="#rooms-faq-title">Questions</a> : null}
          </nav>
        </div>
      </section>

      <section id="rooms-chapters" className="tj-section tj-room-chapters" aria-labelledby="rooms-photos-title">
        <div className="tj-container tj-room-chapters__intro">
          <p className="tj-eyebrow">Look closer</p>
          <h2 id="rooms-photos-title" className="sr-only">
            Room by room
          </h2>
          <ScrollReveal as="p" containerClassName="tj-room-chapters__statement" splitBy="words" effect="fade" baseOpacity={0.12} baseRotation={0} blurStrength={4} stagger={0.04}>
            Three rooms, one standard of comfort. Choose by space and feel — and judge each one from the photographs.
          </ScrollReveal>
        </div>
        {rooms.map((room, index) => (
          <RoomChapter key={room.id} room={room} index={index} hasTour={tourRooms.has(room.id)} />
        ))}
      </section>

      <section className="tj-section tj-compare-section tj-compare-section--lake" data-header-tone="dark" aria-labelledby="compare-title">
        <div className="tj-container">
          <SectionIntro id="compare-title" tone="lake" eyebrow="Side by side" title="Compare at a glance">
            <p>Rates from this website’s current booking system, per night, room only. Sizes, beds and views appear here once the hotel publishes them for every room.</p>
          </SectionIntro>
        </div>
        <div className="tj-container tj-container--bleed-mobile">
          <RoomCompare rooms={rooms} tourRooms={tourRooms} tone="lake" />
        </div>
      </section>

      <StayIncluded />

      <section className="tj-direct-band" data-header-tone="dark" aria-labelledby="direct-title">
        <div className="tj-container">
          <SectionIntro id="direct-title" tone="lake" eyebrow="Book with confidence" title="Booking direct">
            <p>Book on this site and deal with the hotel itself, from the first question to the day you leave.</p>
          </SectionIntro>
          <BookDirect />
        </div>
      </section>

      {faqs.length ? (
        <section className="tj-section tj-faq" aria-labelledby="rooms-faq-title">
          <div className="tj-container tj-container--narrow">
            <SectionIntro id="rooms-faq-title" title="Before you book" />
            <FaqAccordion faqs={faqs.slice(0, 5)} />
            <p className="tj-faq__more">
              <Link className="tj-text-link" href="/faq">
                More questions <Icon name="arrow-right" size={16} />
              </Link>
            </p>
          </div>
        </section>
      ) : null}

      <FeatureBands
        label="More to explore"
        bands={[
          { href: "/gallery#chapter-Stay", eyebrow: "Gallery", title: "See every room", image: assets.rooms.deluxe[1], alt: "" },
          { href: "/virtual-tour", eyebrow: "360° tour", title: "Look inside", image: assets.lobby[1], alt: "" },
          { href: "/plan-your-stay", eyebrow: "Plan", title: "Which room suits you?", image: assets.rooms.premium[2], alt: "" },
        ]}
      />
    </main>
  );
}
