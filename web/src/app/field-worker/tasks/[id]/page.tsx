"use client";

import { useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import dynamic from "next/dynamic";
import {
  useReport,
  useUpdateReportStatus,
  useUploadReportImages,
} from "@/hooks/useReports";
import { StatusBadge } from "@/components/reports/StatusBadge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  ReportStatus,
  WASTE_CATEGORY_LABELS,
  REPORT_STATUS_LABELS,
  PRIORITY_LABELS,
  ReportImage,
} from "@/types";
import { formatDateTime } from "@/lib/utils";
import {
  ArrowLeft,
  MapPin,
  Clock,
  Camera,
  Upload,
  X,
  CheckCircle2,
  AlertTriangle,
  Image as ImageIcon,
  ChevronDown,
  ChevronUp,
  User,
} from "lucide-react";
import { FieldWorkerTaskDetailSkeleton } from "@/components/skeletons/page-skeletons";

// Lightweight read-only map for showing report location
const ReadOnlyMap = dynamic(
  () => import("../../../../components/map/ReadOnlyMap"),
  { ssr: false },
);

// Valid field-worker status transitions
const STATUS_TRANSITIONS: Record<ReportStatus, ReportStatus[]> = {
  PENDING: [],
  VERIFIED: ["IN_PROGRESS"],
  CLEANUP_SCHEDULED: ["IN_PROGRESS"],
  IN_PROGRESS: ["CLEANED"],
  CLEANED: [],
  REJECTED: [],
};

const STATUS_ACTION_LABELS: Record<string, { label: string; color: string }> = {
  IN_PROGRESS: {
    label: "Start Cleanup",
    color: "bg-orange-600 hover:bg-orange-700",
  },
  CLEANED: {
    label: "Mark as Cleaned",
    color: "bg-green-600 hover:bg-green-700",
  },
};

