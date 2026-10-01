import Image from "next/image";
import Link from "next/link";
import { hotel } from "@/data/hotel";
import { homeFaqs } from "@/data/hospitality";
import { SectionLabel } from "@/components/shared/SectionLabel";

export function ContactPage() {
  const address = `${hotel.address.line1}, ${hotel.address.locality}, ${hotel.address.city}, ${hotel.address.state} ${hotel.address.postalCode}`;
  const maps = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
  const publicEmail = process.env.NEXT_PUBLIC_HOTEL_EMAIL?.trim();
  return <>
    <section className="v3-contact-hero"><div className="v3-contact-hero__media"><Image src="/images/lobby/tejjora-reception-01.webp" alt="Reception at Tejjora Lake View" fill priority sizes="100vw"/><span/></div><div className="site-container v3-contact-hero__content"><SectionLabel index="01">CONTACT</SectionLabel><h1>One conversation<br/><em>closer to the hotel.</em></h1><p>For room questions, dining enquiries, special requests or help getting here, reach Tejjora directly.</p></div></section>
    <section className="v2-contact"><div className="site-container v2-contact__grid"><div><span className="micro">CALL</span><a href={`tel:${hotel.phoneE164}`}>{hotel.phoneDisplay}</a></div>{publicEmail ? <div><span className="micro">EMAIL</span><a href={`mailto:${publicEmail}`}>{publicEmail}</a></div> : null}<div><span className="micro">WHATSAPP</span><a href={`https://wa.me/${hotel.whatsappE164}`}>Start a conversation ↗</a></div><div><span className="micro">ADDRESS</span><address>{hotel.address.line1}<br/>{hotel.address.locality}, {hotel.address.city}<br/>{hotel.address.state} {hotel.address.postalCode}</address><a href={maps} target="_blank" rel="noreferrer">Open in Maps ↗</a></div><div><span className="micro">BOOKING</span><Link href="/book">Check availability ↗</Link><Link href="/manage-booking">Manage a booking ↗</Link></div></div></section>
    <section className="v2-faq v2-faq--contact"><div className="site-container v2-faq__layout"><div><SectionLabel index="02">FAQ</SectionLabel><h2>Before you<br /><em>pick up the phone.</em></h2></div><div className="v2-faq__items">{homeFaqs.map(item=><details key={item.q}><summary>{item.q}<span>+</span></summary><p>{item.a}</p></details>)}</div></div></section>
  </>;
}
