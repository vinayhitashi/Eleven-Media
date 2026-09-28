import { Skeleton } from "@/components/ui/misc";

export default function Loading() {
  return (
    <div aria-busy="true">
      <Skeleton className="mb-3 h-3 w-24" />
      <Skeleton className="mb-8 h-8 w-64" />
      <Skeleton className="h-[420px] rounded-2xl" />
    </div>
  );
}
