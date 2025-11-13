import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";

interface RideRequestFormProps {
  onSuccess: () => void;
}

const DAYS_OF_WEEK = ["monday", "tuesday", "wednesday", "thursday", "friday"];

const RideRequestForm = ({ onSuccess }: RideRequestFormProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [submitting, setSubmitting] = useState(false);

  const [pickupLocation, setPickupLocation] = useState("");
  const [dropoffLocation, setDropoffLocation] = useState("");
  const [rideDate, setRideDate] = useState("");
  const [rideTime, setRideTime] = useState("");
  const [seatsNeeded, setSeatsNeeded] = useState("");
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurringDays, setRecurringDays] = useState<string[]>([]);

  const toggleDay = (day: string) => {
    setRecurringDays(prev =>
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setSubmitting(true);

    try {
      const { error } = await (supabase as any).from("rides").insert({
        user_id: user.id,
        type: "request",
        pickup_location: pickupLocation,
        dropoff_location: dropoffLocation,
        ride_date: rideDate,
        ride_time: rideTime,
        seats_needed: parseInt(seatsNeeded),
        is_recurring: isRecurring,
        recurring_days: isRecurring ? recurringDays : null,
      });

      if (error) throw error;

      toast({
        title: "Ride request created",
        description: "Your ride request has been posted successfully.",
      });

      // Reset form
      setPickupLocation("");
      setDropoffLocation("");
      setRideDate("");
      setRideTime("");
      setSeatsNeeded("");
      setIsRecurring(false);
      setRecurringDays([]);

      onSuccess();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Request a Ride</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="pickup">Pickup Location</Label>
            <Input
              id="pickup"
              value={pickupLocation}
              onChange={(e) => setPickupLocation(e.target.value)}
              placeholder="Enter pickup address"
              required
            />
          </div>

          <div>
            <Label htmlFor="dropoff">Dropoff Location</Label>
            <Input
              id="dropoff"
              value={dropoffLocation}
              onChange={(e) => setDropoffLocation(e.target.value)}
              placeholder="Enter dropoff address"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="date">Date</Label>
              <Input
                id="date"
                type="date"
                value={rideDate}
                onChange={(e) => setRideDate(e.target.value)}
                required
              />
            </div>
            <div>
              <Label htmlFor="time">Time</Label>
              <Input
                id="time"
                type="time"
                value={rideTime}
                onChange={(e) => setRideTime(e.target.value)}
                required
              />
            </div>
          </div>

          <div>
            <Label htmlFor="seats">Number of Kids</Label>
            <Input
              id="seats"
              type="number"
              min="1"
              max="8"
              value={seatsNeeded}
              onChange={(e) => setSeatsNeeded(e.target.value)}
              placeholder="How many kids need a ride?"
              required
            />
          </div>

          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="recurring"
                checked={isRecurring}
                onCheckedChange={(checked) => setIsRecurring(checked as boolean)}
              />
              <Label htmlFor="recurring" className="cursor-pointer">
                Recurring ride
              </Label>
            </div>

            {isRecurring && (
              <div className="pl-6 space-y-2">
                <Label>Select days</Label>
                <div className="flex flex-wrap gap-2">
                  {DAYS_OF_WEEK.map((day) => (
                    <div key={day} className="flex items-center space-x-2">
                      <Checkbox
                        id={day}
                        checked={recurringDays.includes(day)}
                        onCheckedChange={() => toggleDay(day)}
                      />
                      <Label htmlFor={day} className="cursor-pointer capitalize">
                        {day}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <Button type="submit" disabled={submitting} className="w-full">
            {submitting ? "Posting..." : "Post Ride Request"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default RideRequestForm;
