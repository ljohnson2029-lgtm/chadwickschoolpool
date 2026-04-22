import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { MapPin, Clock, Car, Users, Loader2, Calendar as CalendarIcon, Check, X } from "lucide-react";
import { toast } from "sonner";
import { format, differenceInHours, startOfToday } from "date-fns";

import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
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

const CHADWICK_ADDRESS = "26800 S Academy Dr, Palos Verdes Peninsula, CA 90274";
const DAY_INDEX: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
const DAY_ORDER = ["Mon", "Tue", "Wed", "Thu", "Fri"];

interface DayAssignment {
  day: string;
  driver_id: string;
}

interface ScheduleData {
  id: string;
  space_id: string;
  proposer_id: string;
  recipient_id: string;
  day_assignments: DayAssignment[];
  proposer_regular_time: string | null;
  proposer_wednesday_time: string | null;
  recipient_regular_time: string | null;
  recipient_wednesday_time: string | null;
  proposer_children: string[];
  recipient_children: string[] | null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  proposer_vehicle: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  recipient_vehicle: any;
  status: string;
  created_at: string;
}

interface Props {
  schedule: ScheduleData;
  otherParentName: string;
  proposerName: string;
  proposerAddress: string | null;
  recipientAddress: string | null;
  onUpdate: () => void;
}

