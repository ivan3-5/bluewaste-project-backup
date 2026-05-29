import { Manrope } from "next/font/google";
import {
  FileText,
  Clock,
  Loader2,
  CheckCircle2,
  TrendingUp,
} from "lucide-react";

const manrope = Manrope({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

const statCards = [
  {
    label: "Total Reports",
    value: 0,
    caption: "All submitted reports",
    icon: FileText,
    gradient: "from-blue-500 via-blue-500 to-indigo-500",
  },
  {
    label: "Pending",
    value: 0,
    caption: "Needs review",
    icon: Clock,
    gradient: "from-orange-400 via-amber-400 to-yellow-400",
  },
  {
    label: "In Progress",
    value: 0,
    caption: "Currently being handled",
    icon: Loader2,
    gradient: "from-violet-500 via-purple-500 to-fuchsia-500",
  },
  {
    label: "Cleaned",
    value: 0,
    caption: "Successfully resolved",
    icon: CheckCircle2,
    gradient: "from-emerald-500 via-green-500 to-lime-500",
  },
];

const trendBars = [20, 32, 18, 42, 36, 28, 52, 38, 30, 46, 34, 40];

const categoryLegend = [
  { label: "Plastic", value: 0, color: "bg-blue-500" },
  { label: "Organic", value: 0, color: "bg-emerald-500" },
  { label: "Metal", value: 0, color: "bg-amber-500" },
  { label: "Glass", value: 0, color: "bg-cyan-500" },
];

export default function DashboardPage() {
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
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
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
                <TrendingUp className="h-4 w-4 text-blue-500" />
                +0% from last period
              </div>
            </div>

            <div className="relative mt-6 h-56 overflow-hidden rounded-xl border border-slate-100 bg-gradient-to-br from-slate-50 via-white to-slate-50">
              <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,rgba(148,163,184,0.16)_1px,transparent_1px),linear-gradient(to_bottom,rgba(148,163,184,0.16)_1px,transparent_1px)] bg-[size:36px_36px]" />
              <div className="absolute inset-x-6 bottom-6 flex h-40 items-end gap-3">
                {trendBars.map((value, idx) => (
                  <div
                    key={`bar-${idx}`}
                    className="flex-1 rounded-full bg-gradient-to-t from-blue-500 via-blue-400 to-cyan-300 shadow-[0_6px_14px_rgba(37,99,235,0.25)]"
                    style={{ height: `${value}%` }}
                  />
                ))}
              </div>
              <div className="absolute left-6 top-4 text-xs font-medium text-slate-400">
                30 days
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
                <div
                  className="absolute inset-0 rounded-full"
                  style={{
                    background:
                      "conic-gradient(#3b82f6 0deg 90deg, #22c55e 90deg 160deg, #f59e0b 160deg 250deg, #06b6d4 250deg 360deg)",
                  }}
                />
                <div className="absolute inset-6 rounded-full bg-white shadow-[inset_0_0_0_10px_rgba(241,245,249,0.8)]" />
                <div className="absolute inset-0 flex items-center justify-center text-sm font-semibold text-slate-500">
                  0 reports
                </div>
              </div>

              <div className="space-y-3">
                {categoryLegend.map((item) => (
                  <div
                    key={item.label}
                    className="flex items-center justify-between text-sm text-slate-600"
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className={`h-2.5 w-2.5 rounded-full ${item.color}`}
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
      </div>
    </div>
  );
}
