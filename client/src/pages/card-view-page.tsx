import { useState, useEffect } from "react";
import { useRoute } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { getQueryFn } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Employee, BusinessCard, CardTemplate, CustomTemplate } from "@shared/schema";
import { Share2, Download, Mail, Phone, Building, Briefcase } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface CardViewData {
  card: BusinessCard;
  employee: Employee;
  template: CardTemplate;
  customTemplate?: CustomTemplate;
}

export default function CardViewPage() {
  const { toast } = useToast();
  const [, params] = useRoute("/card/:uniqueUrl");
  const uniqueUrl = params?.uniqueUrl || "";

  // Fetch card data
  const { data, isLoading, error } = useQuery<CardViewData>({
    queryKey: [`/api/public/cards/${uniqueUrl}`],
    queryFn: getQueryFn({ on401: "returnNull" }),
    retry: false,
  });

  // Extract data for easier access
  const employee = data?.employee;
  const card = data?.card;
  const template = data?.template;
  const customTemplate = data?.customTemplate;
  const customization = card?.customization || {};

  // Get template styles
  const getTemplateStyles = () => {
    // Default styles
    const defaultStyles = {
      background: "#ffffff",
      textColor: "#000000",
      accent: "#0066cc",
      layout: "standard"
    };
    
    if (!template) return defaultStyles;
    
    try {
      // If we have a custom template, use its styles instead of the base template
      if (customTemplate) {
        console.log("Using custom template:", customTemplate);
        
        // Parse the custom template JSON if it's a string
        const customTemplateData = typeof customTemplate.customization === 'string' 
          ? JSON.parse(customTemplate.customization) 
          : customTemplate.customization;
        
        console.log("Custom template data:", customTemplateData);
        
        // Handle different style structures
        // The custom templates use a nested 'colors' object with 'primary', 'text', etc.
        if (customTemplateData.colors) {
          return {
            background: customTemplateData.colors.background || defaultStyles.background,
            textColor: customTemplateData.colors.text || defaultStyles.textColor,
            accent: customTemplateData.colors.primary || defaultStyles.accent,
            layout: customTemplateData.layout || defaultStyles.layout
          };
        }
        
        // Fallback to looking for direct properties
        return {
          background: customTemplateData.background || defaultStyles.background,
          textColor: customTemplateData.textColor || defaultStyles.textColor,
          accent: customTemplateData.accent || defaultStyles.accent,
          layout: customTemplateData.layout || defaultStyles.layout
        };
      }
      
      // Otherwise, use the standard template
      const templateData = typeof template.template === 'string' 
        ? JSON.parse(template.template) 
        : template.template;
      
      console.log("Standard template data:", templateData);
      
      // Handle nested color object structure if present (for consistency)
      if (templateData.colors) {
        return {
          background: templateData.colors.background || defaultStyles.background,
          textColor: templateData.colors.text || defaultStyles.textColor,
          accent: templateData.colors.primary || defaultStyles.accent,
          layout: templateData.layout || defaultStyles.layout
        };
      }
      
      // Fallback to standard properties
      return {
        background: templateData.background || defaultStyles.background,
        textColor: templateData.textColor || defaultStyles.textColor,
        accent: templateData.accent || defaultStyles.accent,
        layout: templateData.layout || defaultStyles.layout
      };
    } catch (error) {
      console.error("Error parsing template:", error);
      return defaultStyles;
    }
  };
  
  const styles = getTemplateStyles();
  
  // Handle sharing functionality
  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${employee?.firstName} ${employee?.lastName} - Digital Business Card`,
          text: `Check out ${employee?.firstName} ${employee?.lastName}'s digital business card`,
          url: window.location.href,
        });
      } catch (error) {
        console.error("Error sharing:", error);
        handleCopyToClipboard();
      }
    } else {
      handleCopyToClipboard();
    }
  };
  
  const handleCopyToClipboard = () => {
    navigator.clipboard.writeText(window.location.href)
      .then(() => {
        toast({
          title: "Link copied to clipboard",
          description: "You can now share it with others"
        });
      })
      .catch((error) => {
        console.error("Error copying to clipboard:", error);
        toast({
          title: "Failed to copy link",
          description: "Please copy the URL manually",
          variant: "destructive"
        });
      });
  };
  
  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full"></div>
      </div>
    );
  }
  
  if (error || !data) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <h1 className="text-2xl font-bold mb-2">Business Card Not Found</h1>
        <p className="text-muted-foreground mb-6 text-center">
          The business card you're looking for doesn't exist or has been deactivated.
        </p>
        <Button asChild variant="outline">
          <a href="/">Return Home</a>
        </Button>
      </div>
    );
  }
  
  // Ensure we have employee data before rendering
  if (!employee) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <h1 className="text-2xl font-bold mb-2">Employee Information Not Found</h1>
        <p className="text-muted-foreground mb-6 text-center">
          The employee information for this business card is missing.
        </p>
        <Button asChild variant="outline">
          <a href="/">Return Home</a>
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gray-50">
      {/* Business Card */}
      <Card className="w-full max-w-md mx-auto overflow-hidden shadow-lg">
        <div 
          className="p-6"
          style={{ 
            background: styles.background,
            color: styles.textColor
          }}
        >
          {/* Header - Company and Name */}
          <div className="text-center mb-6">
            {employee.profileImage && (
              <div className="mb-4 flex justify-center">
                <img 
                  src={employee.profileImage} 
                  alt={`${employee.firstName} ${employee.lastName}`}
                  className="w-24 h-24 rounded-full object-cover border-4"
                  style={{ borderColor: styles.accent }}
                />
              </div>
            )}
            <h1 
              className="text-2xl font-bold"
              style={{ color: styles.accent }}
            >
              {employee.firstName} {employee.lastName}
            </h1>
            <p className="text-lg opacity-90">{employee.title}</p>
            {employee.department && (
              <p className="text-sm opacity-70">{employee.department}</p>
            )}
          </div>
          
          {/* Contact Information */}
          <div className="space-y-3">
            {employee.email && (
              <a 
                href={`mailto:${employee.email}`}
                className="flex items-center gap-3 p-2 rounded hover:bg-black/5 transition-colors"
              >
                <Mail 
                  className="h-5 w-5 flex-shrink-0"
                  style={{ color: styles.accent }} 
                />
                <span className="text-sm break-all">{employee.email}</span>
              </a>
            )}
            
            {employee.phone && (
              <a 
                href={`tel:${employee.phone}`}
                className="flex items-center gap-3 p-2 rounded hover:bg-black/5 transition-colors"
              >
                <Phone 
                  className="h-5 w-5 flex-shrink-0"
                  style={{ color: styles.accent }} 
                />
                <span className="text-sm">{employee.phone}</span>
              </a>
            )}
          </div>
        </div>
        
        {/* Actions */}
        <CardContent className="p-4 border-t">
          <div className="flex justify-center gap-4">
            <Button variant="outline" size="sm" onClick={handleShare}>
              <Share2 className="h-4 w-4 mr-2" />
              Share
            </Button>
            
            {employee.email && (
              <Button variant="outline" size="sm" asChild>
                <a href={`mailto:${employee.email}`}>
                  <Mail className="h-4 w-4 mr-2" />
                  Email
                </a>
              </Button>
            )}
            
            {employee.phone && (
              <Button variant="outline" size="sm" asChild>
                <a href={`tel:${employee.phone}`}>
                  <Phone className="h-4 w-4 mr-2" />
                  Call
                </a>
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
      
      <p className="text-sm text-muted-foreground mt-6 text-center">
        Created with Digital Business Card Platform
      </p>
    </div>
  );
}