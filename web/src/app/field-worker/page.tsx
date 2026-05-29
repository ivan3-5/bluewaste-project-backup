"use client";

import { useMemo } from "react";
import Link from "next/link";
import {
  ClipboardList,
  Clock,
  CheckCircle2,
  ListChecks,
  ArrowRight,
  MapPin,
  TrendingUp,
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
  const activeTaskReports = allReports.filter(
    (r) => r.status !== "CLEANED" && r.status !== "REJECTED",
  );
  const activeTaskCount = activeTaskReports.length;
  const activeTasks = activeTaskReports.slice(0, 5);

  const statusCounts = useMemo(() => {
    return allReports.reduce(
      (acc, report) => {
        if (report.status in acc) {
          acc[report.status as keyof typeof acc] += 1;
        }
        return acc;
      },
      {
        VERIFIED: 0,
        CLEANUP_SCHEDULED: 0,
        IN_PROGRESS: 0,
        CLEANED: 0,
      },
    );
  }, [allReports]);

  const statusSegments = useMemo(
    () => [
      {
        label: "Verified",
        value: statusCounts.VERIFIED,
        color: "#3b82f6",
        dot: "bg-blue-500",
      },
      {
        label: "Scheduled",
        value: statusCounts.CLEANUP_SCHEDULED,
        color: "#8b5cf6",
        dot: "bg-violet-500",
      },
      {
        label: "In Progress",
        value: statusCounts.IN_PROGRESS,
        color: "#f97316",
        dot: "bg-orange-500",
      },
      {
        label: "Cleaned",
        value: statusCounts.CLEANED,
        color: "#22c55e",
        dot: "bg-emerald-500",
      },
    ],
    [statusCounts],
  );

  const statusTotal = statusSegments.reduce(
    (sum, segment) => sum + segment.value,
    0,
  );

  const statusGradient = useMemo(() => {
    if (statusTotal === 0) {
      return "conic-gradient(#e2e8f0 0deg 360deg)";
    }

    let start = 0;
    const slices = statusSegments.map((segment) => {
      const angle = (segment.value / statusTotal) * 360;
      const end = start + angle;
      const slice = `${segment.color} ${start}deg ${end}deg`;
      start = end;
      return slice;
    });

    if (start < 360) {
      slices.push(`#e2e8f0 ${start}deg 360deg`);
    }

    return `conic-gradient(${slices.join(",")})`;
  }, [statusSegments, statusTotal]);

  const trendBuckets = useMemo(() => {
    const buckets = Array.from({ length: 12 }, () => 0);
    const now = Date.now();

    allReports.forEach((report) => {
      const createdAt = new Date(report.createdAt).getTime();
      if (!Number.isFinite(createdAt)) return;
      const diffDays = Math.floor((now - createdAt) / 86400000);
      if (diffDays >= 0 && diffDays < buckets.length) {
        buckets[buckets.length - 1 - diffDays] += 1;
      }
    });

    return buckets;
  }, [allReports]);

  const trendMax = Math.max(...trendBuckets, 1);
  const hasTrendData = trendBuckets.some((value) => value > 0);
  const unreadCount = unreadData?.count || 0;

  const statCards = [
    {
      label: "Total Assigned",
      value: totalAssigned,
      caption: "All tasks assigned to you",
      icon: ClipboardList,
      gradient: "from-blue-500 via-blue-500 to-indigo-500",
    },
    {
      label: "Active Tasks",
      value: activeTaskCount,
      caption: "Pending and in progress",
      icon: ListChecks,
      gradient: "from-violet-500 via-purple-500 to-fuchsia-500",
    },
    {
      label: "In Progress",
      value: inProgressCount,
      caption: "Currently being handled",
      icon: Clock,
      gradient: "from-orange-400 via-amber-400 to-yellow-400",
    },
    {
      label: "Completed",
      value: completedCount,
      caption: "Cleanups marked done",
      icon: CheckCircle2,
      gradient: "from-emerald-500 via-green-500 to-lime-500",
    },
  ];

  const stats = [
    {
      label: "Total Assigned",
      value: totalAssigned,
      icon: ClipboardList,
      color: "text-blue-600 bg-blue-50",
    },
    {
      label: "Active Tasks",
      value: activeTaskCount,
      icon: ListChecks,
      color: "text-teal-600 bg-teal-50",
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

  if (loadingAll) {
    return (
      <div className="space-y-6">
        <PageHeadingSkeleton />
        <StatsCardsSkeleton count={4} />
        <div className="grid gap-6 lg:grid-cols-[1.35fr_1fr]">
          <div className="rounded-2xl border bg-white p-6 space-y-4">
            <Skeleton className="h-5 w-44" />
            <Skeleton className="h-3 w-32" />
            <Skeleton className="h-44 w-full" />
          </div>
          <div className="rounded-2xl border bg-white p-6 space-y-4">
            <Skeleton className="h-5 w-48" />
            <Skeleton className="h-3 w-36" />
            <div className="flex items-center justify-center">
              <Skeleton className="h-40 w-40 rounded-full" />
            </div>
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <Skeleton className="h-2.5 w-2.5 rounded-full" />
                  <Skeleton className="h-3 w-24" />
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="rounded-2xl border bg-white p-6">
          <ListCardsSkeleton rows={5} />
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -left-24 top-6 h-56 w-56 rounded-full bg-blue-100/70 blur-3xl" />
        <div className="absolute right-8 top-16 h-40 w-40 rounded-full bg-emerald-100/70 blur-3xl" />
        <div className="absolute left-1/3 top-72 h-56 w-56 rounded-full bg-orange-100/50 blur-3xl" />
      </div>

      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold text-slate-900">
              Field Worker Dashboard
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Assigned tasks and cleanup progress overview
            </p>
          </div>
          <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-white/80 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-slate-500 shadow-sm">
            <span
              className={`h-2 w-2 rounded-full ${
                unreadCount > 0 ? "bg-orange-500" : "bg-emerald-500"
              }`}
            />
            {unreadCount > 0 ? `${unreadCount} unread alerts` : "All caught up"}
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {statCards.map((card, index) => {
            const Icon = card.icon;
            return (
              <div
                key={card.label}
                className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${card.gradient} p-5 text-white shadow-[0_16px_30px_rgba(15,23,42,0.18)] transition-all duration-300 hover:-translate-y-1 ${
                  index < 2
                    ? "animate-in fade-in slide-in-from-bottom-4"
                    : "animate-in fade-in slide-in-from-bottom-6"
                }`}
              >
                <div className="pointer-events-none absolute -right-8 -top-10 h-28 w-28 rounded-full bg-white/20" />
                <div className="pointer-events-none absolute -right-4 -bottom-12 h-32 w-32 rounded-full bg-white/10" />
                <div className="flex items-start justify-between">
                  <p className="text-sm font-semibold text-white/90">
                    {card.label}
                  </p>
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/30 bg-white/15 backdrop-blur">
                    <Icon className="h-5 w-5" />
                  </div>
                </div>
                <p className="mt-8 text-4xl font-semibold leading-none">
                  {card.value}
                </p>
                <p className="mt-2 text-sm text-white/80">{card.caption}</p>
              </div>
            );
          })}
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.35fr_1fr]">
          <div className="rounded-2xl border border-slate-200 bg-white/90 p-6 shadow-[0_18px_40px_rgba(15,23,42,0.08)]">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">
                  Task Activity (Last 12 Days)
                </h2>
                <p className="text-xs text-slate-500">
                  Assignments received over time
                </p>
              </div>
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
                <TrendingUp className="h-4 w-4 text-blue-500" />
                {totalAssigned > 0 ? "Active flow" : "No recent activity"}
              </div>
            </div>

            <div className="relative mt-6 h-56 overflow-hidden rounded-xl border border-slate-100 bg-gradient-to-br from-slate-50 via-white to-slate-50">
              <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,rgba(148,163,184,0.16)_1px,transparent_1px),linear-gradient(to_bottom,rgba(148,163,184,0.16)_1px,transparent_1px)] bg-[size:36px_36px]" />
              <div className="absolute inset-x-6 bottom-6 flex h-40 items-end gap-3">
                {trendBuckets.map((value, idx) => (
                  <div
                    key={`bar-${idx}`}
                    className="flex-1 rounded-full bg-gradient-to-t from-blue-500 via-blue-400 to-cyan-300 shadow-[0_6px_14px_rgba(37,99,235,0.25)]"
                    style={{
                      height: `${Math.round((value / trendMax) * 100)}%`,
                    }}
                  />
                ))}
              </div>
              {!hasTrendData && (
                <div className="absolute inset-0 flex items-center justify-center text-xs font-medium text-slate-400">
                  No activity yet
                </div>
              )}
              <div className="absolute left-6 top-4 text-xs font-medium text-slate-400">
                12 days
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white/90 p-6 shadow-[0_18px_40px_rgba(15,23,42,0.08)]">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">
                Status Breakdown
              </h2>
              <p className="text-xs text-slate-500">
                Current task distribution
              </p>
            </div>

            <div className="mt-8 flex flex-col gap-6">
              <div className="relative mx-auto h-44 w-44">
                <div
                  className="absolute inset-0 rounded-full"
                  style={{ background: statusGradient }}
                />
                <div className="absolute inset-6 rounded-full bg-white shadow-[inset_0_0_0_10px_rgba(241,245,249,0.8)]" />
                <div className="absolute inset-0 flex items-center justify-center text-sm font-semibold text-slate-500">
                  {statusTotal === 0 ? "0 tasks" : `${statusTotal} tasks`}
                </div>
              </div>

              <div className="space-y-3">
                {statusSegments.map((item) => (
                  <div
                    key={item.label}
                    className="flex items-center justify-between text-sm text-slate-600"
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className={`h-2.5 w-2.5 rounded-full ${item.dot}`}
                      />
                      {item.label}
                    </div>
                    <span className="font-semibold text-slate-700">
                      {item.value}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white/90 p-6 shadow-[0_18px_40px_rgba(15,23,42,0.08)]">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">
                Active Tasks
              </h2>
              <p className="text-xs text-slate-500">
                Latest assignments requiring attention
              </p>
            </div>
            <Link href="/field-worker/tasks">
              <Button size="sm">View All Tasks</Button>
            </Link>
          </div>

          {activeTasks.length === 0 ? (
            <div className="mt-6 rounded-xl border border-dashed border-slate-200 bg-slate-50/80 px-6 py-10 text-center">
              <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-400" />
              <p className="mt-3 text-sm font-medium text-slate-600">
                No active tasks right now
              </p>
              <p className="mt-1 text-xs text-slate-400">
                Check back later for new assignments
              </p>
            </div>
          ) : (
            <div className="mt-6">
              <div className="hidden border-b border-slate-200 pb-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400 md:grid md:grid-cols-[2fr_1.2fr_1.4fr_0.8fr]">
                <span>Task</span>
                <span>Status</span>
                <span>Location</span>
                <span className="text-right">Updated</span>
              </div>
              <div className="divide-y">
                {activeTasks.map((report: Report) => (
                  <Link
                    key={report.id}
                    href={`/field-worker/tasks/${report.id}`}
                    className="block py-4 transition-colors hover:bg-slate-50"
                  >
                    <div className="flex flex-col gap-3 md:grid md:grid-cols-[2fr_1.2fr_1.4fr_0.8fr] md:items-center">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-900 truncate">
                          {report.title}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          {WASTE_CATEGORY_LABELS[report.category]}
                        </p>
                      </div>
                      <div>
                        <StatusBadge status={report.status} />
                      </div>
                      <div className="flex items-center gap-2 text-xs text-slate-500">
                        <MapPin className="h-3.5 w-3.5" />
                        <span className="truncate">
                          {report.address || "No address"}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-3 text-xs text-slate-500 md:justify-end">
                        <span>{timeAgo(report.createdAt)}</span>
                        <ArrowRight className="h-4 w-4 text-slate-400" />
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
