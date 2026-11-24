"use client";

import Image from "next/image";
import { useState } from "react";
import { hotel } from "@/data/hotel";
import { assets } from "@/data/assets";
import { PillAnchor, PillButton } from "@/components/ui/Buttons";

const destination = `${hotel.address.line1}, ${hotel.address.locality}, ${hotel.address.city}, ${hotel.address.state} ${hotel.address.postalCode}, ${hotel.address.country}`;
const mapsSearch = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(destination)}`;

/**
 * Map card (masterplan §4): a photo of the hotel with one action. The Google embed loads only
 * when the guest asks for it — no third-party frame or weight on page load. Without an embed key
 * the card opens Google Maps instead.
 */
export function GoogleMapExperience() {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_EMBED_API_KEY?.trim();
  const placeId = process.env.NEXT_PUBLIC_GOOGLE_MAPS_PLACE_ID?.trim();
  const query = placeId ? `place_id:${placeId}` : destination;
  const [loaded, setLoaded] = useState(false);

  if (apiKey && loaded) {
    const params = new URLSearchParams({ key: apiKey, q: query, zoom: "16", maptype: "roadmap", language: "en", region: "IN" });
    return (
      <div className="tj-map-card tj-map-card--live">
        <iframe
          title="Tejjora Lake View on Google Maps"
          src={`https://www.google.com/maps/embed/v1/place?${params.toString()}`}
          loading="lazy"
          allowFullScreen
          referrerPolicy="strict-origin-when-cross-origin"
        />
      </div>
    );
  }

  return (
    <div className="tj-map-card">
      <Image src={assets.hero.alternateImages[0]} alt="The front of Tejjora Lake View" fill sizes="(min-width: 1024px) 46vw, 100vw" />
      <span className="tj-map-card__shade" aria-hidden="true" />
      <div className="tj-map-card__copy">
        <p className="tj-eyebrow">Vikalp Khand · Gomti Nagar</p>
        {apiKey ? (
          <PillButton variant="cream" arrow onClick={() => setLoaded(true)}>
            Show the map
          </PillButton>
        ) : (
          <PillAnchor variant="cream" href={mapsSearch} target="_blank" rel="noreferrer">
            Open Google Maps
          </PillAnchor>
        )}
      </div>
    </div>
  );
}
