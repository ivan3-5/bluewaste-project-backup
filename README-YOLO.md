# BlueWaste YOLO Migration Guide

## Overview

BlueWaste previously used Google Vision label detection for waste recognition. It has now been migrated to a custom YOLO inference API hosted on Railway.

Why YOLO:

- Better control over model behavior and classes.
- Easier cost predictability for sustained usage.
- Flexibility to fine-tune for local waste datasets.

Current architecture:

- Next.js (Vercel) handles UI and API proxy route.
- YOLO FastAPI service (Railway) performs object detection.
- Existing BlueWaste backend stores uploaded images and waste report metadata.

## Before and After Changes

### Before

- Detection route in web app called Google Vision endpoint directly.
- Required GOOGLE_CLOUD_VISION_API_KEY.
- Class mapping based on labelAnnotations.

### After

- Detection route calls YOLO API URL via YOLO_API_URL.
- Google Vision key removed from runtime path.
- Detection mapping now uses YOLO detection objects with optional bounding boxes.

Updated files:

- web/src/app/api/analyze-waste/route.ts
- web/src/lib/waste-classification.ts
- web/src/app/citizen/report/page.tsx
- web/src/app/report-waste/page.tsx
- web/src/components/ai/DetectionImageOverlay.tsx
- web/.env.local

## Backend Setup (YOLO + FastAPI)

Sample files are included in yolo-fastapi-sample/.

### 1) Install dependencies

```bash
cd yolo-fastapi-sample
python -m venv .venv
# Windows PowerShell
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

### 2) Start API

```bash
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

### 3) API endpoint

- POST /predict
- Form-data field name: image
- Returns JSON with detections list.

Example response:

```json
{
  "detections": [
    {
      "class": "plastic bottle",
      "confidence": 0.92,
      "bbox": {
        "x": 0.18,
        "y": 0.21,
        "width": 0.34,
        "height": 0.52,
        "normalized": true
      },
      "is_waste": true
    }
  ],
  "count": 1,
  "waste_count": 1,
  "status": "DIRTY",
  "top_confidence": 0.92,
  "decision": {
    "is_uncertain": false,
    "reason": null,
    "message": null,
    "retake_recommended": false,
    "capture_tips": []
  },
  "thresholds": {
    "model_confidence": 0.2,
    "decision_confidence": 0.65,
    "nms_iou": 0.55
  },
  "model": {
    "name": "yolov8n.pt",
    "version": "ultralytics-8.3.2"
  }
}
```

Low-confidence fallback behavior:

- If detections exist but top confidence is below decision threshold, `decision.is_uncertain=true`.
- API returns `decision.message` with retake guidance.
- `status` remains available for compatibility with existing DIRTY/CLEAN handling.

## Training Templates Included

Added under yolo-fastapi-sample/:

- config/waste-dataset.yaml
- config/train-yolo11s.yaml
- experiment-tracker-template.csv

Quick start for training template:

```bash
cd yolo-fastapi-sample
yolo detect train model=yolo11s.pt data=config/waste-dataset.yaml cfg=config/train-yolo11s.yaml
```

## Deployment (Railway)

1. Push yolo-fastapi-sample to a GitHub repository.
2. Create a new Railway project from that repository.
3. Set Start Command:

```bash
uvicorn main:app --host 0.0.0.0 --port $PORT
```

4. Railway auto-assigns PORT.
5. Copy deployed URL, for example:

- https://your-railway-app.up.railway.app

6. Verify health:

- GET /health

## Frontend Integration (Next.js)

Set in web/.env.local:

```bash
NEXT_PUBLIC_API_URL=http://localhost:5000/api
YOLO_API_URL=https://your-railway-app.up.railway.app/predict
```

How it works:

1. User uploads image in web page.
2. Next.js API route /api/analyze-waste forwards image to YOLO API.
3. YOLO detections are mapped to BlueWaste categories.
4. Existing backend upload and waste report save continue.
5. UI displays detected object, confidence, and bounding boxes.

## Request and Response Flow

1. User selects image.
2. Frontend sends FormData to /api/analyze-waste.
3. Next.js route sends image to YOLO /predict.
4. Next.js normalizes detections and maps waste type.
5. Next.js uploads image to BlueWaste backend /upload.
6. Next.js saves report via /waste-reports.
7. Frontend shows AI result and overlay boxes.

## Testing Guide

### Local test

1. Start BlueWaste backend.
2. Start YOLO FastAPI API.
3. Start Next.js web app.
4. Open citizen report page and upload test images.
5. Verify:

- Detection text appears.
- Confidence updates.
- Bounding boxes render.
- Waste report is saved.

### Online test

1. Deploy YOLO API to Railway.
2. Deploy web app to Vercel with YOLO_API_URL configured.
3. Submit real image from report page.
4. Check saved waste report and confidence output.

## Troubleshooting

### CORS error from Railway API

- Add your Vercel domain to allow_origins in FastAPI.

### YOLO API not reachable

- Verify Railway URL and route path /predict.
- Confirm service is running and logs show startup success.

### No detections returned

- Lower confidence threshold in model.predict(conf=0.25).
- Validate image content and object visibility.

### File upload issues

- Ensure multipart/form-data field is named image.
- Verify max file limits in Next.js route and client.

## Future Improvements

- Fine-tune YOLO model with local Philippine waste dataset.
- Add confidence calibration and class-specific thresholds.
- Add async queue and retry for inference spikes.
- Persist detection boxes in backend for analytics heatmaps.
- Add model versioning and A/B testing across regions.

## Notes

- Google Vision integration has been removed from active detection flow.
- Existing historic data in BlueWaste remains unaffected.
