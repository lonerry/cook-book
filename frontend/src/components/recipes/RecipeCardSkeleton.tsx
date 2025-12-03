import { Skeleton } from '@/components/ui/skeleton';

export const RecipeCardSkeleton = () => {
  return (
    <div className="bg-card rounded-xl overflow-hidden shadow-card">
      {/* Image Skeleton */}
      <Skeleton className="aspect-[4/3] w-full" />
      
      {/* Content Skeleton */}
      <div className="p-4 space-y-3">
        {/* Category & Date */}
        <div className="flex items-center justify-between">
          <Skeleton className="h-5 w-16" />
          <Skeleton className="h-4 w-12" />
        </div>

        {/* Title */}
        <Skeleton className="h-6 w-full" />
        <Skeleton className="h-6 w-3/4" />

        {/* Author */}
        <div className="flex items-center gap-2">
          <Skeleton className="h-6 w-6 rounded-full" />
          <Skeleton className="h-4 w-24" />
        </div>
      </div>
    </div>
  );
};
