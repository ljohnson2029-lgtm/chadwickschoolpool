import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Loader2, UserCheck, UserX, AlertTriangle, Users } from "lucide-react";
import { NotificationMessages } from "@/lib/notifications";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import Navigation from '@/components/Navigation';

interface LinkedStudent {
  id: string;
  student_id: string;
  student_email: string;
  student_first_name: string;
  student_last_name: string;
  status: string;
  created_at: string;
}

export default function ParentApprovals() {
  const { user, profile, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [pendingRequests, setPendingRequests] = useState<LinkedStudent[]>([]);
  const [linkedStudents, setLinkedStudents] = useState<LinkedStudent[]>([]);
  const [isLoadingLinks, setIsLoadingLinks] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && (!user || profile?.account_type !== 'parent')) {
      navigate('/');
    }
  }, [user, profile, loading, navigate]);

  useEffect(() => {
    if (user && profile?.account_type === 'parent') {
      fetchLinks();
    }
  }, [user, profile]);

  // Real-time subscription for link updates
  useEffect(() => {
    if (!user || profile?.account_type !== 'parent') return;

    const channel = supabase
      .channel('parent-link-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'account_links',
          filter: `parent_id=eq.${user.id}`,
        },
        () => {
          fetchLinks();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, profile]);

  const fetchLinks = async () => {
    setIsLoadingLinks(true);
    try {
      const { data: links, error } = await supabase
        .from('account_links')
        .select(`
          id,
          student_id,
          status,
          created_at,
          users!account_links_student_id_fkey (
            email,
            first_name,
            last_name
          )
        `)
        .eq('parent_id', user?.id);

      if (error) throw error;

      const formattedLinks = links?.map((link: any) => ({
        id: link.id,
        student_id: link.student_id,
        student_email: link.users.email,
        student_first_name: link.users.first_name,
        student_last_name: link.users.last_name,
        status: link.status,
        created_at: link.created_at,
      })) || [];

      setPendingRequests(formattedLinks.filter((l: LinkedStudent) => l.status === 'pending'));
      setLinkedStudents(formattedLinks.filter((l: LinkedStudent) => l.status === 'approved'));
    } catch (error) {
      console.error('Error fetching links:', error);
      toast({
        title: "Error",
        description: "Failed to load linked students",
        variant: "destructive",
      });
    } finally {
      setIsLoadingLinks(false);
    }
  };

  const handleApprove = async (linkId: string, studentName: string, studentId: string) => {
    setProcessingId(linkId);
    try {
      // Update link status to approved
      const { error: updateError } = await supabase
        .from('account_links')
        .update({ status: 'approved' })
        .eq('id', linkId);

      if (updateError) throw updateError;

      // Create notification for student
      const { data: parentData } = await supabase
        .from('users')
        .select('first_name, last_name')
        .eq('user_id', user?.id)
        .single();

      const parentName = parentData 
        ? `${parentData.first_name} ${parentData.last_name}`
        : 'Your parent';

      const { error: notifError } = await supabase
        .from('notifications')
        .insert({
          user_id: studentId,
          type: 'link_approved',
          message: NotificationMessages.linkApproved(parentName),
          link_id: linkId,
        });

      if (notifError) console.error('Error creating notification:', notifError);

      toast({
        title: "Request Approved",
        description: `${studentName} linked successfully`,
      });

      fetchLinks();
    } catch (error) {
      console.error('Error approving request:', error);
      toast({
        title: "Error",
        description: "Failed to approve request",
        variant: "destructive",
      });
    } finally {
      setProcessingId(null);
    }
  };

  const handleDeny = async (linkId: string, studentName: string, studentId: string) => {
    setProcessingId(linkId);
    try {
      // Delete the link request
      const { error: deleteError } = await supabase
        .from('account_links')
        .delete()
        .eq('id', linkId);

      if (deleteError) throw deleteError;

      // Create notification for student
      const { data: parentData } = await supabase
        .from('users')
        .select('first_name, last_name')
        .eq('user_id', user?.id)
        .single();

      const parentName = parentData 
        ? `${parentData.first_name} ${parentData.last_name}`
        : 'Your parent';

      const { error: notifError } = await supabase
        .from('notifications')
        .insert({
          user_id: studentId,
          type: 'link_denied',
          message: NotificationMessages.linkDenied(parentName),
        });

      if (notifError) console.error('Error creating notification:', notifError);

      toast({
        title: "Request Denied",
        description: "Link request denied",
      });

      fetchLinks();
    } catch (error) {
      console.error('Error denying request:', error);
      toast({
        title: "Error",
        description: "Failed to deny request",
        variant: "destructive",
      });
    } finally {
      setProcessingId(null);
    }
  };

  const handleRemoveStudent = async () => {
    if (!removingId) return;

    const student = linkedStudents.find(s => s.id === removingId);
    if (!student) return;

    try {
      // Delete the link
      const { error: deleteError } = await supabase
        .from('account_links')
        .delete()
        .eq('id', removingId);

      if (deleteError) throw deleteError;

      // Create notification for student
      const { data: parentData } = await supabase
        .from('users')
        .select('first_name, last_name')
        .eq('user_id', user?.id)
        .single();

      const parentName = parentData 
        ? `${parentData.first_name} ${parentData.last_name}`
        : 'Your parent';

      const { error: notifError } = await supabase
        .from('notifications')
        .insert({
          user_id: student.student_id,
          type: 'unlinked_by_parent',
          message: NotificationMessages.unlinkedByParent(parentName),
        });

      if (notifError) console.error('Error creating notification:', notifError);

      toast({
        title: "Student Removed",
        description: `${student.student_first_name} ${student.student_last_name} has been unlinked`,
      });

      fetchLinks();
    } catch (error) {
      console.error('Error removing student:', error);
      toast({
        title: "Error",
        description: "Failed to remove student",
        variant: "destructive",
      });
    } finally {
      setRemovingId(null);
    }
  };

  if (loading || isLoadingLinks) {
    return (
      <>
        <Navigation />
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </>
    );
  }

  if (!user || profile?.account_type !== 'parent') {
    return null;
  }

  return (
    <>
      <Navigation />
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 pt-20 px-4">
        <div className="container max-w-5xl mx-auto py-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">Manage Linked Students</h1>
            <p className="text-muted-foreground">
              Review and manage students linked to your account
            </p>
          </div>

          <div className="space-y-6">
            {/* Pending Requests Section */}
            {pendingRequests.length > 0 && (
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        Link Requests
                        <Badge variant="destructive">{pendingRequests.length}</Badge>
                      </CardTitle>
                      <CardDescription>
                        Students waiting for your approval
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {pendingRequests.map((request) => (
                      <div
                        key={request.id}
                        className="flex items-center justify-between p-4 border rounded-lg bg-card"
                      >
                        <div className="space-y-1">
                          <p className="font-semibold text-lg">
                            {request.student_first_name} {request.student_last_name}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {request.student_email}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Requested {new Date(request.created_at).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleDeny(
                              request.id,
                              `${request.student_first_name} ${request.student_last_name}`,
                              request.student_id
                            )}
                            disabled={processingId === request.id}
                          >
                            {processingId === request.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <>
                                <UserX className="mr-2 h-4 w-4" />
                                Deny
                              </>
                            )}
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => handleApprove(
                              request.id,
                              `${request.student_first_name} ${request.student_last_name}`,
                              request.student_id
                            )}
                            disabled={processingId === request.id}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            {processingId === request.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <>
                                <UserCheck className="mr-2 h-4 w-4" />
                                Approve
                              </>
                            )}
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Linked Students Section */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Linked Students
                </CardTitle>
                <CardDescription>
                  Students currently linked to your account
                </CardDescription>
              </CardHeader>
              <CardContent>
                {linkedStudents.length === 0 ? (
                  <div className="text-center py-8">
                    <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                    <p className="text-muted-foreground">
                      No students linked to your account yet. Students can send you link requests from their accounts.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {linkedStudents.map((student) => (
                      <div
                        key={student.id}
                        className="flex items-center justify-between p-4 border rounded-lg"
                      >
                        <div className="space-y-1">
                          <p className="font-semibold">
                            {student.student_first_name} {student.student_last_name}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {student.student_email}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Linked {new Date(student.created_at).toLocaleDateString()}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setRemovingId(student.id)}
                          className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        >
                          <AlertTriangle className="mr-2 h-4 w-4" />
                          Remove
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <AlertDialog open={!!removingId} onOpenChange={() => setRemovingId(null)}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Remove Linked Student?</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to remove{' '}
                  {removingId && linkedStudents.find(s => s.id === removingId) && (
                    <strong>
                      {linkedStudents.find(s => s.id === removingId)?.student_first_name}{' '}
                      {linkedStudents.find(s => s.id === removingId)?.student_last_name}
                    </strong>
                  )}
                  ? They will no longer be able to see your carpools.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleRemoveStudent} className="bg-destructive hover:bg-destructive/90">
                  Remove Student
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
    </>
  );
}
