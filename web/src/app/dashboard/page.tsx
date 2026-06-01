"use client";

import { useMemo } from "react";
import { Manrope } from "next/font/google";
import {
  FileText,
  Clock,
  Loader2,
  CheckCircle2,
  TrendingUp,
} from "lucide-react";
import { useDashboardOverview } from "@/hooks/useAnalytics";
import {
  WASTE_CATEGORY_COLORS,
  WASTE_CATEGORY_LABELS,
  WasteCategory,
} from "@/types";

const manrope = Manrope({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

const EMPTY_OVERVIEW = {
  total: 0,
  pending: 0,
  verified: 0,
  cleanupScheduled: 0,
  inProgress: 0,
  cleaned: 0,
  rejected: 0,
};

const BAR_HEIGHT_CLASSES = [
  "h-0",
  "h-[8%]",
  "h-[16%]",
  "h-[24%]",
  "h-[32%]",
  "h-[40%]",
  "h-[48%]",
  "h-[56%]",
  "h-[64%]",
  "h-[72%]",
  "h-[80%]",
  "h-[88%]",
  "h-[96%]",
];

const CATEGORY_DOT_CLASSES: Record<WasteCategory, string> = {
  WITH_WASTE: "bg-red-500",
  NO_WASTE: "bg-green-500",
};

const formatPercent = (value: number) => {
  const abs = Math.abs(value);
  const fixed = abs % 1 === 0 ? abs.toFixed(0) : abs.toFixed(1);
  const sign = value < 0 ? "-" : "+";
  return `${sign}${fixed}%`;
};

export default function DashboardPage() {
  const { data, isLoading, isFetching } = useDashboardOverview(30);
  const overview = data?.overview ?? EMPTY_OVERVIEW;
  const periodDays = data?.periodDays ?? 30;
  const trendChange = data?.trendChange ?? 0;

  const statCards = useMemo(
    () => [
      {
        label: "Total Reports",
        value: isLoading ? "—" : overview.total,
        caption: "All submitted reports",
        icon: FileText,
        gradient: "from-blue-500 via-blue-500 to-indigo-500",
      },
      {
        label: "Pending",
        value: isLoading ? "—" : overview.pending,
        caption: "Needs review",
        icon: Clock,
        gradient: "from-orange-400 via-amber-400 to-yellow-400",
      },
      {
        label: "In Progress",
        value: isLoading ? "—" : overview.inProgress,
        caption: "Currently being handled",
        icon: Loader2,
        gradient: "from-violet-500 via-purple-500 to-fuchsia-500",
      },
      {
        label: "Cleaned",
        value: isLoading ? "—" : overview.cleaned,
        caption: "Successfully resolved",
        icon: CheckCircle2,
        gradient: "from-emerald-500 via-green-500 to-lime-500",
      },
    ],
    [isLoading, overview],
  );

  const trendValues = useMemo(() => {
    const trends = data?.trends ?? [];
    if (trends.length === 0) {
      return Array.from({ length: periodDays }, () => 0);
    }
    return [...trends]
      .sort((a, b) => a.date.localeCompare(b.date))
      .map((item) => item.count);
  }, [data?.trends, periodDays]);

  const trendMax = Math.max(...trendValues, 1);
  const trendBars = trendValues.map((value) =>
    Math.round((value / trendMax) * 100),
  );

  const categorySegments = useMemo(() => {
    const categories = data?.categories ?? [];
    const categoryMap = new Map(
      categories.map((item) => [item.category, item.count]),
    );
    return (Object.keys(WASTE_CATEGORY_LABELS) as WasteCategory[]).map(
      (category) => ({
        category,
        label: WASTE_CATEGORY_LABELS[category],
        count: categoryMap.get(category) ?? 0,
        color: WASTE_CATEGORY_COLORS[category],
        dotClass: CATEGORY_DOT_CLASSES[category],
      }),
    );
  }, [data?.categories]);

  const categoryTotal = categorySegments.reduce(
    (sum, item) => sum + item.count,
    0,
  );

  const donutSegments = useMemo(() => {
    if (categoryTotal === 0) {
      return [] as Array<{
        category: WasteCategory;
        label: string;
        count: number;
        color: string;
        dotClass: string;
        percent: number;
        offset: number;
      }>;
    }

    let offset = 0;
    return categorySegments.map((segment) => {
      const percent = (segment.count / categoryTotal) * 100;
      const slice = { ...segment, percent, offset };
      offset -= percent;
      return slice;
    });
  }, [categorySegments, categoryTotal]);

  const trendChangeLabel = formatPercent(trendChange);
  const trendChangeClass = trendChange < 0 ? "text-rose-500" : "text-blue-500";

  return (
    <div className={`${manrope.className} relative`}>
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -left-24 top-6 h-56 w-56 rounded-full bg-blue-100/70 blur-3xl" />
        <div className="absolute right-8 top-16 h-40 w-40 rounded-full bg-emerald-100/70 blur-3xl" />
        <div className="absolute left-1/3 top-72 h-56 w-56 rounded-full bg-orange-100/50 blur-3xl" />
      </div>

      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold text-slate-900">
              Dashboard Overview
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Waste management statistics for Panabo City
            </p>
          </div>
          <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-white/80 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-slate-500 shadow-sm">
            <span
              className={`h-2 w-2 rounded-full bg-emerald-500 ${
                isFetching ? "animate-pulse" : ""
              }`}
            />
            Live Updates
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
                  Report Trends (Last 30 Days)
                </h2>
                <p className="text-xs text-slate-500">
                  Daily submissions across the city
                </p>
              </div>
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
                <TrendingUp className={`h-4 w-4 ${trendChangeClass}`} />
                {trendChangeLabel} from last period
              </div>
            </div>

            <div className="relative mt-6 h-56 overflow-hidden rounded-xl border border-slate-100 bg-gradient-to-br from-slate-50 via-white to-slate-50">
              <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,rgba(148,163,184,0.16)_1px,transparent_1px),linear-gradient(to_bottom,rgba(148,163,184,0.16)_1px,transparent_1px)] bg-[size:36px_36px]" />
              <div className="absolute inset-x-6 bottom-6 flex h-40 items-end gap-1">
                {trendBars.map((value, idx) => {
                  const barIndex = Math.min(
                    BAR_HEIGHT_CLASSES.length - 1,
                    Math.round((value / 100) * (BAR_HEIGHT_CLASSES.length - 1)),
                  );
                  return (
                    <div
                      key={`bar-${idx}`}
                      className={`flex-1 rounded-full bg-gradient-to-t from-blue-500 via-blue-400 to-cyan-300 shadow-[0_6px_14px_rgba(37,99,235,0.25)] ${BAR_HEIGHT_CLASSES[barIndex]}`}
                    />
                  );
                })}
              </div>
              <div className="absolute left-6 top-4 text-xs font-medium text-slate-400">
                {periodDays} days
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white/90 p-6 shadow-[0_18px_40px_rgba(15,23,42,0.08)]">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">
                Waste Category Distribution
              </h2>
              <p className="text-xs text-slate-500">
                Breakdown by classification
              </p>
            </div>

            <div className="mt-8 flex flex-col gap-6">
              <div className="relative mx-auto h-44 w-44">
                <svg
                  viewBox="0 0 36 36"
                  className="absolute inset-0 h-full w-full"
                  aria-hidden="true"
                >
                  <g transform="rotate(-90 18 18)">
                    {categoryTotal === 0 ? (
                      <circle
                        cx="18"
                        cy="18"
                        r="15.9155"
                        fill="transparent"
                        stroke="#e2e8f0"
                        strokeWidth="3.5"
                      />
                    ) : (
                      donutSegments.map((segment) => (
                        <circle
                          key={segment.category}
                          cx="18"
                          cy="18"
                          r="15.9155"
                          fill="transparent"
                          stroke={segment.color}
                          strokeWidth="3.5"
                          strokeDasharray={`${segment.percent} ${
                            100 - segment.percent
                          }`}
                          strokeDashoffset={segment.offset}
                        />
                      ))
                    )}
                  </g>
                </svg>
                <div className="absolute inset-6 rounded-full bg-white shadow-[inset_0_0_0_10px_rgba(241,245,249,0.8)]" />
                <div className="absolute inset-0 flex items-center justify-center text-sm font-semibold text-slate-500">
                  {categoryTotal} reports
                </div>
              </div>

              <div className="space-y-3">
                {categorySegments.map((item) => (
                  <div
                    key={item.category}
                    className="flex items-center justify-between text-sm text-slate-600"
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className={`h-2.5 w-2.5 rounded-full ${item.dotClass}`}
                      />
                      {item.label}
                    </div>
                    <span className="font-semibold text-slate-700">
                      {item.count}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
