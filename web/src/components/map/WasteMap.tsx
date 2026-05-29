"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import type { FeatureCollection, Polygon } from "geojson";
import "leaflet/dist/leaflet.css";
import "leaflet.heat";
import "leaflet-draw";
import "leaflet-draw/dist/leaflet.draw.css";
// Barangay boundaries removed from map - no-op imports
import {
  MapReport,
  ReportingZone,
  ZonePoint,
  WASTE_CATEGORY_LABELS,
  WASTE_CATEGORY_COLORS,
  REPORT_STATUS_LABELS,
  STATUS_COLORS,
} from "@/types";

interface WasteMapProps {
  reports: MapReport[];
  center?: [number, number];
  zoom?: number;
  showHeatmap?: boolean;
  onReportClick?: (report: MapReport) => void;
  onMapReady?: (map: L.Map | null) => void;
  canDraw?: boolean;
  drawMode?: boolean;
  onDrawRectangle?: (bounds: {
    minLat: number;
    maxLat: number;
    minLng: number;
    maxLng: number;
  }) => void;
  showBarangayBoundaries?: boolean;
  // Barangay boundaries removed; geojson no longer required
  reportingZones?: ReportingZone[];
  canDrawZone?: boolean;
  drawZoneMode?: boolean;
  onDrawZone?: (points: ZonePoint[]) => void;
}

const DEFAULT_CENTER: [number, number] = [7.3132, 125.6844];

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function createMarkerIcon(category: string, status: string) {
  const color =
    (WASTE_CATEGORY_COLORS as Record<string, string>)[category] || "#6b7280";
  const statusColor =
    (STATUS_COLORS as Record<string, string>)[status] || "#6b7280";
  const size = 15;
  const isPending = status === "PENDING";

  return L.divIcon({
    html: `<div class="waste-marker${isPending ? " waste-marker--pulse" : ""}" style="--mc:${color};width:${size + 8}px;height:${size + 8}px;background:${color};border:3px solid white;border-radius:50%;box-shadow:0 2px 8px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;"><div style="width:${Math.max(4, Math.round(size * 0.38))}px;height:${Math.max(4, Math.round(size * 0.38))}px;background:${statusColor};border-radius:50%;border:1.5px solid rgba(255,255,255,0.8);"></div></div>`,
    className: "",
    iconSize: [size + 8, size + 8],
    iconAnchor: [(size + 8) / 2, (size + 8) / 2],
  });
}

