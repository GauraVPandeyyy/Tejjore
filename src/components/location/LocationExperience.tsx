"use client";

import Image from "next/image";
import { useState } from "react";
import { hotel } from "@/data/hotel";
import { assets } from "@/data/assets";
import { amenities } from "@/data/amenities";
import { nearbyPlaces } from "@/data/nearby";
import { LANDMARK_POSITIONS } from "@/data/geo";
import { LocationAtlas } from "@/components/location/LocationAtlas";
import { ParallaxFrame } from "@/components/motion/ParallaxFrame";
import { PillAnchor, PillButton } from "@/components/ui/Buttons";
import { Icon, type IconName } from "@/components/ui/Icon";
import { Reveal } from "@/components/ui/Motion";
import { SectionIntro } from "@/components/ui/SectionIntro";
import { Ornament, Waterline } from "@/components/ui/Waterline";

const destination = `${hotel.address.line1}, ${hotel.address.locality}, ${hotel.address.city}, ${hotel.address.state} ${hotel.address.postalCode}, ${hotel.address.country}`;
const FROM = `${hotel.address.line1}, ${hotel.address.locality}, ${hotel.address.city} ${hotel.address.postalCode}`;
const ICONS: Record<string, IconName> = { Shopping: "tray", "Business / Events": "desk", Landmark: "pin", Airport: "compass", Railway: "compass" };
const label = (id: (typeof amenities)[number]["id"]) => amenities.find((item) => item.id === id)?.label ?? id;

function mapsDirectionsUrl(options: { origin?: string; to?: string } = {}) {
  const params = new URLSearchParams({ api: "1", destination: options.to ?? destination, travelmode: "driving" });
  if (options.origin) params.set("origin", options.origin);
  return `https://www.google.com/maps/dir/?${params.toString()}`;
}

/**
 * Location: an arrival-first hero (the building, the address, one-tap routes), the interactive map
 * as the centrepiece, nearby destination cards, and the hotel's verified details beside its photographs.
 * No distances or journey times — none are verified — so every route opens live in Google Maps.
 */
