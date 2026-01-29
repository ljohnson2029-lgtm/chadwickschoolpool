import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { GraduationCap, Phone, AlertTriangle } from "lucide-react";
import { GRADE_LEVELS } from "@/constants/gradeLevels";
import AddressAutocompleteInput from "@/components/AddressAutocompleteInput";

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
}

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
}: StudentProfileFormProps) => {
  return (
    <>
      {/* Grade Level */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <GraduationCap className="h-5 w-5" />
            Academic Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="gradeLevel">
              Grade Level <span className="text-destructive">*</span>
            </Label>
            <Select value={gradeLevel} onValueChange={setGradeLevel}>
              <SelectTrigger className="mt-2">
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
            <Label htmlFor="homeAddress">Home Address</Label>
            <AddressAutocompleteInput
              value={homeAddress}
              onAddressSelect={onAddressSelect}
              placeholder="Start typing your address..."
              required
            />
            <p className="text-xs text-muted-foreground mt-1">
              Select from suggestions to enable map features
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Parent/Guardian Contact */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Phone className="h-5 w-5" />
            Parent/Guardian Contact
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="parentGuardianName">Parent/Guardian Name</Label>
            <Input
              id="parentGuardianName"
              value={parentGuardianName}
              onChange={(e) => setParentGuardianName(e.target.value)}
              placeholder="Full name"
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="parentGuardianPhone">Phone Number</Label>
              <Input
                id="parentGuardianPhone"
                type="tel"
                value={parentGuardianPhone}
                onChange={(e) => setParentGuardianPhone(e.target.value)}
                placeholder="(555) 123-4567"
              />
            </div>
            <div>
              <Label htmlFor="parentGuardianEmail">Email</Label>
              <Input
                id="parentGuardianEmail"
                type="email"
                value={parentGuardianEmail}
                onChange={(e) => setParentGuardianEmail(e.target.value)}
                placeholder="parent@email.com"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Emergency Contact */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Emergency Contact
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Please provide an emergency contact (can be different from parent/guardian)
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="emergencyContactName">Contact Name</Label>
              <Input
                id="emergencyContactName"
                value={emergencyContactName}
                onChange={(e) => setEmergencyContactName(e.target.value)}
                placeholder="Full name"
              />
            </div>
            <div>
              <Label htmlFor="emergencyContactPhone">Contact Phone</Label>
              <Input
                id="emergencyContactPhone"
                type="tel"
                value={emergencyContactPhone}
                onChange={(e) => setEmergencyContactPhone(e.target.value)}
                placeholder="(555) 123-4567"
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </>
  );
};

export default StudentProfileForm;