export default function WasteMap({
  reports,
  center = DEFAULT_CENTER,
  zoom = 13,
  showHeatmap = false,
  onReportClick,
  onMapReady,
  canDraw = false,
  drawMode = false,
  onDrawRectangle,
  showBarangayBoundaries = true,
  reportingZones = [],
  canDrawZone = false,
  drawZoneMode = false,
  onDrawZone,
}: WasteMapProps) {
  const mapRef = useRef<L.Map | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const markersRef = useRef<L.Marker[]>([]);
  const zoneLayersRef = useRef<L.Polygon[]>([]);
  const drawnItemsRef = useRef<L.FeatureGroup | null>(null);
  const zoneDrawControlRef = useRef<any>(null);
  const zoneDrawnItemsRef = useRef<L.FeatureGroup | null>(null);
  const onDrawZoneRef = useRef(onDrawZone);

  useEffect(() => {
    onDrawZoneRef.current = onDrawZone;
  }, [onDrawZone]);
  const drawControlRef = useRef<any>(null);
  const heatLayerRef = useRef<any>(null);
  const boundaryLayerRef = useRef<L.GeoJSON | null>(null);
  const boundaryBoundsRef = useRef<L.LatLngBounds | null>(null);
  const onMapReadyRef = useRef(onMapReady);
  const onDrawRectangleRef = useRef(onDrawRectangle);
  const centerRef = useRef(center);

  useEffect(() => {
    onMapReadyRef.current = onMapReady;
  }, [onMapReady]);

  useEffect(() => {
    onDrawRectangleRef.current = onDrawRectangle;
  }, [onDrawRectangle]);

  useEffect(() => {
    centerRef.current = center;
  }, [center]);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = L.map(containerRef.current, { zoomControl: false }).setView(
      center,
      zoom,
    );

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
    }).addTo(map);

    L.control.zoom({ position: "topright" }).addTo(map);

    const RecenterControl = L.Control.extend({
      options: { position: "topright" },
      onAdd() {
        const btn = L.DomUtil.create("button", "leaflet-recenter-btn");
        btn.innerHTML = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M12 2v4M12 18v4M2 12h4M18 12h4"/></svg>`;
        btn.title = "Recenter on Panabo City";
        L.DomEvent.on(btn, "click", (e) => {
          L.DomEvent.stopPropagation(e);
          map.setView(centerRef.current, 13, { animate: false });
        });
        return btn;
      },
    });
    new RecenterControl().addTo(map);

    const drawnItems = new L.FeatureGroup();
    map.addLayer(drawnItems);
    drawnItemsRef.current = drawnItems;

    const zoneDrawnItems = new L.FeatureGroup();
    map.addLayer(zoneDrawnItems);
    zoneDrawnItemsRef.current = zoneDrawnItems;

    const handleDrawCreated = (event: any) => {
      if (event.layerType === "rectangle") {
        const layer = event.layer as L.Rectangle;
        const bounds = layer.getBounds();
        drawnItems.clearLayers();
        drawnItems.addLayer(layer);
        onDrawRectangleRef.current?.({
          minLat: bounds.getSouth(),
          maxLat: bounds.getNorth(),
          minLng: bounds.getWest(),
          maxLng: bounds.getEast(),
        });
        return;
      }
      if (event.layerType === "polygon") {
        const layer = event.layer as L.Polygon;
        zoneDrawnItems.clearLayers();
        zoneDrawnItems.addLayer(layer);
        const latlngs = (layer.getLatLngs()[0] as L.LatLng[]).map((ll) => ({
          lat: ll.lat,
          lng: ll.lng,
        }));
        onDrawZoneRef.current?.(latlngs);
      }
    };
    map.on("draw:created", handleDrawCreated);

    mapRef.current = map;
    onMapReadyRef.current?.(map);

    const rafId = requestAnimationFrame(() => {
      if (mapRef.current === map) {
        map.invalidateSize({ pan: false });
      }
    });
    const t = window.setTimeout(() => {
      if (mapRef.current === map) {
        map.invalidateSize({ pan: false });
      }
    }, 200);

    return () => {
      cancelAnimationFrame(rafId);
      window.clearTimeout(t);
      map.off("draw:created", handleDrawCreated);

      if (drawControlRef.current) {
        map.removeControl(drawControlRef.current);
        drawControlRef.current = null;
      }

      if (heatLayerRef.current) {
        map.removeLayer(heatLayerRef.current);
        heatLayerRef.current = null;
      }

      if (boundaryLayerRef.current) {
        boundaryLayerRef.current.remove();
        boundaryLayerRef.current = null;
        boundaryBoundsRef.current = null;
      }

      markersRef.current.forEach((marker) => marker.remove());
      markersRef.current = [];

      zoneLayersRef.current.forEach((layer) => layer.remove());
      zoneLayersRef.current = [];

      if (zoneDrawControlRef.current) {
        map.removeControl(zoneDrawControlRef.current);
        zoneDrawControlRef.current = null;
      }

      map.stop();
      map.remove();
      mapRef.current = null;
      drawnItemsRef.current = null;
      onMapReadyRef.current?.(null);
    };
  }, []);

  useEffect(() => {
    if (!mapRef.current) return;
    const map = mapRef.current;
    const currentCenter = map.getCenter();
    const hasCenterChanged =
      Math.abs(currentCenter.lat - center[0]) > 0.000001 ||
      Math.abs(currentCenter.lng - center[1]) > 0.000001;
    const hasZoomChanged = map.getZoom() !== zoom;

    if (hasCenterChanged || hasZoomChanged) {
      map.setView(center, zoom, { animate: false });
    }
  }, [center, zoom]);

  useEffect(() => {
    if (!mapRef.current) return;
    const map = mapRef.current;

    if (boundaryLayerRef.current) {
      boundaryLayerRef.current.remove();
      boundaryLayerRef.current = null;
    }
    boundaryBoundsRef.current = null;

    // Barangay boundary layer removed — skip
    return;
  }, [showBarangayBoundaries]);

  useEffect(() => {
    if (!mapRef.current) return;
    const map = mapRef.current;

    let combinedBounds: L.LatLngBounds | null = null;

    // Build a flat list of coordinates from reports and active reporting zones,
    // then compute bounds in one call to avoid Leaflet/TS inference issues.
    const allCoords: [number, number][] = [];
    if (reports.length > 0) {
      allCoords.push(
        ...reports.map((r) => [r.latitude, r.longitude] as [number, number]),
      );
    }
    if (reportingZones && reportingZones.length > 0) {
      reportingZones
        .filter((z) => z.isActive)
        .forEach((zone) => {
          allCoords.push(
            ...zone.coordinates.map((p) => [p.lat, p.lng] as [number, number]),
          );
        });
    }

    if (allCoords.length > 0) {
      const bounds = L.latLngBounds(allCoords);
      combinedBounds = bounds;
    }

    if (combinedBounds?.isValid()) {
      map.fitBounds(combinedBounds, {
        padding: [60, 60],
        maxZoom: 15,
        animate: false,
      });
    }
  }, [reports, showBarangayBoundaries, reportingZones]);

  useEffect(() => {
    if (!mapRef.current) return;
    const map = mapRef.current;

    if (drawControlRef.current) {
      map.removeControl(drawControlRef.current);
      drawControlRef.current = null;
    }

    if (!canDraw || !drawMode) {
      drawnItemsRef.current?.clearLayers();
      return;
    }

    const DrawControl = (L as any).Control?.Draw;
    if (!DrawControl || !drawnItemsRef.current) {
      return;
    }

    drawControlRef.current = new DrawControl({
      position: "topright",
      draw: {
        rectangle: {
          shapeOptions: { color: "#1d4ed8", weight: 2 },
        },
        polyline: false,
        polygon: false,
        circle: false,
        marker: false,
        circlemarker: false,
      },
      edit: {
        featureGroup: drawnItemsRef.current,
        edit: false,
        remove: false,
      },
    });

    map.addControl(drawControlRef.current);

    return () => {
      if (drawControlRef.current) {
        map.removeControl(drawControlRef.current);
        drawControlRef.current = null;
      }
    };
  }, [canDraw, drawMode]);

  useEffect(() => {
    if (!mapRef.current) return;
    const map = mapRef.current;

    if (zoneDrawControlRef.current) {
      map.removeControl(zoneDrawControlRef.current);
      zoneDrawControlRef.current = null;
    }

    if (!canDrawZone || !drawZoneMode) {
      zoneDrawnItemsRef.current?.clearLayers();
      return;
    }

    const DrawControl = (L as any).Control?.Draw;
    if (!DrawControl || !zoneDrawnItemsRef.current) return;

    zoneDrawControlRef.current = new DrawControl({
      position: "topright",
      draw: {
        polygon: {
          allowIntersection: false,
          showArea: true,
          shapeOptions: {
            color: "#2563eb",
            fillColor: "#3b82f6",
            fillOpacity: 0.2,
            weight: 2,
          },
          icon: new L.DivIcon({
            iconSize: new L.Point(8, 8),
            className: "leaflet-div-icon leaflet-editing-icon",
          }),
        },
        rectangle: false,
        polyline: false,
        circle: false,
        marker: false,
        circlemarker: false,
      },
      edit: {
        featureGroup: zoneDrawnItemsRef.current,
        edit: false,
        remove: false,
      },
    });

    map.addControl(zoneDrawControlRef.current);

    return () => {
      if (zoneDrawControlRef.current) {
        map.removeControl(zoneDrawControlRef.current);
        zoneDrawControlRef.current = null;
      }
    };
  }, [canDrawZone, drawZoneMode]);

  useEffect(() => {
    if (!mapRef.current) return;
    const map = mapRef.current;

    zoneLayersRef.current.forEach((l) => l.remove());
    zoneLayersRef.current = [];

    reportingZones
      .filter((z) => z.isActive)
      .forEach((zone) => {
        const latlngs = zone.coordinates.map(
          (p) => [p.lat, p.lng] as [number, number],
        );
        const polygon = L.polygon(latlngs, {
          color: "#2563eb",
          weight: 2,
          fillColor: "#3b82f6",
          fillOpacity: 0.15,
          dashArray: undefined,
        });
        polygon.bindTooltip(zone.name, {
          permanent: false,
          direction: "center",
          className: "waste-marker-tooltip",
        });
        polygon.addTo(map);
        zoneLayersRef.current.push(polygon);
      });
  }, [reportingZones]);

  useEffect(() => {
    if (!mapRef.current) return;
    const map = mapRef.current;

    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    reports.forEach((report) => {
      const marker = L.marker([report.latitude, report.longitude], {
        icon: createMarkerIcon(report.category, report.status),
      });

      const catColor =
        (WASTE_CATEGORY_COLORS as Record<string, string>)[report.category] ||
        "#6b7280";
      const statusColor =
        (STATUS_COLORS as Record<string, string>)[report.status] || "#6b7280";
      const imgHtml = report.images?.[0]
        ? `<img src="${report.images[0].imageUrl}" style="width:100%;height:80px;object-fit:cover;border-radius:6px;margin-bottom:8px;" loading="lazy" />`
        : "";

      const safeTitle = report.title.replace(/</g, "<");
      const safeAddress = report.address?.replace(/</g, "<") || "";
      const popupContent = `
        <div class="waste-popup">
          <div class="waste-popup-header" style="background:${catColor};">
            <span class="waste-popup-cat">${(WASTE_CATEGORY_LABELS as Record<string, string>)[report.category]}</span>
          </div>
          <div class="waste-popup-body">
            ${imgHtml}
            <h3 class="waste-popup-title">${safeTitle}</h3>
            <div class="waste-popup-meta">
              <span class="waste-popup-status" style="background:${statusColor}22;color:${statusColor};border:1px solid ${statusColor}44;">${(REPORT_STATUS_LABELS as Record<string, string>)[report.status]}</span>
              <span class="waste-popup-time">${timeAgo(report.createdAt)}</span>
            </div>
            ${report.address ? `<p class="waste-popup-addr">${safeAddress}</p>` : ""}
          </div>
        </div>`;

      marker.bindPopup(popupContent, {
        maxWidth: 240,
        minWidth: 200,
        className: "waste-popup-wrapper",
      });

      const tooltipContent = `
        <div style="font-size:12px;line-height:1.4;">
          <strong style="display:block;margin-bottom:3px;color:#1f2937;">${safeTitle}</strong>
          <span style="font-size:10px;color:#6b7280;">${(WASTE_CATEGORY_LABELS as Record<string, string>)[report.category]}</span>
          <span style="margin:0 5px;color:#d1d5db;">·</span>
          <span style="font-size:10px;color:${statusColor};font-weight:600;">${(REPORT_STATUS_LABELS as Record<string, string>)[report.status]}</span>
        </div>`;
      marker.bindTooltip(tooltipContent, {
        direction: "top",
        offset: [0, -10],
        opacity: 0.95,
        className: "waste-marker-tooltip",
      });

      if (onReportClick) {
        marker.on("click", () => onReportClick(report));
      }

      marker.addTo(map);
      markersRef.current.push(marker);
    });
  }, [reports, onReportClick]);

  useEffect(() => {
    if (!mapRef.current) return;
    const map = mapRef.current;

    if (heatLayerRef.current) {
      map.removeLayer(heatLayerRef.current);
      heatLayerRef.current = null;
    }

    if (!showHeatmap || reports.length === 0) return;

    const heatData: [number, number, number][] = reports.map((r) => [
      r.latitude,
      r.longitude,
      0.5,
    ]);

    if (typeof (L as any).heatLayer === "function") {
      heatLayerRef.current = (L as any)
        .heatLayer(heatData, {
          radius: 35,
          blur: 25,
          maxZoom: 17,
          max: 1.0,
          gradient: {
            0.0: "#3b82f6",
            0.3: "#06b6d4",
            0.5: "#22c55e",
            0.7: "#f59e0b",
            0.85: "#f97316",
            1.0: "#ef4444",
          },
        })
        .addTo(map);
    }
  }, [reports, showHeatmap]);

  return <div ref={containerRef} className="h-full w-full" />;
}
