"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useAuth } from "@/providers/AuthProvider";
import { useCreateReport, useUploadReportImages } from "@/hooks/useReports";
import { WASTE_CATEGORY_LABELS, WasteCategory } from "@/types";
import { getApiErrorMessage } from "@/lib/apiError";
import { DetectionBox } from "@/lib/waste-classification";
import DetectionImageOverlay from "@/components/ai/DetectionImageOverlay";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertCircle,
  Camera,
  CheckCircle2,
  ImagePlus,
  Loader2,
  MapPin,
  Sparkles,
  Upload,
} from "lucide-react";

const LocationPickerMap = dynamic(
  () => import("@/components/map/LocationPicker"),
  { ssr: false },
);

const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_IMAGE_SIZE_BYTES = 8 * 1024 * 1024;

type AnalyzeWasteResult = {
  detectedObject: string;
  wasteType: "Recyclable" | "Non-recyclable" | "Organic";
  confidence: number;
  status: "DIRTY" | "CLEAN";
  wasteCount: number;
  count: number;
  topConfidence: number | null;
  decision: {
    isUncertain: boolean;
    message: string | null;
    retakeRecommended: boolean;
    captureTips: string[];
  };
  labels: string[];
  detections: DetectionBox[];
};

const ANALYSIS_TYPE_STYLES: Record<AnalyzeWasteResult["wasteType"], string> = {
  Recyclable: "bg-green-100 text-green-700 border-green-200",
  Organic: "bg-amber-100 text-amber-700 border-amber-200",
  "Non-recyclable": "bg-red-100 text-red-700 border-red-200",
};

function mapAnalysisTypeToCategory(
  wasteType: AnalyzeWasteResult["wasteType"],
): WasteCategory {
  if (wasteType === "Recyclable") return "RECYCLABLE";
  if (wasteType === "Organic") return "ORGANIC";
  return "OTHER";
}

function buildDefaultDescription(category: WasteCategory) {
  return `Waste report submitted via mobile capture. Category: ${WASTE_CATEGORY_LABELS[category]}.`;
}

function geolocationErrorMessage(code: number) {
  if (code === 1)
    return "Location permission denied. Allow location access to continue.";
  if (code === 2) return "Could not determine your location. Please try again.";
  if (code === 3) return "Location request timed out. Please try again.";
  return "Unable to retrieve location.";
}

function toNonNegativeInt(value: unknown, fallback = 0) {
  if (typeof value === "number" && Number.isFinite(value) && value >= 0) {
    return Math.trunc(value);
  }

  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number(value);
    if (Number.isFinite(parsed) && parsed >= 0) {
      return Math.trunc(parsed);
    }
  }

  return fallback;
}

function normalizeDecisionStatus(value: unknown): "DIRTY" | "CLEAN" {
  if (typeof value !== "string") {
    return "CLEAN";
  }

  return value.trim().toUpperCase() === "DIRTY" ? "DIRTY" : "CLEAN";
}

function toFiniteNumberOrNull(value: unknown): number | null {
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

function toBoolean(value: unknown, fallback = false): boolean {
  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (normalized === "true") return true;
    if (normalized === "false") return false;
  }

  return fallback;
}

async function requestAnalyzeWaste(
  formData: FormData,
  token: string,
): Promise<any> {
  const endpoints = ["/web/api/analyze-waste", "/api/analyze-waste"];
  let lastErrorMessage = "Failed to analyze image.";

  for (const endpoint of endpoints) {
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      const payload = await response.json().catch(() => ({}));
      if (response.ok) {
        return payload;
      }

      lastErrorMessage =
        payload?.message || payload?.error || "Failed to analyze image.";

      // On this monorepo Vercel deployment, /api may resolve to backend first.
      if (response.status !== 404) {
        throw new Error(lastErrorMessage);
      }
    } catch (error) {
      lastErrorMessage =
        error instanceof Error ? error.message : "Failed to analyze image.";
    }
  }

  throw new Error(lastErrorMessage);
}

