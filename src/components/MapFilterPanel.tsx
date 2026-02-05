 import React from 'react';
 import { Card, CardContent } from '@/components/ui/card';
 import { Checkbox } from '@/components/ui/checkbox';
 import { Label } from '@/components/ui/label';
 import { Home, School, Hand, Car, Filter } from 'lucide-react';
 
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
     <Card className="bg-background/95 backdrop-blur-sm shadow-lg border-border">
       <CardContent className="p-3 space-y-3">
         <div className="flex items-center gap-2 text-xs font-semibold uppercase text-muted-foreground border-b border-border pb-2">
           <Filter className="h-3 w-3" />
           Map Filters
         </div>
 
         {/* Ride Requests */}
         <div className="flex items-center gap-3">
           <Checkbox
             id="filter-requests"
             checked={showRequests}
             onCheckedChange={(checked) => handleRequestToggle(checked === true)}
             className="data-[state=checked]:bg-red-500 data-[state=checked]:border-red-500"
           />
           <Label
             htmlFor="filter-requests"
             className="flex items-center gap-2 text-sm cursor-pointer flex-1"
           >
             <div className="w-4 h-4 rounded-full bg-red-500 border-2 border-white shadow flex items-center justify-center">
               <Hand className="h-2.5 w-2.5 text-white" />
             </div>
             <span>Ride Requests</span>
             {requestCount > 0 && (
               <span className="text-xs text-muted-foreground">({requestCount})</span>
             )}
           </Label>
         </div>
 
         {/* Ride Offers */}
         <div className="flex items-center gap-3">
           <Checkbox
             id="filter-offers"
             checked={showOffers}
             onCheckedChange={(checked) => handleOfferToggle(checked === true)}
             className="data-[state=checked]:bg-green-500 data-[state=checked]:border-green-500"
           />
           <Label
             htmlFor="filter-offers"
             className="flex items-center gap-2 text-sm cursor-pointer flex-1"
           >
             <div className="w-4 h-4 rounded-full bg-green-500 border-2 border-white shadow flex items-center justify-center">
               <Car className="h-2.5 w-2.5 text-white" />
             </div>
             <span>Ride Offers</span>
             {offerCount > 0 && (
               <span className="text-xs text-muted-foreground">({offerCount})</span>
             )}
           </Label>
         </div>
 
         <div className="border-t border-border pt-2 space-y-3">
           {/* My Home */}
           <div className="flex items-center gap-3">
             <Checkbox
               id="filter-home"
               checked={showHome}
               onCheckedChange={(checked) => onToggleHome(checked === true)}
               className="data-[state=checked]:bg-blue-500 data-[state=checked]:border-blue-500"
             />
             <Label
               htmlFor="filter-home"
               className="flex items-center gap-2 text-sm cursor-pointer"
             >
               <div className="w-4 h-4 rounded-full bg-blue-500 border-2 border-white shadow flex items-center justify-center">
                 <Home className="h-2.5 w-2.5 text-white" />
               </div>
               <span>My Home</span>
             </Label>
           </div>
 
           {/* Chadwick School */}
           <div className="flex items-center gap-3">
             <Checkbox
               id="filter-school"
               checked={showSchool}
               onCheckedChange={(checked) => onToggleSchool(checked === true)}
               className="data-[state=checked]:bg-orange-500 data-[state=checked]:border-orange-500"
             />
             <Label
               htmlFor="filter-school"
               className="flex items-center gap-2 text-sm cursor-pointer"
             >
               <div className="w-4 h-4 rounded-full bg-orange-500 border-2 border-white shadow flex items-center justify-center">
                 <School className="h-2.5 w-2.5 text-white" />
               </div>
               <span>Chadwick School</span>
             </Label>
           </div>
         </div>
       </CardContent>
     </Card>
   );
 };
 
 export default MapFilterPanel;