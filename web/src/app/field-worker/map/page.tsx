"use client";

import { useState, useMemo, useCallback } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useMapData, useHeatmapData } from "@/hooks/useReports";
import { Button } from "@/components/ui/button";
import {
  ReportStatus,
  WasteCategory,
  WASTE_CATEGORY_LABELS,
  REPORT_STATUS_LABELS,
  PRIORITY_LABELS,
  MapReport,
} from "@/types";
import { StatusBadge } from "@/components/reports/StatusBadge";
import { Layers, MapPin, X, ArrowRight } from "lucide-react";
import { timeAgo } from "@/lib/utils";
import {
  MapPanelSkeleton,
  PageHeadingSkeleton,
} from "@/components/skeletons/page-skeletons";

const WasteMap = dynamic(() => import("@/components/map/WasteMap"), {
  ssr: false,
});

const STATUS_PILLS: { value: ReportStatus | ""; label: string }[] = [
  { value: "", label: "All" },
  { value: "PENDING", label: "Pending" },
  { value: "VERIFIED", label: "Verified" },
  { value: "IN_PROGRESS", label: "In Progress" },
  { value: "CLEANED", label: "Cleaned" },
];

const CATEGORY_PILLS: { value: WasteCategory | ""; label: string }[] = [
  { value: "", label: "All Types" },
  ...Object.entries(WASTE_CATEGORY_LABELS).map(([value, label]) => ({
    value: value as WasteCategory,
    label,
  })),
];

export default function FieldWorkerMapPage() {
  const [statusFilter, setStatusFilter] = useState<ReportStatus | "">("");
  const [categoryFilter, setCategoryFilter] = useState<WasteCategory | "">("");
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [selectedReport, setSelectedReport] = useState<MapReport | null>(null);

  const { data: reports = [], isLoading } = useMapData({
    status: statusFilter || undefined,
    category: categoryFilter || undefined,
  });

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    reports.forEach((r) => {
      counts[r.status] = (counts[r.status] || 0) + 1;
    });
    return counts;
  }, [reports]);

  const handleReportClick = useCallback((report: MapReport) => {
    setSelectedReport(report);
  }, []);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <PageHeadingSkeleton />
        <MapPanelSkeleton />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Waste Map</h1>
        <p className="text-sm text-gray-500 mt-1">
          View waste hotspots and report locations in real-time
        </p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border p-4 space-y-3">
        {/* Status pills */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs font-medium text-gray-500 mr-1">
            Status:
          </span>
          {STATUS_PILLS.map(({ value, label }) => {
            const isActive = statusFilter === value;
            const count = value ? statusCounts[value] : reports.length;
            return (
              <button
                key={value}
                onClick={() => setStatusFilter(value)}
                className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                  isActive
                    ? "bg-blue-600 text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {label}
                {count !== undefined && (
                  <span className="ml-1 opacity-70">({count})</span>
                )}
              </button>
            );
          })}
        </div>

        {/* Category + Heatmap toggle */}
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={categoryFilter}
            onChange={(e) =>
              setCategoryFilter(e.target.value as WasteCategory | "")
            }
            title="Filter by waste category"
            className="text-xs border rounded-lg px-2.5 py-1.5 text-gray-600 bg-white"
          >
            {CATEGORY_PILLS.map(({ value, label }) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>

          <Button
            variant={showHeatmap ? "default" : "outline"}
            size="sm"
            onClick={() => setShowHeatmap(!showHeatmap)}
            className="text-xs h-7"
          >
            <Layers className="w-3.5 h-3.5 mr-1" />
            Heatmap
          </Button>

          <span className="text-xs text-gray-400 ml-auto">
            <MapPin className="w-3 h-3 inline mr-1" />
            {reports.length} reports
          </span>
        </div>
      </div>

      {/* Map */}
      <div className="bg-white rounded-xl border overflow-hidden relative">
        <div className="h-[500px] sm:h-[600px]">
          <WasteMap
            reports={reports}
            showHeatmap={showHeatmap}
            onReportClick={handleReportClick}
          />
        </div>

        {/* Selected Report Panel */}
        {selectedReport && (
          <div className="absolute bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:w-80 bg-white rounded-xl border shadow-lg p-4 z-[1000]">
            <div className="flex items-start justify-between mb-2">
              <h3 className="text-sm font-semibold text-gray-900 pr-6 line-clamp-2">
                {selectedReport.title}
              </h3>
              <button
                onClick={() => setSelectedReport(null)}
                title="Close"
                className="p-1 hover:bg-gray-100 rounded transition-colors flex-shrink-0"
              >
                <X className="w-4 h-4 text-gray-400" />
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-2 mb-3">
              <StatusBadge status={selectedReport.status} />
              <span className="text-xs text-gray-500">
                {WASTE_CATEGORY_LABELS[selectedReport.category]}
              </span>
              <span className="text-xs text-gray-400">
                {timeAgo(selectedReport.createdAt)}
              </span>
            </div>

            {selectedReport.barangay && (
              <p className="text-xs text-gray-500 flex items-center gap-1 mb-3">
                <MapPin className="w-3 h-3" />
                {selectedReport.barangay.name}
              </p>
            )}

            {selectedReport.images?.[0] && (
              <div className="mb-3 rounded-lg overflow-hidden border h-32">
                <img
                  src={selectedReport.images[0].imageUrl}
                  alt="Report"
                  className="w-full h-full object-cover"
                />
              </div>
            )}

            <Link href={`/field-worker/tasks/${selectedReport.id}`}>
              <Button size="sm" className="w-full text-xs">
                View Task Details
                <ArrowRight className="w-3.5 h-3.5 ml-1" />
              </Button>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
