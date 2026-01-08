import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { SkeletonListItem, SkeletonCarpoolItem } from "@/components/ui/skeleton-card";
import { 
  GraduationCap,
  Users,
  UserPlus,
  Calendar,
  Car,
  MapPin,
  Clock,
  User,
  Settings,
  Link2,
  ArrowRight
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";

interface LinkedParent {
  parent_id: string;
  parent_email: string;
  parent_first_name: string;
  parent_last_name: string;
  linked_at: string;
}

interface FamilyCarpool {
  id: string;
  type: string;
  ride_date: string;
  ride_time: string;
  pickup_location: string;
  dropoff_location: string;
  seats_available?: number;
  seats_needed?: number;
  parent_name: string;
}

const StudentDashboard = () => {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [linkedParents, setLinkedParents] = useState<LinkedParent[]>([]);
  const [familyCarpools, setFamilyCarpools] = useState<FamilyCarpool[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    
    const fetchStudentData = async () => {
      setLoading(true);

      // Fetch linked parents using RPC function
      const { data: parents, error: parentsError } = await supabase.rpc('get_linked_parents', {
        student_user_id: user.id
      });

      if (parentsError) {
        console.error('Error fetching linked parents:', parentsError);
      } else {
        setLinkedParents(parents || []);
      }

      // If we have linked parents, fetch their carpools
      if (parents && parents.length > 0) {
        const parentIds = parents.map((p: LinkedParent) => p.parent_id);
        
        const { data: carpools, error: carpoolsError } = await supabase
          .from('rides')
          .select('*')
          .in('user_id', parentIds)
          .eq('status', 'active')
          .gte('ride_date', new Date().toISOString().split('T')[0])
          .order('ride_date', { ascending: true })
          .limit(10);

        if (carpoolsError) {
          console.error('Error fetching carpools:', carpoolsError);
        } else if (carpools) {
          // Map parent names to carpools
          const parentMap = parents.reduce((acc: Record<string, string>, p: LinkedParent) => {
            acc[p.parent_id] = `${p.parent_first_name} ${p.parent_last_name}`.trim() || 'Parent';
            return acc;
          }, {});

          setFamilyCarpools(carpools.map(c => ({
            ...c,
            parent_name: parentMap[c.user_id] || 'Parent'
          })));
        }
      }

      setLoading(false);
    };

    fetchStudentData();
  }, [user]);

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName[0] || ''}${lastName[0] || ''}`.toUpperCase() || '??';
  };

  if (!user || !profile) {
    return (
      <DashboardLayout>
        <div className="container mx-auto px-4 py-8 max-w-5xl">
          {/* Header skeleton */}
          <div className="mb-8">
            <Skeleton className="h-9 w-64 mb-2" />
            <Skeleton className="h-6 w-32" />
          </div>

          {/* Linked Parents skeleton */}
          <div className="mb-8">
            <Skeleton className="h-7 w-40 mb-4" />
            <div className="grid gap-4 sm:grid-cols-2">
              <SkeletonListItem />
              <SkeletonListItem />
            </div>
          </div>

          {/* Family Carpools skeleton */}
          <div className="mb-8">
            <Skeleton className="h-7 w-40 mb-4" />
            <div className="space-y-3">
              <SkeletonCarpoolItem />
              <SkeletonCarpoolItem />
              <SkeletonCarpoolItem />
            </div>
          </div>

          {/* Quick Actions skeleton */}
          <div>
            <Skeleton className="h-7 w-32 mb-4" />
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[1, 2, 3].map((i) => (
                <Card key={i}>
                  <CardContent className="py-6 text-center">
                    <Skeleton className="h-8 w-8 mx-auto mb-3 rounded" />
                    <Skeleton className="h-4 w-32 mx-auto mb-2" />
                    <Skeleton className="h-3 w-24 mx-auto" />
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="container mx-auto px-4 py-8 max-w-5xl">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-3xl font-bold">Welcome back, {profile.first_name}!</h1>
          </div>
          <div className="flex items-center gap-2">
            <Badge className="bg-blue-500/10 text-blue-600 gap-1">
              <GraduationCap className="h-3 w-3" />
              Student Account
            </Badge>
          </div>
        </div>

        {/* Section A: Link to Parent */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Users className="h-5 w-5" />
            Linked Parents
          </h2>
          
          {loading ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <SkeletonListItem />
              <SkeletonListItem />
            </div>
          ) : linkedParents.length === 0 ? (
            <Card className="border-dashed border-2">
              <CardContent className="py-12 text-center">
                <Users className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-semibold mb-2">No Parents Linked Yet</h3>
                <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                  Link to your parent's account to see their carpool schedules and stay connected with family ride plans.
                </p>
                <Button onClick={() => navigate('/family-links')} size="lg" className="gap-2">
                  <UserPlus className="h-5 w-5" />
                  Link to Parent Account
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                {linkedParents.map((parent) => (
                  <Card key={parent.parent_id}>
                    <CardContent className="py-4">
                      <div className="flex items-center gap-4">
                        <Avatar className="h-12 w-12">
                          <AvatarFallback className="bg-green-500/10 text-green-600">
                            {getInitials(parent.parent_first_name, parent.parent_last_name)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <p className="font-medium">
                            {parent.parent_first_name} {parent.parent_last_name}
                          </p>
                          <p className="text-sm text-muted-foreground">{parent.parent_email}</p>
                        </div>
                        <Badge variant="secondary" className="bg-green-500/10 text-green-600">
                          Linked
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
              <Button variant="outline" onClick={() => navigate('/family-links')} className="gap-2">
                <UserPlus className="h-4 w-4" />
                Add Another Parent
              </Button>
            </div>
          )}
        </div>

        {/* Section B: Family Carpools */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <Car className="h-5 w-5" />
              Family Carpools
            </h2>
            {linkedParents.length > 0 && familyCarpools.length > 0 && (
              <Button variant="ghost" onClick={() => navigate('/family-carpools')} className="gap-2">
                View All
                <ArrowRight className="h-4 w-4" />
              </Button>
            )}
          </div>

          {linkedParents.length === 0 ? (
            <Card className="bg-muted/30">
              <CardContent className="py-8 text-center">
                <Link2 className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                <p className="text-muted-foreground">
                  Link to a parent account to see family carpools
                </p>
              </CardContent>
            </Card>
          ) : loading ? (
            <div className="space-y-3">
              <SkeletonCarpoolItem />
              <SkeletonCarpoolItem />
              <SkeletonCarpoolItem />
            </div>
          ) : familyCarpools.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="py-8 text-center">
                <Calendar className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">
                  Your parents haven't created any carpools yet
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {familyCarpools.slice(0, 5).map((carpool) => (
                <Card key={carpool.id}>
                  <CardContent className="py-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant={carpool.type === 'offer' ? 'default' : 'secondary'}>
                            {carpool.type === 'offer' ? 'Ride Offer' : 'Ride Request'}
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            Created by {carpool.parent_name}
                          </Badge>
                        </div>
                        
                        <div className="flex items-center gap-4 text-sm">
                          <div className="flex items-center gap-1.5">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            <span>{format(new Date(carpool.ride_date), 'EEE, MMM d')}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Clock className="h-4 w-4 text-muted-foreground" />
                            <span>{carpool.ride_time}</span>
                          </div>
                        </div>
                        
                        <div className="text-sm text-muted-foreground">
                          <div className="flex items-start gap-1.5">
                            <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0" />
                            <span>{carpool.pickup_location} → {carpool.dropoff_location}</span>
                          </div>
                        </div>
                      </div>
                      
                      <Badge variant="outline" className="text-xs text-muted-foreground">
                        Read-only
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Section C: Quick Actions */}
        <div>
          <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate('/family-carpools')}>
              <CardContent className="py-6 text-center">
                <Calendar className="h-8 w-8 mx-auto mb-3 text-primary" />
                <p className="font-medium">View Family Schedule</p>
                <p className="text-sm text-muted-foreground">Calendar view</p>
              </CardContent>
            </Card>
            
            <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate('/family-links')}>
              <CardContent className="py-6 text-center">
                <Link2 className="h-8 w-8 mx-auto mb-3 text-primary" />
                <p className="font-medium">Manage Linked Parents</p>
                <p className="text-sm text-muted-foreground">Add or remove links</p>
              </CardContent>
            </Card>
            
            <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate('/profile')}>
              <CardContent className="py-6 text-center">
                <User className="h-8 w-8 mx-auto mb-3 text-primary" />
                <p className="font-medium">View Profile</p>
                <p className="text-sm text-muted-foreground">Your account</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default StudentDashboard;
