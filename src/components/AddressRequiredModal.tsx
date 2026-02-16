import { useState, useMemo, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { LoadingButton } from "@/components/ui/loading-button";
import { MapPin, Shield, Users, Navigation, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import AddressAutocompleteInput from "./AddressAutocompleteInput";

/* ─── Types ─────────────────────────────────────────────────────── */

interface AddressRequiredModalProps {
  open: boolean;
  userId: string;
  onAddressAdded: () => void;
  onSkip?: () => void;
}

/* ─── Constants ─────────────────────────────────────────────────── */

const CHADWICK_COORDS = { lat: 33.7555, lng: -118.3937 };

/* ─── Haversine Distance (miles) ────────────────────────────────── */

const getDistanceMiles = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const R = 3958.8; // Earth radius in miles
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

/* ─── Benefit Row ───────────────────────────────────────────────── */

interface BenefitRowProps {
  icon: React.ElementType;
  text: string;
}

const BenefitRow = ({ icon: Icon, text }: BenefitRowProps) => (
  <div className="flex items-center gap-3 text-sm text-muted-foreground">
    <Icon className="w-4 h-4 text-primary flex-shrink-0" />
    <span>{text}</span>
  </div>
);

/* ─── Progress Dots ─────────────────────────────────────────────── */

const ProgressDots = () => (
  <div className="flex items-center justify-center gap-2 pb-2">
    <div className="w-2 h-2 rounded-full bg-primary/30" />
    <div className="w-2 h-2 rounded-full bg-primary" />
    <div className="w-2 h-2 rounded-full bg-primary/30" />
  </div>
);

/* ─── Main Component ────────────────────────────────────────────── */

export const AddressRequiredModal = ({ open, userId, onAddressAdded, onSkip }: AddressRequiredModalProps) => {
  const { toast } = useToast();
  const [address, setAddress] = useState("");
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  const isAddressValid = Boolean(address && latitude && longitude);

  /* ── Distance to Chadwick ───────────────────────────────── */

  const distanceToChadwick = useMemo(() => {
    if (!latitude || !longitude) return null;
    const miles = getDistanceMiles(latitude, longitude, CHADWICK_COORDS.lat, CHADWICK_COORDS.lng);
    return miles < 1
      ? "Less than 1 mile from Chadwick"
      : `~${Math.round(miles)} mile${Math.round(miles) !== 1 ? "s" : ""} from Chadwick`;
  }, [latitude, longitude]);

  /* ── Handlers ───────────────────────────────────────────── */

  const handleAddressSelect = useCallback((selectedAddress: string, lat: number, lng: number) => {
    setAddress(selectedAddress);
    setLatitude(lat);
    setLongitude(lng);
  }, []);

  const handleClearAddress = useCallback(() => {
    setAddress("");
    setLatitude(null);
    setLongitude(null);
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!address || !latitude || !longitude) {
      toast({
        title: "Address required",
        description: "Please select a valid address from the suggestions",
        variant: "destructive",
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
          updated_at: new Date().toISOString(),
        })
        .eq("id", userId);

      if (error) throw error;

      toast({
        title: "Address saved!",
        description: "You're all set to start finding carpool partners.",
      });

      onAddressAdded();
    } catch (error: any) {
      console.error("Error saving address:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to save address",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  }, [address, latitude, longitude, userId, onAddressAdded, toast]);

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent
        className="sm:max-w-lg"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        {/* Progress indicator */}
        <ProgressDots />

        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
              <MapPin className="w-5 h-5 text-primary" />
            </div>
            <DialogTitle className="text-xl">One More Step: Add Your Home Address</DialogTitle>
          </div>
          <DialogDescription>We need your address to connect you with nearby families.</DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* ── Benefits (shown before address is selected) ── */}
          {!isAddressValid && (
            <div className="space-y-3">
              <p className="text-sm font-medium text-foreground">We need your address to:</p>
              <div className="space-y-2">
                <BenefitRow icon={Users} text="Show you on the map for other parents" />
                <BenefitRow icon={Navigation} text="Calculate proximity to Chadwick School" />
                <BenefitRow icon={MapPin} text="Find carpool partners near your route" />
              </div>
            </div>
          )}

          {/* ── Address Input ─────────────────────────────── */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Home Address</label>
            <AddressAutocompleteInput
              value={address}
              onAddressSelect={handleAddressSelect}
              placeholder="Start typing your address..."
              required
            />
          </div>

          {/* ── Confirmation (shown after address selected) ─ */}
          {isAddressValid && (
            <div className="space-y-2" aria-live="polite" aria-label="Address confirmation">
              <div className="flex items-start gap-2.5 p-3 bg-emerald-500/5 border border-emerald-500/20 rounded-lg">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-emerald-700 truncate">Address located</p>
                  {distanceToChadwick && <p className="text-xs text-emerald-600/70 mt-0.5">{distanceToChadwick}</p>}
                </div>
                <button
                  type="button"
                  onClick={handleClearAddress}
                  className="text-xs text-emerald-600 hover:text-emerald-800 underline underline-offset-2 shrink-0"
                  aria-label="Change address"
                >
                  Change
                </button>
              </div>
            </div>
          )}

          {/* ── Privacy Notice ────────────────────────────── */}
          <div className="flex items-start gap-2 p-3 bg-muted/50 rounded-lg">
            <Shield className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
            <p className="text-xs text-muted-foreground">
              <strong>Privacy:</strong> Your exact address is private. Only your approximate location is shown to other
              parents on the map.
            </p>
          </div>
        </div>

        {/* ── Actions ─────────────────────────────────────── */}
        <div className="space-y-2">
          <LoadingButton
            onClick={handleSubmit}
            disabled={!isAddressValid}
            loading={saving}
            loadingText="Saving..."
            className="w-full"
          >
            Continue to Dashboard
          </LoadingButton>

          {onSkip && (
            <button
              type="button"
              onClick={onSkip}
              className="w-full text-center text-xs text-muted-foreground hover:text-foreground transition-colors py-1"
              aria-label="Skip adding address for now"
            >
              I'll add my address later
            </button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AddressRequiredModal;