export default function TaskDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const { data: report, isLoading } = useReport(id);
  const updateStatus = useUpdateReportStatus();
  const uploadImages = useUploadReportImages();

  const [statusNotes, setStatusNotes] = useState("");
  const [cleanupPhotos, setCleanupPhotos] = useState<File[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState("");

  const nextStatuses = report ? STATUS_TRANSITIONS[report.status] || [] : [];

  const addPhotos = useCallback((files: FileList | File[]) => {
    const newFiles = Array.from(files).filter(
      (f) => f.type.startsWith("image/") && f.size <= 10 * 1024 * 1024,
    );
    setCleanupPhotos((prev) => {
      const combined = [...prev, ...newFiles];
      return combined.slice(0, 5);
    });
  }, []);

  const removePhoto = (index: number) => {
    setCleanupPhotos((prev) => prev.filter((_, i) => i !== index));
  };

  const handleStatusUpdate = async (newStatus: ReportStatus) => {
    if (!report) return;
    setIsSubmitting(true);
    setSuccess("");

    try {
      // Upload cleanup photos if marking as cleaned
      if (newStatus === "CLEANED" && cleanupPhotos.length > 0) {
        await uploadImages.mutateAsync({
          reportId: report.id,
          files: cleanupPhotos,
          type: "CLEANUP",
        });
      }

      await updateStatus.mutateAsync({
        id: report.id,
        status: newStatus,
        notes: statusNotes || undefined,
      });

      setSuccess(
        newStatus === "CLEANED"
          ? "Report marked as cleaned! Great work."
          : "Status updated successfully.",
      );
      setStatusNotes("");
      setCleanupPhotos([]);
    } catch {
      // Error handled by react-query
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return <FieldWorkerTaskDetailSkeleton />;
  }

  if (!report) {
    return (
      <div className="text-center py-20">
        <p className="text-gray-500">Report not found</p>
        <Link
          href="/field-worker/tasks"
          className="text-blue-600 text-sm mt-2 inline-block"
        >
          Back to tasks
        </Link>
      </div>
    );
  }

  const reportImages =
    report.images?.filter((img) => img.type === "REPORT") || [];
  const existingCleanupImages =
    report.images?.filter((img) => img.type === "CLEANUP") || [];

  return (
    <div className="space-y-6 pb-8">
      {/* Back button */}
      <button
        onClick={() => router.back()}
        className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to tasks
      </button>

      {/* Header Card */}
      <div className="bg-white rounded-xl border p-5">
        <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold text-gray-900 mb-2">
              {report.title}
            </h1>
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge status={report.status} />
              <span
                className={`px-2 py-0.5 rounded text-xs font-semibold border ${
                  report.priority === "CRITICAL"
                    ? "text-red-600 bg-red-50 border-red-200"
                    : report.priority === "HIGH"
                      ? "text-orange-600 bg-orange-50 border-orange-200"
                      : report.priority === "MEDIUM"
                        ? "text-yellow-600 bg-yellow-50 border-yellow-200"
                        : "text-green-600 bg-green-50 border-green-200"
                }`}
              >
                {PRIORITY_LABELS[report.priority ?? "LOW"]}
              </span>
              <span className="text-xs text-gray-500">
                {WASTE_CATEGORY_LABELS[report.category]}
              </span>
            </div>
          </div>
        </div>

        <p className="text-sm text-gray-700 mb-4">{report.description}</p>

        <div className="flex flex-wrap gap-4 text-xs text-gray-500">
          <span className="flex items-center gap-1">
            <MapPin className="w-3.5 h-3.5" />
            {report.address || "No address"}
          </span>
          <span className="flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" />
            {formatDateTime(report.createdAt)}
          </span>
          {report.reporter && !report.isAnonymous && (
            <span className="flex items-center gap-1">
              <User className="w-3.5 h-3.5" />
              {report.reporter.firstName} {report.reporter.lastName}
            </span>
          )}
        </div>
      </div>

      {/* Location Map */}
      <div className="bg-white rounded-xl border overflow-hidden">
        <div className="px-5 py-3 border-b">
          <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
            <MapPin className="w-4 h-4 text-blue-600" />
            Report Location
          </h2>
        </div>
        <div className="h-64">
          <ReadOnlyMap lat={report.latitude} lng={report.longitude} />
        </div>
      </div>

      {/* Report Photos */}
      {reportImages.length > 0 && (
        <div className="bg-white rounded-xl border">
          <div className="px-5 py-3 border-b">
            <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
              <ImageIcon className="w-4 h-4 text-blue-600" />
              Report Photos ({reportImages.length})
            </h2>
          </div>
          <div className="p-4 grid grid-cols-2 sm:grid-cols-3 gap-3">
            {reportImages.map((img: ReportImage) => (
              <button
                key={img.id}
                onClick={() => setLightboxImage(img.imageUrl)}
                className="aspect-square rounded-lg overflow-hidden border hover:opacity-90 transition-opacity"
              >
                <img
                  src={img.imageUrl}
                  alt="Report evidence"
                  className="w-full h-full object-cover"
                />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Cleanup Photos (already uploaded) */}
      {existingCleanupImages.length > 0 && (
        <div className="bg-white rounded-xl border">
          <div className="px-5 py-3 border-b">
            <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-green-600" />
              Cleanup Photos ({existingCleanupImages.length})
            </h2>
          </div>
          <div className="p-4 grid grid-cols-2 sm:grid-cols-3 gap-3">
            {existingCleanupImages.map((img: ReportImage) => (
              <button
                key={img.id}
                onClick={() => setLightboxImage(img.imageUrl)}
                className="aspect-square rounded-lg overflow-hidden border hover:opacity-90 transition-opacity border-green-200"
              >
                <img
                  src={img.imageUrl}
                  alt="Cleanup proof"
                  className="w-full h-full object-cover"
                />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Status Update Section */}
      {nextStatuses.length > 0 && (
        <div className="bg-white rounded-xl border">
          <div className="px-5 py-3 border-b">
            <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-orange-500" />
              Update Status
            </h2>
          </div>
          <div className="p-5 space-y-4">
            {/* Success message */}
            {success && (
              <div className="flex items-center gap-2 bg-green-50 text-green-700 text-sm p-3 rounded-lg border border-green-200">
                <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                {success}
              </div>
            )}

            {/* Cleanup photo upload (when completing task) */}
            {nextStatuses.includes("CLEANED") && (
              <div className="space-y-3">
                <Label className="text-sm font-medium text-gray-700">
                  Upload Cleanup Photos (proof of work)
                </Label>

                {cleanupPhotos.length < 5 && (
                  <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer hover:border-blue-400 hover:bg-blue-50/50 transition-colors">
                    <Camera className="w-6 h-6 text-gray-400 mb-2" />
                    <span className="text-sm text-gray-500">
                      Click to upload photos
                    </span>
                    <span className="text-xs text-gray-400 mt-1">
                      {cleanupPhotos.length}/5 photos · Max 10MB each
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      className="hidden"
                      onChange={(e) => {
                        if (e.target.files) addPhotos(e.target.files);
                      }}
                    />
                  </label>
                )}

                {cleanupPhotos.length > 0 && (
                  <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                    {cleanupPhotos.map((file, i) => (
                      <div key={i} className="relative aspect-square group">
                        <img
                          src={URL.createObjectURL(file)}
                          alt={`Cleanup photo ${i + 1}`}
                          className="w-full h-full object-cover rounded-lg border"
                        />
                        <button
                          type="button"
                          onClick={() => removePhoto(i)}
                          title="Remove photo"
                          className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Notes */}
            <div className="space-y-2">
              <Label
                htmlFor="statusNotes"
                className="text-sm font-medium text-gray-700"
              >
                Notes (optional)
              </Label>
              <Textarea
                id="statusNotes"
                value={statusNotes}
                onChange={(e) => setStatusNotes(e.target.value)}
                placeholder="Add any notes about the task..."
                rows={3}
                className="resize-none"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-3">
              {nextStatuses.map((nextStatus) => {
                const action = STATUS_ACTION_LABELS[nextStatus];
                return (
                  <button
                    key={nextStatus}
                    onClick={() => handleStatusUpdate(nextStatus)}
                    disabled={isSubmitting}
                    className={`flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white rounded-lg transition-colors disabled:opacity-50 ${action?.color || "bg-blue-600 hover:bg-blue-700"}`}
                  >
                    {isSubmitting ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : nextStatus === "CLEANED" ? (
                      <CheckCircle2 className="w-4 h-4" />
                    ) : (
                      <Upload className="w-4 h-4" />
                    )}
                    {action?.label || REPORT_STATUS_LABELS[nextStatus]}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Completed Banner */}
      {report.status === "CLEANED" && (
        <div className="flex items-center gap-3 bg-green-50 border border-green-200 rounded-xl px-5 py-4">
          <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0" />
          <div>
            <p className="text-sm font-semibold text-green-800">
              Task Completed
            </p>
            <p className="text-xs text-green-600">
              This report has been cleaned and verified.
            </p>
          </div>
        </div>
      )}

      {/* Status History */}
      {report.statusHistory && report.statusHistory.length > 0 && (
        <div className="bg-white rounded-xl border">
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="w-full flex items-center justify-between px-5 py-3 text-sm font-semibold text-gray-900 hover:bg-gray-50 transition-colors"
          >
            <span className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-gray-500" />
              Status History ({report.statusHistory.length})
            </span>
            {showHistory ? (
              <ChevronUp className="w-4 h-4 text-gray-400" />
            ) : (
              <ChevronDown className="w-4 h-4 text-gray-400" />
            )}
          </button>
          {showHistory && (
            <div className="border-t px-5 py-4 space-y-4">
              {report.statusHistory.map((entry, i) => (
                <div key={entry.id} className="flex items-start gap-3 relative">
                  {i < report.statusHistory!.length - 1 && (
                    <div className="absolute top-5 left-[7px] w-px h-full bg-gray-200" />
                  )}
                  <div className="w-4 h-4 rounded-full bg-blue-100 border-2 border-blue-400 flex-shrink-0 mt-0.5 relative z-10" />
                  <div>
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      {entry.previousStatus && (
                        <>
                          <StatusBadge status={entry.previousStatus} />
                          <span className="text-gray-400">→</span>
                        </>
                      )}
                      <StatusBadge status={entry.newStatus} />
                    </div>
                    {entry.notes && (
                      <p className="text-xs text-gray-600 mt-1">
                        {entry.notes}
                      </p>
                    )}
                    <p className="text-[10px] text-gray-400 mt-1">
                      {entry.changedBy
                        ? `${entry.changedBy.firstName} ${entry.changedBy.lastName} · `
                        : ""}
                      {formatDateTime(entry.createdAt)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Lightbox */}
      {lightboxImage && (
        <div
          className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
          onClick={() => setLightboxImage(null)}
        >
          <button
            onClick={() => setLightboxImage(null)}
            title="Close"
            className="absolute top-4 right-4 w-10 h-10 bg-white/10 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-white/20 transition-colors"
          >
            <X className="w-5 h-5 text-white" />
          </button>
          <img
            src={lightboxImage}
            alt="Full size"
            className="max-w-full max-h-[90vh] rounded-lg object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}
