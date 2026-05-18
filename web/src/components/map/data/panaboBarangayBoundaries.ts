import type { FeatureCollection, Polygon } from "geojson";

export type BarangayBoundaryProperties = {
  name: string;
};

// Approximate boundaries for visualization only.
export const PANABO_BARANGAY_BOUNDARIES: FeatureCollection<
  Polygon,
  BarangayBoundaryProperties
> = {
  type: "FeatureCollection",
  features: [],
};
