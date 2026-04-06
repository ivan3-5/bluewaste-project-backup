"use client";

import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/providers/AuthProvider";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { DetectionBox } from "@/lib/waste-classification";
import DetectionImageOverlay from "@/components/ai/DetectionImageOverlay";
import { getApiErrorMessage } from "@/lib/apiError";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Loader2,
  MapPin,
  LocateFixed,
  ImagePlus,
  Sparkles,
} from "lucide-react";

interface AnalyzeWasteResult {
  detectedObject: string;
  wasteType: "Recyclable" | "Non-recyclable" | "Organic";
  confidence: number;
  imageUrl: string;
  top_confidence?: number | null;
  decision?: {
    is_uncertain?: boolean;
    message?: string | null;
    retake_recommended?: boolean;
    capture_tips?: string[];
  };
  labels: string[];
  detections: DetectionBox[];
}

const CATEGORY_STYLES: Record<AnalyzeWasteResult["wasteType"], string> = {
  Recyclable: "bg-green-100 text-green-800 border-green-200",
  Organic: "bg-yellow-100 text-yellow-800 border-yellow-200",
  "Non-recyclable": "bg-red-100 text-red-800 border-red-200",
};

const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_FILE_SIZE_BYTES = 8 * 1024 * 1024;

export default function ReportWastePage() {
  const router = useRouter();
  const { user, token, isLoading } = useAuth();

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<AnalyzeWasteResult | null>(null);
  const [error, setError] = useState<string>("");
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [locationStatus, setLocationStatus] = useState<string>("");
  const [address, setAddress] = useState<string>("");
  const [decisionNotice, setDecisionNotice] = useState<string>("");

  useEffect(() => {
    if (!isLoading && !user) {
      router.push("/login");
    }
  }, [isLoading, user, router]);

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const confidencePercent = useMemo(() => {
    if (!result) return null;
    return `${(result.confidence * 100).toFixed(1)}%`;
  }, [result]);

  if (!isLoading && !user) {
    return null;
  }

  const onFileSelect = (file: File | null) => {
    if (!file) return;

    if (!ALLOWED_TYPES.has(file.type)) {
      setError("Unsupported image type. Use JPG, PNG, or WEBP.");
      return;
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      setError("Image must be 8MB or smaller.");
      return;
    }

    setError("");
    setResult(null);
    setDecisionNotice("");
    setImageFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  };

  const handleFileInput = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] || null;
    onFileSelect(file);
  };

  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      setLocationStatus("Geolocation is not supported in this browser.");
      return;
    }

    setLocationStatus("Fetching your location...");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLatitude(position.coords.latitude);
        setLongitude(position.coords.longitude);
        setLocationStatus("Location added.");
      },
      () => {
        setLocationStatus("Unable to access your location.");
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
      },
    );
  };

  const handleAnalyzeWaste = async () => {
    if (!imageFile) {
      setError("Please upload an image first.");
      return;
    }

    if (!token) {
      setError("Please login to analyze and save reports.");
      return;
    }

    setIsAnalyzing(true);
    setError("");
    setDecisionNotice("");

    try {
      const formData = new FormData();
      formData.append("image", imageFile);
      if (latitude !== null) {
        formData.append("latitude", String(latitude));
      }
      if (longitude !== null) {
        formData.append("longitude", String(longitude));
      }
      if (address.trim().length > 0) {
        formData.append("address", address.trim());
      }

      const response = await fetch("/api/analyze-waste", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || data.error || "Failed to analyze image",
        );
      }

      setResult(data as AnalyzeWasteResult);

      const decision = (data as AnalyzeWasteResult).decision;
      const retakeRecommended = !!decision?.retake_recommended;
      if (retakeRecommended) {
        setDecisionNotice(
          decision?.message ||
            "Uncertain classification. Please retake the image for a more reliable result.",
        );
      }
    } catch (err) {
      const message = getApiErrorMessage(err, "Failed to analyze image");
      setError(message);
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-50 via-white to-emerald-50 py-8 px-4">
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              AI Waste Detection
            </h1>
            <p className="text-sm text-gray-600">
              Upload a waste photo and let AI classify it for faster
              environmental response.
            </p>
          </div>
          <Link href="/my-reports">
            <Button variant="outline">View My AI Reports</Button>
          </Link>
        </div>

        <Card className="border-blue-100 shadow-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <ImagePlus className="h-5 w-5 text-blue-600" />
              Upload Waste Image
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="waste-image">Choose Image</Label>
                <Input
                  id="waste-image"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleFileInput}
                />
                <p className="text-xs text-gray-500">
                  Accepted: JPG, PNG, WEBP (max 8MB)
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="camera-image">Use Camera</Label>
                <Input
                  id="camera-image"
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handleFileInput}
                />
                <p className="text-xs text-gray-500">
                  Mobile-friendly camera capture input
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="address">Address or landmark (optional)</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleGetLocation}
                >
                  <LocateFixed className="mr-1 h-4 w-4" />
                  Use Current Location
                </Button>
              </div>
              <Input
                id="address"
                placeholder="e.g. Near public market"
                value={address}
                onChange={(event) => setAddress(event.target.value)}
              />
              <div className="text-xs text-gray-500">
                {locationStatus}
                {latitude !== null && longitude !== null && (
                  <span className="ml-1 font-medium text-gray-700">
                    ({latitude.toFixed(5)}, {longitude.toFixed(5)})
                  </span>
                )}
              </div>
            </div>

            {previewUrl && (
              <DetectionImageOverlay
                imageSrc={previewUrl}
                alt="Waste preview"
                detections={result?.detections || []}
                imageClassName="w-full h-auto max-h-[28rem] object-contain bg-white"
              />
            )}

            {error && (
              <p className="rounded-md bg-red-50 p-3 text-sm text-red-700">
                {error}
              </p>
            )}

            <Button
              type="button"
              className="w-full md:w-auto"
              onClick={handleAnalyzeWaste}
              disabled={isAnalyzing || !imageFile}
            >
              {isAnalyzing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Analyzing image...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  Analyze Waste
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {result && (
          <Card className="border-emerald-100 shadow-md">
            <CardHeader>
              <CardTitle className="text-lg">Detection Result</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-5 md:grid-cols-2">
              <div className="overflow-hidden rounded-lg border border-gray-200">
                <DetectionImageOverlay
                  imageSrc={previewUrl || result.imageUrl}
                  alt="Uploaded waste"
                  detections={result.detections || []}
                  imageClassName="w-full h-auto max-h-[28rem] object-contain bg-white"
                />
              </div>

              <div className="space-y-4">
                <div>
                  <p className="text-xs uppercase tracking-wide text-gray-500">
                    Detected object
                  </p>
                  <p className="text-lg font-semibold text-gray-900 capitalize">
                    {result.detectedObject}
                  </p>
                </div>

                <div>
                  <p className="text-xs uppercase tracking-wide text-gray-500">
                    Waste classification
                  </p>
                  <span
                    className={`mt-1 inline-flex rounded-full border px-3 py-1 text-sm font-semibold ${CATEGORY_STYLES[result.wasteType]}`}
                  >
                    {result.wasteType}
                  </span>
                </div>

                <div>
                  <p className="text-xs uppercase tracking-wide text-gray-500">
                    Confidence score
                  </p>
                  <p className="text-lg font-semibold text-gray-900">
                    {confidencePercent}
                  </p>
                  {typeof result.top_confidence === "number" && (
                    <p className="text-xs text-gray-500">
                      Top detection confidence:{" "}
                      {(result.top_confidence * 100).toFixed(1)}%
                    </p>
                  )}
                </div>

                {result.detections.length > 0 && (
                  <div>
                    <p className="text-xs uppercase tracking-wide text-gray-500">
                      Bounding boxes
                    </p>
                    <p className="text-sm font-medium text-gray-900">
                      {result.detections.length} object(s) detected
                    </p>
                  </div>
                )}

                {(latitude !== null ||
                  longitude !== null ||
                  address.trim().length > 0) && (
                  <div className="rounded-md border border-gray-200 bg-gray-50 p-3 text-sm text-gray-700">
                    <p className="mb-1 flex items-center gap-1 font-medium text-gray-800">
                      <MapPin className="h-4 w-4 text-gray-500" />
                      Attached Location Data
                    </p>
                    {address.trim().length > 0 && (
                      <p>Address: {address.trim()}</p>
                    )}
                    {latitude !== null && longitude !== null && (
                      <p>
                        Coordinates: {latitude.toFixed(5)},{" "}
                        {longitude.toFixed(5)}
                      </p>
                    )}
                  </div>
                )}

                {decisionNotice && (
                  <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800">
                    <p className="font-medium">Retake Recommended</p>
                    <p>{decisionNotice}</p>
                    {Array.isArray(result.decision?.capture_tips) &&
                      result.decision!.capture_tips!.length > 0 && (
                        <p className="mt-1 text-xs text-amber-700">
                          Tips: {result.decision!.capture_tips!.join(" | ")}
                        </p>
                      )}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
