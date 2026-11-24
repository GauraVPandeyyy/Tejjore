"use client";

import "maplibre-gl/dist/maplibre-gl.css";
import { useCallback, useEffect, useRef, useState } from "react";
import type { Map as MapLibreMap, Marker } from "maplibre-gl";
import { hotel } from "@/data/hotel";
import { nearbyPlaces } from "@/data/nearby";
import { AREA_CENTER, LANDMARK_POSITIONS, hotelPosition } from "@/data/geo";
import { GoogleMapExperience } from "@/components/location/GoogleMapExperience";
import { Icon, type IconName } from "@/components/ui/Icon";
import { PillAnchor } from "@/components/ui/Buttons";

const destination = `${hotel.address.line1}, ${hotel.address.locality}, ${hotel.address.city}, ${hotel.address.state} ${hotel.address.postalCode}, ${hotel.address.country}`;
const FROM = `${hotel.address.line1}, ${hotel.address.locality}, ${hotel.address.city} ${hotel.address.postalCode}`;
const mapsSearch = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(destination)}`;
const directions = (to: string) => `https://www.google.com/maps/dir/?${new URLSearchParams({ api: "1", origin: FROM, destination: to, travelmode: "driving" }).toString()}`;
const ICONS: Record<string, IconName> = { Shopping: "tray", "Business / Events": "desk", Landmark: "pin", Airport: "compass", Railway: "compass" };

/** OpenFreeMap: free vector tiles from OpenStreetMap data, no key, commercial use allowed with attribution (shown on the map). */
const STYLE_URL = "https://tiles.openfreemap.org/styles/positron";
const AREA_VIEW = { center: [AREA_CENTER.lng, AREA_CENTER.lat] as [number, number], zoom: 12.4, pitch: 30, bearing: -12 };

type View = "area" | "city";

/** On desktop the list floats over the map's left edge, so the camera keeps its subject clear of it. */
const cameraPadding = () => ({ top: 20, bottom: 20, right: 20, left: window.innerWidth > 1023 ? 360 : 20 });

const reduced = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** Re-colours the quiet base style in the site's own paper, lake and mist. Missing layers are skipped. */
function tint(map: MapLibreMap) {
  const paint = (layer: string, property: "background-color" | "fill-color", value: string) => {
    if (map.getLayer(layer)) map.setPaintProperty(layer, property, value);
  };
  paint("background", "background-color", "#f3eee0");
  paint("water", "fill-color", "#a9c6d6");
  paint("park", "fill-color", "#dfe6d0");
  paint("landcover_wood", "fill-color", "#d7e0c8");
  paint("building", "fill-color", "#e4d9c4");
}

/**
 * The location page's centrepiece: an interactive map that opens as a globe and flies down to
 * Gomti Nagar. Landmarks with a sourced position get pins; the hotel is pinned only when its
 * confirmed coordinates are configured (data/geo.ts), and "Open in Google Maps" always resolves the
 * full address. The map loads when it nears the viewport; with no WebGL or tiles it falls back to the
 * Google Maps card. Every place is also listed with a live-directions link, so nothing depends on the map.
 */
