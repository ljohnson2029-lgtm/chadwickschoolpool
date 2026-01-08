import { Map, Loader2 } from "lucide-react";
import { SkeletonMapControls } from "@/components/ui/skeleton-card";

interface MapLoadingStateProps {
  showControls?: boolean;
}

const MapLoadingState = ({ showControls = true }: MapLoadingStateProps) => {
  return (
    <div className="h-full w-full flex">
      {/* Map area */}
      <div className="flex-1 bg-muted/30 flex flex-col items-center justify-center">
        <div className="flex flex-col items-center gap-4 text-muted-foreground">
          <div className="relative">
            <Map className="h-16 w-16 opacity-50" />
            <Loader2 className="h-6 w-6 absolute -bottom-1 -right-1 animate-spin text-primary" />
          </div>
          <p className="text-sm font-medium">Loading map...</p>
          <p className="text-xs text-muted-foreground/70">This may take a moment</p>
        </div>
      </div>

      {/* Control panel skeleton */}
      {showControls && (
        <div className="w-80 border-l border-border bg-background">
          <SkeletonMapControls />
        </div>
      )}
    </div>
  );
};

export default MapLoadingState;
