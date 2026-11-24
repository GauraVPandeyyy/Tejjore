import Link from "next/link";
import { hotel } from "@/data/hotel";
import { Icon } from "@/components/ui/Icon";

const destination = `${hotel.address.line1}, ${hotel.address.locality}, ${hotel.address.city}, ${hotel.address.state} ${hotel.address.postalCode}`;
const directions = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination)}`;

/**
 * The numbered arrival journey (masterplan §4: /location and the booking confirmation). Numbers
 * come from the list itself, never hand-set. Only verified facts: the address, the hotel's phone
 * and WhatsApp, and free parking (amenities). No travel times or check-in hours — the hotel has
 * not published them — so routes open live in Google Maps instead.
 */
export function ArrivalJourney({ reference, tone = "paper" }: { reference?: string; tone?: "paper" | "lake" }) {
  const whatsappText = encodeURIComponent(reference ? `Hello Tejjora Lake View, I am on my way. My booking reference is ${reference}.` : "Hello Tejjora Lake View, I am on my way to the hotel.");
  const steps = [
    {
      title: "Plan the route",
      copy: "Open live directions to Vikalp Khand, Gomti Nagar — from the airport, a railway station or anywhere in the city.",
      action: <a className="tj-text-link" href={directions} target="_blank" rel="noreferrer">Directions <Icon name="arrow-up-right" size={16} /></a>,
    },
    {
      title: "Arriving by car",
      copy: "Free private parking is listed among the hotel’s amenities.",
      action: null,
    },
    {
      title: "Let us know you’re close",
      copy: "Call or message the hotel on the way and the front desk can help you find the entrance.",
      action: <a className="tj-text-link" href={`https://wa.me/${hotel.whatsappE164}?text=${whatsappText}`} target="_blank" rel="noreferrer">WhatsApp the hotel <Icon name="arrow-up-right" size={16} /></a>,
    },
    {
      title: "At the front desk",
      copy: reference ? `Share your booking reference, ${reference}, at reception.` : "Keep your booking reference handy; you can look it up at any time.",
      action: reference ? null : <Link className="tj-text-link" href="/manage-booking">Find my booking <Icon name="arrow-right" size={16} /></Link>,
    },
  ];
  return (
    <ol className={`tj-journey tj-journey--${tone}`}>
      {steps.map((step) => (
        <li key={step.title} className="tj-journey__step">
          <h3 className="tj-journey__title">{step.title}</h3>
          <p>{step.copy}</p>
          {step.action}
        </li>
      ))}
    </ol>
  );
}
