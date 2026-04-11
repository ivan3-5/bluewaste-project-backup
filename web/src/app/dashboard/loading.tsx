import {
  AdminOverviewSkeleton,
  DashboardLayoutSkeleton,
} from "@/components/skeletons/page-skeletons";

export default function Loading() {
  return (
    <DashboardLayoutSkeleton>
      <AdminOverviewSkeleton />
    </DashboardLayoutSkeleton>
  );
}
