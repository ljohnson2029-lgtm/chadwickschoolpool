import { useState, useEffect, useRef } from "react";
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
import { User, GraduationCap, Car, Home, Phone, Mail, Link2, ArrowRight, ArrowLeft, CheckCircle2, Plus, Trash2, Users, AlertCircle } from "lucide-react";

interface Child {
  first_name: string;
  last_name: string;
  age: string;
  grade_level: string;
}

/* ── Validation helpers ──────────────────────────── */

const isValidPhone = (phone: string) => phone.replace(/\D/g, "").length >= 10;
const isMinLength = (val: string, min: number) => val.trim().length >= min;

interface FieldError {
  show: boolean;
  message: string;
}

const FieldErrorMessage = ({ error }: { error?: FieldError }) => {
  if (!error?.show) return null;
  return (
    <p className="text-sm text-destructive flex items-center gap-1 mt-1">
      <AlertCircle className="h-3.5 w-3.5 shrink-0" />
      {error.message}
    </p>
  );
};

const RequiredLabel = ({ children, icon, htmlFor }: { children: React.ReactNode; icon?: React.ReactNode; htmlFor?: string }) => (
  <Label htmlFor={htmlFor} className="flex items-center gap-1">
    {icon} {children} <span className="text-destructive">*</span>
  </Label>
);

const OptionalLabel = ({ children, icon, htmlFor }: { children: React.ReactNode; icon?: React.ReactNode; htmlFor?: string }) => (
  <Label htmlFor={htmlFor} className="flex items-center gap-1">
    {icon} {children}
  </Label>
);

