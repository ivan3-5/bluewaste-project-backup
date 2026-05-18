"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import dynamic from "next/dynamic";
import { useMapData } from "@/hooks/useReports";
import { useCreateResortArea, useResortAreaes } from "@/hooks/useResortBoxes";
import {
  useReportingZones,
  useCreateReportingZone,
  useDeleteReportingZone,
} from "@/hooks/useReportingZones";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/providers/AuthProvider";
import {
  ReportStatus,
  WasteCategory,
  WASTE_CATEGORY_LABELS,
  REPORT_STATUS_LABELS,
  MapReport,
  ZonePoint,
} from "@/types";
import {
  Layers,
  MapPin,
  X,
  ChevronRight,
  Square,
  PenLine,
  Trash2,
  Eye,
  EyeOff,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { Skeleton } from "@/components/ui/skeleton";

const WasteMap = dynamic(() => import("@/components/map/WasteMap"), {
  ssr: false,
});

const STATUS_PILL_LIST: Array<{
  value: ReportStatus | "";
  label: string;
}> = [
  { value: "", label: "All" },
  { value: "PENDING", label: "Pending" },
  { value: "VERIFIED", label: "Verified" },
  { value: "CLEANUP_SCHEDULED", label: "Scheduled" },
  { value: "IN_PROGRESS", label: "In Progress" },
  { value: "CLEANED", label: "Cleaned" },
  { value: "REJECTED", label: "Rejected" },
];

interface ResortAdminOption {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role?: string;
  isActive?: boolean;
}

export default function MapPage() {
  const { user } = useAuth();
  const isLGUAdmin = user?.role === "LGU_ADMIN";
  const canViewBoxes =
    user?.role === "LGU_ADMIN" || user?.role === "RESORT_ADMIN";

  const [statusFilter, setStatusFilter] = useState<ReportStatus | "">("");
  const [categoryFilter, setCategoryFilter] = useState<WasteCategory | "">("");
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [selectedReport, setSelectedReport] = useState<MapReport | null>(null);
  const [drawMode, setDrawMode] = useState(false);
  const [drawZoneMode, setDrawZoneMode] = useState(false);
  const [hiddenZoneIds, setHiddenZoneIds] = useState<Set<string>>(new Set());
  const [pendingZonePoints, setPendingZonePoints] = useState<
    ZonePoint[] | null
  >(null);
  const [showZoneModal, setShowZoneModal] = useState(false);
  const [zoneName, setZoneName] = useState("");
  const [zoneSaveError, setZoneSaveError] = useState("");
  const [pendingBounds, setPendingBounds] = useState<{
    minLat: number;
    maxLat: number;
    minLng: number;
    maxLng: number;
  } | null>(null);
  const [showBoxModal, setShowBoxModal] = useState(false);
  const [boxName, setBoxName] = useState("");
  const [boxDescription, setBoxDescription] = useState("");
  const [ownerId, setOwnerId] = useState("");
  const [boxSaveError, setBoxSaveError] = useState("");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [mapInstance, setMapInstance] = useState<any>(null);

  const createResortArea = useCreateResortArea();
  const { data: reportingZones = [] } = useReportingZones(false);
  const createZone = useCreateReportingZone();
  const deleteZone = useDeleteReportingZone();

  const { data: resortBoxes = [] } = useResortAreaes(false, canViewBoxes);
  const showCurrentBoxes = false;
  const visibleResortBoxes = showCurrentBoxes ? resortBoxes : [];

  const {
    data: resortAdmins = [],
    isLoading: isLoadingResortAdmins,
    isError: isResortAdminsError,
    refetch: refetchResortAdmins,
  } = useQuery<ResortAdminOption[]>({
    queryKey: ["resort-admin-users"],
    enabled: isLGUAdmin,
    queryFn: async () => {
      try {
        const { data } = await api.get("/users?role=RESORT_ADMIN&limit=200");
        return (data?.data || []).filter(
          (u: ResortAdminOption) => u?.isActive !== false,
        );
      } catch {
        // Fallback for older backend builds where role filter may fail.
        const { data } = await api.get("/users?limit=200");
        return (data?.data || []).filter(
          (u: ResortAdminOption) =>
            u?.role === "RESORT_ADMIN" && u?.isActive !== false,
        );
      }
    },
  });

  useEffect(() => {
    if (showBoxModal && !ownerId && resortAdmins.length > 0) {
      setOwnerId(resortAdmins[0].id);
    }
  }, [showBoxModal, ownerId, resortAdmins]);

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

  const handleReportClick = useCallback(
    (report: MapReport) => {
      setSelectedReport(report);
      if (mapInstance && typeof mapInstance.setView === "function") {
        try {
          mapInstance.setView([report.latitude, report.longitude], 16, {
            animate: false,
          });
        } catch {
          // Ignore stale map references during unmount/remount.
        }
      }
    },
    [mapInstance],
  );

  const handleDrawRectangle = useCallback(
    (bounds: {
      minLat: number;
      maxLat: number;
      minLng: number;
      maxLng: number;
    }) => {
      setPendingBounds(bounds);
      setShowBoxModal(true);
      setBoxSaveError("");
      if (!ownerId && resortAdmins.length > 0) {
        setOwnerId(resortAdmins[0].id);
      }
    },
    [ownerId, resortAdmins],
  );

  const handleDrawZone = useCallback((points: ZonePoint[]) => {
    setPendingZonePoints(points);
    setZoneName("");
    setZoneSaveError("");
    setShowZoneModal(true);
  }, []);

  const resetZoneForm = () => {
    setPendingZonePoints(null);
    setZoneName("");
    setZoneSaveError("");
    setShowZoneModal(false);
    setDrawZoneMode(false);
  };

  const handleSaveZone = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!zoneName.trim()) {
      setZoneSaveError("Please provide a zone name.");
      return;
    }
    if (!pendingZonePoints || pendingZonePoints.length < 3) {
      setZoneSaveError("Draw a polygon on the map first.");
      return;
    }
    try {
      await createZone.mutateAsync({
        name: zoneName.trim(),
        coordinates: pendingZonePoints,
      });
      resetZoneForm();
    } catch (error: any) {
      setZoneSaveError(
        error?.response?.data?.message ||
          error?.response?.data?.error ||
          "Failed to save zone.",
      );
    }
  };

  const resetBoxForm = () => {
    setPendingBounds(null);
    setBoxName("");
    setBoxDescription("");
    setOwnerId("");
    setBoxSaveError("");
    setShowBoxModal(false);
  };

  const handleSaveBox = async (e: React.FormEvent) => {
    e.preventDefault();
    setBoxSaveError("");

    if (!pendingBounds) {
      setBoxSaveError("No rectangle selected. Draw a box first.");
      return;
    }

    if (!boxName.trim()) {
      setBoxSaveError("Please provide a box name.");
      return;
    }

    if (isLoadingResortAdmins) {
      setBoxSaveError("Resort admin owners are still loading. Please wait.");
      return;
    }

    if (resortAdmins.length === 0) {
      setBoxSaveError(
        isResortAdminsError
          ? "Failed to load resort admin owners. Retry loading or create one in User Management."
          : "No resort admin owner found. Create one in User Management first.",
      );
      return;
    }

    if (!ownerId) {
      setBoxSaveError("Please assign a resort admin owner.");
      return;
    }

    try {
      await createResortArea.mutateAsync({
        name: boxName.trim(),
        description: boxDescription.trim() || undefined,
        ownerId,
        ...pendingBounds,
      });
      setDrawMode(false);
      resetBoxForm();
    } catch (error: any) {
      setBoxSaveError(
        error?.response?.data?.message ||
          error?.response?.data?.error ||
          "Failed to save map box.",
      );
    }
  };

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col bg-gray-50">
      {/* ── Top toolbar ── */}
      <div className="flex flex-wrap items-center gap-2 border-b bg-white px-5 py-3 shadow-sm">
        <h1 className="mr-2 text-base font-bold text-gray-900">
          Smart Waste Map
        </h1>

        {/* Status filter pills */}
        <div className="flex flex-wrap items-center gap-1.5">
          {STATUS_PILL_LIST.map(({ value, label }) => {
            const isActive = statusFilter === value;
            const count = value ? statusCounts[value] : reports.length;
            return (
              <button
                key={value || "all"}
                onClick={() => setStatusFilter(value)}
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold border transition-all ${
                  isActive
                    ? `text-white border-transparent shadow-sm ${value ? `bg-st-${value}` : "bg-gray-500"}`
                    : "bg-white text-gray-600 border-gray-200 hover:border-gray-300"
                }`}
              >
                {value && (
                  <span
                    className={`h-1.5 w-1.5 flex-shrink-0 rounded-full ${
                      isActive ? "bg-white/70" : `bg-st-${value}`
                    }`}
                  />
                )}
                {label}
                {count !== undefined && (
                  <span
                    className={`ml-0.5 ${isActive ? "text-white/75" : "text-gray-400"}`}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <div className="ml-auto flex items-center gap-2">
          {isLGUAdmin && (
            <>
              <Button
                variant={drawMode ? "default" : "outline"}
                size="sm"
                className="h-7 gap-1.5 text-xs"
                onClick={() => {
                  setDrawMode((prev) => {
                    const next = !prev;
                    if (!next) resetBoxForm();
                    return next;
                  });
                  if (drawZoneMode) setDrawZoneMode(false);
                }}
              >
                <Square className="h-3.5 w-3.5" />
                {drawMode ? "Cancel" : "Draw Box"}
              </Button>
              <Button
                variant={drawZoneMode ? "default" : "outline"}
                size="sm"
                className="h-7 gap-1.5 text-xs"
                onClick={() => {
                  setDrawZoneMode((prev) => {
                    const next = !prev;
                    if (!next) resetZoneForm();
                    return next;
                  });
                  if (drawMode) {
                    setDrawMode(false);
                    resetBoxForm();
                  }
                }}
              >
                <PenLine className="h-3.5 w-3.5" />
                {drawZoneMode ? "Cancel Zone" : "Draw Zone"}
              </Button>
            </>
          )}

          {/* Category filter */}
          <select
            title="Filter by waste category"
            className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
            value={categoryFilter}
            onChange={(e) =>
              setCategoryFilter(e.target.value as WasteCategory | "")
            }
          >
            <option value="">All Categories</option>
            {Object.entries(WASTE_CATEGORY_LABELS).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>

          {/* Heatmap toggle */}
          <Button
            variant={showHeatmap ? "default" : "outline"}
            size="sm"
            className="h-7 gap-1.5 text-xs"
            onClick={() => setShowHeatmap(!showHeatmap)}
          >
            <Layers className="h-3.5 w-3.5" />
            Heatmap
          </Button>

          {showCurrentBoxes && canViewBoxes && (
            <span className="rounded-full border border-blue-100 bg-blue-50 px-2.5 py-1 text-[11px] font-semibold text-blue-700">
              {visibleResortBoxes.length} box
              {visibleResortBoxes.length !== 1 ? "es" : ""}
            </span>
          )}
        </div>
      </div>

      {/* ── Map area + slide-in panel ── */}
      <div className="relative flex flex-1 min-h-0 overflow-hidden">
        {/* Map */}
        <div className="relative flex-1 min-h-0">
          {isLoading ? (
            <div className="h-full bg-gray-50 p-4">
              <div className="h-full rounded-xl border border-gray-100 bg-white p-3 shadow-sm">
                <Skeleton className="h-full w-full rounded-lg" />
              </div>
            </div>
          ) : (
            <WasteMap
              reports={reports}
              showHeatmap={showHeatmap}
              onReportClick={handleReportClick}
              onMapReady={setMapInstance}
              resortBoxes={visibleResortBoxes}
              canDraw={isLGUAdmin}
              drawMode={drawMode}
              onDrawRectangle={handleDrawRectangle}
              reportingZones={reportingZones.filter(
                (z) => !hiddenZoneIds.has(z.id),
              )}
              canDrawZone={isLGUAdmin}
              drawZoneMode={drawZoneMode}
              onDrawZone={handleDrawZone}
            />
          )}

          {/* Heatmap intensity legend */}
          {showHeatmap && (
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-[1000] rounded-xl border border-gray-100 bg-white/96 px-4 py-2.5 shadow-lg backdrop-blur-sm">
              <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-gray-400 text-center">
                Report Density
              </p>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-gray-500">Low</span>
                <div className="heatmap-gradient-bar" />
                <span className="text-[10px] text-gray-500">High</span>
              </div>
              <p className="mt-1 text-[9px] text-gray-400 text-center">
                Report density by location
              </p>
            </div>
          )}

          {/* Clickable legend */}
          <div className="absolute bottom-6 left-4 z-[1000] rounded-xl border border-gray-100 bg-white/96 p-3 shadow-lg backdrop-blur-sm">
            <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-gray-400">
              Waste Category
            </p>
            <div className="space-y-1.5">
              {Object.entries(WASTE_CATEGORY_LABELS).map(([key, label]) => (
                <button
                  key={key}
                  title={`Filter by ${label}`}
                  onClick={() =>
                    setCategoryFilter(
                      categoryFilter === key ? "" : (key as WasteCategory),
                    )
                  }
                  className={`flex w-full items-center gap-2 rounded-md px-1.5 py-0.5 transition-colors text-left ${
                    categoryFilter === key ? "bg-gray-100" : "hover:bg-gray-50"
                  }`}
                >
                  <div
                    className={`h-2.5 w-2.5 flex-shrink-0 rounded-full bg-cat-${key}`}
                  />
                  <span className="text-xs text-gray-700">{label}</span>
                  {categoryFilter === key && (
                    <X className="ml-auto h-3 w-3 text-gray-400" />
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ── Slide-in report detail panel ── */}
        <div
          className={`flex w-72 flex-shrink-0 flex-col border-l bg-white shadow-xl transition-all duration-300 ${
            selectedReport
              ? "translate-x-0"
              : "translate-x-full absolute right-0 top-0 bottom-0"
          }`}
        >
          {selectedReport && (
            <>
              <div className="flex items-center justify-between border-b px-4 py-3">
                <span className="text-sm font-bold text-gray-800">
                  Report Details
                </span>
                <button
                  aria-label="Close report details"
                  onClick={() => setSelectedReport(null)}
                  className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {selectedReport.images?.[0] && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={selectedReport.images[0].imageUrl}
                  alt="Waste report"
                  className="h-40 w-full object-cover"
                />
              )}

              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {/* Category */}
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-bold text-white bg-cat-${selectedReport.category}`}
                  >
                    {
                      (WASTE_CATEGORY_LABELS as Record<string, string>)[
                        selectedReport.category
                      ]
                    }
                  </span>
                </div>

                {/* Title & location */}
                <div>
                  <h3 className="text-sm font-bold leading-snug text-gray-900">
                    {selectedReport.title}
                  </h3>
                  {selectedReport.barangay && (
                    <p className="mt-1 text-xs font-semibold text-gray-600">
                      Brgy. {selectedReport.barangay.name}
                    </p>
                  )}
                  {selectedReport.address && (
                    <p className="mt-0.5 flex items-start gap-1 text-xs text-gray-500">
                      <MapPin className="mt-0.5 h-3 w-3 flex-shrink-0" />
                      {selectedReport.address}
                    </p>
                  )}
                </div>

                {/* Status */}
                <div>
                  <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-gray-400">
                    Status
                  </p>
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-bold bg-tint-${selectedReport.status} text-st-${selectedReport.status}`}
                  >
                    <span
                      className={`h-1.5 w-1.5 rounded-full bg-st-${selectedReport.status}`}
                    />
                    {
                      (REPORT_STATUS_LABELS as Record<string, string>)[
                        selectedReport.status
                      ]
                    }
                  </span>
                </div>

                {/* Reported at */}
                <div>
                  <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-gray-400">
                    Reported
                  </p>
                  <p className="text-xs text-gray-600">
                    {new Date(selectedReport.createdAt).toLocaleString()}
                  </p>
                </div>

                {/* Coordinates */}
                <div>
                  <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-gray-400">
                    Coordinates
                  </p>
                  <p className="font-mono text-xs text-gray-500">
                    {selectedReport.latitude.toFixed(5)},{" "}
                    {selectedReport.longitude.toFixed(5)}
                  </p>
                </div>

                <a
                  href={`/dashboard/reports`}
                  className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-primary py-2 text-xs font-bold text-white hover:bg-primary/90 transition-colors"
                >
                  View All Reports
                  <ChevronRight className="h-3.5 w-3.5" />
                </a>
              </div>
            </>
          )}
        </div>
      </div>

      {showBoxModal && isLGUAdmin && (
        <div
          className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/45 p-4"
          onClick={() => {
            setShowBoxModal(false);
          }}
        >
          <div
            className="w-full max-w-lg rounded-xl border bg-white p-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-bold text-gray-900">Save Map Box</h2>
            <p className="mt-1 text-sm text-gray-500">
              Name this selected area and assign a resort admin owner.
            </p>

            {pendingBounds && (
              <p className="mt-3 rounded-md bg-gray-50 px-3 py-2 text-xs text-gray-600">
                Bounds: {pendingBounds.minLat.toFixed(5)} to{" "}
                {pendingBounds.maxLat.toFixed(5)},{" "}
                {pendingBounds.minLng.toFixed(5)} to{" "}
                {pendingBounds.maxLng.toFixed(5)}
              </p>
            )}

            <form className="mt-4 space-y-3" onSubmit={handleSaveBox}>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Box Name <span className="text-red-500">*</span>
                </label>
                <Input
                  value={boxName}
                  onChange={(e) => setBoxName(e.target.value)}
                  placeholder="e.g. Resort Mr Suave"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Description (optional)
                </label>
                <textarea
                  rows={3}
                  className="w-full rounded-md border px-3 py-2 text-sm"
                  value={boxDescription}
                  onChange={(e) => setBoxDescription(e.target.value)}
                  placeholder="Optional details for this managed area"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Resort Admin Owner <span className="text-red-500">*</span>
                </label>
                <select
                  title="Select resort admin owner"
                  className="w-full rounded-md border px-3 py-2 text-sm"
                  value={ownerId}
                  onChange={(e) => setOwnerId(e.target.value)}
                >
                  <option
                    value=""
                    disabled={
                      isLoadingResortAdmins || resortAdmins.length === 0
                    }
                  >
                    {isLoadingResortAdmins
                      ? "Loading owners..."
                      : resortAdmins.length === 0
                        ? "No resort admins found"
                        : "Select owner..."}
                  </option>
                  {resortAdmins.map((admin) => (
                    <option key={admin.id} value={admin.id}>
                      {admin.firstName} {admin.lastName} ({admin.email})
                    </option>
                  ))}
                </select>

                {isResortAdminsError && (
                  <p className="mt-1 text-xs text-red-600">
                    Failed to load resort admin owners.{" "}
                    <button
                      type="button"
                      className="font-semibold underline"
                      onClick={() => {
                        void refetchResortAdmins();
                      }}
                    >
                      Retry
                    </button>
                  </p>
                )}

                {!isLoadingResortAdmins &&
                  !isResortAdminsError &&
                  resortAdmins.length === 0 && (
                    <p className="mt-1 text-xs text-amber-700">
                      No resort admin users found. Add one in User Management,
                      then reopen this modal.
                    </p>
                  )}
              </div>

              {boxSaveError && (
                <p className="rounded-md border border-red-200 bg-red-50 px-2.5 py-2 text-sm text-red-700">
                  {boxSaveError}
                </p>
              )}

              <div className="flex justify-end gap-2 pt-1">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowBoxModal(false);
                  }}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={
                    createResortArea.isPending ||
                    isLoadingResortAdmins ||
                    resortAdmins.length === 0
                  }
                >
                  {createResortArea.isPending ? "Saving..." : "Save Box"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Save Zone Modal ── */}
      {showZoneModal && isLGUAdmin && (
        <div className="absolute inset-0 z-[2000] flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="mx-4 w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-bold text-gray-900">
                Save Reporting Zone
              </h2>
              <button
                aria-label="Close"
                onClick={resetZoneForm}
                className="rounded-md p-1 text-gray-400 hover:bg-gray-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {pendingZonePoints && (
              <p className="mb-3 rounded-md bg-blue-50 px-3 py-2 text-xs text-blue-700">
                Polygon drawn with {pendingZonePoints.length} points. Name it
                below to save.
              </p>
            )}

            <form className="space-y-3" onSubmit={handleSaveZone}>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Zone Name <span className="text-red-500">*</span>
                </label>
                <Input
                  value={zoneName}
                  onChange={(e) => setZoneName(e.target.value)}
                  placeholder="e.g. Panabo Coastal Zone"
                />
              </div>

              {zoneSaveError && (
                <p className="rounded-md border border-red-200 bg-red-50 px-2.5 py-2 text-sm text-red-700">
                  {zoneSaveError}
                </p>
              )}

              <div className="flex justify-end gap-2 pt-1">
                <Button type="button" variant="outline" onClick={resetZoneForm}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createZone.isPending}>
                  {createZone.isPending ? "Saving..." : "Save Zone"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Zone management sidebar (admin) ── */}
      {isLGUAdmin &&
        reportingZones.length > 0 &&
        !drawZoneMode &&
        !showZoneModal && (
          <div className="absolute bottom-6 right-4 z-[1000] w-52 rounded-xl border border-blue-100 bg-white/96 p-3 shadow-lg backdrop-blur-sm">
            <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-blue-500">
              Reporting Zones
            </p>
            <div className="space-y-1.5 max-h-40 overflow-y-auto">
              {reportingZones.map((zone) => (
                <div
                  key={zone.id}
                  className="flex items-center justify-between gap-2 rounded-md px-1.5 py-0.5"
                >
                  <div className="flex items-center gap-1.5 min-w-0">
                    <div className="h-2.5 w-2.5 flex-shrink-0 rounded-full border border-blue-400 bg-blue-300/40" />
                    <span className="text-xs text-gray-700 truncate">
                      {zone.name}
                    </span>
                  </div>
                  <div className="flex items-center gap-0.5 flex-shrink-0">
                    <button
                      title={
                        hiddenZoneIds.has(zone.id) ? "Show zone" : "Hide zone"
                      }
                      onClick={() =>
                        setHiddenZoneIds((prev) => {
                          const next = new Set(prev);
                          if (next.has(zone.id)) next.delete(zone.id);
                          else next.add(zone.id);
                          return next;
                        })
                      }
                      className="rounded p-0.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
                    >
                      {hiddenZoneIds.has(zone.id) ? (
                        <EyeOff className="h-3 w-3" />
                      ) : (
                        <Eye className="h-3 w-3" />
                      )}
                    </button>
                    <button
                      title="Delete zone"
                      onClick={() => deleteZone.mutate(zone.id)}
                      className="flex-shrink-0 rounded p-0.5 text-gray-400 hover:bg-red-50 hover:text-red-500 transition-colors"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
    </div>
  );
}
