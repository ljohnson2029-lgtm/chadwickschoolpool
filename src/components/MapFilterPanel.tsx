import React from 'react';
import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Home, School, Hand, Car, Filter, ChevronDown, ChevronUp, Eye, EyeOff } from 'lucide-react';

interface MapFilterPanelProps {
  showRequests: boolean;
  showOffers: boolean;
  showHome: boolean;
  showSchool: boolean;
  onToggleRequests: (checked: boolean) => void;
  onToggleOffers: (checked: boolean) => void;
  onToggleHome: (checked: boolean) => void;
  onToggleSchool: (checked: boolean) => void;
  requestCount?: number;
  offerCount?: number;
}

const MapFilterPanel: React.FC<MapFilterPanelProps> = ({
  showRequests,
  showOffers,
  showHome,
  showSchool,
  onToggleRequests,
  onToggleOffers,
  onToggleHome,
  onToggleSchool,
  requestCount = 0,
  offerCount = 0
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);

  const allOn = showRequests && showOffers && showHome && showSchool;
  const allOff = !showRequests && !showOffers && !showHome && !showSchool;

  const handleShowAll = () => {
    onToggleRequests(true);
    onToggleOffers(true);
    onToggleHome(true);
    onToggleSchool(true);
  };

  const handleHideAll = () => {
    onToggleRequests(false);
    onToggleOffers(false);
    onToggleHome(false);
    onToggleSchool(false);
  };

  return (
    <Card className="bg-background/95 backdrop-blur-sm shadow-md border-border min-w-[160px]">
      <CardContent className="p-2 space-y-2">
        {/* Header with collapse toggle */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="w-full h-6 px-1 flex items-center justify-between text-xs font-medium text-muted-foreground hover:text-foreground">
          
          <span className="flex items-center gap-1.5">
            <Filter className="h-3 w-3" />
            Filters
          </span>
          {isCollapsed ?
          <ChevronDown className="h-3 w-3" /> :

          <ChevronUp className="h-3 w-3" />
          }
        </Button>

        {!isCollapsed &&
        <div className="space-y-1.5 pt-1 border-t border-border">
            {/* Ride Offers (green, listed first) */}
            <div className="flex items-center gap-2">
              <Checkbox
              id="filter-offers"
              checked={showOffers}
              onCheckedChange={(checked) => onToggleOffers(checked === true)}
              className="h-3.5 w-3.5 data-[state=checked]:bg-green-500 data-[state=checked]:border-green-500" />
            
              <Label
              htmlFor="filter-offers"
              className="flex items-center gap-1.5 text-xs cursor-pointer flex-1">
              
                <div className="w-3 h-3 rounded-full bg-green-500 flex items-center justify-center">
                  <Car className="h-2 w-2 text-white" />
                </div>
                <span>Ride Offers</span>
                {offerCount > 0 &&
              <span className="text-[10px] text-muted-foreground">({offerCount})</span>
              }
              </Label>
            </div>

            {/* Ride Requests (red) */}
            <div className="flex items-center gap-2">
              <Checkbox
              id="filter-requests"
              checked={showRequests}
              onCheckedChange={(checked) => onToggleRequests(checked === true)}
              className="h-3.5 w-3.5 data-[state=checked]:bg-red-500 data-[state=checked]:border-red-500" />
            
              <Label
              htmlFor="filter-requests"
              className="flex items-center gap-1.5 text-xs cursor-pointer flex-1">
              
                <div className="w-3 h-3 rounded-full bg-red-500 flex items-center justify-center">
                  <Hand className="h-2 w-2 text-white" />
                </div>
                <span>Ride Requests</span>
                {requestCount > 0 &&
              <span className="text-[10px] text-muted-foreground">({requestCount})</span>
              }
              </Label>
            </div>

            {/* Family Homes (blue) */}
            <div className="flex items-center gap-2 pt-1 border-t border-border/50">
              <Checkbox
              id="filter-home"
              checked={showHome}
              onCheckedChange={(checked) => onToggleHome(checked === true)}
              className="h-3.5 w-3.5 data-[state=checked]:bg-blue-500 data-[state=checked]:border-blue-500" />
            
              <Label
              htmlFor="filter-home"
              className="flex items-center gap-1.5 text-xs cursor-pointer">
              
                <div className="w-3 h-3 rounded-full bg-blue-500 flex items-center justify-center">
                  <Home className="h-2 w-2 text-white" />
                </div>
                <span>Your Home</span>
              </Label>
            </div>

            {/* School (orange) */}
            <div className="flex items-center gap-2">
              <Checkbox
              id="filter-school"
              checked={showSchool}
              onCheckedChange={(checked) => onToggleSchool(checked === true)}
              className="h-3.5 w-3.5 data-[state=checked]:bg-orange-500 data-[state=checked]:border-orange-500" />
            
              <Label
              htmlFor="filter-school"
              className="flex items-center gap-1.5 text-xs cursor-pointer">
              
                <div className="w-3 h-3 rounded-full bg-orange-500 flex items-center justify-center">
                  <School className="h-2 w-2 text-white" />
                </div>
                <span>School</span>
              </Label>
            </div>

            {/* Show All / Hide All */}
            <div className="flex gap-1.5 pt-1.5 border-t border-border/50">
              <Button
              variant="outline"
              size="sm"
              onClick={handleShowAll}
              disabled={allOn}
              className="flex-1 h-6 text-[10px] px-1.5 gap-1">
              
                <Eye className="h-2.5 w-2.5" />
                Show All
              </Button>
              <Button
              variant="outline"
              size="sm"
              onClick={handleHideAll}
              disabled={allOff}
              className="flex-1 h-6 text-[10px] px-1.5 gap-1">
              
                <EyeOff className="h-2.5 w-2.5" />
                Hide All
              </Button>
            </div>
          </div>
        }
      </CardContent>
    </Card>);

};

export default MapFilterPanel;