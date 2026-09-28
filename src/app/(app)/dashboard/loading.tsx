import { Skeleton } from "@/components/ui/misc";

export default function Loading() {
  return (
    <div aria-busy="true" aria-label="Loading dashboard">
      <Skeleton className="mb-3 h-3 w-28" />
      <Skeleton className="mb-8 h-8 w-72" />
      <Skeleton className="mb-6 h-9 w-80" />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
        {Array.from({ length: 10 }).map((_, i) => (
          <Skeleton key={i} className="h-[112px] rounded-2xl" />
        ))}
      </div>
      <div className="mt-4 grid gap-4 xl:grid-cols-3">
        <Skeleton className="h-[330px] rounded-2xl xl:col-span-2" />
        <Skeleton className="h-[330px] rounded-2xl" />
      </div>
    </div>
  );
}
