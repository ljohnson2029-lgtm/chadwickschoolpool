import { useState, ReactNode } from "react";
import ChildrenRidingSelector from "@/components/ChildrenRidingSelector";
import VehicleSelector from "@/components/VehicleSelector";
import { type VehicleInfo } from "@/hooks/useVehicles";
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
import { AlertTriangle, Trash2, X, Unlink, LogOut, Loader2, Hand, Car, CheckCircle, Mail, Phone, Copy, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";

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
}: ConfirmDialogProps) => {
  const handleConfirm = async () => {
    await onConfirm();
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            {icon}
            {title}
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div>{description}</div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>{cancelLabel}</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={loading}
            className={
              variant === "destructive"
                ? "bg-destructive text-destructive-foreground hover:bg-destructive/90"
                : ""
            }
          >
            {loading ? (
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

// Delete Carpool/Ride Dialog
interface DeleteRideDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void | Promise<void>;
  loading?: boolean;
}

export const DeleteRideDialog = ({
  open,
  onOpenChange,
  onConfirm,
  loading = false,
}: DeleteRideDialogProps) => (
  <ConfirmDialog
    open={open}
    onOpenChange={onOpenChange}
    onConfirm={onConfirm}
    title="Delete Carpool?"
    description="Are you sure you want to delete this carpool? This cannot be undone. Other parents will no longer be able to see or respond to it."
    confirmLabel="Delete Carpool"
    cancelLabel="Cancel"
    variant="destructive"
    loading={loading}
    icon={<Trash2 className="w-5 h-5 text-destructive" />}
  />
);

// Cancel Ride Request Dialog
interface CancelRequestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void | Promise<void>;
  recipientName: string;
  loading?: boolean;
}

export const CancelRequestDialog = ({
  open,
  onOpenChange,
  onConfirm,
  recipientName,
  loading = false,
}: CancelRequestDialogProps) => (
  <ConfirmDialog
    open={open}
    onOpenChange={onOpenChange}
    onConfirm={onConfirm}
    title="Cancel Ride Request?"
    description={`${recipientName} will be notified that you've cancelled this request.`}
    confirmLabel="Cancel Request"
    cancelLabel="Keep Request"
    variant="destructive"
    loading={loading}
    icon={<X className="w-5 h-5 text-destructive" />}
  />
);

// Decline Request Dialog with optional reason
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

  const handleConfirm = async () => {
    await onConfirm(reason.trim() || undefined);
    setReason("");
  };

  const handleClose = (isOpen: boolean) => {
    if (!isOpen) {
      setReason("");
    }
    onOpenChange(isOpen);
  };

  return (
    <AlertDialog open={open} onOpenChange={handleClose}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <X className="w-5 h-5 text-destructive" />
            Decline Request from {senderName}?
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-4">
              <p>They will be notified that you declined. You can optionally provide a reason.</p>
              <div className="space-y-2">
                <Label htmlFor="decline-reason" className="text-foreground">
                  Reason (optional)
                </Label>
                <Textarea
                  id="decline-reason"
                  placeholder="e.g., Schedule conflict, car is full..."
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  rows={2}
                  maxLength={200}
                />
              </div>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>Go Back</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={loading}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Declining...
              </>
            ) : (
              "Decline Request"
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

// Unlink Account Dialog
interface UnlinkDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void | Promise<void>;
  personName: string;
  isParent?: boolean;
  loading?: boolean;
}

export const UnlinkDialog = ({
  open,
  onOpenChange,
  onConfirm,
  personName,
  isParent = false,
  loading = false,
}: UnlinkDialogProps) => (
  <ConfirmDialog
    open={open}
    onOpenChange={onOpenChange}
    onConfirm={onConfirm}
    title={`Unlink from ${personName}?`}
    description={
      isParent
        ? "This student will no longer be linked to your account. They won't be able to see your carpools."
        : "You will no longer see their carpools. You can request to link again later."
    }
    confirmLabel="Unlink"
    cancelLabel="Cancel"
    variant="destructive"
    loading={loading}
    icon={<Unlink className="w-5 h-5 text-destructive" />}
  />
);

// Sign Out Dialog
interface SignOutDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void | Promise<void>;
  loading?: boolean;
}

export const SignOutDialog = ({
  open,
  onOpenChange,
  onConfirm,
  loading = false,
}: SignOutDialogProps) => (
  <ConfirmDialog
    open={open}
    onOpenChange={onOpenChange}
    onConfirm={onConfirm}
    title="Sign Out?"
    description="You'll need to log in again to access your account."
    confirmLabel="Sign Out"
    cancelLabel="Cancel"
    variant="default"
    loading={loading}
    icon={<LogOut className="w-5 h-5" />}
  />
);

// Unsaved Changes Dialog
interface UnsavedChangesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onLeave: () => void;
  onStay?: () => void;
}

