"use client";

import { useAnalyticsBarangays } from "@/hooks/useAnalytics";
import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { filterAdminBarangaysByName } from "@/lib/adminBarangays";
import { Barangay } from "@/types";
import { Map, AlertCircle, TrendingUp, Info } from "lucide-react";
import {
  BarangayCardsSkeleton,
  PageHeadingSkeleton,
  StatsCardsSkeleton,
} from "@/components/skeletons/page-skeletons";

export default function BarangaysPage() {
  const { data: stats = [], isLoading: isLoadingStats } =
    useAnalyticsBarangays();
  const { data: barangays = [], isLoading: isLoadingBarangays } = useQuery<
    Barangay[]
  >({
    queryKey: ["barangays"],
    queryFn: async () => {
      const { data } = await api.get("/barangays");
      return data;
    },
  });

  const isInitialLoading = isLoadingStats || isLoadingBarangays;

  if (isInitialLoading) {
    return (
      <div className="space-y-8">
        <PageHeadingSkeleton />
        <StatsCardsSkeleton count={4} />
        <BarangayCardsSkeleton cards={6} />
      </div>
    );
  }

  const filteredBarangays = filterAdminBarangaysByName(barangays);

  const merged = filteredBarangays
    .map((b) => {
      const stat = stats.find((s) => s.barangayId === b.id);
      return { ...b, reportCount: stat?.count || b._count?.reports || 0 };
    })
    .sort((a, b) => b.reportCount - a.reportCount);

  const maxReports = Math.max(...merged.map((b) => b.reportCount), 1);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">
          Barangay Monitoring
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          {filteredBarangays.length} barangays in Panabo City
        </p>
      </div>

      {/* Summary Cards */}
      <div className="mb-8 grid grid-cols-2 gap-4 md:grid-cols-4">
        <div className="group relative overflow-hidden rounded-xl border bg-white p-5 shadow-sm transition-all hover:border-blue-200">
          <div className="absolute -bottom-4 -right-4 z-0 text-blue-900 opacity-[0.03] transition-transform duration-500 group-hover:scale-110 group-hover:opacity-[0.06]">
            <Map size={90} strokeWidth={1.5} />
          </div>
          <div className="relative z-10">
            <p className="text-sm font-medium text-gray-500">Total Barangays</p>
            <p className="mt-1 text-3xl font-bold text-gray-800">
              {filteredBarangays.length}
            </p>
          </div>
        </div>
        <div className="group relative overflow-hidden rounded-xl border bg-white p-5 shadow-sm transition-all hover:border-blue-200">
          <div className="absolute -bottom-4 -right-4 z-0 text-blue-900 opacity-[0.03] transition-transform duration-500 group-hover:scale-110 group-hover:opacity-[0.06]">
            <AlertCircle size={90} strokeWidth={1.5} />
          </div>
          <div className="relative z-10">
            <p className="text-sm font-medium text-gray-500">With Reports</p>
            <p className="mt-1 text-3xl font-bold text-blue-600">
              {merged.filter((b) => b.reportCount > 0).length}
            </p>
          </div>
        </div>
        <div className="group relative overflow-hidden rounded-xl border bg-white p-5 shadow-sm transition-all hover:border-blue-200">
          <div className="absolute -bottom-4 -right-4 z-0 text-blue-900 opacity-[0.03] transition-transform duration-500 group-hover:scale-110 group-hover:opacity-[0.06]">
            <TrendingUp size={90} strokeWidth={1.5} />
          </div>
          <div className="relative z-10">
            <p className="text-sm font-medium text-gray-500">Most Active</p>
            <p className="mt-1 text-xl font-bold text-gray-800 truncate pt-1.5">
              {merged[0]?.name || "—"}
            </p>
          </div>
        </div>
        <div className="group relative overflow-hidden rounded-xl border bg-white p-5 shadow-sm transition-all hover:border-blue-200">
          <div className="absolute -bottom-4 -right-4 z-0 text-blue-900 opacity-[0.03] transition-transform duration-500 group-hover:scale-110 group-hover:opacity-[0.06]">
            <Info size={90} strokeWidth={1.5} />
          </div>
          <div className="relative z-10">
            <p className="text-sm font-medium text-gray-500">Total Reports</p>
            <p className="mt-1 text-3xl font-bold text-gray-800">
              {merged.reduce((s, b) => s + b.reportCount, 0)}
            </p>
          </div>
        </div>
      </div>

      {/* Barangay Grid */}
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
        {merged.map((b, i) => (
          <div
            key={b.id}
            className="group relative overflow-hidden rounded-xl border bg-white p-5 shadow-sm transition-all hover:border-blue-300 hover:shadow-md"
          >
            {/* Transparent Background Icon */}
            <div className="absolute -bottom-6 -right-6 z-0 text-gray-900 opacity-[0.04] transition-transform duration-500 group-hover:scale-110 group-hover:text-blue-900 group-hover:opacity-[0.08]">
              <Map size={130} strokeWidth={1.5} />
            </div>

            <div className="relative z-10 flex items-start justify-between">
              <div>
                <h3 className="text-lg font-bold text-gray-800 group-hover:text-blue-700 transition-colors">
                  {b.name}
                </h3>
                <p className="text-xs font-medium text-gray-400 mt-1">
                  {b.latitude.toFixed(4)}, {b.longitude.toFixed(4)}
                </p>
              </div>
              <span
                className={`rounded-full px-2.5 py-1 text-xs font-bold ${
                  b.reportCount === 0
                    ? "bg-green-100/80 text-green-700"
                    : b.reportCount <= 3
                      ? "bg-yellow-100/80 text-yellow-700"
                      : "bg-red-100/80 text-red-700"
                }`}
              >
                {b.reportCount} reports
              </span>
            </div>
            <div className="relative z-10 mt-4">
              <div className="h-2.5 overflow-hidden rounded-full bg-gray-100/80 backdrop-blur-sm">
                <div
                  className="h-full rounded-full bg-blue-500 transition-all duration-1000 ease-out"
                  style={{ width: `${(b.reportCount / maxReports) * 100}%` }}
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
