import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader2, UserPlus, CheckCircle2, XCircle, Clock } from 'lucide-react';
import Navigation from '@/components/Navigation';

export default function StudentLinking() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [parentEmail, setParentEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [linkRequests, setLinkRequests] = useState<any[]>([]);
  const [fetchingLinks, setFetchingLinks] = useState(true);

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    fetchLinkRequests();
  }, [user, navigate]);

  const fetchLinkRequests = async () => {
    if (!user) return;
    
    setFetchingLinks(true);
    const { data, error } = await supabase
      .from('student_parent_links')
      .select(`
        *,
        parent:profiles(username, first_name, last_name)
      `)
      .eq('student_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching link requests:', error);
    } else {
      setLinkRequests(data || []);
    }
    setFetchingLinks(false);
  };

  const handleRequestParentLink = async () => {
    if (!parentEmail.trim()) {
      toast({
        title: 'Email Required',
        description: 'Please enter your parent\'s email address',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      // Check if parent email is approved
      const normalizedEmail = parentEmail.toLowerCase();
      const { data: emailCheckData } = await supabase.functions.invoke('auth-check-email', {
        body: { email: normalizedEmail }
      });

      if (!emailCheckData?.approved) {
        toast({
          title: 'Email Not Approved',
          description: 'This parent email is not approved for the platform. They need to be added by an administrator first.',
          variant: 'destructive',
        });
        setLoading(false);
        return;
      }

      // Find parent by email
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('user_id')
        .ilike('email', parentEmail.trim())
        .maybeSingle();

      if (userError || !userData) {
        toast({
          title: 'Parent Not Found',
          description: 'No account found with this email. Please ask your parent to register first.',
          variant: 'destructive',
        });
        setLoading(false);
        return;
      }

      // Check if parent has the parent role
      const { data: roleData, error: roleError } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userData.user_id)
        .eq('role', 'parent')
        .maybeSingle();

      if (roleError || !roleData) {
        toast({
          title: 'Invalid Parent Account',
          description: 'This account is not registered as a parent.',
          variant: 'destructive',
        });
        setLoading(false);
        return;
      }

      // Create link request
      const { error: linkError } = await supabase
        .from('student_parent_links')
        .insert({
          student_id: user?.id,
          parent_id: userData.user_id,
          status: 'pending',
        });

      if (linkError) {
        if (linkError.code === '23505') {
          toast({
            title: 'Request Already Exists',
            description: 'You have already sent a request to this parent.',
            variant: 'destructive',
          });
        } else {
          throw linkError;
        }
      } else {
        toast({
          title: 'Request Sent',
          description: 'Your parent will receive a notification to approve your account.',
        });
        setParentEmail('');
        fetchLinkRequests();
      }
    } catch (error: any) {
      console.error('Error requesting parent link:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to send parent link request',
        variant: 'destructive',
      });
    }
    setLoading(false);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved':
        return <CheckCircle2 className="h-5 w-5 text-green-500" />;
      case 'rejected':
        return <XCircle className="h-5 w-5 text-red-500" />;
      default:
        return <Clock className="h-5 w-5 text-yellow-500" />;
    }
  };

  const hasApprovedLink = linkRequests.some(link => link.status === 'approved');

  useEffect(() => {
    if (hasApprovedLink) {
      setTimeout(() => {
        navigate('/dashboard');
      }, 2000);
    }
  }, [hasApprovedLink, navigate]);

  return (
    <>
      <Navigation />
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 pt-20 px-4">
        <div className="container max-w-2xl mx-auto py-12">
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">Student Account - Parent Approval Required</CardTitle>
              <CardDescription>
                As a Chadwick student, you need parent approval to access the platform. Enter your parent's email to send a link request.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {hasApprovedLink ? (
                <div className="text-center py-8">
                  <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold mb-2">Account Approved!</h3>
                  <p className="text-muted-foreground">Redirecting to dashboard...</p>
                </div>
              ) : (
                <>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">Parent's Email Address</label>
                      <Input
                        type="email"
                        placeholder="parent@example.com"
                        value={parentEmail}
                        onChange={(e) => setParentEmail(e.target.value)}
                        disabled={loading}
                      />
                    </div>
                    <Button
                      onClick={handleRequestParentLink}
                      disabled={loading}
                      className="w-full"
                    >
                      {loading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Sending Request...
                        </>
                      ) : (
                        <>
                          <UserPlus className="mr-2 h-4 w-4" />
                          Request Parent Approval
                        </>
                      )}
                    </Button>
                  </div>

                  <div className="space-y-4">
                    <h3 className="font-semibold">Your Link Requests</h3>
                    {fetchingLinks ? (
                      <div className="flex justify-center py-8">
                        <Loader2 className="h-6 w-6 animate-spin" />
                      </div>
                    ) : linkRequests.length === 0 ? (
                      <p className="text-muted-foreground text-sm">No requests sent yet</p>
                    ) : (
                      <div className="space-y-2">
                        {linkRequests.map((link) => (
                          <div
                            key={link.id}
                            className="flex items-center justify-between p-4 border rounded-lg"
                          >
                            <div>
                              <p className="font-medium">
                                {link.parent?.first_name} {link.parent?.last_name}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                Requested {new Date(link.created_at).toLocaleDateString()}
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              {getStatusIcon(link.status)}
                              <span className="text-sm capitalize">{link.status}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
