"use client";

import { hotel } from "@/data/hotel";

const destination = `${hotel.address.line1}, ${hotel.address.locality}, ${hotel.address.city}, ${hotel.address.state} ${hotel.address.postalCode}, ${hotel.address.country}`;

export function GoogleMapExperience() {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_EMBED_API_KEY?.trim();
  const placeId = process.env.NEXT_PUBLIC_GOOGLE_MAPS_PLACE_ID?.trim();
  const query = placeId ? `place_id:${placeId}` : destination;

  if (!apiKey) {
    return (
      <div className="google-map google-map--fallback" role="group" aria-label="Map integration not configured">
        <div>
          <span className="micro">GOOGLE MAPS</span>
          <strong>Open Tejjora in Maps</strong>
          <p>Map preview is temporarily unavailable here. You can still open the exact hotel location in Google Maps.</p>
          <a
            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(destination)}`}
            target="_blank"
            rel="noreferrer"
          >
            Open Google Maps <span aria-hidden="true">↗</span>
          </a>
        </div>
      </div>
    );
  }

  const params = new URLSearchParams({
    key: apiKey,
    q: query,
    zoom: "16",
    maptype: "roadmap",
    language: "en",
    region: "IN",
  });

  return (
    <div className="google-map" aria-label="Interactive Google Map showing Tejjora Lake View">
      <iframe
        title="Tejjora Lake View on Google Maps"
        src={`https://www.google.com/maps/embed/v1/place?${params.toString()}`}
        loading="lazy"
        allowFullScreen
        referrerPolicy="strict-origin-when-cross-origin"
      />
      <div className="google-map__caption">
        <span className="micro">INTERACTIVE MAP</span>
        <strong>Vikalp Khand · Gomti Nagar</strong>
      </div>
    </div>
  );
}
