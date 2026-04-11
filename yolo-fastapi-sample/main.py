from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
import base64
import os
from threading import Lock
from time import perf_counter
from typing import Any, Literal, Optional

app = FastAPI(title="BlueWaste YOLO API", version="1.0.0")

# Restrict this in production to your Vercel domain.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

_model: Optional[Any] = None
_model_lock = Lock()

# Default classes include common COCO and custom-trained waste labels.
_DEFAULT_WASTE_CLASSES = {
    "bottle",
    "cup",
    "wine glass",
    "bowl",
    "plastic",
    "glass",
    "metal",
    "paper",
    "organic",
    "other",
}

# Optional env override: WASTE_CLASSES="plastic,glass,metal,paper,organic,other"
_waste_classes_env = os.getenv("WASTE_CLASSES", "").strip()
WASTE_CLASSES = (
    {
        item.strip().lower()
        for item in _waste_classes_env.split(",")
        if item.strip()
    }
    if _waste_classes_env
    else _DEFAULT_WASTE_CLASSES
)

WASTE_CONFIDENCE_THRESHOLD = 0.2
# Fallback threshold to recover transparent/low-contrast detections.
WASTE_FALLBACK_CONFIDENCE_THRESHOLD = 0.08
WASTE_NMS_IOU_THRESHOLD = 0.55
WASTE_MERGE_IOU_THRESHOLD = 0.65
# Low-confidence predictions trigger a retake recommendation.
LOW_CONFIDENCE_FALLBACK_THRESHOLD = 0.18
# Filter tiny boxes that are typically background noise in low-threshold pass.
MIN_NORMALIZED_BOX_AREA = 0.0015
# Set to 2 for stricter DIRTY classification.
DIRTY_MIN_WASTE_COUNT = 1
MODEL_NAME = "yolov8n.pt"
MODEL_VERSION = "ultralytics-8.3.2"


class BoundingBox(BaseModel):
    x: float
    y: float
    width: float
    height: float
    normalized: bool = True


class Detection(BaseModel):
    class_name: str = Field(serialization_alias="class")
    confidence: float
    bbox: BoundingBox
    is_waste: bool = True


class Decision(BaseModel):
    is_uncertain: bool
    reason: Optional[Literal["low_confidence"]] = None
    message: Optional[str] = None
    retake_recommended: bool
    capture_tips: list[str] = Field(default_factory=list)


class Thresholds(BaseModel):
    model_confidence: float
    decision_confidence: float
    nms_iou: float


class ModelInfo(BaseModel):
    name: str
    version: str


class PredictResponse(BaseModel):
    detections: list[Detection]
    labels: list[str] = Field(default_factory=list)
    count: int
    waste_count: int
    status: Literal["CLEAN", "DIRTY"]
    top_confidence: Optional[float] = None
    inference_ms: float
    annotated_image_base64: Optional[str] = None
    annotated_image_mime: Optional[str] = None
    decision: Decision
    thresholds: Thresholds
    model: ModelInfo


def _normalize_label(value: Any) -> str:
    return str(value).strip().lower()


def _get_waste_class_ids(model: Any) -> Optional[list[int]]:
    names = model.names
    if isinstance(names, list):
        label_map = {idx: label for idx, label in enumerate(names)}
    else:
        label_map = names

    class_ids = [
        int(class_idx)
        for class_idx, class_name in label_map.items()
        if _normalize_label(class_name) in WASTE_CLASSES
    ]

    # If class names don't match configured labels (for example after switching
    # to a custom model), run on all classes instead of hard-failing to empty.
    return class_ids if class_ids else None


def _to_xywh_normalized(xyxy, width: int, height: int):
    x1, y1, x2, y2 = xyxy
    box_width = max(0.0, x2 - x1)
    box_height = max(0.0, y2 - y1)
    return {
        "x": float(x1 / width),
        "y": float(y1 / height),
        "width": float(box_width / width),
        "height": float(box_height / height),
        "normalized": True,
    }


def _to_xyxy_pixels(bbox: BoundingBox, width: int, height: int):
    x1 = int(round(max(0.0, min(1.0, bbox.x)) * width))
    y1 = int(round(max(0.0, min(1.0, bbox.y)) * height))
    x2 = int(round(max(0.0, min(1.0, bbox.x + bbox.width)) * width))
    y2 = int(round(max(0.0, min(1.0, bbox.y + bbox.height)) * height))

    x1 = max(0, min(width - 1, x1))
    y1 = max(0, min(height - 1, y1))
    x2 = max(0, min(width - 1, max(x2, x1 + 1)))
    y2 = max(0, min(height - 1, max(y2, y1 + 1)))
    return x1, y1, x2, y2


def _confidence_color(confidence: float):
    if confidence >= 0.6:
        return (46, 204, 113)  # green
    if confidence >= 0.3:
        return (0, 215, 255)  # amber
    return (64, 64, 255)  # red


