This is a **comprehensive, production-grade refactor**. It is designed to be the "source of truth" for all confirmation interactions in your app.

### 🚀 Key Enhancements in this Version:

1. **Self-Contained Utilities**: Included `cn`, safe date formatters, and clipboard logic directly in the file to prevent "Module not found" build errors.
2. **"Type-to-Confirm" Safety**: For destructive actions (like deleting a ride), users must type a specific phrase (e.g., "delete") to enable the button.
3. **Internal Error Boundaries**: If your API call fails, the dialog stays open and shows the error message inline instead of crashing the UI.
4. **Rich Visual Feedback**: Added success states, clipboard animations, and distinct visual styles for "Warning" vs "Destructive" actions.
5. **Unified Architecture**: Reduced code duplication by creating a powerful "Master Dialog" primitive that powers the smaller, specific dialogs.

Copy the entire block below into `components/dialogs.tsx`.

```tsx
import React, { useState, useEffect, ReactNode } from "react";
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
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { 
  AlertTriangle, Trash2, X, Unlink, LogOut, Loader2, Hand, Car, 
  CheckCircle2, Mail, Phone, Copy, Check, Info, ShieldAlert
} from "lucide-react";
import { format, isValid, parseISO } from "date-fns";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

// ============================================================================
// 1. UTILITIES & HELPERS (Included here to prevent build errors)
// ============================================================================

/** Combines tailwind classes safely */
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Safely formats dates without crashing on null/invalid inputs */
const safeFormatDate = (dateStr: string, fmt: string = "EEEE, MMMM d") => {
  if (!dateStr) return "N/A";
  try {
    const date = new Date(dateStr);
    return isValid(date) ? format(date, fmt) : dateStr;
  } catch {
    return dateStr;
  }
};

/** Safely formats times, handling both ISO strings and HH:mm:ss */
const safeFormatTime = (timeStr: string) => {
  if (!timeStr) return "N/A";
  try {
    const date = timeStr.includes("T") 
      ? new Date(timeStr) 
      : parseISO(`2000-01-01T${timeStr}`);
    return isValid(date) ? format(date, 'h:mm a') : timeStr;
  } catch {
    return timeStr;
  }
};

// ============================================================================
// 2. MICRO-COMPONENTS (Visual building blocks)
// ============================================================================

const CopyButton = ({ text, label }: { text: string; label: string }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={handleCopy}
      className="h-7 w-7 text-muted-foreground hover:text-foreground hover:bg-background/80"
      aria-label={`Copy ${label}`}
      title={`Copy ${label}`}
    >
      {copied ? (
        <Check className="h-3.5 w-3.5 text-emerald-500 animate-in zoom-in spin-in-90 duration-300" />
      ) : (
        <Copy className="h-3.5 w-3.5" />
      )}
    </Button>
  );
};

interface ContactInfoProps {
  data: {
    firstName: string;
    lastName: string;
    email: string | null;
    phone: string | null;
  } | null | undefined;
}

const ContactCard = ({ data }: ContactInfoProps) => {
  if (!data) return null;

  const hasEmail = !!data.email;
  const hasPhone = !!data.phone;

  return (
    <div className="mt-4 rounded-lg border bg-card text-card-foreground shadow-sm animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div className="flex items-center gap-2 border-b bg-muted/40 p-3">
        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/50">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
        </div>
        <span className="text-sm font-semibold">Contact Information</span>
      </div>
      
      <div className="p-3 space-y-2">
        {hasEmail && (
          <div className="group flex items-center justify-between rounded-md border border-transparent px-2 py-1.5 hover:border-border hover:bg-muted/50 transition-all">
            <div className="flex items-center gap-3 overflow-hidden">
              <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
              <div className="flex flex-col">
                <span className="text-[10px] uppercase font-bold text-muted-foreground">Email</span>
                <span className="text-sm font-medium truncate max-w-[200px]">{data.email}</span>
              </div>
            </div>
            <CopyButton text={data.email!} label="email" />
          </div>
        )}

        {hasPhone && (
          <div className="group flex items-center justify-between rounded-md border border-transparent px-2 py-1.5 hover:border-border hover:bg-muted/50 transition-all">
            <div className="flex items-center gap-3 overflow-hidden">
              <Phone className="h-4 w-4 text-muted-foreground shrink-0" />
              <div className="flex flex-col">
                <span className="text-[10px] uppercase font-bold text-muted-foreground">Phone</span>
                <span className="text-sm font-medium">{data.phone}</span>
              </div>
            </div>
            <CopyButton text={data.phone!} label="phone" />
          </div>
        )}

        {!hasEmail && !hasPhone && (
          <div className="flex items-center gap-2 p-2 text-sm text-muted-foreground bg-muted/20 rounded">
            <Info className="h-4 w-4" />
            <span>Details hidden. Check "My Rides" later.</span>
          </div>
        )}
      </div>
    </div>
  );
};

// ============================================================================
// 3. MASTER DIALOG PRIMITIVE
// ============================================================================

interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void | Promise<void>;
  title: string;
  description: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "default" | "destructive" | "warning";
  loading?: boolean;
  icon?: ReactNode;
  /** If provided, user must type this phrase to enable the button */
  verificationText?: string; 
  /** Should the dialog close automatically on error? Default: false */
  keepOpenOnError?: boolean;
}

export const ConfirmDialog = ({
  open,
  onOpenChange,
  onConfirm,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  variant = "default",
  loading = false,
  icon,
  verificationText,
  keepOpenOnError = true,
}: ConfirmDialogProps) => {
  const [inputVal, setInputVal] = useState("");
  const [internalLoading, setInternalLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset state when dialog opens/closes
  useEffect(() => {
    if (!open) {
      setInputVal("");
      setError(null);
      setInternalLoading(false);
    }
  }, [open]);

  const isDestructive = variant === "destructive";
  const isVerificationRequired = !!verificationText;
  
  // Case-insensitive check for better UX (e.g., "delete" matches "DELETE")
  const isVerificationMatched = isVerificationRequired 
    ? inputVal.trim().toLowerCase() === verificationText?.trim().toLowerCase() 
    : true;
  
  const isLoading = loading || internalLoading;

  const handleConfirm = async (e: React.MouseEvent) => {
    // Prevent default to stop the dialog from closing immediately
    e.preventDefault();
    
    if (isVerificationRequired && !isVerificationMatched) return;

    setError(null);
    setInternalLoading(true);

    try {
      await onConfirm();
      // On success, we assume the parent closes the dialog via props (standard React pattern)
    } catch (err) {
      console.error("Dialog Action Failed:", err);
      setError(err instanceof Error ? err.message : "An unexpected error occurred. Please try again.");
      if (!keepOpenOnError) {
        onOpenChange(false);
      }
    } finally {
      setInternalLoading(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-[400px] md:max-w-[480px] overflow-hidden gap-0 p-0 shadow-xl border-none">
        
        {/* Header Section */}
        <div className="p-6 pb-4">
          <AlertDialogHeader>
            <div className="flex items-start gap-4">
              {icon && (
                <div className={cn(
                  "mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border",
                  isDestructive ? "bg-red-50 border-red-100 text-red-600" : 
                  variant === "warning" ? "bg-amber-50 border-amber-100 text-amber-600" : 
                  "bg-blue-50 border-blue-100 text-blue-600"
                )}>
                  {icon}
                </div>
              )}
              <div className="grid gap-1">
                <AlertDialogTitle className="text-xl font-bold tracking-tight">
                  {title}
                </AlertDialogTitle>
                <div className="text-sm text-muted-foreground leading-relaxed">
                  {description}
                </div>
              </div>
            </div>
          </AlertDialogHeader>

          {/* Error Boundary Display */}
          {error && (
            <div className="mt-4 flex items-center gap-2 rounded-md bg-destructive/10 p-3 text-sm text-destructive animate-in fade-in slide-in-from-top-1">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span className="font-medium">{error}</span>
            </div>
          )}

          {/* Type-To-Confirm Input Area */}
          {isVerificationRequired && (
            <div className="mt-4 space-y-2 rounded-lg border bg-muted/30 p-3 animate-in fade-in">
              <Label className="text-xs font-bold uppercase text-muted-foreground">
                To confirm, type <span className="select-all text-destructive">"{verificationText}"</span>
              </Label>
              <Input 
                value={inputVal}
                onChange={(e) => setInputVal(e.target.value)}
                placeholder={verificationText}
                className="font-mono text-sm border-muted-foreground/20 focus-visible:ring-destructive/30 bg-background"
                autoComplete="off"
                disabled={isLoading}
              />
            </div>
          )}
        </div>

        {/* Footer / Actions Section */}
        <AlertDialogFooter className="bg-muted/50 p-4 sm:justify-end sm:gap-2">
          <AlertDialogCancel disabled={isLoading} className="mt-0 h-10 border-transparent bg-transparent hover:bg-muted-foreground/10">
            {cancelLabel}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={isLoading || (isVerificationRequired && !isVerificationMatched)}
            className={cn(
              "h-10 px-6 transition-all duration-200 min-w-[100px]",
              isDestructive 
                ? "bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-sm shadow-destructive/20" 
                : "bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm shadow-primary/20"
            )}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                <span>Working...</span>
              </>
            ) : (
              confirmLabel
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

// ============================================================================
// 4. SPECIFIC DIALOG IMPLEMENTATIONS
// ============================================================================

// --- A. DELETE CARPOOL (Destructive + Safety Check) ---
export const DeleteRideDialog = (props: Omit<ConfirmDialogProps, "title" | "description" | "verificationText">) => (
  <ConfirmDialog
    {...props}
    title="Delete Carpool"
    description="This will permanently delete the carpool and notify all active participants. This action cannot be undone."
    confirmLabel="Delete Forever"
    variant="destructive"
    icon={<Trash2 className="h-5 w-5" />}
    verificationText="delete" 
  />
);

// --- B. CANCEL REQUEST (Destructive) ---
export const CancelRequestDialog = ({ recipientName, ...props }: { recipientName: string } & Omit<ConfirmDialogProps, "title" | "description">) => (
  <ConfirmDialog
    {...props}
    title="Cancel Request?"
    description={
      <span>
        Are you sure you want to cancel your request to <strong className="text-foreground">{recipientName}</strong>? They will be notified immediately.
      </span>
    }
    confirmLabel="Yes, Cancel"
    cancelLabel="Keep Request"
    variant="destructive"
    icon={<X className="h-5 w-5" />}
  />
);

// --- C. DECLINE REQUEST (Custom Input Logic) ---
interface DeclineRequestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (reason?: string) => void | Promise<void>;
  senderName: string;
  loading?: boolean;
}

export const DeclineRequestDialog = ({
  open,
  onOpenChange,
  onConfirm,
  senderName,
  loading = false,
}: DeclineRequestDialogProps) => {
  const [reason, setReason] = useState("");
  
  // Clean up on close
  useEffect(() => { if (!open) setReason(""); }, [open]);

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-[480px] p-0 overflow-hidden border-none shadow-xl">
        <div className="p-6 pb-4">
          <AlertDialogHeader>
            <div className="flex items-start gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-50 text-red-600">
                <X className="h-5 w-5" />
              </div>
              <div>
                <AlertDialogTitle className="text-xl">Decline Request</AlertDialogTitle>
                <AlertDialogDescription className="mt-2">
                  You are declining the request from <strong className="text-foreground">{senderName}</strong>.
                </AlertDialogDescription>
              </div>
            </div>
          </AlertDialogHeader>

          <div className="mt-4 space-y-2">
            <Label htmlFor="reason" className="text-xs font-semibold uppercase text-muted-foreground">
              Reason (Optional)
            </Label>
            <Textarea
              id="reason"
              placeholder="e.g. My car is full, Schedule conflict..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              maxLength={200}
              className="resize-none bg-muted/20"
            />
            <div className="flex justify-end">
              <span className="text-[10px] text-muted-foreground">{reason.length}/200</span>
            </div>
          </div>
        </div>

        <AlertDialogFooter className="bg-muted/50 p-4">
          <AlertDialogCancel disabled={loading} className="mt-0 bg-transparent border-transparent">Back</AlertDialogCancel>
          <Button
            variant="destructive"
            onClick={() => onConfirm(reason.trim() || undefined)}
            disabled={loading}
            className="min-w-[120px]"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Decline Request"}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

// --- D. UNIFIED CONNECTION DIALOG (Handles both Join & Offer) ---
interface InstantConnectionProps {
  mode: "join" | "offer"; 
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void | Promise<void>;
  targetName: string;
  rideDate: string;
  rideTime: string;
  loading?: boolean;
  showSuccess?: boolean;
  contactInfo?: { firstName: string; lastName: string; email: string | null; phone: string | null } | null;
  onClose?: () => void;
}

const InstantConnectionDialog = ({
  mode,
  open,
  onOpenChange,
  onConfirm,
  targetName,
  rideDate,
  rideTime,
  loading,
  showSuccess,
  contactInfo,
  onClose
}: InstantConnectionProps) => {
  
  const handleClose = () => {
    onClose?.();
    onOpenChange(false);
  };

  // SUCCESS STATE: Replaces the confirmation dialog entirely
  if (showSuccess && contactInfo) {
    return (
      <AlertDialog open={open} onOpenChange={handleClose}>
        <AlertDialogContent className="max-w-[480px] p-0 overflow-hidden border-none shadow-2xl animate-in zoom-in-95">
          {/* Success Banner */}
          <div className="bg-emerald-600 p-6 text-center text-white">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm">
              <Check className="h-6 w-6 text-white" />
            </div>
            <h2 className="text-2xl font-bold">
              {mode === "join" ? "Ride Joined!" : "Offer Sent!"}
            </h2>
            <p className="mt-2 text-emerald-100">
              You are now connected with {contactInfo.firstName}.
            </p>
          </div>
          
          <div className="p-6">
            <ContactCard data={contactInfo} />
          </div>

          <AlertDialogFooter className="p-6 pt-0 sm:justify-center">
            <Button onClick={handleClose} size="lg" className="w-full sm:w-auto min-w-[150px]">
              Done
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    );
  }

  // CONFIRMATION STATE
  const isJoin = mode === "join";
  const title = isJoin ? "Join this Ride?" : "Fulfill Request?";
  const actionLabel = isJoin ? "Confirm Join" : "Confirm Offer";
  const Icon = isJoin ? Hand : Car;

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      onConfirm={onConfirm}
      loading={loading}
      title={title}
      confirmLabel={actionLabel}
      icon={<Icon className="h-5 w-5" />}
      description={
        <div className="space-y-4">
          <p>
            You are about to {isJoin ? "join" : "offer a ride to"} <strong>{targetName}</strong> on:
          </p>
          <div className="flex items-center gap-3 rounded-md bg-muted p-3 text-sm border">
            <div className="grid gap-0.5">
              <span className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider">Date</span>
              <span className="font-semibold text-foreground">{safeFormatDate(rideDate)}</span>
            </div>
            <div className="h-8 w-px bg-border mx-2" />
            <div className="grid gap-0.5">
              <span className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider">Time</span>
              <span className="font-semibold text-foreground">{safeFormatTime(rideTime)}</span>
            </div>
          </div>
          <div className="flex gap-2 rounded-md bg-blue-50/50 p-2 text-xs text-blue-700 dark:bg-blue-900/20 dark:text-blue-300">
            <Info className="h-4 w-4 shrink-0 mt-0.5" />
            <p>Contact details will be shared immediately upon confirmation.</p>
          </div>
        </div>
      }
    />
  );
};

export const InstantJoinRideDialog = (props: Omit<InstantConnectionProps, "mode" | "targetName"> & { ownerName: string }) => (
  <InstantConnectionDialog {...props} mode="join" targetName={props.ownerName} />
);

export const InstantOfferRideDialog = (props: Omit<InstantConnectionProps, "mode" | "targetName"> & { requesterName: string }) => (
  <InstantConnectionDialog {...props} mode="offer" targetName={props.requesterName} />
);

// --- E. OTHER DIALOGS ---

export const UnlinkDialog = ({ personName, isParent, ...props }: { personName: string; isParent?: boolean } & Omit<ConfirmDialogProps, "title" | "description">) => (
  <ConfirmDialog
    {...props}
    title={`Unlink ${personName}?`}
    description={isParent 
      ? "They will no longer be linked to your account and cannot see your carpools." 
      : "You will no longer see their carpools. You can request to link again later."
    }
    confirmLabel="Unlink"
    variant="destructive"
    icon={<Unlink className="h-5 w-5" />}
  />
);

export const SignOutDialog = (props: Omit<ConfirmDialogProps, "title" | "description">) => (
  <ConfirmDialog
    {...props}
    title="Sign Out"
    description="Are you sure? You will need to sign in again to access your schedule."
    confirmLabel="Sign Out"
    icon={<LogOut className="h-5 w-5" />}
  />
);

export const UnsavedChangesDialog = ({ 
  open, onOpenChange, onLeave, onStay 
}: { open: boolean; onOpenChange: (o: boolean) => void; onLeave: () => void; onStay?: () => void }) => {
  const handleStay = () => {
    onStay?.();
    onOpenChange(false);
  };

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      onConfirm={async () => onLeave()}
      title="Unsaved Changes"
      description="You have unsaved changes. Leaving now will discard them."
      confirmLabel="Discard & Leave"
      cancelLabel="Stay"
      variant="warning"
      icon={<ShieldAlert className="h-5 w-5 text-amber-500" />}
    />
  );
};

// --- F. LEGACY REQUEST DIALOGS (Simple Wrappers) ---

export const JoinRideDialog = ({ ownerName, ...props }: { ownerName: string } & Omit<ConfirmDialogProps, "title" | "description">) => (
  <ConfirmDialog
    {...props}
    title="Send Request?"
    icon={<Hand className="h-5 w-5 text-primary" />}
    confirmLabel="Send Request"
    description={
      <div className="space-y-2">
        <p>Your request will be sent to <strong>{ownerName}</strong>.</p>
        <p className="text-sm text-muted-foreground">They must manually approve your request before you are added.</p>
      </div>
    }
  />
);

export const OfferRideDialog = ({ requesterName, ...props }: { requesterName: string } & Omit<ConfirmDialogProps, "title" | "description">) => (
  <ConfirmDialog
    {...props}
    title="Send Offer?"
    icon={<Car className="h-5 w-5 text-primary" />}
    confirmLabel="Send Offer"
    description={
      <div className="space-y-2">
        <p><strong>{requesterName}</strong> will receive your offer.</p>
        <p className="text-sm text-muted-foreground">They must accept it before the ride is confirmed.</p>
      </div>
    }
  />
);

```