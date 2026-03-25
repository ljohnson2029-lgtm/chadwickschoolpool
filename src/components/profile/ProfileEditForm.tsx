import { useState, useMemo, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Save, X, User, Phone, Home, Car, GraduationCap, Users, Plus, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import PhoneNumberInput, { isValidPhoneNumber } from "@/components/PhoneNumberInput";
import { useToast } from "@/hooks/use-toast";
import { GRADE_LEVELS } from "@/constants/gradeLevels";
import AddressAutocompleteInput from "@/components/AddressAutocompleteInput";

interface EditChild {
  id?: string;
  first_name: string;
  last_name: string;
  age: string;
  grade_level: string;
}

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
  const [attempted, setAttempted] = useState(false);

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

  // Children (parent only)
  const [children, setChildren] = useState<EditChild[]>([]);

  // Load existing children
  useEffect(() => {
    if (!isParent) return;
    const load = async () => {
      const { data } = await supabase
        .from("children")
        .select("*")
        .eq("user_id", user.id);
      if (data && data.length > 0) {
        setChildren(data.map(c => ({
          id: c.id,
          first_name: c.first_name || "",
          last_name: c.last_name || "",
          age: String(c.age),
          grade_level: c.grade_level || "",
        })));
      }
    };
    load();
  }, [user.id, isParent]);

  const handleAddressSelect = (address: string, lat: number, lng: number) => {
    setHomeAddress(address);
    setHomeLatitude(lat);
    setHomeLongitude(lng);
  };

  const isChildComplete = (c: EditChild) =>
    c.first_name.trim().length > 0 && c.last_name.trim().length > 0 && c.age.trim().length > 0 && c.grade_level.length > 0;

  // Validation
  const isValid = useMemo(() => {
    if (!firstName.trim() || !lastName.trim()) return false;
    if (isParent) {
      if (!isValidPhoneNumber(phoneNumber)) return false;
      if (!homeAddress.trim() || !homeLatitude || !homeLongitude) return false;
      if (!carMake.trim() || !carModel.trim() || !carColor.trim() || !licensePlate.trim()) return false;
    } else {
      if (!gradeLevel) return false;
    }
    return true;
  }, [firstName, lastName, phoneNumber, homeAddress, homeLatitude, homeLongitude, carMake, carModel, carColor, licensePlate, gradeLevel, isParent]);

  const fieldError = (value: string) => attempted && !value.trim();
  const addressError = attempted && isParent && (!homeAddress.trim() || !homeLatitude || !homeLongitude);
  const gradeLevelError = attempted && !isParent && !gradeLevel;

  const errorBorder = "border-destructive focus-visible:ring-destructive";

  const handleSave = async () => {
    setAttempted(true);
    if (!isValid) {
      toast({ title: "Please fill in all required fields", variant: "destructive" });
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
        updateData.home_address = homeAddress;
        updateData.home_latitude = homeLatitude;
        updateData.home_longitude = homeLongitude;
        updateData.car_make = carMake.trim();
        updateData.car_model = carModel.trim();
        updateData.car_color = carColor.trim();
        updateData.license_plate = licensePlate.trim();
      } else {
        updateData.grade_level = gradeLevel || null;
      }

      const { error: profileError } = await supabase
        .from("profiles")
        .update(updateData)
        .eq("id", user.id);

      if (profileError) throw profileError;

      await supabase
        .from("users")
        .update({
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          phone_number: phoneNumber.trim() || null,
        })
        .eq("user_id", user.id);

      toast({ title: "Profile updated successfully" });
      onSave();
    } catch (error: any) {
      toast({ title: "Error saving profile", description: error.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const RequiredStar = () => <span className="text-destructive">*</span>;
  const FieldError = ({ show }: { show: boolean }) =>
    show ? <p className="text-xs text-destructive mt-1">This field is required</p> : null;

  return (
    <div className="space-y-6">
      {/* Save/Cancel buttons at top */}
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onCancel} disabled={saving}>
          <X className="mr-2 h-4 w-4" />
          Cancel
        </Button>
        <Button onClick={handleSave} disabled={saving || (attempted && !isValid)}>
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
              <Label htmlFor="firstName">First Name <RequiredStar /></Label>
              <Input id="firstName" value={firstName} onChange={e => setFirstName(e.target.value)} placeholder="First name" className={fieldError(firstName) ? errorBorder : ""} />
              <FieldError show={fieldError(firstName)} />
            </div>
            <div>
              <Label htmlFor="lastName">Last Name <RequiredStar /></Label>
              <Input id="lastName" value={lastName} onChange={e => setLastName(e.target.value)} placeholder="Last name" className={fieldError(lastName) ? errorBorder : ""} />
              <FieldError show={fieldError(lastName)} />
            </div>
          </div>
          <div>
            <Label htmlFor="phone">
              <Phone className="inline h-4 w-4 mr-1" />
              Phone Number {isParent && <RequiredStar />}
            </Label>
            <PhoneNumberInput id="phone" value={phoneNumber} onChange={setPhoneNumber} className={isParent && fieldError(phoneNumber) ? errorBorder : ""} />
            {isParent && <FieldError show={fieldError(phoneNumber)} />}
            {!isParent && <p className="text-xs text-muted-foreground mt-1">Optional — not all students have a personal phone number</p>}
          </div>
        </CardContent>
      </Card>

      {/* Address - Parents only */}
      {isParent && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Home className="h-5 w-5" />
              Home Address <RequiredStar />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <AddressAutocompleteInput
              value={homeAddress}
              onAddressSelect={handleAddressSelect}
              placeholder="Start typing your address..."
              required
              className={addressError ? errorBorder : ""}
            />
            {addressError ? (
              <p className="text-xs text-destructive mt-1">Please select an address from suggestions</p>
            ) : (
              <p className="text-xs text-muted-foreground mt-1">Select from suggestions to enable map features</p>
            )}
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
                <Label htmlFor="carMake">Make <RequiredStar /></Label>
                <Input id="carMake" value={carMake} onChange={e => setCarMake(e.target.value)} placeholder="e.g., Toyota" className={fieldError(carMake) ? errorBorder : ""} />
                <FieldError show={fieldError(carMake)} />
              </div>
              <div>
                <Label htmlFor="carModel">Model <RequiredStar /></Label>
                <Input id="carModel" value={carModel} onChange={e => setCarModel(e.target.value)} placeholder="e.g., Camry" className={fieldError(carModel) ? errorBorder : ""} />
                <FieldError show={fieldError(carModel)} />
              </div>
              <div>
                <Label htmlFor="carColor">Color <RequiredStar /></Label>
                <Input id="carColor" value={carColor} onChange={e => setCarColor(e.target.value)} placeholder="e.g., Silver" className={fieldError(carColor) ? errorBorder : ""} />
                <FieldError show={fieldError(carColor)} />
              </div>
              <div>
                <Label htmlFor="licensePlate">License Plate <RequiredStar /></Label>
                <Input id="licensePlate" value={licensePlate} onChange={e => setLicensePlate(e.target.value)} placeholder="e.g., ABC1234" className={fieldError(licensePlate) ? errorBorder : ""} />
                <FieldError show={fieldError(licensePlate)} />
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
            <Label htmlFor="gradeLevel">Grade Level <RequiredStar /></Label>
            <Select value={gradeLevel} onValueChange={setGradeLevel}>
              <SelectTrigger className={`mt-2 ${gradeLevelError ? errorBorder : ""}`}>
                <SelectValue placeholder="Select your grade level" />
              </SelectTrigger>
              <SelectContent>
                {GRADE_LEVELS.map(grade => (
                  <SelectItem key={grade} value={grade}>{grade}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FieldError show={!!gradeLevelError} />
          </CardContent>
        </Card>
      )}

      {/* Save/Cancel buttons at bottom too */}
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onCancel} disabled={saving}>
          <X className="mr-2 h-4 w-4" />
          Cancel
        </Button>
        <Button onClick={handleSave} disabled={saving || (attempted && !isValid)}>
          <Save className="mr-2 h-4 w-4" />
          {saving ? "Saving..." : "Save Changes"}
        </Button>
      </div>
    </div>
  );
};

export default ProfileEditForm;
