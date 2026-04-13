"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  useAnalyticsOverview,
  useAnalyticsTrends,
  useAnalyticsCategories,
  useAnalyticsBarangays,
} from "@/hooks/useAnalytics";
import { useReports } from "@/hooks/useReports";
import { StatusBadge } from "@/components/reports/StatusBadge";
import { formatDateTime } from "@/lib/utils";
import { FileText, Clock, CheckCircle, TrendingUp } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import dynamic from "next/dynamic";
import { AdminOverviewSkeleton } from "@/components/skeletons/page-skeletons";

const TrendChart = dynamic(() => import("@/components/analytics/TrendChart"), {
  ssr: false,
});
const CategoryPieChart = dynamic(
  () => import("@/components/analytics/CategoryPieChart"),
  { ssr: false },
);

export default function DashboardPage() {
  const { data: overview, isLoading: overviewLoading } = useAnalyticsOverview();
  const { data: trends, isLoading: trendsLoading } = useAnalyticsTrends(
    "daily",
    30,
  );
  const { data: categories, isLoading: categoriesLoading } =
    useAnalyticsCategories();
  const { data: barangays, isLoading: barangaysLoading } =
    useAnalyticsBarangays();
  const { data: recentReports, isLoading: recentReportsLoading } = useReports({
    page: 1,
    limit: 5,
  });

  const isInitialLoading =
    overviewLoading ||
    trendsLoading ||
    categoriesLoading ||
    barangaysLoading ||
    recentReportsLoading;

  const stats = [
    {
      label: "Total Reports",
      value: overview?.total || 0,
      icon: FileText,
      subtitle: "All submitted reports",
      cardBg: "from-blue-500 to-indigo-500",
    },
    {
      label: "Pending",
      value: overview?.pending || 0,
      icon: Clock,
      subtitle: "Needs review",
      cardBg: "from-orange-400 to-amber-400",
    },
    {
      label: "In Progress",
      value: overview?.inProgress || 0,
      icon: TrendingUp,
      subtitle: "Currently being handled",
      cardBg: "from-violet-500 to-purple-500",
    },
    {
      label: "Cleaned",
      value: overview?.cleaned || 0,
      icon: CheckCircle,
      subtitle: "Successfully resolved",
      cardBg: "from-emerald-500 to-green-500",
    },
  ];

  if (isInitialLoading) {
    return <AdminOverviewSkeleton />;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard Overview</h1>
        <p className="text-gray-600">
          Waste management statistics for Panabo City
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card
              key={stat.label}
              className={`relative overflow-hidden border-0 rounded-2xl bg-gradient-to-br ${stat.cardBg} shadow-[0_14px_26px_rgba(15,23,42,0.20)]`}
            >
              <div className="pointer-events-none absolute -right-7 -top-9 h-28 w-28 rounded-full bg-white/15" />
              <div className="pointer-events-none absolute -right-4 -bottom-10 h-32 w-32 rounded-full bg-white/10" />
              <CardContent className="p-4">
                <div className="absolute right-4 top-4 flex h-12 w-12 items-center justify-center rounded-2xl border border-white/40 bg-white/12 backdrop-blur-sm">
                  <Icon className="h-6 w-6 text-white" />
                </div>
                <p className="text-sm font-semibold text-white/90">
                  {stat.label}
                </p>
                <p className="mt-10 text-4xl font-extrabold leading-none text-white">
                  {stat.value}
                </p>
                <p className="mt-3 text-sm text-white/80">{stat.subtitle}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              Report Trends (Last 30 Days)
            </CardTitle>
          </CardHeader>
          <CardContent>{trends && <TrendChart data={trends} />}</CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              Waste Category Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            {categories && <CategoryPieChart data={categories} />}
          </CardContent>
        </Card>
      </div>

      {/* Recent Reports & Top Barangays */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Reports */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">Recent Reports</CardTitle>
            <Link href="/dashboard/reports">
              <Button variant="default" size="sm" className="h-8 px-3">
                View All
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentReports?.data.map((report) => (
                <Link
                  key={report.id}
                  href={`/dashboard/report?id=${report.id}`}
                  className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {report.title}
                    </p>
                    <p className="text-xs text-gray-500">
                      {formatDateTime(report.createdAt)}
                      {report.barangay?.name && (
                        <span className="inline-block ml-3 text-xs text-gray-400">
                          • {report.barangay.name}
                        </span>
                      )}
                    </p>
                  </div>
                  <StatusBadge status={report.status} />
                </Link>
              ))}
              {(!recentReports || recentReports.data.length === 0) && (
                <p className="text-sm text-gray-500 text-center py-4">
                  No reports yet
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Top Barangays */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Top Barangays by Reports</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {barangays?.slice(0, 10).map((brgy, idx) => (
                <div
                  key={brgy.barangayId}
                  className="flex items-center justify-between"
                >
                  <div className="flex items-center space-x-3">
                    <span
                      className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                        idx < 3
                          ? "bg-red-100 text-red-700"
                          : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {idx + 1}
                    </span>
                    <span className="text-sm text-gray-700">
                      {brgy.barangayName}
                    </span>
                  </div>
                  <span className="text-sm font-semibold text-gray-900">
                    {brgy.count}
                  </span>
                </div>
              ))}
              {(!barangays || barangays.length === 0) && (
                <p className="text-sm text-gray-500 text-center py-4">
                  No data
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
