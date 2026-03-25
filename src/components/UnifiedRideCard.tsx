import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
  Star,
  GraduationCap,
  Loader2,
  UserCheck,
  UserX
} from "lucide-react";
import { format } from "date-fns";

export interface ParticipantInfo {
  id: string;
  firstName: string | null;
  lastName: string | null;
  username: string;
  email: string | null;
  phone: string | null;
  children: { name: string; grade: string }[];
}

export interface PendingJoinRequest {
  conversationId: string;
  requesterId: string;
  requesterName: string;
  requesterEmail: string | null;
  requesterPhone: string | null;
  children: { name: string; grade: string }[];
  message: string | null;
  requestedAt: string;
}

export interface UnifiedRide {
  id: string;
  source: 'posted' | 'conversation' | 'private';
  rideType: 'request' | 'offer';
  status: 'posted-looking' | 'posted-offering' | 'joined-ride' | 'helping-out' | 'confirmed' | 'pending-approval';
  rideStatus?: 'active' | 'completed' | 'cancelled' | 'expired';
  pickupLocation: string;
  dropoffLocation: string;
  rideDate: string;
  rideTime: string;
  seatsAvailable: number | null;
  seatsNeeded: number | null;
  isDriver: boolean;
  otherParent: ParticipantInfo | null;
  myChildren?: { name: string; grade: string }[];
  originalData: any;
  _studentView?: boolean;
  _driverName?: string;
  _studentPassengerName?: string;
  pendingRequests?: PendingJoinRequest[];
}

interface UnifiedRideCardProps {
  ride: UnifiedRide;
  onCancel?: () => void;
  isPast?: boolean;
  topConnectionIds?: string[];
  onAcceptRequest?: (conversationId: string) => void;
  onDeclineRequest?: (conversationId: string) => void;
  acceptDeclineLoading?: string | null;
}

