import Image from "next/image";
import Link from "next/link";
import { assets } from "@/data/assets";
import { homeFaqs, signatureAmenities, stayReasons } from "@/data/hospitality";
import { rooms } from "@/data/rooms";
import { formatMoney } from "@/data/commerce";
import { SectionLabel } from "@/components/shared/SectionLabel";

export function HomeStayReasons() {
  return (
    <section className="v2-stay-reasons" aria-labelledby="stay-reasons-title">
      <div className="site-container">
        <div className="v2-section-head">
          <SectionLabel index="04">WHY STAY HERE</SectionLabel>
          <h2 id="stay-reasons-title">A hotel that works<br /><em>with the reason you came.</em></h2>
        </div>
        <div className="v2-stay-reasons__grid">
          {stayReasons.map((item, index) => (
            <article key={item.label}>
              <span>{String(index + 1).padStart(2, "0")}</span>
              <small>{item.label}</small>
              <h3>{item.title}</h3>
              <p>{item.copy}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

export function HomeAmenities() {
  return (
    <section className="v2-amenities" aria-labelledby="amenities-title">
      <div className="site-container">
        <div className="v2-amenities__intro">
          <SectionLabel index="06">THE USEFUL THINGS</SectionLabel>
          <h2 id="amenities-title">Hospitality is often<br /><em>in the practical details.</em></h2>
          <p>Tejjora keeps the everyday parts of a stay close: connectivity, parking, dining, room service and help when you need it.</p>
        </div>
        <div className="v2-amenities__grid">
          {signatureAmenities.map((item) => <article key={item.title}><h3>{item.title}</h3><p>{item.copy}</p></article>)}
        </div>
      </div>
    </section>
  );
}

export function HomeRoomPreview() {
  return (
    <section className="v2-room-preview" aria-labelledby="room-preview-title">
      <div className="site-container">
        <div className="v2-section-head v2-section-head--split">
          <div><SectionLabel index="03">STAY</SectionLabel><h2 id="room-preview-title">Spaces for slow mornings,<br /><em>restful nights and the hours between.</em></h2></div>
          <p>Three room categories keep the choice simple. Start with the mood and budget that fit your trip, then compare the details before you book.</p>
        </div>
        <div className="v2-room-preview__grid">
          {rooms.map((room, index) => (
            <article key={room.id}>
              <Link href={`/rooms#${room.id}`} className="v2-room-preview__media"><Image src={room.imageSet[0]} alt={`${room.name} at Tejjora Lake View`} fill sizes="(max-width: 760px) 100vw, 33vw" /><span>{String(index+1).padStart(2,"0")}</span></Link>
              <div><h3>{room.name}</h3><p>{room.shortDescription}</p><strong>From {formatMoney(room.startingPrice ?? 0)} / night</strong><Link href={`/book?room=${room.id}`}>Check availability ↗</Link></div>
            </article>
          ))}
        </div>
        <Link className="v2-text-link" href="/rooms">Compare all rooms ↗</Link>
      </div>
    </section>
  );
}

export function HomeExperiencesPreview() {
  const experiences = [
    {
      label: "THE TERRACE",
      title: "Watch the lake change with the day.",
      copy: "Morning light, open daylight, sunset and the city after dark — one view, four distinct moods.",
      image: "/d3.png",
      href: "/#lake-view",
    },
    {
      label: "THE TABLE",
      title: "Keep dinner close when the day runs long.",
      copy: "An on-site dining room keeps breakfast and an easy meal inside the stay, without adding another journey.",
      image: assets.restaurant[0],
      href: "/dining",
    },
    {
      label: "GOMTI NAGAR",
      title: "Step into Lucknow. Return to a quieter base.",
      copy: "Vikalp Khand keeps business, shopping and city plans within reach while the hotel stays easy to return to.",
      image: assets.hero.alternateImages[0],
      href: "/location",
    },
  ] as const;

  return (
    <section className="v3-experiences-preview" aria-labelledby="experiences-preview-title">
      <div className="site-container">
        <div className="v2-section-head v2-section-head--split">
          <div>
            <SectionLabel index="08">EXPERIENCES</SectionLabel>
            <h2 id="experiences-preview-title">More than a room.<br /><em>A few reasons to remember the stay.</em></h2>
          </div>
          <p>Tejjora is deliberately simple: the room, the table, the terrace and the city around it. Explore the parts that shape the stay.</p>
        </div>
        <div className="v3-experiences-preview__grid">
          {experiences.map((item, index) => (
            <Link href={item.href} key={item.label} className="v3-experience-card">
              <span className="v3-experience-card__media">
                <Image src={item.image} alt="" fill sizes="(max-width:760px) 92vw, 33vw" />
                <span className="v3-experience-card__number">{String(index + 1).padStart(2, "0")}</span>
              </span>
              <span className="v3-experience-card__copy">
                <small>{item.label}</small>
                <strong>{item.title}</strong>
                <p>{item.copy}</p>
                <span className="v3-liquid-link">Explore <i aria-hidden="true">↗</i></span>
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

export function HomeFaqPreview() {
  return (
    <section className="v2-faq" aria-labelledby="faq-title">
      <div className="site-container v2-faq__layout">
        <div><SectionLabel index="11">GOOD TO KNOW</SectionLabel><h2 id="faq-title">A few answers<br /><em>before you arrive.</em></h2><Link href="/contact">Ask the hotel directly ↗</Link></div>
        <div className="v2-faq__items">
          {homeFaqs.map((item) => <details key={item.q}><summary>{item.q}<span aria-hidden="true">+</span></summary><p>{item.a}</p></details>)}
        </div>
      </div>
    </section>
  );
}

export function HomeGalleryPreview() {
  const images = [assets.lobby[0], assets.rooms.premium[0], assets.restaurant[1], assets.hero.alternateImages[1], assets.rooms.deluxe[1]];
  return (
    <section className="v2-gallery-preview" aria-labelledby="gallery-preview-title">
      <div className="site-container">
        <div className="v2-section-head v2-section-head--split"><div><SectionLabel index="09">GALLERY</SectionLabel><h2 id="gallery-preview-title">A closer look<br /><em>before check-in.</em></h2></div><Link href="/gallery">Open the full gallery ↗</Link></div>
        <div className="v2-gallery-preview__grid">{images.map((src,index)=><figure key={src} data-index={index}><Image src={src} alt="Tejjora Lake View hotel" fill sizes="(max-width:760px) 50vw, 30vw" /></figure>)}</div>
      </div>
    </section>
  );
}
