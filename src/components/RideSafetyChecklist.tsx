import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Shield, Car, Baby, Phone } from "lucide-react";

interface RideSafetyChecklistProps {
  licenseConfirmed: boolean;
  vehicleConfirmed: boolean;
  carSeatsConfirmed: boolean;
  emergencyContactsConfirmed: boolean;
  onLicenseChange: (checked: boolean) => void;
  onVehicleChange: (checked: boolean) => void;
  onCarSeatsChange: (checked: boolean) => void;
  onEmergencyContactsChange: (checked: boolean) => void;
  disabled?: boolean;
}

const RideSafetyChecklist = ({
  licenseConfirmed,
  vehicleConfirmed,
  carSeatsConfirmed,
  emergencyContactsConfirmed,
  onLicenseChange,
  onVehicleChange,
  onCarSeatsChange,
  onEmergencyContactsChange,
  disabled = false,
}: RideSafetyChecklistProps) => {
  return (
    <div className="space-y-3 p-4 bg-primary/5 rounded-lg border border-primary/20">
      <div className="flex items-center gap-2 mb-2">
        <Shield className="h-5 w-5 text-primary" />
        <p className="text-sm font-semibold text-foreground">Safety Confirmation</p>
      </div>
      <p className="text-xs text-muted-foreground mb-3">
        Please confirm the following before posting your ride offer:
      </p>

      {/* Valid License and Insurance */}
      <div className="flex items-center gap-3 min-h-[36px]">
        <Checkbox
          id="license-confirmed"
          checked={licenseConfirmed}
          onCheckedChange={(checked) => onLicenseChange(checked as boolean)}
          disabled={disabled}
        />
        <Label
          htmlFor="license-confirmed"
          className="text-sm cursor-pointer flex items-center gap-2"
        >
          <Car className="h-4 w-4 text-primary" />
          Valid license and insurance
        </Label>
      </div>

      {/* Vehicle Condition */}
      <div className="flex items-center gap-3 min-h-[36px]">
        <Checkbox
          id="vehicle-confirmed"
          checked={vehicleConfirmed}
          onCheckedChange={(checked) => onVehicleChange(checked as boolean)}
          disabled={disabled}
        />
        <Label
          htmlFor="vehicle-confirmed"
          className="text-sm cursor-pointer flex items-center gap-2"
        >
          <Shield className="h-4 w-4 text-primary" />
          Vehicle in safe condition
        </Label>
      </div>

      {/* Car Seats */}
      <div className="flex items-center gap-3 min-h-[36px]">
        <Checkbox
          id="carseats-confirmed"
          checked={carSeatsConfirmed}
          onCheckedChange={(checked) => onCarSeatsChange(checked as boolean)}
          disabled={disabled}
        />
        <Label
          htmlFor="carseats-confirmed"
          className="text-sm cursor-pointer flex items-center gap-2"
        >
          <Baby className="h-4 w-4 text-primary" />
          Appropriate car seats available
        </Label>
      </div>

      {/* Emergency Contacts */}
      <div className="flex items-center gap-3 min-h-[36px]">
        <Checkbox
          id="emergency-confirmed"
          checked={emergencyContactsConfirmed}
          onCheckedChange={(checked) => onEmergencyContactsChange(checked as boolean)}
          disabled={disabled}
        />
        <Label
          htmlFor="emergency-confirmed"
          className="text-sm cursor-pointer flex items-center gap-2"
        >
          <Phone className="h-4 w-4 text-primary" />
          Emergency contacts on file
        </Label>
      </div>
    </div>
  );
};

export default RideSafetyChecklist;
