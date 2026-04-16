import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, Clock, Calendar, Loader2, AlertTriangle, Car, Users } from "lucide-react";
import { toast } from "sonner";
import { format, addDays, startOfToday, differenceInHours } from "date-fns";
import ChildrenRidingSelector from "@/components/ChildrenRidingSelector";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";

interface RecurringRide {
  id: string;
  space_id: string;
  creator_id: string;
  recipient_id: string;
  ride_type: string;
  pickup_address: string;
  dropoff_address: string;
  ride_time: string;
  recurring_days: string[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  creator_children: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  recipient_children: any;
  status: string;
  created_at: string;
  seats_available?: number | null;
  seats_needed?: number | null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  vehicle_info?: any;
}

interface Props {
  ride: RecurringRide;
  otherParentName: string;
  onUpdate: () => void;
}

const DAY_MAP: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

const RecurringRideCard = ({ ride, otherParentName, onUpdate }: Props) => {
  const { user, profile } = useAuth();
  const isCreator = user?.id === ride.creator_id;
  const isRecipient = user?.id === ride.recipient_id;
  const isPending = ride.status === "pending";
  const isAccepted = ride.status === "accepted";

  const [accepting, setAccepting] = useState(false);
  const [showChildSelect, setShowChildSelect] = useState(false);
  const [selectedChildren, setSelectedChildren] = useState<string[]>([]);
  const [showCancelAll, setShowCancelAll] = useState(false);
  const [showCancelOne, setShowCancelOne] = useState(false);
  const [cancelDate, setCancelDate] = useState<Date>();
  const [processing, setProcessing] = useState(false);
  const [creatorChildNames, setCreatorChildNames] = useState<string[]>([]);
  const [recipientChildNames, setRecipientChildNames] = useState<string[]>([]);

  // Fetch child names
  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const fetchNames = async (ids: any, setter: (v: string[]) => void) => {
      if (!ids || !Array.isArray(ids) || ids.length === 0) return;
      const { data } = await supabase
        .from("children")
        .select("first_name, last_name")
        .in("id", ids);
      if (data) setter(data.map((c) => `${c.first_name} ${c.last_name}`));
    };
    fetchNames(ride.creator_children, setCreatorChildNames);
    fetchNames(ride.recipient_children, setRecipientChildNames);
  }, [ride.creator_children, ride.recipient_children]);

  const handleAccept = async () => {
    if (selectedChildren.length === 0) {
      toast.error("Select at least one child");
      return;
    }
    setAccepting(true);
    const { error } = await supabase
      .from("recurring_rides")
      .update({ status: "accepted", recipient_children: selectedChildren })
      .eq("id", ride.id);

    if (!error) {
      const currentName = [profile?.first_name, profile?.last_name].filter(Boolean).join(" ") || "A parent";
      try {
        await supabase.functions.invoke("create-notification", {
          body: {
            userId: ride.creator_id,
            type: "series_ride",
            message: `✅ ${currentName} has accepted your recurring ride in your Series space`,
          },
        });
      } catch {
        // Silently ignore notification errors
      }
      toast.success("Recurring ride accepted!");
      onUpdate();
    }
    setAccepting(false);
    setShowChildSelect(false);
  };

  const handleDecline = async () => {
    setProcessing(true);
    await supabase.from("recurring_rides").update({ status: "declined" }).eq("id", ride.id);
    const currentName = [profile?.first_name, profile?.last_name].filter(Boolean).join(" ") || "A parent";
    try {
      await supabase.functions.invoke("create-notification", {
        body: {
          userId: ride.creator_id,
          type: "series_ride",
          message: `❌ ${currentName} has declined your recurring ride`,
        },
        });
    } catch {
      // Silently ignore notification errors
    }
    toast.info("Ride declined");
    onUpdate();
    setProcessing(false);
  };

  const handleCancelAll = async () => {
    setProcessing(true);
    await supabase.from("recurring_rides").update({ status: "cancelled" }).eq("id", ride.id);
    const otherId = isCreator ? ride.recipient_id : ride.creator_id;
    const currentName = [profile?.first_name, profile?.last_name].filter(Boolean).join(" ") || "A parent";
    try {
      await supabase.functions.invoke("create-notification", {
        body: {
          userId: otherId,
          type: "series_ride",
          message: `🚫 ${currentName} has cancelled the recurring ride series. Please coordinate a new schedule in your Series space.`,
        },
        });
    } catch {
      // Silently ignore notification errors
    }
    toast.info("Recurring ride cancelled");
    onUpdate();
    setProcessing(false);
    setShowCancelAll(false);
  };

  const handleCancelOne = async () => {
    if (!cancelDate || !user) return;
    // 9-hour rule check
    const rideDateTime = new Date(cancelDate);
    const [h, m] = ride.ride_time.split(":").map(Number);
    rideDateTime.setHours(h, m);
    if (differenceInHours(rideDateTime, new Date()) < 9) {
      toast.error("Cannot cancel within 9 hours of the ride");
      return;
    }

    setProcessing(true);
    const dateStr = format(cancelDate, "yyyy-MM-dd");
    const { error } = await supabase.from("recurring_ride_cancellations").insert({
      recurring_ride_id: ride.id,
      cancelled_date: dateStr,
      cancelled_by: user.id,
    });

    if (!error) {
      const otherId = isCreator ? ride.recipient_id : ride.creator_id;
      const currentName = [profile?.first_name, profile?.last_name].filter(Boolean).join(" ") || "A parent";
      try {
        await supabase.functions.invoke("create-notification", {
          body: {
            userId: otherId,
            type: "series_ride",
            message: `📅 ${currentName} has cancelled the recurring ride on ${format(cancelDate, "MMMM d, yyyy")}`,
          },
        });
      } catch {
        // Silently ignore notification errors
      }
      toast.success(`Cancelled ride on ${format(cancelDate, "MMMM d, yyyy")}`);
    } else {
      toast.error("Already cancelled for that date");
    }
    setProcessing(false);
    setShowCancelOne(false);
    setCancelDate(undefined);
  };

  // Only allow selecting dates that match recurring days
  const isValidDay = (date: Date) => {
    const dayName = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][date.getDay()];
    return ride.recurring_days.includes(dayName) && date >= startOfToday();
  };

  const statusBadge = () => {
    if (isPending) return <Badge className="bg-amber-500/10 text-amber-600 border-amber-200">Pending - Awaiting Response</Badge>;
    if (isAccepted) return <Badge className="bg-teal-500/10 text-teal-600 border-teal-200">Active Recurring Ride</Badge>;
    if (ride.status === "declined") return <Badge variant="destructive">Declined</Badge>;
    return null;
  };

  const formatTime = (t: string) => {
    try {
      const [h, m] = t.split(":");
      const d = new Date();
      d.setHours(parseInt(h), parseInt(m));
      return format(d, "h:mm a");
    } catch {
      return t;
    }
  };

  return (
    <>
      <Card className="border">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-start justify-between">
            <div className="space-y-1 flex-1">
              {statusBadge()}
              <div className="flex items-center gap-2 text-sm mt-2">
                <MapPin className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                <span className="truncate">{ride.pickup_address}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <MapPin className="h-3.5 w-3.5 text-primary flex-shrink-0" />
                <span className="truncate">{ride.dropoff_address}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-3.5 w-3.5" />
                <span>{formatTime(ride.ride_time)}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="h-3.5 w-3.5" />
                <span>Repeats every {ride.recurring_days.join(", ")}</span>
              </div>
              {ride.seats_available && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Users className="h-3.5 w-3.5" />
                  <span>{ride.seats_available} seats available</span>
                </div>
              )}
              {ride.seats_needed && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Users className="h-3.5 w-3.5" />
                  <span>{ride.seats_needed} seats needed</span>
                </div>
              )}
            </div>
          </div>

          {/* Vehicle Info */}
          {isAccepted && ride.vehicle_info && (
            <div className="text-sm space-y-0.5 bg-muted/30 rounded-md p-2">
              <div className="flex items-center gap-1.5">
                <Car className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="font-medium">Vehicle: {ride.vehicle_info.car_color} {ride.vehicle_info.car_make} {ride.vehicle_info.car_model}</span>
              </div>
              <p className="text-xs text-muted-foreground ml-5">License Plate: {ride.vehicle_info.license_plate}</p>
            </div>
          )}

          {/* Children */}
          {(creatorChildNames.length > 0 || recipientChildNames.length > 0) && (
            <div className="text-sm space-y-1">
              <p className="font-medium text-muted-foreground text-xs">Chadwick Children:</p>
              {[...creatorChildNames, ...recipientChildNames].map((name, i) => (
                <p key={i} className="text-sm ml-2">• {name}</p>
              ))}
            </div>
          )}

          {/* Actions */}
          {isPending && isRecipient && !showChildSelect && (
            <div className="flex gap-2">
              <Button size="sm" onClick={() => setShowChildSelect(true)} disabled={processing}>Accept</Button>
              <Button size="sm" variant="outline" onClick={handleDecline} disabled={processing}>Decline</Button>
            </div>
          )}

          {showChildSelect && (
            <div className="space-y-3 border-t pt-3">
              <ChildrenRidingSelector
                selectedChildIds={selectedChildren}
                onSelectionChange={setSelectedChildren}
                error={selectedChildren.length === 0 ? "Select at least one child" : null}
              />
              <div className="flex gap-2">
                <Button size="sm" onClick={handleAccept} disabled={accepting}>
                  {accepting && <Loader2 className="h-3 w-3 animate-spin mr-1" />}
                  Confirm
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setShowChildSelect(false)}>Cancel</Button>
              </div>
            </div>
          )}

          {isAccepted && (
            <div className="flex gap-2 flex-wrap">
              <Button size="sm" variant="outline" className="text-xs" onClick={() => setShowCancelOne(true)}>
                Cancel One Occurrence
              </Button>
              <Button size="sm" variant="destructive" className="text-xs" onClick={() => setShowCancelAll(true)}>
                Cancel Entire Recurring Ride
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Cancel All Dialog */}
      <AlertDialog open={showCancelAll} onOpenChange={setShowCancelAll}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Entire Recurring Ride?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently cancel all future occurrences. The other parent will be notified.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep Ride</AlertDialogCancel>
            <AlertDialogAction onClick={handleCancelAll} disabled={processing} className="bg-destructive text-destructive-foreground">
              {processing ? <Loader2 className="h-4 w-4 animate-spin" /> : "Cancel Ride"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Cancel One Dialog */}
      <AlertDialog open={showCancelOne} onOpenChange={setShowCancelOne}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel One Occurrence</AlertDialogTitle>
            <AlertDialogDescription>
              Select the date to cancel. The 9-hour cancellation rule applies.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex justify-center">
            <CalendarComponent
              mode="single"
              selected={cancelDate}
              onSelect={setCancelDate}
              disabled={(date) => !isValidDay(date)}
              className={cn("p-3 pointer-events-auto")}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Back</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancelOne}
              disabled={!cancelDate || processing}
              className="bg-destructive text-destructive-foreground"
            >
              {processing ? <Loader2 className="h-4 w-4 animate-spin" /> : "Cancel This Date"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default RecurringRideCard;
