 import { Card, CardContent } from "@/components/ui/card";
 import { Badge } from "@/components/ui/badge";
 import { Calendar, Clock, MapPin, Car, Hand } from "lucide-react";
 import { format } from "date-fns";
 import type { FamilyRide } from "@/hooks/useLinkedParentRides";
 
 interface FamilyRideCardProps {
   ride: FamilyRide;
 }
 
 export function FamilyRideCard({ ride }: FamilyRideCardProps) {
   const formatTime = (timeStr: string) => {
     try {
       return new Date(`2000-01-01T${timeStr}`).toLocaleTimeString("en-US", {
         hour: "numeric",
         minute: "2-digit",
       });
     } catch {
       return timeStr;
     }
   };
 
   return (
     <Card className="hover:shadow-md transition-shadow">
       <CardContent className="py-4">
         <div className="flex items-start justify-between gap-4">
           <div className="flex-1 space-y-2">
             {/* Type and parent badges */}
             <div className="flex items-center gap-2 flex-wrap">
               <Badge 
                 variant={ride.type === 'offer' ? 'default' : 'secondary'}
                 className="gap-1"
               >
                 {ride.type === 'offer' ? (
                   <>
                     <Car className="h-3 w-3" />
                     Ride Offer
                   </>
                 ) : (
                   <>
                     <Hand className="h-3 w-3" />
                     Ride Request
                   </>
                 )}
               </Badge>
               <Badge variant="outline" className="text-xs">
                 By {ride.parent_name}
               </Badge>
             </div>
             
             {/* Date and time */}
             <div className="flex items-center gap-4 text-sm">
               <div className="flex items-center gap-1.5">
                 <Calendar className="h-4 w-4 text-muted-foreground" />
                 <span>{format(new Date(ride.ride_date), 'EEE, MMM d')}</span>
               </div>
               <div className="flex items-center gap-1.5">
                 <Clock className="h-4 w-4 text-muted-foreground" />
                 <span>{formatTime(ride.ride_time)}</span>
               </div>
             </div>
             
             {/* Locations */}
             <div className="text-sm text-muted-foreground">
               <div className="flex items-start gap-1.5">
                 <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0" />
                 <span className="line-clamp-2">
                   {ride.pickup_location} → {ride.dropoff_location}
                 </span>
               </div>
             </div>
 
             {/* Seats info */}
             {(ride.seats_needed || ride.seats_available) && (
               <div className="text-xs text-muted-foreground">
                 {ride.type === 'request' && ride.seats_needed && (
                   <span>Needs {ride.seats_needed} seat{ride.seats_needed > 1 ? 's' : ''}</span>
                 )}
                 {ride.type === 'offer' && ride.seats_available && (
                   <span>{ride.seats_available} seat{ride.seats_available > 1 ? 's' : ''} available</span>
                 )}
               </div>
             )}
           </div>
           
           {/* Read-only badge */}
           <Badge variant="outline" className="text-xs text-muted-foreground shrink-0">
             View only
           </Badge>
         </div>
       </CardContent>
     </Card>
   );
 }