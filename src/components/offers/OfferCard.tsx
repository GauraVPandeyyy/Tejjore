import Link from "next/link";
import type { Offer } from "@/lib/content/types";
import { Icon } from "@/components/ui/Icon";

/** "1 Oct 2026 – 31 Oct 2026", "Until …", or null when the offer has no end date. */
export function offerWindow(offer: Offer) {
  const format = (value: string) => new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }).format(new Date(`${value}T12:00:00Z`));
  if (offer.validFrom && offer.validTo) return `${format(offer.validFrom)} – ${format(offer.validTo)}`;
  if (offer.validTo) return `Until ${format(offer.validTo)}`;
  return null;
}

/** An admin-published offer in the card grammar: title, validity, summary, code, one link. */
export function OfferCard({ offer, headingLevel = "h3", showTerms = false }: { offer: Offer; headingLevel?: "h2" | "h3"; showTerms?: boolean }) {
  const Heading = headingLevel;
  const validity = offerWindow(offer);
  return (
    <article className="tj-offer-card">
      <Heading className="tj-offer-card__title">{offer.title}</Heading>
      {validity ? <p className="tj-eyebrow">{validity}</p> : null}
      {offer.summary ? <p>{offer.summary}</p> : null}
      {offer.promoCode ? (
        <p className="tj-price">
          <span>Code</span> <strong>{offer.promoCode}</strong>
        </p>
      ) : null}
      {showTerms && offer.terms ? <p className="tj-offer-card__terms">{offer.terms}</p> : null}
      <Link className="tj-text-link" href="/book">
        Check dates <Icon name="arrow-right" size={16} />
      </Link>
    </article>
  );
}
