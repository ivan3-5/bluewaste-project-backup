import type { WasteCategory } from "@/types";

export type WasteTypeCode = "RECYCLABLE" | "NON_RECYCLABLE" | "ORGANIC";

export interface DetectionBox {
  className: string;
  confidence: number;
  x: number;
  y: number;
  width: number;
  height: number;
  normalized: boolean;
}

export interface ClassificationResult {
  detectedObject: string;
  wasteTypeCode: WasteTypeCode;
  wasteType: "Recyclable" | "Non-recyclable" | "Organic";
  wasteCategory: WasteCategory;
  confidence: number;
  labels: string[];
  detections: DetectionBox[];
}

const RECYCLABLE_KEYWORDS = [
  "plastic",
  "bottle",
  "can",
  "metal",
  "aluminum",
  "glass",
  "paper",
  "cardboard",
  "carton",
  "container",
];

const ORGANIC_KEYWORDS = [
  "food",
  "fruit",
  "vegetable",
  "leaf",
  "leaves",
  "plant",
  "compost",
  "organic",
  "garden waste",
];

const CATEGORY_KEYWORDS: Record<WasteCategory, string[]> = {
  PLASTIC_WASTE: [
    "plastic",
    "bottle",
    "bag",
    "wrapper",
    "cup",
    "container",
    "straw",
    "styrofoam",
  ],
  ORGANIC_WASTE: ORGANIC_KEYWORDS,
  GLASS_WASTE: ["glass", "wine glass", "jar", "glass bottle"],
  METAL_WASTE: ["metal", "can", "tin", "aluminum", "steel"],
  PAPER_WASTE: ["paper", "cardboard", "carton", "newspaper", "box"],
};

const CATEGORY_MATCH_ORDER: WasteCategory[] = [
  "ORGANIC_WASTE",
  "GLASS_WASTE",
  "METAL_WASTE",
  "PAPER_WASTE",
  "PLASTIC_WASTE",
];

const HUMAN_LABELS: Record<WasteTypeCode, ClassificationResult["wasteType"]> = {
  RECYCLABLE: "Recyclable",
  NON_RECYCLABLE: "Non-recyclable",
  ORGANIC: "Organic",
};

function labelMatches(label: string, keywords: string[]) {
  return keywords.some((keyword) => label.includes(keyword));
}

function toNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return null;
}

function toLabel(value: unknown): string {
  if (typeof value !== "string") {
    return "";
  }
  return value.toLowerCase().trim();
}

function pickArray(payload: any): any[] {
  if (Array.isArray(payload)) return payload;

  const directKeys = [
    "detections",
    "predictions",
    "results",
    "objects",
    "items",
  ];
  for (const key of directKeys) {
    if (Array.isArray(payload?.[key])) {
      return payload[key];
    }
  }

  const nested = payload?.data;
  for (const key of directKeys) {
    if (Array.isArray(nested?.[key])) {
      return nested[key];
    }
  }

  return [];
}

function parseBoxFromArray(raw: unknown[]): {
  x: number;
  y: number;
  width: number;
  height: number;
} | null {
  if (raw.length < 4) {
    return null;
  }

  const a = toNumber(raw[0]);
  const b = toNumber(raw[1]);
  const c = toNumber(raw[2]);
  const d = toNumber(raw[3]);

  if (a === null || b === null || c === null || d === null) {
    return null;
  }

  if (c > a && d > b) {
    return {
      x: a,
      y: b,
      width: c - a,
      height: d - b,
    };
  }

  return {
    x: a,
    y: b,
    width: c,
    height: d,
  };
}

