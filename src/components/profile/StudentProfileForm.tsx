import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { GraduationCap } from "lucide-react";
import { GRADE_LEVELS } from "@/constants/gradeLevels";

interface StudentProfileFormProps {
  gradeLevel: string;
  setGradeLevel: (value: string) => void;
}

const StudentProfileForm = ({
  gradeLevel,
  setGradeLevel,
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

        </CardContent>
      </Card>
    </>
  );
};

export default StudentProfileForm;
