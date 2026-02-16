import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
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
  Hand,
  CheckCircle,
  ArrowRight,
  Star
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
  /** IDs of user's top connections — shows "Frequent partner" badge */
  topConnectionIds?: string[];
}

const getStatusConfig = (status: UnifiedRide['status'], source: UnifiedRide['source'], hasOtherParent: boolean) => {
  if (source === 'posted' && hasOtherParent) {
    return {
      label: 'Confirmed',
      className: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800',
      icon: CheckCircle,
    };
  }
  switch (status) {
    case 'posted-looking':
      return {
        label: 'Looking for Help',
        className: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800',
        icon: Hand,
      };
    case 'posted-offering':
      return {
        label: 'Offering Ride',
        className: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800',
        icon: Car,
      };
    case 'joined-ride':
      return {
        label: 'Joined Ride',
        className: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800',
        icon: Car,
      };
    case 'helping-out':
      return {
        label: 'Helping Out',
        className: 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950 dark:text-purple-300 dark:border-purple-800',
        icon: HandHelping,
      };
    case 'confirmed':
      return {
        label: 'Confirmed',
        className: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800',
        icon: CheckCircle,
      };
    default:
      return {
        label: 'Unknown',
        className: 'bg-muted text-muted-foreground',
        icon: null,
      };
  }
};

const getParentName = (parent: UnifiedRide['otherParent']) => {
  if (!parent) return 'Unknown';
  if (parent.firstName && parent.lastName) return `${parent.firstName} ${parent.lastName}`;
  if (parent.firstName) return parent.firstName;
  return parent.username;
};

const getInitials = (parent: UnifiedRide['otherParent']) => {
  if (!parent) return '?';
  if (parent.firstName && parent.lastName) return `${parent.firstName[0]}${parent.lastName[0]}`.toUpperCase();
  return parent.username.substring(0, 2).toUpperCase();
};

export const UnifiedRideCardSkeleton = () => (
  <Card className="rounded-lg shadow-sm">
    <CardContent className="p-5">
      <div className="flex items-center gap-3 mb-4">
        <Skeleton className="h-10 w-10 rounded-full" />
        <div className="space-y-2 flex-1">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-3 w-20" />
        </div>
        <Skeleton className="h-6 w-24 rounded-full" />
      </div>
      <Skeleton className="h-4 w-full mb-2" />
      <Skeleton className="h-4 w-3/4 mb-4" />
      <div className="flex gap-4">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-4 w-16" />
        <Skeleton className="h-4 w-20" />
      </div>
    </CardContent>
  </Card>
);

