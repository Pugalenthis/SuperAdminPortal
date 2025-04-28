import { useState, useEffect } from "react";
import { CardTemplate, CustomTemplate } from "@shared/schema";
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
import { EuroBankCardTemplate } from "@/components/euro-bank-card-template";

interface TemplatePreviewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  templateId: number | null;
  isCustomTemplate?: boolean;
}

export function TemplatePreviewModal({
  open,
  onOpenChange,
  templateId,
  isCustomTemplate = false
}: TemplatePreviewModalProps) {
  const { data: user } = useQuery({
    queryKey: ['/api/user'],
    queryFn: getQueryFn({ on401: "returnNull" }),
  });
  
  // Fetch standard template
  const { data: standardTemplate } = useQuery<CardTemplate>({
    queryKey: ['/api/card-templates', templateId],
    queryFn: getQueryFn({ on401: "throw" }),
    enabled: !!templateId && open && !isCustomTemplate,
  });
  
  // Fetch custom template
  const { data: customTemplate } = useQuery<CustomTemplate>({
    queryKey: ['/api/custom-templates', templateId],
    queryFn: getQueryFn({ on401: "throw" }),
    enabled: !!templateId && open && isCustomTemplate,
    staleTime: 0, // Always refetch when the modal is opened
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });
  
  // Determine which template to use for display
  const template = isCustomTemplate 
    ? (Array.isArray(customTemplate) ? customTemplate[0] : customTemplate)
    : standardTemplate;
  
  // Preview styles with defaults
  const [previewColors, setPreviewColors] = useState({
    primary: "#0f766e",
    secondary: "#f59e0b",
    text: "#1e293b",
    background: "#ffffff"
  });
  
  const [previewFonts, setPreviewFonts] = useState({
    headingFont: "Inter",
    bodyFont: "Roboto"
  });
  
  // Reset preview styles when the dialog closes
  useEffect(() => {
    if (!open) {
      // Reset to defaults when dialog closes
      setPreviewColors({
        primary: "#0f766e",
        secondary: "#f59e0b",
        text: "#1e293b",
        background: "#ffffff"
      });
      setPreviewFonts({
        headingFont: "Inter",
        bodyFont: "Roboto"
      });
    }
  }, [open]);
  
  // Update preview styles when template is loaded - either standard or custom
  useEffect(() => {
    console.log("Template preview update - isCustom:", isCustomTemplate, "templateId:", templateId, "open:", open);
    
    // Only proceed if the dialog is open
    if (!open) return;
    
    // Custom template handling
    if (isCustomTemplate && customTemplate) {
      // Check if the customTemplate is an array (some API responses wrap the object in an array)
      const customTemplateData = Array.isArray(customTemplate) ? customTemplate[0] : customTemplate;
      console.log("Custom template data:", customTemplateData);
      
      if (customTemplateData?.customization) {
        // For custom templates, use the customization data
        console.log("Updating preview from custom template:", customTemplateData.customization);
        
        const customization = customTemplateData.customization as any;
        
        // When updating from a custom template, do a full reset first to avoid stale values
        const newColors = {
          primary: "#0f766e",
          secondary: "#f59e0b",
          text: "#1e293b",
          background: "#ffffff",
          ...customization.colors
        };
        
        console.log("Setting custom template colors to:", newColors);
        setPreviewColors(newColors);
        
        if (customization.fonts) {
          setPreviewFonts({
            headingFont: "Inter",
            bodyFont: "Roboto",
            ...customization.fonts
          });
        }
      }
    // Standard template handling  
    } else if (!isCustomTemplate && standardTemplate?.template) {
      // For standard templates, use the template data
      console.log("Updating preview from standard template:", standardTemplate.template);
      
      const template = standardTemplate.template as any;
      
      // Map standard template properties to our preview colors
      const templateColors = {
        primary: template.accent || "#0f766e",
        secondary: "#f59e0b", // Default as standard templates may not have this
        text: template.textColor || "#1e293b",
        background: template.background || "#ffffff"
      };
      
      console.log("Setting standard template colors to:", templateColors);
      setPreviewColors(templateColors);
    }
  }, [isCustomTemplate, customTemplate, standardTemplate, open, templateId]);

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
                fontFamily: previewFonts.bodyFont
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
                  style={{ 
                    color: previewColors.primary,
                    fontFamily: previewFonts.headingFont
                  }}
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
                    style={{ 
                      color: previewColors.primary,
                      fontFamily: previewFonts.headingFont
                    }}
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