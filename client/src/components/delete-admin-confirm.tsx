import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

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
import { Button } from "@/components/ui/button";

export function DeleteAdminConfirm({
  open,
  onOpenChange,
  adminId,
  adminName,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  adminId: number | null;
  adminName: string | null;
  onSuccess: () => void;
}) {
  const { toast } = useToast();
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    if (!adminId) return;
    
    try {
      setIsDeleting(true);
      
      const response = await fetch(`/api/admins/${adminId}`, {
        method: "DELETE",
        credentials: "include"
      });
      
      if (!response.ok) {
        throw new Error("Failed to delete admin");
      }
      
      toast({
        title: "Admin deleted",
        description: `The admin account has been deleted successfully.`,
      });
      
      onOpenChange(false);
      onSuccess();
    } catch (error) {
      console.error("Error deleting admin:", error);
      toast({
        title: "Delete failed",
        description: error instanceof Error ? error.message : "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Admin Account</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete the admin account for{" "}
            <span className="font-semibold">{adminName}</span>?
            <br />
            <br />
            This action cannot be undone, and the organization will lose access to the platform.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
          <Button 
            variant="destructive" 
            onClick={handleDelete}
            disabled={isDeleting}
          >
            {isDeleting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
            Delete
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}