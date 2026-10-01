"use client";

import { useState } from "react";
import { hotel } from "@/data/hotel";
import { nearbyPlaces } from "@/data/nearby";
import { SectionLabel } from "@/components/shared/SectionLabel";
import { GoogleMapExperience } from "@/components/location/GoogleMapExperience";

const destination = `${hotel.address.line1}, ${hotel.address.locality}, ${hotel.address.city}, ${hotel.address.state} ${hotel.address.postalCode}, ${hotel.address.country}`;

function mapsSearchUrl(query: string) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

function mapsDirectionsUrl(origin?: string) {
  const params = new URLSearchParams({ api: "1", destination, travelmode: "driving" });
  if (origin) params.set("origin", origin);
  return `https://www.google.com/maps/dir/?${params.toString()}`;
}

export function LocationExperience({ index = "09" }: { index?: string }) {
  const [status, setStatus] = useState<string>("");

  function routeFromMyLocation() {
    if (!("geolocation" in navigator)) {
      window.open(mapsDirectionsUrl(), "_blank", "noopener,noreferrer");
      return;
    }

    setStatus("Requesting your location…");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const origin = `${position.coords.latitude},${position.coords.longitude}`;
        setStatus("Opening live directions in Google Maps…");
        window.open(mapsDirectionsUrl(origin), "_blank", "noopener,noreferrer");
      },
      () => {
        setStatus("Location was not shared. Opening Tejjora in Google Maps instead.");
        window.open(mapsDirectionsUrl(), "_blank", "noopener,noreferrer");
      },
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 300000 },
    );
  }

  return (
    <section id="location" className="location-experience" aria-labelledby="location-title">
      <div className="site-container">
        <div className="location-experience__topline">
          <SectionLabel index={index}>LOCATION</SectionLabel>
          <span className="micro">VIKALP KHAND · GOMTI NAGAR · LUCKNOW</span>
        </div>

        <div className="location-experience__grid">
          <div className="location-experience__title-block">
            <h2 id="location-title">Right where<br /><em>Lucknow moves.</em></h2>
            <address>
              {hotel.address.line1}<br />
              {hotel.address.locality}, {hotel.address.city}<br />
              {hotel.address.state} {hotel.address.postalCode}
            </address>
            <div className="location-experience__actions">
              <button type="button" onClick={routeFromMyLocation}>Route from my location <span aria-hidden="true">↗</span></button>
              <a href={mapsSearchUrl(destination)} target="_blank" rel="noreferrer">Open in Maps <span aria-hidden="true">↗</span></a>
            </div>
            {status ? <p className="location-experience__status" aria-live="polite">{status}</p> : null}
          </div>

          <GoogleMapExperience />
        </div>

        <div className="location-experience__nearby" aria-label="Nearby places">
          {nearbyPlaces.map((place, index) => (
            <a key={place.id} href={mapsSearchUrl(place.mapsQuery)} target="_blank" rel="noreferrer">
              <span>{String(index + 1).padStart(2, "0")}</span>
              <div>
                <small>{place.category}</small>
                <strong>{place.name}</strong>
              </div>
              <i aria-hidden="true">↗</i>
            </a>
          ))}
        </div>

        <div className="location-v2__arrival">
          <article><span className="micro">FLYING IN</span><h3>Start with the live route from the airport.</h3><p>Open Google Maps from Chaudhary Charan Singh International Airport for current routing rather than relying on a stale fixed travel-time promise.</p><a href={mapsSearchUrl("Chaudhary Charan Singh International Airport Lucknow")} target="_blank" rel="noreferrer">Open airport route ↗</a></article>
          <article><span className="micro">ARRIVING BY TRAIN</span><h3>Use your exact station as the origin.</h3><p>Lucknow has multiple railway arrival points. Live directions are more useful than publishing one generic station time.</p><a href={mapsSearchUrl("Lucknow Junction Railway Station")} target="_blank" rel="noreferrer">Open railway route ↗</a></article>
          <article><span className="micro">DRIVING</span><h3>Vikalp Khand, with parking at the hotel.</h3><p>Free private parking is listed among Tejjora's hotel amenities. Use the full property address for turn-by-turn navigation.</p><button type="button" onClick={routeFromMyLocation}>Route from my location ↗</button></article>
        </div>

        <div className="location-v2__note">
          <span className="micro">EXPLORE THE NEIGHBOURHOOD</span>
          <p>Business venues, shopping and Lucknow landmarks are kept as live-map destinations so distances and journey times remain current. When Google Routes credentials are added, this section can also surface live travel estimates directly on the site.</p>
        </div>
      </div>
    </section>
  );
}
