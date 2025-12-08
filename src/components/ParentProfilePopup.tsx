import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { X, Mail, Phone, MapPin, Users, Hand, Car } from "lucide-react";

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
  created_at: string;
}

const ParentProfilePopup = ({
  parentId,
  distance,
  onClose,
  onRequestRide,
  onOfferRide,
}: ParentProfilePopupProps) => {
  const [profile, setProfile] = useState<ParentProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [linkedStudentsCount, setLinkedStudentsCount] = useState(0);

  useEffect(() => {
    fetchParentProfile();
  }, [parentId]);

  const fetchParentProfile = async () => {
    setLoading(true);
    setError(false);

    try {
      // Use edge function to fetch profile (bypasses RLS)
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
        created_at: data.profile.created_at,
        email: data.profile.email,
      } as any);

      setLinkedStudentsCount(data.profile.linked_students_count || 0);
    } catch (err) {
      console.error('Error fetching parent profile:', err);
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  const getInitials = (firstName: string | null, lastName: string | null, username: string) => {
    if (firstName && lastName) {
      return `${firstName[0]}${lastName[0]}`.toUpperCase();
    }
    return username.substring(0, 2).toUpperCase();
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

  const formatAddress = (address: string | null) => {
    if (!address) return 'Address not shared';
    // Show only first line (street and number)
    const parts = address.split(',');
    return parts.slice(0, 2).join(',');
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

  return (
    <Card className="w-full bg-background/95 backdrop-blur-sm shadow-xl animate-scale-in">
      <CardHeader className="relative pb-2 pt-4 px-4">
        {/* Close Button */}
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-2 right-2 h-7 w-7 z-10"
          onClick={onClose}
          aria-label="Close profile"
        >
          <X className="h-4 w-4" />
        </Button>

        {/* Profile Header - Compact */}
        <div className="flex items-center gap-3 pr-6">
          <Avatar className="h-11 w-11 border-2 border-white shadow-md flex-shrink-0">
            <AvatarFallback className="bg-gradient-to-br from-blue-500 to-blue-600 text-white text-sm">
              {getInitials(profile.first_name, profile.last_name, profile.username)}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1 min-w-0">
            <h3 className="text-base font-bold truncate">{getDisplayName()}</h3>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <MapPin className="h-3 w-3 flex-shrink-0" />
              <span className="font-medium text-primary">{distance.toFixed(1)} mi</span>
              <span>from route</span>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-3 px-4 pb-4 pt-0">
        {/* Contact Info - Compact */}
        <div className="space-y-1.5 py-2 border-t border-b text-xs">
          {(profile as any).email && (
            <a
              href={`mailto:${(profile as any).email}?subject=Chadwick SchoolPool Carpool`}
              className="flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors"
            >
              <Mail className="h-3.5 w-3.5" />
              <span className="truncate">{(profile as any).email}</span>
            </a>
          )}
          
          {profile.phone_number && (
            <a
              href={`tel:${profile.phone_number}`}
              className="flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors"
            >
              <Phone className="h-3.5 w-3.5" />
              <span>{profile.phone_number}</span>
            </a>
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

        {/* Action Buttons - Compact */}
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
      </CardContent>
    </Card>
  );
};

export default ParentProfilePopup;
