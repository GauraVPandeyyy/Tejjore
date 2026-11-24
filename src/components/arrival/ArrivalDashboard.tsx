"use client";

import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useMemo, useState, type KeyboardEvent } from "react";
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
import { rooms } from "@/data/rooms";
import { track } from "@/lib/analytics/track";
import type { ArrivalTabId } from "@/types/arrival";
import { PillAnchor, PillLink } from "@/components/ui/Buttons";
import { Icon } from "@/components/ui/Icon";
import { SectionIntro } from "@/components/ui/SectionIntro";

function formatDate(value: string) {
  const date = new Date(`${value}T12:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric" }).format(date);
}

function ActionLink({ href, children, external = false, onClick }: { href: string; children: React.ReactNode; external?: boolean; onClick?: () => void }) {
  const icon = <Icon name={external ? "arrow-up-right" : "arrow-right"} size={16} />;
  return external ? (
    <a className="tj-text-link" href={href} target="_blank" rel="noreferrer" onClick={onClick}>
      {children} {icon}
    </a>
  ) : (
    <Link className="tj-text-link" href={href} onClick={onClick}>
      {children} {icon}
    </Link>
  );
}

/**
 * Smart Arrival (preserved, noindex; Phase 5B tokens). Directions, contact, dining and nearby
 * places in five tabs. Stay details appear only with the explicit ?demo=1 sample — there is no
 * live booking lookup here, and nothing is stored in the browser.
 */
export function ArrivalDashboard() {
  const searchParams = useSearchParams();
  const demoMode = searchParams.get("demo") === "1";
  const stay = demoMode ? arrivalDemoStay : null;
  const requestedTabParam = searchParams.get("tab") as ArrivalTabId | null;
  const requestedTab = requestedTabParam && arrivalTabs.some((tab) => tab.id === requestedTabParam) ? requestedTabParam : null;
  const [activeTab, setActiveTab] = useState<ArrivalTabId>(requestedTab ?? "arrival");
  const [appliedRequestedTab, setAppliedRequestedTab] = useState(requestedTab);
  if (requestedTab !== appliedRequestedTab) {
    setAppliedRequestedTab(requestedTab);
    if (requestedTab) setActiveTab(requestedTab);
  }

  const room = useMemo(() => (stay ? rooms.find((item) => item.id === stay.roomId) ?? null : null), [stay]);

  function selectTab(tab: ArrivalTabId) {
    setActiveTab(tab);
    track("arrival_tab_change", { tab });
  }

  // Arrow keys move between tabs (WAI-ARIA tabs pattern).
  function onTabKey(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;
    event.preventDefault();
    const index = arrivalTabs.findIndex((tab) => tab.id === activeTab);
    const next = arrivalTabs[(index + (event.key === "ArrowRight" ? 1 : -1) + arrivalTabs.length) % arrivalTabs.length];
    selectTab(next.id);
    document.getElementById(`arrival-tab-${next.id}`)?.focus();
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
    <main className="tj-page tj-arrival">
      <section className="tj-section tj-section--first tj-arrival__hero" aria-labelledby="arrival-title">
        <div className="tj-container">
          <SectionIntro id="arrival-title" as="h1" eyebrow="Smart arrival" title={stay ? `Welcome, ${stay.guestName}` : "Arrive with everything close"}>
            <p>Directions, the hotel&rsquo;s contact, dining and nearby places — organised around the moments you need them.</p>
          </SectionIntro>

          {demoMode ? (
            <p className="tj-arrival__demo" role="status">
              <strong>Demo stay.</strong> Sample booking details are shown only to preview the connected-arrival experience.
            </p>
          ) : null}

          <div className="tj-actions-row" aria-label="Arrival quick actions" role="group">
            <PillAnchor href={hotelDirectionsUrl()} target="_blank" rel="noreferrer" variant="lake" onClick={() => track("directions_click", { source: "arrival_hero" })}>
              Navigate to Tejjora
            </PillAnchor>
            <PillAnchor href={`tel:${hotel.phoneE164}`} arrow={false} onClick={() => track("call_click", { source: "arrival_hero" })}>
              <Icon name="phone" size={18} /> Call the hotel
            </PillAnchor>
            <PillAnchor href={whatsappUrl(arrivalMessage)} target="_blank" rel="noreferrer" arrow={false} onClick={() => track("whatsapp_click", { source: "arrival_hero" })}>
              <Icon name="whatsapp" size={18} /> WhatsApp Tejjora
            </PillAnchor>
          </div>
        </div>
      </section>

      <nav className="tj-tabs" aria-label="Smart Arrival sections">
        <div className="tj-container">
          <div className="tj-tabs__list" role="tablist" aria-label="Arrival tools" onKeyDown={onTabKey}>
            {arrivalTabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                role="tab"
                className="tj-chip"
                aria-selected={activeTab === tab.id}
                aria-controls={`arrival-panel-${tab.id}`}
                id={`arrival-tab-${tab.id}`}
                tabIndex={activeTab === tab.id ? 0 : -1}
                onClick={() => selectTab(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </nav>

      <div className="tj-container tj-container--narrow tj-arrival__panels">
        {activeTab === "arrival" ? (
          <section className="tj-arrival__panel" id="arrival-panel-arrival" role="tabpanel" aria-labelledby="arrival-tab-arrival">
            <PanelIntro title="From where you are, to the front door" copy={hotelAddressText} />
            <div className="tj-tiles">
              <article className="tj-tile">
                <h3 className="tj-tile__title">Open live directions</h3>
                <p>Google Maps can use your device location to route you to the hotel.</p>
                <ActionLink href={hotelDirectionsUrl()} external onClick={() => track("directions_click", { source: "arrival_panel" })}>
                  Navigate now
                </ActionLink>
              </article>
              <article className="tj-tile">
                <h3 className="tj-tile__title">Arriving by car?</h3>
                <p>Free private parking is listed among the hotel&rsquo;s amenities.</p>
                <ActionLink href={whatsappUrl("Hello Tejjora Lake View, I am arriving by car. Please guide me about parking access at the hotel.")} external>
                  Ask about access
                </ActionLink>
              </article>
              <article className="tj-tile">
                <h3 className="tj-tile__title">Need help on arrival?</h3>
                <p>24-hour front desk assistance is listed for the hotel.</p>
                <ActionLink href={`tel:${hotel.phoneE164}`}>Call hotel</ActionLink>
              </article>
            </div>
          </section>
        ) : null}

        {activeTab === "stay" ? (
          <section className="tj-arrival__panel" id="arrival-panel-stay" role="tabpanel" aria-labelledby="arrival-tab-stay">
            <PanelIntro
              title={stay ? "Your stay at a glance" : "Stay details, when your link carries them"}
              copy={stay ? "These sample details demonstrate the future connected guest view." : "No stay details are loaded in this link. The hotel can still help with an existing or upcoming stay by phone or WhatsApp."}
            />

            {stay && room ? (
              <div className="tj-arrival__stay">
                <div className="tj-arrival__stay-image">
                  <Image src={room.imageSet[0]} alt={`${room.name} at Tejjora Lake View`} fill sizes="(min-width: 768px) 320px, 100vw" />
                  <span className="tj-tag">DEMO / NOT A LIVE BOOKING</span>
                </div>
                <div>
                  <p className="tj-eyebrow">Reference {stay.reference}</p>
                  <h3 className="tj-subheading">{room.name}</h3>
                  <dl className="tj-specs">
                    <div>
                      <dt>Check-in</dt>
                      <dd>{formatDate(stay.checkIn)}</dd>
                    </div>
                    <div>
                      <dt>Check-out</dt>
                      <dd>{formatDate(stay.checkOut)}</dd>
                    </div>
                    <div>
                      <dt>Guest</dt>
                      <dd>{stay.guestName}</dd>
                    </div>
                  </dl>
                  <p className="tj-arrival__small">Check-in time, final rate and stay policies are not represented by this demo.</p>
                </div>
              </div>
            ) : (
              <article className="tj-tile tj-tile--wide">
                <h3 className="tj-tile__title">No booking details loaded.</h3>
                <p>For a direct Tejjora booking, retrieve it securely with your booking reference, email and phone. For other booking channels, contact the hotel with the reference that channel gave you.</p>
                <ActionLink href="/manage-booking">Manage a direct booking</ActionLink>
              </article>
            )}

            <div className="tj-actions-row tj-actions-row--start">
              <PillAnchor href={whatsappUrl(specialRequestMessage)} target="_blank" rel="noreferrer" onClick={() => track("arrival_special_request")}>
                Special request
              </PillAnchor>
              <PillLink href="/rooms">Explore rooms</PillLink>
              <PillLink href="/virtual-tour">360° tour</PillLink>
            </div>
          </section>
        ) : null}

        {activeTab === "dining" ? (
          <section className="tj-arrival__panel" id="arrival-panel-dining" role="tabpanel" aria-labelledby="arrival-tab-dining">
            <PanelIntro title="Breakfast, dinner and the details in between" copy="The hotel’s own restaurant serves from its printed menu. Ask the hotel for timings or table details." />
            <div className="tj-tiles">
              <article className="tj-tile">
                <h3 className="tj-tile__title">The menu</h3>
                <p>Breakfast and soups, Indian and Chinese mains, breads, biryani and desserts, with current prices.</p>
                <ActionLink href="/dining/menu">View the menu</ActionLink>
              </article>
              <article className="tj-tile">
                <h3 className="tj-tile__title">Timings and tables</h3>
                <p>Timings and table availability are confirmed directly by the hotel.</p>
                <ActionLink href={whatsappUrl("Hello Tejjora Lake View, I would like to ask about breakfast / dining during my stay. Please share the current details.")} external>
                  Ask about dining
                </ActionLink>
              </article>
            </div>
            <div className="tj-actions-row tj-actions-row--start">
              <PillLink href="/dining">The restaurant</PillLink>
            </div>
          </section>
        ) : null}

        {activeTab === "explore" ? (
          <section className="tj-arrival__panel" id="arrival-panel-explore" role="tabpanel" aria-labelledby="arrival-tab-explore">
            <PanelIntro title="Step out with a destination" copy="Routes open in Google Maps from the hotel, so travel times come from live mapping rather than a guess." />
            <ul className="tj-places">
              {arrivalNearbyPlaces.map((place) => (
                <li key={place.id} className="tj-places__item">
                  <span>
                    <span className="tj-places__category">{place.category}</span>
                    <span className="tj-places__name">{place.name}</span>
                  </span>
                  <a
                    className="tj-text-link"
                    href={nearbyDirectionsUrl(place.mapsQuery)}
                    target="_blank"
                    rel="noreferrer"
                    aria-label={`Directions to ${place.name}`}
                    onClick={() => track("directions_click", { source: "arrival_explore", place: place.id })}
                  >
                    Directions <Icon name="arrow-up-right" size={16} />
                  </a>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {activeTab === "help" ? (
          <section className="tj-arrival__panel" id="arrival-panel-help" role="tabpanel" aria-labelledby="arrival-tab-help">
            <PanelIntro title="People first, concierge when it’s quicker" copy="For anything that depends on live hotel confirmation, contact the hotel directly." />
            <div className="tj-tiles">
              <a className="tj-tile tj-tile--link" href={`tel:${hotel.phoneE164}`} onClick={() => track("call_click", { source: "arrival_help" })}>
                <span className="tj-eyebrow">Call</span>
                <strong className="tj-tile__title">{hotel.phoneDisplay}</strong>
                <span>Speak directly with the hotel.</span>
              </a>
              <a className="tj-tile tj-tile--link" href={whatsappUrl("Hello Tejjora Lake View, I need help with my stay.")} target="_blank" rel="noreferrer" onClick={() => track("whatsapp_click", { source: "arrival_help" })}>
                <span className="tj-eyebrow">WhatsApp</span>
                <strong className="tj-tile__title">Message Tejjora</strong>
                <span>Send a stay or arrival question.</span>
              </a>
              <button type="button" className="tj-tile tj-tile--link" onClick={openConcierge}>
                <span className="tj-eyebrow">Mezbaan · AI host</span>
                <strong className="tj-tile__title">Ask Tejjora Concierge</strong>
                <span>Rooms, breakfast, parking, directions and hotel basics.</span>
              </button>
            </div>
            <p className="tj-arrival__small">Flight status, transfer status and live booking retrieval will appear here only when verified providers are connected.</p>
          </section>
        ) : null}
      </div>
    </main>
  );
}

function PanelIntro({ title, copy }: { title: string; copy: string }) {
  return (
    <header className="tj-arrival__intro">
      <h2 className="tj-subheading">{title}</h2>
      <p>{copy}</p>
    </header>
  );
}
