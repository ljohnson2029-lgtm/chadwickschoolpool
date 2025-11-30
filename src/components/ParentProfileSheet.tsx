import { Sheet, SheetContent, SheetHeader } from "@/components/ui/sheet";
import ParentProfilePopup from "./ParentProfilePopup";

interface ParentProfileSheetProps {
  open: boolean;
  parentId: string | null;
  distance: number;
  onClose: () => void;
  onRequestRide: (parentId: string, parentName: string) => void;
  onOfferRide: (parentId: string, parentName: string) => void;
}

const ParentProfileSheet = ({
  open,
  parentId,
  distance,
  onClose,
  onRequestRide,
  onOfferRide,
}: ParentProfileSheetProps) => {
  if (!parentId) return null;

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent 
        side="bottom" 
        className="h-[70vh] rounded-t-2xl p-0"
      >
        <SheetHeader className="sr-only">
          <h2>Parent Profile</h2>
        </SheetHeader>
        <div className="h-full overflow-auto p-4">
          <ParentProfilePopup
            parentId={parentId}
            distance={distance}
            onClose={onClose}
            onRequestRide={onRequestRide}
            onOfferRide={onOfferRide}
          />
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default ParentProfileSheet;
