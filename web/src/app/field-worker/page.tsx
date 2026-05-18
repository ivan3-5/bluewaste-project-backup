"use client";

import Link from "next/link";
import {
  ClipboardList,
  Clock,
  CheckCircle2,
  ArrowRight,
  MapPin,
} from "lucide-react";
import { useAssignedReports } from "@/hooks/useReports";
import { useUnreadCount } from "@/hooks/useNotifications";
import { StatusBadge } from "@/components/reports/StatusBadge";
import { Button } from "@/components/ui/button";
import { WASTE_CATEGORY_LABELS, Report } from "@/types";
import { timeAgo } from "@/lib/utils";
import {
  ListCardsSkeleton,
  PageHeadingSkeleton,
  StatsCardsSkeleton,
} from "@/components/skeletons/page-skeletons";
import { Skeleton } from "@/components/ui/skeleton";

export default function FieldWorkerDashboard() {
  const { data: allData, isLoading: loadingAll } = useAssignedReports({});
  const { data: inProgressData } = useAssignedReports({
    status: "IN_PROGRESS",
  });
  const { data: unreadData } = useUnreadCount();

  const allReports = allData?.data || [];
  const totalAssigned = allData?.pagination?.total || 0;
  const inProgressCount = inProgressData?.pagination?.total || 0;
  const completedCount = allReports.filter(
    (r) => r.status === "CLEANED",
  ).length;

  // Active tasks: not yet cleaned or rejected
  const activeTasks = allReports
    .filter((r) => r.status !== "CLEANED" && r.status !== "REJECTED")
    .slice(0, 5);

  const stats = [
    {
      label: "Total Assigned",
      value: totalAssigned,
      icon: ClipboardList,
      color: "text-blue-600 bg-blue-50",
    },
    {
      label: "In Progress",
      value: inProgressCount,
      icon: Clock,
      color: "text-orange-600 bg-orange-50",
    },
    {
      label: "Completed",
      value: completedCount,
      icon: CheckCircle2,
      color: "text-green-600 bg-green-50",
    },
  ];
  ];

  if (loadingAll) {
    return (
      <div className="space-y-6">
        <PageHeadingSkeleton />
        <StatsCardsSkeleton count={4} />
        <ListCardsSkeleton rows={5} />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {Array.from({ length: 2 }).map((_, idx) => (
            <div key={idx} className="rounded-xl border bg-white p-5 space-y-2">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-3 w-48" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Field Worker Dashboard
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Overview of your assigned tasks and cleanup activities
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map(({ label, value, icon: Icon, color }) => (
          <div
            key={label}
            className="bg-white rounded-xl border p-4 hover:shadow-sm transition-shadow"
          >
            <div className="flex items-center gap-3">
              <div
                className={`w-10 h-10 rounded-lg flex items-center justify-center ${color}`}
              >
                <Icon className="w-5 h-5" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{value}</p>
                <p className="text-xs text-gray-500">{label}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Notifications Banner */}
      {unreadData && unreadData.count > 0 && (
        <Link
          href="/field-worker/notifications"
          className="flex items-center justify-between bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 hover:bg-blue-100 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
              <span className="text-white text-xs font-bold">
                {unreadData.count}
              </span>
            </div>
            <span className="text-sm font-medium text-blue-800">
              You have {unreadData.count} unread notification
              {unreadData.count > 1 ? "s" : ""}
            </span>
          </div>
          <ArrowRight className="w-4 h-4 text-blue-600" />
        </Link>
      )}

      {/* Active Tasks */}
      <div className="bg-white rounded-xl border">
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <h2 className="text-base font-semibold text-gray-900">
            Active Tasks
          </h2>
          <Link href="/field-worker/tasks">
            <Button size="sm">View All Tasks</Button>
          </Link>
        </div>

        {activeTasks.length === 0 ? (
          <div className="text-center py-12 px-4">
            <CheckCircle2 className="w-12 h-12 text-green-300 mx-auto mb-3" />
            <p className="text-gray-500 text-sm">
              No active tasks. You&apos;re all caught up!
            </p>
          </div>
        ) : (
          <div className="divide-y">
            {activeTasks.map((report: Report) => (
              <Link
                key={report.id}
                href={`/field-worker/tasks/${report.id}`}
                className="flex items-start gap-4 px-5 py-4 hover:bg-gray-50 transition-colors"
              >
                <div
                  className="mt-1 w-2 h-2 rounded-full flex-shrink-0 bg-gray-400"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {report.title}
                    </p>
                    <StatusBadge status={report.status} />
                  </div>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500">
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      {report.barangay?.name || report.address || "No address"}
                    </span>
                    <span>{WASTE_CATEGORY_LABELS[report.category]}</span>
                    <span>{timeAgo(report.createdAt)}</span>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-gray-400 flex-shrink-0 mt-2" />
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Link
          href="/field-worker/map"
          className="flex items-center gap-4 bg-white rounded-xl border p-5 hover:shadow-sm transition-shadow group"
        >
          <div className="w-12 h-12 bg-teal-50 rounded-xl flex items-center justify-center group-hover:bg-teal-100 transition-colors">
            <MapPin className="w-6 h-6 text-teal-600" />
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900">
              View Waste Map
            </p>
            <p className="text-xs text-gray-500">
              See waste hotspots and report locations
            </p>
          </div>
        </Link>
        <Link
          href="/field-worker/tasks"
          className="flex items-center gap-4 bg-white rounded-xl border p-5 hover:shadow-sm transition-shadow group"
        >
          <div className="w-12 h-12 bg-purple-50 rounded-xl flex items-center justify-center group-hover:bg-purple-100 transition-colors">
            <ClipboardList className="w-6 h-6 text-purple-600" />
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900">Manage Tasks</p>
            <p className="text-xs text-gray-500">
              Update task status and upload cleanup photos
            </p>
          </div>
        </Link>
      </div>
    </div>
  );
}
