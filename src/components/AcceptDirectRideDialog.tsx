import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import ChildrenRidingSelector from "@/components/ChildrenRidingSelector";
import { Loader2, UserCheck } from "lucide-react";

interface AcceptDirectRideDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (selectedChildIds: string[]) => void;
  senderName: string;
  rideType: string;
  maxSeats: number | null;
  loading?: boolean;
}

export const AcceptDirectRideDialog = ({ open, onClose, onConfirm, senderName, rideType, maxSeats, loading }: AcceptDirectRideDialogProps) => {
  const [selectedChildIds, setSelectedChildIds] = useState<string[]>([]);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Accept Direct Ride {rideType === 'offer' ? 'Offer' : 'Request'}</DialogTitle>
          <DialogDescription>
            Select which of your children will be on this ride with {senderName}.
          </DialogDescription>
        </DialogHeader>
        
        <ChildrenRidingSelector
          selectedChildIds={selectedChildIds}
          onSelectionChange={setSelectedChildIds}
          maxSeats={maxSeats}
        />
        
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button 
            onClick={() => onConfirm(selectedChildIds)} 
            disabled={selectedChildIds.length === 0 || loading || (maxSeats != null && selectedChildIds.length > maxSeats)}
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
