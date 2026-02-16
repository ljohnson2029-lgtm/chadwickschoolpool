import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Car, Users } from "lucide-react";
import { GRADE_LEVELS } from "@/constants/gradeLevels";
import AddressAutocompleteInput from "@/components/AddressAutocompleteInput";

interface Child {
  id?: string;
  first_name: string;
  last_name: string;
  age: string;
  grade_level: string;
}

interface ParentProfileFormProps {
  homeAddress: string;
  onAddressSelect: (address: string, lat: number, lng: number) => void;
  carMake: string;
  setCarMake: (value: string) => void;
  carModel: string;
  setCarModel: (value: string) => void;
  carColor: string;
  setCarColor: (value: string) => void;
  licensePlate: string;
  setLicensePlate: (value: string) => void;
  carSeats: string;
  setCarSeats: (value: string) => void;
  children: Child[];
  onAddChild: () => void;
  onRemoveChild: (index: number) => void;
  onUpdateChild: (index: number, field: keyof Child, value: string) => void;
}

const ParentProfileForm = ({
  homeAddress,
  onAddressSelect,
  carMake,
  setCarMake,
  carModel,
  setCarModel,
  carColor,
  setCarColor,
  licensePlate,
  setLicensePlate,
  carSeats,
  setCarSeats,
  children,
  onAddChild,
  onRemoveChild,
  onUpdateChild,
}: ParentProfileFormProps) => {
  return (
    <>
      {/* Vehicle Information */}
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
              <Label htmlFor="carMake">Car Make</Label>
              <Input
                id="carMake"
                value={carMake}
                onChange={(e) => setCarMake(e.target.value)}
                placeholder="e.g., Toyota"
              />
            </div>
            <div>
              <Label htmlFor="carModel">Car Model</Label>
              <Input
                id="carModel"
                value={carModel}
                onChange={(e) => setCarModel(e.target.value)}
                placeholder="e.g., Camry"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="carColor">Car Color</Label>
              <Input
                id="carColor"
                value={carColor}
                onChange={(e) => setCarColor(e.target.value)}
                placeholder="e.g., Silver"
              />
            </div>
            <div>
              <Label htmlFor="licensePlate">License Plate</Label>
              <Input
                id="licensePlate"
                value={licensePlate}
                onChange={(e) => setLicensePlate(e.target.value)}
                placeholder="e.g., ABC1234"
              />
            </div>
          </div>
          <div>
            <Label htmlFor="carSeats">Available Seats for Carpooling</Label>
            <Input
              id="carSeats"
              type="number"
              min="1"
              max="8"
              value={carSeats}
              onChange={(e) => setCarSeats(e.target.value)}
              placeholder="Number of seats available"
            />
          </div>
        </CardContent>
      </Card>

      {/* Children */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Your Children
            </span>
            <Button type="button" onClick={onAddChild} size="sm">
              <Plus className="w-4 h-4 mr-2" />
              Add Child
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {children.map((child, index) => (
            <div key={index} className="p-4 border rounded-lg space-y-4">
              <div className="flex items-center justify-between">
                <span className="font-medium text-sm">Child {index + 1}</span>
                {children.length > 1 && (
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    onClick={() => onRemoveChild(index)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>First Name</Label>
                  <Input
                    value={child.first_name}
                    onChange={(e) => onUpdateChild(index, "first_name", e.target.value)}
                    placeholder="First name"
                  />
                </div>
                <div>
                  <Label>Last Name</Label>
                  <Input
                    value={child.last_name}
                    onChange={(e) => onUpdateChild(index, "last_name", e.target.value)}
                    placeholder="Last name"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Grade Level</Label>
                  <Select
                    value={child.grade_level}
                    onValueChange={(value) => onUpdateChild(index, "grade_level", value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select grade" />
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
                  <Label>Age</Label>
                  <Input
                    type="number"
                    min="1"
                    max="18"
                    value={child.age}
                    onChange={(e) => onUpdateChild(index, "age", e.target.value)}
                    placeholder="Age"
                  />
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Home Address */}
      <Card>
        <CardHeader>
          <CardTitle>Home Address</CardTitle>
        </CardHeader>
        <CardContent>
          <div>
            <Label htmlFor="homeAddress">
              Home Address <span className="text-destructive">*</span>
            </Label>
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

export default ParentProfileForm;
