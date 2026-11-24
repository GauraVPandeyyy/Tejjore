import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { assets } from "@/data/assets";
import { getRooms } from "@/lib/content/rooms";
import { getReadyTourScenes } from "@/lib/content/tour";
import { seoMetadata } from "@/lib/content/seo";
import { siteUrl } from "@/lib/site";
import { RoomBookingRail } from "@/components/rooms/RoomBookingRail";
import { RoomCard } from "@/components/rooms/RoomCard";
import { RoomFilmstrip } from "@/components/rooms/RoomFilmstrip";
import { RoomHero } from "@/components/rooms/RoomHero";
import { StructuredData } from "@/components/seo/StructuredData";
import { CardCarousel } from "@/components/ui/CardCarousel";
import { FeatureBands } from "@/components/ui/FeatureBand";
import { Icon } from "@/components/ui/Icon";
import { Reveal } from "@/components/ui/Motion";
import { BookDirect } from "@/components/hotel/BookDirect";
import { RoomCompare } from "@/components/rooms/RoomCompare";
import { StayIncluded } from "@/components/rooms/StayIncluded";
import { suggestedFor } from "@/components/rooms/RoomCard";
import { AskTrigger } from "@/components/ui/AskTrigger";
import { ScrollReveal } from "@/components/motion/ScrollReveal";
import { plannerSuggestionsForRoom } from "@/lib/planner/rules";
import { SectionIntro } from "@/components/ui/SectionIntro";

type Params = { params: Promise<{ slug: string }> };

export const revalidate = 600;
// Only the three stable rooms exist; anything else is a 404.
export const dynamicParams = false;

export async function generateStaticParams() {
  const { data: rooms } = await getRooms();
  return rooms.map((room) => ({ slug: room.slug }));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const room = (await getRooms()).data.find((item) => item.slug === slug);
  if (!room) return {};
  return seoMetadata(`/rooms/${room.slug}`, {
    title: `${room.name} – Gomti Nagar, Lucknow`,
    description: room.shortDescription || `The ${room.name} at Tejjora Lake View, Gomti Nagar, Lucknow.`,
    alternates: { canonical: `/rooms/${room.slug}` },
    openGraph: room.imageSet[0] ? { images: [{ url: room.imageSet[0], alt: `${room.name} at Tejjora Lake View` }] } : undefined,
  });
}

