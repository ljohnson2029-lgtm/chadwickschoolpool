import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { MapPin, Shield, Users, Navigation } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import AddressAutocompleteInput from "./AddressAutocompleteInput";

interface AddressRequiredModalProps {
  open: boolean;
  userId: string;
  onAddressAdded: () => void;
}

const AddressRequiredModal = ({ open, userId, onAddressAdded }: AddressRequiredModalProps) => {
  const { toast } = useToast();
  const [address, setAddress] = useState("");
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  const handleAddressSelect = (selectedAddress: string, lat: number, lng: number) => {
    setAddress(selectedAddress);
    setLatitude(lat);
    setLongitude(lng);
  };

  const handleSubmit = async () => {
    if (!address || !latitude || !longitude) {
      toast({
        title: "Address required",
        description: "Please select a valid address from the suggestions",
        variant: "destructive"
      });
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          home_address: address,
          home_latitude: latitude,
          home_longitude: longitude,
          updated_at: new Date().toISOString()
        })
        .eq("id", userId);

      if (error) throw error;

      toast({
        title: "Address saved!",
        description: "You're all set to start finding carpool partners."
      });

      onAddressAdded();
    } catch (error: any) {
      console.error("Error saving address:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to save address",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const isAddressValid = address && latitude && longitude;

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent 
        className="sm:max-w-lg"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <div className="flex items-center gap-2 mb-2">
            <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
              <MapPin className="w-5 h-5 text-primary" />
            </div>
            <DialogTitle className="text-xl">One More Step: Add Your Home Address</DialogTitle>
          </div>
          <DialogDescription>
            We need your address to connect you with nearby families.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Benefits */}
          <div className="space-y-3">
            <p className="text-sm font-medium text-foreground">We need your address to:</p>
            <div className="space-y-2">
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <Users className="w-4 h-4 text-primary flex-shrink-0" />
                <span>Show you on the map for other parents</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <Navigation className="w-4 h-4 text-primary flex-shrink-0" />
                <span>Calculate proximity to Chadwick School</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <MapPin className="w-4 h-4 text-primary flex-shrink-0" />
                <span>Find carpool partners near your route</span>
              </div>
            </div>
          </div>

          {/* Address Input */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Home Address</label>
            <AddressAutocompleteInput
              value={address}
              onAddressSelect={handleAddressSelect}
              placeholder="Start typing your address..."
              required
            />
          </div>

          {/* Privacy Notice */}
          <div className="flex items-start gap-2 p-3 bg-muted/50 rounded-lg">
            <Shield className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
            <p className="text-xs text-muted-foreground">
              <strong>Privacy:</strong> Your exact address is private. Only your approximate location is shown to other parents on the map.
            </p>
          </div>
        </div>

        <Button 
          onClick={handleSubmit} 
          disabled={!isAddressValid || saving}
          className="w-full"
        >
          {saving ? "Saving..." : "Continue to Dashboard"}
        </Button>
      </DialogContent>
    </Dialog>
  );
};

export default AddressRequiredModal;