const getStatusConfig = (ride: UnifiedRide) => {
  if (ride.status === 'pending-approval') {
    return { label: 'Pending - Awaiting Approval', className: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800', icon: Clock };
  }
  if (ride.source === 'posted' && ride.otherParent) {
    return ride.isDriver
      ? { label: "You're Driving", className: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800', icon: Car }
      : { label: "You're a Passenger", className: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800', icon: CheckCircle };
  }
  switch (ride.status) {
    case 'posted-looking':
      return { label: 'Looking for Driver', className: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800', icon: Hand };
    case 'posted-offering':
      return { label: "You're Driving", className: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800', icon: Car };
    case 'joined-ride':
      return { label: "You're a Passenger", className: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800', icon: Car };
    case 'helping-out':
      return { label: 'Helping Out', className: 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950 dark:text-purple-300 dark:border-purple-800', icon: HandHelping };
    case 'confirmed':
      return { label: 'Confirmed', className: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800', icon: CheckCircle };
    default:
      return { label: 'Unknown', className: 'bg-muted text-muted-foreground', icon: null };
  }
};

const getParentName = (p: ParticipantInfo | null) => {
  if (!p) return 'Unknown';
  if (p.firstName && p.lastName) return `${p.firstName} ${p.lastName}`;
  if (p.firstName) return p.firstName;
  return p.username;
};

const formatGrade = (grade: string) => {
  if (!grade || grade === 'N/A') return '';
  if (grade === 'Parent/Adult') return '';
  return grade.replace(' Grade', '').replace('grade', '').trim();
};

export const UnifiedRideCardSkeleton = () => (
  <Card className="rounded-lg shadow-sm">
    <CardContent className="p-5">
      <Skeleton className="h-7 w-32 rounded-full mb-4" />
      <Skeleton className="h-4 w-full mb-2" />
      <Skeleton className="h-4 w-3/4 mb-4" />
      <div className="flex gap-4 mb-4">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-4 w-20" />
      </div>
      <Skeleton className="h-px w-full mb-4" />
      <Skeleton className="h-4 w-48 mb-2" />
      <Skeleton className="h-3 w-36" />
    </CardContent>
  </Card>
);

export const UnifiedRideCard = ({ ride, onCancel, isPast, topConnectionIds, onAcceptRequest, onDeclineRequest, acceptDeclineLoading }: UnifiedRideCardProps) => {
  const statusConfig = getStatusConfig(ride);
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

  const driverName = ride._driverName || (ride.isDriver ? 'You' : getParentName(ride.otherParent));
  const driverPhone = ride.isDriver ? null : ride.otherParent?.phone;
  const currentStudentPassenger = ride._studentPassengerName?.trim().toLowerCase();

  const allPassengerChildren: { name: string; grade: string }[] = [
    ...(ride.myChildren || []),
    ...(ride.otherParent?.children || []),
  ].filter((child, index, array) => {
    const key = `${child.name}-${child.grade}`.toLowerCase();
    return index === array.findIndex((item) => `${item.name}-${item.grade}`.toLowerCase() === key);
  });

  return (
    <Card className={`rounded-lg shadow-sm hover:shadow-md transition-all duration-200 border border-border ${isPast ? 'opacity-70' : ''}`}>
      <CardContent className="p-5 space-y-4">
        {/* Status Badge Row */}
        <div className="flex items-center justify-between flex-wrap gap-2">
          <Badge variant="outline" className={`${statusConfig.className} gap-1 text-sm px-3 py-1`}>
            {StatusIcon && <StatusIcon className="h-3.5 w-3.5" />}
            {statusConfig.label}
          </Badge>
          <div className="flex items-center gap-1.5">
            {isFrequentPartner && (
              <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-300 gap-0.5">
                <Star className="h-3 w-3 fill-current" />
                Frequent
              </Badge>
            )}
            {rideStatusBadge}
          </div>
        </div>

        {/* Route Section */}
        <div className="space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Route</p>
          <div className="flex items-start gap-3 bg-muted/50 rounded-lg p-3">
            <div className="flex flex-col items-center gap-0.5 pt-0.5">
              <MapPin className="h-4 w-4 text-emerald-600" />
              <div className="w-px h-5 bg-border" />
              <MapPin className="h-4 w-4 text-primary" />
            </div>
            <div className="flex-1 min-w-0 space-y-2">
              <div>
                <p className="text-xs text-muted-foreground">Pickup</p>
                <p className="text-sm font-medium text-foreground">{ride.pickupLocation}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Dropoff</p>
                <p className="text-sm font-medium text-foreground">{ride.dropoffLocation}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Date & Time */}
        <div className="space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Date & Time</p>
          <div className="flex flex-wrap items-center gap-4 text-sm">
            <div className="flex items-center gap-1.5 text-foreground">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">{format(new Date(ride.rideDate + 'T00:00:00'), 'EEEE, MMMM d, yyyy')}</span>
            </div>
            <div className="flex items-center gap-1.5 text-foreground">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">{ride.rideTime}</span>
            </div>
          </div>
        </div>

        {/* Driver Section */}
        <div className="space-y-3">
          <div className="bg-emerald-50/50 dark:bg-emerald-950/20 rounded-lg p-3 space-y-1.5">
            <div className="flex items-center gap-2">
              <Car className="h-4 w-4 text-emerald-600" />
              <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 uppercase">Driver</span>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-semibold text-foreground">{driverName}</span>
              {driverPhone && (
                <a href={`tel:${driverPhone}`} className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
                  <Phone className="h-3 w-3" />
                  {driverPhone}
                </a>
              )}
            </div>
          </div>

          {/* Passengers Section - shows students/children */}
          {allPassengerChildren.length > 0 ? (
            <div className="bg-blue-50/50 dark:bg-blue-950/20 rounded-lg p-3 space-y-1.5">
              <div className="flex items-center gap-2">
                <GraduationCap className="h-4 w-4 text-blue-600" />
                <span className="text-xs font-semibold text-blue-700 dark:text-blue-400 uppercase">Passengers</span>
              </div>
              <div className="space-y-1">
                {allPassengerChildren.map((child, i) => {
                  const isCurrentStudent = currentStudentPassenger === child.name.trim().toLowerCase();

                  return (
                    <div key={i} className="flex items-center gap-1.5 text-sm text-foreground">
                      <span className="text-xs font-medium text-blue-600 dark:text-blue-400">Chadwick Student:</span>
                      <span className="font-medium">{child.name}</span>
                      {formatGrade(child.grade) && (
                        <span className="text-muted-foreground text-xs">({formatGrade(child.grade)})</span>
                      )}
                      {isCurrentStudent && (
                        <span className="text-xs text-muted-foreground">(you)</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            !isPast && (ride.status === 'posted-looking' || ride.status === 'posted-offering') && (
              <div className="bg-muted/30 rounded-lg p-3 border border-dashed border-border">
                <p className="text-sm text-muted-foreground italic text-center">
                  {ride.status === 'posted-looking'
                    ? 'Waiting for a driver to respond…'
                    : 'No passengers yet — available for others to join'}
                </p>
              </div>
            )
          )}
        </div>

        {/* Seats Info */}
        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <Users className="h-3.5 w-3.5" />
          <span>
            {ride.seatsAvailable
              ? `${ride.seatsAvailable} seat${ride.seatsAvailable > 1 ? 's' : ''} available`
              : ride.seatsNeeded
                ? `${ride.seatsNeeded} seat${ride.seatsNeeded > 1 ? 's' : ''} needed`
                : '—'}
          </span>
        </div>

        {/* Cancel button */}
        {!isPast && onCancel && (
          <div className="pt-2 border-t border-border">
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