export default async function RoomPage({ params }: Params) {
  const { slug } = await params;
  const [{ data: rooms }, { data: scenes }] = await Promise.all([getRooms(), getReadyTourScenes()]);
  const room = rooms.find((item) => item.slug === slug);
  if (!room) notFound();
  const others = rooms.filter((item) => item.id !== room.id);
  // A 360 link appears only when a ready scene of real property media exists for this room.
  const scene = scenes.find((item) => item.slug === room.id && item.isPropertyMedia);
  const tourRooms = new Set(scenes.filter((item) => item.isPropertyMedia).map((item) => item.slug));
  const reasons = plannerSuggestionsForRoom(room.id);

  // Verified specs only: anything not set by the hotel is hidden, never guessed.
  const specs = [
    room.maxGuests ? { label: "Guests", value: `Up to ${room.maxGuests}` } : null,
    room.bedType ? { label: "Bed", value: room.bedType } : null,
    room.sizeSqFt ? { label: "Size", value: `${room.sizeSqFt} sq ft` } : null,
    room.view ? { label: "View", value: room.view } : null,
  ].filter((item): item is { label: string; value: string } => item !== null);

  const base = siteUrl();
  const schema = [
    {
      "@context": "https://schema.org",
      "@type": "HotelRoom",
      name: room.name,
      description: room.shortDescription || undefined,
      url: `${base}/rooms/${room.slug}`,
      image: room.imageSet.slice(0, 3).map((src) => `${base}${src}`),
      amenityFeature: room.amenities.map((amenity) => ({ "@type": "LocationFeatureSpecification", name: amenity.label, value: true })),
      ...(room.maxGuests ? { occupancy: { "@type": "QuantitativeValue", maxValue: room.maxGuests } } : {}),
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: `${base}/` },
        { "@type": "ListItem", position: 2, name: "Rooms", item: `${base}/rooms` },
        { "@type": "ListItem", position: 3, name: room.name, item: `${base}/rooms/${room.slug}` },
      ],
    },
  ];

  return (
    <main className="tj-page tj-room-page tj-room-page--cine">
      <StructuredData data={schema} />
      <RoomHero room={room} />

      <div className="tj-container tj-room-page__layout">
        <div className="tj-room-page__main">
          <section aria-labelledby="room-about-title" className="tj-room-about">
            <p className="tj-eyebrow">About the room</p>
            <h2 id="room-about-title" className="sr-only">
              About the {room.name}
            </h2>
            {room.longDescription ? (
              <ScrollReveal as="p" containerClassName="tj-room-about__text" splitBy="words" effect="fade" baseOpacity={0.14} baseRotation={0} blurStrength={4} stagger={0.03} wordAnimationEnd="center 60%">
                {room.longDescription}
              </ScrollReveal>
            ) : room.shortDescription ? (
              <p className="tj-room-about__text tj-room-about__text--static">{room.shortDescription}</p>
            ) : null}
            <p className="tj-room-page__links">
              <Link className="tj-text-link" href="/gallery#chapter-Stay">
                <Icon name="camera" size={16} /> Every room in the gallery
              </Link>
              <Link className="tj-text-link" href={scene ? `/virtual-tour?scene=${scene.slug}` : "/virtual-tour"}>
                <Icon name="orbit" size={16} /> {scene ? "360° view of this room" : "360° hotel tour"}
              </Link>
              <AskTrigger topic={room.name} className="tj-text-link">
                <Icon name="chat" size={16} /> Ask about this room
              </AskTrigger>
            </p>
          </section>
          {reasons.length ? (
            <Reveal>
              <section aria-labelledby="for-title" className="tj-room-page__block tj-room-for tj-room-for--cine">
                <h2 id="for-title" className="tj-subheading">Suggested for {suggestedFor(room.id).join(", ").toLowerCase()}</h2>
                <blockquote>{reasons[0].reason}</blockquote>
                <p className="tj-room-for__source">
                  From the <Link href="/plan-your-stay">stay planner</Link>, which suggests a room from your trip.
                </p>
              </section>
            </Reveal>
          ) : null}
          {specs.length ? (
            <section aria-labelledby="specs-title" className="tj-room-page__block">
              <h2 id="specs-title" className="tj-subheading">The room</h2>
              <dl className="tj-specs tj-specs--cine">
                {specs.map((spec) => (
                  <div key={spec.label}>
                    <dt>{spec.label}</dt>
                    <dd>{spec.value}</dd>
                  </div>
                ))}
              </dl>
            </section>
          ) : null}
          {room.amenities.length ? (
            <section aria-labelledby="amenities-title" className="tj-room-page__block">
              <h2 id="amenities-title" className="tj-subheading">In the room</h2>
              <ul className="tj-amenities tj-amenities--cine">
                {room.amenities.map((amenity) => (
                  <li key={amenity.id}>
                    <span aria-hidden="true">✓</span>
                    {amenity.label}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </div>
        <div id="room-booking" className="tj-room-page__rail">
          <RoomBookingRail roomId={room.id} roomName={room.name} rate={room.rate} />
        </div>
      </div>

      <RoomFilmstrip images={room.imageSet} roomName={room.name} />

      <StayIncluded headingId="room-included-title" title={`Included with the ${room.name}`} />

      <section className="tj-section tj-compare-section tj-compare-section--lake" data-header-tone="dark" aria-labelledby="room-compare-title">
        <div className="tj-container">
          <SectionIntro id="room-compare-title" tone="lake" eyebrow="Side by side" title="How it compares">
            <p>Rates from this website’s current booking system, room only. Specs appear once the hotel publishes them for every room.</p>
          </SectionIntro>
        </div>
        <div className="tj-container tj-container--bleed-mobile">
          <RoomCompare rooms={rooms} tourRooms={tourRooms} highlight={room.id} tone="lake" />
        </div>
      </section>

      <section className="tj-direct-band" data-header-tone="dark" aria-labelledby="room-direct-title">
        <div className="tj-container">
          <SectionIntro id="room-direct-title" tone="lake" eyebrow="Book with confidence" title={`Book the ${room.name} direct`} />
          <BookDirect />
        </div>
      </section>

      {scene ? (
        <FeatureBands label="360° view" bands={[{ href: `/virtual-tour?scene=${scene.slug}`, eyebrow: "360° tour", title: `Step inside the ${room.name}`, image: room.imageSet[1] ?? assets.lobby[1], alt: "" }]} />
      ) : null}

      <section className="tj-section" aria-labelledby="other-rooms-title">
        <div className="tj-container">
          <h2 id="other-rooms-title" className="tj-heading tj-heading--center">
            Other rooms
          </h2>
        </div>
        <div className="tj-container tj-container--bleed-mobile">
          <CardCarousel label="Other rooms" desktopGrid>
            {others.map((other) => (
              <RoomCard key={other.id} room={other} />
            ))}
          </CardCarousel>
        </div>
      </section>
    </main>
  );
}
