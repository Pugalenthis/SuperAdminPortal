import { useState } from "react";
import { CardTemplate } from "@shared/schema";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { getQueryFn } from "@/lib/queryClient";

interface TemplatePreviewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  templateId: number | null;
}

export function TemplatePreviewModal({
  open,
  onOpenChange,
  templateId
}: TemplatePreviewModalProps) {
  const { data: user } = useQuery({
    queryKey: ['/api/user'],
    queryFn: getQueryFn({ on401: "returnNull" }),
  });
  
  const { data: template } = useQuery<CardTemplate>({
    queryKey: ['/api/card-templates', templateId],
    queryFn: getQueryFn({ on401: "throw" }),
    enabled: !!templateId && open,
  });
  
  // Default preview styles
  const [previewColors] = useState({
    primary: "#0f766e",
    secondary: "#f59e0b",
    text: "#1e293b",
    background: "#ffffff"
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Template Preview: {template?.name}</DialogTitle>
          <DialogDescription>
            Preview how this business card template will look.
          </DialogDescription>
        </DialogHeader>
        
        <div className="py-6">
          <div 
            className="aspect-[1.7/1] w-full max-w-lg mx-auto bg-muted relative overflow-hidden rounded-lg border shadow-md"
          >
            <div 
              className="absolute inset-0 flex flex-col p-6"
              style={{ 
                backgroundColor: previewColors.background,
                color: previewColors.text,
              }}
            >
              <div className="flex flex-1 flex-col justify-center items-center">
                <div 
                  className="mb-4 h-12 w-12 rounded-full bg-opacity-20"
                  style={{ backgroundColor: previewColors.primary }}
                >
                  <div className="h-full w-full flex items-center justify-center">
                    <span className="text-2xl font-bold" style={{ color: previewColors.primary }}>
                      {user?.orgName?.charAt(0) || 'T'}
                    </span>
                  </div>
                </div>
                
                <h3 
                  className="text-xl font-bold mb-1" 
                  style={{ color: previewColors.primary }}
                >
                  John Smith
                </h3>
                
                <p className="text-sm mb-3">Marketing Manager</p>
                
                <div 
                  className="h-1 w-20 rounded-full my-2"
                  style={{ backgroundColor: previewColors.secondary }}
                ></div>
                
                <div className="text-center mt-2">
                  <p className="text-sm">john.smith@example.com</p>
                  <p className="text-sm">+1 (555) 123-4567</p>
                  <p 
                    className="text-sm mt-2 font-semibold"
                    style={{ color: previewColors.primary }}
                  >
                    {user?.orgName || 'Company Name'}
                  </p>
                </div>
              </div>
            </div>
          </div>
          
          <div className="text-center mt-4">
            <p className="text-sm text-muted-foreground">
              This is a preview with sample data. Actual business card will use employee information.
            </p>
          </div>
        </div>
        
        <DialogFooter>
          <Button 
            variant="outline" 
            onClick={() => onOpenChange(false)}
          >
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}