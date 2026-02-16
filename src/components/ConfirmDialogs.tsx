import { useState, useEffect, ReactNode, useCallback } from "react";
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
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  AlertTriangle,
  Trash2,
  X,
  Unlink,
  LogOut,
  Loader2,
  Hand,
  Car,
  CheckCircle,
  Mail,
  Phone,
  Copy,
  Check,
  Info,
} from "lucide-react";
import { format, isValid, parseISO } from "date-fns";
import { cn } from "@/lib/utils";

/* ─── Utilities ───────────────────────────────────────────────────────── */

const safeFormat = (dateStr: string, fmt: string) => {
  if (!dateStr) return "N/A";
  try {
    const date = new Date(dateStr);
    return isValid(date) ? format(date, fmt) : dateStr;
  } catch {
    return dateStr;
  }
};

const safeTimeFormat = (timeStr: string) => {
  if (!timeStr) return "N/A";
  try {
    const date = timeStr.includes("T") ? new Date(timeStr) : parseISO(`2000-01-01T${timeStr}`);
    return isValid(date) ? format(date, "h:mm a") : timeStr;
  } catch {
    return timeStr;
  }
};

/* ─── Shared Components ───────────────────────────────────────────────── */

const CopyButton = ({ text, label }: { text: string; label: string }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleCopy}
      className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
      aria-label={`Copy ${label}`}
    >
      {copied ? (
        <Check className="h-3.5 w-3.5 text-emerald-500 animate-in zoom-in" />
      ) : (
        <Copy className="h-3.5 w-3.5" />
      )}
    </Button>
  );
};

interface ContactCardProps {
  contact:
    | {
        firstName: string;
        lastName: string;
        email: string | null;
        phone: string | null;
      }
    | null
    | undefined;
}

const ContactCard = ({ contact }: ContactCardProps) => {
  if (!contact) return null;

  return (
    <div className="bg-muted/30 border rounded-lg p-4 space-y-3 animate-in fade-in zoom-in-95 duration-300">
      <div className="flex items-center gap-2 text-sm font-medium text-foreground pb-1 border-b">
        <CheckCircle className="w-4 h-4 text-emerald-600" />
        <span>Contact Information</span>
      </div>

      <div className="space-y-2 pt-1">
        {contact.email ? (
          <div className="flex items-center justify-between gap-3 p-2 bg-background/50 rounded-md border border-transparent hover:border-border transition-colors group">
            <div className="flex items-center gap-2.5 overflow-hidden">
              <div className="p-1.5 bg-primary/10 rounded-md">
                <Mail className="h-3.5 w-3.5 text-primary shrink-0" />
              </div>
              <span className="text-sm truncate text-foreground/90">{contact.email}</span>
            </div>
            <CopyButton text={contact.email} label="email" />
          </div>
        ) : null}

        {contact.phone ? (
          <div className="flex items-center justify-between gap-3 p-2 bg-background/50 rounded-md border border-transparent hover:border-border transition-colors group">
            <div className="flex items-center gap-2.5 overflow-hidden">
              <div className="p-1.5 bg-primary/10 rounded-md">
                <Phone className="h-3.5 w-3.5 text-primary shrink-0" />
              </div>
              <span className="text-sm text-foreground/90">{contact.phone}</span>
            </div>
            <CopyButton text={contact.phone} label="phone" />
          </div>
        ) : null}

        {!contact.email && !contact.phone && (
          <div className="flex items-center gap-2 p-3 bg-background/50 rounded border border-dashed text-muted-foreground text-sm">
            <Info className="w-4 h-4 shrink-0" />
            <p>Contact info hidden. Check "My Rides" for updates.</p>
          </div>
        )}
      </div>
    </div>
  );
};

/* ─── Core: ConfirmDialog ─────────────────────────────────────────────── */

interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void | Promise<void>;
  title: string;
  description: string | ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "default" | "destructive";
  loading?: boolean;
  icon?: ReactNode;
  /** If provided, user must type this string to enable the confirm button. */
  verificationText?: string;
  /** If true, the dialog will stay open if onConfirm throws an error. */
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
  const isVerificationMatched = inputVal === verificationText;
  const isLoading = loading || internalLoading;

  const handleConfirm = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (isVerificationRequired && !isVerificationMatched) return;

    setError(null);
    setInternalLoading(true);

    try {
      await onConfirm();
      // Parent handles closing via props usually
    } catch (err) {
      console.error("Dialog Action Failed:", err);
      setError(err instanceof Error ? err.message : "An unexpected error occurred.");
      if (!keepOpenOnError) {
        onOpenChange(false);
      }
    } finally {
      setInternalLoading(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-[400px] md:max-w-[480px] gap-6">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-start gap-3 text-xl">
            {icon && <div className="mt-0.5 shrink-0">{icon}</div>}
            {title}
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-4 pt-1 text-base">
              <div className="text-muted-foreground leading-relaxed">{description}</div>

              {/* Internal Error Display */}
              {error && (
                <Alert variant="destructive" className="animate-in fade-in zoom-in-95">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Error</AlertTitle>
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {/* Safety Verification Input */}
              {isVerificationRequired && (
                <div className="space-y-3 pt-2">
                  <Label className="text-xs font-semibold uppercase text-muted-foreground tracking-wide">
                    Type <span className="text-destructive font-bold select-all mx-0.5">"{verificationText}"</span> to
                    confirm
                  </Label>
                  <Input
                    value={inputVal}
                    onChange={(e) => setInputVal(e.target.value)}
                    placeholder={verificationText}
                    className="font-mono text-sm bg-muted/50"
                    autoComplete="off"
                    disabled={isLoading}
                  />
                </div>
              )}
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="gap-2 sm:gap-0">
          <AlertDialogCancel disabled={isLoading} className="mt-0">
            {cancelLabel}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={isLoading || (isVerificationRequired && !isVerificationMatched)}
            className={cn(
              isDestructive ? "bg-destructive text-destructive-foreground hover:bg-destructive/90" : "",
              "w-full sm:w-auto min-w-[100px]",
            )}
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Processing...
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

/* ─── Specific Implementations ────────────────────────────────────────── */

// 1. Delete Carpool (High Risk)
export const DeleteRideDialog = (props: Omit<ConfirmDialogProps, "title" | "description" | "verificationText">) => (
  <ConfirmDialog
    {...props}
    title="Delete Carpool"
    description={
      <span className="block">
        Are you sure? This will <span className="font-semibold text-destructive">permanently remove</span> the ride and
        notify all participants. This action cannot be undone.
      </span>
    }
    confirmLabel="Delete Forever"
    variant="destructive"
    icon={<Trash2 className="w-6 h-6 text-destructive" />}
    verificationText="delete"
  />
);

// 2. Cancel Request
export const CancelRequestDialog = ({
  recipientName,
  ...props
}: { recipientName: string } & Omit<ConfirmDialogProps, "title" | "description">) => (
  <ConfirmDialog
    {...props}
    title="Cancel Ride Request?"
    description={
      <span>
        <strong className="text-foreground">{recipientName}</strong> will be notified that you've cancelled this
        request.
      </span>
    }
    confirmLabel="Cancel Request"
    cancelLabel="Keep Request"
    variant="destructive"
    icon={<X className="w-6 h-6 text-destructive" />}
  />
);

// 3. Decline Request (With Reason Input)
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

  useEffect(() => {
    if (!open) setReason("");
  }, [open]);

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-[480px]">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-3 text-destructive">
            <X className="w-6 h-6" />
            Decline Request from {senderName}?
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-4 pt-2">
              <p>They will be notified. You can optionally explain why.</p>
              <div className="space-y-2">
                <Label htmlFor="decline-reason">Reason (Optional)</Label>
                <Textarea
                  id="decline-reason"
                  placeholder="e.g., Schedule conflict, car is full..."
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  rows={3}
                  maxLength={200}
                  className="resize-none bg-muted/30"
                />
                <p className="text-xs text-muted-foreground text-right tabular-nums">{reason.length}/200</p>
              </div>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>Go Back</AlertDialogCancel>
          <Button
            variant="destructive"
            onClick={() => onConfirm(reason.trim() || undefined)}
            disabled={loading}
            className="min-w-[140px]"
          >
            {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : "Decline Request"}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

// 4. Unified Instant Connection (Join/Offer)
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
  onClose,
}: InstantConnectionProps) => {
  const handleClose = () => {
    onClose?.();
    onOpenChange(false);
  };

  if (showSuccess && contactInfo) {
    return (
      <AlertDialog open={open} onOpenChange={handleClose}>
        <AlertDialogContent className="max-w-[480px]">
          <AlertDialogHeader>
            <div className="mx-auto w-12 h-12 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center mb-2">
              <CheckCircle className="w-6 h-6 text-emerald-600 dark:text-emerald-500" />
            </div>
            <AlertDialogTitle className="text-center text-emerald-700 dark:text-emerald-400">
              {mode === "join" ? "Ride Joined!" : "Ride Confirmed!"}
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-6 pt-2 text-center">
                <p>
                  You are now connected with{" "}
                  <strong>
                    {contactInfo.firstName} {contactInfo.lastName}
                  </strong>
                  .
                </p>
                <div className="text-left">
                  <ContactCard contact={contactInfo} />
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="sm:justify-center">
            <AlertDialogAction onClick={handleClose} className="w-full sm:w-auto min-w-[120px]">
              Done
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    );
  }

  const isJoin = mode === "join";
  const title = isJoin ? "Join this ride?" : "Fulfill this request?";
  const actionLabel = isJoin ? "Join Ride" : "Confirm Ride";
  const Icon = isJoin ? Hand : Car;

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      onConfirm={onConfirm}
      loading={loading}
      title={title}
      confirmLabel={actionLabel}
      icon={<Icon className="w-6 h-6 text-primary" />}
      description={
        <div className="space-y-4">
          <p className="leading-relaxed">
            {isJoin ? "Join" : "Fulfill"} <strong>{targetName}</strong>'s {isJoin ? "ride" : "request"} on{" "}
            <span className="font-semibold text-foreground whitespace-nowrap">
              {safeFormat(rideDate, "EEEE, MMMM d")}
            </span>{" "}
            at <span className="font-semibold text-foreground whitespace-nowrap">{safeTimeFormat(rideTime)}</span>?
          </p>
          <div className="flex items-start gap-3 p-3 bg-blue-50/50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-800 rounded-lg text-sm">
            <Info className="w-4 h-4 text-blue-600 dark:text-blue-400 mt-0.5 shrink-0" />
            <p className="text-blue-700 dark:text-blue-300">
              You will be connected immediately and can coordinate pickup details directly.
            </p>
          </div>
        </div>
      }
    />
  );
};

export const InstantJoinRideDialog = (
  props: Omit<InstantConnectionProps, "mode" | "targetName"> & { ownerName: string },
) => <InstantConnectionDialog {...props} mode="join" targetName={props.ownerName} />;

export const InstantOfferRideDialog = (
  props: Omit<InstantConnectionProps, "mode" | "targetName"> & { requesterName: string },
) => <InstantConnectionDialog {...props} mode="offer" targetName={props.requesterName} />;

// 5. Unlink Account
export const UnlinkDialog = ({
  personName,
  isParent,
  ...props
}: { personName: string; isParent?: boolean } & Omit<ConfirmDialogProps, "title" | "description">) => (
  <ConfirmDialog
    {...props}
    title={`Unlink from ${personName}?`}
    description={
      isParent
        ? "This student will no longer be linked to your account. They won't be able to see your carpools."
        : "You will no longer see their carpools. You can request to link again later."
    }
    confirmLabel="Unlink Account"
    variant="destructive"
    icon={<Unlink className="w-6 h-6 text-destructive" />}
  />
);

// 6. Sign Out
export const SignOutDialog = (props: Omit<ConfirmDialogProps, "title" | "description">) => (
  <ConfirmDialog
    {...props}
    title="Sign Out?"
    description="You'll need to log in again to access your account."
    confirmLabel="Sign Out"
    icon={<LogOut className="w-6 h-6" />}
  />
);

// 7. Unsaved Changes
export const UnsavedChangesDialog = ({
  open,
  onOpenChange,
  onLeave,
  onStay,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onLeave: () => void;
  onStay?: () => void;
}) => {
  const handleStay = () => {
    onStay?.();
    onOpenChange(false);
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-3 text-amber-600">
            <AlertTriangle className="w-6 h-6" />
            Unsaved Changes
          </AlertDialogTitle>
          <AlertDialogDescription>
            You have unsaved changes. Are you sure you want to leave? Your progress will be lost.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={handleStay}>Stay on Page</AlertDialogCancel>
          <AlertDialogAction onClick={onLeave} className="bg-amber-600 hover:bg-amber-700 text-white">
            Leave without saving
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

// 8. Join Ride (Request-based)
export const JoinRideDialog = ({
  ownerName,
  ...props
}: { ownerName: string } & Omit<ConfirmDialogProps, "title" | "description">) => (
  <ConfirmDialog
    {...props}
    title="Send request to join?"
    icon={<Hand className="w-6 h-6 text-primary" />}
    confirmLabel="Send Request"
    description={
      <div className="space-y-2">
        <p>
          Your request will be sent to <strong>{ownerName}</strong>.
        </p>
        <p className="text-sm text-muted-foreground">They must approve your request before you're added.</p>
      </div>
    }
  />
);

// 9. Offer Ride (Request-based)
export const OfferRideDialog = ({
  requesterName,
  ...props
}: { requesterName: string } & Omit<ConfirmDialogProps, "title" | "description">) => (
  <ConfirmDialog
    {...props}
    title="Offer your ride?"
    icon={<Car className="w-6 h-6 text-primary" />}
    confirmLabel="Send Offer"
    description={
      <div className="space-y-2">
        <p>
          <strong>{requesterName}</strong> will receive your offer.
        </p>
        <p className="text-sm text-muted-foreground">They must accept it before the ride is confirmed.</p>
      </div>
    }
  />
);