def _encode_annotated_image(frame: Any, detections: list[Detection]) -> Optional[str]:
    import cv2

    annotated = frame.copy()
    h, w = annotated.shape[:2]
    font_scale = max(0.45, min(w, h) / 900.0)
    thickness = max(1, int(round(min(w, h) / 450)))

    for detection in detections:
        x1, y1, x2, y2 = _to_xyxy_pixels(detection.bbox, w, h)
        color = _confidence_color(detection.confidence)
        label = f"{detection.class_name} {detection.confidence * 100:.1f}%"

        cv2.rectangle(annotated, (x1, y1), (x2, y2), color, thickness)

        (text_w, text_h), baseline = cv2.getTextSize(
            label,
            cv2.FONT_HERSHEY_SIMPLEX,
            font_scale,
            thickness,
        )
        text_y1 = max(0, y1 - text_h - baseline - 6)
        text_y2 = min(h - 1, y1)
        text_x2 = min(w - 1, x1 + text_w + 8)
        cv2.rectangle(annotated, (x1, text_y1), (text_x2, text_y2), color, -1)
        cv2.putText(
            annotated,
            label,
            (x1 + 4, max(text_h + 2, y1 - baseline - 4)),
            cv2.FONT_HERSHEY_SIMPLEX,
            font_scale,
            (0, 0, 0),
            thickness,
            cv2.LINE_AA,
        )

    ok, encoded = cv2.imencode(
        ".jpg",
        annotated,
        [int(cv2.IMWRITE_JPEG_QUALITY), 82],
    )
    if not ok:
        return None

    return base64.b64encode(encoded.tobytes()).decode("ascii")


def _extract_labels(detections: list[Detection]) -> list[str]:
    labels: list[str] = []
    seen = set()
    for detection in detections:
        label = detection.class_name.strip().lower()
        if not label or label in seen:
            continue
        seen.add(label)
        labels.append(label)
    return labels


def _bbox_area(box: BoundingBox) -> float:
    return box.width * box.height


def _bbox_iou(a: BoundingBox, b: BoundingBox) -> float:
    ax1, ay1, ax2, ay2 = a.x, a.y, a.x + a.width, a.y + a.height
    bx1, by1, bx2, by2 = b.x, b.y, b.x + b.width, b.y + b.height

    inter_x1 = max(ax1, bx1)
    inter_y1 = max(ay1, by1)
    inter_x2 = min(ax2, bx2)
    inter_y2 = min(ay2, by2)

    inter_w = max(0.0, inter_x2 - inter_x1)
    inter_h = max(0.0, inter_y2 - inter_y1)
    inter_area = inter_w * inter_h
    if inter_area <= 0:
        return 0.0

    union_area = _bbox_area(a) + _bbox_area(b) - inter_area
    if union_area <= 0:
        return 0.0

    return inter_area / union_area


def _merge_detections(primary: list[Detection], fallback: list[Detection]) -> list[Detection]:
    merged = list(primary)

    for cand in sorted(fallback, key=lambda d: d.confidence, reverse=True):
        merged_idx = None
        for idx, existing in enumerate(merged):
            if existing.class_name != cand.class_name:
                continue
            if _bbox_iou(existing.bbox, cand.bbox) >= WASTE_MERGE_IOU_THRESHOLD:
                merged_idx = idx
                break

        if merged_idx is None:
            merged.append(cand)
            continue

        if cand.confidence > merged[merged_idx].confidence:
            merged[merged_idx] = cand

    return sorted(merged, key=lambda d: d.confidence, reverse=True)


def _enhance_low_light_frame(frame: Any) -> Any:
    import cv2

    lab = cv2.cvtColor(frame, cv2.COLOR_BGR2LAB)
    l_channel, a_channel, b_channel = cv2.split(lab)
    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
    l_enhanced = clahe.apply(l_channel)
    enhanced_lab = cv2.merge((l_enhanced, a_channel, b_channel))
    return cv2.cvtColor(enhanced_lab, cv2.COLOR_LAB2BGR)


def _decode_uploaded_image(data: bytes) -> Any:
    import cv2
    import io
    import numpy as np
    from PIL import Image, ImageOps

    with Image.open(io.BytesIO(data)) as pil_image:
        pil_image = ImageOps.exif_transpose(pil_image).convert("RGB")
        rgb = np.array(pil_image)

    return cv2.cvtColor(rgb, cv2.COLOR_RGB2BGR)


def _run_waste_detection(
    model: Any,
    frame: Any,
    width: int,
    height: int,
    waste_class_ids: Optional[list[int]],
    confidence_threshold: float,
) -> list[Detection]:
    predict_kwargs = dict(
        source=frame,
        conf=confidence_threshold,
        iou=WASTE_NMS_IOU_THRESHOLD,
        verbose=False,
    )
    if waste_class_ids is not None:
        predict_kwargs["classes"] = waste_class_ids

    results = model.predict(**predict_kwargs)

    detections: list[Detection] = []
    if len(results) == 0:
        return detections

    r = results[0]
    names = r.names

    for box in r.boxes:
        cls_idx = int(box.cls.item())
        if isinstance(names, list):
            class_name = names[cls_idx] if cls_idx < len(names) else str(cls_idx)
        else:
            class_name = names.get(cls_idx, str(cls_idx))

        confidence = float(box.conf.item())
        x1, y1, x2, y2 = box.xyxy[0].tolist()
        bbox = _to_xywh_normalized((x1, y1, x2, y2), width, height)

        if (bbox["width"] * bbox["height"]) < MIN_NORMALIZED_BOX_AREA:
            continue

        detections.append(
            Detection(
                class_name=class_name,
                confidence=confidence,
                bbox=BoundingBox(**bbox),
                is_waste=True,
            )
        )

    return detections


