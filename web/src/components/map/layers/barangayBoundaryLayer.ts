import L from "leaflet";
import type { Feature, GeoJsonProperties, Geometry, Polygon } from "geojson";
import {
  PANABO_BARANGAY_BOUNDARIES,
  type BarangayBoundaryProperties,
} from "../data/panaboBarangayBoundaries";

const BASE_BOUNDARY_STYLE: L.PathOptions = {
  color: "#dc2626",
  weight: 2,
  dashArray: "5,5",
  fillColor: "#ef4444",
  fillOpacity: 0.1,
};

const HOVER_STYLE: L.PathOptions = {
  weight: 3,
  fillOpacity: 0.18,
};

function escapeHtml(value: string): string {
  return value.replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function getFeatureName(
  feature?: Feature<Geometry, GeoJsonProperties>,
): string {
  const rawName = feature?.properties?.name;
  return typeof rawName === "string" ? rawName : "Unknown barangay";
}

export function createBarangayBoundaryLayer({
  geoJson = PANABO_BARANGAY_BOUNDARIES,
  styleOverrides,
}: {
  geoJson?: GeoJSON.FeatureCollection<Polygon, BarangayBoundaryProperties>;
  styleOverrides?: L.PathOptions;
} = {}): { layer: L.GeoJSON; bounds: L.LatLngBounds | null } {
  const baseStyle: L.PathOptions = {
    ...BASE_BOUNDARY_STYLE,
    ...styleOverrides,
  };

  const layer = L.geoJSON(geoJson, {
    style: () => baseStyle,
    onEachFeature: (feature, featureLayer) => {
      if (!(featureLayer instanceof L.Path)) {
        return;
      }

      const name = getFeatureName(feature);

      featureLayer.bindPopup(`<strong>${escapeHtml(name)}</strong>`, {
        closeButton: false,
        offset: [0, -4],
      });

      featureLayer.on({
        mouseover: () => {
          featureLayer.setStyle({ ...baseStyle, ...HOVER_STYLE });
          featureLayer.bringToFront();
        },
        mouseout: () => {
          featureLayer.setStyle(baseStyle);
        },
        click: () => {
          featureLayer.openPopup();
        },
      });
    },
  });

  const bounds = layer.getBounds();
  return { layer, bounds: bounds.isValid() ? bounds : null };
}
