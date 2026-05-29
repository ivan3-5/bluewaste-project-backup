import { REPORT_STATUS_LABELS, ReportStatus } from "@/types";
import { cn } from "@/lib/utils";

type StatusBadgeProps = {
  status: ReportStatus;
  className?: string;
  showDot?: boolean;
};

const STATUS_STYLES: Record<ReportStatus, string> = {
  PENDING: "bg-amber-50 text-amber-700 border-amber-200",
  VERIFIED: "bg-blue-50 text-blue-700 border-blue-200",
  CLEANUP_SCHEDULED: "bg-violet-50 text-violet-700 border-violet-200",
  IN_PROGRESS: "bg-orange-50 text-orange-700 border-orange-200",
  CLEANED: "bg-emerald-50 text-emerald-700 border-emerald-200",
  REJECTED: "bg-rose-50 text-rose-700 border-rose-200",
};

const STATUS_DOT: Record<ReportStatus, string> = {
  PENDING: "bg-amber-500",
  VERIFIED: "bg-blue-500",
  CLEANUP_SCHEDULED: "bg-violet-500",
  IN_PROGRESS: "bg-orange-500",
  CLEANED: "bg-emerald-500",
  REJECTED: "bg-rose-500",
};

export function StatusBadge({
  status,
  className,
  showDot = true,
}: StatusBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold",
        STATUS_STYLES[status],
        className,
      )}
    >
      {showDot && (
        <span className={cn("h-1.5 w-1.5 rounded-full", STATUS_DOT[status])} />
      )}
      {REPORT_STATUS_LABELS[status]}
    </span>
  );
}
