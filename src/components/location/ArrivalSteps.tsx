import Image from "next/image";
import Link from "next/link";
import { assets } from "@/data/assets";
import { hotel } from "@/data/hotel";
import { Icon } from "@/components/ui/Icon";
import { Reveal } from "@/components/ui/Motion";

const destination = `${hotel.address.line1}, ${hotel.address.locality}, ${hotel.address.city}, ${hotel.address.state} ${hotel.address.postalCode}`;
const directions = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination)}`;
const whatsapp = `https://wa.me/${hotel.whatsappE164}?text=${encodeURIComponent("Hello Tejjora Lake View, I am on my way to the hotel.")}`;

/**
 * The arrival guidance as four photographed steps, in the order a guest meets them. Copy states only
 * verified facts (the address, free private parking, the hotel's phone and WhatsApp, a booking
 * reference); there are no travel times, so routes open live in Google Maps.
 */
export function ArrivalSteps() {
  const steps = [
    {
      title: "Plan the route",
      copy: "Open live directions to Vikalp Khand, Gomti Nagar — from the airport, a railway station or anywhere in the city.",
      image: assets.hero.alternateImages[1],
      alt: "Tejjora Lake View from the street",
      action: (
        <a className="tj-text-link" href={directions} target="_blank" rel="noreferrer">
          Directions <Icon name="arrow-up-right" size={16} />
        </a>
      ),
    },
    {
      title: "Arriving by car",
      copy: "Free private parking is listed among the hotel’s amenities.",
      image: assets.hero.alternateImages[0],
      alt: "The front of the hotel and its forecourt",
      action: null,
    },
    {
      title: "Let us know you’re close",
      copy: "Call or message the hotel on the way and the front desk can help you find the entrance.",
      image: assets.lobby[3],
      alt: "The arrival area just inside the entrance",
      action: (
        <a className="tj-text-link" href={whatsapp} target="_blank" rel="noreferrer">
          WhatsApp the hotel <Icon name="arrow-up-right" size={16} />
        </a>
      ),
    },
    {
      title: "At the front desk",
      copy: "Keep your booking reference handy; you can look it up at any time.",
      image: assets.lobby[2],
      alt: "The reception desk",
      action: (
        <Link className="tj-text-link" href="/manage-booking">
          Find my booking <Icon name="arrow-right" size={16} />
        </Link>
      ),
    },
  ];
  return (
    <ol className="lx-steps">
      {steps.map((step, index) => (
        <Reveal as="li" key={step.title} className="lx-steps__item" delay={index * 0.07}>
          <span className="lx-steps__photo">
            <Image src={step.image} alt={step.alt} fill sizes="(min-width: 1024px) 22vw, 80vw" />
            <span className="lx-steps__no" aria-hidden="true">
              {String(index + 1).padStart(2, "0")}
            </span>
          </span>
          <h3>{step.title}</h3>
          <p>{step.copy}</p>
          {step.action}
        </Reveal>
      ))}
    </ol>
  );
}