function parseBoxFromObject(raw: Record<string, unknown>): {
  x: number;
  y: number;
  width: number;
  height: number;
} | null {
  const x1 = toNumber(raw.x1 ?? raw.xmin ?? raw.left ?? raw.x);
  const y1 = toNumber(raw.y1 ?? raw.ymin ?? raw.top ?? raw.y);
  const x2 = toNumber(raw.x2 ?? raw.xmax ?? raw.right);
  const y2 = toNumber(raw.y2 ?? raw.ymax ?? raw.bottom);

  if (x1 === null || y1 === null) {
    return null;
  }

  if (x2 !== null && y2 !== null && x2 > x1 && y2 > y1) {
    return {
      x: x1,
      y: y1,
      width: x2 - x1,
      height: y2 - y1,
    };
  }

  const width = toNumber(raw.width ?? raw.w);
  const height = toNumber(raw.height ?? raw.h);

  if (width === null || height === null) {
    return null;
  }

  return {
    x: x1,
    y: y1,
    width,
    height,
  };
}

function parseDetection(entry: any): DetectionBox | null {
  const className = toLabel(
    entry?.class_name ??
      entry?.class ??
      entry?.label ??
      entry?.name ??
      entry?.detectedObject,
  );

  const confidence =
    toNumber(entry?.confidence ?? entry?.score ?? entry?.probability) ?? 0;

  let box: {
    x: number;
    y: number;
    width: number;
    height: number;
  } | null = null;

  const rawBox =
    entry?.bbox ?? entry?.box ?? entry?.bounding_box ?? entry?.bounds ?? null;

  if (Array.isArray(rawBox)) {
    box = parseBoxFromArray(rawBox);
  } else if (rawBox && typeof rawBox === "object") {
    box = parseBoxFromObject(rawBox as Record<string, unknown>);
  } else if (Array.isArray(entry?.xyxy)) {
    box = parseBoxFromArray(entry.xyxy);
  } else {
    // Some providers return x/y/width/height (or x/y/w/h) directly on the detection object.
    box = parseBoxFromObject(entry as Record<string, unknown>);
  }

  if (!className || !box) {
    return null;
  }

  if (box.width <= 0 || box.height <= 0) {
    return null;
  }

  const normalized =
    box.x <= 1 && box.y <= 1 && box.width <= 1 && box.height <= 1;

  return {
    className,
    confidence,
    x: box.x,
    y: box.y,
    width: box.width,
    height: box.height,
    normalized,
  };
}

function inferWasteType(labels: string[]): WasteTypeCode {
  const hasOrganic = labels.some((label) =>
    labelMatches(label, ORGANIC_KEYWORDS),
  );
  if (hasOrganic) return "ORGANIC";

  const hasRecyclable = labels.some((label) =>
    labelMatches(label, RECYCLABLE_KEYWORDS),
  );
  if (hasRecyclable) return "RECYCLABLE";

  return "NON_RECYCLABLE";
}

export function inferWasteCategory(
  labels: string[],
  wasteTypeCode?: WasteTypeCode,
): WasteCategory {
  if (wasteTypeCode === "ORGANIC") {
    return "ORGANIC_WASTE";
  }

  for (const category of CATEGORY_MATCH_ORDER) {
    const keywords = CATEGORY_KEYWORDS[category];
    if (labels.some((label) => labelMatches(label, keywords))) {
      return category;
    }
  }

  return "PLASTIC_WASTE";
}

export function classifyYoloPayload(payload: unknown): ClassificationResult {
  const detections = pickArray(payload)
    .map(parseDetection)
    .filter((item): item is DetectionBox => !!item)
    .sort((a, b) => b.confidence - a.confidence);

  if (detections.length === 0) {
    return {
      detectedObject: "unknown",
      wasteTypeCode: "NON_RECYCLABLE",
      wasteType: HUMAN_LABELS.NON_RECYCLABLE,
      wasteCategory: "PLASTIC_WASTE",
      confidence: 0,
      labels: [],
      detections: [],
    };
  }

  const labels = Array.from(
    new Set(detections.map((detection) => detection.className)),
  );
  const top = detections[0];
  const wasteTypeCode = inferWasteType(labels);
  const wasteCategory = inferWasteCategory(labels, wasteTypeCode);

  return {
    detectedObject: top.className,
    wasteTypeCode,
    wasteType: HUMAN_LABELS[wasteTypeCode],
    wasteCategory,
    confidence: Number(top.confidence.toFixed(4)),
    labels,
    detections,
  };
}
