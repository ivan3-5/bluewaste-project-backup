"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import type { FeatureCollection, Polygon } from "geojson";
import "leaflet/dist/leaflet.css";
import "leaflet.heat";
import "leaflet-draw";
import "leaflet-draw/dist/leaflet.draw.css";
import {
  PANABO_BARANGAY_BOUNDARIES,
  type BarangayBoundaryProperties,
} from "@/components/map/data/panaboBarangayBoundaries";
import { createBarangayBoundaryLayer } from "@/components/map/layers/barangayBoundaryLayer";
import {
  MapReport,
  ResortArea,
  WASTE_CATEGORY_LABELS,
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
  resortBoxes?: ResortArea[];
  canDraw?: boolean;
  drawMode?: boolean;
  onDrawRectangle?: (bounds: {
    minLat: number;
    maxLat: number;
    minLng: number;
    maxLng: number;
  }) => void;
  showBarangayBoundaries?: boolean;
  barangayBoundaryGeoJson?: FeatureCollection<
    Polygon,
    BarangayBoundaryProperties
  >;
}

export const CATEGORY_COLORS: Record<string, string> = {
  SOLID_WASTE: "#3b82f6",
  HAZARDOUS: "#ef4444",
  LIQUID: "#06b6d4",
  RECYCLABLE: "#22c55e",
  ORGANIC: "#84cc16",
  ELECTRONIC: "#8b5cf6",
  OTHER: "#6b7280",
};

const PRIORITY_SIZES: Record<string, number> = {
  CRITICAL: 22,
  HIGH: 18,
  MEDIUM: 15,
  LOW: 12,
};

