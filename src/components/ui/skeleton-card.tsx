import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export const SkeletonCard = () => (
  <Card>
    <CardHeader>
      <div className="flex items-center gap-3">
        <Skeleton className="h-12 w-12 rounded-full" />
        <div className="space-y-2">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-3 w-24" />
        </div>
      </div>
    </CardHeader>
    <CardContent>
      <div className="space-y-2">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
      </div>
    </CardContent>
  </Card>
);

export const SkeletonQuickActionCard = () => (
  <Card>
    <CardHeader>
      <div className="flex items-center gap-3">
        <Skeleton className="h-12 w-12 rounded-full" />
        <div className="space-y-2">
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-3 w-32" />
        </div>
      </div>
    </CardHeader>
    <CardContent>
      <Skeleton className="h-4 w-full mb-4" />
      <Skeleton className="h-10 w-full" />
    </CardContent>
  </Card>
);

export const SkeletonRideCard = () => (
  <Card>
    <CardHeader>
      <div className="flex items-center justify-between">
        <Skeleton className="h-6 w-20" />
        <Skeleton className="h-6 w-16" />
      </div>
    </CardHeader>
    <CardContent>
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Skeleton className="h-4 w-4" />
          <Skeleton className="h-4 w-32" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-4 w-4" />
          <Skeleton className="h-4 w-48" />
        </div>
        <Skeleton className="h-8 w-24" />
      </div>
    </CardContent>
  </Card>
);

export const SkeletonListItem = () => (
  <Card>
    <CardContent className="py-4">
      <div className="flex items-start gap-4">
        <Skeleton className="h-12 w-12 rounded-full flex-shrink-0" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-3 w-1/2" />
          <div className="flex gap-2 pt-2">
            <Skeleton className="h-6 w-16" />
            <Skeleton className="h-6 w-20" />
          </div>
        </div>
      </div>
    </CardContent>
  </Card>
);

export const SkeletonCarpoolItem = () => (
  <Card>
    <CardContent className="py-4">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 space-y-3">
          <div className="flex items-center gap-2">
            <Skeleton className="h-5 w-20" />
            <Skeleton className="h-5 w-32" />
          </div>
          <div className="flex items-center gap-4">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-16" />
          </div>
          <Skeleton className="h-4 w-full" />
        </div>
        <Skeleton className="h-6 w-16" />
      </div>
    </CardContent>
  </Card>
);

export const SkeletonMapControls = () => (
  <div className="space-y-4 p-4">
    <Skeleton className="h-10 w-full" />
    <Skeleton className="h-10 w-full" />
    <div className="space-y-2">
      <Skeleton className="h-4 w-24" />
      <Skeleton className="h-8 w-full" />
    </div>
    <div className="space-y-2">
      <Skeleton className="h-4 w-24" />
      <Skeleton className="h-8 w-full" />
    </div>
    <Skeleton className="h-10 w-full" />
  </div>
);

interface SkeletonListProps {
  count?: number;
  variant?: 'card' | 'list' | 'carpool' | 'ride';
}

export const SkeletonList = ({ count = 5, variant = 'list' }: SkeletonListProps) => {
  const Component = {
    card: SkeletonCard,
    list: SkeletonListItem,
    carpool: SkeletonCarpoolItem,
    ride: SkeletonRideCard,
  }[variant];

  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <Component key={i} />
      ))}
    </div>
  );
};
