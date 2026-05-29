"use client";

import { useParams, useSearchParams } from "next/navigation";
import { useReport } from "@/hooks/useReports";
import { StatusBadge } from "@/components/reports/StatusBadge";
import { Loader2 } from "lucide-react";

export default function ReportDetailPage() {
  const params = useParams() as { id?: string };
  const searchParams = useSearchParams();
  const id =
    params?.id ?? searchParams?.get("id") ?? searchParams?.get("reportId");

  const { data: report, isLoading } = useReport(id ?? "");

  if (!id)
    return (
      <div className="p-4 text-sm text-gray-500">No report id provided.</div>
    );
  if (isLoading)
    return (
      <div className="p-4">
        <Loader2 className="animate-spin" />
      </div>
    );
  if (!report)
    return <div className="p-4 text-sm text-gray-500">Report not found.</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">Report #{report.id}</h1>
        <StatusBadge status={report.status} />
      </div>

      <div className="rounded bg-white p-4 shadow-sm border">
        <p className="text-sm text-gray-700">{report.description}</p>
        <div className="mt-3 text-sm text-gray-500">
          <div>Category: {report.category}</div>
          <div>
            Location: {report.latitude.toFixed(6)},{" "}
            {report.longitude.toFixed(6)}
          </div>
          <div>Created: {new Date(report.createdAt).toLocaleString()}</div>
        </div>
      </div>

      {report.images && report.images.length > 0 && (
        <div className="grid grid-cols-2 gap-2">
          {report.images.map((img) => (
            <img
              key={img.id}
              src={img.imageUrl}
              alt="report image"
              className="rounded object-cover w-full h-48"
            />
          ))}
        </div>
      )}
    </div>
  );
}
