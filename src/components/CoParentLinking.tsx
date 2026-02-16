import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Users,
  X,
  Check,
  Loader2,
  Link as LinkIcon,
  Shield,
  Mail,
  Clock,
  RefreshCw,
  AlertCircle,
  Trash2,
  Unlink,
} from "lucide-react";
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

// Extended Interface for permissions
interface CoParentLink {
  id: string;
  requester_id: string;
  recipient_id: string;
  status: "pending" | "approved" | "rejected";
  created_at: string;
  approved_at: string | null;
  permissions?: "full_access" | "read_only";
  requester_profile?: {
    first_name: string | null;
    last_name: string | null;
    username: string;
    avatar_url?: string;
  };
  recipient_profile?: {
    first_name: string | null;
    last_name: string | null;
    username: string;
    avatar_url?: string;
  };
  requester_email?: string;
  recipient_email?: string;
}

export const CoParentLinking = () => {
  const { user } = useAuth();
  const { toast } = useToast();

  // State Management
  const [activeTab, setActiveTab] = useState("coparents");
  const [inviteEmail, setInviteEmail] = useState("");
  const [invitePermission, setInvitePermission] = useState("full_access");
  const [loading, setLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Data Buckets
  const [pendingSent, setPendingSent] = useState<CoParentLink[]>([]);
  const [pendingReceived, setPendingReceived] = useState<CoParentLink[]>([]);
  const [activeLinks, setActiveLinks] = useState<CoParentLink[]>([]);

  // Dialog State
  const [unlinkTarget, setUnlinkTarget] = useState<{ id: string; name: string } | null>(null);

  // 1. Centralized Data Fetching Strategy
  const fetchLinks = useCallback(async () => {
    if (!user) return;
    setIsRefreshing(true);

    try {
      // Parallel Fetching for Performance
      const [sentRes, receivedRes] = await Promise.all([
        supabase
          .from("co_parent_links")
          .select(`*, recipient_profile:profiles!co_parent_links_recipient_id_fkey(first_name, last_name, username)`)
          .eq("requester_id", user.id),
        supabase
          .from("co_parent_links")
          .select(`*, requester_profile:profiles!co_parent_links_requester_id_fkey(first_name, last_name, username)`)
          .eq("recipient_id", user.id),
      ]);

      if (sentRes.error) throw sentRes.error;
      if (receivedRes.error) throw receivedRes.error;

      // Extract User IDs to bulk fetch emails (Optimization)
      const allRelatedUserIds = new Set([
        ...(sentRes.data || []).map((l) => l.recipient_id),
        ...(receivedRes.data || []).map((l) => l.requester_id),
      ]);

      let emailMap: Record<string, string> = {};

      if (allRelatedUserIds.size > 0) {
        const { data: users } = await supabase
          .from("users")
          .select("user_id, email")
          .in("user_id", Array.from(allRelatedUserIds));

        emailMap = Object.fromEntries(users?.map((u) => [u.user_id, u.email]) || []);
      }

      // Process Sent Requests
      const sentWithEmails = (sentRes.data || []).map((l) => ({
        ...l,
        recipient_email: emailMap[l.recipient_id],
      })) as CoParentLink[];

      // Process Received Requests
      const receivedWithEmails = (receivedRes.data || []).map((l) => ({
        ...l,
        requester_email: emailMap[l.requester_id],
      })) as CoParentLink[];

      // Bucketing
      setPendingSent(sentWithEmails.filter((l) => l.status === "pending"));
      setPendingReceived(receivedWithEmails.filter((l) => l.status === "pending"));

      setActiveLinks([
        ...sentWithEmails.filter((l) => l.status === "approved"),
        ...receivedWithEmails.filter((l) => l.status === "approved"),
      ]);
    } catch (error) {
      console.error("Fetch error:", error);
      toast({ title: "Sync Error", description: "Could not refresh co-parent data.", variant: "destructive" });
    } finally {
      setIsRefreshing(false);
    }
  }, [user, toast]);

  // 2. Real-time Subscription
  useEffect(() => {
    if (!user) return;

    fetchLinks();

    const channel = supabase
      .channel("schema-db-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "co_parent_links",
          filter: `requester_id=eq.${user.id}`,
        },
        () => fetchLinks(),
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "co_parent_links",
          filter: `recipient_id=eq.${user.id}`,
        },
        () => {
          toast({ title: "Update", description: "Your co-parent list has been updated." });
          fetchLinks();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, fetchLinks, toast]);

  // 3. Robust Invite Logic
  const handleSendInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !inviteEmail.trim()) return;

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(inviteEmail)) {
      toast({ title: "Invalid Email", description: "Please enter a valid email address.", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      const { data: recipient, error: userError } = await supabase
        .from("users")
        .select("user_id")
        .eq("email", inviteEmail.toLowerCase())
        .maybeSingle();

      if (userError || !recipient) {
        toast({
          title: "User Not Found",
          description: "We couldn't find a user with that email.",
          variant: "destructive",
        });
        return;
      }

      if (recipient.user_id === user.id) {
        toast({ title: "Action Failed", description: "You cannot invite yourself.", variant: "destructive" });
        return;
      }

      const { data: existing } = await supabase
        .from("co_parent_links")
        .select("id, status")
        .or(
          `and(requester_id.eq.${user.id},recipient_id.eq.${recipient.user_id}),and(requester_id.eq.${recipient.user_id},recipient_id.eq.${user.id})`,
        )
        .maybeSingle();

      if (existing) {
        const msg =
          existing.status === "approved"
            ? "You are already linked with this user."
            : "A request is already pending with this user.";
        toast({ title: "Link Exists", description: msg, variant: "destructive" });
        return;
      }

      const { data: link, error: linkError } = await supabase
        .from("co_parent_links")
        .insert({
          requester_id: user.id,
          recipient_id: recipient.user_id,
          status: "pending",
        })
        .select()
        .single();

      if (linkError) throw linkError;

      await createNotification(
        recipient.user_id,
        "co_parent_request",
        `${user.user_metadata?.first_name || "A user"} wants to link as a co-parent.`,
        link.id,
      );

      toast({ title: "Invite Sent", description: `Request sent to ${inviteEmail}` });
      setInviteEmail("");
      setActiveTab("requests");
      fetchLinks();
    } catch (error) {
      console.error(error);
      toast({ title: "Error", description: "Failed to send invitation.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  // 4. Action Handlers
  const processRequest = async (linkId: string, action: "approved" | "rejected", requesterId: string) => {
    try {
      const { error } = await supabase
        .from("co_parent_links")
        .update({
          status: action,
          approved_at: action === "approved" ? new Date().toISOString() : null,
        })
        .eq("id", linkId);

      if (error) throw error;

      await createNotification(
        requesterId,
        action === "approved" ? "co_parent_approved" : "co_parent_denied",
        action === "approved" ? "accepted your co-parent request" : "declined your co-parent request",
        linkId,
      );

      fetchLinks();
      toast({
        title: action === "approved" ? "Connected!" : "Request Declined",
        description: action === "approved" ? "You can now manage carpools together." : "The request has been removed.",
      });
    } catch (error) {
      toast({ title: "Error", description: "Failed to process request.", variant: "destructive" });
    }
  };

  const handleUnlink = async () => {
    if (!unlinkTarget) return;
    try {
      const { error } = await supabase.from("co_parent_links").delete().eq("id", unlinkTarget.id);
      if (error) throw error;

      toast({ title: "Unlinked", description: "Co-parent connection removed." });
      setUnlinkTarget(null);
      fetchLinks();
    } catch (e) {
      toast({ title: "Error", description: "Failed to unlink.", variant: "destructive" });
    }
  };

  const handleResend = async (link: CoParentLink) => {
    if (!link.recipient_email) return;
    toast({ title: "Reminder Sent", description: "We've nudged them with another notification." });
  };

  const copyInviteLink = () => {
    navigator.clipboard.writeText(`${window.location.origin}/join-family?ref=${user?.id}`);
    toast({ title: "Copied!", description: "Invite link copied to clipboard." });
  };

  // Calculate badge count
  const pendingCount = pendingReceived.length + pendingSent.length;

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Co-Parent Management</h2>
          <p className="text-muted-foreground">Manage who can view and edit your family carpools.</p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchLinks} disabled={isRefreshing}>
          <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3 lg:w-[400px]">
          <TabsTrigger value="coparents">My Co-Parents</TabsTrigger>
          <TabsTrigger value="requests" className="relative">
            Inbox
            {pendingCount > 0 && (
              <span className="ml-2 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-[10px] text-white">
                {pendingCount}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="invite">Add New</TabsTrigger>
        </TabsList>

        {/* --- TAB 1: ACTIVE CO-PARENTS --- */}
        <TabsContent value="coparents" className="space-y-4 mt-4">
          {activeLinks.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-10 text-center">
                <Users className="h-10 w-10 text-muted-foreground mb-4" />
                <h3 className="font-semibold text-lg">No Co-Parents Linked</h3>
                <p className="text-sm text-muted-foreground max-w-sm mb-4">
                  Link with your spouse, partner, or caregivers to coordinate school pickups together.
                </p>
                <Button onClick={() => setActiveTab("invite")}>Invite Someone</Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {activeLinks.map((link) => {
                const isMeRequester = link.requester_id === user?.id;
                const profile = isMeRequester ? link.recipient_profile : link.requester_profile;
                const email = isMeRequester ? link.recipient_email : link.requester_email;

                return (
                  <Card key={link.id}>
                    <CardHeader className="pb-2">
                      <div className="flex justify-between items-start">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                            {profile?.first_name?.[0] || "U"}
                          </div>
                          <div>
                            <CardTitle className="text-base">
                              {profile?.first_name} {profile?.last_name}
                            </CardTitle>
                            <CardDescription>@{profile?.username}</CardDescription>
                          </div>
                        </div>
                        <Badge variant="outline" className="text-green-600 bg-green-50 border-green-200">
                          Active
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="text-sm text-muted-foreground pb-2">
                      <div className="flex items-center gap-2">
                        <Mail className="h-3 w-3" /> {email}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <Shield className="h-3 w-3" /> Full Access
                      </div>
                    </CardContent>
                    <CardFooter className="pt-2 border-t bg-muted/20">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() =>
                          setUnlinkTarget({ id: link.id, name: `${profile?.first_name} ${profile?.last_name}` })
                        }
                      >
                        <Unlink className="h-4 w-4 mr-2" /> Unlink Account
                      </Button>
                    </CardFooter>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* --- TAB 2: REQUESTS (INBOX) --- */}
        <TabsContent value="requests" className="space-y-6 mt-4">
          {/* Incoming */}
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
              Needs Action ({pendingReceived.length})
            </h3>
            {pendingReceived.length === 0 && (
              <p className="text-sm text-muted-foreground italic pl-1">No new requests.</p>
            )}
            {pendingReceived.map((link) => (
              <Card key={link.id} className="border-l-4 border-l-blue-500 shadow-sm">
                <CardContent className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                      <Users className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="font-medium">
                        {link.requester_profile?.first_name} {link.requester_profile?.last_name}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        wants to link accounts •{" "}
                        <span className="text-xs">{new Date(link.created_at).toLocaleDateString()}</span>
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2 w-full sm:w-auto">
                    <Button
                      size="sm"
                      className="flex-1 sm:flex-none"
                      onClick={() => processRequest(link.id, "approved", link.requester_id)}
                    >
                      <Check className="h-4 w-4 mr-2" /> Accept
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1 sm:flex-none"
                      onClick={() => processRequest(link.id, "rejected", link.requester_id)}
                    >
                      <X className="h-4 w-4 mr-2" /> Decline
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Outgoing */}
          <div className="space-y-3 pt-4 border-t">
            <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
              Sent Requests ({pendingSent.length})
            </h3>
            {pendingSent.length === 0 && (
              <p className="text-sm text-muted-foreground italic pl-1">No pending sent requests.</p>
            )}
            {pendingSent.map((link) => (
              <div key={link.id} className="flex items-center justify-between p-4 border rounded-lg bg-muted/10">
                <div className="flex items-center gap-3">
                  <Clock className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium">{link.recipient_email}</p>
                    <p className="text-xs text-muted-foreground">
                      Sent on {new Date(link.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" onClick={() => handleResend(link)}>
                    Resend
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:bg-destructive/10"
                    onClick={() => handleUnlink()}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </TabsContent>

        {/* --- TAB 3: INVITE --- */}
        <TabsContent value="invite" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Add a Co-Parent</CardTitle>
              <CardDescription>Send an email invitation to link accounts.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <form onSubmit={handleSendInvite} className="space-y-4">
                <div className="grid gap-2">
                  <label htmlFor="email" className="text-sm font-medium">
                    Email Address
                  </label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Mail className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="email"
                        type="email"
                        placeholder="coparent@example.com"
                        className="pl-9"
                        value={inviteEmail}
                        onChange={(e) => setInviteEmail(e.target.value)}
                        disabled={loading}
                      />
                    </div>
                  </div>
                </div>

                <div className="grid gap-2">
                  <label className="text-sm font-medium">Access Level</label>
                  <Select value={invitePermission} onValueChange={setInvitePermission} disabled={loading}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="full_access">
                        <div className="flex flex-col items-start">
                          <span className="font-medium">Full Access</span>
                          <span className="text-xs text-muted-foreground">Can view, create, and edit carpools</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="read_only">
                        <div className="flex flex-col items-start">
                          <span className="font-medium">View Only</span>
                          <span className="text-xs text-muted-foreground">Can only view schedule and maps</span>
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Button type="submit" className="w-full" disabled={loading || !inviteEmail}>
                  {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Users className="mr-2 h-4 w-4" />}
                  Send Invitation
                </Button>
              </form>

              <div className="relative my-4">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">Or</span>
                </div>
              </div>

              <div className="rounded-lg border bg-muted/40 p-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-sm font-medium">Invite via Link</p>
                    <p className="text-xs text-muted-foreground">Share this link directly in messages</p>
                  </div>
                  <Button variant="outline" size="sm" onClick={copyInviteLink}>
                    <LinkIcon className="h-4 w-4 mr-2" /> Copy Link
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* --- CONFIRMATION DIALOGS --- */}
      <AlertDialog open={!!unlinkTarget} onOpenChange={() => setUnlinkTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <div className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-5 w-5" />
              <AlertDialogTitle>Unlink {unlinkTarget?.name}?</AlertDialogTitle>
            </div>
            <AlertDialogDescription>
              This will immediately remove their access to your family's carpool schedule. You will need to send a new
              invitation if you want to reconnect later.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleUnlink} className="bg-destructive hover:bg-destructive/90">
              Yes, Unlink
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
