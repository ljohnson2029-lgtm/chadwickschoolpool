import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { X, Mail, Phone, Users, GraduationCap } from "lucide-react";

interface ParentProfilePopupProps {
  parentId: string;
  distance: number;
  onClose: () => void;
  onRequestRide: (parentId: string, parentName: string) => void;
  onOfferRide: (parentId: string, parentName: string) => void;
}

interface ParentProfile {
  id: string;
  username: string;
  first_name: string | null;
  last_name: string | null;
  phone_number: string | null;
  share_phone: boolean;
  share_email: boolean;
  email: string | null;
}

interface LinkedStudent {
  first_name: string;
  last_name: string;
  grade_level: string | null;
}

const ParentProfilePopup = ({
  parentId,
  onClose,
}: ParentProfilePopupProps) => {
  const { user } = useAuth();
  const [profile, setProfile] = useState<ParentProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [linkedStudents, setLinkedStudents] = useState<LinkedStudent[]>([]);

  useEffect(() => {
    fetchParentProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [parentId]);

  const fetchParentProfile = async () => {
    setLoading(true);
    setError(false);

    try {
      const { data, error: fetchError } = await supabase.functions.invoke('get-parent-profile', {
        body: { parentId },
      });

      if (fetchError) throw fetchError;
      if (!data?.profile) throw new Error('Profile not found');

      setProfile({
        id: data.profile.id,
        username: data.profile.username,
        first_name: data.profile.first_name,
        last_name: data.profile.last_name,
        phone_number: data.profile.phone_number,
        share_phone: data.profile.share_phone ?? false,
        share_email: data.profile.share_email ?? false,
        email: data.profile.email ?? null,
      });

      setLinkedStudents(data.profile.linked_students || []);
    } catch (err) {
      console.error('Error fetching parent profile:', err);
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  const getDisplayName = () => {
    if (!profile) return '';
    if (profile.first_name && profile.last_name) {
      return `${profile.first_name} ${profile.last_name}`;
    }
    return profile.username;
  };

  if (loading) {
    return (
      <Card className="w-full bg-background/95 backdrop-blur-sm shadow-xl animate-fade-in">
        <CardHeader className="relative pb-3 pt-4 px-4">
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-2 right-2 h-7 w-7"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </Button>
          <div className="space-y-2 pr-6">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-3 w-36" />
            <Skeleton className="h-3 w-36" />
          </div>
        </CardHeader>
      </Card>
    );
  }

  if (error || !profile) {
    return (
      <Card className="w-full bg-background/95 backdrop-blur-sm shadow-xl animate-fade-in">
        <CardHeader className="relative pt-4 px-4 pb-4">
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-2 right-2 h-7 w-7"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </Button>
          <div className="text-center py-2">
            <p className="text-destructive text-sm mb-3">Unable to load profile</p>
            <Button onClick={fetchParentProfile} variant="outline" size="sm">
              Retry
            </Button>
          </div>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className="w-full bg-background/95 backdrop-blur-sm shadow-xl animate-scale-in">
      <CardHeader className="relative pb-2 pt-4 px-4">
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-2 right-2 h-7 w-7 z-10"
          onClick={onClose}
          aria-label="Close profile"
        >
          <X className="h-4 w-4" />
        </Button>

        <div className="pr-6">
          <h3 className="text-base font-bold truncate">{getDisplayName()}</h3>
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <Users className="h-3 w-3" />
            Parent/Adult
          </p>
        </div>
      </CardHeader>

      <CardContent className="space-y-3 px-4 pb-4 pt-0">
        <div className="space-y-2 py-2 border-t text-sm">
          {/* Email */}
          <div className="flex items-center gap-2">
            <Mail className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            {profile.share_email && profile.email ? (
              <a
                href={`mailto:${profile.email}?subject=SchoolPool Carpool`}
                className="text-muted-foreground hover:text-primary transition-colors truncate"
              >
                {profile.email}
              </a>
            ) : (
              <span className="text-muted-foreground">Email not shared</span>
            )}
          </div>

          {/* Phone */}
          <div className="flex items-center gap-2">
            <Phone className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            {profile.share_phone && profile.phone_number ? (
              <a
                href={`tel:${profile.phone_number}`}
                className="text-muted-foreground hover:text-primary transition-colors"
              >
                {profile.phone_number}
              </a>
            ) : (
              <span className="text-muted-foreground">Phone not shared</span>
            )}
          </div>
        </div>

        {/* Linked Students */}
        <div className="border-t pt-2">
          <p className="text-xs font-medium text-muted-foreground mb-1.5">
            {linkedStudents.length === 1 ? 'Linked Student' : 'Linked Students'}
          </p>
          {linkedStudents.length > 0 ? (
            <div className="space-y-1">
              {linkedStudents.map((student, idx) => (
                <div key={idx} className="text-sm flex items-center gap-1.5">
                  <GraduationCap className="h-3.5 w-3.5 text-muted-foreground" />
                  <span>{student.first_name} {student.last_name}</span>
                  {student.grade_level && (
                    <span className="text-muted-foreground">• {student.grade_level}</span>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No students linked</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default ParentProfilePopup;
