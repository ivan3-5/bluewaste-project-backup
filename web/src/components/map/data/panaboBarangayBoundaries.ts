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
  features: [
    {
      type: "Feature",
      properties: { name: "San Pedro" },
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [125.705, 7.295],
            [125.725, 7.295],
            [125.73, 7.28],
            [125.71, 7.275],
            [125.7, 7.285],
            [125.705, 7.295],
          ],
        ],
      },
    },
    {
      type: "Feature",
      properties: { name: "Cagangohan" },
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [125.675, 7.31],
            [125.695, 7.315],
            [125.7, 7.3],
            [125.685, 7.295],
            [125.67, 7.3],
            [125.675, 7.31],
          ],
        ],
      },
    },
    {
      type: "Feature",
      properties: { name: "San Vicente" },
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [125.685, 7.32],
            [125.71, 7.325],
            [125.725, 7.31],
            [125.72, 7.295],
            [125.7, 7.29],
            [125.685, 7.3],
            [125.685, 7.32],
          ],
        ],
      },
    },
  ],
};
