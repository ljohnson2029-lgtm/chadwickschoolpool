import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { X, Mail, Phone, MapPin, Users, Clock, Star, Hand, Car } from "lucide-react";
import { format } from "date-fns";

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
      // Fetch profile data
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('id, username, first_name, last_name, home_address, phone_number, created_at')
        .eq('id', parentId)
        .single();

      if (profileError) throw profileError;

      // Fetch user email
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('email')
        .eq('user_id', parentId)
        .single();

      if (userError) throw userError;

      setProfile({ ...profileData, email: userData.email } as any);

      // Fetch linked students count
      const { data: linksData, error: linksError } = await supabase
        .from('student_parent_links')
        .select('id')
        .eq('parent_id', parentId)
        .eq('status', 'approved');

      if (!linksError && linksData) {
        setLinkedStudentsCount(linksData.length);
      }
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

  const getMemberSince = () => {
    if (!profile) return '';
    return format(new Date(profile.created_at), 'MMMM yyyy');
  };

  if (loading) {
    return (
      <Card className="w-full max-w-[360px] animate-fade-in">
        <CardHeader className="relative pb-3">
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-2 right-2 h-8 w-8"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </Button>
          
          <div className="flex items-start gap-3 pr-8">
            <Skeleton className="h-[60px] w-[60px] rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-4 w-36" />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-8 w-full mb-4" />
          <div className="space-y-3">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-10 w-full mt-6" />
            <Skeleton className="h-10 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || !profile) {
    return (
      <Card className="w-full max-w-[360px] animate-fade-in">
        <CardHeader className="relative">
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-2 right-2 h-8 w-8"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </Button>
          <div className="text-center py-6">
            <p className="text-destructive mb-4">Unable to load profile. Try again.</p>
            <Button onClick={fetchParentProfile} variant="outline">
              Retry
            </Button>
          </div>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-[360px] shadow-2xl animate-scale-in">
      <CardHeader className="relative pb-3">
        {/* Close Button */}
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-2 right-2 h-8 w-8 z-10"
          onClick={onClose}
          aria-label="Close profile"
        >
          <X className="h-4 w-4" />
        </Button>

        {/* Profile Header */}
        <div className="flex items-start gap-3 pr-8">
          <Avatar className="h-[60px] w-[60px] border-2 border-white shadow-md">
            <AvatarFallback className="bg-gradient-to-br from-blue-500 to-blue-600 text-white text-xl">
              {getInitials(profile.first_name, profile.last_name, profile.username)}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-bold truncate">{getDisplayName()}</h3>
            
            {(profile as any).email && (
              <a
                href={`mailto:${(profile as any).email}?subject=Chadwick SchoolPool Carpool`}
                className="flex items-center gap-1 text-sm text-muted-foreground hover:text-primary transition-colors group"
              >
                <Mail className="h-3 w-3" />
                <span className="truncate group-hover:underline">{(profile as any).email}</span>
              </a>
            )}
            
            {profile.phone_number ? (
              <a
                href={`tel:${profile.phone_number}`}
                className="flex items-center gap-1 text-sm text-muted-foreground hover:text-primary transition-colors group"
              >
                <Phone className="h-3 w-3" />
                <span className="group-hover:underline">{profile.phone_number}</span>
              </a>
            ) : (
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                <Phone className="h-3 w-3" />
                <span>Phone not shared</span>
              </div>
            )}

            <Badge variant="secondary" className="mt-1 text-xs">
              Member since {getMemberSince()}
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Distance Indicator */}
        <div className="flex justify-center">
          <Badge className="bg-blue-500 text-white px-4 py-2 text-sm gap-2">
            <MapPin className="h-4 w-4" />
            {distance.toFixed(1)} miles from your route
          </Badge>
        </div>

        {/* Additional Info Section */}
        <div className="space-y-3 py-3 border-t">
          <div className="flex items-center gap-2 text-sm">
            <MapPin className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            <span className="truncate">{formatAddress(profile.home_address)}</span>
          </div>

          <div className="flex items-center gap-2 text-sm">
            <Users className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            <span>
              {linkedStudentsCount === 0
                ? 'No students linked'
                : `${linkedStudentsCount} student${linkedStudentsCount !== 1 ? 's' : ''} linked`}
            </span>
          </div>

          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="h-4 w-4 flex-shrink-0" />
            <span>Schedule varies by arrangement</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-2 pt-3 border-t">
          <Button
            className="w-full gap-2 h-11"
            onClick={() => onRequestRide(parentId, getFirstName())}
          >
            <Hand className="h-4 w-4" />
            Request Ride from {getFirstName()}
          </Button>

          <Button
            variant="outline"
            className="w-full gap-2 h-11"
            onClick={() => onOfferRide(parentId, getFirstName())}
          >
            <Car className="h-4 w-4" />
            Offer Ride to {getFirstName()}
          </Button>
        </div>

        {/* Secondary Actions */}
        <div className="flex justify-center pt-2 text-xs text-muted-foreground">
          <button className="hover:text-primary hover:underline transition-colors">
            Report issue
          </button>
        </div>
      </CardContent>
    </Card>
  );
};

export default ParentProfilePopup;
