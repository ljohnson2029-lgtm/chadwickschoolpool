import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { GraduationCap } from "lucide-react";

export interface ChildForRide {
  id: string;
  first_name: string;
  last_name: string;
  grade_level: string | null;
}

interface ChildrenRidingSelectorProps {
  selectedChildIds: string[];
  onSelectionChange: (ids: string[]) => void;
  error?: string | null;
}

const ChildrenRidingSelector = ({ selectedChildIds, onSelectionChange, error }: ChildrenRidingSelectorProps) => {
  const { user } = useAuth();
  const [children, setChildren] = useState<ChildForRide[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchChildren = async () => {
      if (!user) return;
      const { data } = await supabase
        .from("children")
        .select("id, first_name, last_name, grade_level")
        .eq("user_id", user.id);
      
      if (data && data.length > 0) {
        setChildren(data);
        // Pre-select all children if nothing selected yet
        if (selectedChildIds.length === 0) {
          onSelectionChange(data.map(c => c.id));
        }
      }
      setLoading(false);
    };
    fetchChildren();
  }, [user]);

  if (loading) return null;
  if (children.length === 0) return null;

  const toggleChild = (childId: string) => {
    if (selectedChildIds.includes(childId)) {
      onSelectionChange(selectedChildIds.filter(id => id !== childId));
    } else {
      onSelectionChange([...selectedChildIds, childId]);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <GraduationCap className="h-4 w-4 text-muted-foreground" />
        <Label className="text-sm sm:text-base font-medium">Children Riding on This Trip</Label>
      </div>
      <div className="space-y-2 pl-1">
        {children.map((child) => (
          <div key={child.id} className="flex items-center space-x-3 min-h-[44px]">
            <Checkbox
              id={`child-${child.id}`}
              checked={selectedChildIds.includes(child.id)}
              onCheckedChange={() => toggleChild(child.id)}
            />
            <Label htmlFor={`child-${child.id}`} className="cursor-pointer text-sm sm:text-base">
              {child.first_name} {child.last_name}
              {child.grade_level && (
                <span className="text-muted-foreground ml-1">({child.grade_level})</span>
              )}
            </Label>
          </div>
        ))}
      </div>
      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}
    </div>
  );
};

export default ChildrenRidingSelector;
export { ChildrenRidingSelector };
