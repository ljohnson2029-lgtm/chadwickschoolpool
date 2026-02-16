import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import Navigation from "@/components/Navigation";
import ParentProfileForm from "@/components/profile/ParentProfileForm";
import StudentProfileForm from "@/components/profile/StudentProfileForm";
import { PARENT_GRADE_LEVEL } from "@/constants/gradeLevels";
import { User, GraduationCap, Mail, Phone } from "lucide-react";

interface Child {
  id?: string;
  first_name: string;
  last_name: string;
  age: string;
  grade_level: string;
}

const ProfileSetup = () => {
  const { user, profile, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  // Common fields
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [homeAddress, setHomeAddress] = useState("");
  const [homeLatitude, setHomeLatitude] = useState<number | null>(null);
  const [homeLongitude, setHomeLongitude] = useState<number | null>(null);

  // Parent-specific fields
  const [carMake, setCarMake] = useState("");
  const [carModel, setCarModel] = useState("");
  const [carColor, setCarColor] = useState("");
  const [licensePlate, setLicensePlate] = useState("");
  const [carSeats, setCarSeats] = useState("");
  const [children, setChildren] = useState<Child[]>([{ first_name: "", last_name: "", age: "", grade_level: "" }]);

  // Student-specific fields
  const [gradeLevel, setGradeLevel] = useState("");
  const [parentGuardianName, setParentGuardianName] = useState("");
  const [parentGuardianPhone, setParentGuardianPhone] = useState("");
  const [parentGuardianEmail, setParentGuardianEmail] = useState("");
  const [emergencyContactName, setEmergencyContactName] = useState("");
  const [emergencyContactPhone, setEmergencyContactPhone] = useState("");

  const [saving, setSaving] = useState(false);

  const isParent = profile?.account_type === 'parent';

  useEffect(() => {
    if (!loading && !user) {
      navigate("/login");
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (profile) {
      setFirstName(profile.first_name || "");
      setLastName(profile.last_name || "");
      setPhoneNumber(profile.phone_number || "");
      setHomeAddress(profile.home_address || "");
      setHomeLatitude(profile.home_latitude || null);
      setHomeLongitude(profile.home_longitude || null);

      if (isParent) {
        setCarMake(profile.car_make || "");
        setCarModel(profile.car_model || "");
        setCarColor(profile.car_color || "");
        setLicensePlate(profile.license_plate || "");
        setCarSeats(profile.car_seats?.toString() || "");
        fetchChildren();
      } else {
        setGradeLevel(profile.grade_level || "");
        setParentGuardianName(profile.parent_guardian_name || "");
        setParentGuardianPhone(profile.parent_guardian_phone || "");
        setParentGuardianEmail(profile.parent_guardian_email || "");
        setEmergencyContactName(profile.emergency_contact_name || "");
        setEmergencyContactPhone(profile.emergency_contact_phone || "");
      }
    }
  }, [profile, isParent]);

  const fetchChildren = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from("children")
      .select("*")
      .eq("user_id", user.id);

    if (error) {
      console.error("Error fetching children:", error);
      return;
    }

    if (data && data.length > 0) {
      setChildren(data.map(child => ({
        id: child.id,
        first_name: (child as any).first_name || child.name || "",
        last_name: (child as any).last_name || "",
        age: child.age.toString(),
        grade_level: (child as any).grade_level || child.school || "",
      })));
    }
  };

  const addChild = () => {
    setChildren([...children, { first_name: "", last_name: "", age: "", grade_level: "" }]);
  };

  const removeChild = (index: number) => {
    setChildren(children.filter((_, i) => i !== index));
  };

  const updateChild = (index: number, field: keyof Child, value: string) => {
    const updated = [...children];
    updated[index] = { ...updated[index], [field]: value };
    setChildren(updated);
  };

  const handleAddressSelect = (address: string, latitude: number, longitude: number) => {
    setHomeAddress(address);
    setHomeLatitude(latitude);
    setHomeLongitude(longitude);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !profile) return;

    // Validate required fields
    if (!firstName.trim() || !lastName.trim()) {
      toast({
        title: "Name Required",
        description: "Please enter your full name",
        variant: "destructive"
      });
      return;
    }

    if (isParent && !phoneNumber.trim()) {
      toast({
        title: "Phone Required",
        description: "Parents must provide a phone number",
        variant: "destructive"
      });
      return;
    }

    if (homeAddress && !homeLatitude && !homeLongitude) {
      toast({
        title: "Invalid Address",
        description: "Please select an address from the suggestions",
        variant: "destructive"
      });
      return;
    }

    if (!isParent && !gradeLevel) {
      toast({
        title: "Grade Level Required",
        description: "Please select your grade level",
        variant: "destructive"
      });
      return;
    }

    setSaving(true);

    try {
      const updateData: Record<string, any> = {
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        phone_number: phoneNumber.trim() || null,
        home_address: homeAddress,
        home_latitude: homeLatitude,
        home_longitude: homeLongitude,
        updated_at: new Date().toISOString(),
      };

      if (isParent) {
        updateData.car_make = carMake;
        updateData.car_model = carModel;
        updateData.car_color = carColor;
        updateData.license_plate = licensePlate;
        updateData.car_seats = carSeats ? parseInt(carSeats) : null;
        updateData.grade_level = PARENT_GRADE_LEVEL;
      } else {
        updateData.grade_level = gradeLevel;
        updateData.parent_guardian_name = parentGuardianName;
        updateData.parent_guardian_phone = parentGuardianPhone;
        updateData.parent_guardian_email = parentGuardianEmail;
        updateData.emergency_contact_name = emergencyContactName;
        updateData.emergency_contact_phone = emergencyContactPhone;
      }

      // Update profile
      const { error: profileError } = await supabase
        .from("profiles")
        .update(updateData)
        .eq("id", user.id);

      if (profileError) throw profileError;

      // Also update first/last name in users table
      const { error: userError } = await supabase
        .from("users")
        .update({
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          phone_number: phoneNumber.trim() || null,
        })
        .eq("user_id", user.id);

      if (userError) console.error("Error updating users table:", userError);

      // Handle children for parent accounts
      if (isParent) {
        const { error: deleteError } = await supabase
          .from("children")
          .delete()
          .eq("user_id", user.id);

        if (deleteError) throw deleteError;

        const validChildren = children.filter(child =>
          child.first_name && child.age
        );

        if (validChildren.length > 0) {
          const { error: childrenError } = await supabase
            .from("children")
            .insert(
              validChildren.map(child => ({
                user_id: user.id,
                name: `${child.first_name} ${child.last_name}`.trim(),
                first_name: child.first_name,
                last_name: child.last_name,
                age: parseInt(child.age),
                school: child.grade_level || "",
                grade_level: child.grade_level || null,
              }))
            );

          if (childrenError) throw childrenError;
        }
      }

      toast({
        title: "Profile updated",
        description: "Your profile has been updated successfully.",
      });

      navigate("/dashboard");
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading || !user) {
    return <div>Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="flex items-center gap-3 mb-8">
          {isParent ? (
            <User className="h-8 w-8 text-primary" />
          ) : (
            <GraduationCap className="h-8 w-8 text-primary" />
          )}
          <div>
            <h1 className="text-3xl font-bold">Profile Setup</h1>
            <p className="text-muted-foreground">
              {isParent ? "Parent Account" : "Student Account"}
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Common Fields - Personal Information */}
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
                  <Label htmlFor="firstName">
                    First Name <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="firstName"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="First name"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="lastName">
                    Last Name <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="lastName"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="Last name"
                    required
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="email" className="flex items-center gap-1">
                  <Mail className="h-3.5 w-3.5" />
                  Email
                </Label>
                <Input
                  id="email"
                  value={user.email || ""}
                  disabled
                  className="bg-muted"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Email cannot be changed
                </p>
              </div>

              <div>
                <Label htmlFor="phoneNumber" className="flex items-center gap-1">
                  <Phone className="h-3.5 w-3.5" />
                  Phone Number {isParent && <span className="text-destructive">*</span>}
                </Label>
                <Input
                  id="phoneNumber"
                  type="tel"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="(555) 123-4567"
                  required={isParent}
                />
              </div>
            </CardContent>
          </Card>

          {/* Role-specific fields */}
          {isParent ? (
            <ParentProfileForm
              homeAddress={homeAddress}
              onAddressSelect={handleAddressSelect}
              carMake={carMake}
              setCarMake={setCarMake}
              carModel={carModel}
              setCarModel={setCarModel}
              carColor={carColor}
              setCarColor={setCarColor}
              licensePlate={licensePlate}
              setLicensePlate={setLicensePlate}
              carSeats={carSeats}
              setCarSeats={setCarSeats}
              children={children}
              onAddChild={addChild}
              onRemoveChild={removeChild}
              onUpdateChild={updateChild}
            />
          ) : (
            <StudentProfileForm
              gradeLevel={gradeLevel}
              setGradeLevel={setGradeLevel}
              homeAddress={homeAddress}
              onAddressSelect={handleAddressSelect}
              parentGuardianName={parentGuardianName}
              setParentGuardianName={setParentGuardianName}
              parentGuardianPhone={parentGuardianPhone}
              setParentGuardianPhone={setParentGuardianPhone}
              parentGuardianEmail={parentGuardianEmail}
              setParentGuardianEmail={setParentGuardianEmail}
              emergencyContactName={emergencyContactName}
              setEmergencyContactName={setEmergencyContactName}
              emergencyContactPhone={emergencyContactPhone}
              setEmergencyContactPhone={setEmergencyContactPhone}
            />
          )}

          <div className="flex gap-4">
            <Button type="submit" disabled={saving} className="flex-1">
              {saving ? "Saving..." : "Save Profile"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate("/dashboard")}
            >
              Cancel
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProfileSetup;
