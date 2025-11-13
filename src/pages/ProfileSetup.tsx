import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2 } from "lucide-react";
import Navigation from "@/components/Navigation";

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

  const [homeAddress, setHomeAddress] = useState("");
  const [carMake, setCarMake] = useState("");
  const [carModel, setCarModel] = useState("");
  const [carSeats, setCarSeats] = useState("");
  const [children, setChildren] = useState<Child[]>([{ name: "", age: "", school: "" }]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      navigate("/login");
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (profile) {
      setHomeAddress(profile.home_address || "");
      setCarMake(profile.car_make || "");
      setCarModel(profile.car_model || "");
      setCarSeats(profile.car_seats?.toString() || "");
      fetchChildren();
    }
  }, [profile]);

  const fetchChildren = async () => {
    if (!user) return;

    const { data, error } = await (supabase as any)
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setSaving(true);

    try {
      // Update profile
      const { error: profileError } = await (supabase as any)
        .from("profiles")
        .update({
          home_address: homeAddress,
          car_make: carMake,
          car_model: carModel,
          car_seats: carSeats ? parseInt(carSeats) : null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", user.id);

      if (profileError) throw profileError;

      // Delete existing children and insert new ones
      const { error: deleteError } = await (supabase as any)
        .from("children")
        .delete()
        .eq("user_id", user.id);

      if (deleteError) throw deleteError;

      // Insert children
      const validChildren = children.filter(child => 
        child.name && child.age && child.school
      );

      if (validChildren.length > 0) {
        const { error: childrenError } = await (supabase as any)
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
        <h1 className="text-3xl font-bold mb-8">Profile Setup</h1>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Info */}
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="homeAddress">Home Address</Label>
                <Input
                  id="homeAddress"
                  value={homeAddress}
                  onChange={(e) => setHomeAddress(e.target.value)}
                  placeholder="Enter your home address"
                  required
                />
              </div>
            </CardContent>
          </Card>

          {/* Car Info */}
          <Card>
            <CardHeader>
              <CardTitle>Car Information</CardTitle>
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
              <div>
                <Label htmlFor="carSeats">Available Seats</Label>
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
                Children
                <Button type="button" onClick={addChild} size="sm">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Child
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {children.map((child, index) => (
                <div key={index} className="flex gap-4 items-end">
                  <div className="flex-1">
                    <Label>Name</Label>
                    <Input
                      value={child.name}
                      onChange={(e) => updateChild(index, "name", e.target.value)}
                      placeholder="Child's name"
                    />
                  </div>
                  <div className="w-24">
                    <Label>Age</Label>
                    <Input
                      type="number"
                      min="1"
                      max="18"
                      value={child.age}
                      onChange={(e) => updateChild(index, "age", e.target.value)}
                      placeholder="Age"
                    />
                  </div>
                  <div className="flex-1">
                    <Label>School</Label>
                    <Input
                      value={child.school}
                      onChange={(e) => updateChild(index, "school", e.target.value)}
                      placeholder="School name"
                    />
                  </div>
                  {children.length > 1 && (
                    <Button
                      type="button"
                      variant="destructive"
                      size="icon"
                      onClick={() => removeChild(index)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>

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
