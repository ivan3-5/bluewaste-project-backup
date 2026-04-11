"use client";

import { useState } from "react";
import Link from "next/link";
import { useAssignedReports } from "@/hooks/useReports";
import { StatusBadge } from "@/components/reports/StatusBadge";
import { Button } from "@/components/ui/button";
import {
  ReportStatus,
  WASTE_CATEGORY_LABELS,
  REPORT_STATUS_LABELS,
  PRIORITY_LABELS,
  Report,
} from "@/types";
import { timeAgo } from "@/lib/utils";
import {
  MapPin,
  ArrowRight,
  Filter,
  ChevronLeft,
  ChevronRight,
  Inbox,
} from "lucide-react";
import {
  ListCardsSkeleton,
  PageHeadingSkeleton,
} from "@/components/skeletons/page-skeletons";
import { Skeleton } from "@/components/ui/skeleton";

const STATUS_FILTERS: { value: ReportStatus | ""; label: string }[] = [
  { value: "", label: "All Tasks" },
  { value: "VERIFIED", label: "Verified" },
  { value: "CLEANUP_SCHEDULED", label: "Scheduled" },
  { value: "IN_PROGRESS", label: "In Progress" },
  { value: "CLEANED", label: "Completed" },
];

const PRIORITY_COLORS: Record<string, string> = {
  CRITICAL: "text-red-600 bg-red-50 border-red-200",
  HIGH: "text-orange-600 bg-orange-50 border-orange-200",
  MEDIUM: "text-yellow-600 bg-yellow-50 border-yellow-200",
  LOW: "text-green-600 bg-green-50 border-green-200",
};

export default function TasksPage() {
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<ReportStatus | "">("");

  const { data, isLoading } = useAssignedReports({
    page,
    status: statusFilter || undefined,
  });

  const reports = data?.data || [];
  const pagination = data?.pagination;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeadingSkeleton />
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          <Skeleton className="h-4 w-4 rounded-full" />
          {Array.from({ length: 5 }).map((_, idx) => (
            <Skeleton key={idx} className="h-8 w-24 rounded-full" />
          ))}
        </div>
        <ListCardsSkeleton rows={6} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">My Tasks</h1>
        <p className="text-sm text-gray-500 mt-1">
          Manage your assigned cleanup tasks
        </p>
      </div>

      {/* Status Filter Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
        <Filter className="w-4 h-4 text-gray-400 flex-shrink-0 mr-1" />
        {STATUS_FILTERS.map((filter) => (
          <button
            key={filter.value}
            onClick={() => {
              setStatusFilter(filter.value);
              setPage(1);
            }}
            className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
              statusFilter === filter.value
                ? "bg-blue-600 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {filter.label}
          </button>
        ))}
      </div>

      {/* Tasks List */}
      {reports.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border">
          <Inbox className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 text-sm font-medium">No tasks found</p>
          <p className="text-gray-400 text-xs mt-1">
            {statusFilter
              ? "Try a different filter"
              : "No tasks have been assigned to you yet"}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border divide-y">
          {reports.map((report: Report) => (
            <Link
              key={report.id}
              href={`/field-worker/tasks/${report.id}`}
              className="flex items-start gap-4 px-5 py-4 hover:bg-gray-50 transition-colors"
            >
              {/* Priority dot */}
              <div
                className={`mt-1.5 w-2.5 h-2.5 rounded-full flex-shrink-0 ${
                  report.priority === "CRITICAL"
                    ? "bg-red-500"
                    : report.priority === "HIGH"
                      ? "bg-orange-500"
                      : report.priority === "MEDIUM"
                        ? "bg-yellow-500"
                        : "bg-green-500"
                }`}
              />

              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-1.5">
                  <p className="text-sm font-semibold text-gray-900 truncate">
                    {report.title}
                  </p>
                  <StatusBadge status={report.status} />
                </div>

                {report.description && (
                  <p className="text-xs text-gray-500 mb-2 line-clamp-1">
                    {report.description}
                  </p>
                )}

                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500">
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    {report.barangay?.name || report.address || "No address"}
                  </span>
                  <span>{WASTE_CATEGORY_LABELS[report.category]}</span>
                  <span
                    className={`px-1.5 py-0.5 rounded text-[10px] font-semibold border ${PRIORITY_COLORS[report.priority]}`}
                  >
                    {PRIORITY_LABELS[report.priority]}
                  </span>
                  <span>{timeAgo(report.createdAt)}</span>
                  {report.images?.length > 0 && (
                    <span>{report.images.length} photo(s)</span>
                  )}
                </div>
              </div>

              <ArrowRight className="w-4 h-4 text-gray-400 flex-shrink-0 mt-2" />
            </Link>
          ))}
        </div>
      )}

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-gray-500">
            Page {pagination.page} of {pagination.totalPages} (
            {pagination.total} tasks)
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= pagination.totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
