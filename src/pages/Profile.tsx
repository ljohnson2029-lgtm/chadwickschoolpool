import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { LogOut, User, Mail, Phone, Calendar, GraduationCap, Users, Home, Car as CarIcon, Link } from 'lucide-react';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import TabNavigation from '@/components/TabNavigation';
import { DashboardLayout } from "@/components/DashboardLayout";
import { Breadcrumbs } from "@/components/Breadcrumbs";

interface LinkedStudent {
  student_id: string;
  student_email: string;
  student_first_name: string;
  student_last_name: string;
  linked_at: string;
}

const Profile = () => {
  const { user, profile, logout, loading } = useAuth();
  const navigate = useNavigate();
  const [userRole, setUserRole] = useState<string | null>(null);
  const [linkedChildren, setLinkedChildren] = useState<LinkedStudent[]>([]);

  useEffect(() => {
    if (!loading && !user) {
      navigate('/login');
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    const fetchUserRole = async () => {
      if (!user) return;
      
      const { data } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .maybeSingle();
      
      setUserRole(data?.role || null);
    };

    fetchUserRole();
  }, [user]);

  useEffect(() => {
    const fetchLinkedChildren = async () => {
      if (!user || !profile) return;
      
      const { data, error } = await supabase.rpc('get_linked_students', {
        parent_user_id: user.id
      });

      if (error) {
        console.error('Error fetching linked children:', error);
        return;
      }

      setLinkedChildren(data || []);
    };

    if (profile?.account_type === 'parent') {
      fetchLinkedChildren();
    }
  }, [user, profile]);

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  if (loading || !user || !profile) {
    return (
      <div className="min-h-screen bg-background">
        <TabNavigation />
        <div className="flex items-center justify-center min-h-[60vh] pt-20">
          <div className="animate-pulse text-muted-foreground">Loading...</div>
        </div>
      </div>
    );
  }

  const isChild = userRole === 'student';
  const isParent = userRole === 'parent';

  return (
    <DashboardLayout>
      <div className="container mx-auto px-4 max-w-4xl">
        <Breadcrumbs items={[{ label: "My Profile" }]} />
        
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h1 className="text-3xl font-bold">My Profile</h1>
            <div className="flex gap-2">
              <Button onClick={() => navigate('/profile/setup')} variant="outline">
                Edit Profile
              </Button>
              <Button onClick={handleLogout} variant="outline">
                <LogOut className="mr-2 h-4 w-4" />
                Logout
              </Button>
            </div>
          </div>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Personal Information</CardTitle>
                <Badge 
                  variant={isChild ? 'secondary' : 'default'}
                  className={`gap-1 ${
                    isChild 
                      ? 'bg-blue-500/10 text-blue-600' 
                      : 'bg-green-500/10 text-green-600'
                  }`}
                >
                  {isChild ? (
                    <>
                      <GraduationCap className="h-3 w-3" />
                      Child Account
                    </>
                  ) : (
                    <>
                      <Users className="h-3 w-3" />
                      Parent Account
                    </>
                  )}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <User className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Name</p>
                  <p className="font-medium">{profile.first_name} {profile.last_name}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <User className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Username</p>
                  <p className="font-medium">@{profile.username}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Mail className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Email</p>
                  <p className="font-medium">{user.email}</p>
                </div>
              </div>

              {profile.phone_number && (
                <div className="flex items-center gap-3">
                  <Phone className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Phone</p>
                    <p className="font-medium">{profile.phone_number}</p>
                  </div>
                </div>
              )}

              {profile.home_address ? (
                <div className="flex items-start gap-3">
                  <Home className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm text-muted-foreground">Address</p>
                    <p className="font-medium">{profile.home_address}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      ⚠️ Changing your address will update your location on the map
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex items-start gap-3 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                  <Home className="h-5 w-5 text-yellow-600 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-yellow-600">Address Required</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Add your home address to use map features and find carpool partners.
                    </p>
                    <Button 
                      size="sm" 
                      className="mt-2"
                      onClick={() => navigate('/profile/setup')}
                    >
                      Add Address
                    </Button>
                  </div>
                </div>
              )}

              <div className="flex items-center gap-3">
                <Calendar className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Member Since</p>
                  <p className="font-medium">
                    {new Date(profile.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>

              {isParent && linkedChildren.length > 0 && (
                <>
                  <div className="border-t pt-4 mt-4">
                    <div className="flex items-center gap-3 mb-3">
                      <GraduationCap className="h-5 w-5 text-muted-foreground" />
                      <p className="text-sm font-medium text-muted-foreground">Linked Children</p>
                    </div>
                    <div className="space-y-2 ml-8">
                      {linkedChildren.map((child) => (
                        <div key={child.student_id} className="flex items-center gap-2">
                          <Badge variant="outline" className="bg-blue-500/10 text-blue-600">
                            {child.student_first_name} {child.student_last_name}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            ({child.student_email})
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {isParent && (profile.car_make || profile.car_model) && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CarIcon className="h-5 w-5" />
                  Vehicle Information
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <p className="font-medium">
                    {profile.car_make} {profile.car_model}
                  </p>
                  {profile.car_seats && (
                    <p className="text-sm text-muted-foreground">
                      {profile.car_seats} seats available
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {isChild && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Link className="h-5 w-5" />
                  Family Links
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  Connect with your parent's account to view their carpool schedules
                </p>
                <Button onClick={() => navigate('/family-links')}>
                  <Link className="mr-2 h-4 w-4" />
                  Manage Family Links
                </Button>
              </CardContent>
            </Card>
          )}

          {!profile.home_address && (
            <Card className="border-dashed">
              <CardContent className="text-center py-6">
                <p className="text-muted-foreground mb-4">
                  Complete your profile to unlock all features!
                </p>
                <Button onClick={() => navigate('/profile/setup')}>
                  Complete Profile
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Profile;