export default function SubmitReportPage() {
  const router = useRouter();
  const { token } = useAuth();

  const createReport = useCreateReport();
  const uploadImages = useUploadReportImages();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(
    null,
  );
  const [locationConfirmed, setLocationConfirmed] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<WasteCategory | "">(
    "",
  );
  const [description, setDescription] = useState("");

  const [isLocating, setIsLocating] = useState(false);
  const [locationError, setLocationError] = useState("");
  const [locationStatus, setLocationStatus] = useState("");

  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] =
    useState<AnalyzeWasteResult | null>(null);
  const [analysisError, setAnalysisError] = useState("");
  const [decisionMessage, setDecisionMessage] = useState("");

  const [fileError, setFileError] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const canSubmit = useMemo(
    () =>
      !!imageFile &&
      !!location &&
      locationConfirmed &&
      selectedCategory !== "" &&
      !isSubmitting,
    [imageFile, location, locationConfirmed, selectedCategory, isSubmitting],
  );

  useEffect(() => {
    return () => {
      if (imagePreview) {
        URL.revokeObjectURL(imagePreview);
      }
    };
  }, [imagePreview]);

  const requestCurrentLocation = () => {
    setIsLocating(true);
    setLocationError("");
    setLocationStatus("Getting your current location...");

    if (!navigator.geolocation) {
      setLocationError("Geolocation is not supported by this browser.");
      setLocationStatus("");
      setIsLocating(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const nextLocation = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };

        setLocation(nextLocation);
        setLocationConfirmed(false);
        setLocationStatus(
          "Location detected. Confirm or adjust the pin on the map.",
        );
        setIsLocating(false);
      },
      (error) => {
        setLocationError(geolocationErrorMessage(error.code));
        setLocationStatus("");
        setIsLocating(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 12000,
      },
    );
  };

  const selectImage = (file: File | null) => {
    if (!file) return;

    if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
      setFileError("Only JPG, PNG, and WEBP images are allowed.");
      return;
    }

    if (file.size > MAX_IMAGE_SIZE_BYTES) {
      setFileError("Image must be 8MB or smaller.");
      return;
    }

    setFileError("");
    setSubmitError("");
    setAnalysisError("");
    setDecisionMessage("");
    setAnalysisResult(null);

    if (imagePreview) {
      URL.revokeObjectURL(imagePreview);
    }

    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
    requestCurrentLocation();
  };

  const handleFileInput = (event: React.ChangeEvent<HTMLInputElement>) => {
    selectImage(event.target.files?.[0] ?? null);
    event.target.value = "";
  };

  const openCameraPicker = () => {
    if (!cameraInputRef.current) return;
    cameraInputRef.current.setAttribute("capture", "environment");
    cameraInputRef.current.click();
  };

  const analyzeWasteImage = async (): Promise<AnalyzeWasteResult> => {
    if (!imageFile) {
      throw new Error("Select an image first.");
    }

    if (!token) {
      throw new Error("Your session expired. Please log in again.");
    }

    const formData = new FormData();
    formData.append("image", imageFile);
    if (location) {
      formData.append("latitude", String(location.lat));
      formData.append("longitude", String(location.lng));
    }

    const payload = await requestAnalyzeWaste(formData, token);

    const status = normalizeDecisionStatus(payload?.status);
    const wasteCount = toNonNegativeInt(payload?.waste_count);
    const count = toNonNegativeInt(
      payload?.count,
      Array.isArray(payload?.detections) ? payload.detections.length : 0,
    );
    const topConfidence = toFiniteNumberOrNull(payload?.top_confidence);

    const decisionPayload = payload?.decision ?? {};
    const isUncertain = toBoolean(decisionPayload?.is_uncertain, false);
    const retakeRecommended = toBoolean(
      decisionPayload?.retake_recommended,
      isUncertain,
    );
    const decisionMessage =
      typeof decisionPayload?.message === "string" &&
      decisionPayload.message.trim().length > 0
        ? decisionPayload.message.trim()
        : null;
    const captureTips = Array.isArray(decisionPayload?.capture_tips)
      ? decisionPayload.capture_tips.filter(
          (tip: unknown): tip is string => typeof tip === "string",
        )
      : [];

    return {
      detectedObject:
        typeof payload?.detectedObject === "string"
          ? payload.detectedObject
          : "unknown",
      wasteType:
        payload?.wasteType === "Recyclable" ||
        payload?.wasteType === "Organic" ||
        payload?.wasteType === "Non-recyclable"
          ? payload.wasteType
          : "Non-recyclable",
      confidence:
        typeof payload?.confidence === "number" &&
        Number.isFinite(payload.confidence)
          ? payload.confidence
          : 0,
      status,
      wasteCount,
      count,
      topConfidence,
      decision: {
        isUncertain,
        message: decisionMessage,
        retakeRecommended,
        captureTips,
      },
      labels: Array.isArray(payload?.labels) ? payload.labels : [],
      detections: Array.isArray(payload?.detections) ? payload.detections : [],
    };
  };

  const handleAnalyzeWaste = async () => {
    setIsAnalyzing(true);
    setAnalysisError("");
    setDecisionMessage("");

    try {
      const result = await analyzeWasteImage();

      setAnalysisResult(result);
      setSelectedCategory(mapAnalysisTypeToCategory(result.wasteType));
      if (result.decision.retakeRecommended) {
        setDecisionMessage(
          result.decision.message ||
            "Uncertain classification. Please retake the image for better accuracy.",
        );
      } else if (result.status === "CLEAN") {
        setDecisionMessage("No waste detected. Report not saved.");
      } else {
        setDecisionMessage(
          `Waste detected (${result.wasteCount}). Ready to submit.`,
        );
      }
    } catch (error) {
      setAnalysisResult(null);
      setAnalysisError(
        error instanceof Error ? error.message : "Failed to analyze image.",
      );
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!token) {
      setSubmitError("You need to log in before submitting a report.");
      router.push("/login");
      return;
    }

    if (!imageFile) {
      setSubmitError("Please add a photo before submitting.");
      return;
    }
    if (!location) {
      setSubmitError("Location is required.");
      return;
    }
    if (!locationConfirmed) {
      setSubmitError("Please confirm your pin location on the map.");
      return;
    }
    if (!selectedCategory) {
      setSubmitError("Please select a waste type.");
      return;
    }

    const trimmedDescription = description.trim();
    if (trimmedDescription.length > 0 && trimmedDescription.length < 10) {
      setSubmitError(
        "Description must be at least 10 characters when provided.",
      );
      return;
    }

    setIsSubmitting(true);
    setSubmitError("");
    setDecisionMessage("");

    try {
      const latestAnalysis = await analyzeWasteImage();
      setAnalysisResult(latestAnalysis);
      setSelectedCategory(mapAnalysisTypeToCategory(latestAnalysis.wasteType));

      if (latestAnalysis.decision.retakeRecommended) {
        const message =
          latestAnalysis.decision.message ||
          "Uncertain classification. Please retake the image and try again.";
        setDecisionMessage(message);
        setSubmitError(message);
        return;
      }

      if (latestAnalysis.status === "CLEAN") {
        setDecisionMessage("No waste detected. Report not saved.");
        setSubmitError("No waste detected. Report not saved.");
        return;
      }

      const reportTitle = `Waste report - ${WASTE_CATEGORY_LABELS[selectedCategory]}`;
      const reportDescription =
        trimmedDescription.length > 0
          ? trimmedDescription
          : buildDefaultDescription(selectedCategory);

      const report = await createReport.mutateAsync({
        title: reportTitle,
        description: reportDescription,
        category: selectedCategory,
        latitude: location.lat,
        longitude: location.lng,
      });

      await uploadImages.mutateAsync({
        reportId: report.id,
        files: [imageFile],
        type: "REPORT",
      });

      router.push("/citizen/my-reports");
    } catch (error: any) {
      if (error?.response?.status === 401) {
        setSubmitError("Session expired. Please log in and try again.");
        router.push("/login");
        return;
      }

      setSubmitError(
        getApiErrorMessage(error, "Failed to submit report. Please try again."),
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-50 via-white to-emerald-50 pb-16">
      <div className="border-b bg-white/90 backdrop-blur px-4 py-4 sm:py-5">
        <div className="mx-auto max-w-3xl">
          <h1 className="text-2xl font-bold text-gray-900">
            Submit Waste Report
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Capture or upload one photo, confirm location on the map, then send
            the report.
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-3xl px-4 py-6 space-y-5">
        {!imageFile && (
          <section className="rounded-2xl border bg-white p-5 sm:p-6 shadow-sm space-y-4">
            <div className="flex items-center gap-2">
              <ImagePlus className="h-5 w-5 text-blue-600" />
              <h2 className="text-lg font-semibold text-gray-900">
                Start With a Photo
              </h2>
            </div>
            <p className="text-sm text-gray-500">
              Choose how you want to add your waste image.
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              <Button
                type="button"
                className="h-12 gap-2"
                onClick={openCameraPicker}
              >
                <Camera className="h-4 w-4" /> Take a Photo
              </Button>
              <Button
                type="button"
                variant="outline"
                className="h-12 gap-2"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="h-4 w-4" /> Upload Image
              </Button>
            </div>
            <p className="text-xs text-gray-400">
              Supported: JPG, PNG, WEBP up to 8MB
            </p>
          </section>
        )}

        {imageFile && (
          <form onSubmit={handleSubmit} className="space-y-5">
            <section className="rounded-2xl border bg-white p-4 sm:p-6 shadow-sm space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Camera className="h-5 w-5 text-blue-600" />
                  <h2 className="text-lg font-semibold text-gray-900">
                    Image Preview
                  </h2>
                </div>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={openCameraPicker}
                    className="gap-2"
                  >
                    <Camera className="h-4 w-4" /> Retake
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    className="gap-2"
                  >
                    <Upload className="h-4 w-4" /> Replace
                  </Button>
                </div>
              </div>
              {imagePreview && (
                <DetectionImageOverlay
                  imageSrc={imagePreview}
                  alt="Selected waste"
                  detections={analysisResult?.detections || []}
                  imageClassName="w-full h-auto max-h-[28rem] object-contain bg-gray-50"
                />
              )}
            </section>

            <section className="rounded-2xl border bg-white p-4 sm:p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <MapPin className="h-5 w-5 text-blue-600" />
                  <h2 className="text-lg font-semibold text-gray-900">
                    Location
                  </h2>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={requestCurrentLocation}
                  disabled={isLocating}
                >
                  {isLocating ? (
                    <span className="inline-flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" /> Detecting...
                    </span>
                  ) : (
                    "Detect Again"
                  )}
                </Button>
              </div>

              {locationStatus && (
                <p className="rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 text-sm text-blue-700">
                  {locationStatus}
                </p>
              )}

              {locationError && (
                <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  <AlertCircle className="h-4 w-4" /> {locationError}
                </div>
              )}

              <div className="rounded-xl overflow-hidden border border-gray-200">
                <LocationPickerMap
                  value={location}
                  onChange={(nextLocation) => {
                    setLocation(nextLocation);
                    setLocationConfirmed(false);
                    setLocationError("");
                  }}
                />
              </div>

              {location && (
                <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2">
                  <p className="text-sm text-gray-600">
                    {location.lat.toFixed(5)}, {location.lng.toFixed(5)}
                  </p>
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => setLocationConfirmed(true)}
                    className="gap-1"
                  >
                    <CheckCircle2 className="h-4 w-4" /> Confirm Location
                  </Button>
                </div>
              )}
            </section>

            <section className="rounded-2xl border bg-white p-4 sm:p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-lg font-semibold text-gray-900">
                  Report Details
                </h2>
                <Button
                  type="button"
                  variant="outline"
                  className="gap-2"
                  onClick={handleAnalyzeWaste}
                  disabled={isAnalyzing || !imageFile}
                >
                  {isAnalyzing ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" /> Analyzing...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4" /> Analyze Waste
                    </>
                  )}
                </Button>
              </div>

              {analysisError && (
                <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  <AlertCircle className="h-4 w-4" /> {analysisError}
                </div>
              )}

              {analysisResult && (
                <div className="rounded-lg border border-emerald-200 bg-emerald-50/50 p-3 space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
                    AI Suggestion
                  </p>
                  <div className="flex items-center gap-2 text-xs text-emerald-800">
                    <span
                      className={`inline-flex rounded-full border px-2 py-0.5 font-semibold ${analysisResult.status === "DIRTY" ? "border-red-200 bg-red-100 text-red-700" : "border-emerald-200 bg-emerald-100 text-emerald-700"}`}
                    >
                      {analysisResult.status}
                    </span>
                    <span>
                      Waste objects: {analysisResult.wasteCount} /{" "}
                      {analysisResult.count}
                    </span>
                  </div>
                  <p className="text-sm text-gray-700 capitalize">
                    Detected object:{" "}
                    <strong>{analysisResult.detectedObject}</strong>
                  </p>
                  <div className="flex items-center gap-2 text-sm">
                    <span
                      className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-semibold ${ANALYSIS_TYPE_STYLES[analysisResult.wasteType]}`}
                    >
                      {analysisResult.wasteType}
                    </span>
                    <span className="text-gray-500">
                      Confidence: {(analysisResult.confidence * 100).toFixed(1)}
                      %
                    </span>
                    {analysisResult.topConfidence !== null && (
                      <span className="text-gray-500">
                        Top box:{" "}
                        {(analysisResult.topConfidence * 100).toFixed(1)}%
                      </span>
                    )}
                  </div>
                  {analysisResult.detections.length > 0 && (
                    <p className="text-xs text-emerald-700">
                      Bounding boxes: {analysisResult.detections.length}
                    </p>
                  )}
                  {analysisResult.decision.retakeRecommended &&
                    analysisResult.decision.captureTips.length > 0 && (
                      <p className="text-xs text-amber-700">
                        Tips: {analysisResult.decision.captureTips.join(" | ")}
                      </p>
                    )}
                </div>
              )}

              {decisionMessage && (
                <p
                  className={`rounded-lg border px-3 py-2 text-sm ${analysisResult?.decision?.retakeRecommended ? "border-amber-300 bg-amber-50 text-amber-800" : analysisResult?.status === "DIRTY" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-amber-200 bg-amber-50 text-amber-700"}`}
                >
                  {decisionMessage}
                </p>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="waste-type">
                  Detected or Selected Waste Type
                </Label>
                <select
                  id="waste-type"
                  title="Select waste type"
                  className="w-full rounded-md border border-input px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-ring"
                  value={selectedCategory}
                  onChange={(event) =>
                    setSelectedCategory(event.target.value as WasteCategory)
                  }
                >
                  <option value="">Select waste type</option>
                  {Object.entries(WASTE_CATEGORY_LABELS).map(([key, value]) => (
                    <option key={key} value={key}>
                      {value}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="description">Description (optional)</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  placeholder="Add extra details about the waste condition or surroundings"
                  rows={4}
                />
                <p className="text-xs text-gray-400">
                  Leave empty to submit with an auto-generated description.
                </p>
              </div>
            </section>

            {fileError && (
              <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                <AlertCircle className="h-4 w-4" /> {fileError}
              </div>
            )}

            {submitError && (
              <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                <AlertCircle className="h-4 w-4" /> {submitError}
              </div>
            )}

            <Button
              type="submit"
              disabled={!canSubmit}
              className="w-full h-12 text-base font-semibold gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Saving Report...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4" /> Submit Report
                </>
              )}
            </Button>
          </form>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          title="Upload waste image"
          className="hidden"
          onChange={handleFileInput}
        />

        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          title="Capture waste image"
          className="hidden"
          onChange={handleFileInput}
        />
      </div>
    </div>
  );
}
