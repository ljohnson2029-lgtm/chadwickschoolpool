import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Calendar, 
  Clock, 
  MapPin, 
  Users, 
  Phone,
  Mail,
  X,
  Car,
  HandHelping,
  CheckCircle
} from "lucide-react";
import { format } from "date-fns";

export interface UnifiedRide {
  id: string;
  source: 'posted' | 'conversation' | 'private';
  rideType: 'request' | 'offer';
  status: 'posted-looking' | 'posted-offering' | 'joined-ride' | 'helping-out' | 'confirmed';
  rideStatus?: 'active' | 'completed' | 'cancelled' | 'expired';
  pickupLocation: string;
  dropoffLocation: string;
  rideDate: string;
  rideTime: string;
  seatsAvailable: number | null;
  seatsNeeded: number | null;
  isDriver: boolean;
  otherParent: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    username: string;
    email: string | null;
    phone: string | null;
  } | null;
  originalData: any;
}

interface UnifiedRideCardProps {
  ride: UnifiedRide;
  onCancel?: () => void;
  isPast?: boolean;
}

const getStatusConfig = (status: UnifiedRide['status'], source: UnifiedRide['source'], hasOtherParent: boolean) => {
  // Special case: if this is a posted ride with a connected parent, show as "Confirmed"
  if (source === 'posted' && hasOtherParent) {
    return {
      label: 'Confirmed',
      className: 'bg-green-500/15 text-green-600 border-green-500/30',
      icon: CheckCircle,
    };
  }

  switch (status) {
    case 'posted-looking':
      return {
        label: 'Posted - Looking for Help',
        className: 'bg-amber-500/15 text-amber-600 border-amber-500/30',
        icon: null,
      };
    case 'posted-offering':
      return {
        label: 'Posted - Offering Ride',
        className: 'bg-emerald-500/15 text-emerald-600 border-emerald-500/30',
        icon: null,
      };
    case 'joined-ride':
      return {
        label: 'Joined Ride',
        className: 'bg-blue-500/15 text-blue-600 border-blue-500/30',
        icon: Car,
      };
    case 'helping-out':
      return {
        label: 'Helping Out',
        className: 'bg-purple-500/15 text-purple-600 border-purple-500/30',
        icon: HandHelping,
      };
    case 'confirmed':
      return {
        label: 'Confirmed',
        className: 'bg-green-500/15 text-green-600 border-green-500/30',
        icon: CheckCircle,
      };
    default:
      return {
        label: 'Unknown',
        className: 'bg-gray-500/15 text-gray-600 border-gray-500/30',
        icon: null,
      };
  }
};

const getParentName = (parent: UnifiedRide['otherParent']) => {
  if (!parent) return 'Unknown';
  if (parent.firstName && parent.lastName) {
    return `${parent.firstName} ${parent.lastName}`;
  }
  if (parent.firstName) return parent.firstName;
  return parent.username;
};

export const UnifiedRideCard = ({ ride, onCancel, isPast }: UnifiedRideCardProps) => {
  const statusConfig = getStatusConfig(ride.status, ride.source, !!ride.otherParent);
  const StatusIcon = statusConfig.icon;

  const rideStatusBadge = isPast && ride.rideStatus && ride.rideStatus !== 'active' ? (
    <Badge className={
      ride.rideStatus === 'completed' ? 'bg-green-500/15 text-green-600 border-green-500/30' :
      ride.rideStatus === 'cancelled' ? 'bg-red-500/15 text-red-600 border-red-500/30' :
      'bg-gray-500/15 text-gray-600 border-gray-500/30'
    }>
      {ride.rideStatus === 'completed' ? 'Completed' : ride.rideStatus === 'cancelled' ? 'Cancelled' : 'Expired'}
    </Badge>
  ) : null;

  return (
    <Card className={`hover:shadow-lg transition-shadow ${isPast ? 'opacity-75' : ''}`}>
      <CardContent className="p-4 space-y-4">
        {/* Header with status badge and role */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge className={`${statusConfig.className} gap-1.5`}>
                {StatusIcon && <StatusIcon className="h-3 w-3" />}
                {statusConfig.label}
              </Badge>
              {rideStatusBadge}
            </div>
            {ride.isDriver !== null && (
              <p className="text-xs text-muted-foreground mt-1">
                {ride.isDriver ? "You're the driver" : "You're the passenger"}
              </p>
            )}
          </div>
          {!isPast && onCancel && (
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground hover:text-destructive"
              onClick={onCancel}
            >
              <X className="h-4 w-4 mr-1" />
              Cancel
            </Button>
          )}
        </div>

        {/* Route */}
        <div className="flex items-start gap-2">
          <MapPin className="h-4 w-4 mt-1 text-muted-foreground flex-shrink-0" />
          <div className="text-sm min-w-0">
            <div className="font-medium truncate">{ride.pickupLocation}</div>
            <div className="text-muted-foreground truncate">→ {ride.dropoffLocation}</div>
          </div>
        </div>

        {/* Date, Time, Seats */}
        <div className="flex flex-wrap items-center gap-4 text-sm">
          <div className="flex items-center gap-1.5">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            {format(new Date(ride.rideDate), 'EEE, MMM d')}
          </div>
          <div className="flex items-center gap-1.5">
            <Clock className="h-4 w-4 text-muted-foreground" />
            {ride.rideTime}
          </div>
          <div className="flex items-center gap-1.5">
            <Users className="h-4 w-4 text-muted-foreground" />
            {ride.seatsAvailable 
              ? `${ride.seatsAvailable} seats available`
              : ride.seatsNeeded 
                ? `${ride.seatsNeeded} seats needed`
                : '—'}
          </div>
        </div>

        {/* Other Parent Contact Info */}
        {ride.otherParent && (
          <div className="pt-3 border-t space-y-2">
            <p className="text-sm font-medium">
              {ride.source === 'posted' 
                ? `Connected with: ${getParentName(ride.otherParent)}`
                : `Riding with: ${getParentName(ride.otherParent)}`
              }
            </p>
            <div className="flex flex-wrap gap-3 text-sm">
              {ride.otherParent.email && (
                <a 
                  href={`mailto:${ride.otherParent.email}`}
                  className="flex items-center gap-1.5 text-primary hover:underline"
                >
                  <Mail className="h-3.5 w-3.5" />
                  {ride.otherParent.email}
                </a>
              )}
              {ride.otherParent.phone && (
                <a 
                  href={`tel:${ride.otherParent.phone}`}
                  className="flex items-center gap-1.5 text-primary hover:underline"
                >
                  <Phone className="h-3.5 w-3.5" />
                  {ride.otherParent.phone}
                </a>
              )}
              {!ride.otherParent.email && !ride.otherParent.phone && (
                <span className="text-muted-foreground text-xs">
                  Contact info not shared
                </span>
              )}
            </div>
          </div>
        )}

        {/* Posted rides - no other parent */}
        {!ride.otherParent && (ride.status === 'posted-looking' || ride.status === 'posted-offering') && (
          <div className="pt-3 border-t">
            <p className="text-sm text-muted-foreground">
              {ride.status === 'posted-looking' 
                ? 'Waiting for someone to offer help...'
                : 'Available for others to join'}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};