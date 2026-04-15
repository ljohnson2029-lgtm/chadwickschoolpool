import { useEffect } from "react";
import { Label } from "@/components/ui/label";
import { Car, Star } from "lucide-react";
import { cn } from "@/lib/utils";
import { type VehicleInfo, useVehicles } from "@/hooks/useVehicles";

interface VehicleSelectorProps {
  selectedVehicleId: string | null;
  onSelect: (vehicleId: string, info: VehicleInfo) => void;
  label?: string;
}

const VehicleSelector = ({ selectedVehicleId, onSelect, label = "Driving Today With:" }: VehicleSelectorProps) => {
  const { vehicles, loading, primaryVehicle, toVehicleInfo } = useVehicles();

  // Auto-select primary on mount
  useEffect(() => {
    if (!selectedVehicleId && primaryVehicle) {
      onSelect(primaryVehicle.id, toVehicleInfo(primaryVehicle));
    }
  }, [primaryVehicle, selectedVehicleId]);

  if (loading) return <p className="text-xs text-muted-foreground">Loading vehicles...</p>;
  if (vehicles.length === 0) return null;
  if (vehicles.length === 1) {
    // Single vehicle - just show it, no picker needed
    const v = vehicles[0];
    return (
      <div className="space-y-1.5">
        <Label className="flex items-center gap-1.5 text-sm"><Car className="h-4 w-4" /> {label}</Label>
        <div className="border rounded-lg p-3 bg-muted/30">
          <p className="text-sm font-medium">{v.car_color} {v.car_make} {v.car_model}</p>
          <p className="text-xs text-muted-foreground">Plate: {v.license_plate}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <Label className="flex items-center gap-1.5 text-sm"><Car className="h-4 w-4" /> {label}</Label>
      <div className="space-y-2">
        {vehicles.map((v) => {
          const isSelected = selectedVehicleId === v.id;
          return (
            <button
              key={v.id}
              type="button"
              className={cn(
                "w-full text-left border rounded-lg p-3 transition-all",
                isSelected
                  ? "border-primary bg-primary/5 ring-1 ring-primary"
                  : "border-border hover:border-primary/40 hover:bg-muted/30"
              )}
              onClick={() => onSelect(v.id, toVehicleInfo(v))}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">{v.car_color} {v.car_make} {v.car_model}</p>
                  <p className="text-xs text-muted-foreground">Plate: {v.license_plate}</p>
                </div>
                <div className="flex items-center gap-1.5">
                  {v.is_primary && (
                    <span className="text-xs text-amber-600 flex items-center gap-0.5">
                      <Star className="h-3 w-3 fill-current" /> Primary
                    </span>
                  )}
                  <div className={cn(
                    "w-4 h-4 rounded-full border-2 flex items-center justify-center",
                    isSelected ? "border-primary" : "border-muted-foreground/30"
                  )}>
                    {isSelected && <div className="w-2 h-2 rounded-full bg-primary" />}
                  </div>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default VehicleSelector;