export const UnifiedRideCard = ({ ride, onCancel, isPast, topConnectionIds }: UnifiedRideCardProps) => {
  const statusConfig = getStatusConfig(ride.status, ride.source, !!ride.otherParent);
  const isFrequentPartner = topConnectionIds && ride.otherParent && topConnectionIds.includes(ride.otherParent.id);
  const StatusIcon = statusConfig.icon;

  const rideStatusBadge = isPast && ride.rideStatus && ride.rideStatus !== 'active' ? (
    <Badge variant="outline" className={
      ride.rideStatus === 'completed' ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300' :
      ride.rideStatus === 'cancelled' ? 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-300' :
      'bg-muted text-muted-foreground'
    }>
      {ride.rideStatus === 'completed' ? 'Completed' : ride.rideStatus === 'cancelled' ? 'Cancelled' : 'Expired'}
    </Badge>
  ) : null;

  const typeBadge = (
    <Badge variant="outline" className={
      ride.rideType === 'offer'
        ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300'
        : 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-300'
    }>
      {ride.rideType === 'offer' ? <Car className="h-3 w-3 mr-1" /> : <Hand className="h-3 w-3 mr-1" />}
      {ride.rideType === 'offer' ? 'Offer' : 'Request'}
    </Badge>
  );

  return (
    <Card className={`rounded-lg shadow-sm hover:shadow-md transition-all duration-200 border border-border ${isPast ? 'opacity-70' : ''}`}>
      <CardContent className="p-5 space-y-4">
        {/* Header: Avatar + Name + Badges */}
        <div className="flex items-start gap-3">
          {/* Avatar */}
          <Avatar className="h-10 w-10 border border-border flex-shrink-0">
            <AvatarFallback className="bg-primary/10 text-primary text-sm font-semibold">
              {ride.otherParent ? getInitials(ride.otherParent) : 'You'}
            </AvatarFallback>
          </Avatar>

          {/* Name + Role */}
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-foreground text-sm truncate">
              {ride.otherParent ? getParentName(ride.otherParent) : 'You'}
            </p>
            <p className="text-xs text-muted-foreground">
              {ride.isDriver ? "Driver" : "Passenger"} · {ride.source === 'posted' ? 'Broadcast' : ride.source === 'private' ? 'Private' : 'Connected'}
            </p>
          </div>

          {/* Badges */}
          <div className="flex items-center gap-1.5 flex-shrink-0 flex-wrap justify-end">
            {isFrequentPartner && (
              <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-300 gap-0.5">
                <Star className="h-3 w-3 fill-current" />
                Frequent
              </Badge>
            )}
            {typeBadge}
            {rideStatusBadge}
          </div>
        </div>

        {/* Route */}
        <div className="flex items-center gap-3 bg-muted/50 rounded-lg p-3">
          <div className="flex flex-col items-center gap-0.5">
            <div className="w-2.5 h-2.5 rounded-full bg-primary border-2 border-primary-foreground shadow-sm" />
            <div className="w-px h-6 bg-border" />
            <div className="w-2.5 h-2.5 rounded-full bg-secondary border-2 border-background shadow-sm" />
          </div>
          <div className="flex-1 min-w-0 space-y-2">
            <p className="text-sm font-medium text-foreground truncate">{ride.pickupLocation}</p>
            <p className="text-sm text-muted-foreground truncate">{ride.dropoffLocation}</p>
          </div>
        </div>

        {/* Date, Time, Seats */}
        <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5" />
            <span>{format(new Date(ride.rideDate), 'EEE, MMM d')}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5" />
            <span>{ride.rideTime}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Users className="h-3.5 w-3.5" />
            <span>
              {ride.seatsAvailable 
                ? `${ride.seatsAvailable} seat${ride.seatsAvailable > 1 ? 's' : ''} available`
                : ride.seatsNeeded 
                  ? `${ride.seatsNeeded} seat${ride.seatsNeeded > 1 ? 's' : ''} needed`
                  : '—'}
            </span>
          </div>
        </div>

        {/* Status Badge */}
        <div className="flex items-center justify-between">
          <Badge variant="outline" className={`${statusConfig.className} gap-1`}>
            {StatusIcon && <StatusIcon className="h-3 w-3" />}
            {statusConfig.label}
          </Badge>
        </div>

        {/* Connected Parent Contact */}
        {ride.otherParent && (
          <div className="pt-3 border-t border-border space-y-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              {ride.source === 'posted' ? 'Connected with' : 'Riding with'}
            </p>
            <div className="flex flex-wrap gap-2">
              {ride.otherParent.email && (
                <a 
                  href={`mailto:${ride.otherParent.email}`}
                  className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
                >
                  <Mail className="h-3.5 w-3.5" />
                  {ride.otherParent.email}
                </a>
              )}
              {ride.otherParent.phone && (
                <a 
                  href={`tel:${ride.otherParent.phone}`}
                  className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
                >
                  <Phone className="h-3.5 w-3.5" />
                  {ride.otherParent.phone}
                </a>
              )}
              {!ride.otherParent.email && !ride.otherParent.phone && (
                <span className="text-xs text-muted-foreground">Contact info not shared</span>
              )}
            </div>
          </div>
        )}

        {/* Waiting state for posted rides */}
        {!ride.otherParent && (ride.status === 'posted-looking' || ride.status === 'posted-offering') && !isPast && (
          <p className="text-xs text-muted-foreground italic">
            {ride.status === 'posted-looking' 
              ? 'Waiting for someone to offer help…'
              : 'Available for others to join'}
          </p>
        )}

        {/* Cancel button */}
        {!isPast && onCancel && (
          <div className="pt-2">
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 w-full"
              onClick={onCancel}
            >
              <X className="h-3.5 w-3.5 mr-1.5" />
              Cancel Ride
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
