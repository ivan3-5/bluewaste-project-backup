"use client";

import { useState } from "react";
import Link from "next/link";
import {
  useAssignWorker,
  useReports,
  useUpdateReportStatus,
} from "@/hooks/useReports";
import { useUsers } from "@/hooks/useUsers";
import { StatusBadge } from "@/components/reports/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  REPORT_STATUS_LABELS,
  WASTE_CATEGORY_LABELS,
  ReportStatus,
  WasteCategory,
} from "@/types";
import { formatDateTime } from "@/lib/utils";
import {
  DataTableSkeleton,
  FilterToolbarSkeleton,
  PageHeadingSkeleton,
} from "@/components/skeletons/page-skeletons";

const STATUS_FILTERS: Array<{ value: ReportStatus | ""; label: string }> = [
  { value: "", label: "All" },
  { value: "PENDING", label: "Pending" },
  { value: "VERIFIED", label: "Verified" },
  { value: "CLEANUP_SCHEDULED", label: "Scheduled" },
  { value: "IN_PROGRESS", label: "In Progress" },
  { value: "CLEANED", label: "Cleaned" },
  { value: "REJECTED", label: "Rejected" },
];

const CATEGORY_FILTERS: Array<{ value: WasteCategory | ""; label: string }> = [
  { value: "", label: "All Categories" },
  ...Object.entries(WASTE_CATEGORY_LABELS).map(([key, label]) => ({
    value: key as WasteCategory,
    label,
  })),
];

export default function ReportManagementPage() {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<ReportStatus | "">("");
  const [category, setCategory] = useState<WasteCategory | "">("");
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");

  const { data, isLoading } = useReports({
    page,
    limit: 15,
    status: status || undefined,
    category: category || undefined,
    search: search || undefined,
  });

  const { data: workersData } = useUsers({
    page: 1,
    limit: 200,
    role: "FIELD_WORKER",
  });

  const updateStatus = useUpdateReportStatus();
  const assignWorker = useAssignWorker();

  const reports = data?.data || [];
  const pagination = data?.pagination;
  const workers = workersData?.data || [];

  const pendingAction = updateStatus.isPending || assignWorker.isPending;

  const handleSearch = () => {
    setSearch(searchInput.trim());
    setPage(1);
  };

  const handleStatusChange = async (
    reportId: string,
    currentStatus: ReportStatus,
    nextStatus: ReportStatus,
  ) => {
    if (currentStatus === nextStatus) return;
    try {
      await updateStatus.mutateAsync({ id: reportId, status: nextStatus });
    } catch {
      // errors are handled by react-query
    }
  };

  const handleAssign = async (
    reportId: string,
    currentAssignedId: string | undefined,
    nextAssignedId: string,
  ) => {
    if (!nextAssignedId || nextAssignedId === currentAssignedId) return;
    try {
      await assignWorker.mutateAsync({
        reportId,
        assignedToId: nextAssignedId,
      });
    } catch {
      // errors are handled by react-query
    }
  };

  if (isLoading) {
    return (
      <div>
        <div className="mb-6 flex items-center justify-between">
          <PageHeadingSkeleton withSubtitle={false} />
        </div>
        <FilterToolbarSkeleton blocks={2} />
        <DataTableSkeleton rows={8} cols={6} />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">
            Report Management
          </h1>
          {pagination && (
            <p className="mt-0.5 text-sm text-gray-500">
              {pagination.total} total report
              {pagination.total !== 1 ? "s" : ""}
            </p>
          )}
        </div>
      </div>

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
            {STATUS_FILTERS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
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
            {CATEGORY_FILTERS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
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
              placeholder="Title, address, reporter..."
              className="w-64"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
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

      <div className="overflow-x-auto rounded-lg border bg-white shadow-sm">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">
                Report
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">
                Reporter
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">
                Assigned
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">
                Status
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">
                Submitted
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {reports.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  className="px-4 py-10 text-center text-gray-400"
                >
                  No reports found
                </td>
              </tr>
            ) : (
              reports.map((report) => (
                <tr key={report.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <p className="max-w-[240px] truncate text-sm font-medium text-gray-800">
                      {report.title}
                    </p>
                    <p className="mt-0.5 text-xs text-gray-500">
                      {WASTE_CATEGORY_LABELS[report.category]}
                      {report.address ? ` - ${report.address}` : ""}
                    </p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-sm text-gray-700">
                      {report.isAnonymous
                        ? "Anonymous"
                        : report.reporter
                          ? `${report.reporter.firstName} ${report.reporter.lastName}`
                          : "Unknown"}
                    </p>
                    {report.reporter?.email && !report.isAnonymous && (
                      <p className="mt-0.5 text-xs text-gray-500">
                        {report.reporter.email}
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-xs text-gray-600">
                      {report.assignedTo
                        ? `${report.assignedTo.firstName} ${report.assignedTo.lastName}`
                        : "Unassigned"}
                    </p>
                    <select
                      title="Assign field worker"
                      className="mt-1 w-full rounded-md border px-2 py-1 text-xs"
                      value={report.assignedToId || ""}
                      onChange={(e) =>
                        handleAssign(
                          report.id,
                          report.assignedToId,
                          e.target.value,
                        )
                      }
                      disabled={pendingAction || workers.length === 0}
                    >
                      <option value="">
                        {report.assignedToId
                          ? "Change worker"
                          : "Assign worker"}
                      </option>
                      {workers.map((worker) => (
                        <option key={worker.id} value={worker.id}>
                          {worker.firstName} {worker.lastName}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={report.status} />
                    <select
                      title="Update status"
                      className="mt-1 w-full rounded-md border px-2 py-1 text-xs"
                      value={report.status}
                      onChange={(e) =>
                        handleStatusChange(
                          report.id,
                          report.status,
                          e.target.value as ReportStatus,
                        )
                      }
                      disabled={pendingAction}
                    >
                      {Object.entries(REPORT_STATUS_LABELS).map(
                        ([key, label]) => (
                          <option key={key} value={key}>
                            {label}
                          </option>
                        ),
                      )}
                    </select>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-600">
                    {formatDateTime(report.createdAt)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-2">
                      <Link href={`/dashboard/report?id=${report.id}`}>
                        <Button size="sm" variant="outline">
                          View
                        </Button>
                      </Link>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {pagination && pagination.totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between">
          <p className="text-sm text-gray-500">
            Page {pagination.page} of {pagination.totalPages}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={pagination.page <= 1 || pendingAction}
              onClick={() => setPage((p) => p - 1)}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={
                pagination.page >= pagination.totalPages || pendingAction
              }
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