export const UnsavedChangesDialog = ({
  open,
  onOpenChange,
  onLeave,
  onStay,
}: UnsavedChangesDialogProps) => {
  const handleStay = () => {
    onStay?.();
    onOpenChange(false);
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-yellow-500" />
            Unsaved Changes
          </AlertDialogTitle>
          <AlertDialogDescription>
            You have unsaved changes. Are you sure you want to leave? Your changes will be lost.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={handleStay}>Stay on Page</AlertDialogCancel>
          <AlertDialogAction onClick={onLeave}>Leave</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

// Join Ride Dialog (for responding to a ride offer)
interface JoinRideDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void | Promise<void>;
  ownerName: string;
  loading?: boolean;
}

export const JoinRideDialog = ({
  open,
  onOpenChange,
  onConfirm,
  ownerName,
  loading = false,
}: JoinRideDialogProps) => (
  <ConfirmDialog
    open={open}
    onOpenChange={onOpenChange}
    onConfirm={onConfirm}
    title="Send request to join this ride?"
    description={
      <div className="space-y-3">
        <p>
          Your request will be sent to <strong>{ownerName}</strong>. They must approve your request before you're added to the ride.
        </p>
        <p className="text-sm text-muted-foreground">
          You'll be notified when they respond to your request.
        </p>
      </div>
    }
    confirmLabel="Send Join Request"
    cancelLabel="Cancel"
    variant="default"
    loading={loading}
    icon={<Hand className="w-5 h-5 text-primary" />}
  />
);

// Offer Ride Dialog (for responding to a ride request)
interface OfferRideDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void | Promise<void>;
  requesterName: string;
  loading?: boolean;
}

export const OfferRideDialog = ({
  open,
  onOpenChange,
  onConfirm,
  requesterName,
  loading = false,
}: OfferRideDialogProps) => (
  <ConfirmDialog
    open={open}
    onOpenChange={onOpenChange}
    onConfirm={onConfirm}
    title="Offer your ride to fulfill this request?"
    description={
      <div className="space-y-3">
        <p>
          <strong>{requesterName}</strong> will receive your offer and must accept it before the ride is confirmed.
        </p>
        <p className="text-sm text-muted-foreground">
          You'll be notified when they respond to your offer.
        </p>
      </div>
    }
    confirmLabel="Send Ride Offer"
    cancelLabel="Cancel"
    variant="default"
    loading={loading}
    icon={<Car className="w-5 h-5 text-primary" />}
  />
);

// Instant Join Ride Dialog (with child selection)
interface InstantJoinRideDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (selectedChildIds?: string[]) => void | Promise<void>;
  ownerName: string;
  rideDate: string;
  rideTime: string;
  loading?: boolean;
  showSuccess?: boolean;
  ownerContact?: {
    firstName: string;
    lastName: string;
    email: string | null;
    phone: string | null;
  } | null;
  onClose?: () => void;
  maxSeats?: number | null;
}

export const InstantJoinRideDialog = ({
  open,
  onOpenChange,
  onConfirm,
  ownerName,
  rideDate,
  rideTime,
  loading = false,
  showSuccess = false,
  ownerContact,
  onClose,
  maxSeats,
}: InstantJoinRideDialogProps) => {
  const [selectedChildIds, setSelectedChildIds] = useState<string[]>([]);
  const [childError, setChildError] = useState<string | null>(null);

  const handleClose = () => {
    onClose?.();
    onOpenChange(false);
  };

  const handleConfirm = () => {
    if (selectedChildIds.length === 0) {
      setChildError("Please select at least one child for this ride");
      return;
    }
    setChildError(null);
    onConfirm(selectedChildIds);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const formatDisplayDate = (dateStr: string) => {
    if (!dateStr) return '';
    try {
      return format(new Date(dateStr), 'EEEE, MMMM d');
    } catch {
      return dateStr;
    }
  };

  const formatDisplayTime = (timeStr: string) => {
    if (!timeStr) return '';
    try {
      return format(new Date(`2000-01-01T${timeStr}`), 'h:mm a');
    } catch {
      return timeStr;
    }
  };

  if (showSuccess && ownerContact) {
    return (
      <AlertDialog open={open} onOpenChange={handleClose}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-green-600">
              <CheckCircle className="w-5 h-5" />
              You've joined the ride!
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-4">
                <p>
                  You're now connected with <strong>{ownerContact.firstName} {ownerContact.lastName}</strong>.
                  Contact them to coordinate pickup details.
                </p>
                <div className="bg-muted rounded-lg p-4 space-y-3">
                  <p className="font-medium text-foreground">Contact Information:</p>
                  {ownerContact.email && (
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 text-foreground">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">{ownerContact.email}</span>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => copyToClipboard(ownerContact.email!)}
                        className="h-8 px-2"
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                  )}
                  {ownerContact.phone && (
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 text-foreground">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">{ownerContact.phone}</span>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => copyToClipboard(ownerContact.phone!)}
                        className="h-8 px-2"
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                  )}
                  {!ownerContact.email && !ownerContact.phone && (
                    <p className="text-sm text-muted-foreground">
                      Contact info not shared. Check the My Rides page for updates.
                    </p>
                  )}
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={handleClose}>
              Done
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    );
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <Hand className="w-5 h-5 text-primary" />
            Children Riding on This Trip
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-4">
              <p>
                Join <strong>{ownerName}</strong>'s ride on <strong>{formatDisplayDate(rideDate)}</strong> at <strong>{formatDisplayTime(rideTime)}</strong>?
              </p>
              <ChildrenRidingSelector
                selectedChildIds={selectedChildIds}
                onSelectionChange={(ids) => { setSelectedChildIds(ids); setChildError(null); }}
                error={childError}
                maxSeats={maxSeats}
              />
              <p className="text-sm text-muted-foreground">
                You'll be connected immediately and can coordinate pickup details.
              </p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleConfirm} disabled={loading || (maxSeats != null && selectedChildIds.length > maxSeats)}>
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Joining...
              </>
            ) : (
              "Join Ride"
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

// Instant Offer Ride Dialog (with child selection)
interface InstantOfferRideDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (selectedChildIds?: string[], vehicleInfo?: VehicleInfo) => void | Promise<void>;
  requesterName: string;
  rideDate: string;
  rideTime: string;
  loading?: boolean;
  showSuccess?: boolean;
  requesterContact?: {
    firstName: string;
    lastName: string;
    email: string | null;
    phone: string | null;
  } | null;
  onClose?: () => void;
  maxSeats?: number | null;
}

