import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import ChildrenRidingSelector from "@/components/ChildrenRidingSelector";
import VehicleSelector from "@/components/VehicleSelector";
import { type VehicleInfo } from "@/hooks/useVehicles";
import { Loader2, UserCheck, Info } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface AcceptDirectRideDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (selectedChildIds: string[], vehicleInfo?: VehicleInfo) => void;
  senderName: string;
  rideType: string;
  maxSeats: number | null;
  loading?: boolean;
  isAcceptorDriver?: boolean;
}

export const AcceptDirectRideDialog = ({ open, onClose, onConfirm, senderName, rideType, maxSeats, loading, isAcceptorDriver }: AcceptDirectRideDialogProps) => {
  const [selectedChildIds, setSelectedChildIds] = useState<string[]>([]);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null);
  const [selectedVehicleInfo, setSelectedVehicleInfo] = useState<VehicleInfo | null>(null);

  // For ride requests, the acceptor is the driver — no seat restriction, just a notice
  const isRequestType = rideType === 'request';
  const effectiveMaxSeats = isRequestType ? null : maxSeats;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Accept Direct Ride {rideType === 'offer' ? 'Offer' : 'Request'}</DialogTitle>
          <DialogDescription>
            Select which of your children will be on this ride with {senderName}.
          </DialogDescription>
        </DialogHeader>

        {isRequestType && maxSeats != null && (
          <Alert className="border-amber-200 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-800">
            <Info className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            <AlertDescription className="text-amber-700 dark:text-amber-300 text-sm">
              Please make sure you have enough room for {maxSeats} seat{maxSeats !== 1 ? 's' : ''} needed for this ride request
            </AlertDescription>
          </Alert>
        )}
        
        <ChildrenRidingSelector
          selectedChildIds={selectedChildIds}
          onSelectionChange={setSelectedChildIds}
          maxSeats={effectiveMaxSeats}
        />

        {isAcceptorDriver && (
          <VehicleSelector
            selectedVehicleId={selectedVehicleId}
            onSelect={(id, info) => { setSelectedVehicleId(id); setSelectedVehicleInfo(info); }}
          />
        )}
        
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button 
            onClick={() => onConfirm(selectedChildIds, isAcceptorDriver ? selectedVehicleInfo || undefined : undefined)} 
            disabled={selectedChildIds.length === 0 || loading || (!isRequestType && maxSeats != null && selectedChildIds.length > maxSeats)}
            className="gap-1"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserCheck className="h-4 w-4" />}
            Accept Ride
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
