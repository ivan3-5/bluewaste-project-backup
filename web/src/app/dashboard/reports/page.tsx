"use client";

import { useState } from "react";
import {
  useReports,
  useUpdateReportStatus,
  useAssignWorker,
} from "@/hooks/useReports";
import { StatusBadge } from "@/components/reports/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ReportStatus,
  WasteCategory,
  WASTE_CATEGORY_LABELS,
  REPORT_STATUS_LABELS,
  PRIORITY_LABELS,
  Report,
} from "@/types";
import { formatDateTime } from "@/lib/utils";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { useAuth } from "@/providers/AuthProvider";

export default function ReportsPage() {
  const { user } = useAuth();
  const canManageReport = user?.role === "LGU_ADMIN";

  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<ReportStatus | "">("");
  const [category, setCategory] = useState<WasteCategory | "">("");
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [actionReport, setActionReport] = useState<Report | null>(null);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [newStatus, setNewStatus] = useState<ReportStatus>("VERIFIED");
  const [statusNotes, setStatusNotes] = useState("");
  const [selectedWorkerId, setSelectedWorkerId] = useState("");

  const { data, isLoading } = useReports({
    page,
    limit: 15,
    status: status || undefined,
    category: category || undefined,
    search: search || undefined,
  });

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

  const updateStatus = useUpdateReportStatus();
  const assignWorker = useAssignWorker();

  const handleSearch = () => {
    setSearch(searchInput);
    setPage(1);
  };

  const handleStatusUpdate = async () => {
    if (!actionReport || !canManageReport) return;

    // Update status
    await updateStatus.mutateAsync({
      id: actionReport.id,
      status: newStatus,
      notes: statusNotes,
    });

    // Assign worker if selected
    if (selectedWorkerId) {
      await assignWorker.mutateAsync({
        reportId: actionReport.id,
        assignedToId: selectedWorkerId,
      });
    }

    setActionReport(null);
    setShowStatusModal(false);
    setStatusNotes("");
    setSelectedWorkerId("");
  };

  const reports = data?.data || [];
  const pagination = data?.pagination;

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">Reports Management</h1>
        <span className="text-sm text-gray-500">
          {pagination ? `${pagination.total} total reports` : ""}
        </span>
      </div>

      {/* Filters */}
      <div className="mb-6 flex flex-wrap items-end gap-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-600">
            Status
          </label>
          <select
            title="Filter by status"
            className="rounded-md border px-3 py-2 text-sm"
            value={status}
            onChange={(e) => {
              setStatus(e.target.value as ReportStatus | "");
              setPage(1);
            }}
          >
            <option value="">All Statuses</option>
            {Object.entries(REPORT_STATUS_LABELS).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-600">
            Category
          </label>
          <select
            title="Filter by category"
            className="rounded-md border px-3 py-2 text-sm"
            value={category}
            onChange={(e) => {
              setCategory(e.target.value as WasteCategory | "");
              setPage(1);
            }}
          >
            <option value="">All Categories</option>
            {Object.entries(WASTE_CATEGORY_LABELS).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-end gap-2">
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">
              Search
            </label>
            <Input
              placeholder="Search reports..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              className="w-56"
            />
          </div>
          <Button size="sm" onClick={handleSearch}>
            Search
          </Button>
        </div>
        {(status || category || search) && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setStatus("");
              setCategory("");
              setSearch("");
              setSearchInput("");
              setPage(1);
            }}
          >
            Clear Filters
          </Button>
        )}
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border bg-white shadow-sm">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">
                Title
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">
                Category
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">
                Status
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">
                Priority
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">
                Reporter
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">
                Assigned
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">
                Date
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {isLoading ? (
              <tr>
                <td
                  colSpan={8}
                  className="px-4 py-10 text-center text-gray-400"
                >
                  Loading...
                </td>
              </tr>
            ) : reports.length === 0 ? (
              <tr>
                <td
                  colSpan={8}
                  className="px-4 py-10 text-center text-gray-400"
                >
                  No reports found
                </td>
              </tr>
            ) : (
              reports.map((report) => (
                <tr key={report.id} className="hover:bg-gray-50">
                  <td className="max-w-[200px] truncate px-4 py-3 text-sm font-medium text-gray-800">
                    <Link
                      href={`/dashboard/report?id=${report.id}`}
                      className="hover:text-blue-600 hover:underline"
                    >
                      {report.title}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {WASTE_CATEGORY_LABELS[report.category]}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={report.status} />
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {PRIORITY_LABELS[report.priority]}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {report.isAnonymous
                      ? "Anonymous"
                      : report.reporter
                        ? `${report.reporter.firstName} ${report.reporter.lastName}`
                        : "N/A"}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {report.assignedTo
                      ? `${report.assignedTo.firstName} ${report.assignedTo.lastName}`
                      : "—"}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-500">
                    {formatDateTime(report.createdAt)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <Link href={`/dashboard/report?id=${report.id}`}>
                        <Button
                          variant="default"
                          size="sm"
                          className="bg-blue-600 hover:bg-blue-700"
                        >
                          View
                        </Button>
                      </Link>
                      {canManageReport && (
                        <Button
                          variant="default"
                          size="sm"
                          className="bg-green-600 hover:bg-green-700"
                          onClick={() => {
                            setActionReport(report);
                            setShowStatusModal(true);
                            setNewStatus(report.status);
                            setSelectedWorkerId(report.assignedTo?.id || "");
                          }}
                        >
                          Status
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between">
          <p className="text-sm text-gray-500">
            Page {pagination.page} of {pagination.totalPages}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={pagination.page <= 1}
              onClick={() => setPage(page - 1)}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={pagination.page >= pagination.totalPages}
              onClick={() => setPage(page + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Status Update Modal */}
      {actionReport && showStatusModal && canManageReport && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          onClick={() => {
            setActionReport(null);
            setShowStatusModal(false);
            setSelectedWorkerId("");
          }}
        >
          <div
            className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="mb-4 text-lg font-semibold">Update Report Status</h3>
            <p className="mb-4 text-sm text-gray-600">
              Report: {actionReport.title}
            </p>
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
                Assign Field Worker (optional)
              </label>
              <select
                title="Assign Field Worker"
                className="w-full rounded-md border px-3 py-2 text-sm"
                value={selectedWorkerId}
                onChange={(e) => setSelectedWorkerId(e.target.value)}
              >
                <option value="">No assignment / Keep current</option>
                {workers?.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.firstName} {w.lastName}
                  </option>
                ))}
              </select>
            </div>
            <div className="mb-4">
              <label className="mb-1 block text-sm font-medium">
                Notes (optional)
              </label>
              <textarea
                className="w-full rounded-md border px-3 py-2 text-sm"
                rows={3}
                placeholder="Add notes about this status update..."
                value={statusNotes}
                onChange={(e) => setStatusNotes(e.target.value)}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setActionReport(null);
                  setShowStatusModal(false);
                  setSelectedWorkerId("");
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={handleStatusUpdate}
                disabled={updateStatus.isPending || assignWorker.isPending}
              >
                {updateStatus.isPending || assignWorker.isPending
                  ? "Updating..."
                  : "Update"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
