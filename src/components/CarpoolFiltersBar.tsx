import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Filter, RotateCcw, Hand, Car, MapPin } from "lucide-react";

export type RadiusOption = "any" | "1" | "2" | "5" | "10" | "25";

interface CarpoolFiltersBarProps {
  showRequests: boolean;
  showOffers: boolean;
  radius: RadiusOption;
  onToggleRequests: (v: boolean) => void;
  onToggleOffers: (v: boolean) => void;
  onRadiusChange: (v: RadiusOption) => void;
  onClear: () => void;
  hasHomeAddress: boolean;
}

const CarpoolFiltersBar: React.FC<CarpoolFiltersBarProps> = ({
  showRequests,
  showOffers,
  radius,
  onToggleRequests,
  onToggleOffers,
  onRadiusChange,
  onClear,
  hasHomeAddress,
}) => {
  return (
    <Card className="border-border/60 bg-white/80 backdrop-blur-sm">
      <CardContent className="p-4 flex flex-col md:flex-row md:items-center gap-4 flex-wrap">
        <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
          <Filter className="h-4 w-4 text-blue-600" />
          Filters
        </div>

        {/* Type filters */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Checkbox
              id="filter-bar-offers"
              checked={showOffers}
              onCheckedChange={(c) => onToggleOffers(c === true)}
              className="data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500"
            />
            <Label htmlFor="filter-bar-offers" className="flex items-center gap-1.5 text-sm cursor-pointer">
              <Car className="h-3.5 w-3.5 text-emerald-600" />
              Show Ride Offers
            </Label>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox
              id="filter-bar-requests"
              checked={showRequests}
              onCheckedChange={(c) => onToggleRequests(c === true)}
              className="data-[state=checked]:bg-red-500 data-[state=checked]:border-red-500"
            />
            <Label htmlFor="filter-bar-requests" className="flex items-center gap-1.5 text-sm cursor-pointer">
              <Hand className="h-3.5 w-3.5 text-red-600" />
              Show Ride Requests
            </Label>
          </div>
        </div>

        {/* Radius filter */}
        <div className="flex items-center gap-2">
          <Label htmlFor="filter-bar-radius" className="flex items-center gap-1.5 text-sm">
            <MapPin className="h-3.5 w-3.5 text-blue-600" />
            Within
          </Label>
          <Select value={radius} onValueChange={(v) => onRadiusChange(v as RadiusOption)}>
            <SelectTrigger id="filter-bar-radius" className="h-9 w-[140px]" disabled={!hasHomeAddress}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="any">Any distance</SelectItem>
              <SelectItem value="1">1 mile</SelectItem>
              <SelectItem value="2">2 miles</SelectItem>
              <SelectItem value="5">5 miles</SelectItem>
              <SelectItem value="10">10 miles</SelectItem>
              <SelectItem value="25">25 miles</SelectItem>
            </SelectContent>
          </Select>
          {!hasHomeAddress && (
            <span className="text-xs text-muted-foreground">(set home address to use)</span>
          )}
        </div>

        <div className="md:ml-auto">
          <Button variant="outline" size="sm" onClick={onClear} className="gap-2">
            <RotateCcw className="h-3.5 w-3.5" />
            Clear Filters
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default CarpoolFiltersBar;
