import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  MapPin, 
  ChevronDown, 
  ChevronUp,
  Navigation
} from 'lucide-react';
import { HelpTooltip } from './HelpTooltip';

export type ParentFilter = 'all' | 'with-rides' | 'within-radius' | 'linked-only';

interface MapControlPanelProps {
  radiusMiles: number;
  onRadiusChange: (value: number[]) => void;
  showRoute: boolean;
  onShowRouteChange: (checked: boolean) => void;
  filter: ParentFilter;
  onFilterChange: (filter: ParentFilter) => void;
  onCenterOnUser: () => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  disabled?: boolean;
}

const MapControlPanel: React.FC<MapControlPanelProps> = ({
  radiusMiles,
  onRadiusChange,
  showRoute,
  onShowRouteChange,
  filter,
  onFilterChange,
  onCenterOnUser,
  isCollapsed,
  onToggleCollapse,
  disabled = false
}) => {
  return (
    <Card className="bg-background/95 backdrop-blur-sm border-border shadow-lg animate-fade-in">
      <CardContent className="p-4 space-y-4">
        {/* Header with collapse button */}
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-sm flex items-center gap-2">
            <Navigation className="h-4 w-4" />
            Map Controls
          </h3>
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggleCollapse}
            className="h-6 w-6 p-0"
            aria-label={isCollapsed ? "Expand controls" : "Collapse controls"}
          >
            {isCollapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
          </Button>
        </div>

        {!isCollapsed && (
          <>
            {/* My Location Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={onCenterOnUser}
              disabled={disabled}
              className="w-full justify-start gap-2"
              aria-label="Center map on your location"
            >
              <MapPin className="h-4 w-4" />
              My Location
            </Button>

            {/* Show Route Toggle */}
            <div className="flex items-center justify-between gap-2">
              <Label 
                htmlFor="show-route" 
                className="text-sm font-normal cursor-pointer flex-1"
              >
                Show Route to School
              </Label>
              <Switch
                id="show-route"
                checked={showRoute}
                onCheckedChange={onShowRouteChange}
                disabled={disabled}
                aria-label="Toggle route visibility"
              />
            </div>

            {/* Radius Slider */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-1">
                  <Label htmlFor="radius-slider" className="text-sm font-normal">
                    Search Radius:
                  </Label>
                  <HelpTooltip content="Shows parents within this distance from your route to school" />
                </div>
                <span 
                  className="text-sm font-bold text-primary"
                  aria-live="polite"
                  aria-atomic="true"
                >
                  {radiusMiles.toFixed(1)} mi
                </span>
              </div>
              <Slider
                id="radius-slider"
                value={[radiusMiles]}
                onValueChange={onRadiusChange}
                min={0.5}
                max={10}
                step={0.5}
                disabled={disabled}
                className="w-full"
                aria-label={`Search radius: ${radiusMiles.toFixed(1)} miles`}
              />
              <p className="text-xs text-muted-foreground">
                Distance from your route
              </p>
            </div>

            {/* Filter Dropdown */}
            <div className="space-y-2">
              <Label htmlFor="parent-filter" className="text-sm font-normal">
                Show Parents:
              </Label>
              <Select
                value={filter}
                onValueChange={(value) => onFilterChange(value as ParentFilter)}
                disabled={disabled}
              >
                <SelectTrigger 
                  id="parent-filter" 
                  className="w-full"
                  aria-label="Filter parents"
                >
                  <SelectValue placeholder="Select filter" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Parents</SelectItem>
                  <SelectItem value="with-rides">Parents with Rides Available</SelectItem>
                  <SelectItem value="within-radius">Within My Radius</SelectItem>
                  <SelectItem value="linked-only">Linked Parents Only</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default MapControlPanel;
