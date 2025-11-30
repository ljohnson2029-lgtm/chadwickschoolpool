import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { 
  Calendar, 
  Car, 
  MapPin, 
  Plus, 
  Users, 
  TrendingUp,
  Clock,
  UserPlus,
  Hand,
  Map as MapIcon
} from "lucide-react";
import { EmptyState } from "@/components/EmptyState";
import { format } from "date-fns";
import RideRequestForm from "@/components/RideRequestForm";
import RideOfferForm from "@/components/RideOfferForm";

const Dashboard = () => {
  const { user, profile, loading } = useAuth();
  const navigate = useNavigate();
  const [userRole, setUserRole] = useState<string | null>(null);
  const [stats, setStats] = useState({
    totalRides: 0,
    upcomingRides: 0,
    linkedCount: 0,
    pendingRequests: 0
  });
  const [upcomingRides, setUpcomingRides] = useState<any[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [showRequestDialog, setShowRequestDialog] = useState(false);
  const [showOfferDialog, setShowOfferDialog] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      navigate("/login");
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!user) return;
      
      try {
        // Get user role
        const { data: roleData } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .maybeSingle();
        
        setUserRole(roleData?.role || null);
        
        const isStudent = roleData?.role === 'student';

        // Get rides stats
        const { data: rides, count: totalCount } = await supabase
          .from('rides')
          .select('*', { count: 'exact' })
          .eq('status', 'active')
          .gte('ride_date', new Date().toISOString().split('T')[0]);

        const upcoming = rides?.slice(0, 5) || [];
        
        // Get linked family count
        let linkedCount = 0;
        if (isStudent) {
          const { data: links } = await supabase
            .from('student_parent_links')
            .select('id')
            .eq('student_id', user.id)
            .eq('status', 'approved');
          linkedCount = links?.length || 0;
        } else {
          const { data: links } = await supabase
            .from('student_parent_links')
            .select('id')
            .eq('parent_id', user.id)
            .eq('status', 'approved');
          linkedCount = links?.length || 0;
        }

        // Get pending requests
        const { data: pending } = await supabase
          .from('student_parent_links')
          .select('id')
          .eq(isStudent ? 'student_id' : 'parent_id', user.id)
          .eq('status', 'pending');

        setStats({
          totalRides: totalCount || 0,
          upcomingRides: upcoming.length,
          linkedCount,
          pendingRequests: pending?.length || 0
        });
        setUpcomingRides(upcoming);
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoadingData(false);
      }
    };

    fetchDashboardData();
  }, [user]);

  if (loading || loadingData || !user || !profile) {
    return (
      <DashboardLayout>
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-center min-h-[60vh]">
            <div className="text-muted-foreground">Loading...</div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  const isStudent = userRole === 'student';
  const firstName = profile.first_name || 'there';

  return (
    <DashboardLayout>
      <div className="container mx-auto px-4 max-w-7xl">
        {/* Welcome Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">
            Welcome back, {firstName}! 👋
          </h1>
          <p className="text-muted-foreground">
            {isStudent 
              ? "View your family's carpool schedule and stay connected"
              : "Manage your carpools and connect with other families"}
          </p>
        </div>

        {/* Quick Actions - Parent Only */}
        {!isStudent && (
          <div className="mb-8">
            <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Find Nearby Parents Card */}
              <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => navigate('/map')}>
                <CardHeader>
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-3 bg-blue-100 dark:bg-blue-900 rounded-lg">
                      <MapIcon className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                    </div>
                    <CardTitle className="text-lg">Find Nearby Parents</CardTitle>
                  </div>
                  <CardDescription>
                    View parents near your route to Chadwick School and discover carpool opportunities
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button className="w-full gap-2" onClick={(e) => { e.stopPropagation(); navigate('/map'); }}>
                    <MapIcon className="h-4 w-4" />
                    Open Map
                  </Button>
                </CardContent>
              </Card>

              {/* Request a Ride Card */}
              <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => setShowRequestDialog(true)}>
                <CardHeader>
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-3 bg-orange-100 dark:bg-orange-900 rounded-lg">
                      <Hand className="h-6 w-6 text-orange-600 dark:text-orange-400" />
                    </div>
                    <CardTitle className="text-lg">Request a Ride</CardTitle>
                  </div>
                  <CardDescription>
                    Ask another parent for a ride to school or activities for your student
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button className="w-full gap-2" onClick={(e) => { e.stopPropagation(); setShowRequestDialog(true); }}>
                    <Hand className="h-4 w-4" />
                    New Request
                  </Button>
                </CardContent>
              </Card>

              {/* Offer a Ride Card */}
              <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => setShowOfferDialog(true)}>
                <CardHeader>
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-3 bg-green-100 dark:bg-green-900 rounded-lg">
                      <Car className="h-6 w-6 text-green-600 dark:text-green-400" />
                    </div>
                    <CardTitle className="text-lg">Offer a Ride</CardTitle>
                  </div>
                  <CardDescription>
                    Share your carpool availability and help other families get to school
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button className="w-full gap-2" onClick={(e) => { e.stopPropagation(); setShowOfferDialog(true); }}>
                    <Car className="h-4 w-4" />
                    New Offer
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Upcoming Rides
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.upcomingRides}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Car className="h-4 w-4" />
                Total Active
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.totalRides}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Users className="h-4 w-4" />
                {isStudent ? 'Linked Parents' : 'Linked Students'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.linkedCount}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Pending Requests
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.pendingRequests}</div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Upcoming Rides */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Upcoming Rides</span>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => navigate('/carpools')}
                >
                  View All
                </Button>
              </CardTitle>
              <CardDescription>Your next scheduled carpools</CardDescription>
            </CardHeader>
            <CardContent>
              {upcomingRides.length === 0 ? (
                <EmptyState
                  icon={Car}
                  title="No Upcoming Rides"
                  description={isStudent 
                    ? "Your linked parents haven't created any carpools yet"
                    : "Create your first carpool to get started"}
                  action={!isStudent ? {
                    label: "Create Carpool",
                    onClick: () => navigate('/carpools/create')
                  } : undefined}
                />
              ) : (
                <div className="space-y-3">
                  {upcomingRides.map((ride) => (
                    <div 
                      key={ride.id}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                      onClick={() => navigate('/carpools')}
                    >
                      <div className="flex items-center gap-4">
                        <div className="p-2 bg-primary/10 rounded-lg">
                          <Car className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <div className="font-medium">{ride.pickup_location}</div>
                          <div className="text-sm text-muted-foreground">
                            {format(new Date(ride.ride_date), 'MMM d, yyyy')} at {ride.ride_time}
                          </div>
                        </div>
                      </div>
                      <Badge variant={ride.type === 'offer' ? 'default' : 'secondary'}>
                        {ride.type === 'offer' ? 'Offering' : 'Requesting'}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Family Links */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Family</span>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => navigate('/family-links')}
                >
                  Manage
                </Button>
              </CardTitle>
              <CardDescription>
                {isStudent ? 'Linked parents' : 'Linked students'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {stats.linkedCount === 0 ? (
                <EmptyState
                  icon={UserPlus}
                  title="No Links Yet"
                  description={isStudent 
                    ? "Connect with your parent to see their carpools"
                    : "Your students haven't linked to you yet"}
                  action={{
                    label: isStudent ? "Link to Parent" : "View Requests",
                    onClick: () => navigate('/family-links')
                  }}
                />
              ) : (
                <div className="space-y-4">
                  <div className="text-center py-8">
                    <div className="text-4xl mb-2">👨‍👩‍👧‍👦</div>
                    <div className="font-semibold text-lg mb-1">
                      {stats.linkedCount} {isStudent ? 'Parent' : 'Student'}{stats.linkedCount !== 1 ? 's' : ''} Linked
                    </div>
                    <p className="text-sm text-muted-foreground mb-4">
                      {isStudent 
                        ? "View their carpools in the Carpools tab"
                        : "Manage carpools for your family"}
                    </p>
                    {stats.pendingRequests > 0 && (
                      <Badge variant="outline" className="gap-1">
                        <Clock className="h-3 w-3" />
                        {stats.pendingRequests} Pending
                      </Badge>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Recent Activity - Future Enhancement */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Recent Activity
            </CardTitle>
            <CardDescription>Your latest carpool actions</CardDescription>
          </CardHeader>
          <CardContent>
            <EmptyState
              icon={Clock}
              title="No Recent Activity"
              description="Your recent carpool activities will appear here"
            />
          </CardContent>
        </Card>

        {/* Request Ride Dialog */}
        <Dialog open={showRequestDialog} onOpenChange={setShowRequestDialog}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <RideRequestForm 
              onSuccess={() => {
                setShowRequestDialog(false);
                // Refresh dashboard data
                window.location.reload();
              }}
            />
          </DialogContent>
        </Dialog>

        {/* Offer Ride Dialog */}
        <Dialog open={showOfferDialog} onOpenChange={setShowOfferDialog}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <RideOfferForm 
              onSuccess={() => {
                setShowOfferDialog(false);
                // Refresh dashboard data
                window.location.reload();
              }}
            />
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;
