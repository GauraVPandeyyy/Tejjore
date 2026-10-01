"use client";

import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  arrivalDemoStay,
  arrivalNearbyPlaces,
  arrivalTabs,
  hotelAddressText,
  hotelDirectionsUrl,
  nearbyDirectionsUrl,
  whatsappUrl,
} from "@/data/arrival";
import { hotel } from "@/data/hotel";
import { restaurant } from "@/data/restaurant";
import { rooms } from "@/data/rooms";
import { track } from "@/lib/analytics/track";
import type { ArrivalTabId } from "@/types/arrival";

function formatDate(value: string) {
  const date = new Date(`${value}T12:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric" }).format(date);
}

function ActionArrow() {
  return <span aria-hidden="true">↗</span>;
}

export function ArrivalDashboard() {
  const searchParams = useSearchParams();
  const demoMode = searchParams.get("demo") === "1";
  const stay = demoMode ? arrivalDemoStay : null;
  const [activeTab, setActiveTab] = useState<ArrivalTabId>("arrival");

  const room = useMemo(
    () => (stay ? rooms.find((item) => item.id === stay.roomId) ?? null : null),
    [stay]
  );

  useEffect(() => {
    const requestedTab = searchParams.get("tab") as ArrivalTabId | null;
    if (requestedTab && arrivalTabs.some((tab) => tab.id === requestedTab)) {
      setActiveTab(requestedTab);
    }
  }, [searchParams]);

  function selectTab(tab: ArrivalTabId) {
    setActiveTab(tab);
    track("arrival_tab_change", { tab });
  }

  function openConcierge() {
    window.dispatchEvent(new CustomEvent("tejjora:concierge-open"));
    track("arrival_concierge_open");
  }

  const arrivalMessage = stay
    ? `Hello Tejjora Lake View, I am on my way to the hotel. My reference is ${stay.reference}. Please assist me with my arrival.`
    : "Hello Tejjora Lake View, I am on my way to the hotel and need arrival assistance.";

  const specialRequestMessage = stay
    ? `Hello Tejjora Lake View, I have a special request for my stay. Reference: ${stay.reference}. Please let me know if it can be arranged.`
    : "Hello Tejjora Lake View, I have a special request for an upcoming stay. Please let me know if it can be arranged.";

  return (
    <main className="arrival-page">
      <section className="arrival-hero">
        <div className="arrival-hero__topline">
          <span>TEJJORA / SMART ARRIVAL</span>
          <span>GOMTI NAGAR · LUCKNOW</span>
        </div>

        <div className="arrival-hero__copy">
          <div>
            <span className="micro">YOUR STAY, WITH LESS FRICTION</span>
            <h1>{stay ? `Welcome, ${stay.guestName}.` : "Arrive with everything close at hand."}</h1>
          </div>
          <p>
            Directions, hotel contact, dining, nearby places and stay support — organised around the moments you need them.
          </p>
        </div>

        {demoMode ? (
          <div className="arrival-demo-note" role="status">
            <strong>Demo stay</strong>
            <span>Sample booking details are shown only to preview the connected-arrival experience.</span>
          </div>
        ) : null}

        <div className="arrival-primary-actions" aria-label="Arrival quick actions">
          <a
            className="arrival-primary-action arrival-primary-action--map"
            href={hotelDirectionsUrl()}
            target="_blank"
            rel="noreferrer"
            onClick={() => track("directions_click", { source: "arrival_hero" })}
          >
            <span className="arrival-primary-action__index">01</span>
            <span>
              <small>GET HERE</small>
              <strong>Navigate to Tejjora</strong>
            </span>
            <ActionArrow />
          </a>
          <a
            className="arrival-primary-action"
            href={`tel:${hotel.phoneE164}`}
            onClick={() => track("call_click", { source: "arrival_hero" })}
          >
            <span className="arrival-primary-action__index">02</span>
            <span>
              <small>HOTEL SUPPORT</small>
              <strong>Call the hotel</strong>
            </span>
            <ActionArrow />
          </a>
          <a
            className="arrival-primary-action"
            href={whatsappUrl(arrivalMessage)}
            target="_blank"
            rel="noreferrer"
            onClick={() => track("whatsapp_click", { source: "arrival_hero" })}
          >
            <span className="arrival-primary-action__index">03</span>
            <span>
              <small>ARRIVAL HELP</small>
              <strong>WhatsApp Tejjora</strong>
            </span>
            <ActionArrow />
          </a>
        </div>
      </section>

      <nav className="arrival-tabs" aria-label="Smart Arrival sections">
        <div className="arrival-tabs__inner" role="tablist" aria-label="Arrival tools">
          {arrivalTabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={activeTab === tab.id}
              aria-controls={`arrival-panel-${tab.id}`}
              id={`arrival-tab-${tab.id}`}
              data-active={activeTab === tab.id ? "true" : "false"}
              onClick={() => selectTab(tab.id)}
            >
              <span className="arrival-tabs__desktop-label">{tab.label}</span>
              <span className="arrival-tabs__mobile-label">{tab.shortLabel}</span>
            </button>
          ))}
        </div>
      </nav>

      <div className="arrival-panels">
        {activeTab === "arrival" ? (
          <section
            className="arrival-panel"
            id="arrival-panel-arrival"
            role="tabpanel"
            aria-labelledby="arrival-tab-arrival"
          >
            <div className="arrival-panel__intro">
              <span className="micro">01 / ARRIVAL</span>
              <h2>From where you are, to the front door.</h2>
              <p>{hotelAddressText}</p>
            </div>

            <div className="arrival-tool-grid">
              <article className="arrival-tool arrival-tool--featured">
                <span className="micro">ROUTE</span>
                <h3>Open live directions</h3>
                <p>Google Maps can use your device location to route you to the hotel.</p>
                <a href={hotelDirectionsUrl()} target="_blank" rel="noreferrer" onClick={() => track("directions_click", { source: "arrival_panel" })}>
                  Navigate now <ActionArrow />
                </a>
              </article>
              <article className="arrival-tool">
                <span className="micro">PARKING</span>
                <h3>Arriving by car?</h3>
                <p>Free private parking is listed among Tejjora&apos;s confirmed hotel amenities.</p>
                <a href={whatsappUrl("Hello Tejjora Lake View, I am arriving by car. Please guide me about parking access at the hotel.")} target="_blank" rel="noreferrer">
                  Ask about access <ActionArrow />
                </a>
              </article>
              <article className="arrival-tool">
                <span className="micro">FRONT DESK</span>
                <h3>Need help on arrival?</h3>
                <p>24-hour front desk assistance is listed for the hotel.</p>
                <a href={`tel:${hotel.phoneE164}`}>Call hotel <ActionArrow /></a>
              </article>
            </div>
          </section>
        ) : null}

        {activeTab === "stay" ? (
          <section
            className="arrival-panel"
            id="arrival-panel-stay"
            role="tabpanel"
            aria-labelledby="arrival-tab-stay"
          >
            <div className="arrival-panel__intro">
              <span className="micro">02 / MY STAY</span>
              <h2>{stay ? "Your stay at a glance." : "Stay details, when your link carries them."}</h2>
              <p>
                {stay
                  ? "These sample details demonstrate the future connected guest view."
                  : "No stay details are loaded in this link. Tejjora can still help with an existing or upcoming stay by phone or WhatsApp."}
              </p>
            </div>

            {stay && room ? (
              <div className="arrival-stay-card">
                <div className="arrival-stay-card__media">
                  <Image src={room.imageSet[0]} alt={`${room.name} at Tejjora Lake View`} fill sizes="(max-width: 760px) 100vw, 44vw" />
                  <span>DEMO / NOT A LIVE BOOKING</span>
                </div>
                <div className="arrival-stay-card__details">
                  <div className="arrival-stay-card__reference">
                    <span>Reference</span>
                    <strong>{stay.reference}</strong>
                  </div>
                  <h3>{room.name}</h3>
                  <dl>
                    <div><dt>Check-in</dt><dd>{formatDate(stay.checkIn)}</dd></div>
                    <div><dt>Check-out</dt><dd>{formatDate(stay.checkOut)}</dd></div>
                    <div><dt>Guest</dt><dd>{stay.guestName}</dd></div>
                  </dl>
                  <p className="arrival-stay-card__note">Check-in time, final rate and stay policies are not represented by this demo.</p>
                </div>
              </div>
            ) : (
              <div className="arrival-empty-stay">
                <span className="arrival-empty-stay__mark" aria-hidden="true">29 / 03</span>
                <div>
                  <h3>No booking details loaded.</h3>
                  <p>For a direct Tejjora booking, securely retrieve it with your booking reference, email and phone. For other booking channels, contact the hotel with the reference supplied by that channel.</p>
                  <Link href="/manage-booking">Manage a direct booking <ActionArrow /></Link>
                </div>
              </div>
            )}

            <div className="arrival-inline-actions">
              <a href={whatsappUrl(specialRequestMessage)} target="_blank" rel="noreferrer" onClick={() => track("arrival_special_request")}>
                Special request <ActionArrow />
              </a>
              <Link href="/rooms">Explore rooms <ActionArrow /></Link>
              <Link href="/virtual-tour">Virtual tour <ActionArrow /></Link>
            </div>
          </section>
        ) : null}

        {activeTab === "dining" ? (
          <section
            className="arrival-panel"
            id="arrival-panel-dining"
            role="tabpanel"
            aria-labelledby="arrival-tab-dining"
          >
            <div className="arrival-panel__intro">
              <span className="micro">03 / DINING</span>
              <h2>Breakfast, dinner, and the details in between.</h2>
              <p>Use this space for the confirmed dining basics, then ask the hotel for timing, menu or table-specific details.</p>
            </div>

            <div className="arrival-dining-grid">
              <article>
                <span className="micro">BREAKFAST</span>
                <h3>Start downstairs.</h3>
                <p>Daily breakfast is listed, with a vegetarian breakfast option available.</p>
                <small>Exact timing and inclusions: confirm with the hotel.</small>
              </article>
              <article>
                <span className="micro">RESTAURANT</span>
                <h3>Dining at Tejjora.</h3>
                <p>{restaurant.positioning}</p>
                <small>Menu, timings and table availability are confirmed directly by the hotel.</small>
              </article>
            </div>

            <div className="arrival-inline-actions">
              <a href={whatsappUrl("Hello Tejjora Lake View, I would like to ask about breakfast / dining during my stay. Please share the current details.")} target="_blank" rel="noreferrer">
                Ask about dining <ActionArrow />
              </a>
              <Link href="/experience#restaurant">See restaurant <ActionArrow /></Link>
            </div>
          </section>
        ) : null}

        {activeTab === "explore" ? (
          <section
            className="arrival-panel"
            id="arrival-panel-explore"
            role="tabpanel"
            aria-labelledby="arrival-tab-explore"
          >
            <div className="arrival-panel__intro">
              <span className="micro">04 / EXPLORE</span>
              <h2>Step out with a destination, not a guessed ETA.</h2>
              <p>Routes open in Google Maps from Tejjora. Travel time is left to live mapping rather than being hard-coded here.</p>
            </div>

            <div className="arrival-nearby-list">
              {arrivalNearbyPlaces.map((place, index) => (
                <a
                  key={place.id}
                  href={nearbyDirectionsUrl(place.mapsQuery)}
                  target="_blank"
                  rel="noreferrer"
                  onClick={() => track("directions_click", { source: "arrival_explore", place: place.id })}
                >
                  <span className="arrival-nearby-list__index">{String(index + 1).padStart(2, "0")}</span>
                  <span>
                    <small>{place.category}</small>
                    <strong>{place.name}</strong>
                  </span>
                  <ActionArrow />
                </a>
              ))}
            </div>
          </section>
        ) : null}

        {activeTab === "help" ? (
          <section
            className="arrival-panel"
            id="arrival-panel-help"
            role="tabpanel"
            aria-labelledby="arrival-tab-help"
          >
            <div className="arrival-panel__intro">
              <span className="micro">05 / HELP</span>
              <h2>Human help first. Concierge when it&apos;s quicker.</h2>
              <p>For anything that depends on live hotel confirmation, contact Tejjora directly.</p>
            </div>

            <div className="arrival-help-grid">
              <a href={`tel:${hotel.phoneE164}`} onClick={() => track("call_click", { source: "arrival_help" })}>
                <span className="micro">CALL</span>
                <strong>{hotel.phoneDisplay}</strong>
                <p>Speak directly with the hotel.</p>
                <ActionArrow />
              </a>
              <a href={whatsappUrl("Hello Tejjora Lake View, I need help with my stay.")} target="_blank" rel="noreferrer" onClick={() => track("whatsapp_click", { source: "arrival_help" })}>
                <span className="micro">WHATSAPP</span>
                <strong>Message Tejjora</strong>
                <p>Send a stay or arrival question.</p>
                <ActionArrow />
              </a>
              <button type="button" onClick={openConcierge}>
                <span className="micro">CONCIERGE</span>
                <strong>Ask Tejjora Concierge</strong>
                <p>Rooms, breakfast, parking, directions and hotel basics.</p>
                <ActionArrow />
              </button>
            </div>

            <div className="arrival-future-note">
              <span className="micro">CONNECTED ARRIVAL / FUTURE</span>
              <p>Flight status, transfer status and live booking retrieval will appear here only when verified providers are connected.</p>
            </div>
          </section>
        ) : null}
      </div>
    </main>
  );
}
