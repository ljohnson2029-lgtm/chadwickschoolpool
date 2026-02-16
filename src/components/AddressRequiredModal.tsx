import { useState, useMemo, useCallback, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { LoadingButton } from "@/components/ui/loading-button";
import { Button } from "@/components/ui/button";
import { MapPin, Shield, Users, Navigation, CheckCircle2, AlertTriangle, School } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import AddressAutocompleteInput from "./AddressAutocompleteInput";
import { cn } from "@/lib/utils";

/* ─── Constants & Configuration ────────────────────────────────── */

const CHADWICK_COORDS = { lat: 33.7555, lng: -118.3937 };
const MAX_REASONABLE_DISTANCE_MILES = 50;

/* ─── Utilities ────────────────────────────────────────────────── */

const getDistanceMiles = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const R = 3958.8;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

/* ─── Types ────────────────────────────────────────────────────── */

interface AddressRequiredModalProps {
  open: boolean;
  userId: string;
  onAddressAdded: () => void;
  onSkip?: () => void;
}

/* ─── Sub-Components ───────────────────────────────────────────── */

const ProgressDots = ({ currentStep = 2, totalSteps = 3 }) => (
  <div
    className="flex items-center justify-center gap-2 pb-4"
    role="progressbar"
    aria-valuenow={currentStep}
    aria-valuemin={1}
    aria-valuemax={totalSteps}
    aria-label={`Step ${currentStep} of ${totalSteps}`}
  >
    {Array.from({ length: totalSteps }).map((_, i) => {
      const stepNum = i + 1;
      const isActive = stepNum === currentStep;
      return (
        <div
          key={i}
          className={cn(
            "h-2 rounded-full transition-all duration-300",
            isActive ? "w-8 bg-primary" : "w-2 bg-primary/20",
          )}
          aria-current={isActive ? "step" : undefined}
        />
      );
    })}
  </div>
);

const BenefitRow = ({ icon: Icon, text }: { icon: React.ElementType; text: string }) => (
  <div className="flex items-start gap-3 text-sm text-muted-foreground animate-in fade-in slide-in-from-left-2 duration-500">
    <div className="mt-0.5 p-1 bg-primary/10 rounded-full">
      <Icon className="w-3.5 h-3.5 text-primary flex-shrink-0" />
    </div>
    <span className="leading-tight">{text}</span>
  </div>
);

const PrivacyNote = () => (
  <div className="flex items-start gap-3 p-3 bg-blue-50/50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-800 rounded-lg">
    <Shield className="w-4 h-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
    <p className="text-xs text-muted-foreground leading-relaxed">
      <strong className="text-foreground">Privacy Guarantee:</strong> Your exact street address is never shared. Other
      parents will only see an approximate location circle on the map.
    </p>
  </div>
);

/* ─── Main Component ───────────────────────────────────────────── */

export const AddressRequiredModal = ({ open, userId, onAddressAdded, onSkip }: AddressRequiredModalProps) => {
  const { toast } = useToast();

  const [address, setAddress] = useState("");
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [isWarningAck, setIsWarningAck] = useState(false);

  useEffect(() => {
    if (!open) {
      setAddress("");
      setLatitude(null);
      setLongitude(null);
      setIsWarningAck(false);
    }
  }, [open]);

  const distanceInfo = useMemo(() => {
    if (!latitude || !longitude) return null;
    const miles = getDistanceMiles(latitude, longitude, CHADWICK_COORDS.lat, CHADWICK_COORDS.lng);
    return {
      miles,
      formatted: miles < 0.5 ? "< 0.5 miles" : `${miles.toFixed(1)} miles`,
      isFar: miles > MAX_REASONABLE_DISTANCE_MILES,
    };
  }, [latitude, longitude]);

  const isAddressValid = Boolean(address && latitude && longitude);

  const handleAddressSelect = useCallback((selectedAddress: string, lat: number, lng: number) => {
    setAddress(selectedAddress);
    setLatitude(lat);
    setLongitude(lng);
    setIsWarningAck(false);
  }, []);

  const handleClearAddress = useCallback(() => {
    setAddress("");
    setLatitude(null);
    setLongitude(null);
    setIsWarningAck(false);
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!isAddressValid) {
      toast({
        title: "Address required",
        description: "Please select a valid address from the suggestions.",
        variant: "destructive",
      });
      return;
    }

    if (distanceInfo?.isFar && !isWarningAck) {
      setIsWarningAck(true);
      toast({
        title: "Check Location",
        description: `This address is ${distanceInfo.formatted} from Chadwick. Click 'Confirm Address' again if this is correct.`,
        variant: "default",
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
        title: "You're all set!",
        description: "Address saved. We've updated your carpool matches.",
        variant: "default",
      });

      onAddressAdded();
    } catch (error: any) {
      console.error("Error saving address:", error);
      toast({
        title: "Save Failed",
        description: "We couldn't save your address. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  }, [isAddressValid, address, latitude, longitude, userId, onAddressAdded, toast, distanceInfo, isWarningAck]);

  return (
    <Dialog
      open={open}
      onOpenChange={() => {
        /* Force user to interact */
      }}
    >
      {/* FIX: Removed 'overflow-hidden' so the map/dropdown can pop out. 
         Added 'flex flex-col' to manage layout better.
      */}
      <DialogContent
        className="sm:max-w-[480px] p-0 gap-0 flex flex-col max-h-[90vh]"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <div className="p-6 overflow-y-auto">
          {/* Header Section */}
          <div className="mb-6">
            <ProgressDots currentStep={2} />
            <div className="text-center space-y-2">
              <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                <MapPin className="w-6 h-6 text-primary" />
              </div>
              <DialogTitle className="text-xl font-semibold">Where are you commuting from?</DialogTitle>
              <DialogDescription className="text-center max-w-xs mx-auto">
                Add your home address to find families nearby and build your carpool route.
              </DialogDescription>
            </div>
          </div>

          <div className="space-y-6">
            {/* Input Section - Ensure z-index is high if needed */}
            <div className="space-y-2 relative z-50">
              <AddressAutocompleteInput
                value={address}
                onAddressSelect={handleAddressSelect}
                placeholder="Enter your home address..."
                required
                className="h-11"
              />
            </div>

            {/* Dynamic Content Area */}
            <div className="min-h-[100px]">
              {!isAddressValid ? (
                <div className="space-y-3 bg-muted/30 p-4 rounded-xl">
                  <p className="text-xs font-semibold uppercase text-muted-foreground tracking-wider mb-2">
                    Why we need this
                  </p>
                  <BenefitRow icon={Users} text="See other families on the map" />
                  <BenefitRow icon={Navigation} text="Calculate precise commute times" />
                  <BenefitRow icon={School} text="Find partners along your route to Chadwick" />
                </div>
              ) : (
                <div className="space-y-3 animate-in fade-in zoom-in-95 duration-300">
                  <div
                    className={cn(
                      "flex items-start gap-3 p-4 rounded-xl border",
                      distanceInfo?.isFar
                        ? "bg-amber-50 border-amber-200 dark:bg-amber-900/20 dark:border-amber-800"
                        : "bg-emerald-50 border-emerald-200 dark:bg-emerald-900/20 dark:border-emerald-800",
                    )}
                  >
                    {distanceInfo?.isFar ? (
                      <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-500 mt-0.5 shrink-0" />
                    ) : (
                      <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-500 mt-0.5 shrink-0" />
                    )}

                    <div className="flex-1 min-w-0">
                      <p
                        className={cn(
                          "text-sm font-semibold truncate",
                          distanceInfo?.isFar
                            ? "text-amber-800 dark:text-amber-400"
                            : "text-emerald-800 dark:text-emerald-400",
                        )}
                      >
                        {distanceInfo?.isFar ? "Location Warning" : "Location Found"}
                      </p>

                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-muted-foreground">{distanceInfo?.formatted} from school</span>
                      </div>

                      {distanceInfo?.isFar && (
                        <p className="text-xs text-amber-700 mt-2 leading-tight">
                          This seems far away. Please verify you selected the correct city/state.
                        </p>
                      )}
                    </div>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleClearAddress}
                      className="h-6 px-2 text-xs hover:bg-black/5 dark:hover:bg-white/5 -mr-2"
                    >
                      Change
                    </Button>
                  </div>
                </div>
              )}
            </div>

            <PrivacyNote />
          </div>
        </div>

        {/* Footer / Actions */}
        <div className="p-6 bg-muted/30 border-t flex flex-col gap-3 mt-auto">
          <LoadingButton
            onClick={handleSubmit}
            disabled={!isAddressValid}
            loading={saving}
            loadingText="Saving Address..."
            variant={distanceInfo?.isFar && !isWarningAck ? "secondary" : "default"}
            className="w-full h-11 text-base shadow-sm"
          >
            {distanceInfo?.isFar && !isWarningAck ? "Confirm Address Anyway" : "Continue to Dashboard"}
          </LoadingButton>

          {onSkip && (
            <button
              type="button"
              onClick={onSkip}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors py-2"
            >
              Skip this step for now
            </button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AddressRequiredModal;
