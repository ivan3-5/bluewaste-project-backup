import type {
  WasteCategory,
  WasteDetection,
  WasteSeverity,
  WasteType,
} from "@/types";

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
  dominantWaste: WasteType | null;
  totalItems: number;
  severity: WasteSeverity;
  wasteCategory: WasteCategory;
  confidence: number;
  labels: string[];
  detections: DetectionBox[];
  wasteDetections: WasteDetection[];
}

const WASTE_LABEL_MAP: Record<string, WasteType> = {
  plastic: "PLASTIC",
  organic: "ORGANIC",
  glass: "GLASS",
  metal: "METAL",
  paper: "PAPER",
};

const WASTE_TYPE_TO_CATEGORY: Record<WasteType, WasteCategory> = {
  PLASTIC: "WITH_WASTE",
  ORGANIC: "WITH_WASTE",
  GLASS: "WITH_WASTE",
  METAL: "WITH_WASTE",
  PAPER: "WITH_WASTE",
};

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
  WITH_WASTE: [
    "plastic",
    "bottle",
    "bag",
    "wrapper",
    "cup",
    "container",
    "straw",
    "styrofoam",
    "glass",
    "wine glass",
    "jar",
    "glass bottle",
    "metal",
    "can",
    "tin",
    "aluminum",
    "steel",
    "paper",
    "cardboard",
    "carton",
    "newspaper",
    "box",
    ...ORGANIC_KEYWORDS,
  ],
  NO_WASTE: [],
};

const CATEGORY_MATCH_ORDER: WasteCategory[] = [
  "WITH_WASTE",
];

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

function mapLabelToWasteType(label: string): WasteType | null {
  return WASTE_LABEL_MAP[label] ?? null;
}

function toSeverity(totalItems: number): WasteSeverity {
  if (totalItems >= 7) return "high";
  if (totalItems >= 3) return "medium";
  return "low";
}

function toBbox(detection: DetectionBox): number[] {
  const x1 = detection.x;
  const y1 = detection.y;
  const x2 = detection.x + detection.width;
  const y2 = detection.y + detection.height;

  return [x1, y1, x2, y2].map((value) => Math.round(value));
}

function buildWasteDetections(detections: DetectionBox[]): WasteDetection[] {
  return detections
    .map((detection) => {
      const type = mapLabelToWasteType(detection.className);
      if (!type) return null;

      return {
        type,
        confidence: Number(detection.confidence.toFixed(4)),
        bbox: toBbox(detection),
      };
    })
    .filter((item): item is WasteDetection => item !== null);
}

function getDominantWaste(detections: WasteDetection[]): WasteType | null {
  if (detections.length === 0) return null;

  const counts = new Map<WasteType, { count: number; maxConfidence: number }>();

  for (const detection of detections) {
    const current = counts.get(detection.type) ?? {
      count: 0,
      maxConfidence: 0,
    };
    counts.set(detection.type, {
      count: current.count + 1,
      maxConfidence: Math.max(current.maxConfidence, detection.confidence),
    });
  }

  let dominant: WasteType | null = null;
  let bestCount = -1;
  let bestConfidence = -1;

  for (const [type, stats] of counts.entries()) {
    if (
      stats.count > bestCount ||
      (stats.count === bestCount && stats.maxConfidence > bestConfidence)
    ) {
      dominant = type;
      bestCount = stats.count;
      bestConfidence = stats.maxConfidence;
    }
  }

  return dominant;
}

export function inferWasteCategory(
  labels: string[],
  dominantWaste?: WasteType | null,
): WasteCategory {
  if (dominantWaste) {
    return "WITH_WASTE";
  }

  const keywords = CATEGORY_KEYWORDS.WITH_WASTE;
  if (labels.some((label) => labelMatches(label, keywords))) {
    return "WITH_WASTE";
  }

  return "NO_WASTE";
}

export function classifyYoloPayload(payload: unknown): ClassificationResult {
  const detections = pickArray(payload)
    .map(parseDetection)
    .filter((item): item is DetectionBox => !!item)
    .sort((a, b) => b.confidence - a.confidence);

  const labels = Array.from(
    new Set(detections.map((detection) => detection.className)),
  );
  const wasteDetections = buildWasteDetections(detections);
  const dominantWaste = getDominantWaste(wasteDetections);
  const totalItems = wasteDetections.length;
  const severity = toSeverity(totalItems);
  const wasteCategory = inferWasteCategory(labels, dominantWaste);
  const topConfidence =
    detections.length > 0 ? Number(detections[0].confidence.toFixed(4)) : 0;
  const detectedObject =
    detections.length > 0 ? detections[0].className : "unknown";

  return {
    detectedObject,
    dominantWaste,
    totalItems,
    severity,
    wasteCategory,
    confidence: topConfidence,
    labels,
    detections,
    wasteDetections,
  };
}
