import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, ChevronRight, ChevronLeft, Calendar, Clock, MapPin, Users, Car, Check } from "lucide-react";
import { toast } from "sonner";
import ChildrenRidingSelector from "@/components/ChildrenRidingSelector";
import { useVehicles } from "@/hooks/useVehicles";

const SCHOOL_DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri"] as const;
const CHADWICK_ADDRESS = "26800 S Academy Dr, Palos Verdes Peninsula, CA 90274";

interface Props {
  spaceId: string;
  otherParentId: string;
  otherParentName: string;
  otherParentAddress: string | null;
  myAddress: string | null;
  onCancel: () => void;
  onSuccess: () => void;
}

type DayAssignment = { day: string; driver_id: string };

const ScheduleRecurringRideForm = ({
  spaceId,
  otherParentId,
  otherParentName,
  otherParentAddress,
  myAddress,
  onCancel,
  onSuccess,
}: Props) => {
  const { user, profile } = useAuth();
  const { vehicles, primaryVehicle, toVehicleInfo } = useVehicles();
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);

  // Step 1: Days & Drivers
  const [selectedDays, setSelectedDays] = useState<string[]>([]);
  const [driverAssignments, setDriverAssignments] = useState<Record<string, string>>({});

  // Step 2: Pickup Times
  const [myRegularTime, setMyRegularTime] = useState("");
  const [myWednesdayTime, setMyWednesdayTime] = useState("");
  const [otherRegularTime, setOtherRegularTime] = useState("");
  const [otherWednesdayTime, setOtherWednesdayTime] = useState("");

  // Step 3: Children
  const [childIds, setChildIds] = useState<string[]>([]);

  const myName = [profile?.first_name, profile?.last_name].filter(Boolean).join(" ") || "You";
  const myId = user?.id || "";

  const toggleDay = (day: string) => {
    setSelectedDays((prev) => {
      const next = prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day];
      // Clean up driver assignments for removed days
      if (!next.includes(day)) {
        setDriverAssignments((a) => {
          const copy = { ...a };
          delete copy[day];
          return copy;
        });
      }
      return next;
    });
  };

  const setDriver = (day: string, driverId: string) => {
    setDriverAssignments((prev) => ({ ...prev, [day]: driverId }));
  };

  // Derived
  const regularDays = selectedDays.filter((d) => d !== "Wed");
  const hasWednesday = selectedDays.includes("Wed");
  const myDrivingRegular = regularDays.filter((d) => driverAssignments[d] === myId);
  const otherDrivingRegular = regularDays.filter((d) => driverAssignments[d] === otherParentId);
  const myDrivingWed = hasWednesday && driverAssignments["Wed"] === myId;
  const otherDrivingWed = hasWednesday && driverAssignments["Wed"] === otherParentId;

  const allDaysAssigned = selectedDays.every((d) => driverAssignments[d]);
  const myDriveCount = selectedDays.filter((d) => driverAssignments[d] === myId).length;
  const otherDriveCount = selectedDays.filter((d) => driverAssignments[d] === otherParentId).length;
  const bothDrive = myDriveCount > 0 && otherDriveCount > 0;

  // Step validation
  const step1Valid = selectedDays.length > 0 && allDaysAssigned && bothDrive;
  const step2Valid = (() => {
    if (myDrivingRegular.length > 0 && !myRegularTime) return false;
    if (myDrivingWed && !myWednesdayTime) return false;
    // Other parent times are optional (they confirm at acceptance)
    return true;
  })();
  const step3Valid = childIds.length > 0;

  const getRouteForDay = (day: string) => {
    const driverId = driverAssignments[day];
    if (driverId === myId) {
      return `Pickup from ${otherParentAddress || "[other parent's address]"} → Chadwick School`;
    }
    return `Pickup from ${myAddress || "[your address]"} → Chadwick School`;
  };

  const getTimeForDay = (day: string) => {
    const driverId = driverAssignments[day];
    const isWed = day === "Wed";
    if (driverId === myId) {
      const t = isWed ? myWednesdayTime : myRegularTime;
      return t ? formatTimeStr(t) : "—";
    }
    const t = isWed ? otherWednesdayTime : otherRegularTime;
    return t ? formatTimeStr(t) : "To be confirmed";
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

  const getDriverName = (day: string) => {
    return driverAssignments[day] === myId ? myName : otherParentName;
  };

  const handleSubmit = async () => {
    if (!user) return;
    setSubmitting(true);

    const dayAssignments: DayAssignment[] = selectedDays.map((day) => ({
      day,
      driver_id: driverAssignments[day],
    }));

    const vehicleInfo = primaryVehicle ? toVehicleInfo(primaryVehicle) : null;

    const insertData: Record<string, any> = {
      space_id: spaceId,
      proposer_id: myId,
      recipient_id: otherParentId,
      day_assignments: dayAssignments,
      proposer_regular_time: myDrivingRegular.length > 0 ? myRegularTime || null : null,
      proposer_wednesday_time: myDrivingWed ? myWednesdayTime || null : null,
      recipient_regular_time: otherDrivingRegular.length > 0 ? otherRegularTime || null : null,
      recipient_wednesday_time: otherDrivingWed ? otherWednesdayTime || null : null,
      proposer_children: childIds,
      proposer_vehicle: vehicleInfo,
    };

    const { error } = await supabase.from("recurring_schedules").insert(insertData as any);

    if (error) {
      toast.error("Failed to propose schedule");
      console.error(error);
    } else {
      try {
        await supabase.functions.invoke("create-notification", {
          body: {
            userId: otherParentId,
            type: "schedule_proposal",
            message: `📅 ${myName} has proposed a recurring carpool schedule with you`,
          },
        });
      } catch {}
      toast.success("Schedule proposed!");
      onSuccess();
    }
    setSubmitting(false);
  };

  return (
    <div className="space-y-4 border rounded-lg p-4 bg-muted/20">
      <div className="flex items-center justify-between">
        <h4 className="font-semibold text-sm">Schedule Recurring Ride</h4>
        <Badge variant="outline" className="text-xs">Step {step} of 4</Badge>
      </div>

      {/* ─── STEP 1: Select Days & Assign Drivers ─── */}
      {step === 1 && (
        <div className="space-y-4">
          <p className="text-xs text-muted-foreground bg-muted/40 rounded-md px-3 py-2 border border-border/50">
            Select which school days this carpool runs and assign who drives each day. Both parents must drive at least one day.
          </p>

          <div className="space-y-3">
            {SCHOOL_DAYS.map((day) => {
              const isSelected = selectedDays.includes(day);
              return (
                <div key={day} className="flex items-center gap-3">
                  <Button
                    type="button"
                    size="sm"
                    variant={isSelected ? "default" : "outline"}
                    onClick={() => toggleDay(day)}
                    className="w-14 text-xs"
                  >
                    {day}
                  </Button>
                  {isSelected && (
                    <select
                      className="text-sm border rounded-md px-2 py-1.5 bg-background flex-1"
                      value={driverAssignments[day] || ""}
                      onChange={(e) => setDriver(day, e.target.value)}
                    >
                      <option value="">Who drives?</option>
                      <option value={myId}>{myName}</option>
                      <option value={otherParentId}>{otherParentName}</option>
                    </select>
                  )}
                </div>
              );
            })}
          </div>

          {selectedDays.length > 0 && !bothDrive && allDaysAssigned && (
            <p className="text-xs text-destructive">Both parents must drive at least one day</p>
          )}

          <div className="flex justify-between">
            <Button variant="ghost" size="sm" onClick={onCancel}>Cancel</Button>
            <Button size="sm" disabled={!step1Valid} onClick={() => setStep(2)} className="gap-1">
              Next <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      )}

      {/* ─── STEP 2: Set Pickup Times ─── */}
      {step === 2 && (
        <div className="space-y-4">
          <p className="text-xs text-muted-foreground bg-muted/40 rounded-md px-3 py-2 border border-border/50">
            Set pickup times for each parent's driving days. The other parent will confirm their times when accepting.
          </p>

          {/* Regular days section */}
          {(myDrivingRegular.length > 0 || otherDrivingRegular.length > 0) && (
            <div className="space-y-3">
              <Label className="text-sm font-medium">Regular Days ({regularDays.join(", ")})</Label>

              {myDrivingRegular.length > 0 && (
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">
                    Your pickup time for regular days ({myDrivingRegular.join(", ")})
                  </Label>
                  <Input type="time" value={myRegularTime} onChange={(e) => setMyRegularTime(e.target.value)} />
                  <p className="text-[10px] text-muted-foreground">
                    You are setting the pickup time from the other parent's address for your driving days
                  </p>
                </div>
              )}

              {otherDrivingRegular.length > 0 && (
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">
                    {otherParentName}'s pickup time for regular days ({otherDrivingRegular.join(", ")}) — they will confirm this when accepting
                  </Label>
                  <Input
                    type="time"
                    value={otherRegularTime}
                    onChange={(e) => setOtherRegularTime(e.target.value)}
                    placeholder="Optional - suggest a time"
                  />
                </div>
              )}
            </div>
          )}

          {/* Wednesday section */}
          {hasWednesday && (
            <div className="space-y-3 border-t pt-3">
              <Label className="text-sm font-medium">Wednesday — Late Start</Label>

              {myDrivingWed && (
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Your pickup time for Wednesday</Label>
                  <Input type="time" value={myWednesdayTime} onChange={(e) => setMyWednesdayTime(e.target.value)} />
                </div>
              )}

              {otherDrivingWed && (
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">
                    {otherParentName}'s pickup time for Wednesday — they will confirm when accepting
                  </Label>
                  <Input
                    type="time"
                    value={otherWednesdayTime}
                    onChange={(e) => setOtherWednesdayTime(e.target.value)}
                    placeholder="Optional - suggest a time"
                  />
                </div>
              )}
            </div>
          )}

          <div className="flex justify-between">
            <Button variant="ghost" size="sm" onClick={() => setStep(1)} className="gap-1">
              <ChevronLeft className="h-3.5 w-3.5" /> Back
            </Button>
            <Button size="sm" disabled={!step2Valid} onClick={() => setStep(3)} className="gap-1">
              Next <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      )}

      {/* ─── STEP 3: Select Children ─── */}
      {step === 3 && (
        <div className="space-y-4">
          <ChildrenRidingSelector
            selectedChildIds={childIds}
            onSelectionChange={setChildIds}
            error={childIds.length === 0 ? "At least one child must be selected" : null}
          />
          <p className="text-xs text-muted-foreground">
            The other parent will select their children when they accept this schedule.
          </p>

          <div className="flex justify-between">
            <Button variant="ghost" size="sm" onClick={() => setStep(2)} className="gap-1">
              <ChevronLeft className="h-3.5 w-3.5" /> Back
            </Button>
            <Button size="sm" disabled={!step3Valid} onClick={() => setStep(4)} className="gap-1">
              Next <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      )}

      {/* ─── STEP 4: Summary ─── */}
      {step === 4 && (
        <div className="space-y-4">
          <p className="text-xs text-muted-foreground bg-muted/40 rounded-md px-3 py-2 border border-border/50">
            Review the proposed schedule before sending. This schedule will repeat every week until either parent cancels.
          </p>

          <div className="space-y-2">
            {SCHOOL_DAYS.filter((d) => selectedDays.includes(d)).map((day) => (
              <div key={day} className="flex items-start gap-2 text-sm border rounded-md p-2.5 bg-card">
                <Badge variant="outline" className="text-xs w-10 justify-center shrink-0 mt-0.5">
                  {day}
                </Badge>
                <div className="flex-1 space-y-0.5">
                  <p className="font-medium text-xs">
                    {getDriverName(day)} drives
                    {day === "Wed" && <span className="text-muted-foreground ml-1">(Late Start)</span>}
                  </p>
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <MapPin className="h-3 w-3" /> {getRouteForDay(day)}
                  </p>
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Clock className="h-3 w-3" /> {getTimeForDay(day)}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {primaryVehicle && (
            <div className="text-xs space-y-0.5 bg-muted/30 rounded-md p-2">
              <div className="flex items-center gap-1.5">
                <Car className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="font-medium">
                  Your Vehicle: {primaryVehicle.car_color} {primaryVehicle.car_make} {primaryVehicle.car_model}
                </span>
              </div>
              <p className="text-muted-foreground ml-5">License Plate: {primaryVehicle.license_plate}</p>
            </div>
          )}

          <div className="flex justify-between">
            <Button variant="ghost" size="sm" onClick={() => setStep(3)} className="gap-1">
              <ChevronLeft className="h-3.5 w-3.5" /> Back
            </Button>
            <Button size="sm" onClick={handleSubmit} disabled={submitting} className="gap-1">
              {submitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
              Propose Schedule
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ScheduleRecurringRideForm;
