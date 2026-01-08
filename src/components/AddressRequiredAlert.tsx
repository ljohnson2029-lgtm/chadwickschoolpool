import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { MapPin, Settings } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface AddressRequiredAlertProps {
  open: boolean;
  onClose: () => void;
}

const AddressRequiredAlert = ({ open, onClose }: AddressRequiredAlertProps) => {
  const navigate = useNavigate();

  const handleGoToSettings = () => {
    onClose();
    navigate("/profile/setup");
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-2">
            <div className="w-10 h-10 bg-yellow-500/10 rounded-full flex items-center justify-center">
              <MapPin className="w-5 h-5 text-yellow-600" />
            </div>
            <DialogTitle>Home Address Required</DialogTitle>
          </div>
          <DialogDescription>
            Please add your home address in Settings to use map features and find carpool partners.
          </DialogDescription>
        </DialogHeader>

        <div className="flex gap-3 pt-4">
          <Button variant="outline" onClick={onClose} className="flex-1">
            Cancel
          </Button>
          <Button onClick={handleGoToSettings} className="flex-1">
            <Settings className="w-4 h-4 mr-2" />
            Go to Settings
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AddressRequiredAlert;
