import { ReactNode } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export function DashboardLayoutSkeleton({
  children,
}: {
  children?: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gray-50">
      <aside className="hidden md:fixed md:inset-y-0 md:flex md:w-64 md:flex-col border-r bg-white">
        <div className="h-16 border-b px-4 flex items-center">
          <Skeleton className="h-8 w-36" />
        </div>
        <div className="flex-1 space-y-2 px-3 py-4">
          {Array.from({ length: 7 }).map((_, idx) => (
            <Skeleton key={idx} className="h-10 w-full rounded-lg" />
          ))}
        </div>
      </aside>

      <div className="md:pl-64">
        <header className="h-16 border-b bg-white px-4 md:px-6 flex items-center justify-between">
          <Skeleton className="h-6 w-40" />
          <div className="flex items-center gap-3">
            <Skeleton className="h-9 w-9 rounded-full" />
            <Skeleton className="h-9 w-24 rounded-lg" />
          </div>
        </header>

        <main className="p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}

export function FieldWorkerLayoutSkeleton({
  children,
}: {
  children?: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="sticky top-0 z-40 border-b bg-white shadow-sm">
        <div className="mx-auto flex h-[73px] max-w-5xl items-center justify-between px-4 py-3">
          <Skeleton className="h-11 w-36" />
          <div className="hidden md:flex items-center gap-2">
            {Array.from({ length: 4 }).map((_, idx) => (
              <Skeleton key={idx} className="h-9 w-24 rounded-lg" />
            ))}
          </div>
          <Skeleton className="h-9 w-20 rounded-lg" />
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-6">{children}</main>
    </div>
  );
}

export function PageHeadingSkeleton({
  withSubtitle = true,
}: {
  withSubtitle?: boolean;
}) {
  return (
    <div className="space-y-2">
      <Skeleton className="h-8 w-56" />
      {withSubtitle && <Skeleton className="h-4 w-72 max-w-full" />}
    </div>
  );
}

export function StatsCardsSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {Array.from({ length: count }).map((_, idx) => (
        <div key={idx} className="rounded-xl border bg-white p-4">
          <div className="flex items-center gap-3">
            <Skeleton className="h-10 w-10 rounded-lg" />
            <div className="space-y-2">
              <Skeleton className="h-6 w-14" />
              <Skeleton className="h-3 w-20" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function ChartPanelsSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      {Array.from({ length: 2 }).map((_, idx) => (
        <div key={idx} className="rounded-lg border bg-white p-6 shadow-sm">
          <Skeleton className="mb-4 h-6 w-48" />
          <Skeleton className="h-64 w-full rounded-lg" />
        </div>
      ))}
    </div>
  );
}

export function FilterToolbarSkeleton({
  blocks = 3,
  withSearch = true,
}: {
  blocks?: number;
  withSearch?: boolean;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end gap-3">
      {Array.from({ length: blocks }).map((_, idx) => (
        <div key={idx} className="space-y-1">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-10 w-36 rounded-md" />
        </div>
      ))}
      {withSearch && (
        <div className="flex items-end gap-2">
          <div className="space-y-1">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-10 w-56 rounded-md" />
          </div>
          <Skeleton className="h-9 w-20 rounded-md" />
        </div>
      )}
    </div>
  );
}

export function DataTableSkeleton({
  rows = 6,
  cols = 6,
  className,
}: {
  rows?: number;
  cols?: number;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "overflow-x-auto rounded-lg border bg-white shadow-sm",
        className,
      )}
    >
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            {Array.from({ length: cols }).map((_, idx) => (
              <th key={idx} className="px-4 py-3">
                <Skeleton className="h-3 w-20" />
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {Array.from({ length: rows }).map((_, rowIdx) => (
            <tr key={rowIdx}>
              {Array.from({ length: cols }).map((__, colIdx) => (
                <td key={colIdx} className="px-4 py-3">
                  <Skeleton
                    className={cn(
                      "h-4",
                      colIdx === 0
                        ? "w-40"
                        : colIdx === cols - 1
                          ? "w-24"
                          : "w-24",
                    )}
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function NotificationListSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: rows }).map((_, idx) => (
        <div
          key={idx}
          className="flex items-start gap-4 rounded-lg border bg-white p-4"
        >
          <Skeleton className="h-6 w-6 rounded-full" />
          <div className="flex-1 space-y-2">
            <div className="flex items-start justify-between gap-2">
              <Skeleton className="h-4 w-56 max-w-[70%]" />
              <Skeleton className="h-3 w-16" />
            </div>
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-3/4" />
            <div className="flex gap-2 pt-1">
              <Skeleton className="h-7 w-20 rounded-md" />
              <Skeleton className="h-7 w-24 rounded-md" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function ListCardsSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="rounded-xl border bg-white divide-y">
      {Array.from({ length: rows }).map((_, idx) => (
        <div key={idx} className="flex items-start gap-4 px-5 py-4">
          <Skeleton className="mt-1 h-2.5 w-2.5 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-3/5" />
            <Skeleton className="h-3 w-2/5" />
            <div className="flex gap-2">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-3 w-20" />
            </div>
          </div>
          <Skeleton className="h-4 w-4" />
        </div>
      ))}
    </div>
  );
}

export function MapPanelSkeleton({
  heightClassName = "h-[500px] sm:h-[600px]",
}: {
  heightClassName?: string;
}) {
  return (
    <div className="rounded-xl border bg-white overflow-hidden">
      <div className="space-y-3 border-b p-4">
        <Skeleton className="h-4 w-24" />
        <div className="flex flex-wrap gap-2">
          {Array.from({ length: 5 }).map((_, idx) => (
            <Skeleton key={idx} className="h-7 w-20 rounded-full" />
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          <Skeleton className="h-8 w-40 rounded-md" />
          <Skeleton className="h-8 w-24 rounded-md" />
          <Skeleton className="ml-auto h-4 w-24" />
        </div>
      </div>
      <div className={cn("relative", heightClassName)}>
        <Skeleton className="h-full w-full rounded-none" />
      </div>
    </div>
  );
}

export function AdminOverviewSkeleton() {
  return (
    <div className="space-y-6">
      <PageHeadingSkeleton />
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
        {Array.from({ length: 7 }).map((_, idx) => (
          <div key={idx} className="rounded-lg border bg-white p-4">
            <Skeleton className="mb-3 h-10 w-10 rounded-lg" />
            <Skeleton className="mb-2 h-7 w-12" />
            <Skeleton className="h-3 w-16" />
          </div>
        ))}
      </div>
      <ChartPanelsSkeleton />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-lg border bg-white p-6 shadow-sm space-y-3">
          <Skeleton className="h-5 w-40" />
          {Array.from({ length: 5 }).map((_, idx) => (
            <div key={idx} className="flex items-center justify-between">
              <div className="space-y-2">
                <Skeleton className="h-4 w-44" />
                <Skeleton className="h-3 w-32" />
              </div>
              <Skeleton className="h-6 w-20 rounded-full" />
            </div>
          ))}
        </div>
        <div className="rounded-lg border bg-white p-6 shadow-sm space-y-3">
          <Skeleton className="h-5 w-48" />
          {Array.from({ length: 6 }).map((_, idx) => (
            <div key={idx} className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Skeleton className="h-6 w-6 rounded-full" />
                <Skeleton className="h-4 w-28" />
              </div>
              <Skeleton className="h-4 w-8" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function BarangayCardsSkeleton({ cards = 6 }: { cards?: number }) {
  return (
    <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: cards }).map((_, idx) => (
        <div key={idx} className="rounded-xl border bg-white p-5 space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-2">
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-3 w-28" />
            </div>
            <Skeleton className="h-6 w-20 rounded-full" />
          </div>
          <Skeleton className="h-2.5 w-full rounded-full" />
        </div>
      ))}
    </div>
  );
}

export function ReportDetailSkeleton() {
  return (
    <div className="space-y-6">
      <div className="mb-6 flex items-center gap-4">
        <Skeleton className="h-9 w-24 rounded-md" />
        <Skeleton className="h-8 w-64 max-w-[55%]" />
        <Skeleton className="h-6 w-24 rounded-full" />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <div className="rounded-lg border bg-white p-6 shadow-sm space-y-3">
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-11/12" />
            <Skeleton className="h-4 w-9/12" />
          </div>

          <div className="rounded-lg border bg-white p-6 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <Skeleton className="h-6 w-40" />
              <Skeleton className="h-9 w-40 rounded-md" />
            </div>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
              {Array.from({ length: 6 }).map((_, idx) => (
                <Skeleton
                  key={idx}
                  className="aspect-square w-full rounded-lg"
                />
              ))}
            </div>
          </div>

          <div className="rounded-lg border bg-white p-6 shadow-sm space-y-3">
            <Skeleton className="h-6 w-36" />
            {Array.from({ length: 4 }).map((_, idx) => (
              <div key={idx} className="space-y-2">
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-3 w-1/3" />
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, idx) => (
            <div
              key={idx}
              className="rounded-lg border bg-white p-5 shadow-sm space-y-3"
            >
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-9 w-full rounded-md" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function FieldWorkerTaskDetailSkeleton() {
  return (
    <div className="space-y-6 pb-8">
      <Skeleton className="h-4 w-32" />

      <div className="rounded-xl border bg-white p-5 space-y-4">
        <div className="space-y-2">
          <Skeleton className="h-7 w-2/3" />
          <div className="flex gap-2">
            <Skeleton className="h-6 w-24 rounded-full" />
            <Skeleton className="h-6 w-20 rounded-full" />
            <Skeleton className="h-6 w-20 rounded-full" />
          </div>
        </div>
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-11/12" />
        <div className="flex flex-wrap gap-3">
          <Skeleton className="h-3 w-40" />
          <Skeleton className="h-3 w-32" />
          <Skeleton className="h-3 w-36" />
        </div>
      </div>

      <div className="rounded-xl border bg-white overflow-hidden">
        <div className="border-b px-5 py-3">
          <Skeleton className="h-4 w-36" />
        </div>
        <Skeleton className="h-64 w-full rounded-none" />
      </div>

      <div className="rounded-xl border bg-white p-5 space-y-4">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-32 w-full rounded-xl" />
        <Skeleton className="h-20 w-full rounded-md" />
        <div className="flex gap-3">
          <Skeleton className="h-10 w-36 rounded-lg" />
          <Skeleton className="h-10 w-36 rounded-lg" />
        </div>
      </div>
    </div>
  );
}
