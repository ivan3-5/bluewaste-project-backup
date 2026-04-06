## YOLO Waste Analyzer Enhancement Plan (Execution Ready)

### 1) Objective

Improve waste detection and classification accuracy in real-world conditions while keeping inference fast enough for mobile and FastAPI usage.

### 2) Scope

- Detection task: object detection with bounding boxes and class labels.
- Initial classes: plastic, glass, metal, paper, organic, other.
- Deployment targets: API inference (FastAPI) and mobile inference path.

### 3) Success Criteria (Must Meet)

- mAP@50 >= 0.85 on held-out real-world test set.
- mAP@50-95 >= 0.60 on held-out real-world test set.
- Per-class recall >= 0.80 for plastic, glass, metal, paper, and organic.
- Duplicate detections reduced by >= 30% versus current baseline after NMS tuning.
- Low-confidence fallback rate <= 12% in normal lighting and <= 20% in dim lighting.
- API latency target: p95 <= 150 ms per image on target deployment hardware.
- Mobile latency target: p95 <= 250 ms per image on target device profile.

### 4) Model Version and Reproducibility

- Preferred model family: Ultralytics YOLO11 (start with `yolo11s`, compare with `yolo11m`).
- Pin core dependencies for reproducibility:
  - `ultralytics` exact version
  - `torch` and `torchvision` exact versions
  - CUDA toolkit version (if GPU training)
- Save and version:
  - training config
  - dataset manifest version
  - class map
  - checkpoint artifacts

### 5) Dataset Requirements

#### 5.1 Dataset Size and Balance

- Minimum 2,000 labeled images to start; target 5,000+ images.
- Minimum 300 instances per class.
- No class should exceed 2.5x the instance count of the smallest major class.

#### 5.2 Diversity Requirements

Each class must include samples across:

- Lighting: bright daylight, overcast, dim indoor, night/street-light.
- Distance: close-up, medium, far.
- Angle: top-down, side, oblique.
- Background: street, household, mixed clutter, landfill-like scenes.
- Device variance: different phone cameras and resolutions.

#### 5.3 Data Split Policy

- Train/val/test split: 70/15/15.
- Split by scene/session, not random frame-level split, to prevent leakage.
- Keep test set fixed across experiments for fair comparison.

### 6) Annotation and Label Quality Protocol

- Create a strict label guide with class definitions and borderline examples.
- Define confusion rules for known difficult pairs (for example plastic bottle vs clear glass bottle).
- Use tight bounding boxes that include full object extent without large background padding.
- Label QA process:
  - 10% of new annotations must be double-reviewed.
  - Resolve disagreements before training.
  - Reject annotation batches with >3% critical label errors.

### 7) Training and Augmentation Strategy

#### 7.1 Preprocessing

- Resize to model input size (start with 640, evaluate 768 if needed).
- Normalize pixel values according to model defaults.
- Enforce RGB consistency end-to-end.
- Validate EXIF orientation correction before training.

#### 7.2 Augmentation (Train Only)

- Rotation: +/- 15 degrees.
- Horizontal flip: 0.5 probability.
- Vertical flip: 0.1 probability (only if physically plausible).
- Brightness/contrast jitter: +/- 25%.
- Hue/saturation jitter: mild ranges to avoid unrealistic color drift.
- Gaussian noise: low to moderate.
- Blur: light blur for motion/defocus simulation.
- Mosaic/mixup: enabled with conservative settings; reduce if label noise increases.

#### 7.3 Training Plan

- Baseline run: `yolo11s` with default hyperparameters.
- Tuning runs:
  - image size: 640 vs 768
  - epochs: 80 to 150 with early stopping
  - batch size: maximize GPU utilization without instability
  - learning rate and weight decay sweep
- Compare at least 6 experiment runs and select best by validation metrics and latency.

### 8) Threshold and NMS Calibration

- Do not hardcode confidence threshold globally at start.
- Run threshold sweep on validation set: 0.40 to 0.85 (step 0.05).
- Choose operating point maximizing F1 while meeting precision floor >= 0.85.
- Tune NMS IoU threshold in range 0.45 to 0.75 to reduce duplicates.
- Consider class-aware thresholds if one global threshold underperforms for key classes.

### 9) Low-Confidence Fallback Behavior

- If top prediction confidence is below calibrated threshold:
  - return status: `uncertain`
  - return message: `Uncertain classification, please retake image with better lighting and focus.`
  - include capture tips: move closer, avoid blur, center object.
- Log uncertain events for retraining review.

### 10) Inference Optimization

#### 10.1 FastAPI Path

- Export best model to ONNX or TensorRT where available.
- Use batch size 1 optimization for real-time single-image requests.
- Warm up model on startup to avoid first-request latency spikes.

#### 10.2 Mobile Path

- Evaluate quantized export format supported by mobile stack.
- Prefer smaller model variant (`yolo11n` or quantized `yolo11s`) if latency target is missed.
- Keep preprocessing identical to training/inference server path.

### 11) Monitoring and Continuous Improvement

- Log per prediction:
  - timestamp
  - model version
  - device type
  - predicted class and confidence
  - fallback triggered or not
  - optional user-confirmed true class (if available)
- Build weekly confusion matrix and error report.
- Retraining trigger conditions:
  - per-class recall drops below 0.75
  - fallback rate increases by >20% week-over-week
  - drift detected from new environment conditions

### 12) Evaluation Artifacts per Release

- Metrics report: mAP, precision, recall, per-class PR curves.
- Confusion matrix image and top failure examples.
- Latency benchmark report for API and mobile.
- Chosen threshold and NMS rationale.
- Rollback-ready previous model artifact.

### 13) Delivery Milestones

- Week 1: dataset audit, label guide finalization, baseline training.
- Week 2: augmentation and hyperparameter tuning, threshold and NMS calibration.
- Week 3: inference optimization, integration tests in FastAPI and mobile.
- Week 4: pilot rollout, monitoring dashboard, retraining backlog creation.

### Goal

Achieve high-accuracy, real-time waste detection that performs reliably in real-world user conditions, with measurable quality gates and continuous improvement loops.
