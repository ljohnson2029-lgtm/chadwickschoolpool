import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Save, X, User, Phone, Home, Car, GraduationCap } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { GRADE_LEVELS } from "@/constants/gradeLevels";
import AddressAutocompleteInput from "@/components/AddressAutocompleteInput";

interface ProfileEditFormProps {
  user: { id: string; email?: string };
  profile: any;
  isParent: boolean;
  onSave: () => void;
  onCancel: () => void;
}

const ProfileEditForm = ({ user, profile, isParent, onSave, onCancel }: ProfileEditFormProps) => {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);

  // Shared fields
  const [firstName, setFirstName] = useState(profile.first_name || "");
  const [lastName, setLastName] = useState(profile.last_name || "");
  const [phoneNumber, setPhoneNumber] = useState(profile.phone_number || "");
  const [homeAddress, setHomeAddress] = useState(profile.home_address || "");
  const [homeLatitude, setHomeLatitude] = useState<number | null>(profile.home_latitude || null);
  const [homeLongitude, setHomeLongitude] = useState<number | null>(profile.home_longitude || null);

  // Parent fields
  const [carMake, setCarMake] = useState(profile.car_make || "");
  const [carModel, setCarModel] = useState(profile.car_model || "");
  const [carColor, setCarColor] = useState(profile.car_color || "");
  const [licensePlate, setLicensePlate] = useState(profile.license_plate || "");

  // Student fields
  const [gradeLevel, setGradeLevel] = useState(profile.grade_level || "");

  const handleAddressSelect = (address: string, lat: number, lng: number) => {
    setHomeAddress(address);
    setHomeLatitude(lat);
    setHomeLongitude(lng);
  };

  const handleSave = async () => {
    if (!firstName.trim() || !lastName.trim()) {
      toast({ title: "Name is required", variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      const updateData: Record<string, any> = {
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        phone_number: phoneNumber.trim() || null,
        updated_at: new Date().toISOString(),
      };

      if (isParent) {
        updateData.home_address = homeAddress || null;
        updateData.home_latitude = homeLatitude;
        updateData.home_longitude = homeLongitude;
        updateData.car_make = carMake || null;
        updateData.car_model = carModel || null;
        updateData.car_color = carColor || null;
        updateData.license_plate = licensePlate || null;
      } else {
        updateData.grade_level = gradeLevel || null;
      }

      const { error: profileError } = await supabase
        .from("profiles")
        .update(updateData)
        .eq("id", user.id);

      if (profileError) throw profileError;

      // Also update users table
      await supabase
        .from("users")
        .update({
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          phone_number: phoneNumber.trim() || null,
        })
        .eq("user_id", user.id);

      toast({ title: "Profile updated!", description: "Your changes have been saved." });
      onSave();
    } catch (error: any) {
      toast({ title: "Error saving profile", description: error.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Save/Cancel buttons at top */}
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onCancel} disabled={saving}>
          <X className="mr-2 h-4 w-4" />
          Cancel
        </Button>
        <Button onClick={handleSave} disabled={saving}>
          <Save className="mr-2 h-4 w-4" />
          {saving ? "Saving..." : "Save Changes"}
        </Button>
      </div>

      {/* Personal Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Personal Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="firstName">First Name <span className="text-destructive">*</span></Label>
              <Input id="firstName" value={firstName} onChange={e => setFirstName(e.target.value)} placeholder="First name" />
            </div>
            <div>
              <Label htmlFor="lastName">Last Name <span className="text-destructive">*</span></Label>
              <Input id="lastName" value={lastName} onChange={e => setLastName(e.target.value)} placeholder="Last name" />
            </div>
          </div>
          <div>
            <Label htmlFor="phone"><Phone className="inline h-4 w-4 mr-1" />Phone Number</Label>
            <Input id="phone" type="tel" value={phoneNumber} onChange={e => setPhoneNumber(e.target.value)} placeholder="(555) 123-4567" />
          </div>
        </CardContent>
      </Card>

      {/* Address - Parents only */}
      {isParent && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Home className="h-5 w-5" />
              Home Address
            </CardTitle>
          </CardHeader>
          <CardContent>
            <AddressAutocompleteInput
              value={homeAddress}
              onAddressSelect={handleAddressSelect}
              placeholder="Start typing your address..."
              required
            />
            <p className="text-xs text-muted-foreground mt-1">
              Select from suggestions to enable map features
            </p>
          </CardContent>
        </Card>
      )}

      {/* Parent-specific: Vehicle */}
      {isParent && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Car className="h-5 w-5" />
              Vehicle Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="carMake">Make</Label>
                <Input id="carMake" value={carMake} onChange={e => setCarMake(e.target.value)} placeholder="e.g., Toyota" />
              </div>
              <div>
                <Label htmlFor="carModel">Model</Label>
                <Input id="carModel" value={carModel} onChange={e => setCarModel(e.target.value)} placeholder="e.g., Camry" />
              </div>
              <div>
                <Label htmlFor="carColor">Color</Label>
                <Input id="carColor" value={carColor} onChange={e => setCarColor(e.target.value)} placeholder="e.g., Silver" />
              </div>
              <div>
                <Label htmlFor="licensePlate">License Plate</Label>
                <Input id="licensePlate" value={licensePlate} onChange={e => setLicensePlate(e.target.value)} placeholder="e.g., ABC1234" />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Student-specific: Grade */}
      {!isParent && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <GraduationCap className="h-5 w-5" />
              Academic Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Label htmlFor="gradeLevel">Grade Level</Label>
            <Select value={gradeLevel} onValueChange={setGradeLevel}>
              <SelectTrigger className="mt-2">
                <SelectValue placeholder="Select your grade level" />
              </SelectTrigger>
              <SelectContent>
                {GRADE_LEVELS.map(grade => (
                  <SelectItem key={grade} value={grade}>{grade}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>
      )}

      {/* Save/Cancel buttons at bottom too */}
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onCancel} disabled={saving}>
          <X className="mr-2 h-4 w-4" />
          Cancel
        </Button>
        <Button onClick={handleSave} disabled={saving}>
          <Save className="mr-2 h-4 w-4" />
          {saving ? "Saving..." : "Save Changes"}
        </Button>
      </div>
    </div>
  );
};

export default ProfileEditForm;
