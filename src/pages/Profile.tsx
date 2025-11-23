import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { LogOut, User, Mail, Phone, Calendar, GraduationCap, Users } from 'lucide-react';
import { useEffect } from 'react';

const Profile = () => {
  const { user, profile, logout, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) {
      navigate('/login');
    }
  }, [user, loading, navigate]);

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  if (loading || !user || !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-secondary/20 py-12 px-4">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-4xl font-bold gradient-text">My Profile</h1>
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
                variant={profile.account_type === 'student' ? 'secondary' : 'default'}
                className="gap-1"
              >
                {profile.account_type === 'student' ? (
                  <>
                    <GraduationCap className="h-3 w-3" />
                    Student Account
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
                <p className="text-xs text-muted-foreground mt-0.5">
                  {profile.account_type === 'student' 
                    ? '(@chadwickschool.org)' 
                    : '(Verified email)'}
                </p>
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

        <Card>
          <CardHeader>
            <CardTitle>Carpool Features</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {profile.home_address && (
                <div>
                  <p className="text-sm text-muted-foreground">Home Address</p>
                  <p className="font-medium">{profile.home_address}</p>
                </div>
              )}
              
              {(profile.car_make || profile.car_model) && (
                <div>
                  <p className="text-sm text-muted-foreground">Vehicle</p>
                  <p className="font-medium">
                    {profile.car_make} {profile.car_model}
                    {profile.car_seats && ` • ${profile.car_seats} seats available`}
                  </p>
                </div>
              )}
              
              {!profile.home_address && !profile.car_make && (
                <div className="text-center py-4">
                  <p className="text-muted-foreground mb-4">
                    Complete your profile to start using carpool features!
                  </p>
                  <Button onClick={() => navigate('/profile/setup')}>
                    Complete Profile
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Profile;