const DEFAULT_CENTER: [number, number] = [7.3132, 125.6844];

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function createMarkerIcon(category: string, priority: string, status: string) {
  const color = CATEGORY_COLORS[category] || "#6b7280";
  const statusColor =
    (STATUS_COLORS as Record<string, string>)[status] || "#6b7280";
  const size = PRIORITY_SIZES[priority] || 15;
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
  resortBoxes = [],
  canDraw = false,
  drawMode = false,
  onDrawRectangle,
  showBarangayBoundaries = true,
  barangayBoundaryGeoJson = PANABO_BARANGAY_BOUNDARIES,
}: WasteMapProps) {
  const mapRef = useRef<L.Map | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const markersRef = useRef<L.Marker[]>([]);
  const boxLayersRef = useRef<L.Rectangle[]>([]);
  const drawnItemsRef = useRef<L.FeatureGroup | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const drawControlRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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

    // OpenStreetMap — standard colorful basemap
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
    }).addTo(map);

    // Zoom controls — top right
    L.control.zoom({ position: "topright" }).addTo(map);

    // Re-center button
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

    const handleDrawCreated = (event: any) => {
      if (event.layerType !== "rectangle") {
        return;
      }

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
    };
    map.on("draw:created", handleDrawCreated);

    mapRef.current = map;
    onMapReadyRef.current?.(map);

    // Delay first resize slightly to avoid running before mount is complete.
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

      boxLayersRef.current.forEach((layer) => layer.remove());
      boxLayersRef.current = [];

      map.stop();
      map.remove();
      mapRef.current = null;
      drawnItemsRef.current = null;
      onMapReadyRef.current?.(null);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

    if (!showBarangayBoundaries) {
      return;
    }

    const { layer, bounds } = createBarangayBoundaryLayer({
      geoJson: barangayBoundaryGeoJson,
    });
    layer.addTo(map);

    boundaryLayerRef.current = layer;
    boundaryBoundsRef.current = bounds;

    return () => {
      if (boundaryLayerRef.current === layer) {
        layer.remove();
        boundaryLayerRef.current = null;
        boundaryBoundsRef.current = null;
      }
    };
  }, [showBarangayBoundaries, barangayBoundaryGeoJson]);

  useEffect(() => {
    if (!mapRef.current) return;
    const map = mapRef.current;

    let combinedBounds: L.LatLngBounds | null = null;

    if (boundaryBoundsRef.current?.isValid()) {
      combinedBounds = L.latLngBounds(
        boundaryBoundsRef.current.getSouthWest(),
        boundaryBoundsRef.current.getNorthEast(),
      );
    }

    if (reports.length > 0) {
      const reportBounds = L.latLngBounds(
        reports.map((r) => [r.latitude, r.longitude] as [number, number]),
      );
      combinedBounds = combinedBounds
        ? combinedBounds.extend(reportBounds)
        : reportBounds;
    }

    if (combinedBounds?.isValid()) {
      map.fitBounds(combinedBounds, {
        padding: [60, 60],
        maxZoom: 15,
        animate: false,
      });
    }
  }, [reports, showBarangayBoundaries, barangayBoundaryGeoJson]);

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

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const DrawControl = (L as any).Control?.Draw;
    if (!DrawControl || !drawnItemsRef.current) {
      return;
    }

    drawControlRef.current = new DrawControl({
      position: "topright",
      draw: {
        rectangle: {
          shapeOptions: {
            color: "#1d4ed8",
            weight: 2,
          },
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

    boxLayersRef.current.forEach((layer) => layer.remove());
    boxLayersRef.current = [];

    resortBoxes
      .filter((box) => box.isActive)
      .forEach((box) => {
        const rectangle = L.rectangle(
          [
            [box.minLat, box.minLng],
            [box.maxLat, box.maxLng],
          ],
          {
            color: "#1d4ed8",
            weight: 2,
            fillColor: "#2563eb",
            fillOpacity: 0.08,
          },
        );

        rectangle
          .bindTooltip(box.name, {
            permanent: false,
            direction: "center",
            className: "waste-marker-tooltip",
          })
          .bindPopup(
            `<div style="font-size:12px;line-height:1.4;"><strong>${box.name.replace(/</g, "&lt;")}</strong><br/>Owner: ${box.owner.firstName} ${box.owner.lastName}<br/>Reports: ${box._count?.reports ?? 0}</div>`,
          );

        rectangle.addTo(map);
        boxLayersRef.current.push(rectangle);
      });
  }, [resortBoxes]);

  useEffect(() => {
    if (!mapRef.current) return;
    const map = mapRef.current;

    // Clear old markers
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    reports.forEach((report) => {
      const marker = L.marker([report.latitude, report.longitude], {
        icon: createMarkerIcon(report.category, report.priority, report.status),
      });

      const catColor = CATEGORY_COLORS[report.category] || "#6b7280";
      const statusColor =
        (STATUS_COLORS as Record<string, string>)[report.status] || "#6b7280";
      const imgHtml = report.images?.[0]
        ? `<img src="${report.images[0].imageUrl}" style="width:100%;height:80px;object-fit:cover;border-radius:6px;margin-bottom:8px;" loading="lazy" />`
        : "";

      const popupContent = `
        <div class="waste-popup">
          <div class="waste-popup-header" style="background:${catColor};">
            <span class="waste-popup-cat">${(WASTE_CATEGORY_LABELS as Record<string, string>)[report.category]}</span>
            <span class="waste-popup-priority">${report.priority}</span>
          </div>
          <div class="waste-popup-body">
            ${imgHtml}
            <h3 class="waste-popup-title">${report.title.replace(/</g, "&lt;")}</h3>
            <div class="waste-popup-meta">
              <span class="waste-popup-status" style="background:${statusColor}22;color:${statusColor};border:1px solid ${statusColor}44;">${(REPORT_STATUS_LABELS as Record<string, string>)[report.status]}</span>
              <span class="waste-popup-time">${timeAgo(report.createdAt)}</span>
            </div>
            ${report.barangay ? `<p class="waste-popup-loc">&#128205; Brgy. ${report.barangay.name.replace(/</g, "&lt;")}</p>` : ""}
            ${report.address ? `<p class="waste-popup-addr">${report.address.replace(/</g, "&lt;")}</p>` : ""}
          </div>
        </div>`;

      marker.bindPopup(popupContent, {
        maxWidth: 240,
        minWidth: 200,
        className: "waste-popup-wrapper",
      });

      // Tooltip on hover — short preview
      const barangayHtml = report.barangay
        ? `<span style="display:block;font-size:10px;color:#6b7280;margin-top:3px;">&#128205; Brgy. ${report.barangay.name.replace(/</g, "&lt;")}</span>`
        : "";
      const tooltipContent = `
        <div style="font-size:12px;line-height:1.4;">
          <strong style="display:block;margin-bottom:3px;color:#1f2937;">${report.title.replace(/</g, "&lt;")}</strong>
          <span style="font-size:10px;color:#6b7280;">${(WASTE_CATEGORY_LABELS as Record<string, string>)[report.category]}</span>
          <span style="margin:0 5px;color:#d1d5db;">·</span>
          <span style="font-size:10px;color:${statusColor};font-weight:600;">${(REPORT_STATUS_LABELS as Record<string, string>)[report.status]}</span>
          ${barangayHtml}
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

  // ── Heatmap layer ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!mapRef.current) return;
    const map = mapRef.current;

    // Remove existing heat layer
    if (heatLayerRef.current) {
      map.removeLayer(heatLayerRef.current);
      heatLayerRef.current = null;
    }

    if (!showHeatmap || reports.length === 0) return;

    const PRIORITY_WEIGHT: Record<string, number> = {
      CRITICAL: 1.0,
      HIGH: 0.75,
      MEDIUM: 0.5,
      LOW: 0.25,
    };

    const heatData: [number, number, number][] = reports.map((r) => [
      r.latitude,
      r.longitude,
      PRIORITY_WEIGHT[r.priority] ?? 0.5,
    ]);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (typeof (L as any).heatLayer === "function") {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