export function LocationAtlas() {
  const container = useRef<HTMLDivElement>(null);
  const wrapper = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const markers = useRef<Map<string, HTMLButtonElement>>(new Map());
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [view, setView] = useState<View | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const pin = hotelPosition();

  const flyToArea = useCallback((duration: number, curve = 1.6) => {
    mapRef.current?.flyTo({ ...AREA_VIEW, padding: cameraPadding(), duration, curve, essential: false });
  }, []);

  const showView = useCallback(
    (next: View) => {
      const map = mapRef.current;
      if (!map) return;
      const duration = reduced() ? 0 : 3200;
      setView(next);
      setSelected(null);
      if (next === "area") {
        flyToArea(duration, 1.4);
        return;
      }
      const points = [AREA_CENTER, ...Object.values(LANDMARK_POSITIONS)];
      const lngs = points.map((point) => point.lng);
      const lats = points.map((point) => point.lat);
      map.fitBounds(
        [
          [Math.min(...lngs), Math.min(...lats)],
          [Math.max(...lngs), Math.max(...lats)],
        ],
        { padding: { top: 70, bottom: 70, left: window.innerWidth > 1023 ? 380 : 40, right: 40 }, pitch: 0, bearing: 0, duration, essential: false, maxZoom: 12 },
      );
    },
    [flyToArea],
  );

  const replay = useCallback(() => {
    const map = mapRef.current;
    if (!map) return;
    setSelected(null);
    setView("area");
    if (reduced()) {
      flyToArea(0);
      return;
    }
    map.jumpTo({ center: [78.5, 22], zoom: 1.4, pitch: 0, bearing: 0 });
    flyToArea(7500);
  }, [flyToArea]);

  const select = useCallback((id: string) => {
    const map = mapRef.current;
    const position = LANDMARK_POSITIONS[id];
    if (!map || !position) return;
    setSelected(id);
    setView(null);
    map.flyTo({ center: [position.lng, position.lat], zoom: 13.6, pitch: 20, bearing: 0, padding: cameraPadding(), duration: reduced() ? 0 : 2200, essential: false });
  }, []);
  const selectRef = useRef(select);
  useEffect(() => {
    selectRef.current = select;
  });

  // Create the map once the section is near the viewport.
  useEffect(() => {
    const host = container.current;
    const frame = wrapper.current;
    if (!host || !frame) return;
    let cancelled = false;
    let map: MapLibreMap | null = null;
    const created: Marker[] = [];
    const markerMap = markers.current;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        observer.disconnect();
        void (async () => {
          try {
            const maplibregl = await import("maplibre-gl");
            // The bundler cannot resolve the library's worker; it is served from /vendor (scripts/copy-maplibre-worker.mjs).
            maplibregl.setWorkerUrl("/vendor/maplibre-gl-worker.mjs");
            if (cancelled) return;
            const calm = reduced();
            const live: MapLibreMap = new maplibregl.Map({
              container: host,
              style: STYLE_URL,
              center: calm ? AREA_VIEW.center : [78.5, 22],
              zoom: calm ? AREA_VIEW.zoom : 1.4,
              pitch: calm ? AREA_VIEW.pitch : 0,
              bearing: calm ? AREA_VIEW.bearing : 0,
              maxPitch: 60,
              cooperativeGestures: true,
              attributionControl: { compact: true },
            });
            map = live;
            if (calm) live.setPadding(cameraPadding());
            mapRef.current = live;
            live.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), "top-right");
            live.on("style.load", () => {
              live.setProjection({ type: "globe" });
              tint(live);
            });
            // A missing sprite or glyph is not fatal; a style that never loads is.
            const giveUp = window.setTimeout(() => {
              if (!live.isStyleLoaded()) setFailed(true);
            }, 12000);
            live.on("load", () => {
              window.clearTimeout(giveUp);
              if (cancelled) return;
              setReady(true);
              for (const place of nearbyPlaces) {
                const position = LANDMARK_POSITIONS[place.id];
                if (!position) continue;
                const element = document.createElement("button");
                element.type = "button";
                element.className = "lx-pin";
                element.setAttribute("aria-label", `${place.name}: show on the map`);
                const dot = document.createElement("span");
                dot.className = "lx-pin__dot";
                const label = document.createElement("span");
                label.className = "lx-pin__label";
                label.textContent = place.name;
                element.append(dot, label);
                element.addEventListener("click", () => selectRef.current(place.id));
                markerMap.set(place.id, element);
                created.push(new maplibregl.Marker({ element, anchor: "bottom" }).setLngLat([position.lng, position.lat]).addTo(live));
              }
              const hotelPin = hotelPosition();
              if (hotelPin) {
                const element = document.createElement("div");
                element.className = "lx-pin lx-pin--hotel";
                const dot = document.createElement("span");
                dot.className = "lx-pin__dot";
                const label = document.createElement("span");
                label.className = "lx-pin__label";
                label.textContent = "Tejjora Lake View";
                element.append(dot, label);
                created.push(new maplibregl.Marker({ element, anchor: "bottom" }).setLngLat([hotelPin.lng, hotelPin.lat]).addTo(live));
              }
              if (!calm) flyToArea(7500);
              setView("area");
            });
          } catch {
            if (!cancelled) setFailed(true);
          }
        })();
      },
      { rootMargin: "240px 0px", threshold: 0.12 },
    );
    observer.observe(frame);
    return () => {
      cancelled = true;
      observer.disconnect();
      created.forEach((marker) => marker.remove());
      markerMap.clear();
      map?.remove();
      mapRef.current = null;
    };
  }, [flyToArea]);

  useEffect(() => {
    markers.current.forEach((element, id) => element.classList.toggle("lx-pin--active", id === selected));
  }, [selected]);

  const active = nearbyPlaces.find((place) => place.id === selected);

  return (
    <div ref={wrapper} className="lx-atlas" data-ready={ready ? "true" : "false"}>
      <div className="lx-atlas__map">
        {failed ? (
          <GoogleMapExperience />
        ) : (
          <>
            <div ref={container} className="lx-atlas__canvas" role="region" aria-label="Interactive map of Gomti Nagar, Lucknow" />
            {!ready ? (
              <div className="lx-atlas__loading" aria-hidden="true">
                <span />
              </div>
            ) : null}
            <div className="lx-atlas__views" role="group" aria-label="Map view (the last button replays the globe flight)">
              <button type="button" aria-pressed={view === "area"} onClick={() => showView("area")}>
                Gomti Nagar
              </button>
              <button type="button" aria-pressed={view === "city"} onClick={() => showView("city")}>
                All of Lucknow
              </button>
              <button type="button" onClick={replay}>
                Replay
              </button>
            </div>
          </>
        )}
      </div>

      <div className="lx-atlas__panel">
        <p className="tj-eyebrow">Around the hotel</p>
        <ul className="lx-atlas__list">
          {nearbyPlaces.map((place) => {
            const mappable = Boolean(LANDMARK_POSITIONS[place.id]);
            return (
              <li key={place.id} data-active={place.id === selected ? "true" : "false"}>
                <span className="lx-atlas__icon" aria-hidden="true">
                  <Icon name={ICONS[place.category] ?? "pin"} size={18} />
                </span>
                <span className="lx-atlas__name">
                  <span>{place.category}</span>
                  {place.name}
                </span>
                {mappable && !failed ? (
                  <button type="button" className="lx-atlas__show" onClick={() => select(place.id)} aria-label={`Show ${place.name} on the map`}>
                    Map
                  </button>
                ) : null}
                <a className="lx-atlas__go" href={directions(place.mapsQuery)} target="_blank" rel="noreferrer" aria-label={`Directions from the hotel to ${place.name}`}>
                  <Icon name="arrow-up-right" size={18} />
                </a>
              </li>
            );
          })}
        </ul>
        <p className="lx-atlas__credit" aria-live="polite">
          {active ? `${active.name} — live directions from the hotel open in Google Maps.` : "Routes open live in Google Maps, so travel times are always current."}
        </p>
        {!pin ? <p className="lx-atlas__credit">The map shows the area; the exact entrance opens in Google Maps.</p> : null}
        <PillAnchor variant="cream" href={mapsSearch} target="_blank" rel="noreferrer">
          Open the hotel in Google Maps
        </PillAnchor>
      </div>
    </div>
  );
}
