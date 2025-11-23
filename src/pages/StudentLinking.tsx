import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2, UserPlus, X, Unlink, Users } from "lucide-react";
import { createNotification, NotificationMessages } from "@/lib/notifications";
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

interface LinkedParent {
  id: string;
  parent_id: string;
  parent_email: string;
  parent_first_name: string;
  parent_last_name: string;
  status: string;
  created_at: string;
}

export default function StudentLinking() {
  const { user, profile, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [parentEmail, setParentEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pendingRequests, setPendingRequests] = useState<LinkedParent[]>([]);
  const [linkedParents, setLinkedParents] = useState<LinkedParent[]>([]);
  const [isLoadingLinks, setIsLoadingLinks] = useState(true);
  const [unlinkingId, setUnlinkingId] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && (!user || profile?.account_type !== 'student')) {
      navigate('/');
    }
  }, [user, profile, loading, navigate]);

  useEffect(() => {
    if (user && profile?.account_type === 'student') {
      fetchLinks();
    }
  }, [user, profile]);

  const fetchLinks = async () => {
    setIsLoadingLinks(true);
    try {
      const { data: links, error } = await supabase
        .from('account_links')
        .select(`
          id,
          parent_id,
          status,
          created_at,
          users!account_links_parent_id_fkey (
            email,
            first_name,
            last_name
          )
        `)
        .eq('student_id', user?.id);

      if (error) throw error;

      const formattedLinks = links?.map((link: any) => ({
        id: link.id,
        parent_id: link.parent_id,
        parent_email: link.users.email,
        parent_first_name: link.users.first_name,
        parent_last_name: link.users.last_name,
        status: link.status,
        created_at: link.created_at,
      })) || [];

      setPendingRequests(formattedLinks.filter((l: LinkedParent) => l.status === 'pending'));
      setLinkedParents(formattedLinks.filter((l: LinkedParent) => l.status === 'approved'));
    } catch (error) {
      console.error('Error fetching links:', error);
      toast({
        title: "Error",
        description: "Failed to load linking information",
        variant: "destructive",
      });
    } finally {
      setIsLoadingLinks(false);
    }
  };

  const validateEmail = (email: string): string | null => {
    if (!email) return "Please enter an email address";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return "Please enter a valid email address";
    if (email.toLowerCase().endsWith('@chadwickschool.org')) {
      return "This email belongs to a student account. Please enter a parent's email.";
    }
    return null;
  };

  const handleSendRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const validationError = validateEmail(parentEmail);
    if (validationError) {
      toast({
        title: "Invalid Email",
        description: validationError,
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // Check if parent exists using edge function
      const { data: parentData, error: lookupError } = await supabase.functions.invoke('lookup-parent', {
        body: { parentEmail: parentEmail.toLowerCase() },
      });

      if (lookupError) throw lookupError;

      if (!parentData?.exists) {
        toast({
          title: "Parent Not Found",
          description: "No account found with this email",
          variant: "destructive",
        });
        return;
      }

      const parentId = parentData.userId;

      // Check for existing link
      const { data: existingLink, error: checkError } = await supabase
        .from('account_links')
        .select('status')
        .eq('student_id', user?.id)
        .eq('parent_id', parentId)
        .maybeSingle();

      if (checkError) throw checkError;

      if (existingLink) {
        if (existingLink.status === 'pending') {
          toast({
            title: "Request Already Sent",
            description: "You already have a pending request with this parent",
            variant: "destructive",
          });
          return;
        }
        if (existingLink.status === 'approved') {
          toast({
            title: "Already Linked",
            description: "You're already linked to this parent",
            variant: "destructive",
          });
          return;
        }
      }

      // Create link request
      const { data: newLink, error: insertError } = await supabase
        .from('account_links')
        .insert({
          student_id: user?.id,
          parent_id: parentId,
          status: 'pending',
        })
        .select()
        .single();

      if (insertError) throw insertError;

      // Create notification for parent
      const studentName = `${profile?.first_name || ''} ${profile?.last_name || ''}`.trim() || 'A student';
      await createNotification(
        parentId,
        'link_request',
        NotificationMessages.linkRequest(studentName, user?.email || ''),
        newLink.id
      );

      toast({
        title: "Request Sent!",
        description: `Link request sent to ${parentEmail}`,
      });

      setParentEmail("");
      fetchLinks();
    } catch (error) {
      console.error('Error sending link request:', error);
      toast({
        title: "Error",
        description: "Failed to send link request. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancelRequest = async (linkId: string) => {
    try {
      // Get link details before deleting
      const { data: linkData } = await supabase
        .from('account_links')
        .select('parent_id')
        .eq('id', linkId)
        .single();

      const { error } = await supabase
        .from('account_links')
        .delete()
        .eq('id', linkId);

      if (error) throw error;

      // Notify parent that request was cancelled
      if (linkData?.parent_id) {
        const studentName = `${profile?.first_name || ''} ${profile?.last_name || ''}`.trim() || 'A student';
        await createNotification(
          linkData.parent_id,
          'student_unlinked',
          NotificationMessages.studentUnlinked(studentName)
        );
      }

      toast({
        title: "Request Cancelled",
        description: "Link request has been cancelled",
      });

      fetchLinks();
    } catch (error) {
      console.error('Error cancelling request:', error);
      toast({
        title: "Error",
        description: "Failed to cancel request",
        variant: "destructive",
      });
    }
  };

  const handleUnlink = async () => {
    if (!unlinkingId) return;

    try {
      // Get link details before deleting
      const { data: linkData } = await supabase
        .from('account_links')
        .select('parent_id')
        .eq('id', unlinkingId)
        .single();

      const { error } = await supabase
        .from('account_links')
        .delete()
        .eq('id', unlinkingId);

      if (error) throw error;

      // Notify parent that student unlinked
      if (linkData?.parent_id) {
        const studentName = `${profile?.first_name || ''} ${profile?.last_name || ''}`.trim() || 'A student';
        await createNotification(
          linkData.parent_id,
          'student_unlinked',
          NotificationMessages.studentUnlinked(studentName)
        );
      }

      toast({
        title: "Unlinked",
        description: "You have been unlinked from this parent",
      });

      fetchLinks();
    } catch (error) {
      console.error('Error unlinking:', error);
      toast({
        title: "Error",
        description: "Failed to unlink",
        variant: "destructive",
      });
    } finally {
      setUnlinkingId(null);
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

  if (!user || profile?.account_type !== 'student') {
    return null;
  }

  return (
    <>
      <Navigation />
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 pt-20 px-4">
        <div className="container max-w-4xl mx-auto py-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">Link to Parent Account</h1>
            <p className="text-muted-foreground">
              Connect with your parent's account to let them schedule rides for you
            </p>
          </div>

          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserPlus className="h-5 w-5" />
                Send Link Request
              </CardTitle>
              <CardDescription>
                Enter the email your parent used to register (not @chadwickschool.org)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSendRequest} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="parentEmail">Parent's Email Address</Label>
                  <Input
                    id="parentEmail"
                    type="email"
                    placeholder="parent@example.com"
                    value={parentEmail}
                    onChange={(e) => setParentEmail(e.target.value)}
                    disabled={isSubmitting}
                  />
                </div>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Sending Request...
                    </>
                  ) : (
                    <>
                      <UserPlus className="mr-2 h-4 w-4" />
                      Send Link Request
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>

          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Pending Requests</CardTitle>
              </CardHeader>
              <CardContent>
                {pendingRequests.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No pending requests</p>
                ) : (
                  <div className="space-y-3">
                    {pendingRequests.map((request) => (
                      <div
                        key={request.id}
                        className="flex items-start justify-between p-3 border rounded-lg"
                      >
                        <div className="space-y-1">
                          <p className="font-medium text-sm">{request.parent_email}</p>
                          <p className="text-xs text-muted-foreground">
                            Sent {new Date(request.created_at).toLocaleDateString()}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleCancelRequest(request.id)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Linked Parents
                </CardTitle>
              </CardHeader>
              <CardContent>
                {linkedParents.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    You haven't linked to any parents yet
                  </p>
                ) : (
                  <div className="space-y-3">
                    {linkedParents.map((parent) => (
                      <div
                        key={parent.id}
                        className="flex items-start justify-between p-3 border rounded-lg"
                      >
                        <div className="space-y-1">
                          <p className="font-medium text-sm">
                            {parent.parent_first_name} {parent.parent_last_name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {parent.parent_email}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setUnlinkingId(parent.id)}
                        >
                          <Unlink className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <AlertDialog open={!!unlinkingId} onOpenChange={() => setUnlinkingId(null)}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Unlink from Parent?</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to unlink from this parent? You'll no longer see their carpools.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleUnlink}>Unlink</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
    </>
  );
}
