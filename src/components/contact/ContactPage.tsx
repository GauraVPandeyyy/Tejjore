import Link from "next/link";
import { assets } from "@/data/assets";
import { hotel } from "@/data/hotel";
import { getPublishedFaqs } from "@/lib/content/faqs";
import { FaqAccordion } from "@/components/faq/FaqAccordion";
import { PillAnchor, PillLink } from "@/components/ui/Buttons";
import { FeatureBands } from "@/components/ui/FeatureBand";
import { Icon } from "@/components/ui/Icon";
import { Reveal } from "@/components/ui/Motion";
import { SectionIntro } from "@/components/ui/SectionIntro";

/**
 * Contact (masterplan §4): the footer's NAP grammar (centred display titles), Call and WhatsApp
 * pills, a map band to /location, then the first published FAQs with a link to all of them.
 * Email shows only when the hotel has configured a public address (content ledger: missing).
 */
export async function ContactPage() {
  const { data: faqs } = await getPublishedFaqs();
  const address = `${hotel.address.line1}, ${hotel.address.locality}, ${hotel.address.city}, ${hotel.address.state} ${hotel.address.postalCode}`;
  const directions = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}`;
  const publicEmail = process.env.NEXT_PUBLIC_HOTEL_EMAIL?.trim();

  return (
    <>
      <section className="tj-section tj-section--first" aria-labelledby="contact-title">
        <div className="tj-container">
          <SectionIntro id="contact-title" as="h1" title="Contact">
            <p>Rooms, dining, special requests or help getting here — talk to the hotel directly.</p>
          </SectionIntro>
          <div className="tj-actions-row tj-contact__primary">
            <PillAnchor href={`tel:${hotel.phoneE164}`} variant="lake" arrow={false}>
              <Icon name="phone" size={18} /> Call the hotel
            </PillAnchor>
            <PillAnchor href={`https://wa.me/${hotel.whatsappE164}`} target="_blank" rel="noreferrer" arrow={false}>
              <Icon name="whatsapp" size={18} /> WhatsApp
            </PillAnchor>
          </div>

          <Reveal className="tj-contact">
            <div className="tj-contact__item">
              <h2 className="tj-contact__title">Phone</h2>
              <a className="tj-contact__link" href={`tel:${hotel.phoneE164}`}>
                {hotel.phoneDisplay}
              </a>
              <p>Calls and WhatsApp</p>
            </div>
            <div className="tj-contact__item">
              <h2 className="tj-contact__title">Address</h2>
              <address>
                {hotel.address.line1}
                <br />
                {hotel.address.locality}, {hotel.address.city}
                <br />
                {hotel.address.state} {hotel.address.postalCode}
              </address>
              <a className="tj-contact__link" href={directions} target="_blank" rel="noreferrer">
                Directions
              </a>
            </div>
            {publicEmail ? (
              <div className="tj-contact__item">
                <h2 className="tj-contact__title">Email</h2>
                <a className="tj-contact__link" href={`mailto:${publicEmail}`}>
                  {publicEmail}
                </a>
              </div>
            ) : null}
            <div className="tj-contact__item">
              <h2 className="tj-contact__title">Bookings</h2>
              <Link className="tj-contact__link" href="/book">
                Book a stay
              </Link>
              <Link className="tj-contact__link" href="/manage-booking">
                Manage a booking
              </Link>
            </div>
          </Reveal>
        </div>
      </section>

      <FeatureBands label="Getting here" bands={[{ href: "/location", eyebrow: "Location", title: "Map & directions", image: assets.hero.image, alt: "" }]} />

      {faqs.length ? (
        <section className="tj-section" aria-labelledby="contact-faq-title">
          <div className="tj-container tj-container--narrow">
            <SectionIntro id="contact-faq-title" title="Before you call" />
            <FaqAccordion faqs={faqs.slice(0, 5)} />
            {faqs.length > 5 ? (
              <div className="tj-actions-row">
                <PillLink href="/faq">All questions</PillLink>
              </div>
            ) : null}
          </div>
        </section>
      ) : null}
    </>
  );
}
