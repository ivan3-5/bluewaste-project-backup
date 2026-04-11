"use client";

import { useState, useEffect, useCallback } from "react";
import { useMyReports } from "@/hooks/useReports";
import { StatusBadge } from "@/components/reports/StatusBadge";
import { Button } from "@/components/ui/button";
import {
  WASTE_CATEGORY_LABELS,
  REPORT_STATUS_LABELS,
  ReportStatus,
} from "@/types";
import { timeAgo } from "@/lib/utils";
import Link from "next/link";
import { X, ChevronLeft, ChevronRight, ImageIcon } from "lucide-react";

interface LightboxState {
  images: string[];
  index: number;
  title: string;
}

export default function MyReportsPage() {
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<ReportStatus | undefined>();
  const [lightbox, setLightbox] = useState<LightboxState | null>(null);
  const { data, isLoading } = useMyReports({ page, status: statusFilter });

  const reports = data?.data || [];
  const pagination = data?.pagination;

  const openLightbox = (images: string[], index: number, title: string) => {
    setLightbox({ images, index, title });
  };

  const closeLightbox = useCallback(() => setLightbox(null), []);

  const prev = useCallback(() => {
    setLightbox((lb) =>
      lb
        ? { ...lb, index: (lb.index - 1 + lb.images.length) % lb.images.length }
        : lb,
    );
  }, []);

  const next = useCallback(() => {
    setLightbox((lb) =>
      lb ? { ...lb, index: (lb.index + 1) % lb.images.length } : lb,
    );
  }, []);

  // Keyboard navigation
  useEffect(() => {
    if (!lightbox) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeLightbox();
      if (e.key === "ArrowLeft") prev();
      if (e.key === "ArrowRight") next();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [lightbox, closeLightbox, prev, next]);

  return (
    <div>
      {/* ── Lightbox modal ── */}
      {lightbox && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/85 backdrop-blur-sm"
          onClick={closeLightbox}
        >
          {/* Panel — stop propagation so clicks inside don't close */}
          <div
            className="relative flex max-h-[92vh] max-w-[92vw] flex-col items-center"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close */}
            <button
              aria-label="Close image viewer"
              onClick={closeLightbox}
              className="absolute -right-3 -top-3 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-gray-700 shadow-lg transition-colors hover:bg-white hover:text-red-500"
            >
              <X className="h-4 w-4" />
            </button>

            {/* Image */}
            <div className="relative overflow-hidden rounded-xl shadow-2xl">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={lightbox.images[lightbox.index]}
                alt={lightbox.title}
                className="block max-h-[80vh] max-w-[85vw] object-contain lightbox-img"
              />

              {/* Prev / Next arrows — only shown when multiple images */}
              {lightbox.images.length > 1 && (
                <>
                  <button
                    aria-label="Previous image"
                    onClick={prev}
                    className="absolute left-3 top-1/2 -translate-y-1/2 flex h-9 w-9 items-center justify-center rounded-full bg-black/50 text-white transition-colors hover:bg-black/75"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                  <button
                    aria-label="Next image"
                    onClick={next}
                    className="absolute right-3 top-1/2 -translate-y-1/2 flex h-9 w-9 items-center justify-center rounded-full bg-black/50 text-white transition-colors hover:bg-black/75"
                  >
                    <ChevronRight className="h-5 w-5" />
                  </button>
                </>
              )}
            </div>

            {/* Caption + counter */}
            <div className="mt-3 flex items-center gap-3">
              <p className="text-sm font-medium text-white/90">
                {lightbox.title}
              </p>
              {lightbox.images.length > 1 && (
                <span className="rounded-full bg-white/20 px-2.5 py-0.5 text-xs text-white">
                  {lightbox.index + 1} / {lightbox.images.length}
                </span>
              )}
            </div>

            {/* Thumbnail strip for multi-image reports */}
            {lightbox.images.length > 1 && (
              <div className="mt-3 flex gap-2">
                {lightbox.images.map((src, i) => (
                  <button
                    key={i}
                    aria-label={`View image ${i + 1}`}
                    onClick={() =>
                      setLightbox((lb) => (lb ? { ...lb, index: i } : lb))
                    }
                    className={`h-12 w-12 overflow-hidden rounded-md border-2 transition-all ${
                      i === lightbox.index
                        ? "border-white opacity-100"
                        : "border-transparent opacity-50 hover:opacity-80"
                    }`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={src}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">My Reports</h1>
        <Link href="/citizen/report">
          <Button size="sm">+ New Report</Button>
        </Link>
      </div>

      {/* Filter */}
      <div className="mb-4">
        <select
          title="Filter by status"
          className="rounded-md border px-3 py-2 text-sm"
          value={statusFilter || ""}
          onChange={(e) => {
            setStatusFilter((e.target.value as ReportStatus) || undefined);
            setPage(1);
          }}
        >
          <option value="">All Statuses</option>
          {Object.entries(REPORT_STATUS_LABELS).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
      </div>

      {/* Reports List */}
      <div className="space-y-3">
        {isLoading ? (
          <div className="py-10 text-center text-gray-400">
            Loading your reports...
          </div>
        ) : reports.length === 0 ? (
          <div className="py-10 text-center">
            <p className="mb-2 text-gray-400">No reports found</p>
            <Link href="/citizen/report">
              <Button variant="outline" size="sm">
                Submit your first report
              </Button>
            </Link>
          </div>
        ) : (
          reports.map((report) => {
            const imageUrls = report.images.map((img) => img.imageUrl);
            return (
              <div
                key={report.id}
                className="rounded-lg border bg-white p-4 shadow-sm hover:border-blue-200 transition-colors"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold text-gray-800 truncate">
                      {report.title}
                    </h3>
                    <p className="mt-1 text-sm text-gray-500 line-clamp-2">
                      {report.description}
                    </p>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <StatusBadge status={report.status} />
                      <span className="text-xs text-gray-400">
                        {WASTE_CATEGORY_LABELS[report.category]}
                      </span>
                      {report.barangay && (
                        <span className="text-xs text-gray-400">
                          Brgy. {report.barangay.name}
                        </span>
                      )}
                      <span className="text-xs text-gray-400">
                        {timeAgo(report.createdAt)}
                      </span>
                    </div>
                  </div>

                  {/* Thumbnail stack — click to open lightbox */}
                  {imageUrls.length > 0 && (
                    <div className="relative shrink-0">
                      <button
                        aria-label={`View ${imageUrls.length} photo${imageUrls.length > 1 ? "s" : ""} for ${report.title}`}
                        onClick={() => openLightbox(imageUrls, 0, report.title)}
                        className="group relative block h-16 w-16 overflow-hidden rounded-lg border border-gray-200 shadow-sm transition-all hover:scale-105 hover:border-blue-400 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-blue-400"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={imageUrls[0]}
                          alt="Report photo"
                          className="h-full w-full object-cover"
                        />
                        {/* Hover overlay */}
                        <div className="absolute inset-0 flex items-center justify-center bg-black/0 transition-colors group-hover:bg-black/30">
                          <ImageIcon className="h-5 w-5 text-white opacity-0 transition-opacity group-hover:opacity-100" />
                        </div>
                      </button>
                      {/* Badge showing extra image count */}
                      {imageUrls.length > 1 && (
                        <span className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-blue-600 text-[10px] font-bold text-white shadow">
                          {imageUrls.length}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between">
          <p className="text-sm text-gray-500">
            Page {pagination.page} of {pagination.totalPages}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= pagination.totalPages}
              onClick={() => setPage(page + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
