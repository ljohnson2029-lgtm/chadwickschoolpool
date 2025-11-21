import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2, CheckCircle2, XCircle } from 'lucide-react';
import Navigation from '@/components/Navigation';

export default function ParentApprovals() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [linkRequests, setLinkRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [verificationCodes, setVerificationCodes] = useState<{ [key: string]: string }>({});

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    fetchLinkRequests();
  }, [user, navigate]);

  const fetchLinkRequests = async () => {
    if (!user) return;
    
    setLoading(true);
    
    // First get the link requests with student profile info
    const { data: links, error: linksError } = await supabase
      .from('student_parent_links')
      .select(`
        *,
        student:profiles!student_parent_links_student_id_fkey(id, username, first_name, last_name)
      `)
      .eq('parent_id', user.id)
      .order('created_at', { ascending: false });

    if (linksError) {
      console.error('Error fetching link requests:', linksError);
      toast({
        title: 'Error',
        description: 'Failed to load student requests',
        variant: 'destructive',
      });
      setLoading(false);
      return;
    }

    // Now fetch email addresses for each student from users table
    if (links && links.length > 0) {
      const studentIds = links.map(link => link.student?.id).filter(Boolean);
      const { data: usersData } = await supabase
        .from('users')
        .select('user_id, email')
        .in('user_id', studentIds);

      // Merge email data into link requests
      const enrichedLinks = links.map(link => ({
        ...link,
        student: {
          ...link.student,
          email: usersData?.find(u => u.user_id === link.student?.id)?.email || 'N/A'
        }
      }));
      
      setLinkRequests(enrichedLinks);
    } else {
      setLinkRequests(links || []);
    }
    
    setLoading(false);
  };

  const handleApproval = async (linkId: string, approve: boolean) => {
    if (approve) {
      // Check if code is provided for approval
      const enteredCode = verificationCodes[linkId]?.trim();
      const linkRequest = linkRequests.find(req => req.id === linkId);
      
      if (!enteredCode) {
        toast({
          title: 'Code Required',
          description: 'Please enter the verification code from your email',
          variant: 'destructive',
        });
        return;
      }

      // Verify code matches
      if (enteredCode !== linkRequest.verification_code) {
        toast({
          title: 'Invalid Code',
          description: 'The verification code you entered is incorrect',
          variant: 'destructive',
        });
        return;
      }

      // Check if code is expired
      const expiresAt = new Date(linkRequest.code_expires_at);
      if (expiresAt < new Date()) {
        toast({
          title: 'Code Expired',
          description: 'This verification code has expired. Please ask the student to send a new request.',
          variant: 'destructive',
        });
        return;
      }
    }

    setProcessingId(linkId);
    try {
      const { error } = await supabase
        .from('student_parent_links')
        .update({
          status: approve ? 'approved' : 'rejected',
          approved_at: approve ? new Date().toISOString() : null,
        })
        .eq('id', linkId);

      if (error) throw error;

      toast({
        title: approve ? 'Student Approved' : 'Request Rejected',
        description: approve 
          ? 'The student can now access the platform and view rides you schedule for them' 
          : 'The link request has been rejected',
      });

      // Clear the code input
      if (approve) {
        setVerificationCodes(prev => {
          const newCodes = { ...prev };
          delete newCodes[linkId];
          return newCodes;
        });
      }

      fetchLinkRequests();
    } catch (error: any) {
      console.error('Error updating link request:', error);
      toast({
        title: 'Error',
        description: 'Failed to update link request',
        variant: 'destructive',
      });
    }
    setProcessingId(null);
  };

  return (
    <>
      <Navigation />
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 pt-20 px-4">
        <div className="container max-w-4xl mx-auto py-12">
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">Student Link Requests</CardTitle>
              <CardDescription>
                Review and approve student accounts linked to you
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin" />
                </div>
              ) : linkRequests.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-muted-foreground">No student link requests yet</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {linkRequests.map((link) => (
                    <div
                      key={link.id}
                      className="flex items-center justify-between p-6 border rounded-lg"
                    >
                      <div className="flex-1">
                        <h3 className="font-semibold text-lg">
                          {link.student?.first_name} {link.student?.last_name}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          @{link.student?.username}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {link.student?.email}
                        </p>
                        <p className="text-sm text-muted-foreground mt-1">
                          Requested {new Date(link.created_at).toLocaleDateString()}
                        </p>
                        <div className="mt-2">
                          <span className={`inline-flex items-center gap-1 text-sm px-2 py-1 rounded ${
                            link.status === 'approved' ? 'bg-green-500/10 text-green-500' :
                            link.status === 'rejected' ? 'bg-red-500/10 text-red-500' :
                            'bg-yellow-500/10 text-yellow-500'
                          }`}>
                            {link.status === 'approved' && <CheckCircle2 className="h-4 w-4" />}
                            {link.status === 'rejected' && <XCircle className="h-4 w-4" />}
                            <span className="capitalize">{link.status}</span>
                          </span>
                        </div>
                      </div>
                      
                      {link.status === 'pending' && (
                        <div className="ml-4 min-w-[300px]">
                          <div className="space-y-3">
                            <div>
                              <Label htmlFor={`code-${link.id}`}>Verification Code</Label>
                              <Input
                                id={`code-${link.id}`}
                                placeholder="Enter 6-digit code"
                                maxLength={6}
                                value={verificationCodes[link.id] || ''}
                                onChange={(e) => setVerificationCodes(prev => ({
                                  ...prev,
                                  [link.id]: e.target.value.replace(/\D/g, '')
                                }))}
                                className="font-mono text-center text-lg tracking-widest"
                              />
                              <p className="text-xs text-muted-foreground mt-1">
                                Enter the code from your email
                              </p>
                            </div>
                            <div className="flex gap-2">
                              <Button
                                variant="outline"
                                onClick={() => handleApproval(link.id, false)}
                                disabled={processingId === link.id}
                                className="flex-1"
                              >
                                {processingId === link.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  'Reject'
                                )}
                              </Button>
                              <Button
                                onClick={() => handleApproval(link.id, true)}
                                disabled={processingId === link.id}
                                className="flex-1"
                              >
                                {processingId === link.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  'Approve'
                                )}
                              </Button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
