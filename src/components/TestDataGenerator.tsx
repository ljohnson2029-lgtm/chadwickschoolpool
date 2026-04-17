import { useState } from "react";
import { Button } from "@/components/ui/button";
import { AlertCircle, Trash2, Users } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
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
import { Progress } from "@/components/ui/progress";

// Generate a secure random password for test accounts
const generateSecurePassword = (): string => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
  let password = '';
  for (let i = 0; i < 12; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
};

const TestDataGenerator = () => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState("");
  const [generatedPasswords, setGeneratedPasswords] = useState<Record<string, string>>({});
  const { toast } = useToast();

  const testParentsData = [
    { name: "Sarah Johnson", address: "123 Via Campesina, Rancho Palos Verdes, CA 90275" },
    { name: "Michael Chen", address: "456 Hawthorne Blvd, Rancho Palos Verdes, CA 90275" },
    { name: "Jennifer Martinez", address: "789 Palos Verdes Dr W, Palos Verdes Estates, CA 90274" },
    { name: "David Kim", address: "321 Silver Spur Rd, Rolling Hills Estates, CA 90274" },
    { name: "Emily Rodriguez", address: "555 Crenshaw Blvd, Rancho Palos Verdes, CA 90275" },
    { name: "James Williams", address: "888 Crest Rd, Rancho Palos Verdes, CA 90275" },
    { name: "Lisa Anderson", address: "234 Via Almar, Palos Verdes Estates, CA 90274" },
    { name: "Robert Taylor", address: "567 Deep Valley Dr, Rolling Hills Estates, CA 90274" },
    { name: "Maria Garcia", address: "890 Via Coronel, Rancho Palos Verdes, CA 90275" },
    { name: "John Brown", address: "111 Miraleste Dr, Rancho Palos Verdes, CA 90275" },
    { name: "Amanda Lee", address: "222 Narcissa Dr, Rancho Palos Verdes, CA 90275" },
    { name: "Christopher Davis", address: "333 Paseo Del Mar, Palos Verdes Estates, CA 90274" },
    { name: "Jessica Wilson", address: "444 Via Neve, Rancho Palos Verdes, CA 90275" },
    { name: "Daniel Moore", address: "666 Nantasket Dr, Rancho Palos Verdes, CA 90275" },
    { name: "Michelle Thompson", address: "777 Forrestal Dr, Rancho Palos Verdes, CA 90275" },
    { name: "Matthew Jackson", address: "999 Avenida Aprenda, Rancho Palos Verdes, CA 90275" },
    { name: "Ashley White", address: "1234 Basswood Ave, Rancho Palos Verdes, CA 90275" },
    { name: "Joshua Harris", address: "5678 Indian Peak Rd, Rolling Hills Estates, CA 90274" },
    { name: "Nicole Martin", address: "9012 Palos Verdes Dr N, Rancho Palos Verdes, CA 90275" },
    { name: "Ryan Thompson", address: "3456 Exultant Dr, Rancho Palos Verdes, CA 90275" },
  ];

  const generateTestParents = async () => {
    setIsGenerating(true);
    setProgress(0);
    setStatusMessage("Starting test data generation...");
    const passwords: Record<string, string> = {};

    try {
      const total = testParentsData.length;

      for (let i = 0; i < testParentsData.length; i++) {
        const parent = testParentsData[i];
        const [firstName, lastName] = parent.name.split(" ");
        const email = `testparent${i + 1}@example.com`;
        const password = generateSecurePassword();
        passwords[email] = password;
        
        setStatusMessage(`Creating test parent ${i + 1}/${total}: ${parent.name}...`);
        setProgress(((i + 1) / total) * 100);

        // Call the generate-test-parent edge function
        const { data, error } = await supabase.functions.invoke('generate-test-parent', {
          body: {
            email,
            firstName,
            lastName,
            address: parent.address,
            password
          }
        });

        if (error) {
          console.error(`Failed to create ${parent.name}:`, error);
          delete passwords[email];
          // Continue with next parent instead of stopping
        }
      }

      setGeneratedPasswords(passwords);
      const passwordCount = Object.keys(passwords).length;
      setStatusMessage(`Successfully created ${passwordCount} test parents! Check console for passwords.`);
      toast({
        title: "Test Data Generated",
        description: `Created ${passwordCount} test parent accounts. Passwords logged to browser console.`,
      });
      
      // Log passwords to console for developer access
      console.table(passwords);

      // Clear status after 3 seconds
      setTimeout(() => {
        setStatusMessage("");
        setProgress(0);
      }, 3000);

    } catch (error) {
      console.error("Error generating test data:", error);
      toast({
        title: "Error",
        description: "Failed to generate test data. Check console for details.",
        variant: "destructive",
      });
      setStatusMessage("");
      setProgress(0);
    } finally {
      setIsGenerating(false);
    }
  };

  const deleteTestParents = async () => {
    setIsDeleting(true);
    setStatusMessage("Deleting test parent accounts...");

    try {
      // Call the delete-test-parents edge function
      const { error } = await supabase.functions.invoke('delete-test-parents');

      if (error) throw error;

      setStatusMessage("Test parents deleted successfully!");
      toast({
        title: "Test Data Deleted",
        description: "All test parent accounts have been removed.",
      });

      setTimeout(() => {
        setStatusMessage("");
      }, 2000);

    } catch (error) {
      console.error("Error deleting test data:", error);
      toast({
        title: "Error",
        description: "Failed to delete test data. Check console for details.",
        variant: "destructive",
      });
      setStatusMessage("");
    } finally {
      setIsDeleting(false);
      setShowDeleteDialog(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-2 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
        <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5 flex-shrink-0" />
        <div className="text-sm text-yellow-600">
          <p className="font-semibold mb-1">Development Mode Active</p>
          <p>Generate test parent accounts to populate the map with sample data.</p>
          <p className="mt-2 text-xs">Each account gets a unique random password logged to console.</p>
        </div>
      </div>
      
      {Object.keys(generatedPasswords).length > 0 && (
        <div className="p-3 bg-muted rounded-lg text-xs">
          <p className="font-semibold mb-2">Generated Account Passwords:</p>
          <div className="max-h-32 overflow-y-auto space-y-1">
            {Object.entries(generatedPasswords).map(([email, pwd]) => (
              <div key={email} className="flex justify-between">
                <span>{email}</span>
                <code className="bg-background px-1 rounded">{pwd}</code>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex gap-3">
        <Button
          onClick={generateTestParents}
          disabled={isGenerating || isDeleting}
          className="flex-1"
        >
          <Users className="mr-2 h-4 w-4" />
          {isGenerating ? "Generating..." : "Generate Test Parents"}
        </Button>

        <Button
          onClick={() => setShowDeleteDialog(true)}
          disabled={isGenerating || isDeleting}
          variant="destructive"
          className="flex-1"
        >
          <Trash2 className="mr-2 h-4 w-4" />
          {isDeleting ? "Deleting..." : "Delete Test Parents"}
        </Button>
      </div>

      {(isGenerating || statusMessage) && (
        <div className="space-y-2">
          <Progress value={progress} className="w-full" />
          <p className="text-sm text-muted-foreground">{statusMessage}</p>
        </div>
      )}

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Test Data?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete all test parent accounts (emails ending with @example.com) and their associated data. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={deleteTestParents} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete All Test Data
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default TestDataGenerator;
