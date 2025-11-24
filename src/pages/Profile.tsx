import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { LogOut, User, Mail, Phone, Calendar, GraduationCap, Users, Home, Car as CarIcon, Link } from 'lucide-react';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import TabNavigation from '@/components/TabNavigation';
import { CoParentLinking } from '@/components/CoParentLinking';

const Profile = () => {
  const { user, profile, logout, loading } = useAuth();
  const navigate = useNavigate();
  const [userRole, setUserRole] = useState<string | null>(null);

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
    <div className="min-h-screen bg-background">
      <TabNavigation />
      <div className="container mx-auto px-4 py-8 pt-24 max-w-4xl">
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

              {profile.home_address && (
                <div className="flex items-center gap-3">
                  <Home className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Address</p>
                    <p className="font-medium">{profile.home_address}</p>
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
                  Link to Parent Account
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  Connect with your parent's account to view their carpool schedules
                </p>
                <Button onClick={() => navigate('/student-linking')}>
                  <Link className="mr-2 h-4 w-4" />
                  Manage Parent Links
                </Button>
              </CardContent>
            </Card>
          )}

          {isParent && <CoParentLinking />}

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
    </div>
  );
};

export default Profile;