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
import {
  ChartPanelsSkeleton,
  DataTableSkeleton,
  PageHeadingSkeleton,
  StatsCardsSkeleton,
} from "@/components/skeletons/page-skeletons";
import { Skeleton } from "@/components/ui/skeleton";
import { FileText, Clock, TrendingUp, CheckCircle } from "lucide-react";

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

  const { data: overview, isLoading: overviewLoading } = useAnalyticsOverview();
  const { data: trends = [], isLoading: trendsLoading } = useAnalyticsTrends(
    period,
    days,
  );
  const { data: categories = [], isLoading: categoriesLoading } =
    useAnalyticsCategories();
  const { data: barangays = [], isLoading: barangaysLoading } =
    useAnalyticsBarangays();

  const isInitialLoading =
    overviewLoading || trendsLoading || categoriesLoading || barangaysLoading;

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
          icon: FileText,
          subtitle: "All submitted reports",
          cardBg: "from-blue-500 to-indigo-500",
        },
        {
          label: "Pending",
          value: overview.pending,
          icon: Clock,
          subtitle: "Needs review",
          cardBg: "from-orange-400 to-amber-400",
        },
        {
          label: "In Progress",
          value: overview.inProgress,
          icon: TrendingUp,
          subtitle: "Currently being handled",
          cardBg: "from-violet-500 to-purple-500",
        },
        {
          label: "Cleaned",
          value: overview.cleaned,
          icon: CheckCircle,
          subtitle: "Successfully resolved",
          cardBg: "from-emerald-500 to-green-500",
        },
      ]
    : [];

  if (isInitialLoading) {
    return (
      <div className="space-y-6">
        <div className="mb-6 flex items-center justify-between">
          <PageHeadingSkeleton withSubtitle={false} />
          <Skeleton className="h-10 w-28 rounded-md" />
        </div>
        <StatsCardsSkeleton count={4} />
        <ChartPanelsSkeleton />
        <DataTableSkeleton rows={6} cols={4} className="mt-6" />
      </div>
    );
  }

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
        <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-4">
          {stats.map((s) => {
            const Icon = s.icon;

            return (
              <div
                key={s.label}
                className={`relative overflow-hidden rounded-2xl border-0 bg-gradient-to-br ${s.cardBg} p-4 shadow-[0_14px_26px_rgba(15,23,42,0.20)]`}
              >
                <div className="pointer-events-none absolute -right-7 -top-9 h-28 w-28 rounded-full bg-white/15" />
                <div className="pointer-events-none absolute -right-4 -bottom-10 h-32 w-32 rounded-full bg-white/10" />
                <div className="absolute right-4 top-4 flex h-12 w-12 items-center justify-center rounded-2xl border border-white/40 bg-white/12 backdrop-blur-sm">
                  <Icon className="h-6 w-6 text-white" />
                </div>
                <p className="text-sm font-semibold text-white/90">{s.label}</p>
                <p className="mt-10 text-4xl font-extrabold leading-none text-white">
                  {s.value}
                </p>
                <p className="mt-3 text-sm text-white/80">{s.subtitle}</p>
              </div>
            );
          })}
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
