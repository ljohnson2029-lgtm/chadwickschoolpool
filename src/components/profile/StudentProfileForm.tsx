import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { GraduationCap } from "lucide-react";
import { GRADE_LEVELS } from "@/constants/gradeLevels";
import AddressAutocompleteInput from "@/components/AddressAutocompleteInput";

interface StudentProfileFormProps {
  gradeLevel: string;
  setGradeLevel: (value: string) => void;
  homeAddress: string;
  onAddressSelect: (address: string, lat: number, lng: number) => void;
}

const StudentProfileForm = ({
  gradeLevel,
  setGradeLevel,
  homeAddress,
  onAddressSelect,
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
    </>
  );
};

export default StudentProfileForm;
