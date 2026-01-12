import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { X, Mail, Phone, MapPin, Users, Hand, Car, ShieldCheck } from "lucide-react";
import { isStudent as checkIsStudent } from "@/lib/permissions";

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
  home_address: string | null;
  phone_number: string | null;
  share_phone: boolean;
  share_email: boolean;
  email: string | null;
  created_at: string;
}

const ParentProfilePopup = ({
  parentId,
  distance,
  onClose,
  onRequestRide,
  onOfferRide,
}: ParentProfilePopupProps) => {
  const { user } = useAuth();
  const [profile, setProfile] = useState<ParentProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [linkedStudentsCount, setLinkedStudentsCount] = useState(0);
  const [viewerIsStudent, setViewerIsStudent] = useState(false);

  useEffect(() => {
    const fetchViewerRole = async () => {
      if (!user) return;
      const { data } = await supabase
        .from('users')
        .select('email')
        .eq('user_id', user.id)
        .single();

      if (data?.email) {
        setViewerIsStudent(checkIsStudent(data.email));
      }
    };

    fetchViewerRole();
  }, [user]);

  useEffect(() => {
    fetchParentProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [parentId]);

  const fetchParentProfile = async () => {
    setLoading(true);
    setError(false);

    try {
      // Backend function fetch (bypasses RLS) — UI enforces privacy
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
        home_address: data.profile.home_address,
        phone_number: data.profile.phone_number,
        share_phone: data.profile.share_phone ?? false,
        share_email: data.profile.share_email ?? false,
        email: data.profile.email ?? null,
        created_at: data.profile.created_at,
      });

      setLinkedStudentsCount(data.profile.linked_students_count || 0);
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

  const getFirstName = () => {
    if (!profile) return '';
    return profile.first_name || profile.username;
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
          <div className="flex items-start gap-3 pr-6">
            <Skeleton className="h-12 w-12 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-3 w-36" />
            </div>
          </div>
        </CardHeader>
        <CardContent className="px-4 pb-4 pt-0">
          <div className="space-y-2">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
          </div>
        </CardContent>
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

  const showEmail = !viewerIsStudent && profile.share_email && !!profile.email;
  const showPhone = !viewerIsStudent && profile.share_phone && !!profile.phone_number;

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
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <MapPin className="h-3 w-3 flex-shrink-0" />
            <span className="font-medium text-primary">{distance.toFixed(1)} mi</span>
            <span>from route</span>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-3 px-4 pb-4 pt-0">
        {/* Contact Info (parent-only) */}
        <div className="space-y-1.5 py-2 border-t border-b text-xs">
          {viewerIsStudent && (
            <div className="flex items-start gap-2 text-muted-foreground">
              <ShieldCheck className="h-3.5 w-3.5 mt-0.5" />
              <span>Contact info is hidden for student accounts. Ask your parent to connect.</span>
            </div>
          )}

          {showEmail ? (
            <a
              href={`mailto:${profile.email}?subject=SchoolPool Carpool`}
              className="flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors"
            >
              <Mail className="h-3.5 w-3.5" />
              <span className="truncate">{profile.email}</span>
            </a>
          ) : (
            !viewerIsStudent && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Mail className="h-3.5 w-3.5" />
                <span>Email not shared</span>
              </div>
            )
          )}

          {showPhone ? (
            <a
              href={`tel:${profile.phone_number}`}
              className="flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors"
            >
              <Phone className="h-3.5 w-3.5" />
              <span>{profile.phone_number}</span>
            </a>
          ) : (
            !viewerIsStudent && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Phone className="h-3.5 w-3.5" />
                <span>Phone not shared</span>
              </div>
            )
          )}

          <div className="flex items-center gap-2 text-muted-foreground">
            <Users className="h-3.5 w-3.5" />
            <span>
              {linkedStudentsCount === 0
                ? 'No students linked'
                : `${linkedStudentsCount} student${linkedStudentsCount !== 1 ? 's' : ''}`}
            </span>
          </div>
        </div>

        {/* Actions (parent-only) */}
        {!viewerIsStudent ? (
          <div className="space-y-2">
            <Button
              className="w-full gap-2 h-9 text-sm"
              onClick={() => onRequestRide(parentId, getFirstName())}
            >
              <Hand className="h-3.5 w-3.5" />
              Request Ride
            </Button>

            <Button
              variant="outline"
              className="w-full gap-2 h-9 text-sm"
              onClick={() => onOfferRide(parentId, getFirstName())}
            >
              <Car className="h-3.5 w-3.5" />
              Offer Ride
            </Button>
          </div>
        ) : (
          <div className="text-xs text-muted-foreground">
            Ride requests/offers must be managed by a parent account.
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ParentProfilePopup;
