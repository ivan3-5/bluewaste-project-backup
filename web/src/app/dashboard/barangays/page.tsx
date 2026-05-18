"use client";

import { useAnalyticsBarangays } from "@/hooks/useAnalytics";
import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { filterAdminBarangaysByName } from "@/lib/adminBarangays";
import { Barangay } from "@/types";
import { Card, CardContent } from "@/components/ui/card";
import { Map, AlertCircle, TrendingUp, BarChart2 } from "lucide-react";
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

  const summaryStats = [
    {
      label: "Total Barangays",
      value: filteredBarangays.length,
      subtitle: "In Panabo City",
      icon: Map,
      cardBg: "from-blue-500 to-indigo-500",
    },
    {
      label: "With Reports",
      value: merged.filter((b) => b.reportCount > 0).length,
      subtitle: "Have active reports",
      icon: AlertCircle,
      cardBg: "from-orange-400 to-amber-400",
    },
    {
      label: "Most Active",
      value: merged[0]?.name || "—",
      subtitle: "Highest report count",
      icon: TrendingUp,
      cardBg: "from-violet-500 to-purple-500",
      isText: true,
    },
    {
      label: "Total Reports",
      value: merged.reduce((s, b) => s + b.reportCount, 0),
      subtitle: "All submitted reports",
      icon: BarChart2,
      cardBg: "from-emerald-500 to-green-500",
    },
  ];

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          Barangay Monitoring
        </h1>
        <p className="text-sm text-gray-600 mt-1">
          {filteredBarangays.length} barangays in Panabo City
        </p>
      </div>

      {/* Summary Cards */}
      <div className="mb-8 grid grid-cols-2 gap-4 md:grid-cols-4">
        {summaryStats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card
              key={stat.label}
              className={`relative overflow-hidden border-0 rounded-2xl bg-gradient-to-br ${stat.cardBg} shadow-[0_14px_26px_rgba(15,23,42,0.20)]`}
            >
              <div className="pointer-events-none absolute -right-7 -top-9 h-28 w-28 rounded-full bg-white/15" />
              <div className="pointer-events-none absolute -right-4 -bottom-10 h-32 w-32 rounded-full bg-white/10" />
              <CardContent className="p-4">
                <div className="absolute right-4 top-4 flex h-12 w-12 items-center justify-center rounded-2xl border border-white/40 bg-white/[0.12] backdrop-blur-sm">
                  <Icon className="h-6 w-6 text-white" />
                </div>
                <p className="text-sm font-semibold text-white/90">
                  {stat.label}
                </p>
                {stat.isText ? (
                  <p className="mt-10 text-xl font-extrabold leading-tight text-white truncate">
                    {stat.value}
                  </p>
                ) : (
                  <p className="mt-10 text-4xl font-extrabold leading-none text-white">
                    {stat.value}
                  </p>
                )}
                <p className="mt-3 text-sm text-white/80">{stat.subtitle}</p>
              </CardContent>
            </Card>
          );
        })}
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
