"use client";

import { useParams, useRouter, useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import {
  useReport,
  useUpdateReportStatus,
  useAssignWorker,
  useUploadReportImages,
  useAnalyzeReportImage,
  useRestoreSpamReport,
  useDeleteSpamReport,
} from "@/hooks/useReports";
import { StatusBadge } from "@/components/reports/StatusBadge";
import { Button } from "@/components/ui/button";
import {
  WASTE_CATEGORY_LABELS,
  REPORT_STATUS_LABELS,
  ReportStatus,
} from "@/types";
import { formatDateTime } from "@/lib/utils";
import { useState, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import Image from "next/image";
import { useAuth } from "@/providers/AuthProvider";
import { ReportDetailSkeleton } from "@/components/skeletons/page-skeletons";

const WasteMap = dynamic(() => import("@/components/map/WasteMap"), {
  ssr: false,
});

export default function ReportDetailPage() {
  const { user } = useAuth();
  const canManageReport = user?.role === "LGU_ADMIN";

  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const routeId = Array.isArray(params.id) ? params.id[0] : params.id;
  const queryId = searchParams.get("id") || searchParams.get("reportId");
  const id = (routeId || queryId || "") as string;
  const { data: report, isLoading } = useReport(id);
  const updateStatus = useUpdateReportStatus();
  const assignWorker = useAssignWorker();
  const uploadImages = useUploadReportImages();
  const analyzeReport = useAnalyzeReportImage();
  const restoreSpam = useRestoreSpamReport();
  const deleteSpam = useDeleteSpamReport();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [showStatusModal, setShowStatusModal] = useState(false);
  const [newStatus, setNewStatus] = useState<ReportStatus>("VERIFIED");
  const [statusNotes, setStatusNotes] = useState("");
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedWorkerId, setSelectedWorkerId] = useState("");
  const [analysisMessage, setAnalysisMessage] = useState("");
  const [analysisError, setAnalysisError] = useState("");

  const { data: workers } = useQuery<
    { id: string; firstName: string; lastName: string }[]
  >({
    queryKey: ["field-workers"],
    enabled: canManageReport,
    queryFn: async () => {
      const { data } = await api.get("/users/field-workers");
      return data;
    },
  });

  const handleStatusUpdate = async () => {
    if (!canManageReport) return;

    await updateStatus.mutateAsync({
      id,
      status: newStatus,
      notes: statusNotes,
    });
    setShowStatusModal(false);
    setStatusNotes("");
  };

  const handleAssign = async () => {
    if (!selectedWorkerId || !canManageReport) return;
    await assignWorker.mutateAsync({
      reportId: id,
      assignedToId: selectedWorkerId,
    });
    setShowAssignModal(false);
    setSelectedWorkerId("");
  };

  const handleAnalyze = async () => {
    if (!canManageReport) return;

    setAnalysisMessage("");
    setAnalysisError("");

    try {
      const result = await analyzeReport.mutateAsync({ reportId: id });
      if (result.analysis.spam) {
        setAnalysisMessage(
          "Analysis result: CLEAN. Report moved to spam and will auto-delete in 3 days.",
        );
      } else {
        setAnalysisMessage(
          "Analysis result: DIRTY. Report kept in active queue.",
        );
      }
    } catch (error: any) {
      setAnalysisError(
        error?.response?.data?.message || "Failed to analyze report image.",
      );
    }
  };

  const handleRestoreSpam = async () => {
    if (!canManageReport) return;
    setAnalysisMessage("");
    setAnalysisError("");
    try {
      await restoreSpam.mutateAsync(id);
      setAnalysisMessage("Spam report restored to active queue.");
    } catch (error: any) {
      setAnalysisError(
        error?.response?.data?.message || "Failed to restore spam report.",
      );
    }
  };

  const handleDeleteSpam = async () => {
    if (!canManageReport) return;
    setAnalysisMessage("");
    setAnalysisError("");
    try {
      await deleteSpam.mutateAsync(id);
      router.push("/dashboard/spam");
    } catch (error: any) {
      setAnalysisError(
        error?.response?.data?.message || "Failed to delete spam report.",
      );
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!canManageReport) return;

    const files = e.target.files;
    if (!files || files.length === 0) return;
    await uploadImages.mutateAsync({
      reportId: id,
      files: Array.from(files),
      type: "CLEANUP",
    });
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  if (isLoading) {
    return <ReportDetailSkeleton />;
  }

  if (!report) {
    return (
      <div className="flex h-64 items-center justify-center text-gray-400">
        Report not found
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex items-center gap-4">
        <Button variant="outline" size="sm" onClick={() => router.back()}>
          &larr; Back
        </Button>
        <h1 className="text-2xl font-bold text-gray-800">{report.title}</h1>
        <StatusBadge status={report.status} />
      </div>

      {report.isSpam && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          This report is in spam and is scheduled for automatic deletion after 3
          days from spam marking.
        </div>
      )}

      {analysisMessage && (
        <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {analysisMessage}
        </div>
      )}

      {analysisError && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {analysisError}
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Main Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Description */}
          <div className="rounded-lg border bg-white p-6 shadow-sm">
            <h2 className="mb-3 text-lg font-semibold text-gray-800">
              Description
            </h2>
            <p className="whitespace-pre-wrap text-gray-600">
              {report.description}
            </p>
          </div>

          {/* Images */}
          <div className="rounded-lg border bg-white p-6 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-800">
                Images ({report.images.length})
              </h2>
              <div>
                {canManageReport && (
                  <>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      multiple
                      title="Upload cleanup photos"
                      className="hidden"
                      onChange={handleImageUpload}
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploadImages.isPending}
                    >
                      {uploadImages.isPending
                        ? "Uploading..."
                        : "Add Cleanup Photos"}
                    </Button>
                  </>
                )}
              </div>
            </div>
            {report.images.length === 0 ? (
              <p className="text-sm text-gray-400">No images attached</p>
            ) : (
              <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
                {report.images.map((img) => (
                  <div
                    key={img.id}
                    className="relative aspect-square overflow-hidden rounded-lg border"
                  >
                    <Image
                      src={img.imageUrl}
                      alt="Report image"
                      fill
                      className="object-cover"
                      sizes="200px"
                    />
                    <span className="absolute bottom-1 left-1 rounded bg-black/60 px-2 py-0.5 text-xs text-white">
                      {img.type === "CLEANUP" ? "Cleanup" : "Report"}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Status History */}
          <div className="rounded-lg border bg-white p-6 shadow-sm">
            <h2 className="mb-3 text-lg font-semibold text-gray-800">
              Status History
            </h2>
            {!report.statusHistory || report.statusHistory.length === 0 ? (
              <p className="text-sm text-gray-400">No status changes yet</p>
            ) : (
              <div className="space-y-4">
                {report.statusHistory.map((entry, i) => (
                  <div key={entry.id} className="relative flex gap-4 pl-6">
                    <div className="absolute left-0 top-1 h-3 w-3 rounded-full bg-blue-500" />
                    {i < report.statusHistory!.length - 1 && (
                      <div className="absolute left-[5px] top-4 h-full w-0.5 bg-gray-200" />
                    )}
                    <div>
                      <div className="flex items-center gap-2">
                        {entry.previousStatus && (
                          <>
                            <StatusBadge status={entry.previousStatus} />
                            <span className="text-gray-400">&rarr;</span>
                          </>
                        )}
                        <StatusBadge status={entry.newStatus} />
                      </div>
                      {entry.notes && (
                        <p className="mt-1 text-sm text-gray-500">
                          {entry.notes}
                        </p>
                      )}
                      <p className="mt-1 text-xs text-gray-400">
                        {entry.changedBy &&
                          `by ${entry.changedBy.firstName} ${entry.changedBy.lastName} — `}
                        {formatDateTime(entry.createdAt)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Actions */}
          <div className="rounded-lg border bg-white p-6 shadow-sm">
            <h2 className="mb-3 text-lg font-semibold text-gray-800">
              Actions
            </h2>
            {canManageReport ? (
              <div className="space-y-2">
                <Button
                  className="w-full bg-indigo-600 hover:bg-indigo-700"
                  onClick={handleAnalyze}
                  disabled={analyzeReport.isPending}
                >
                  {analyzeReport.isPending
                    ? "Analyzing..."
                    : "Analyze Report Image"}
                </Button>
                <Button
                  className="w-full"
                  onClick={() => {
                    setShowStatusModal(true);
                    setNewStatus(report.status);
                  }}
                  disabled={report.isSpam}
                >
                  Update Status
                </Button>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => setShowAssignModal(true)}
                  disabled={report.isSpam}
                >
                  Assign Worker
                </Button>
                {report.isSpam && (
                  <>
                    <Button
                      variant="outline"
                      className="w-full border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                      onClick={handleRestoreSpam}
                      disabled={restoreSpam.isPending || deleteSpam.isPending}
                    >
                      {restoreSpam.isPending
                        ? "Restoring..."
                        : "Restore From Spam"}
                    </Button>
                    <Button
                      className="w-full bg-red-600 hover:bg-red-700"
                      onClick={handleDeleteSpam}
                      disabled={restoreSpam.isPending || deleteSpam.isPending}
                    >
                      {deleteSpam.isPending ? "Deleting..." : "Delete Spam Now"}
                    </Button>
                  </>
                )}
              </div>
            ) : (
              <p className="text-sm text-gray-500">
                Read-only access for this account.
              </p>
            )}
          </div>

          {/* Details */}
          <div className="rounded-lg border bg-white p-6 shadow-sm">
            <h2 className="mb-3 text-lg font-semibold text-gray-800">
              Details
            </h2>
            <dl className="space-y-3 text-sm">
              <div>
                <dt className="text-gray-500">Category</dt>
                <dd className="font-medium text-gray-800">
                  {WASTE_CATEGORY_LABELS[report.category]}
                </dd>
              </div>
              <div>
                <dt className="text-gray-500">Location</dt>
                <dd className="font-medium text-gray-800">
                  {report.address || `${report.latitude}, ${report.longitude}`}
                </dd>
              </div>
              {report.barangay && (
                <div>
                  <dt className="text-gray-500">Barangay</dt>
                  <dd className="font-medium text-gray-800">
                    {report.barangay.name}
                  </dd>
                </div>
              )}
              <div>
                <dt className="text-gray-500">Reporter</dt>
                <dd className="font-medium text-gray-800">
                  {report.isAnonymous
                    ? "Anonymous"
                    : report.reporter
                      ? `${report.reporter.firstName} ${report.reporter.lastName}`
                      : "N/A"}
                </dd>
              </div>
              {report.assignedTo && (
                <div>
                  <dt className="text-gray-500">Assigned To</dt>
                  <dd className="font-medium text-gray-800">
                    {report.assignedTo.firstName} {report.assignedTo.lastName}
                  </dd>
                </div>
              )}
              <div>
                <dt className="text-gray-500">Reported</dt>
                <dd className="font-medium text-gray-800">
                  {formatDateTime(report.createdAt)}
                </dd>
              </div>
              <div>
                <dt className="text-gray-500">Analysis Status</dt>
                <dd className="font-medium text-gray-800">
                  {report.analysisStatus || "Not analyzed"}
                </dd>
              </div>
              <div>
                <dt className="text-gray-500">Detected Waste Count</dt>
                <dd className="font-medium text-gray-800">
                  {report.analysisWasteCount ?? "-"}
                </dd>
              </div>
              <div>
                <dt className="text-gray-500">Spam Queue</dt>
                <dd className="font-medium text-gray-800">
                  {report.isSpam ? "In spam" : "Active"}
                </dd>
              </div>
              <div>
                <dt className="text-gray-500">Last Updated</dt>
                <dd className="font-medium text-gray-800">
                  {formatDateTime(report.updatedAt)}
                </dd>
              </div>
            </dl>
          </div>

          {/* Location Map */}
          <div className="overflow-hidden rounded-lg border bg-white shadow-sm">
            <div className="border-b bg-gray-50 px-4 py-2">
              <h3 className="text-sm font-semibold text-gray-700">Location</h3>
            </div>
            <div className="h-64 min-h-0">
              <WasteMap
                reports={[report]}
                center={[report.latitude, report.longitude]}
                zoom={16}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Status Update Modal */}
      {showStatusModal && canManageReport && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          onClick={() => setShowStatusModal(false)}
        >
          <div
            className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="mb-4 text-lg font-semibold">Update Report Status</h3>
            <div className="mb-4">
              <label className="mb-1 block text-sm font-medium">
                New Status
              </label>
              <select
                title="Select new status"
                className="w-full rounded-md border px-3 py-2 text-sm"
                value={newStatus}
                onChange={(e) => setNewStatus(e.target.value as ReportStatus)}
              >
                {Object.entries(REPORT_STATUS_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
            </div>
            <div className="mb-4">
              <label className="mb-1 block text-sm font-medium">
                Notes (optional)
              </label>
              <textarea
                title="Status notes"
                placeholder="Optional notes"
                className="w-full rounded-md border px-3 py-2 text-sm"
                rows={3}
                value={statusNotes}
                onChange={(e) => setStatusNotes(e.target.value)}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setShowStatusModal(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleStatusUpdate}
                disabled={updateStatus.isPending}
              >
                {updateStatus.isPending ? "Updating..." : "Update"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Assign Modal */}
      {showAssignModal && canManageReport && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          onClick={() => setShowAssignModal(false)}
        >
          <div
            className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="mb-4 text-lg font-semibold">Assign Field Worker</h3>
            <div className="mb-4">
              <label className="mb-1 block text-sm font-medium">
                Select Worker
              </label>
              <select
                title="Select field worker"
                className="w-full rounded-md border px-3 py-2 text-sm"
                value={selectedWorkerId}
                onChange={(e) => setSelectedWorkerId(e.target.value)}
              >
                <option value="">Select a worker...</option>
                {workers?.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.firstName} {w.lastName}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setShowAssignModal(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleAssign}
                disabled={assignWorker.isPending || !selectedWorkerId}
              >
                {assignWorker.isPending ? "Assigning..." : "Assign"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
