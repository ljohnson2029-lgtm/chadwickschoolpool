import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { supabase } from '@/integrations/supabase/client';
import { 
  X, 
  Mail, 
  Phone, 
  MapPin, 
  Users, 
  CarFront,
  Navigation
} from 'lucide-react';

interface ParentProfileCardProps {
  parentId: string;
  parentName: string;
  phone?: string | null;
  address: string;
  distanceFromRoute?: number; // in miles
  onClose: () => void;
  onRequestRide: () => void;
  onOfferRide: () => void;
}

const ParentProfileCard: React.FC<ParentProfileCardProps> = ({
  parentId,
  parentName,
  phone,
  address,
  distanceFromRoute,
  onClose,
  onRequestRide,
  onOfferRide
}) => {
  const [linkedStudentsCount, setLinkedStudentsCount] = useState<number>(0);
  const [carInfo, setCarInfo] = useState<{ make: string; model: string; seats: number } | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [activeRidesCount, setActiveRidesCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchParentDetails = async () => {
      setLoading(true);

      // Fetch email from users table
      const { data: userData } = await supabase
        .from('users')
        .select('email')
        .eq('user_id', parentId)
        .maybeSingle();

      if (userData?.email) {
        setEmail(userData.email);
      }

      // Fetch linked students count
      const { data: students } = await supabase.rpc('get_linked_students', {
        parent_user_id: parentId
      });
      setLinkedStudentsCount(students?.length || 0);

      // Fetch car information
      const { data: profile } = await supabase
        .from('profiles')
        .select('car_make, car_model, car_seats')
        .eq('id', parentId)
        .maybeSingle();

      if (profile?.car_make && profile?.car_model) {
        setCarInfo({
          make: profile.car_make,
          model: profile.car_model,
          seats: profile.car_seats || 0
        });
      }

      // Fetch active rides count
      const { data: ridesData } = await supabase
        .from('rides')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', parentId)
        .eq('status', 'active');

      setActiveRidesCount(ridesData?.length || 0);

      setLoading(false);
    };

    fetchParentDetails();
  }, [parentId]);

  const getInitials = (name: string) => {
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  // Get first line of address for privacy
  const displayAddress = address.split(',')[0];

  return (
    <Card className="w-80 shadow-lg animate-scale-in border-border">
      <CardHeader className="relative pb-3">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-full p-1 hover:bg-muted transition-colors"
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>
        
        <div className="flex items-start gap-3">
          <Avatar className="h-12 w-12 border-2 border-primary">
            <AvatarFallback className="bg-primary/10 text-primary font-semibold">
              {getInitials(parentName)}
            </AvatarFallback>
          </Avatar>
          
          <div className="flex-1">
            <CardTitle className="text-lg">{parentName}</CardTitle>
            <div className="flex gap-2 mt-1">
              {distanceFromRoute !== undefined && (
                <Badge variant="secondary" className="gap-1 text-xs">
                  <Navigation className="h-3 w-3" />
                  {distanceFromRoute.toFixed(1)} mi from route
                </Badge>
              )}
              {!loading && activeRidesCount > 0 && (
                <Badge className="gap-1 text-xs bg-green-600 hover:bg-green-700">
                  <CarFront className="h-3 w-3" />
                  {activeRidesCount} active ride{activeRidesCount !== 1 ? 's' : ''}
                </Badge>
              )}
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Contact Information */}
        <div className="space-y-2">
          {email ? (
            <a
              href={`mailto:${email}`}
              className="flex items-center gap-2 text-sm hover:text-primary transition-colors group"
            >
              <Mail className="h-4 w-4 text-muted-foreground group-hover:text-primary" />
              <span className="truncate">{email}</span>
            </a>
          ) : (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Mail className="h-4 w-4" />
              <span className="italic">Email not shared</span>
            </div>
          )}

          {phone ? (
            <a
              href={`tel:${phone}`}
              className="flex items-center gap-2 text-sm hover:text-primary transition-colors group"
            >
              <Phone className="h-4 w-4 text-muted-foreground group-hover:text-primary" />
              <span>{phone}</span>
            </a>
          ) : (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Phone className="h-4 w-4" />
              <span className="italic">Phone not shared</span>
            </div>
          )}

          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <MapPin className="h-4 w-4" />
            <span className="truncate">{displayAddress}</span>
          </div>
        </div>

        {/* Additional Info */}
        <div className="pt-3 border-t border-border space-y-2">
          {!loading && (
            <>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Linked Students
                </span>
                <span className="font-medium">{linkedStudentsCount}</span>
              </div>

              {carInfo && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground flex items-center gap-2">
                    <CarFront className="h-4 w-4" />
                    Vehicle
                  </span>
                  <span className="font-medium text-right">
                    {carInfo.make} {carInfo.model}
                    {carInfo.seats > 0 && (
                      <span className="text-xs text-muted-foreground ml-1">
                        ({carInfo.seats} seats)
                      </span>
                    )}
                  </span>
                </div>
              )}
            </>
          )}
        </div>

        {/* Action Buttons */}
        <div className="pt-4 space-y-2">
          <Button 
            onClick={onRequestRide}
            className="w-full gap-2"
          >
            <CarFront className="h-4 w-4" />
            Request Ride
          </Button>
          <Button 
            onClick={onOfferRide}
            variant="outline"
            className="w-full gap-2"
          >
            <CarFront className="h-4 w-4" />
            Offer Ride
          </Button>
        </div>

        <p className="text-xs text-center text-muted-foreground pt-2">
          Click a button to start coordinating carpools
        </p>
      </CardContent>
    </Card>
  );
};

export default ParentProfileCard;
