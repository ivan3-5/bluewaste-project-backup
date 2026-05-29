"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/providers/AuthProvider";
import { useMyWasteReports } from "@/hooks/useWasteReports";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatDateTime } from "@/lib/utils";
import type { WasteSeverity, WasteType } from "@/types";

const WASTE_TYPE_STYLES: Record<WasteType, string> = {
  PLASTIC: "bg-blue-100 text-blue-800 border-blue-200",
  ORGANIC: "bg-emerald-100 text-emerald-800 border-emerald-200",
  GLASS: "bg-teal-100 text-teal-800 border-teal-200",
  METAL: "bg-amber-100 text-amber-800 border-amber-200",
  PAPER: "bg-slate-100 text-slate-800 border-slate-200",
};

const WASTE_TYPE_LABELS: Record<WasteType, string> = {
  PLASTIC: "Plastic",
  ORGANIC: "Organic",
  GLASS: "Glass",
  METAL: "Metal",
  PAPER: "Paper",
};

const SEVERITY_STYLES: Record<WasteSeverity, string> = {
  low: "bg-green-100 text-green-800 border-green-200",
  medium: "bg-amber-100 text-amber-800 border-amber-200",
  high: "bg-red-100 text-red-800 border-red-200",
};

export default function MyWasteReportsPage() {
  const router = useRouter();
  const { user, isLoading } = useAuth();
  const [page, setPage] = useState(1);

  useEffect(() => {
    if (!isLoading && !user) {
      router.push("/login");
    }
  }, [isLoading, user, router]);

  const { data, isLoading: isReportsLoading } = useMyWasteReports({
    page,
    limit: 10,
  });

  if (!isLoading && !user) {
    return null;
  }

  const reports = data?.data || [];
  const pagination = data?.pagination;

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-blue-50 px-4 py-8">
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              My AI Waste Reports
            </h1>
            <p className="text-sm text-gray-600">
              History of analyzed waste images and classifications.
            </p>
          </div>
          <Link href="/report-waste">
            <Button>New AI Waste Report</Button>
          </Link>
        </div>

        <div className="space-y-4">
          {isReportsLoading ? (
            <Card>
              <CardContent className="py-10 text-center text-sm text-gray-500">
                Loading reports...
              </CardContent>
            </Card>
          ) : reports.length === 0 ? (
            <Card>
              <CardContent className="py-10 text-center text-sm text-gray-500">
                No AI waste reports yet.
              </CardContent>
            </Card>
          ) : (
            reports.map((report) => (
              <Card
                key={report.id}
                className="overflow-hidden border-gray-200 shadow-sm"
              >
                <CardHeader className="border-b bg-gray-50/70 py-4">
                  <CardTitle className="text-base">
                    {report.detectedObject}
                  </CardTitle>
                </CardHeader>
                <CardContent className="grid gap-4 p-4 md:grid-cols-[220px,1fr]">
                  <div className="overflow-hidden rounded-md border border-gray-200">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={report.imageUrl}
                      alt={report.detectedObject}
                      className="h-44 w-full object-cover"
                    />
                  </div>

                  <div className="space-y-3">
                    <div>
                      <p className="text-xs uppercase tracking-wide text-gray-500">
                        Dominant waste
                      </p>
                      {report.dominantWaste ? (
                        <span
                          className={`mt-1 inline-flex rounded-full border px-3 py-1 text-sm font-semibold ${WASTE_TYPE_STYLES[report.dominantWaste]}`}
                        >
                          {WASTE_TYPE_LABELS[report.dominantWaste]}
                        </span>
                      ) : (
                        <span className="mt-1 inline-flex rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-sm font-semibold text-gray-700">
                          Unclassified
                        </span>
                      )}
                    </div>

                    <div>
                      <p className="text-xs uppercase tracking-wide text-gray-500">
                        Total items
                      </p>
                      <p className="text-sm font-semibold text-gray-900">
                        {report.totalItems}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs uppercase tracking-wide text-gray-500">
                        Severity
                      </p>
                      <span
                        className={`mt-1 inline-flex rounded-full border px-3 py-1 text-sm font-semibold ${SEVERITY_STYLES[report.severity]}`}
                      >
                        {report.severity}
                      </span>
                    </div>

                    <div>
                      <p className="text-xs uppercase tracking-wide text-gray-500">
                        Top confidence
                      </p>
                      <p className="text-sm font-semibold text-gray-900">
                        {(report.confidence * 100).toFixed(1)}%
                      </p>
                    </div>

                    <div>
                      <p className="text-xs uppercase tracking-wide text-gray-500">
                        Analyzed At
                      </p>
                      <p className="text-sm text-gray-700">
                        {formatDateTime(report.createdAt)}
                      </p>
                    </div>

                    {(report.address ||
                      report.latitude ||
                      report.longitude) && (
                      <div>
                        <p className="text-xs uppercase tracking-wide text-gray-500">
                          Location
                        </p>
                        {report.address && (
                          <p className="text-sm text-gray-700">
                            {report.address}
                          </p>
                        )}
                        {report.latitude && report.longitude && (
                          <p className="text-sm text-gray-700">
                            {report.latitude.toFixed(5)},{" "}
                            {report.longitude.toFixed(5)}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {pagination && pagination.totalPages > 1 && (
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-600">
              Page {pagination.page} of {pagination.totalPages}
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= pagination.totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
