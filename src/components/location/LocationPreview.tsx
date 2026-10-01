import Link from "next/link";
import { hotel } from "@/data/hotel";
import { nearbyPlaces } from "@/data/nearby";
import { SectionLabel } from "@/components/shared/SectionLabel";

export function LocationPreview() {
  return (
    <section className="location-preview" aria-labelledby="location-preview-title">
      <div className="site-container">
        <div className="location-preview__topline">
          <SectionLabel index="06">LOCATION</SectionLabel>
          <span className="micro">VIKALP KHAND · GOMTI NAGAR · LUCKNOW</span>
        </div>

        <div className="location-preview__grid">
          <div>
            <h2 id="location-preview-title">Close to the city.<br /><em>Easy to return to.</em></h2>
            <address>
              {hotel.address.line1}<br />
              {hotel.address.locality}, {hotel.address.city}<br />
              {hotel.address.state} {hotel.address.postalCode}
            </address>
            <Link href="/location" className="location-preview__cta">Plan the route <span aria-hidden="true">↗</span></Link>
          </div>

          <div className="location-preview__places" aria-label="Nearby places preview">
            {nearbyPlaces.slice(0, 4).map((place, index) => (
              <div key={place.id}>
                <span>{String(index + 1).padStart(2, "0")}</span>
                <p><small>{place.category}</small><strong>{place.name}</strong></p>
              </div>
            ))}
            <Link href="/location">Directions, nearby places and arrival details ↗</Link>
          </div>
        </div>
      </div>
    </section>
  );
}
