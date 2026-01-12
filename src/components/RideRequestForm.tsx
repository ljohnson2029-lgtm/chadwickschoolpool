import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { canRequestRide, getStudentPermissionError } from "@/lib/permissions";
import AddressAutocompleteInput from "@/components/AddressAutocompleteInput";

interface RideRequestFormProps {
  onSuccess: () => void;
  recipientParentId?: string;
  recipientParentName?: string;
  prefillPickup?: string;
  prefillDropoff?: string;
  isBroadcast?: boolean;
}

const DAYS_OF_WEEK = ["monday", "tuesday", "wednesday", "thursday", "friday"];

const RideRequestForm = ({ 
  onSuccess, 
  recipientParentId, 
  recipientParentName,
  prefillPickup,
  prefillDropoff,
  isBroadcast = false
}: RideRequestFormProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [userEmail, setUserEmail] = useState<string>("");
  const [canRequest, setCanRequest] = useState(true);

  const [pickupLocation, setPickupLocation] = useState("");
  const [pickupCoords, setPickupCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [dropoffLocation, setDropoffLocation] = useState("");
  const [dropoffCoords, setDropoffCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [rideDate, setRideDate] = useState("");
  const [rideTime, setRideTime] = useState("");
  const [seatsNeeded, setSeatsNeeded] = useState("");
  const [personalMessage, setPersonalMessage] = useState("");
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurringDays, setRecurringDays] = useState<string[]>([]);

  useEffect(() => {
    const fetchUserEmail = async () => {
      if (!user) return;
      const { data } = await supabase
        .from('users')
        .select('email')
        .eq('user_id', user.id)
        .single();
      
      if (data?.email) {
        setUserEmail(data.email);
        setCanRequest(canRequestRide(data.email));
      }
    };

    fetchUserEmail();
  }, [user]);

  // Pre-fill form when props are provided
  useEffect(() => {
    if (prefillPickup) setPickupLocation(prefillPickup);
    if (prefillDropoff) setDropoffLocation(prefillDropoff);
  }, [prefillPickup, prefillDropoff]);

  const toggleDay = (day: string) => {
    setRecurringDays(prev =>
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    // Double-check permissions
    if (!canRequest) {
      toast({
        title: "Permission Denied",
        description: getStudentPermissionError("request rides"),
        variant: "destructive",
      });
      return;
    }

    // Validate that addresses have been selected from autocomplete
    if (!pickupCoords) {
      toast({
        title: "Invalid Pickup Location",
        description: "Please select a pickup address from the suggestions",
        variant: "destructive",
      });
      return;
    }

    if (!dropoffCoords) {
      toast({
        title: "Invalid Dropoff Location",
        description: "Please select a dropoff address from the suggestions",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);

    try {
      const { data: rideData, error: rideError } = await supabase.from("rides").insert({
        user_id: user.id,
        type: "request",
        pickup_location: pickupLocation,
        dropoff_location: dropoffLocation,
        pickup_latitude: pickupCoords?.lat || null,
        pickup_longitude: pickupCoords?.lng || null,
        dropoff_latitude: dropoffCoords?.lat || null,
        dropoff_longitude: dropoffCoords?.lng || null,
        ride_date: rideDate,
        ride_time: rideTime,
        seats_needed: parseInt(seatsNeeded),
        is_recurring: isRecurring,
        recurring_days: isRecurring ? recurringDays : null,
        transaction_type: isBroadcast ? 'broadcast' : 'direct',
        recipient_id: isBroadcast ? null : (recipientParentId || null),
      }).select();

      if (rideError) throw rideError;

      // For direct requests, create conversation entry
      if (!isBroadcast && recipientParentId && rideData?.[0]) {
        const conversationMessage = personalMessage || 
          `I'd like to request a ride for ${new Date(rideDate).toLocaleDateString()} at ${rideTime}. ${seatsNeeded} seat${parseInt(seatsNeeded) > 1 ? 's' : ''} needed.`;
        
        await supabase.from('ride_conversations').insert({
          ride_id: rideData[0].id,
          sender_id: user.id,
          recipient_id: recipientParentId,
          status: 'pending',
          message: conversationMessage,
        });

        // Send notification
        await supabase.from('notifications').insert({
          user_id: recipientParentId,
          type: 'ride_request',
          message: `You have a new ride request from ${userEmail} for ${rideDate} at ${rideTime}`,
        });
      }

      const successMessage = recipientParentName 
        ? `Request sent to ${recipientParentName}!` 
        : "Your ride request has been posted successfully";

      toast({
        title: "Success",
        description: successMessage,
      });

      // Reset form
      setPickupLocation("");
      setPickupCoords(null);
      setDropoffLocation("");
      setDropoffCoords(null);
      setRideDate("");
      setRideTime("");
      setSeatsNeeded("");
      setPersonalMessage("");
      setIsRecurring(false);
      setRecurringDays([]);

      onSuccess();
      
      // Navigate to conversations for direct requests
      if (!isBroadcast && recipientParentId) {
        navigate('/conversations');
      }
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

  if (!canRequest) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          Request a Ride{recipientParentName && ` from ${recipientParentName}`}
        </CardTitle>
      </CardHeader>
      <CardContent>
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {getStudentPermissionError("request rides")}
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-0 shadow-none sm:border sm:shadow-sm">
      <CardHeader className="px-0 sm:px-6 pt-0 sm:pt-6">
        <CardTitle className="text-lg sm:text-xl">
          {recipientParentName ? `Request Ride from ${recipientParentName}` : 'Request a Ride'}
        </CardTitle>
        {recipientParentName && (
          <p className="text-sm text-muted-foreground mt-1">
            Send a private ride request directly to this parent
          </p>
        )}
      </CardHeader>
      <CardContent className="px-0 sm:px-6 pb-0 sm:pb-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="pickup" className="text-sm sm:text-base">Pickup Location</Label>
            <AddressAutocompleteInput
              value={pickupLocation}
              onAddressSelect={(address, lat, lng) => {
                setPickupLocation(address);
                setPickupCoords({ lat, lng });
              }}
              placeholder="Enter pickup address"
              required
            />
          </div>

          <div>
            <Label htmlFor="dropoff" className="text-sm sm:text-base">Dropoff Location</Label>
            <AddressAutocompleteInput
              value={dropoffLocation}
              onAddressSelect={(address, lat, lng) => {
                setDropoffLocation(address);
                setDropoffCoords({ lat, lng });
              }}
              placeholder="Enter dropoff address"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="date" className="text-sm sm:text-base">Date</Label>
              <Input
                id="date"
                type="date"
                value={rideDate}
                onChange={(e) => setRideDate(e.target.value)}
                required
                className="h-11 sm:h-10 text-base sm:text-sm"
              />
            </div>
            <div>
              <Label htmlFor="time" className="text-sm sm:text-base">Time</Label>
              <Input
                id="time"
                type="time"
                value={rideTime}
                onChange={(e) => setRideTime(e.target.value)}
                required
                className="h-11 sm:h-10 text-base sm:text-sm"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="seats" className="text-sm sm:text-base">Number of Kids</Label>
            <Input
              id="seats"
              type="number"
              min="1"
              max="8"
              value={seatsNeeded}
              onChange={(e) => setSeatsNeeded(e.target.value)}
              placeholder="How many kids need a ride?"
              required
              className="h-11 sm:h-10 text-base sm:text-sm"
            />
          </div>

          {!isBroadcast && recipientParentName && (
            <div>
              <Label htmlFor="message" className="text-sm sm:text-base">Personal Message (Optional)</Label>
              <Textarea
                id="message"
                value={personalMessage}
                onChange={(e) => setPersonalMessage(e.target.value)}
                placeholder="Add any additional details or notes..."
                rows={3}
                className="text-base sm:text-sm"
              />
            </div>
          )}

          <div className="space-y-3">
            <div className="flex items-center space-x-3 min-h-[44px]">
              <Checkbox
                id="recurring"
                checked={isRecurring}
                onCheckedChange={(checked) => setIsRecurring(checked as boolean)}
              />
              <Label htmlFor="recurring" className="cursor-pointer text-sm sm:text-base">
                Recurring ride
              </Label>
            </div>

            {isRecurring && (
              <div className="pl-6 space-y-2">
                <Label className="text-sm sm:text-base">Select days</Label>
                <div className="flex flex-wrap gap-2">
                  {DAYS_OF_WEEK.map((day) => (
                    <div key={day} className="flex items-center space-x-2 min-h-[44px]">
                      <Checkbox
                        id={day}
                        checked={recurringDays.includes(day)}
                        onCheckedChange={() => toggleDay(day)}
                      />
                      <Label htmlFor={day} className="cursor-pointer capitalize text-sm sm:text-base">
                        {day}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <Button type="submit" disabled={submitting} className="w-full h-12 sm:h-11 text-base sm:text-sm">
            {submitting ? "Sending..." : recipientParentName ? `Send Request to ${recipientParentName.split(' ')[0]}` : "Post Ride Request"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default RideRequestForm;