def _get_model() -> Any:
    global _model
    if _model is None:
        with _model_lock:
            if _model is None:
                from ultralytics import YOLO

                _model = YOLO(MODEL_NAME)
    return _model


@app.get("/health")
async def health():
    return {"status": "ok", "model_loaded": _model is not None}


async def _predict_core(
    image: UploadFile,
    include_annotated: bool,
) -> PredictResponse:
    try:
        started = perf_counter()

        if image.content_type not in {"image/jpeg", "image/png", "image/webp"}:
            raise HTTPException(status_code=400, detail="Unsupported image type")

        data = await image.read()
        try:
            frame = _decode_uploaded_image(data)
        except Exception:
            raise HTTPException(status_code=400, detail="Invalid image")

        if frame is None:
            raise HTTPException(status_code=400, detail="Invalid image")

        height, width = frame.shape[:2]
        model = _get_model()
        waste_class_ids = _get_waste_class_ids(model)

        active_confidence_threshold = WASTE_CONFIDENCE_THRESHOLD
        primary_detections = _run_waste_detection(
            model,
            frame,
            width,
            height,
            waste_class_ids,
            WASTE_CONFIDENCE_THRESHOLD,
        )

        top_primary_confidence = max(
            (d.confidence for d in primary_detections),
            default=None,
        )
        should_run_fallback = (
            top_primary_confidence is None
            or top_primary_confidence < LOW_CONFIDENCE_FALLBACK_THRESHOLD
        )

        detections = primary_detections

        # Retry on low confidence/empty result with enhanced frame + lower threshold.
        if should_run_fallback:
            fallback_frame = _enhance_low_light_frame(frame)
            fallback_detections = _run_waste_detection(
                model,
                fallback_frame,
                width,
                height,
                waste_class_ids,
                WASTE_FALLBACK_CONFIDENCE_THRESHOLD,
            )

            detections = _merge_detections(primary_detections, fallback_detections)
            if fallback_detections:
                active_confidence_threshold = WASTE_FALLBACK_CONFIDENCE_THRESHOLD

        waste_count = len(detections)
        status = "DIRTY" if waste_count >= DIRTY_MIN_WASTE_COUNT else "CLEAN"
        top_confidence = max((d.confidence for d in detections), default=None)
        labels = _extract_labels(detections)

        annotated_image_base64 = (
            _encode_annotated_image(frame, detections) if include_annotated else None
        )
        inference_ms = round((perf_counter() - started) * 1000.0, 2)

        is_uncertain = (
            top_confidence is None
            or top_confidence < LOW_CONFIDENCE_FALLBACK_THRESHOLD
        )
        capture_tips = [
            "Move closer to the object",
            "Use better lighting",
            "Hold camera steady and avoid blur",
            "Center the object in frame",
        ]

        decision = Decision(
            is_uncertain=is_uncertain,
            reason="low_confidence" if is_uncertain else None,
            message=(
                "No clear waste object was detected. Please retake with better lighting and focus."
                if top_confidence is None
                else "Uncertain classification, please retake image with better lighting and focus."
                if is_uncertain
                else None
            ),
            retake_recommended=is_uncertain,
            capture_tips=capture_tips if is_uncertain else [],
        )

        return PredictResponse(
            detections=detections,
            labels=labels,
            count=len(detections),
            waste_count=waste_count,
            status=status,
            top_confidence=top_confidence,
            inference_ms=inference_ms,
            annotated_image_base64=annotated_image_base64,
            annotated_image_mime="image/jpeg" if annotated_image_base64 else None,
            decision=decision,
            thresholds=Thresholds(
                model_confidence=active_confidence_threshold,
                decision_confidence=LOW_CONFIDENCE_FALLBACK_THRESHOLD,
                nms_iou=WASTE_NMS_IOU_THRESHOLD,
            ),
            model=ModelInfo(name=MODEL_NAME, version=MODEL_VERSION),
        )
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Prediction failed: {exc}")


@app.post("/predict", response_model=PredictResponse, response_model_by_alias=True)
async def predict(
    image: UploadFile = File(...),
    return_annotated: bool = Form(False),
):
    return await _predict_core(image=image, include_annotated=return_annotated)


@app.post("/predict-annotated", response_model=PredictResponse, response_model_by_alias=True)
async def predict_annotated(image: UploadFile = File(...)):
    return await _predict_core(image=image, include_annotated=True)