export const InstantOfferRideDialog = ({
  open,
  onOpenChange,
  onConfirm,
  requesterName,
  rideDate,
  rideTime,
  loading = false,
  showSuccess = false,
  requesterContact,
  onClose,
  maxSeats,
}: InstantOfferRideDialogProps) => {
  const [selectedChildIds, setSelectedChildIds] = useState<string[]>([]);
  const [childError, setChildError] = useState<string | null>(null);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null);
  const [selectedVehicleInfo, setSelectedVehicleInfo] = useState<VehicleInfo | null>(null);

  const handleClose = () => {
    onClose?.();
    onOpenChange(false);
  };

  const handleConfirm = () => {
    if (selectedChildIds.length === 0) {
      setChildError("Please select at least one child for this ride");
      return;
    }
    setChildError(null);
    onConfirm(selectedChildIds, selectedVehicleInfo || undefined);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const formatDisplayDate = (dateStr: string) => {
    if (!dateStr) return '';
    try {
      return format(new Date(dateStr), 'EEEE, MMMM d');
    } catch {
      return dateStr;
    }
  };

  const formatDisplayTime = (timeStr: string) => {
    if (!timeStr) return '';
    try {
      return format(new Date(`2000-01-01T${timeStr}`), 'h:mm a');
    } catch {
      return timeStr;
    }
  };

  if (showSuccess && requesterContact) {
    return (
      <AlertDialog open={open} onOpenChange={handleClose}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-green-600">
              <CheckCircle className="w-5 h-5" />
              Ride confirmed!
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-4">
                <p>
                  You're now connected with <strong>{requesterContact.firstName} {requesterContact.lastName}</strong>.
                  Contact them to coordinate pickup details.
                </p>
                <div className="bg-muted rounded-lg p-4 space-y-3">
                  <p className="font-medium text-foreground">Contact Information:</p>
                  {requesterContact.email && (
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 text-foreground">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">{requesterContact.email}</span>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => copyToClipboard(requesterContact.email!)}
                        className="h-8 px-2"
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                  )}
                  {requesterContact.phone && (
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 text-foreground">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">{requesterContact.phone}</span>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => copyToClipboard(requesterContact.phone!)}
                        className="h-8 px-2"
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                  )}
                  {!requesterContact.email && !requesterContact.phone && (
                    <p className="text-sm text-muted-foreground">
                      Contact info not shared. Check the My Rides page for updates.
                    </p>
                  )}
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={handleClose}>
              Done
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    );
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <Car className="w-5 h-5 text-primary" />
            Fulfill Ride Request
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-4">
              <p>
                Fulfill <strong>{requesterName}</strong>'s ride request on <strong>{formatDisplayDate(rideDate)}</strong> at <strong>{formatDisplayTime(rideTime)}</strong>?
              </p>
              {maxSeats != null && (
                <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-800 p-3">
                  <Info className="h-4 w-4 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
                  <p className="text-amber-700 dark:text-amber-300 text-sm">
                    Please make sure you have enough room for {maxSeats} seat{maxSeats !== 1 ? 's' : ''} needed for this ride request
                  </p>
                </div>
              )}
              <ChildrenRidingSelector
                selectedChildIds={selectedChildIds}
                onSelectionChange={(ids) => { setSelectedChildIds(ids); setChildError(null); }}
                error={childError}
              />
              <p className="text-sm text-muted-foreground">
                You'll be connected immediately and can coordinate pickup details.
              </p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleConfirm} disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Confirming...
              </>
            ) : (
              "Confirm Ride"
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};