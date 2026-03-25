import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { LogOut, User, Mail, Phone, Calendar, GraduationCap, Users, Home, Car as CarIcon, Pencil, UserPlus } from 'lucide-react';
import { TopConnections } from '@/components/TopConnections';
import { supabase } from '@/integrations/supabase/client';
import { DashboardLayout } from "@/components/DashboardLayout";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import VerifiedBadge from "@/components/VerifiedBadge";
import { SignOutDialog } from "@/components/ConfirmDialogs";
import FamilyLinksSection from "@/components/FamilyLinksSection";
import { Separator } from "@/components/ui/separator";
import ProfileEditForm from "@/components/profile/ProfileEditForm";

interface LinkedParentInfo {
  parent_id: string;
  parent_email: string;
  parent_first_name: string;
  parent_last_name: string;
  parent_phone: string | null;
}

const Profile = () => {
  const { user, profile, logout, loading } = useAuth();
  const navigate = useNavigate();
  const [userRole, setUserRole] = useState<string | null>(null);
  const [signOutDialogOpen, setSignOutDialogOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [linkedParents, setLinkedParents] = useState<LinkedParentInfo[]>([]);
  const [loadingParents, setLoadingParents] = useState(false);

  useEffect(() => {
    if (!loading && !user) navigate('/login');
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

  // Fetch linked parents for student accounts
  useEffect(() => {
    const fetchLinkedParents = async () => {
      if (!user || userRole !== 'student') return;
      setLoadingParents(true);
      try {
        const { data } = await supabase.rpc('get_linked_parents', { student_user_id: user.id });
        if (data && data.length > 0) {
          // Fetch phone numbers from profiles
          const parentIds = data.map((p: any) => p.parent_id);
          const { data: profiles } = await supabase
            .from('profiles')
            .select('id, phone_number')
            .in('id', parentIds);
          
          const phoneMap = new Map(profiles?.map(p => [p.id, p.phone_number]) || []);
          
          setLinkedParents(data.map((p: any) => ({
            parent_id: p.parent_id,
            parent_email: p.parent_email,
            parent_first_name: p.parent_first_name,
            parent_last_name: p.parent_last_name,
            parent_phone: phoneMap.get(p.parent_id) || null,
          })));
        }
      } catch (err) {
        console.error('Error fetching linked parents:', err);
      } finally {
        setLoadingParents(false);
      }
    };
    fetchLinkedParents();
  }, [user, userRole]);

  const handleLogout = async () => {
    setSigningOut(true);
    await logout();
    navigate('/');
  };

  const handleEditSave = useCallback(() => {
    setIsEditing(false);
    window.location.reload();
  }, []);

  if (loading || !user || !profile) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="animate-pulse text-muted-foreground">Loading...</div>
        </div>
      </DashboardLayout>
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
            {!isEditing && (
              <div className="flex gap-2">
                <Button onClick={() => setIsEditing(true)} variant="outline">
                  <Pencil className="mr-2 h-4 w-4" />
                  Edit Profile
                </Button>
                <Button onClick={() => setSignOutDialogOpen(true)} variant="outline">
                  <LogOut className="mr-2 h-4 w-4" />
                  Logout
                </Button>
              </div>
            )}
          </div>

          {isEditing ? (
            <ProfileEditForm
              user={user}
              profile={profile}
              isParent={isParent}
              onSave={handleEditSave}
              onCancel={() => setIsEditing(false)}
            />
          ) : (
            <>
              {/* Personal Information */}
              <Card>
                <CardHeader>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <CardTitle>Personal Information</CardTitle>
                    <div className="flex items-center gap-2 flex-wrap">
                      <VerifiedBadge size="sm" />
                      <Badge 
                        variant={isChild ? 'secondary' : 'default'}
                        className={`gap-1 ${
                          isChild 
                            ? 'bg-blue-500/10 text-blue-600' 
                            : 'bg-green-500/10 text-green-600'
                        }`}
                      >
                        {isChild ? (
                          <><GraduationCap className="h-3 w-3" />Child Account</>
                        ) : (
                          <><Users className="h-3 w-3" />Parent Account</>
                        )}
                      </Badge>
                    </div>
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
                        <Button size="sm" className="mt-2" onClick={() => setIsEditing(true)}>
                          Add Address
                        </Button>
                      </div>
                    </div>
                  )}

                  {profile.grade_level && profile.grade_level !== 'Parent/Adult' && (
                    <div className="flex items-center gap-3">
                      <GraduationCap className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="text-sm text-muted-foreground">Grade Level</p>
                        <p className="font-medium">{profile.grade_level}</p>
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

              {/* Vehicle Information */}
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
                        {[profile.car_color, profile.car_make, profile.car_model].filter(Boolean).join(' ')}
                      </p>
                      {profile.license_plate && (
                        <p className="text-sm text-muted-foreground">
                          Plate: {profile.license_plate}
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Linked Parent Info (students only) */}
              {isChild && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Users className="h-5 w-5" />
                      Linked Parent Contact
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {loadingParents ? (
                      <p className="text-sm text-muted-foreground">Loading...</p>
                    ) : linkedParents.length > 0 ? (
                      <div className="space-y-4">
                        {linkedParents.map((parent) => (
                          <div key={parent.parent_id} className="space-y-2 p-3 rounded-lg bg-muted/50">
                            <div className="flex items-center gap-3">
                              <User className="h-4 w-4 text-muted-foreground" />
                              <div>
                                <p className="text-sm text-muted-foreground">Parent Name</p>
                                <p className="font-medium">{parent.parent_first_name} {parent.parent_last_name}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              <Mail className="h-4 w-4 text-muted-foreground" />
                              <div>
                                <p className="text-sm text-muted-foreground">Email</p>
                                <p className="font-medium">{parent.parent_email}</p>
                              </div>
                            </div>
                            {parent.parent_phone && (
                              <div className="flex items-center gap-3">
                                <Phone className="h-4 w-4 text-muted-foreground" />
                                <div>
                                  <p className="text-sm text-muted-foreground">Phone</p>
                                  <p className="font-medium">{parent.parent_phone}</p>
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                        <p className="text-xs text-muted-foreground">
                          This information is pulled automatically from your linked parent's account.
                        </p>
                      </div>
                    ) : (
                      <div className="text-center py-4">
                        <p className="text-muted-foreground mb-3">No parent linked yet.</p>
                        <Button variant="outline" onClick={() => navigate('/family-links')} className="gap-2">
                          <UserPlus className="h-4 w-4" />
                          Link to Parent Account
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Family Links Section */}
              <Separator />
              <div>
                <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                  <Users className="h-6 w-6" />
                  Family Links
                </h2>
                <p className="text-muted-foreground mb-6">
                  {isChild
                    ? "Connect with your parent's account to let them schedule rides for you"
                    : "Review and manage students linked to your account"
                  }
                </p>
                <FamilyLinksSection />
              </div>

              {/* Frequent Carpool Partners */}
              <TopConnections limit={3} variant="profile" />
            </>
          )}
        </div>

        <SignOutDialog
          open={signOutDialogOpen}
          onOpenChange={setSignOutDialogOpen}
          onConfirm={handleLogout}
          loading={signingOut}
        />
      </div>
    </DashboardLayout>
  );
};

export default Profile;
