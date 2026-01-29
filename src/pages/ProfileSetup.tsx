import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import Navigation from "@/components/Navigation";
import ParentProfileForm from "@/components/profile/ParentProfileForm";
import StudentProfileForm from "@/components/profile/StudentProfileForm";
import { PARENT_GRADE_LEVEL } from "@/constants/gradeLevels";
import { User, GraduationCap } from "lucide-react";

interface Child {
  id?: string;
  name: string;
  age: string;
  school: string;
}

const ProfileSetup = () => {
  const { user, profile, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  // Common fields
  const [homeAddress, setHomeAddress] = useState("");
  const [homeLatitude, setHomeLatitude] = useState<number | null>(null);
  const [homeLongitude, setHomeLongitude] = useState<number | null>(null);

  // Parent-specific fields
  const [carMake, setCarMake] = useState("");
  const [carModel, setCarModel] = useState("");
  const [carColor, setCarColor] = useState("");
  const [licensePlate, setLicensePlate] = useState("");
  const [carSeats, setCarSeats] = useState("");
  const [children, setChildren] = useState<Child[]>([{ name: "", age: "", school: "" }]);

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
        name: child.name,
        age: child.age.toString(),
        school: child.school
      })));
    }
  };

  const addChild = () => {
    setChildren([...children, { name: "", age: "", school: "" }]);
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

    // Validate that address has been geocoded
    if (homeAddress && !homeLatitude && !homeLongitude) {
      toast({
        title: "Invalid Address",
        description: "Please select an address from the suggestions",
        variant: "destructive"
      });
      return;
    }

    // Validate grade level for students
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
      // Build update object based on account type
      const updateData: Record<string, any> = {
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

      const { error: profileError } = await supabase
        .from("profiles")
        .update(updateData)
        .eq("id", user.id);

      if (profileError) throw profileError;

      // Handle children for parent accounts
      if (isParent) {
        const { error: deleteError } = await supabase
          .from("children")
          .delete()
          .eq("user_id", user.id);

        if (deleteError) throw deleteError;

        const validChildren = children.filter(child => 
          child.name && child.age && child.school
        );

        if (validChildren.length > 0) {
          const { error: childrenError } = await supabase
            .from("children")
            .insert(
              validChildren.map(child => ({
                user_id: user.id,
                name: child.name,
                age: parseInt(child.age),
                school: child.school,
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
