import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { AlertCircle, School, Home } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { canCreateCarpool, getStudentPermissionError } from "@/lib/permissions";
import AddressAutocompleteInput from "@/components/AddressAutocompleteInput";
import ChildrenRidingSelector from "@/components/ChildrenRidingSelector";


interface RideOfferFormProps {
  onSuccess: () => void;
  recipientParentId?: string;
  recipientParentName?: string;
  prefillPickup?: string;
  prefillDropoff?: string;
  isBroadcast?: boolean;
  prefillPickupCoords?: { lat: number; lng: number };
  prefillDropoffCoords?: { lat: number; lng: number };
}

// Chadwick School coordinates
const CHADWICK_SCHOOL = {
  address: '26800 S Academy Dr, Palos Verdes Peninsula, CA 90274',
  lat: 33.77667,
  lng: -118.36111
};

const DAYS_OF_WEEK = ["monday", "tuesday", "wednesday", "thursday", "friday"];

const RideOfferForm = ({ 
  onSuccess, 
  recipientParentId, 
  recipientParentName,
  prefillPickup,
  prefillDropoff,
  isBroadcast = false
}: RideOfferFormProps) => {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [userEmail, setUserEmail] = useState<string>("");
  const [canCreate, setCanCreate] = useState(true);

  // Get home address from profile
  const homeAddress = profile?.home_address;
  const homeCoords = profile?.home_latitude && profile?.home_longitude 
    ? { lat: profile.home_latitude, lng: profile.home_longitude }
    : null;

  const [pickupLocation, setPickupLocation] = useState("");
  const [pickupCoords, setPickupCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [dropoffLocation, setDropoffLocation] = useState("");
  const [dropoffCoords, setDropoffCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [rideDate, setRideDate] = useState("");
  const [rideTime, setRideTime] = useState("");
  const [seatsAvailable, setSeatsAvailable] = useState("");
  const [routeDetails, setRouteDetails] = useState("");
  const [personalMessage, setPersonalMessage] = useState("");
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurringDays, setRecurringDays] = useState<string[]>([]);
  const [selectedChildIds, setSelectedChildIds] = useState<string[]>([]);
  const [childError, setChildError] = useState<string | null>(null);

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
        setCanCreate(canCreateCarpool(data.email));
      }
    };

    fetchUserEmail();
  }, [user]);

  // Pre-fill form when props are provided
  useEffect(() => {
    if (prefillPickup) {
      setPickupLocation(prefillPickup);
      // If it's Chadwick School, set the coordinates too
      if (prefillPickup === CHADWICK_SCHOOL.address) {
        setPickupCoords({ lat: CHADWICK_SCHOOL.lat, lng: CHADWICK_SCHOOL.lng });
      }
    }
    if (prefillDropoff) {
      setDropoffLocation(prefillDropoff);
      // If it's Chadwick School, set the coordinates too
      if (prefillDropoff === CHADWICK_SCHOOL.address) {
        setDropoffCoords({ lat: CHADWICK_SCHOOL.lat, lng: CHADWICK_SCHOOL.lng });
      }
    }
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
    if (!canCreate) {
      toast({
        title: "Permission Denied",
        description: getStudentPermissionError("create ride offers"),
        variant: "destructive",
      });
      return;
    }

    // Validate children selection
    if (selectedChildIds.length === 0) {
      setChildError("Please select at least one child for this ride");
      return;
    }
    setChildError(null);

    // Validate that addresses have been selected from autocomplete
    if (!pickupCoords) {
      toast({
        title: "Invalid Starting Location",
        description: "Please select a starting address from the suggestions",
        variant: "destructive",
      });
      return;
    }

    if (!dropoffCoords) {
      toast({
        title: "Invalid Destination",
        description: "Please select a destination address from the suggestions",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);

    try {
      const { data: rideData, error: rideError } = await supabase.from("rides").insert({
        user_id: user.id,
        type: "offer",
        pickup_location: pickupLocation,
        dropoff_location: dropoffLocation,
        pickup_latitude: pickupCoords?.lat || null,
        pickup_longitude: pickupCoords?.lng || null,
        dropoff_latitude: dropoffCoords?.lat || null,
        dropoff_longitude: dropoffCoords?.lng || null,
        ride_date: rideDate,
        ride_time: rideTime,
        seats_available: parseInt(seatsAvailable),
        route_details: routeDetails,
        is_recurring: isRecurring,
        recurring_days: isRecurring ? recurringDays : null,
        transaction_type: isBroadcast ? 'broadcast' : 'direct',
        recipient_id: isBroadcast ? null : (recipientParentId || null),
        selected_children: selectedChildIds,
      } as any).select();

      if (rideError) throw rideError;

      // For direct offers, create conversation entry
      if (!isBroadcast && recipientParentId && rideData?.[0]) {
        const conversationMessage = personalMessage || 
          `I can offer you a ride for ${new Date(rideDate).toLocaleDateString()} at ${rideTime}. ${seatsAvailable} seat${parseInt(seatsAvailable) > 1 ? 's' : ''} available.${routeDetails ? ` ${routeDetails}` : ''}`;
        
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
          type: 'ride_offer',
          message: `You have a new ride offer from ${userEmail} for ${rideDate} at ${rideTime}`,
        });
      }

      const successMessage = recipientParentName 
        ? `Offer sent to ${recipientParentName}!` 
        : "Your ride offer has been posted successfully";

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
      setSeatsAvailable("");
      setRouteDetails("");
      setPersonalMessage("");
      setIsRecurring(false);
      setRecurringDays([]);

      onSuccess();
      
      // Navigate to conversations for direct offers
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

  if (!canCreate) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          Offer a Ride{recipientParentName && ` to ${recipientParentName}`}
        </CardTitle>
      </CardHeader>
      <CardContent>
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {getStudentPermissionError("create ride offers")}
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
          {recipientParentName ? `Offer Ride to ${recipientParentName}` : 'Offer a Ride'}
        </CardTitle>
        {recipientParentName && (
          <p className="text-sm text-muted-foreground mt-1">
            Send a private ride offer directly to this parent
          </p>
        )}
      </CardHeader>
      <CardContent className="px-0 sm:px-6 pb-0 sm:pb-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="start" className="text-sm sm:text-base">Starting Location</Label>
            <AddressAutocompleteInput
              value={pickupLocation}
              onAddressSelect={(address, lat, lng) => {
                setPickupLocation(address);
                setPickupCoords({ lat, lng });
              }}
              placeholder="Enter starting address"
              required
            />
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-2 text-orange-600 border-orange-300 hover:bg-orange-50 dark:hover:bg-orange-950"
                onClick={() => {
                  setPickupLocation(CHADWICK_SCHOOL.address);
                  setPickupCoords({ lat: CHADWICK_SCHOOL.lat, lng: CHADWICK_SCHOOL.lng });
                }}
              >
                <School className="h-4 w-4" />
                Chadwick School
              </Button>
              {homeAddress && homeCoords && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-2 text-blue-600 border-blue-300 hover:bg-blue-50 dark:hover:bg-blue-950"
                  onClick={() => {
                    setPickupLocation(homeAddress);
                    setPickupCoords(homeCoords);
                  }}
                >
                  <Home className="h-4 w-4" />
                  My Home
                </Button>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="destination" className="text-sm sm:text-base">Destination</Label>
            <AddressAutocompleteInput
              value={dropoffLocation}
              onAddressSelect={(address, lat, lng) => {
                setDropoffLocation(address);
                setDropoffCoords({ lat, lng });
              }}
              placeholder="Enter destination address"
              required
            />
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-2 text-orange-600 border-orange-300 hover:bg-orange-50 dark:hover:bg-orange-950"
                onClick={() => {
                  setDropoffLocation(CHADWICK_SCHOOL.address);
                  setDropoffCoords({ lat: CHADWICK_SCHOOL.lat, lng: CHADWICK_SCHOOL.lng });
                }}
              >
                <School className="h-4 w-4" />
                Chadwick School
              </Button>
              {homeAddress && homeCoords && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-2 text-blue-600 border-blue-300 hover:bg-blue-50 dark:hover:bg-blue-950"
                  onClick={() => {
                    setDropoffLocation(homeAddress);
                    setDropoffCoords(homeCoords);
                  }}
                >
                  <Home className="h-4 w-4" />
                  My Home
                </Button>
              )}
            </div>
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
            <Label htmlFor="seats" className="text-sm sm:text-base">Available Seats</Label>
            <Input
              id="seats"
              type="number"
              min="1"
              max="8"
              value={seatsAvailable}
              onChange={(e) => setSeatsAvailable(e.target.value)}
              placeholder="How many seats are available?"
              required
              className="h-11 sm:h-10 text-base sm:text-sm"
            />
          </div>

          <div>
            <Label htmlFor="route" className="text-sm sm:text-base">Route Details (Optional)</Label>
            <Textarea
              id="route"
              value={routeDetails}
              onChange={(e) => setRouteDetails(e.target.value)}
              placeholder="Describe your route (e.g., stops along the way, flexibility)"
              rows={3}
              className="text-base sm:text-sm"
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
                        id={`offer-${day}`}
                        checked={recurringDays.includes(day)}
                        onCheckedChange={() => toggleDay(day)}
                      />
                      <Label htmlFor={`offer-${day}`} className="cursor-pointer capitalize text-sm sm:text-base">
                        {day}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>


          <Button type="submit" disabled={submitting} className="w-full h-12 sm:h-11 text-base sm:text-sm">
            {submitting ? "Sending..." : recipientParentName ? `Send Offer to ${recipientParentName.split(' ')[0]}` : "Post Ride Offer"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default RideOfferForm;
