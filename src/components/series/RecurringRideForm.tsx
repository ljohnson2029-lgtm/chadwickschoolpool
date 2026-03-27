import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import AddressAutocompleteInput from "@/components/AddressAutocompleteInput";
import ChildrenRidingSelector from "@/components/ChildrenRidingSelector";
import VehicleSelector from "@/components/VehicleSelector";
import { type VehicleInfo } from "@/hooks/useVehicles";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const CHADWICK = {
  address: "26800 S Academy Dr, Palos Verdes Peninsula, CA 90274",
  lat: 33.7399,
  lng: -118.3776,
};

interface Props {
  spaceId: string;
  otherParentId: string;
  otherParentName: string;
  rideType: "offer" | "request";
  onCancel: () => void;
  onSuccess: () => void;
}

const RecurringRideForm = ({ spaceId, otherParentId, otherParentName, rideType, onCancel, onSuccess }: Props) => {
  const { user, profile } = useAuth();
  const [pickup, setPickup] = useState({ address: "", lat: 0, lng: 0 });
  const [dropoff, setDropoff] = useState({ address: "", lat: 0, lng: 0 });
  const [time, setTime] = useState("");
  const [days, setDays] = useState<string[]>([]);
  const [childIds, setChildIds] = useState<string[]>([]);
  const [seats, setSeats] = useState<number>(1);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null);
  const [vehicleInfo, setVehicleInfo] = useState<VehicleInfo | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const toggleDay = (d: string) => {
    setDays((prev) => prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]);
  };

  const setChadwickPickup = () => setPickup({ address: CHADWICK.address, lat: CHADWICK.lat, lng: CHADWICK.lng });
  const setChadwickDropoff = () => setDropoff({ address: CHADWICK.address, lat: CHADWICK.lat, lng: CHADWICK.lng });
  const setHomePickup = () => {
    if (profile?.home_address && profile?.home_latitude && profile?.home_longitude) {
      setPickup({ address: profile.home_address, lat: profile.home_latitude, lng: profile.home_longitude });
    }
  };
  const setHomeDropoff = () => {
    if (profile?.home_address && profile?.home_latitude && profile?.home_longitude) {
      setDropoff({ address: profile.home_address, lat: profile.home_latitude, lng: profile.home_longitude });
    }
  };

  const handleSubmit = async () => {
    if (!pickup.address || !dropoff.address || !time || days.length === 0 || childIds.length === 0 || !user) {
      toast.error("Please fill in all fields");
      return;
    }
    setSubmitting(true);

    const insertData: any = {
      space_id: spaceId,
      creator_id: user.id,
      recipient_id: otherParentId,
      ride_type: rideType,
      pickup_address: pickup.address,
      dropoff_address: dropoff.address,
      pickup_latitude: pickup.lat,
      pickup_longitude: pickup.lng,
      dropoff_latitude: dropoff.lat,
      dropoff_longitude: dropoff.lng,
      ride_time: time,
      recurring_days: days,
      creator_children: childIds,
    };

    if (rideType === "offer") {
      insertData.seats_available = seats;
      if (vehicleInfo) {
        insertData.vehicle_info = {
          car_make: vehicleInfo.car_make,
          car_model: vehicleInfo.car_model,
          car_color: vehicleInfo.car_color,
          license_plate: vehicleInfo.license_plate,
          vehicle_id: vehicleInfo.vehicle_id,
        };
      }
    } else {
      insertData.seats_needed = seats;
    }

    const { error } = await supabase.from("recurring_rides").insert(insertData);

    if (error) {
      toast.error("Failed to create recurring ride");
      console.error(error);
    } else {
      const currentName = [profile?.first_name, profile?.last_name].filter(Boolean).join(" ") || "A parent";
      const label = rideType === "offer" ? "ride offer" : "ride request";
      try {
        await supabase.functions.invoke("create-notification", {
          body: {
            userId: otherParentId,
            type: "series_ride",
            message: `🔄 ${currentName} has sent you a recurring ${label} in your Series space`,
          },
        });
      } catch {}
      toast.success("Recurring ride posted!");
      onSuccess();
    }
    setSubmitting(false);
  };

  return (
    <div className="space-y-4 border rounded-lg p-4 bg-muted/20">
      <h4 className="font-semibold text-sm">
        {rideType === "offer" ? "Post Recurring Ride Offer" : "Post Recurring Ride Request"}
      </h4>
      <p className="text-xs text-muted-foreground bg-muted/40 rounded-md px-3 py-2 border border-border/50">
        {rideType === "offer"
          ? "You are offering a weekly ride on the selected repeating days from the pickup location to the dropoff location"
          : "You are requesting a weekly ride on the selected repeating days from the pickup location to the dropoff location"}

      <div className="space-y-2">
        <Label className="text-sm">Pickup Location</Label>
        <AddressAutocompleteInput
          value={pickup.address}
          onAddressSelect={(addr, lat, lng) => setPickup({ address: addr, lat, lng })}
          placeholder="Enter pickup address"
        />
        <div className="flex gap-2">
          <Button type="button" variant="outline" size="sm" className="text-xs" onClick={setChadwickPickup}>
            Chadwick School
          </Button>
          {profile?.home_address && (
            <Button type="button" variant="outline" size="sm" className="text-xs" onClick={setHomePickup}>
              My Home
            </Button>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <Label className="text-sm">Dropoff Location</Label>
        <AddressAutocompleteInput
          value={dropoff.address}
          onAddressSelect={(addr, lat, lng) => setDropoff({ address: addr, lat, lng })}
          placeholder="Enter dropoff address"
        />
        <div className="flex gap-2">
          <Button type="button" variant="outline" size="sm" className="text-xs" onClick={setChadwickDropoff}>
            Chadwick School
          </Button>
          {profile?.home_address && (
            <Button type="button" variant="outline" size="sm" className="text-xs" onClick={setHomeDropoff}>
              My Home
            </Button>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <Label className="text-sm">Time</Label>
        <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
      </div>

      <div className="space-y-2">
        <Label className="text-sm">Repeating Days</Label>
        <div className="flex flex-wrap gap-2">
          {DAYS.map((d) => (
            <Button
              key={d}
              type="button"
              size="sm"
              variant={days.includes(d) ? "default" : "outline"}
              onClick={() => toggleDay(d)}
              className="text-xs px-3"
            >
              {d}
            </Button>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">This ride will repeat on the selected days every week until cancelled</p>
      </div>

      <div className="space-y-2">
        <Label className="text-sm">{rideType === "offer" ? "Available Seats" : "Seats Needed"}</Label>
        <Input
          type="number"
          min={1}
          max={10}
          value={seats}
          onChange={(e) => setSeats(Math.max(1, parseInt(e.target.value) || 1))}
        />
      </div>

      {rideType === "offer" && (
        <VehicleSelector
          selectedVehicleId={selectedVehicleId}
          onSelect={(id, info) => { setSelectedVehicleId(id); setVehicleInfo(info); }}
          label="Driving With:"
        />
      )}

      <ChildrenRidingSelector
        selectedChildIds={childIds}
        onSelectionChange={setChildIds}
        error={childIds.length === 0 ? "At least one child must be selected" : null}
      />

      <div className="flex gap-2">
        <Button onClick={handleSubmit} disabled={submitting} className="gap-2">
          {submitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          Send Recurring Ride {rideType === "offer" ? "Offer" : "Request"}
        </Button>
        <Button variant="ghost" onClick={onCancel}>Cancel</Button>
      </div>
    </div>
  );
};

export default RecurringRideForm;
