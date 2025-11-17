import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
    const { data, error } = await supabase
      .from('student_parent_links')
      .select(`
        *,
        student:profiles!student_parent_links_student_id_fkey(username, first_name, last_name)
      `)
      .eq('parent_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching link requests:', error);
      toast({
        title: 'Error',
        description: 'Failed to load student requests',
        variant: 'destructive',
      });
    } else {
      setLinkRequests(data || []);
    }
    setLoading(false);
  };

  const handleApproval = async (linkId: string, approve: boolean) => {
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
          ? 'The student can now access the platform' 
          : 'The link request has been rejected',
      });

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
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            onClick={() => handleApproval(link.id, false)}
                            disabled={processingId === link.id}
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
                          >
                            {processingId === link.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              'Approve'
                            )}
                          </Button>
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
