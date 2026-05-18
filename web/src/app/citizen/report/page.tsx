"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useAuth } from "@/providers/AuthProvider";
import { useCreateReport, useUploadReportImages } from "@/hooks/useReports";
import { useReportingZones, isPointInAnyZone } from "@/hooks/useReportingZones";
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
  const { data: reportingZones = [] } = useReportingZones(true);

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
  const [outsideZone, setOutsideZone] = useState(false);

  // Re-validate every time location or zones change
  useEffect(() => {
    if (!location || reportingZones.length === 0) {
      setOutsideZone(false);
      return;
    }
    setOutsideZone(
      !isPointInAnyZone(location.lat, location.lng, reportingZones),
    );
  }, [location, reportingZones]);

  const canSubmit = useMemo(
    () =>
      !!imageFile &&
      !!location &&
      locationConfirmed &&
      selectedCategory !== "" &&
      !isSubmitting &&
      !outsideZone,
    [
      imageFile,
      location,
      locationConfirmed,
      selectedCategory,
      isSubmitting,
      outsideZone,
    ],
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

    // Hard zone guard
    if (
      location &&
      reportingZones.length > 0 &&
      !isPointInAnyZone(location.lat, location.lng, reportingZones)
    ) {
      setSubmitError("You can only report within the designated coastal zone.");
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
    <div className="flex flex-col bg-gray-50 min-h-[calc(100vh-4rem)]">
      {/* ── Page header ── */}
      <div className="border-b bg-white px-4 py-4 shadow-sm">
        <div className="mx-auto max-w-6xl flex items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-gray-900">
              Submit Waste Report
            </h1>
            <p className="mt-0.5 text-xs text-gray-500 hidden sm:block">
              Photo · Confirm location · Submit
            </p>
          </div>

          {/* Step pills */}
          <div className="hidden sm:flex items-center gap-1.5 text-xs font-medium">
            <span
              className={`flex items-center gap-1 rounded-full px-2.5 py-1 border ${imageFile ? "bg-blue-600 text-white border-blue-600" : "bg-white text-gray-500 border-gray-200"}`}
            >
              {imageFile ? (
                <CheckCircle2 className="h-3 w-3" />
              ) : (
                <span className="h-3.5 w-3.5 rounded-full border border-current flex items-center justify-center text-[9px]">
                  1
                </span>
              )}
              Photo
            </span>
            <span className="text-gray-300">›</span>
            <span
              className={`flex items-center gap-1 rounded-full px-2.5 py-1 border ${locationConfirmed ? "bg-blue-600 text-white border-blue-600" : "bg-white text-gray-400 border-gray-200"}`}
            >
              {locationConfirmed ? (
                <CheckCircle2 className="h-3 w-3" />
              ) : (
                <span className="h-3.5 w-3.5 rounded-full border border-current flex items-center justify-center text-[9px]">
                  2
                </span>
              )}
              Location
            </span>
            <span className="text-gray-300">›</span>
            <span
              className={`flex items-center gap-1 rounded-full px-2.5 py-1 border ${canSubmit ? "bg-emerald-600 text-white border-emerald-600" : "bg-white text-gray-400 border-gray-200"}`}
            >
              <span className="h-3.5 w-3.5 rounded-full border border-current flex items-center justify-center text-[9px]">
                3
              </span>
              Submit
            </span>
          </div>
        </div>
      </div>

      {/* ── Hidden file inputs ── */}
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

      {/* ── No image: centered upload prompt ── */}
      {!imageFile && (
        <div className="flex flex-1 items-center justify-center p-6">
          <div className="w-full max-w-sm space-y-4 rounded-2xl border-2 border-dashed border-blue-200 bg-white p-8 text-center shadow-sm">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-blue-50">
              <ImagePlus className="h-7 w-7 text-blue-600" />
            </div>
            <div>
              <p className="text-base font-semibold text-gray-900">
                Add a waste photo
              </p>
              <p className="mt-1 text-xs text-gray-500">
                JPG, PNG or WEBP · max 8 MB
              </p>
            </div>
            <div className="flex flex-col gap-2">
              <Button className="gap-2" onClick={openCameraPicker}>
                <Camera className="h-4 w-4" /> Take a Photo
              </Button>
              <Button
                variant="outline"
                className="gap-2"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="h-4 w-4" /> Upload from Device
              </Button>
            </div>
            {fileError && (
              <p className="flex items-center justify-center gap-1.5 text-xs text-red-600">
                <AlertCircle className="h-3.5 w-3.5" /> {fileError}
              </p>
            )}
          </div>
        </div>
      )}

      {/* ── Two-column layout once image is selected ── */}
      {imageFile && (
        <form
          onSubmit={handleSubmit}
          className="mx-auto w-full max-w-6xl flex-1 px-4 py-5"
        >
          <div className="grid gap-5 lg:grid-cols-2 lg:items-start">
            {/* ══ LEFT COLUMN — Photo + AI analysis ══ */}
            <div className="space-y-4">
              {/* Photo card */}
              <div className="overflow-hidden rounded-2xl border bg-white shadow-sm">
                <div className="flex items-center justify-between border-b px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Camera className="h-4 w-4 text-blue-600" />
                    <span className="text-sm font-semibold text-gray-900">
                      Waste Photo
                    </span>
                  </div>
                  <div className="flex gap-1.5">
                    <button
                      type="button"
                      onClick={openCameraPicker}
                      className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs font-medium text-gray-600 hover:border-gray-300 hover:bg-gray-50 transition-colors"
                    >
                      <Camera className="h-3 w-3" /> Retake
                    </button>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs font-medium text-gray-600 hover:border-gray-300 hover:bg-gray-50 transition-colors"
                    >
                      <Upload className="h-3 w-3" /> Replace
                    </button>
                  </div>
                </div>
                {imagePreview && (
                  <DetectionImageOverlay
                    imageSrc={imagePreview}
                    alt="Selected waste"
                    detections={analysisResult?.detections || []}
                    imageClassName="w-full h-auto max-h-80 object-contain bg-gray-50"
                  />
                )}
              </div>

              {/* AI Analysis card */}
              <div className="rounded-2xl border bg-white shadow-sm">
                <div className="flex items-center gap-2 border-b px-4 py-3">
                  <Sparkles className="h-4 w-4 text-violet-500" />
                  <span className="text-sm font-semibold text-gray-900">
                    AI Analysis
                  </span>
                  <span className="ml-auto text-[11px] text-gray-400">
                    Optional — helps auto-fill waste type
                  </span>
                </div>
                <div className="space-y-3 p-4">
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full gap-2"
                    onClick={handleAnalyzeWaste}
                    disabled={isAnalyzing}
                  >
                    {isAnalyzing ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" /> Analyzing…
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4" /> Analyze Waste
                      </>
                    )}
                  </Button>

                  {analysisError && (
                    <p className="flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                      <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />{" "}
                      {analysisError}
                    </p>
                  )}

                  {analysisResult && (
                    <div className="space-y-2 rounded-xl border border-gray-100 bg-gray-50 p-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-500">Detected</span>
                        <span className="text-xs font-semibold text-gray-800 capitalize">
                          {analysisResult.detectedObject}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-500">
                          Classification
                        </span>
                        <span
                          className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${ANALYSIS_TYPE_STYLES[analysisResult.wasteType]}`}
                        >
                          {analysisResult.wasteType}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-500">
                          Confidence
                        </span>
                        <span className="text-xs font-semibold text-gray-800">
                          {(analysisResult.confidence * 100).toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  )}

                  {decisionMessage && (
                    <p
                      className={`rounded-lg border px-3 py-2 text-xs ${
                        analysisResult?.decision.retakeRecommended
                          ? "border-amber-200 bg-amber-50 text-amber-700"
                          : "border-green-200 bg-green-50 text-green-700"
                      }`}
                    >
                      {decisionMessage}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* ══ RIGHT COLUMN — Location + form + submit ══ */}
            <div className="space-y-4">
              {/* Location card */}
              <div className="rounded-2xl border bg-white shadow-sm">
                <div className="flex items-center justify-between border-b px-4 py-3">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-blue-600" />
                    <span className="text-sm font-semibold text-gray-900">
                      Pin Location
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={requestCurrentLocation}
                    disabled={isLocating}
                    className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs font-medium text-gray-600 hover:border-gray-300 hover:bg-gray-50 transition-colors disabled:opacity-50"
                  >
                    {isLocating ? (
                      <>
                        <Loader2 className="h-3 w-3 animate-spin" /> Detecting…
                      </>
                    ) : (
                      "Detect Again"
                    )}
                  </button>
                </div>

                {/* Map */}
                <div className="overflow-hidden rounded-b-none">
                  <div className="h-64 sm:h-72">
                    <LocationPickerMap
                      value={location}
                      zones={reportingZones}
                      onChange={(nextLocation) => {
                        setLocation(nextLocation);
                        setLocationConfirmed(false);
                        setLocationError("");
                      }}
                    />
                  </div>
                </div>

                <div className="space-y-2 p-3">
                  {locationStatus && (
                    <p className="rounded-lg border border-blue-100 bg-blue-50 px-3 py-1.5 text-xs text-blue-700">
                      {locationStatus}
                    </p>
                  )}
                  {locationError && (
                    <p className="flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs text-red-700">
                      <AlertCircle className="h-3.5 w-3.5" /> {locationError}
                    </p>
                  )}
                  {outsideZone && (
                    <p className="flex items-center gap-1.5 rounded-lg border border-red-300 bg-red-50 px-3 py-1.5 text-xs font-medium text-red-700">
                      <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
                      You can only report within the designated coastal zone.
                    </p>
                  )}
                  {location && !outsideZone && (
                    <div className="flex items-center justify-between gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-1.5">
                      <span className="font-mono text-xs text-gray-500">
                        {location.lat.toFixed(5)}, {location.lng.toFixed(5)}
                      </span>
                      {!locationConfirmed ? (
                        <Button
                          type="button"
                          size="sm"
                          className="h-7 gap-1 text-xs"
                          onClick={() => setLocationConfirmed(true)}
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" /> Confirm Pin
                        </Button>
                      ) : (
                        <span className="flex items-center gap-1 text-xs font-semibold text-emerald-600">
                          <CheckCircle2 className="h-3.5 w-3.5" /> Confirmed
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Report details card */}
              <div className="rounded-2xl border bg-white shadow-sm">
                <div className="border-b px-4 py-3">
                  <span className="text-sm font-semibold text-gray-900">
                    Report Details
                  </span>
                </div>
                <div className="space-y-4 p-4">
                  <div className="space-y-1.5">
                    <Label
                      htmlFor="waste-type"
                      className="text-xs font-medium text-gray-700"
                    >
                      Waste Type <span className="text-red-500">*</span>
                    </Label>
                    <select
                      id="waste-type"
                      title="Select waste type"
                      className="w-full rounded-lg border border-input bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                      value={selectedCategory}
                      onChange={(event) =>
                        setSelectedCategory(event.target.value as WasteCategory)
                      }
                    >
                      <option value="">Select waste type…</option>
                      {Object.entries(WASTE_CATEGORY_LABELS).map(
                        ([key, label]) => (
                          <option key={key} value={key}>
                            {label}
                          </option>
                        ),
                      )}
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <Label
                      htmlFor="description"
                      className="text-xs font-medium text-gray-700"
                    >
                      Description{" "}
                      <span className="text-gray-400 font-normal">
                        (optional)
                      </span>
                    </Label>
                    <Textarea
                      id="description"
                      value={description}
                      onChange={(event) => setDescription(event.target.value)}
                      placeholder="Add details about the waste condition or surroundings…"
                      rows={3}
                      className="resize-none text-sm"
                    />
                  </div>

                  {(fileError || submitError) && (
                    <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700">
                      <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                      <span>{fileError || submitError}</span>
                    </div>
                  )}

                  <Button
                    type="submit"
                    disabled={!canSubmit}
                    className="w-full h-11 gap-2 text-sm font-semibold"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" /> Saving
                        Report…
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="h-4 w-4" /> Submit Report
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </form>
      )}
    </div>
  );
}
