import Image from "next/image";
import Link from "next/link";
import { assets } from "@/data/assets";
import { hotel } from "@/data/hotel";

export function FinalInvitation({ index = "12" }: { index?: string }) {
  const whatsappText = encodeURIComponent("Hello Tejjora Lake View, I would like to enquire about a stay at the hotel.");
  const destination = encodeURIComponent(`${hotel.address.line1}, ${hotel.address.locality}, ${hotel.address.city}, ${hotel.address.state} ${hotel.address.postalCode}`);

  return (
    <section id="contact" className="final-invitation" aria-labelledby="final-invitation-title">
      <Image src={assets.hero.alternateImages[0]} alt="Tejjora Lake View exterior" fill sizes="100vw" priority={false} />
      <div className="final-invitation__veil" aria-hidden="true" />
      <div className="site-container final-invitation__content">
        <span className="micro">{index} / COME CLOSER</span>
        <h2 id="final-invitation-title">Your room in Lucknow<br /><em>is closer than it feels.</em></h2>
        <div className="final-invitation__actions">
          <Link href="/book">Check dates <span aria-hidden="true">↗</span></Link>
          <a href={`tel:${hotel.phoneE164}`}>Call hotel</a>
          <a href={`https://wa.me/${hotel.whatsappE164}?text=${whatsappText}`} target="_blank" rel="noreferrer">WhatsApp</a>
          <a href={`https://www.google.com/maps/search/?api=1&query=${destination}`} target="_blank" rel="noreferrer">Directions</a>
        </div>
      </div>
    </section>
  );
}