const ProfileSetup = () => {
  const { user, profile, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const formRef = useRef<HTMLDivElement>(null);

  const [step, setStep] = useState(1);
  const totalSteps = 3;
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [attemptedSubmit, setAttemptedSubmit] = useState(false);

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
  const [children, setChildren] = useState<Child[]>([]);
  const [childTouched, setChildTouched] = useState<Record<string, boolean>>({});

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
    if (!loading && !user) navigate("/login");
  }, [user, loading, navigate]);

  useEffect(() => {
    if (profile?.profile_complete) navigate("/dashboard");
  }, [profile, navigate]);

  useEffect(() => {
    if (profile) {
      setFirstName(profile.first_name || "");
      setLastName(profile.last_name || "");
      setPhoneNumber(profile.phone_number || "");
      setHomeAddress(profile.home_address || "");
      setHomeLatitude(profile.home_latitude || null);
      setHomeLongitude(profile.home_longitude || null);
      setGradeLevel(profile.grade_level || "");
      setCarMake(profile.car_make || "");
      setCarModel(profile.car_model || "");
      setCarColor(profile.car_color || "");
      setLicensePlate(profile.license_plate || "");
      setCarSeats(profile.car_seats !== null && profile.car_seats !== undefined ? String(profile.car_seats) : "");
    }
  }, [profile, isParent]);

  const markTouched = (field: string) => setTouched(prev => ({ ...prev, [field]: true }));

  const handleAddressSelect = (address: string, lat: number, lng: number) => {
    setHomeAddress(address);
    setHomeLatitude(lat);
    setHomeLongitude(lng);
    markTouched("address");
  };

  /* ── Field-level validation ─────────────────────── */

  const hasSelectedAddress =
    homeAddress.trim().length > 0 && homeLatitude !== null && homeLongitude !== null;

  const getFieldError = (field: string): FieldError => {
    const show = touched[field] || attemptedSubmit;

    switch (field) {
      case "firstName":
        if (!firstName.trim()) return { show, message: "This field is required" };
        if (!isMinLength(firstName, 2)) return { show, message: "Must be at least 2 characters" };
        break;
      case "lastName":
        if (!lastName.trim()) return { show, message: "This field is required" };
        if (!isMinLength(lastName, 2)) return { show, message: "Must be at least 2 characters" };
        break;
      case "phone":
        if (!phoneNumber.trim()) return { show, message: "This field is required" };
        if (!isValidPhone(phoneNumber)) return { show, message: "Phone must be at least 10 digits" };
        break;
      case "address":
        if (!homeAddress.trim()) return { show, message: "This field is required" };
        if (!hasSelectedAddress) return { show, message: "Please select an address from the dropdown" };
        break;
      case "gradeLevel":
        if (!isParent && !gradeLevel) return { show, message: "This field is required" };
        break;
      case "carMake":
        if (isParent && !carMake.trim()) return { show, message: "This field is required" };
        break;
      case "carModel":
        if (isParent && !carModel.trim()) return { show, message: "This field is required" };
        break;
      case "carSeats":
        if (isParent && carSeats === "") return { show, message: "This field is required" };
        break;
      case "carColor":
        if (isParent && !carColor.trim()) return { show, message: "This field is required" };
        break;
      case "licensePlate":
        if (isParent && !licensePlate.trim()) return { show, message: "This field is required" };
        break;
      case "parentGuardianName":
        if (!isParent && !parentGuardianName.trim()) return { show, message: "This field is required" };
        break;
      case "parentGuardianPhone":
        if (!isParent && !parentGuardianPhone.trim()) return { show, message: "This field is required" };
        if (!isParent && parentGuardianPhone.trim() && !isValidPhone(parentGuardianPhone)) return { show, message: "Phone must be at least 10 digits" };
        break;
      case "children":
        if (isParent && (!children.length || !children.some(c => c.first_name.trim()))) return { show, message: "At least one child with a name is required" };
        break;
    }

    return { show: false, message: "" };
  };

  const hasError = (field: string) => {
    const err = getFieldError(field);
    return err.show && err.message.length > 0;
  };

  const errorInputClass = (field: string) => hasError(field) ? "border-destructive focus-visible:ring-destructive" : "";

  /* ── Step 2 validation ─────────────────────────── */
  const isStep2Valid = () => {
    if (!isMinLength(firstName, 2) || !isMinLength(lastName, 2)) return false;
    if (!phoneNumber.trim() || !isValidPhone(phoneNumber)) return false;
    if (!hasSelectedAddress) return false;
    if (!isParent && !gradeLevel) return false;
    if (!isParent && !parentGuardianName.trim()) return false;
    if (!isParent && (!parentGuardianPhone.trim() || !isValidPhone(parentGuardianPhone))) return false;
    if (isParent && (!carMake.trim() || !carModel.trim() || !carColor.trim() || !licensePlate.trim())) return false;
    if (isParent && carSeats === "") return false;
    if (isParent && (!children.length || !children.some(c => c.first_name.trim()))) return false;
    return true;
  };

  const scrollToFirstError = () => {
    setTimeout(() => {
      const firstError = formRef.current?.querySelector(".text-destructive.text-sm");
      firstError?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 50);
  };

  const handleAttemptContinue = () => {
    setAttemptedSubmit(true);

    if (!isStep2Valid()) {
      toast({
        title: "Please complete all required fields",
        description: "Fill every required field before continuing.",
        variant: "destructive",
      });
      scrollToFirstError();
      return;
    }

    handleSaveProfile();
  };

  /* ── Save profile (Step 2 → 3) ─────────────────── */
  const handleSaveProfile = async () => {
    if (!isStep2Valid()) {
      setAttemptedSubmit(true);
      toast({
        title: "Please complete all required fields",
        description: "Fill every required field before continuing.",
        variant: "destructive",
      });
      scrollToFirstError();
      return;
    }

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
        updateData.grade_level = PARENT_GRADE_LEVEL;
        updateData.car_make = carMake;
        updateData.car_model = carModel;
        updateData.car_color = carColor;
        updateData.license_plate = licensePlate;
        updateData.car_seats = carSeats !== "" ? parseInt(carSeats) : null;
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

      await supabase
        .from("users")
        .update({
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          phone_number: phoneNumber.trim() || null,
        })
        .eq("user_id", user.id);

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
      const { data: targetData, error: lookupError } = await supabase.functions.invoke("lookup-parent", {
        body: { email: normalizedEmail },
      });

      if (lookupError || !targetData?.userId) {
        toast({ title: "User not found", description: "No account found with that email address.", variant: "destructive" });
        setLinkSending(false);
        return;
      }

      if (isParent) {
        const { error } = await supabase.from("account_links").insert({
          parent_id: user.id,
          student_id: targetData.userId,
          status: "pending",
        });
        if (error) throw error;
      } else {
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
    if (!isStep2Valid()) {
      setStep(2);
      setAttemptedSubmit(true);
      toast({
        title: "Please complete all required fields",
        description: "Fill every required field before finishing signup.",
        variant: "destructive",
      });
      scrollToFirstError();
      return;
    }

    if (!user) return;
    setSaving(true);

    try {
      const { error } = await supabase
        .from("profiles")
        .update({ profile_complete: true, updated_at: new Date().toISOString() })
        .eq("id", user.id);

      if (error) throw error;

      toast({ title: "Welcome!", description: "Your profile is complete. Enjoy the app!" });
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
  const step2Valid = isStep2Valid();

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
          {step === 2 && (
            <p className="text-xs text-muted-foreground mt-2">Required fields marked with <span className="text-destructive">*</span></p>
          )}
        </div>

        {/* Step 1: Welcome */}
        {step === 1 && (
          <Card>
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                {isParent ? <User className="h-8 w-8 text-primary" /> : <GraduationCap className="h-8 w-8 text-primary" />}
              </div>
              <CardTitle className="text-2xl">Welcome, {profile.username}!</CardTitle>
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
          <div className="space-y-6" ref={formRef}>
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
                    <RequiredLabel htmlFor="firstName">First Name</RequiredLabel>
                    <Input
                      id="firstName"
                      value={firstName}
                      onChange={e => setFirstName(e.target.value)}
                      onBlur={() => markTouched("firstName")}
                      placeholder="First name"
                      className={errorInputClass("firstName")}
                    />
                    <FieldErrorMessage error={getFieldError("firstName")} />
                  </div>
                  <div>
                    <RequiredLabel htmlFor="lastName">Last Name</RequiredLabel>
                    <Input
                      id="lastName"
                      value={lastName}
                      onChange={e => setLastName(e.target.value)}
                      onBlur={() => markTouched("lastName")}
                      placeholder="Last name"
                      className={errorInputClass("lastName")}
                    />
                    <FieldErrorMessage error={getFieldError("lastName")} />
                  </div>
                </div>
                <div>
                  <OptionalLabel icon={<Mail className="h-3.5 w-3.5" />}>Email</OptionalLabel>
                  <Input value={user.email || ""} disabled className="bg-muted" />
                </div>
                <div>
                  <RequiredLabel htmlFor="phone" icon={<Phone className="h-3.5 w-3.5" />}>Phone Number</RequiredLabel>
                  <Input
                    id="phone"
                    type="tel"
                    value={phoneNumber}
                    onChange={e => setPhoneNumber(e.target.value)}
                    onBlur={() => markTouched("phone")}
                    placeholder="(555) 123-4567"
                    className={errorInputClass("phone")}
                  />
                  <FieldErrorMessage error={getFieldError("phone")} />
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
                <div className={hasError("address") ? "[&_input]:border-destructive" : ""}>
                  <AddressAutocompleteInput
                    value={homeAddress}
                    onAddressSelect={handleAddressSelect}
                    placeholder="Enter your home address"
                    required
                  />
                </div>
                {hasSelectedAddress ? (
                  <p className="text-xs text-emerald-600 mt-2 flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3" /> Address verified
                  </p>
                ) : (
                  <FieldErrorMessage error={getFieldError("address")} />
                )}
              </CardContent>
            </Card>

            {/* Student-only: Grade Level & contacts */}
            {!isParent && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <GraduationCap className="h-5 w-5" /> Grade Level <span className="text-destructive">*</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Select value={gradeLevel} onValueChange={v => { setGradeLevel(v); markTouched("gradeLevel"); }}>
                      <SelectTrigger className={hasError("gradeLevel") ? "border-destructive" : ""}>
                        <SelectValue placeholder="Select grade" />
                      </SelectTrigger>
                      <SelectContent>
                        {GRADE_LEVELS.map(g => (
                          <SelectItem key={g} value={g}>{g}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FieldErrorMessage error={getFieldError("gradeLevel")} />
                  </div>
                  <div>
                    <RequiredLabel>Parent/Guardian Name</RequiredLabel>
                    <Input value={parentGuardianName} onChange={e => setParentGuardianName(e.target.value)} onBlur={() => markTouched("parentGuardianName")} placeholder="Parent name" className={errorInputClass("parentGuardianName")} />
                    <FieldErrorMessage error={getFieldError("parentGuardianName")} />
                  </div>
                  <div>
                    <RequiredLabel>Parent/Guardian Phone</RequiredLabel>
                    <Input type="tel" value={parentGuardianPhone} onChange={e => setParentGuardianPhone(e.target.value)} onBlur={() => markTouched("parentGuardianPhone")} placeholder="(555) 123-4567" className={errorInputClass("parentGuardianPhone")} />
                    <FieldErrorMessage error={getFieldError("parentGuardianPhone")} />
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

            {/* Parent-only: Vehicle Information */}
            {isParent && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Car className="h-5 w-5" /> Vehicle Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <RequiredLabel htmlFor="carMake">Car Make</RequiredLabel>
                      <Input
                        id="carMake"
                        value={carMake}
                        onChange={e => setCarMake(e.target.value)}
                        onBlur={() => markTouched("carMake")}
                        placeholder="e.g. Toyota"
                        className={errorInputClass("carMake")}
                      />
                      <FieldErrorMessage error={getFieldError("carMake")} />
                    </div>
                    <div>
                      <RequiredLabel htmlFor="carModel">Car Model</RequiredLabel>
                      <Input
                        id="carModel"
                        value={carModel}
                        onChange={e => setCarModel(e.target.value)}
                        onBlur={() => markTouched("carModel")}
                        placeholder="e.g. Camry"
                        className={errorInputClass("carModel")}
                      />
                      <FieldErrorMessage error={getFieldError("carModel")} />
                    </div>
                    <div>
                      <RequiredLabel htmlFor="carColor">Car Color</RequiredLabel>
                      <Input id="carColor" value={carColor} onChange={e => setCarColor(e.target.value)} onBlur={() => markTouched("carColor")} placeholder="e.g. Silver" className={errorInputClass("carColor")} />
                      <FieldErrorMessage error={getFieldError("carColor")} />
                    </div>
                    <div>
                      <RequiredLabel htmlFor="licensePlate">License Plate</RequiredLabel>
                      <Input id="licensePlate" value={licensePlate} onChange={e => setLicensePlate(e.target.value)} onBlur={() => markTouched("licensePlate")} placeholder="e.g. ABC1234" className={errorInputClass("licensePlate")} />
                      <FieldErrorMessage error={getFieldError("licensePlate")} />
                    </div>
                  </div>
                  <div>
                    <RequiredLabel htmlFor="carSeats">Available Seats</RequiredLabel>
                    <Input
                      id="carSeats"
                      type="number"
                      min="0"
                      max="8"
                      value={carSeats}
                      onChange={e => setCarSeats(e.target.value)}
                      onBlur={() => markTouched("carSeats")}
                      placeholder="Number of available seats (0 if none)"
                      className={errorInputClass("carSeats")}
                    />
                    <FieldErrorMessage error={getFieldError("carSeats")} />
                    <p className="text-xs text-muted-foreground mt-1">Enter 0 if you don't plan to offer rides</p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Parent-only: Children */}
            {isParent && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" /> Your Children <span className="text-destructive">*</span>
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
                  <FieldErrorMessage error={getFieldError("children")} />
                  <Button type="button" variant="outline" onClick={() => setChildren([...children, { first_name: "", last_name: "", age: "", grade_level: "" }])} className="gap-2">
                    <Plus className="h-4 w-4" /> Add Child
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Navigation */}
            <div className="flex gap-4">
              <Button variant="outline" onClick={() => setStep(1)} className="gap-2">
                <ArrowLeft className="h-4 w-4" /> Back
              </Button>
              <Button
                className="flex-1 gap-2"
                disabled={saving || !step2Valid}
                onClick={handleAttemptContinue}
              >
                {saving ? "Saving..." : step2Valid ? "Save & Continue" : "Complete required fields"} <ArrowRight className="h-4 w-4" />
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
                <p className="text-sm text-muted-foreground text-center">
                  You can skip this step and link accounts later in your Profile settings.
                </p>
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
                      <Label>{isParent ? "Child's Email" : "Parent's Email"}</Label>
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
