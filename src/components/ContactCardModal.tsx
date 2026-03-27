import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Phone, Mail, Copy, User } from "lucide-react";
import { toast } from "sonner";

interface ContactCardModalProps {
  open: boolean;
  onClose: () => void;
  parentName: string;
  phone: string | null;
  email: string | null;
}

export function ContactCardModal({ open, onClose, parentName, phone, email }: ContactCardModalProps) {
  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard`);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5 text-primary" />
            Contact Info
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div className="text-center">
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-2">
              <User className="h-6 w-6 text-primary" />
            </div>
            <p className="text-lg font-semibold text-foreground">{parentName}</p>
          </div>

          {phone && (
            <div className="flex items-center justify-between bg-muted/50 rounded-lg p-3">
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">{phone}</span>
              </div>
              <div className="flex gap-1.5">
                <Button size="sm" variant="outline" className="h-7 text-xs" asChild>
                  <a href={`tel:${phone}`}>Call</a>
                </Button>
                <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => copyToClipboard(phone, "Phone")}>
                  <Copy className="h-3 w-3" />
                </Button>
              </div>
            </div>
          )}

          {email && (
            <div className="flex items-center justify-between bg-muted/50 rounded-lg p-3">
              <div className="flex items-center gap-2 min-w-0">
                <Mail className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <span className="text-sm font-medium truncate">{email}</span>
              </div>
              <div className="flex gap-1.5 flex-shrink-0">
                <Button size="sm" variant="outline" className="h-7 text-xs" asChild>
                  <a href={`mailto:${email}`}>Email</a>
                </Button>
                <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => copyToClipboard(email, "Email")}>
                  <Copy className="h-3 w-3" />
                </Button>
              </div>
            </div>
          )}

          {!phone && !email && (
            <p className="text-sm text-muted-foreground text-center py-2">
              No contact information available for this parent.
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
