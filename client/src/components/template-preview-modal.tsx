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
  });
  
  // Determine which template to use for display
  const template = isCustomTemplate ? customTemplate : standardTemplate;
  
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
  
  // Update preview styles when template is loaded - either standard or custom
  useEffect(() => {
    console.log("Template preview update - isCustom:", isCustomTemplate);
    console.log("Template data:", isCustomTemplate ? customTemplate : standardTemplate);
    
    if (isCustomTemplate && customTemplate?.customization) {
      // For custom templates, use the customization data
      console.log("Updating preview from custom template:", customTemplate.customization);
      
      const customization = customTemplate.customization as any;
      
      if (customization.colors) {
        setPreviewColors(prevColors => ({
          ...prevColors,
          ...customization.colors
        }));
      }
      
      if (customization.fonts) {
        setPreviewFonts(prevFonts => ({
          ...prevFonts,
          ...customization.fonts
        }));
      }
    } else if (!isCustomTemplate && standardTemplate?.template) {
      // For standard templates, use the template data
      console.log("Updating preview from standard template:", standardTemplate.template);
      
      const template = standardTemplate.template as any;
      
      // Map standard template properties to our preview colors
      const templateColors = {
        primary: template.accent || previewColors.primary,
        secondary: previewColors.secondary,
        text: template.textColor || previewColors.text,
        background: template.background || previewColors.background
      };
      
      setPreviewColors(templateColors);
    }
  }, [isCustomTemplate, customTemplate, standardTemplate]);

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