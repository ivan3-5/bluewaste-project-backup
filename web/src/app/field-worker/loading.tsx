import {
  FieldWorkerLayoutSkeleton,
  ListCardsSkeleton,
  PageHeadingSkeleton,
  StatsCardsSkeleton,
} from "@/components/skeletons/page-skeletons";

export default function Loading() {
  return (
    <FieldWorkerLayoutSkeleton>
      <div className="space-y-6">
        <PageHeadingSkeleton />
        <StatsCardsSkeleton count={4} />
        <ListCardsSkeleton rows={4} />
      </div>
    </FieldWorkerLayoutSkeleton>
  );
}
