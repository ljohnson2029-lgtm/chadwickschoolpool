import { useCallback, useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { GraduationCap, Phone, AlertTriangle, Home, CheckCircle2, Route } from "lucide-react";
import { GRADE_LEVELS } from "@/constants/gradeLevels";
import AddressAutocompleteInput from "@/components/AddressAutocompleteInput";

/* ─── Types ─────────────────────────────────────────────────────── */

interface StudentProfileFormProps {
  gradeLevel: string;
  setGradeLevel: (value: string) => void;
  homeAddress: string;
  onAddressSelect: (address: string, lat: number, lng: number) => void;
  parentGuardianName: string;
  setParentGuardianName: (value: string) => void;
  parentGuardianPhone: string;
  setParentGuardianPhone: (value: string) => void;
  parentGuardianEmail: string;
  setParentGuardianEmail: (value: string) => void;
  emergencyContactName: string;
  setEmergencyContactName: (value: string) => void;
  emergencyContactPhone: string;
  setEmergencyContactPhone: (value: string) => void;
  pickupNotes?: string;
  setPickupNotes?: (value: string) => void;
  commutePreference?: string;
  setCommutePreference?: (value: string) => void;
}

/* ─── Phone Formatter ───────────────────────────────────────────── */

const formatPhone = (raw: string): string => {
  const digits = raw.replace(/\D/g, "").slice(0, 10);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
};

/* ─── Profile Completeness ──────────────────────────────────────── */

interface CompletenessProps {
  gradeLevel: string;
  homeAddress: string;
  parentGuardianName: string;
  parentGuardianPhone: string;
  parentGuardianEmail: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
}

const CompletenessBar = (props: CompletenessProps) => {
  const percent = useMemo(() => {
    const checks = [
      props.gradeLevel.length > 0,
      props.homeAddress.length > 0,
      props.parentGuardianName.length > 0,
      props.parentGuardianPhone.length > 0,
      props.parentGuardianEmail.length > 0,
      props.emergencyContactName.length > 0,
      props.emergencyContactPhone.length > 0,
    ];
    return Math.round((checks.filter(Boolean).length / checks.length) * 100);
  }, [props]);

  const color = percent < 40 ? "bg-red-500" : percent < 75 ? "bg-amber-500" : "bg-emerald-500";

  const label =
    percent === 100
      ? "Profile complete!"
      : percent >= 75
        ? "Almost there…"
        : "Complete your profile to find carpool matches";

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium flex items-center gap-1">
          {percent === 100 && <CheckCircle2 className="h-4 w-4 text-emerald-500" />}
          {percent}%
        </span>
      </div>
      <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${color}`}
          style={{ width: `${percent}%` }}
          role="progressbar"
          aria-valuenow={percent}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Profile completeness"
        />
      </div>
    </div>
  );
};

/* ─── Contact Fields (shared layout) ────────────────────────────── */

interface ContactFieldsProps {
  prefix: string;
  name: string;
  onNameChange: (value: string) => void;
  phone: string;
  onPhoneChange: (value: string) => void;
  email?: string;
  onEmailChange?: (value: string) => void;
  nameLabel?: string;
  phonePlaceholder?: string;
  disabled?: boolean;
}

const ContactFields = ({
  prefix,
  name,
  onNameChange,
  phone,
  onPhoneChange,
  email,
  onEmailChange,
  nameLabel = "Full Name",
  phonePlaceholder = "(555) 123-4567",
  disabled = false,
}: ContactFieldsProps) => (
  <div className="space-y-4">
    <div>
      <Label htmlFor={`${prefix}-name`}>{nameLabel}</Label>
      <Input
        id={`${prefix}-name`}
        value={name}
        onChange={(e) => onNameChange(e.target.value)}
        placeholder="Full name"
        autoComplete="name"
        disabled={disabled}
      />
    </div>
    <div className={`grid grid-cols-1 ${onEmailChange ? "md:grid-cols-2" : ""} gap-4`}>
      <div>
        <Label htmlFor={`${prefix}-phone`}>Phone Number</Label>
        <Input
          id={`${prefix}-phone`}
          type="tel"
          inputMode="tel"
          value={phone}
          onChange={(e) => onPhoneChange(formatPhone(e.target.value))}
          placeholder={phonePlaceholder}
          autoComplete="tel"
          disabled={disabled}
        />
      </div>
      {onEmailChange && (
        <div>
          <Label htmlFor={`${prefix}-email`}>Email</Label>
          <Input
            id={`${prefix}-email`}
            type="email"
            inputMode="email"
            value={email ?? ""}
            onChange={(e) => onEmailChange(e.target.value)}
            placeholder="parent@email.com"
            autoComplete="email"
            disabled={disabled}
          />
        </div>
      )}
    </div>
  </div>
);

/* ─── Commute Options ───────────────────────────────────────────── */

const COMMUTE_OPTIONS = [
  { value: "morning", label: "Morning only" },
  { value: "afternoon", label: "Afternoon only" },
  { value: "both", label: "Both morning & afternoon" },
];

/* ─── Main Form ─────────────────────────────────────────────────── */

const StudentProfileForm = ({
  gradeLevel,
  setGradeLevel,
  homeAddress,
  onAddressSelect,
  parentGuardianName,
  setParentGuardianName,
  parentGuardianPhone,
  setParentGuardianPhone,
  parentGuardianEmail,
  setParentGuardianEmail,
  emergencyContactName,
  setEmergencyContactName,
  emergencyContactPhone,
  setEmergencyContactPhone,
  pickupNotes,
  setPickupNotes,
  commutePreference,
  setCommutePreference,
}: StudentProfileFormProps) => {
  const [sameAsParent, setSameAsParent] = useState(false);

  const handleSameAsParent = useCallback(
    (checked: boolean) => {
      setSameAsParent(checked);
      if (checked) {
        setEmergencyContactName(parentGuardianName);
        setEmergencyContactPhone(parentGuardianPhone);
      } else {
        setEmergencyContactName("");
        setEmergencyContactPhone("");
      }
    },
    [parentGuardianName, parentGuardianPhone, setEmergencyContactName, setEmergencyContactPhone],
  );

  return (
    <>
      {/* ── Completeness ──────────────────────────────────────── */}
      <CompletenessBar
        gradeLevel={gradeLevel}
        homeAddress={homeAddress}
        parentGuardianName={parentGuardianName}
        parentGuardianPhone={parentGuardianPhone}
        parentGuardianEmail={parentGuardianEmail}
        emergencyContactName={emergencyContactName}
        emergencyContactPhone={emergencyContactPhone}
      />

      {/* ── School Information ────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <GraduationCap className="h-5 w-5" />
            School Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="gradeLevel">
              Grade Level <span className="text-destructive">*</span>
            </Label>
            <Select value={gradeLevel} onValueChange={setGradeLevel}>
              <SelectTrigger id="gradeLevel" className="mt-2">
                <SelectValue placeholder="Select your grade level" />
              </SelectTrigger>
              <SelectContent>
                {GRADE_LEVELS.map((grade) => (
                  <SelectItem key={grade} value={grade}>
                    {grade}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="homeAddress">
              <span className="flex items-center gap-1.5">
                <Home className="h-3.5 w-3.5" />
                Home Address <span className="text-destructive">*</span>
              </span>
            </Label>
            <AddressAutocompleteInput
              value={homeAddress}
              onAddressSelect={onAddressSelect}
              placeholder="Start typing your address…"
              required
            />
            <p className="text-xs text-muted-foreground mt-1">Used to match you with nearby carpool families</p>
          </div>
        </CardContent>
      </Card>

      {/* ── Parent/Guardian Contact ────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Phone className="h-5 w-5" />
            Parent/Guardian Contact
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ContactFields
            prefix="parent"
            name={parentGuardianName}
            onNameChange={setParentGuardianName}
            phone={parentGuardianPhone}
            onPhoneChange={setParentGuardianPhone}
            email={parentGuardianEmail}
            onEmailChange={setParentGuardianEmail}
            nameLabel="Parent/Guardian Name"
          />
          <p className="text-xs text-muted-foreground mt-2">
            Ask your parent or guardian if you're unsure of their contact info
          </p>
        </CardContent>
      </Card>

      {/* ── Emergency Contact ─────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Emergency Contact
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="sameAsParent"
              checked={sameAsParent}
              onCheckedChange={(checked) => handleSameAsParent(checked === true)}
              aria-label="Use parent/guardian as emergency contact"
            />
            <Label htmlFor="sameAsParent" className="text-sm font-normal cursor-pointer">
              Same as parent/guardian
            </Label>
          </div>

          <ContactFields
            prefix="emergency"
            name={emergencyContactName}
            onNameChange={setEmergencyContactName}
            phone={emergencyContactPhone}
            onPhoneChange={setEmergencyContactPhone}
            nameLabel="Contact Name"
            disabled={sameAsParent}
          />

          {!sameAsParent && (
            <p className="text-xs text-muted-foreground">
              Provide someone who can be reached if your parent/guardian is unavailable
            </p>
          )}
        </CardContent>
      </Card>

      {/* ── Carpool Preferences (optional) ────────────────────── */}
      {(setPickupNotes || setCommutePreference) && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Route className="h-5 w-5" />
              Carpool Preferences
              <span className="text-xs font-normal text-muted-foreground ml-1">(optional)</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {setCommutePreference && (
              <div>
                <Label htmlFor="commutePreference">When do you need a ride?</Label>
                <Select value={commutePreference ?? ""} onValueChange={setCommutePreference}>
                  <SelectTrigger id="commutePreference" className="mt-2">
                    <SelectValue placeholder="Select your typical schedule" />
                  </SelectTrigger>
                  <SelectContent>
                    {COMMUTE_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {setPickupNotes && (
              <div>
                <Label htmlFor="pickupNotes">Pickup / Drop-off Notes</Label>
                <Textarea
                  id="pickupNotes"
                  value={pickupNotes ?? ""}
                  onChange={(e) => setPickupNotes(e.target.value)}
                  placeholder="e.g., I wait by the gym entrance, I have practice until 5pm on Tuesdays…"
                  rows={3}
                  className="resize-none mt-2"
                />
                <p className="text-xs text-muted-foreground mt-1">Helps drivers know where and when to find you</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </>
  );
};

export default StudentProfileForm;
