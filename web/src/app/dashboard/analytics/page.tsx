"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import {
  useAnalyticsOverview,
  useAnalyticsTrends,
  useAnalyticsCategories,
  useAnalyticsBarangays,
} from "@/hooks/useAnalytics";
import { Button } from "@/components/ui/button";
import api from "@/lib/api";

const TrendChart = dynamic(() => import("@/components/analytics/TrendChart"), {
  ssr: false,
});
const CategoryPieChart = dynamic(
  () => import("@/components/analytics/CategoryPieChart"),
  { ssr: false },
);

export default function AnalyticsPage() {
  const [period, setPeriod] = useState<"daily" | "weekly" | "monthly">("daily");
  const [days, setDays] = useState(30);

  const { data: overview } = useAnalyticsOverview();
  const { data: trends = [] } = useAnalyticsTrends(period, days);
  const { data: categories = [] } = useAnalyticsCategories();
  const { data: barangays = [] } = useAnalyticsBarangays();

  const handleExport = async () => {
    try {
      const response = await api.get("/analytics/export", {
        responseType: "blob",
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const a = document.createElement("a");
      a.href = url;
      a.download = `bluewaste-export-${new Date().toISOString().split("T")[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Export failed:", error);
    }
  };

  const stats = overview
    ? [
        {
          label: "Total Reports",
          value: overview.total,
          color: "text-gray-800",
        },
        { label: "Pending", value: overview.pending, color: "text-yellow-600" },
        {
          label: "In Progress",
          value: overview.inProgress,
          color: "text-orange-600",
        },
        { label: "Cleaned", value: overview.cleaned, color: "text-green-600" },
        { label: "Rejected", value: overview.rejected, color: "text-red-600" },
      ]
    : [];

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">
          Analytics & Insights
        </h1>
        <Button
          onClick={handleExport}
          variant="default"
          className="bg-green-600 hover:bg-green-700 text-white border-green-600"
        >
          Export CSV
        </Button>
      </div>

      {/* Stats */}
      {overview && (
        <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-5">
          {stats.map((s) => (
            <div
              key={s.label}
              className="rounded-lg border bg-white p-4 shadow-sm"
            >
              <p className="text-sm text-gray-500">{s.label}</p>
              <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Trend Controls */}
      <div className="mb-4 flex items-center gap-4">
        <div className="flex rounded-lg border bg-white">
          {(["daily", "weekly", "monthly"] as const).map((p) => (
            <button
              key={p}
              className={`px-4 py-2 text-sm capitalize ${period === p ? "bg-blue-600 text-white" : "text-gray-600 hover:bg-gray-50"} ${p === "daily" ? "rounded-l-lg" : ""} ${p === "monthly" ? "rounded-r-lg" : ""}`}
              onClick={() => setPeriod(p)}
            >
              {p}
            </button>
          ))}
        </div>
        <select
          title="Select time range"
          className="rounded-md border px-3 py-2 text-sm"
          value={days}
          onChange={(e) => setDays(Number(e.target.value))}
        >
          <option value={7}>Last 7 days</option>
          <option value={14}>Last 14 days</option>
          <option value={30}>Last 30 days</option>
          <option value={90}>Last 90 days</option>
        </select>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-lg border bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-gray-800">
            Report Trends
          </h2>
          {trends.length > 0 ? (
            <TrendChart data={trends} />
          ) : (
            <p className="text-sm text-gray-400">No trend data available</p>
          )}
        </div>
        <div className="rounded-lg border bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-gray-800">
            Waste Categories
          </h2>
          {categories.length > 0 ? (
            <CategoryPieChart data={categories} />
          ) : (
            <p className="text-sm text-gray-400">No category data available</p>
          )}
        </div>
      </div>

      {/* Barangay Stats Table */}
      <div className="mt-6 rounded-lg border bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-gray-800">
          Reports by Barangay
        </h2>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">
                  Rank
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">
                  Barangay
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">
                  Reports
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">
                  Share
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {barangays.length === 0 ? (
                <tr>
                  <td
                    colSpan={4}
                    className="px-4 py-8 text-center text-gray-400"
                  >
                    No barangay data
                  </td>
                </tr>
              ) : (
                barangays
                  .sort((a, b) => b.count - a.count)
                  .map((b, i) => {
                    const total = barangays.reduce(
                      (sum, x) => sum + x.count,
                      0,
                    );
                    const pct =
                      total > 0 ? ((b.count / total) * 100).toFixed(1) : "0";
                    return (
                      <tr key={b.barangayId} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm text-gray-500">
                          {i + 1}
                        </td>
                        <td className="px-4 py-3 text-sm font-medium text-gray-800">
                          {b.barangayName}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {b.count}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="h-2 flex-1 overflow-hidden rounded-full bg-gray-100">
                              <div
                                className="h-full rounded-full bg-blue-500"
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                            <span className="text-xs text-gray-500">
                              {pct}%
                            </span>
                          </div>
                        </td>
                      </tr>
                    );
                  })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
