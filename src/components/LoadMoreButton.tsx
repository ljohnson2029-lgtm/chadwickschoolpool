import { Button } from "@/components/ui/button";
import { Loader2, ChevronDown } from "lucide-react";

interface LoadMoreButtonProps {
  onLoadMore: () => void;
  hasMore: boolean;
  loading?: boolean;
  loadedCount: number;
  totalCount: number;
  className?: string;
}

export const LoadMoreButton = ({
  onLoadMore,
  hasMore,
  loading = false,
  loadedCount,
  totalCount,
  className = "",
}: LoadMoreButtonProps) => {
  if (!hasMore) return null;

  return (
    <div className={`flex flex-col items-center gap-2 py-4 ${className}`}>
      <Button
        variant="outline"
        onClick={onLoadMore}
        disabled={loading}
        className="gap-2"
      >
        {loading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading...
          </>
        ) : (
          <>
            <ChevronDown className="h-4 w-4" />
            Load More
          </>
        )}
      </Button>
      <p className="text-sm text-muted-foreground">
        Showing {loadedCount} of {totalCount} items
      </p>
    </div>
  );
};