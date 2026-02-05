 import React from 'react';
import { useState } from 'react';
 import { Card, CardContent } from '@/components/ui/card';
 import { Checkbox } from '@/components/ui/checkbox';
 import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Home, School, Hand, Car, Filter, ChevronDown, ChevronUp } from 'lucide-react';
 
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
   offerCount = 0,
 }) => {
  const [isCollapsed, setIsCollapsed] = useState(false);

   // Prevent unchecking both ride types (at least one must be visible)
   const handleRequestToggle = (checked: boolean) => {
     if (!checked && !showOffers) return; // Prevent unchecking if offers is already off
     onToggleRequests(checked);
   };
 
   const handleOfferToggle = (checked: boolean) => {
     if (!checked && !showRequests) return; // Prevent unchecking if requests is already off
     onToggleOffers(checked);
   };
 
   return (
    <Card className="bg-background/95 backdrop-blur-sm shadow-md border-border min-w-[140px]">
      <CardContent className="p-2 space-y-2">
        {/* Header with collapse toggle */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="w-full h-6 px-1 flex items-center justify-between text-xs font-medium text-muted-foreground hover:text-foreground"
        >
          <span className="flex items-center gap-1.5">
            <Filter className="h-3 w-3" />
            Filters
          </span>
          {isCollapsed ? (
            <ChevronDown className="h-3 w-3" />
          ) : (
            <ChevronUp className="h-3 w-3" />
          )}
        </Button>
 
        {!isCollapsed && (
          <div className="space-y-1.5 pt-1 border-t border-border">
            {/* Ride Requests */}
            <div className="flex items-center gap-2">
              <Checkbox
                id="filter-requests"
                checked={showRequests}
                onCheckedChange={(checked) => handleRequestToggle(checked === true)}
                className="h-3.5 w-3.5 data-[state=checked]:bg-red-500 data-[state=checked]:border-red-500"
              />
              <Label
                htmlFor="filter-requests"
                className="flex items-center gap-1.5 text-xs cursor-pointer flex-1"
              >
                <div className="w-3 h-3 rounded-full bg-red-500 flex items-center justify-center">
                  <Hand className="h-2 w-2 text-white" />
                </div>
                <span>Requests</span>
                {requestCount > 0 && (
                  <span className="text-[10px] text-muted-foreground">({requestCount})</span>
                )}
              </Label>
             </div>
 
            {/* Ride Offers */}
            <div className="flex items-center gap-2">
              <Checkbox
                id="filter-offers"
                checked={showOffers}
                onCheckedChange={(checked) => handleOfferToggle(checked === true)}
                className="h-3.5 w-3.5 data-[state=checked]:bg-green-500 data-[state=checked]:border-green-500"
              />
              <Label
                htmlFor="filter-offers"
                className="flex items-center gap-1.5 text-xs cursor-pointer flex-1"
              >
                <div className="w-3 h-3 rounded-full bg-green-500 flex items-center justify-center">
                  <Car className="h-2 w-2 text-white" />
                </div>
                <span>Offers</span>
                {offerCount > 0 && (
                  <span className="text-[10px] text-muted-foreground">({offerCount})</span>
                )}
              </Label>
             </div>
 
            {/* My Home */}
            <div className="flex items-center gap-2 pt-1 border-t border-border/50">
              <Checkbox
                id="filter-home"
                checked={showHome}
                onCheckedChange={(checked) => onToggleHome(checked === true)}
                className="h-3.5 w-3.5 data-[state=checked]:bg-blue-500 data-[state=checked]:border-blue-500"
              />
              <Label
                htmlFor="filter-home"
                className="flex items-center gap-1.5 text-xs cursor-pointer"
              >
                <div className="w-3 h-3 rounded-full bg-blue-500 flex items-center justify-center">
                  <Home className="h-2 w-2 text-white" />
                </div>
                <span>My Home</span>
              </Label>
               </div>
 
            {/* Chadwick School */}
            <div className="flex items-center gap-2">
              <Checkbox
                id="filter-school"
                checked={showSchool}
                onCheckedChange={(checked) => onToggleSchool(checked === true)}
                className="h-3.5 w-3.5 data-[state=checked]:bg-orange-500 data-[state=checked]:border-orange-500"
              />
              <Label
                htmlFor="filter-school"
                className="flex items-center gap-1.5 text-xs cursor-pointer"
              >
                <div className="w-3 h-3 rounded-full bg-orange-500 flex items-center justify-center">
                  <School className="h-2 w-2 text-white" />
                </div>
                <span>School</span>
              </Label>
               </div>
           </div>
        )}
       </CardContent>
     </Card>
   );
 };
 
 export default MapFilterPanel;