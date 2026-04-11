from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from threading import Lock
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

# Restrict inference to known waste-relevant COCO classes to avoid noisy labels
# like "teddy bear" on cluttered scenes.
WASTE_CLASSES = {"bottle", "cup", "wine glass", "bowl"}
WASTE_CONFIDENCE_THRESHOLD = 0.2
# Fallback threshold to recover transparent/low-contrast bottle detections.
WASTE_FALLBACK_CONFIDENCE_THRESHOLD = 0.08
WASTE_NMS_IOU_THRESHOLD = 0.55
# Low-confidence predictions trigger a retake recommendation.
LOW_CONFIDENCE_FALLBACK_THRESHOLD = 0.18
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
    count: int
    waste_count: int
    status: Literal["CLEAN", "DIRTY"]
    top_confidence: Optional[float] = None
    decision: Decision
    thresholds: Thresholds
    model: ModelInfo


def _normalize_label(value: Any) -> str:
    return str(value).strip().lower()


def _get_waste_class_ids(model: Any) -> list[int]:
    names = model.names
    if isinstance(names, list):
        label_map = {idx: label for idx, label in enumerate(names)}
    else:
        label_map = names

    return [
        int(class_idx)
        for class_idx, class_name in label_map.items()
        if _normalize_label(class_name) in WASTE_CLASSES
    ]


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


def _run_waste_detection(
    model: Any,
    frame: Any,
    width: int,
    height: int,
    waste_class_ids: list[int],
    confidence_threshold: float,
) -> list[Detection]:
    results = model.predict(
        source=frame,
        conf=confidence_threshold,
        iou=WASTE_NMS_IOU_THRESHOLD,
        classes=waste_class_ids,
        verbose=False,
    )

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


@app.post("/predict", response_model=PredictResponse, response_model_by_alias=True)
async def predict(image: UploadFile = File(...)):
    try:
        import cv2
        import numpy as np

        if image.content_type not in {"image/jpeg", "image/png", "image/webp"}:
            raise HTTPException(status_code=400, detail="Unsupported image type")

        data = await image.read()
        np_arr = np.frombuffer(data, np.uint8)
        frame = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)

        if frame is None:
            raise HTTPException(status_code=400, detail="Invalid image")

        height, width = frame.shape[:2]
        model = _get_model()
        waste_class_ids = _get_waste_class_ids(model)
        if not waste_class_ids:
            raise HTTPException(status_code=500, detail="No waste classes configured")

        active_confidence_threshold = WASTE_CONFIDENCE_THRESHOLD
        detections = _run_waste_detection(
            model,
            frame,
            width,
            height,
            waste_class_ids,
            WASTE_CONFIDENCE_THRESHOLD,
        )

        # Retry once at a lower threshold for transparent/low-contrast objects.
        if not detections:
            detections = _run_waste_detection(
                model,
                frame,
                width,
                height,
                waste_class_ids,
                WASTE_FALLBACK_CONFIDENCE_THRESHOLD,
            )
            if detections:
                active_confidence_threshold = WASTE_FALLBACK_CONFIDENCE_THRESHOLD

        waste_count = len(detections)
        status = "DIRTY" if waste_count >= DIRTY_MIN_WASTE_COUNT else "CLEAN"
        top_confidence = max((d.confidence for d in detections), default=None)

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
            count=len(detections),
            waste_count=waste_count,
            status=status,
            top_confidence=top_confidence,
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
