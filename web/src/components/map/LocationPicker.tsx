"use client";

import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

interface LocationPickerProps {
  value: { lat: number; lng: number } | null;
  onChange: (loc: { lat: number; lng: number }) => void;
  zones?: Array<{ coordinates: Array<{ lat: number; lng: number }> }>;
}

const PANABO: [number, number] = [7.3132, 125.6844];

function buildMarkerIcon() {
  return L.divIcon({
    html: `<svg xmlns="http://www.w3.org/2000/svg" width="34" height="44" viewBox="0 0 34 44">
      <filter id="s" x="-50%" y="-50%" width="200%" height="200%">
        <feDropShadow dx="0" dy="2" stdDeviation="2" flood-color="rgba(0,0,0,0.35)"/>
      </filter>
      <path d="M17 1C8.16 1 1 8.16 1 17c0 11.25 16 26 16 26S33 28.25 33 17C33 8.16 25.84 1 17 1z"
            fill="#2563eb" filter="url(#s)"/>
      <circle cx="17" cy="17" r="6.5" fill="white"/>
      <circle cx="17" cy="17" r="3.5" fill="#2563eb"/>
    </svg>`,
    className: "",
    iconSize: [34, 44],
    iconAnchor: [17, 44],
    popupAnchor: [0, -46],
  });
}

export default function LocationPicker({
  value,
  onChange,
  zones = [],
}: LocationPickerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const zoneLayersRef = useRef<L.Polygon[]>([]);
  // Stable ref so closures inside useEffect always call the latest onChange
  const onChangeRef = useRef(onChange);
  // Ref to the placeMarker fn so handleGps can call it after effect teardown
  const placeMarkerRef = useRef<
    ((lat: number, lng: number, pan?: boolean) => void) | null
  >(null);

  const [hasPin, setHasPin] = useState(!!value);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsError, setGpsError] = useState("");

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center: value ? [value.lat, value.lng] : PANABO,
      zoom: value ? 16 : 14,
      zoomControl: false,
    });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
    }).addTo(map);

    L.control.zoom({ position: "bottomright" }).addTo(map);

    // ── internal helper ────────────────────────────────────────────────────
    const placeMarker = (lat: number, lng: number, pan = false) => {
      if (markerRef.current) {
        markerRef.current.setLatLng([lat, lng]);
      } else {
        const m = L.marker([lat, lng], {
          icon: buildMarkerIcon(),
          draggable: true,
        });
        m.addTo(map);
        m.on("dragend", () => {
          const { lat: la, lng: ln } = m.getLatLng();
          onChangeRef.current({ lat: la, lng: ln });
        });
        markerRef.current = m;
      }
      if (pan) map.setView([lat, lng], 17, { animate: true });
      setHasPin(true);
    };

    placeMarkerRef.current = placeMarker;

    // Restore initial value
    if (value) placeMarker(value.lat, value.lng);

    // Click → drop / move pin
    map.on("click", (e) => {
      const { lat, lng } = e.latlng;
      placeMarker(lat, lng);
      onChangeRef.current({ lat, lng });
    });

    mapRef.current = map;
    requestAnimationFrame(() => map.invalidateSize());
    const t = setTimeout(() => map.invalidateSize(), 200);

    return () => {
      clearTimeout(t);
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
      placeMarkerRef.current = null;
      zoneLayersRef.current = [];
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Render zone polygons ─────────────────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // Remove previous zone layers
    zoneLayersRef.current.forEach((l) => l.remove());
    zoneLayersRef.current = [];

    zones.forEach((zone) => {
      const latlngs = zone.coordinates.map(
        (p) => [p.lat, p.lng] as [number, number],
      );
      const polygon = L.polygon(latlngs, {
        color: "#2563eb",
        weight: 2,
        fillColor: "#3b82f6",
        fillOpacity: 0.12,
        dashArray: "6 4",
      });
      polygon.addTo(map);
      zoneLayersRef.current.push(polygon);
    });
  }, [zones]);

  // ── GPS handler ─────────────────────────────────────────────────────────
  const handleGps = () => {
    setGpsError("");
    setGpsLoading(true);
    if (!navigator.geolocation) {
      setGpsError("Geolocation is not supported by your browser.");
      setGpsLoading(false);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      ({ coords: { latitude: lat, longitude: lng } }) => {
        placeMarkerRef.current?.(lat, lng, true);
        onChangeRef.current({ lat, lng });
        setGpsLoading(false);
      },
      () => {
        setGpsError("Could not get GPS. Tap anywhere on the map instead.");
        setGpsLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  return (
    <div className="space-y-2">
      {/* ── Map container ── */}
      <div className="location-picker relative overflow-hidden rounded-xl border border-gray-200 shadow-sm location-picker-map-wrap">
        <div ref={containerRef} className="h-full w-full" />

        {/* GPS button */}
        <button
          type="button"
          onClick={handleGps}
          disabled={gpsLoading}
          className="absolute left-3 top-3 z-[1000] flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-700 shadow-md transition-colors hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700 disabled:opacity-60"
        >
          {gpsLoading ? (
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
          ) : (
            <svg
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="3" />
              <path d="M12 2v4M12 18v4M2 12h4M18 12h4" />
            </svg>
          )}
          {gpsLoading ? "Detecting…" : "Use My GPS"}
        </button>

        {/* Tap-hint shown until first pin is placed */}
        {!hasPin && (
          <div className="pointer-events-none absolute bottom-10 left-1/2 z-[1000] -translate-x-1/2 rounded-full bg-black/60 px-4 py-1.5 text-xs font-medium text-white whitespace-nowrap">
            Tap anywhere on the map to drop a pin
          </div>
        )}
      </div>

      {/* GPS error */}
      {gpsError && (
        <p className="flex items-center gap-1.5 text-xs text-amber-600">
          <svg
            width="13"
            height="13"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          {gpsError}
        </p>
      )}

      {/* Coordinate readout */}
      {value && (
        <div className="flex items-center gap-2 rounded-lg border border-blue-100 bg-blue-50 px-3 py-2">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="#2563eb">
            <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
          </svg>
          <span className="text-xs font-semibold text-blue-700">
            Location pinned
          </span>
          <span className="ml-auto font-mono text-xs text-blue-500">
            {value.lat.toFixed(5)},&nbsp;{value.lng.toFixed(5)}
          </span>
        </div>
      )}
    </div>
  );
}
