import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { GRADE_LEVELS, PARENT_GRADE_LEVEL } from "@/constants/gradeLevels";
import AddressAutocompleteInput from "@/components/AddressAutocompleteInput";
import { User, GraduationCap, Car, Home, Phone, Mail, Link2, ArrowRight, ArrowLeft, CheckCircle2, Plus, Trash2 } from "lucide-react";

interface Child {
  first_name: string;
  last_name: string;
  age: string;
  grade_level: string;
}

const ProfileSetup = () => {
  const { user, profile, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [step, setStep] = useState(1);
  const totalSteps = 3;

  // Profile fields
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [homeAddress, setHomeAddress] = useState("");
  const [homeLatitude, setHomeLatitude] = useState<number | null>(null);
  const [homeLongitude, setHomeLongitude] = useState<number | null>(null);
  const [gradeLevel, setGradeLevel] = useState("");

  // Parent fields
  const [carMake, setCarMake] = useState("");
  const [carModel, setCarModel] = useState("");
  const [carColor, setCarColor] = useState("");
  const [licensePlate, setLicensePlate] = useState("");
  const [carSeats, setCarSeats] = useState("");
  const [children, setChildren] = useState<Child[]>([{ first_name: "", last_name: "", age: "", grade_level: "" }]);

  // Student fields
  const [parentGuardianName, setParentGuardianName] = useState("");
  const [parentGuardianPhone, setParentGuardianPhone] = useState("");
  const [parentGuardianEmail, setParentGuardianEmail] = useState("");
  const [emergencyContactName, setEmergencyContactName] = useState("");
  const [emergencyContactPhone, setEmergencyContactPhone] = useState("");

  // Linking
  const [linkEmail, setLinkEmail] = useState("");
  const [linkSending, setLinkSending] = useState(false);
  const [linkSent, setLinkSent] = useState(false);

  const [saving, setSaving] = useState(false);

  const isParent = profile?.account_type === "parent";

  useEffect(() => {
    if (!loading && !user) {
      navigate("/login");
    }
  }, [user, loading, navigate]);

  // If profile is already complete, redirect to dashboard
  useEffect(() => {
    if (profile?.profile_complete) {
      navigate("/dashboard");
    }
  }, [profile, navigate]);

  // Pre-fill from existing profile
  useEffect(() => {
    if (profile) {
      setFirstName(profile.first_name || "");
      setLastName(profile.last_name || "");
      setPhoneNumber(profile.phone_number || "");
      setHomeAddress(profile.home_address || "");
      setHomeLatitude(profile.home_latitude || null);
      setHomeLongitude(profile.home_longitude || null);
      if (!isParent) {
        setGradeLevel(profile.grade_level || "");
      }
    }
  }, [profile, isParent]);

  const handleAddressSelect = (address: string, lat: number, lng: number) => {
    setHomeAddress(address);
    setHomeLatitude(lat);
    setHomeLongitude(lng);
  };

  /* ── Step 2 validation ─────────────────────────── */
  const isStep2Valid = () => {
    if (!firstName.trim() || !lastName.trim() || !phoneNumber.trim()) return false;
    if (!homeAddress || !homeLatitude || !homeLongitude) return false;
    if (!isParent && !gradeLevel) return false;
    return true;
  };

  /* ── Save profile (Step 2 → 3) ─────────────────── */
  const handleSaveProfile = async () => {
    if (!user || !profile) return;
    setSaving(true);

    try {
      const updateData: Record<string, any> = {
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        phone_number: phoneNumber.trim(),
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

      // Sync to users table
      await supabase
        .from("users")
        .update({
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          phone_number: phoneNumber.trim() || null,
        })
        .eq("user_id", user.id);

      // Save children for parents
      if (isParent) {
        await supabase.from("children").delete().eq("user_id", user.id);
        const validChildren = children.filter(c => c.first_name && c.age);
        if (validChildren.length > 0) {
          await supabase.from("children").insert(
            validChildren.map(c => ({
              user_id: user.id,
              name: `${c.first_name} ${c.last_name}`.trim(),
              first_name: c.first_name,
              last_name: c.last_name,
              age: parseInt(c.age),
              school: c.grade_level || "",
              grade_level: c.grade_level || null,
            }))
          );
        }
      }

      setStep(3);
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  /* ── Send link request (Step 3) ────────────────── */
  const handleSendLink = async () => {
    if (!user || !linkEmail.trim()) return;
    setLinkSending(true);

    try {
      const normalizedEmail = linkEmail.toLowerCase().trim();

      // Look up the target user
      const { data: targetData, error: lookupError } = await supabase.functions.invoke("lookup-parent", {
        body: { email: normalizedEmail },
      });

      if (lookupError || !targetData?.userId) {
        toast({
          title: "User not found",
          description: "No account found with that email address.",
          variant: "destructive",
        });
        setLinkSending(false);
        return;
      }

      if (isParent) {
        // Parent linking to student
        const { error } = await supabase.from("account_links").insert({
          parent_id: user.id,
          student_id: targetData.userId,
          status: "pending",
        });
        if (error) throw error;
      } else {
        // Student linking to parent
        const { error } = await supabase.from("account_links").insert({
          student_id: user.id,
          parent_id: targetData.userId,
          status: "pending",
        });
        if (error) throw error;
      }

      setLinkSent(true);
      toast({ title: "Link request sent!", description: "They will receive a notification to approve." });
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setLinkSending(false);
    }
  };

  /* ── Complete onboarding ───────────────────────── */
  const handleFinish = async () => {
    if (!user) return;
    setSaving(true);

    try {
      const { error } = await supabase
        .from("profiles")
        .update({ profile_complete: true, updated_at: new Date().toISOString() })
        .eq("id", user.id);

      if (error) throw error;

      toast({ title: "Welcome!", description: "Your profile is complete. Enjoy the app!" });
      // Force reload to refresh profile in context
      window.location.href = "/dashboard";
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  if (loading || !user || !profile) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const progressPercent = (step / totalSteps) * 100;

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">Complete Your Profile</h1>
          <p className="text-muted-foreground">
            Step {step} of {totalSteps}:{" "}
            {step === 1 && "Welcome"}
            {step === 2 && "Your Information"}
            {step === 3 && "Link Accounts"}
          </p>
          <Progress value={progressPercent} className="mt-4" />
        </div>

        {/* Step 1: Welcome */}
        {step === 1 && (
          <Card>
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                {isParent ? <User className="h-8 w-8 text-primary" /> : <GraduationCap className="h-8 w-8 text-primary" />}
              </div>
              <CardTitle className="text-2xl">
                Welcome, {profile.username}!
              </CardTitle>
              <CardDescription className="text-base">
                Your {isParent ? "parent" : "student"} account has been created. Let's set up your profile so you can start using the app.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex justify-center">
              <Button size="lg" onClick={() => setStep(2)} className="gap-2">
                Get Started <ArrowRight className="h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Step 2: Profile Information */}
        {step === 2 && (
          <div className="space-y-6">
            {/* Personal Info */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" /> Personal Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>First Name <span className="text-destructive">*</span></Label>
                    <Input value={firstName} onChange={e => setFirstName(e.target.value)} placeholder="First name" />
                  </div>
                  <div>
                    <Label>Last Name <span className="text-destructive">*</span></Label>
                    <Input value={lastName} onChange={e => setLastName(e.target.value)} placeholder="Last name" />
                  </div>
                </div>
                <div>
                  <Label className="flex items-center gap-1"><Mail className="h-3.5 w-3.5" /> Email</Label>
                  <Input value={user.email || ""} disabled className="bg-muted" />
                </div>
                <div>
                  <Label className="flex items-center gap-1">
                    <Phone className="h-3.5 w-3.5" /> Phone Number <span className="text-destructive">*</span>
                  </Label>
                  <Input type="tel" value={phoneNumber} onChange={e => setPhoneNumber(e.target.value)} placeholder="(555) 123-4567" />
                </div>
              </CardContent>
            </Card>

            {/* Address */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Home className="h-5 w-5" /> Home Address <span className="text-destructive">*</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <AddressAutocompleteInput
                  value={homeAddress}
                  onChange={setHomeAddress}
                  onAddressSelect={handleAddressSelect}
                  placeholder="Enter your home address"
                  required
                />
                {homeLatitude && homeLongitude && (
                  <p className="text-xs text-emerald-600 mt-2 flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3" /> Address verified
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Student: Grade Level */}
            {!isParent && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <GraduationCap className="h-5 w-5" /> Grade Level <span className="text-destructive">*</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Select value={gradeLevel} onValueChange={setGradeLevel}>
                    <SelectTrigger><SelectValue placeholder="Select grade" /></SelectTrigger>
                    <SelectContent>
                      {GRADE_LEVELS.map(g => (
                        <SelectItem key={g} value={g}>{g}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <div>
                    <Label>Parent/Guardian Name</Label>
                    <Input value={parentGuardianName} onChange={e => setParentGuardianName(e.target.value)} placeholder="Parent name" />
                  </div>
                  <div>
                    <Label>Parent/Guardian Phone</Label>
                    <Input type="tel" value={parentGuardianPhone} onChange={e => setParentGuardianPhone(e.target.value)} placeholder="(555) 123-4567" />
                  </div>
                  <div>
                    <Label>Parent/Guardian Email</Label>
                    <Input type="email" value={parentGuardianEmail} onChange={e => setParentGuardianEmail(e.target.value)} placeholder="parent@email.com" />
                  </div>
                  <div>
                    <Label>Emergency Contact Name</Label>
                    <Input value={emergencyContactName} onChange={e => setEmergencyContactName(e.target.value)} placeholder="Emergency contact" />
                  </div>
                  <div>
                    <Label>Emergency Contact Phone</Label>
                    <Input type="tel" value={emergencyContactPhone} onChange={e => setEmergencyContactPhone(e.target.value)} placeholder="(555) 123-4567" />
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Parent: Car Info & Children */}
            {isParent && (
              <>
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Car className="h-5 w-5" /> Vehicle Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label>Car Make</Label>
                        <Input value={carMake} onChange={e => setCarMake(e.target.value)} placeholder="e.g. Toyota" />
                      </div>
                      <div>
                        <Label>Car Model</Label>
                        <Input value={carModel} onChange={e => setCarModel(e.target.value)} placeholder="e.g. Camry" />
                      </div>
                      <div>
                        <Label>Car Color</Label>
                        <Input value={carColor} onChange={e => setCarColor(e.target.value)} placeholder="e.g. Silver" />
                      </div>
                      <div>
                        <Label>License Plate</Label>
                        <Input value={licensePlate} onChange={e => setLicensePlate(e.target.value)} placeholder="e.g. ABC1234" />
                      </div>
                    </div>
                    <div>
                      <Label>Available Seats</Label>
                      <Input type="number" min="1" max="8" value={carSeats} onChange={e => setCarSeats(e.target.value)} placeholder="Number of seats" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Users className="h-5 w-5" /> Your Children
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {children.map((child, i) => (
                      <div key={i} className="border rounded-lg p-4 space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium">Child {i + 1}</span>
                          {children.length > 1 && (
                            <Button type="button" variant="ghost" size="sm" onClick={() => setChildren(children.filter((_, idx) => idx !== i))}>
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          )}
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <Label>First Name</Label>
                            <Input value={child.first_name} onChange={e => { const u = [...children]; u[i] = { ...u[i], first_name: e.target.value }; setChildren(u); }} />
                          </div>
                          <div>
                            <Label>Last Name</Label>
                            <Input value={child.last_name} onChange={e => { const u = [...children]; u[i] = { ...u[i], last_name: e.target.value }; setChildren(u); }} />
                          </div>
                          <div>
                            <Label>Age</Label>
                            <Input type="number" min="1" max="18" value={child.age} onChange={e => { const u = [...children]; u[i] = { ...u[i], age: e.target.value }; setChildren(u); }} />
                          </div>
                          <div>
                            <Label>Grade</Label>
                            <Select value={child.grade_level} onValueChange={v => { const u = [...children]; u[i] = { ...u[i], grade_level: v }; setChildren(u); }}>
                              <SelectTrigger><SelectValue placeholder="Grade" /></SelectTrigger>
                              <SelectContent>
                                {GRADE_LEVELS.map(g => (
                                  <SelectItem key={g} value={g}>{g}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      </div>
                    ))}
                    <Button type="button" variant="outline" onClick={() => setChildren([...children, { first_name: "", last_name: "", age: "", grade_level: "" }])} className="gap-2">
                      <Plus className="h-4 w-4" /> Add Child
                    </Button>
                  </CardContent>
                </Card>
              </>
            )}

            {/* Navigation */}
            <div className="flex gap-4">
              <Button variant="outline" onClick={() => setStep(1)} className="gap-2">
                <ArrowLeft className="h-4 w-4" /> Back
              </Button>
              <Button
                className="flex-1 gap-2"
                disabled={!isStep2Valid() || saving}
                onClick={handleSaveProfile}
              >
                {saving ? "Saving..." : "Save & Continue"} <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: Account Linking */}
        {step === 3 && (
          <div className="space-y-6">
            <Card>
              <CardHeader className="text-center">
                <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                  <Link2 className="h-8 w-8 text-primary" />
                </div>
                <CardTitle>
                  {isParent ? "Link to Your Child's Account" : "Link to Your Parent's Account"}
                </CardTitle>
                <CardDescription>
                  {isParent
                    ? "Enter your child's school email (@chadwickschool.org) to connect accounts."
                    : "Enter your parent's email address to connect accounts."}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {linkSent ? (
                  <div className="text-center space-y-3">
                    <CheckCircle2 className="h-12 w-12 text-emerald-500 mx-auto" />
                    <p className="text-sm text-muted-foreground">
                      Link request sent! They'll need to approve it.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div>
                      <Label>
                        {isParent ? "Child's Email" : "Parent's Email"}
                      </Label>
                      <Input
                        type="email"
                        value={linkEmail}
                        onChange={e => setLinkEmail(e.target.value)}
                        placeholder={isParent ? "child@chadwickschool.org" : "parent@email.com"}
                      />
                    </div>
                    <Button
                      onClick={handleSendLink}
                      disabled={!linkEmail.trim() || linkSending}
                      className="w-full gap-2"
                    >
                      {linkSending ? "Sending..." : "Send Link Request"}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="flex gap-4">
              <Button variant="outline" onClick={() => setStep(2)} className="gap-2">
                <ArrowLeft className="h-4 w-4" /> Back
              </Button>
              <Button
                className="flex-1 gap-2"
                onClick={handleFinish}
                disabled={saving}
              >
                {saving ? "Finishing..." : linkSent ? "Continue to App" : "Skip for Now"} <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProfileSetup;