const ScheduleCard = ({ schedule, otherParentName, proposerName, proposerAddress, recipientAddress, onUpdate }: Props) => {
  const { user, profile } = useAuth();
  const isProposer = user?.id === schedule.proposer_id;
  const isRecipient = user?.id === schedule.recipient_id;
  const isPending = schedule.status === "pending";
  const isAccepted = schedule.status === "accepted";
  const isDeclined = schedule.status === "declined";

  const myName = [profile?.first_name, profile?.last_name].filter(Boolean).join(" ") || "You";

  // Acceptance state
  const [showAcceptForm, setShowAcceptForm] = useState(false);
  
  const [acceptRegularTime, setAcceptRegularTime] = useState(schedule.recipient_regular_time || "");
  const [acceptWedTime, setAcceptWedTime] = useState(schedule.recipient_wednesday_time || "");
  const [accepting, setAccepting] = useState(false);
  const [processing, setProcessing] = useState(false);

  // Cancel state
  const [showCancelAll, setShowCancelAll] = useState(false);
  const [showCancelOne, setShowCancelOne] = useState(false);
  const [cancelDate, setCancelDate] = useState<Date>();

  // Child names
  const [proposerChildNames, setProposerChildNames] = useState<string[]>([]);
  const [recipientChildNames, setRecipientChildNames] = useState<string[]>([]);

  // All vehicles for both parents
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [proposerVehicles, setProposerVehicles] = useState<any[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [recipientVehicles, setRecipientVehicles] = useState<any[]>([]);

  useEffect(() => {
    const fetchAllVehicles = async () => {
      const [{ data: pVehicles }, { data: rVehicles }] = await Promise.all([
        supabase.from("vehicles").select("*").eq("user_id", schedule.proposer_id).order("is_primary", { ascending: false }),
        supabase.from("vehicles").select("*").eq("user_id", schedule.recipient_id).order("is_primary", { ascending: false }),
      ]);
      setProposerVehicles(pVehicles || []);
      setRecipientVehicles(rVehicles || []);
    };
    fetchAllVehicles();
  }, [schedule.proposer_id, schedule.recipient_id]);

  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const fetchNames = async (ids: any, setter: (v: string[]) => void) => {
      if (!ids || !Array.isArray(ids) || ids.length === 0) return;
      const { data } = await supabase.from("children").select("first_name, last_name").in("id", ids);
      if (data) setter(data.map((c) => `${c.first_name} ${c.last_name}`));
    };
    fetchNames(schedule.proposer_children, setProposerChildNames);
    fetchNames(schedule.recipient_children, setRecipientChildNames);
  }, [schedule.proposer_children, schedule.recipient_children]);

  const assignments = (schedule.day_assignments as DayAssignment[]) || [];
  const sortedAssignments = [...assignments].sort(
    (a, b) => DAY_ORDER.indexOf(a.day) - DAY_ORDER.indexOf(b.day)
  );

  const getDriverName = (driverId: string) => {
    if (driverId === schedule.proposer_id) return isProposer ? myName : proposerName;
    return isRecipient ? myName : otherParentName;
  };

  const getPickupAddress = (driverId: string) => {
    // Driver picks up from the OTHER parent's address
    if (driverId === schedule.proposer_id) return recipientAddress || "Other parent's address";
    return proposerAddress || "Other parent's address";
  };

  const getTimeForDay = (day: string) => {
    const assignment = assignments.find((a) => a.day === day);
    if (!assignment) return "—";
    const driverId = assignment.driver_id;
    const isWed = day === "Wed";

    // The PASSENGER (non-driver) sets the pickup time for the day they're being picked up
    if (driverId === schedule.proposer_id) {
      // Proposer drives → recipient is the rider → show recipient's time
      const t = isWed ? schedule.recipient_wednesday_time : schedule.recipient_regular_time;
      return t ? formatTimeStr(t) : (isPending ? "To be confirmed" : "—");
    }
    // Recipient drives → proposer is the rider → show proposer's time
    const t = isWed ? schedule.proposer_wednesday_time : schedule.proposer_regular_time;
    return t ? formatTimeStr(t) : "—";
  };

  const formatTimeStr = (t: string) => {
    try {
      const [h, m] = t.split(":");
      const d = new Date();
      d.setHours(parseInt(h), parseInt(m));
      return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
    } catch {
      return t;
    }
  };

  // The recipient is a RIDER on days the PROPOSER drives — those are the days the recipient sets a pickup time for
  const recipientRidesRegular = assignments.some(
    (a) => a.driver_id === schedule.proposer_id && a.day !== "Wed"
  );
  const recipientRidesWed = assignments.some(
    (a) => a.driver_id === schedule.proposer_id && a.day === "Wed"
  );

  const handleAccept = async () => {
    if (recipientRidesRegular && !acceptRegularTime) {
      toast.error("Please set your pickup time for regular days");
      return;
    }
    if (recipientRidesWed && !acceptWedTime) {
      toast.error("Please set your pickup time for Wednesday");
      return;
    }
    setAccepting(true);

    // Get recipient's primary vehicle
    const { data: vehicles } = await supabase
      .from("vehicles")
      .select("*")
      .eq("user_id", user!.id)
      .eq("is_primary", true)
      .limit(1);

    const recipientVehicle = vehicles?.[0]
      ? {
          car_make: vehicles[0].car_make,
          car_model: vehicles[0].car_model,
          car_color: vehicles[0].car_color,
          license_plate: vehicles[0].license_plate,
        }
      : null;

    const { error } = await supabase
      .from("recurring_schedules")
      .update({
        status: "accepted",
        recipient_children: [],
        recipient_regular_time: recipientRidesRegular ? acceptRegularTime : null,
        recipient_wednesday_time: recipientRidesWed ? acceptWedTime : null,
        recipient_vehicle: recipientVehicle,
      })
      .eq("id", schedule.id);

    if (!error) {
      try {
        await supabase.functions.invoke("create-notification", {
          body: {
            userId: schedule.proposer_id,
            type: "schedule_accepted",
            message: `✅ ${myName} has accepted your recurring carpool schedule`,
          },
        });
      } catch {
        // Silently ignore notification errors
      }
      toast.success("Schedule accepted!");
      onUpdate();
    }
    setAccepting(false);
    setShowAcceptForm(false);
  };

  const handleDecline = async () => {
    setProcessing(true);
    await supabase.from("recurring_schedules").update({ status: "declined" }).eq("id", schedule.id);
    try {
      await supabase.functions.invoke("create-notification", {
        body: {
          userId: schedule.proposer_id,
          type: "schedule_declined",
          message: `❌ ${myName} has declined your proposed carpool schedule. Head to your Series space to coordinate a new one.`,
        },
        });
    } catch {
      // Silently ignore notification errors
    }
    toast.info("Schedule declined");
    onUpdate();
    setProcessing(false);
  };

  const handleCancelAll = async () => {
    setProcessing(true);
    await supabase.from("recurring_schedules").update({ status: "cancelled" }).eq("id", schedule.id);
    const otherId = isProposer ? schedule.recipient_id : schedule.proposer_id;
      try {
        await supabase.functions.invoke("create-notification", {
          body: {
            userId: otherId,
            type: "schedule_cancelled",
            message: `🚫 Your carpool series with ${myName} has been cancelled. Please coordinate alternative rides.`,
          },
        });
      } catch {
        // Silently ignore notification errors
      }
    toast.info("Schedule cancelled");
    onUpdate();
    setProcessing(false);
    setShowCancelAll(false);
  };

  const handleCancelOne = async () => {
    if (!cancelDate || !user) return;
    const dayName = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][cancelDate.getDay()];

    // Find the earliest ride time for that day to check 9-hour rule
    const assignment = assignments.find((a) => a.day === dayName);
    if (!assignment) return;

    const isWed = dayName === "Wed";
    let timeStr: string | null = null;
    // Time is stored on the PASSENGER side (non-driver)
    if (assignment.driver_id === schedule.proposer_id) {
      // Recipient is the rider — read recipient's time
      timeStr = isWed ? schedule.recipient_wednesday_time : schedule.recipient_regular_time;
    } else {
      // Proposer is the rider — read proposer's time
      timeStr = isWed ? schedule.proposer_wednesday_time : schedule.proposer_regular_time;
    }

    if (timeStr) {
      const rideDateTime = new Date(cancelDate);
      const [h, m] = timeStr.split(":").map(Number);
      rideDateTime.setHours(h, m);
      if (differenceInHours(rideDateTime, new Date()) < 9) {
        toast.error("Cannot cancel within 9 hours of the ride");
        return;
      }
    }

    setProcessing(true);
    const dateStr = format(cancelDate, "yyyy-MM-dd");
    const { error } = await supabase.from("schedule_cancellations").insert({
      schedule_id: schedule.id,
      cancelled_date: dateStr,
      cancelled_day: dayName,
      cancelled_by: user.id,
    });

    if (!error) {
      const otherId = isProposer ? schedule.recipient_id : schedule.proposer_id;
      try {
        await supabase.functions.invoke("create-notification", {
          body: {
            userId: otherId,
            type: "schedule_cancel_one",
            message: `📅 ${myName} has cancelled the carpool on ${format(cancelDate, "MMMM d, yyyy")}`,
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

  const isValidDay = (date: Date) => {
    const dayName = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][date.getDay()];
    return assignments.some((a) => a.day === dayName) && date >= startOfToday();
  };

  const statusBadge = () => {
    if (isPending && isRecipient) return <Badge className="bg-amber-500/10 text-amber-600 border-amber-200">Pending — Awaiting Your Response</Badge>;
    if (isPending && isProposer) return <Badge className="bg-amber-500/10 text-amber-600 border-amber-200">Pending — Awaiting Response</Badge>;
    if (isAccepted) return <Badge className="bg-teal-500/10 text-teal-600 border-teal-200">Active Recurring Schedule</Badge>;
    if (isDeclined) return <Badge variant="destructive">Declined</Badge>;
    return null;
  };

  return (
    <>
      <Card className="border">
        <CardContent className="p-4 space-y-3">
          {statusBadge()}

          {/* Weekly schedule table */}
          <div className="space-y-1.5 mt-2">
            {sortedAssignments.map(({ day, driver_id }) => (
              <div key={day} className="flex items-start gap-2 text-sm border rounded-md p-2 bg-card">
                <Badge variant="outline" className="text-xs w-10 justify-center shrink-0 mt-0.5">{day}</Badge>
                <div className="flex-1 space-y-0.5">
                  <p className="font-medium text-xs">
                    {getDriverName(driver_id)} drives
                    {day === "Wed" && <span className="text-muted-foreground ml-1">(Late Start)</span>}
                  </p>
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <MapPin className="h-3 w-3" /> Pickup from {getPickupAddress(driver_id)} → Chadwick School
                  </p>
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Clock className="h-3 w-3" /> {getTimeForDay(day)}
                  </p>
                  {isAccepted && (
                    <p className="text-[10px] text-muted-foreground ml-4">
                      Pickup time from your home address to arrive at Chadwick School on time
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Vehicle Info - All vehicles for both parents */}
          {isAccepted && (
            <div className="space-y-2">
              {/* Proposer's vehicles */}
              {proposerVehicles.length > 0 && (
                <div className="text-xs space-y-1 bg-muted/30 rounded-md p-2">
                  <div className="flex items-center gap-1.5 font-medium">
                    <Car className="h-3.5 w-3.5 text-muted-foreground" />
                    <span>{isProposer ? "Your" : proposerName + "'s"} Vehicles:</span>
                  </div>
                  {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                  {proposerVehicles.map((v: any) => (
                    <div key={v.id} className="ml-5 text-muted-foreground">
                      {v.car_color} {v.car_make} {v.car_model} — License Plate: {v.license_plate}
                      {v.is_primary && <span className="text-xs font-medium text-primary ml-1">(Primary)</span>}
                    </div>
                  ))}
                </div>
              )}
              {/* Recipient's vehicles */}
              {recipientVehicles.length > 0 && (
                <div className="text-xs space-y-1 bg-muted/30 rounded-md p-2">
                  <div className="flex items-center gap-1.5 font-medium">
                    <Car className="h-3.5 w-3.5 text-muted-foreground" />
                    <span>{isRecipient ? "Your" : otherParentName + "'s"} Vehicles:</span>
                  </div>
                  {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                  {recipientVehicles.map((v: any) => (
                    <div key={v.id} className="ml-5 text-muted-foreground">
                      {v.car_color} {v.car_make} {v.car_model} — License Plate: {v.license_plate}
                      {v.is_primary && <span className="text-xs font-medium text-primary ml-1">(Primary)</span>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Children */}
          {(proposerChildNames.length > 0 || recipientChildNames.length > 0) && (
            <div className="text-sm space-y-1">
              <p className="font-medium text-muted-foreground text-xs">Chadwick Children:</p>
              {[...proposerChildNames, ...recipientChildNames].map((name, i) => (
                <p key={i} className="text-sm ml-2">• {name}</p>
              ))}
            </div>
          )}

          {/* Pending - Recipient Actions */}
          {isPending && isRecipient && !showAcceptForm && (
            <div className="flex gap-2">
              <Button size="sm" onClick={() => setShowAcceptForm(true)} disabled={processing}>
                <Check className="h-3.5 w-3.5 mr-1" /> Accept Schedule
              </Button>
              <Button size="sm" variant="outline" onClick={handleDecline} disabled={processing}>
                <X className="h-3.5 w-3.5 mr-1" /> Decline Schedule
              </Button>
            </div>
          )}

          {/* Accept Form */}
          {showAcceptForm && (
            <div className="space-y-3 border-t pt-3">
              {recipientRidesRegular && (
                <div className="space-y-1">
                  <Label className="text-xs">Your pickup time for regular days — when {proposerName} picks you up</Label>
                  <Input type="time" value={acceptRegularTime} onChange={(e) => setAcceptRegularTime(e.target.value)} />
                  <p className="text-[10px] text-muted-foreground">
                    The time you want {proposerName} to pick you up from your home address
                  </p>
                </div>
              )}
              {recipientRidesWed && (
                <div className="space-y-1">
                  <Label className="text-xs">Your pickup time for Wednesday (Late Start) — when {proposerName} picks you up</Label>
                  <Input type="time" value={acceptWedTime} onChange={(e) => setAcceptWedTime(e.target.value)} />
                  <p className="text-[10px] text-muted-foreground">
                    The time you want {proposerName} to pick you up from your home address
                  </p>
                </div>
              )}
              <p className="text-xs text-muted-foreground bg-muted/40 rounded-md px-3 py-2 border border-border/50">
                Children are managed in the "Children in This Series" section in the Series space — no need to select them here.
              </p>
              <div className="flex gap-2">
                <Button size="sm" onClick={handleAccept} disabled={accepting}>
                  {accepting && <Loader2 className="h-3 w-3 animate-spin mr-1" />}
                  Confirm & Accept
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setShowAcceptForm(false)}>Cancel</Button>
              </div>
            </div>
          )}

          {/* Active - Cancellation Actions */}
          {isAccepted && (
            <div className="flex gap-2 flex-wrap">
              <Button size="sm" variant="destructive" className="text-xs" onClick={() => setShowCancelAll(true)}>
                Cancel Entire Schedule
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Cancel All Dialog */}
      <AlertDialog open={showCancelAll} onOpenChange={setShowCancelAll}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Entire Schedule?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently cancel all future occurrences. The other parent will be notified.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep Schedule</AlertDialogCancel>
            <AlertDialogAction onClick={handleCancelAll} disabled={processing} className="bg-destructive text-destructive-foreground">
              {processing ? <Loader2 className="h-4 w-4 animate-spin" /> : "Cancel Schedule"}
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
            <Calendar
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

export default ScheduleCard;
