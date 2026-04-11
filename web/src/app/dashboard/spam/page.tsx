"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  useReports,
  useDeleteSpamReport,
  useRestoreSpamReport,
} from "@/hooks/useReports";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  REPORT_STATUS_LABELS,
  WASTE_CATEGORY_LABELS,
  ReportStatus,
  WasteCategory,
} from "@/types";
import { formatDateTime } from "@/lib/utils";

const RETENTION_DAYS = 3;

function getAutoDeleteAt(spamMarkedAt?: string | null) {
  if (!spamMarkedAt) return null;
  const base = new Date(spamMarkedAt);
  if (Number.isNaN(base.getTime())) return null;
  return new Date(base.getTime() + RETENTION_DAYS * 24 * 60 * 60 * 1000);
}

export default function SpamReportsPage() {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<ReportStatus | "">("");
  const [category, setCategory] = useState<WasteCategory | "">("");
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");

  const { data, isLoading } = useReports({
    page,
    limit: 15,
    isSpam: true,
    status: status || undefined,
    category: category || undefined,
    search: search || undefined,
  });

  const restoreSpam = useRestoreSpamReport();
  const deleteSpam = useDeleteSpamReport();

  const reports = data?.data || [];
  const pagination = data?.pagination;

  const pendingAction = restoreSpam.isPending || deleteSpam.isPending;

  const handleSearch = () => {
    setSearch(searchInput.trim());
    setPage(1);
  };

  const records = useMemo(
    () =>
      reports.map((report) => {
        const autoDeleteAt = getAutoDeleteAt(report.spamMarkedAt);
        return {
          ...report,
          autoDeleteAt,
        };
      }),
    [reports],
  );

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Spam Queue</h1>
          {pagination && (
            <p className="mt-0.5 text-sm text-gray-500">
              {pagination.total} spam report{pagination.total !== 1 ? "s" : ""}
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
            title="Filter spam reports by status"
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
            title="Filter spam reports by category"
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
              placeholder="Title, address, description..."
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
                Reason
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">
                Marked Spam
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">
                Auto Delete
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
                  colSpan={5}
                  className="px-4 py-10 text-center text-gray-400"
                >
                  Loading spam reports...
                </td>
              </tr>
            ) : records.length === 0 ? (
              <tr>
                <td
                  colSpan={5}
                  className="px-4 py-10 text-center text-gray-400"
                >
                  No spam reports
                </td>
              </tr>
            ) : (
              records.map((report) => (
                <tr key={report.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <p className="max-w-[240px] truncate text-sm font-medium text-gray-800">
                      {report.title}
                    </p>
                    <p className="mt-0.5 text-xs text-gray-500">
                      {WASTE_CATEGORY_LABELS[report.category]} ·{" "}
                      {REPORT_STATUS_LABELS[report.status]}
                    </p>
                  </td>
                  <td className="max-w-[260px] px-4 py-3 text-sm text-gray-600">
                    {report.spamReason ||
                      "No waste detected by admin image analysis."}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-600">
                    {report.spamMarkedAt
                      ? formatDateTime(report.spamMarkedAt)
                      : "-"}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-600">
                    {report.autoDeleteAt
                      ? formatDateTime(report.autoDeleteAt.toISOString())
                      : "-"}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-2">
                      <Link href={`/dashboard/reports/${report.id}`}>
                        <Button size="sm" variant="outline">
                          View
                        </Button>
                      </Link>
                      <Button
                        size="sm"
                        className="bg-emerald-600 text-white hover:bg-emerald-700"
                        disabled={pendingAction}
                        onClick={async () => {
                          await restoreSpam.mutateAsync(report.id);
                        }}
                      >
                        Restore
                      </Button>
                      <Button
                        size="sm"
                        className="bg-red-600 text-white hover:bg-red-700"
                        disabled={pendingAction}
                        onClick={async () => {
                          await deleteSpam.mutateAsync(report.id);
                        }}
                      >
                        Delete Now
                      </Button>
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
