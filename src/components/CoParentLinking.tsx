import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, X, Check, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { createNotification } from "@/lib/notifications";
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

interface CoParentLink {
  id: string;
  requester_id: string;
  recipient_id: string;
  status: string;
  created_at: string;
  approved_at: string | null;
  requester_profile?: {
    first_name: string | null;
    last_name: string | null;
    username: string;
  };
  recipient_profile?: {
    first_name: string | null;
    last_name: string | null;
    username: string;
  };
  requester_email?: string;
  recipient_email?: string;
}

export const CoParentLinking = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [pendingRequests, setPendingRequests] = useState<CoParentLink[]>([]);
  const [receivedRequests, setReceivedRequests] = useState<CoParentLink[]>([]);
  const [linkedCoParents, setLinkedCoParents] = useState<CoParentLink[]>([]);
  const [unlinkId, setUnlinkId] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      fetchLinks();
    }
  }, [user]);

  const fetchLinks = async () => {
    if (!user) return;

    // Fetch sent requests
    const { data: sent } = await supabase
      .from("co_parent_links")
      .select(
        `
        *,
        recipient_profile:profiles!co_parent_links_recipient_id_fkey(first_name, last_name, username)
      `
      )
      .eq("requester_id", user.id);

    // Fetch received requests
    const { data: received } = await supabase
      .from("co_parent_links")
      .select(
        `
        *,
        requester_profile:profiles!co_parent_links_requester_id_fkey(first_name, last_name, username)
      `
      )
      .eq("recipient_id", user.id);

    // Get emails for linked users
    if (sent) {
      const userIds = sent.map((l) => l.recipient_id);
      const { data: users } = await supabase
        .from("users")
        .select("user_id, email")
        .in("user_id", userIds);

      const emailMap = Object.fromEntries(
        users?.map((u) => [u.user_id, u.email]) || []
      );

      const pending = sent
        .filter((l) => l.status === "pending")
        .map((l) => ({ ...l, recipient_email: emailMap[l.recipient_id] }));
      const approved = sent
        .filter((l) => l.status === "approved")
        .map((l) => ({ ...l, recipient_email: emailMap[l.recipient_id] }));

      setPendingRequests(pending);
      setLinkedCoParents(approved);
    }

    if (received) {
      const userIds = received.map((l) => l.requester_id);
      const { data: users } = await supabase
        .from("users")
        .select("user_id, email")
        .in("user_id", userIds);

      const emailMap = Object.fromEntries(
        users?.map((u) => [u.user_id, u.email]) || []
      );

      const pending = received
        .filter((l) => l.status === "pending")
        .map((l) => ({ ...l, requester_email: emailMap[l.requester_id] }));

      setReceivedRequests(pending);
    }
  };

  const handleSendRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !email.trim()) return;

    setLoading(true);
    try {
      // Find recipient by email
      const { data: recipientUser, error: userError } = await supabase
        .from("users")
        .select("user_id")
        .eq("email", email.toLowerCase())
        .maybeSingle();

      if (userError || !recipientUser) {
        toast({
          title: "Error",
          description: "No account found with this email address.",
          variant: "destructive",
        });
        return;
      }

      if (recipientUser.user_id === user.id) {
        toast({
          title: "Error",
          description: "You cannot link to your own account.",
          variant: "destructive",
        });
        return;
      }

      // Check if link already exists
      const { data: existing } = await supabase
        .from("co_parent_links")
        .select("id")
        .or(
          `and(requester_id.eq.${user.id},recipient_id.eq.${recipientUser.user_id}),and(requester_id.eq.${recipientUser.user_id},recipient_id.eq.${user.id})`
        )
        .maybeSingle();

      if (existing) {
        toast({
          title: "Error",
          description: "A link request already exists with this user.",
          variant: "destructive",
        });
        return;
      }

      // Create link request
      const { data: link, error: linkError } = await supabase
        .from("co_parent_links")
        .insert({
          requester_id: user.id,
          recipient_id: recipientUser.user_id,
          status: "pending",
        })
        .select()
        .single();

      if (linkError) throw linkError;

      // Send notification
      await createNotification(
        recipientUser.user_id,
        "co_parent_request",
        "wants to link as a co-parent on your family account",
        link.id
      );

      toast({
        title: "Success",
        description: "Co-parent link request sent!",
      });

      setEmail("");
      fetchLinks();
    } catch (error) {
      console.error("Error sending request:", error);
      toast({
        title: "Error",
        description: "Failed to send request. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (linkId: string, requesterId: string) => {
    try {
      const { error } = await supabase
        .from("co_parent_links")
        .update({ status: "approved", approved_at: new Date().toISOString() })
        .eq("id", linkId);

      if (error) throw error;

      await createNotification(
        requesterId,
        "co_parent_approved",
        "approved your co-parent link request",
        linkId
      );

      toast({
        title: "Success",
        description: "Co-parent link approved!",
      });

      fetchLinks();
    } catch (error) {
      console.error("Error approving link:", error);
      toast({
        title: "Error",
        description: "Failed to approve link.",
        variant: "destructive",
      });
    }
  };

  const handleDeny = async (linkId: string, requesterId: string) => {
    try {
      const { error } = await supabase
        .from("co_parent_links")
        .update({ status: "rejected" })
        .eq("id", linkId);

      if (error) throw error;

      await createNotification(
        requesterId,
        "co_parent_denied",
        "denied your co-parent link request",
        linkId
      );

      toast({
        title: "Request denied",
        description: "Co-parent link request has been denied.",
      });

      fetchLinks();
    } catch (error) {
      console.error("Error denying link:", error);
      toast({
        title: "Error",
        description: "Failed to deny link.",
        variant: "destructive",
      });
    }
  };

  const handleCancelRequest = async (linkId: string) => {
    try {
      const { error } = await supabase
        .from("co_parent_links")
        .delete()
        .eq("id", linkId);

      if (error) throw error;

      toast({
        title: "Request cancelled",
        description: "Your co-parent link request has been cancelled.",
      });

      fetchLinks();
    } catch (error) {
      console.error("Error cancelling request:", error);
      toast({
        title: "Error",
        description: "Failed to cancel request.",
        variant: "destructive",
      });
    }
  };

  const handleUnlink = async () => {
    if (!unlinkId) return;

    try {
      const { error } = await supabase
        .from("co_parent_links")
        .delete()
        .eq("id", unlinkId);

      if (error) throw error;

      toast({
        title: "Unlinked",
        description: "Co-parent has been unlinked from your account.",
      });

      setUnlinkId(null);
      fetchLinks();
    } catch (error) {
      console.error("Error unlinking:", error);
      toast({
        title: "Error",
        description: "Failed to unlink co-parent.",
        variant: "destructive",
      });
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Request to Add Co-Parent
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSendRequest} className="space-y-4">
            <div>
              <Input
                type="email"
                placeholder="Enter co-parent's email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
              />
              <p className="text-sm text-muted-foreground mt-2">
                Link another adult/parent to help manage your family's carpools
              </p>
            </div>
            <Button type="submit" disabled={loading || !email.trim()}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                "Send Request"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {receivedRequests.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Received Co-Parent Requests</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {receivedRequests.map((link) => (
              <div
                key={link.id}
                className="flex items-center justify-between p-3 border rounded-lg"
              >
                <div>
                  <p className="font-medium">
                    {link.requester_profile?.first_name}{" "}
                    {link.requester_profile?.last_name}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    @{link.requester_profile?.username}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {link.requester_email}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => handleApprove(link.id, link.requester_id)}
                  >
                    <Check className="h-4 w-4 mr-1" />
                    Approve
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDeny(link.id, link.requester_id)}
                  >
                    <X className="h-4 w-4 mr-1" />
                    Deny
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {pendingRequests.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Pending Requests</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {pendingRequests.map((link) => (
              <div
                key={link.id}
                className="flex items-center justify-between p-3 border rounded-lg"
              >
                <div>
                  <p className="font-medium">
                    {link.recipient_profile?.first_name}{" "}
                    {link.recipient_profile?.last_name}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    @{link.recipient_profile?.username}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {link.recipient_email}
                  </p>
                  <Badge variant="secondary" className="mt-1">
                    Pending
                  </Badge>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleCancelRequest(link.id)}
                >
                  Cancel
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {linkedCoParents.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Linked Co-Parents</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {linkedCoParents.map((link) => (
              <div
                key={link.id}
                className="flex items-center justify-between p-3 border rounded-lg"
              >
                <div>
                  <p className="font-medium">
                    {link.recipient_profile?.first_name}{" "}
                    {link.recipient_profile?.last_name}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    @{link.recipient_profile?.username}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {link.recipient_email}
                  </p>
                  <Badge className="mt-1 bg-green-500/10 text-green-600">
                    Linked
                  </Badge>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setUnlinkId(link.id)}
                >
                  Unlink
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <AlertDialog open={!!unlinkId} onOpenChange={() => setUnlinkId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unlink Co-Parent?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove the co-parent's access to manage your family's
              carpools. This action can be reversed by sending a new link
              request.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleUnlink}>Unlink</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
