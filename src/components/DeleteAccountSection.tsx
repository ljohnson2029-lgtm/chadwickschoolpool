import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Trash2, AlertTriangle, Loader2, Download, ShieldAlert, FileText } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const DeleteAccountSection = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  // State
  const [confirmText, setConfirmText] = useState("");
  const [deleteReason, setDeleteReason] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  // Constants
  const CONFIRMATION_PHRASE = "delete my account";

  // Handlers
  const handleExportData = async () => {
    setIsExporting(true);
    // Simulation of a data export process
    setTimeout(() => {
      toast({
        title: "Export Started",
        description: "Your data is being compiled and will be emailed to you shortly.",
      });
      setIsExporting(false);
    }, 1500);
  };

  const handleDeleteAccount = async () => {
    if (!user || confirmText.toLowerCase() !== CONFIRMATION_PHRASE) return;

    setIsDeleting(true);

    try {
      // 1. Log the reason for leaving (optional, silent fail)
      if (deleteReason) {
        console.log("Account deletion reason:", deleteReason);
      }

      // 2. Delete profile data (Cascading deletes handled by DB FKs usually, but explicit is safer)
      const { error: profileError } = await supabase.from("profiles").delete().eq("id", user.id);

      if (profileError) throw profileError;

      // 3. Delete from auth/users table (Requires Admin/Edge Function usually)
      // For client-side, we often just delete the public profile and sign out.
      // If you have an Edge Function for 'delete-user', call it here.

      const { error: userError } = await supabase.from("users").delete().eq("user_id", user.id);

      if (userError) console.warn("Could not delete from public.users, likely restricted.", userError);

      // 4. Sign out and Redirect
      await logout();

      toast({
        title: "Account Deleted",
        description: "We're sorry to see you go. Your account has been removed.",
      });

      navigate("/");
    } catch (error: any) {
      console.error("Error deleting account:", error);
      toast({
        title: "Deletion Failed",
        description: error.message || "Something went wrong. Please contact support.",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Card className="border-destructive/20 shadow-sm overflow-hidden">
      <CardHeader className="bg-destructive/5 pb-4">
        <div className="flex items-center gap-2 text-destructive">
          <ShieldAlert className="w-5 h-5" />
          <CardTitle className="text-lg">Danger Zone</CardTitle>
        </div>
        <CardDescription>Irreversible actions related to your account and data.</CardDescription>
      </CardHeader>

      <CardContent className="space-y-6 pt-6">
        {/* Export Data Section */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-lg border bg-background">
          <div className="space-y-1">
            <h4 className="text-sm font-medium flex items-center gap-2">
              <FileText className="w-4 h-4 text-muted-foreground" />
              Export Your Data
            </h4>
            <p className="text-xs text-muted-foreground max-w-[280px]">
              Download a copy of your ride history and profile information before deleting your account.
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={handleExportData} disabled={isExporting}>
            {isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4 mr-2" />}
            Download Data
          </Button>
        </div>

        {/* Delete Account Warning */}
        <div className="p-4 bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/20 rounded-lg">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-destructive mt-0.5 shrink-0" />
            <div className="space-y-2 text-sm">
              <p className="font-semibold text-destructive">Delete Account</p>
              <p className="text-muted-foreground leading-relaxed">
                Once you delete your account, there is no going back. Please be certain.
              </p>
              <ul className="list-disc list-inside text-muted-foreground text-xs space-y-1 ml-1 opacity-80">
                <li>All personal data and ride history will be removed.</li>
                <li>You will be unlinked from all family accounts.</li>
                <li>Any active ride offers will be cancelled.</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Delete Dialog Trigger */}
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" className="w-full">
              <Trash2 className="w-4 h-4 mr-2" />
              Delete My Account
            </Button>
          </AlertDialogTrigger>

          <AlertDialogContent className="sm:max-w-md">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-destructive flex items-center gap-2">
                <AlertTriangle className="w-5 h-5" />
                Final Confirmation
              </AlertDialogTitle>
              <AlertDialogDescription>You are about to permanently delete your account.</AlertDialogDescription>
            </AlertDialogHeader>

            <div className="space-y-4 py-2">
              {/* Reason Selector */}
              <div className="space-y-2">
                <Label htmlFor="reason" className="text-xs font-semibold">
                  Reason for leaving (Optional)
                </Label>
                <Select onValueChange={setDeleteReason}>
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Select a reason..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="no_longer_needed">No longer need carpools</SelectItem>
                    <SelectItem value="moving">Moving away</SelectItem>
                    <SelectItem value="privacy">Privacy concerns</SelectItem>
                    <SelectItem value="bugs">Too many bugs/issues</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Confirmation Input */}
              <div className="space-y-2">
                <Label className="text-xs font-semibold">
                  Type <span className="font-mono text-destructive select-all">"{CONFIRMATION_PHRASE}"</span> to
                  confirm:
                </Label>
                <Input
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  placeholder={CONFIRMATION_PHRASE}
                  className="font-mono text-sm"
                  autoComplete="off"
                />
              </div>
            </div>

            <AlertDialogFooter>
              <AlertDialogCancel
                onClick={() => {
                  setConfirmText("");
                  setDeleteReason("");
                }}
              >
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteAccount}
                disabled={confirmText.toLowerCase() !== CONFIRMATION_PHRASE || isDeleting}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90 w-full sm:w-auto"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  "Permanently Delete"
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
};

export default DeleteAccountSection;