export function LocationExperience() {
  const [status, setStatus] = useState("");

  function routeFromMyLocation() {
    if (!("geolocation" in navigator)) {
      window.open(mapsDirectionsUrl(), "_blank", "noopener,noreferrer");
      return;
    }
    setStatus("Requesting your location…");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setStatus("Opening live directions in Google Maps…");
        window.open(mapsDirectionsUrl({ origin: `${position.coords.latitude},${position.coords.longitude}` }), "_blank", "noopener,noreferrer");
      },
      () => {
        setStatus("Location was not shared. Opening Tejjora in Google Maps instead.");
        window.open(mapsDirectionsUrl(), "_blank", "noopener,noreferrer");
      },
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 300000 },
    );
  }

  return (
    <>
      <section className="lx-hero" data-hero-overlay="" aria-labelledby="location-title">
        <Image src={assets.hero.alternateImages[0]} alt="" fill priority sizes="100vw" className="lx-hero__bg" aria-hidden="true" />
        <span className="lx-hero__shade" aria-hidden="true" />
        <Waterline className="lx-hero__line" />
        <div className="tj-container lx-hero__grid">
          <div className="lx-hero__copy">
            <p className="tj-eyebrow">Vikalp Khand · Gomti Nagar</p>
            <h1 id="location-title" className="lx-hero__title">
              Getting here
            </h1>
            <p className="lx-hero__lead">
              In <strong>Vikalp Khand, Gomti Nagar</strong> — Lucknow&rsquo;s business and residential district.
            </p>
            <div className="tj-actions-row tj-actions-row--start">
              <PillButton variant="cream" arrow onClick={routeFromMyLocation}>
                Route from my location
              </PillButton>
              <PillAnchor variant="outline-light" href={mapsDirectionsUrl()} target="_blank" rel="noreferrer">
                Directions
              </PillAnchor>
              <PillAnchor variant="outline-light" href={`tel:${hotel.phoneE164}`} arrow={false}>
                <Icon name="phone" size={16} /> Call
              </PillAnchor>
            </div>
            <p className="lx-hero__status" aria-live="polite">
              {status}
            </p>
          </div>
          <aside className="lx-hero__card" aria-label="The hotel at a glance">
            <address>
              <span className="tj-eyebrow">Address</span>
              {hotel.address.line1}
              <br />
              {hotel.address.locality}, {hotel.address.city}
              <br />
              {hotel.address.state} {hotel.address.postalCode}
            </address>
            <a href={`tel:${hotel.phoneE164}`}>
              <span className="tj-eyebrow">Telephone</span>
              {hotel.phoneDisplay}
            </a>
            <p>
              <span className="tj-eyebrow">At the door</span>
              {label("front-desk")} · {label("parking")}
            </p>
          </aside>
        </div>
      </section>

      <section className="lx-atlas-section" data-header-tone="dark" aria-labelledby="atlas-title">
        <div className="tj-container">
          <SectionIntro id="atlas-title" title="Find us on the map" tone="lake">
            <p>Fly down to Gomti Nagar, switch to the whole city, or tap a landmark — every route opens live in Google Maps.</p>
          </SectionIntro>
          <LocationAtlas />
        </div>
      </section>

      <section className="tj-section lx-places" aria-labelledby="nearby-title">
        <div className="tj-container">
          <SectionIntro id="nearby-title" title="Nearby">
            <p>Places guests ask about, each with live directions from the hotel.</p>
          </SectionIntro>
          <ul className="lx-places__grid">
            {nearbyPlaces.map((place, index) => (
              <Reveal as="li" key={place.id} className="lx-card" delay={index * 0.06}>
                <a href={mapsDirectionsUrl({ origin: FROM, to: place.mapsQuery })} target="_blank" rel="noreferrer" aria-label={`${place.name}: directions from the hotel in Google Maps`}>
                  <span className="lx-card__no" aria-hidden="true">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <span className="lx-card__icon" aria-hidden="true">
                    <Icon name={ICONS[place.category] ?? "pin"} size={34} />
                  </span>
                  <span className="lx-card__body">
                    <span className="tj-eyebrow">{place.category}</span>
                    <span className="lx-card__name">{place.name}</span>
                    <span className="lx-card__go">
                      Directions <Icon name="arrow-up-right" size={16} />
                    </span>
                    {LANDMARK_POSITIONS[place.id] ? <span className="lx-card__pin">On the map above</span> : null}
                  </span>
                </a>
              </Reveal>
            ))}
          </ul>
        </div>
      </section>

      <section className="tj-section lx-stay" aria-labelledby="stay-title">
        <div className="tj-container lx-stay__grid">
          <div className="lx-stay__art">
            <ParallaxFrame className="lx-stay__arch" speed={8}>
              <Image src={assets.hero.image} alt="Tejjora Lake View from the street in Gomti Nagar" fill sizes="(min-width: 1024px) 34vw, 78vw" />
            </ParallaxFrame>
            <ParallaxFrame className="lx-stay__inset" speed={12} from="left">
              <Image src={assets.lobby[3]} alt="The arrival area inside the entrance" fill sizes="(min-width: 1024px) 18vw, 40vw" />
            </ParallaxFrame>
          </div>
          <div className="lx-stay__copy">
            <SectionIntro id="stay-title" title="The hotel, at a glance" as="h2" align="start">
              <p>Everything you need to find the door and walk in.</p>
            </SectionIntro>
            <dl className="lx-stay__facts">
              <div>
                <dt>Address</dt>
                <dd>
                  {hotel.address.line1}, {hotel.address.locality}, {hotel.address.city} {hotel.address.postalCode}
                </dd>
              </div>
              <div>
                <dt>Telephone</dt>
                <dd>
                  <a href={`tel:${hotel.phoneE164}`}>{hotel.phoneDisplay}</a>
                </dd>
              </div>
              <div>
                <dt>Front desk</dt>
                <dd>{label("front-desk")}</dd>
              </div>
              <div>
                <dt>Parking</dt>
                <dd>{label("parking")}</dd>
              </div>
            </dl>
            <Ornament />
          </div>
        </div>
      </section>
    </>
  );
}
