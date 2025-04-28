import { useState, useEffect } from "react";
import { useRoute } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { getQueryFn } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Employee, BusinessCard, CardTemplate, CustomTemplate, CompanyCard } from "@shared/schema";
import { Share2, Download, Mail, Phone, Building, Briefcase, QrCode, Smartphone, MapPin } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface CardViewData {
  card: BusinessCard;
  employee: Employee;
  template: CardTemplate;
  customTemplate?: CustomTemplate;
  companyCard?: CompanyCard;
}

export default function CardViewPage() {
  const { toast } = useToast();
  const [, params] = useRoute("/card/:uniqueUrl");
  const uniqueUrl = params?.uniqueUrl || "";
  
  // Get user data for company info
  const { data: userData } = useQuery({
    queryKey: ['/api/user'],
    queryFn: getQueryFn({ on401: "returnNull" }),
    retry: false,
  });
  const adminOrgName = userData?.orgName || "ORGANIZATION";

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
  const companyCard = data?.companyCard;
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
      {/* Business Card - Dual Section Design with exact dimensions */}
      <Card className="w-full max-w-md mx-auto overflow-hidden shadow-lg">
        {/* Employee Section (Top Section - 1066px × 442px) */}
        <div 
          className="w-full"
          style={{ 
            aspectRatio: '1066/442',
            background: styles.background, 
            color: styles.textColor,
            padding: '1.5rem'
          }}
        >
          {/* Two-column layout */}
          <div className="grid grid-cols-2 h-full">
            {/* Left Side */}
            <div className="border-r border-gray-200 pr-4 flex flex-col justify-between">
              {/* Name */}
              <div>
                <h1 
                  className="text-xl font-bold"
                  style={{ color: styles.accent }}
                >
                  {employee.firstName} {employee.lastName}
                </h1>
                <p className="text-base opacity-90 mt-1">{employee.title}</p>
              </div>
              
              {/* Contact Information */}
              <div className="space-y-3 mt-4">
                {employee.email && (
                  <div className="flex items-center gap-2">
                    <Mail 
                      className="h-4 w-4 flex-shrink-0"
                      style={{ color: styles.accent }} 
                    />
                    <span className="text-sm">{employee.email}</span>
                  </div>
                )}
                
                {employee.phone && (
                  <div className="flex items-center gap-2">
                    <Phone 
                      className="h-4 w-4 flex-shrink-0"
                      style={{ color: styles.accent }} 
                    />
                    <span className="text-sm">{employee.phone}</span>
                  </div>
                )}

                {/* Mobile/WhatsApp - Using phone as fallback */}
                {employee.phone && (
                  <div className="flex items-center gap-2">
                    <Smartphone 
                      className="h-4 w-4 flex-shrink-0"
                      style={{ color: styles.accent }} 
                    />
                    <span className="text-sm">{employee.phone} (Mobile)</span>
                  </div>
                )}

                {/* Address - Using department as fallback */}
                {employee.department && (
                  <div className="flex items-center gap-2">
                    <MapPin 
                      className="h-4 w-4 flex-shrink-0"
                      style={{ color: styles.accent }} 
                    />
                    <span className="text-sm">{employee.department}</span>
                  </div>
                )}
              </div>
            </div>
            
            {/* Right Side */}
            <div className="pl-4 flex flex-col">
              {/* Company Name (using Organization Name) */}
              <div>
                <h2 className="text-lg font-semibold">{adminOrgName}</h2>
              </div>
              
              {/* QR Code Placeholder */}
              <div className="mt-4 border border-gray-300 rounded-md h-32 w-32 mx-auto flex items-center justify-center">
                <QrCode className="h-24 w-24 text-gray-400" />
              </div>
              
              {/* Website */}
              <div className="mt-auto text-center">
                <span className="text-sm">www.companywebsite.com</span>
              </div>
            </div>
          </div>
        </div>

        {/* Company Card Section (Bottom Section - 1066px × 445px) */}
        {companyCard ? (
          <>
            <div
              className="w-full border-t"
              style={{
                aspectRatio: '1066/445',
                backgroundImage: `url(${companyCard.imagePath})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center'
              }}
            />
          </>
        ) : (
          <div 
            className="w-full border-t flex items-center justify-center"
            style={{
              aspectRatio: '1066/445',
              background: '#f1f1f1',
              color: '#666'
            }}
          >
            <p className="text-center text-sm italic">
              Company section not yet configured
            </p>
          </div>
        )}
        
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