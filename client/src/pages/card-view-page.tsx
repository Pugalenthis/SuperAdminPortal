import { useState, useEffect } from "react";
import { useRoute } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { getQueryFn } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
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
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-slate-50">
      {/* Business Card - Dual Section Design with exact dimensions */}
      <Card 
        className="w-full max-w-md mx-auto overflow-hidden relative"
        style={{
          boxShadow: '0 4px 24px rgba(0, 0, 0, 0.06)',
          borderRadius: '8px'
        }}
      >
        {/* Employee Section (Top Section - 1066px × 442px) */}
        <div 
          className="w-full px-6 pt-8 pb-5"
          style={{ 
            aspectRatio: '1066/442', // Exact dimensions as specified
            background: styles.background, 
            color: styles.textColor,
            borderTop: `4px solid ${styles.accent}`,
            boxShadow: 'inset 0 0 30px rgba(0,0,0,0.01)'
          }}
        >
          {/* Company Logo/Name */}
          <div className="mb-6 flex items-center justify-between">
            <h2 
              className="text-base uppercase tracking-wider font-semibold"
              style={{ color: styles.accent }}
            >
              {adminOrgName}
            </h2>
            
            <span 
              className="text-xs px-3 py-0.5 rounded-full"
              style={{ 
                backgroundColor: `${styles.accent}10`,
                color: styles.accent
              }}
            >
              Digital Card
            </span>
          </div>
          
          <Separator className="mb-6" style={{ backgroundColor: `${styles.accent}20` }} />
          
          {/* Two columns for Name/Title + QR Code */}
          <div className="grid grid-cols-5 gap-4 mb-6">
            {/* Name & Title - Left */}
            <div className="col-span-3">
              <h1 
                className="text-3xl font-bold mb-2"
                style={{ color: styles.textColor }}
              >
                {employee.firstName} {employee.lastName}
              </h1>
              <p 
                className="text-base font-medium"
                style={{ color: styles.accent }}
              >
                {employee.title}
              </p>
            </div>
            
            {/* QR Code - Right */}
            <div className="col-span-2 flex flex-col items-center justify-center">
              <div 
                className="p-2 bg-white rounded-lg mb-2.5"
                style={{ 
                  border: `1px solid ${styles.accent}30`,
                  boxShadow: '0 10px 25px rgba(0,0,0,0.08)'
                }}
              >
                <QrCode 
                  className="h-20 w-20" 
                  style={{ color: styles.textColor }}
                />
              </div>
              <div className="flex flex-col items-center gap-1">
                <span 
                  className="text-xs px-3 py-1 rounded-md text-center"
                  style={{ 
                    backgroundColor: `${styles.accent}15`,
                    color: styles.accent,
                    fontWeight: 500,
                    borderLeft: `3px solid ${styles.accent}`
                  }}
                >
                  www.companywebsite.com
                </span>
                <span 
                  className="text-xs text-center"
                  style={{ 
                    color: `${styles.textColor}80`,
                  }}
                >
                  Scan to connect
                </span>
              </div>
            </div>
          </div>
          
          {/* Contact Information */}
          <div className="grid grid-cols-1 gap-2.5">
            {employee.email && (
              <div className="flex items-center gap-3">
                <Mail 
                  className="h-4 w-4 flex-shrink-0"
                  style={{ color: styles.accent }} 
                />
                <span className="text-sm truncate">{employee.email}</span>
              </div>
            )}
            
            {employee.phone && (
              <div className="flex items-center gap-3">
                <Phone 
                  className="h-4 w-4 flex-shrink-0"
                  style={{ color: styles.accent }} 
                />
                <span className="text-sm">{employee.phone}</span>
              </div>
            )}

            {employee.department && (
              <div className="flex items-center gap-3">
                <MapPin 
                  className="h-4 w-4 flex-shrink-0"
                  style={{ color: styles.accent }} 
                />
                <span className="text-sm">{employee.department}</span>
              </div>
            )}
            
            <div className="flex items-center gap-3">
              <Building
                className="h-4 w-4 flex-shrink-0"
                style={{ color: styles.accent }}
              />
              <span className="text-sm">{adminOrgName}</span>
            </div>
          </div>
        </div>

        {/* Company Card Section (Bottom Section - matching aspect ratio with section 1) */}
        {companyCard ? (
          <div
            className="w-full relative"
            style={{
              aspectRatio: '1066/445', // Exactly match the specified dimensions (1066x445)
              backgroundColor: '#f8f8f8',
              borderTop: '1px solid rgba(0,0,0,0.05)'
            }}
          >
            <div
              className="absolute inset-0 bg-center bg-cover"
              style={{
                backgroundImage: `url(${companyCard.imagePath})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                boxShadow: 'inset 0 -1px 10px rgba(0,0,0,0.05)'
              }}
            />
            {/* Add subtle gradient overlay for depth */}
            <div 
              className="absolute inset-0"
              style={{
                background: 'linear-gradient(180deg, rgba(0,0,0,0.01) 0%, rgba(0,0,0,0.04) 70%, rgba(0,0,0,0.08) 100%)',
                zIndex: 1
              }}
            />
            <div 
              className="absolute bottom-0 left-0 right-0 h-16"
              style={{
                background: 'linear-gradient(to top, rgba(0,0,0,0.12), transparent)',
                zIndex: 2
              }}
            />
            {/* Add subtle top shadow for depth between sections */}
            <div 
              className="absolute top-0 left-0 right-0 h-2"
              style={{
                background: 'linear-gradient(to bottom, rgba(0,0,0,0.04), transparent)',
                zIndex: 2
              }}
            />
          </div>
        ) : (
          <div 
            className="w-full flex items-center justify-center"
            style={{
              aspectRatio: '1066/445', // Exactly match the specified dimensions (1066x445)
              backgroundColor: '#f8f9fa',
              borderTop: '1px solid rgba(0,0,0,0.05)',
              boxShadow: 'inset 0 1px 6px rgba(0,0,0,0.02)'
            }}
          >
            <div className="text-center p-6">
              <div 
                className="w-16 h-16 mx-auto mb-3 rounded-full flex items-center justify-center"
                style={{ 
                  backgroundColor: `${styles.accent}10`,
                  boxShadow: '0 3px 12px rgba(0,0,0,0.06)'
                }}
              >
                <Building 
                  className="w-8 h-8 opacity-70" 
                  style={{ color: styles.accent }}
                />
              </div>
              <p className="text-sm text-gray-600 font-medium">
                Company branding section
              </p>
              <p className="text-xs text-gray-400 mt-1 max-w-xs">
                Upload your company card in Organization Settings
              </p>
            </div>
          </div>
        )}
        
        {/* Actions - Enhanced premium style */}
        <div 
          className="flex justify-center gap-4 p-5 border-t"
          style={{ 
            borderColor: 'rgba(0,0,0,0.05)',
            background: 'linear-gradient(to bottom, #fff, #fafafa)'
          }}
        >
          <Button 
            className="rounded-md shadow-sm relative overflow-hidden transition-all duration-300"
            style={{ 
              backgroundColor: styles.accent,
              color: 'white',
              padding: '8px 16px',
              border: 'none'
            }}
            size="sm" 
            onClick={handleShare}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-1px)';
              e.currentTarget.style.boxShadow = '0 4px 10px rgba(0, 0, 0, 0.1)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.1)';
            }}
          >
            <Share2 className="h-4 w-4 mr-2" />
            Share
          </Button>
          
          {employee.email && (
            <Button 
              className="rounded-md shadow-sm transition-all duration-300"
              style={{ 
                backgroundColor: 'white',
                color: styles.accent,
                padding: '8px 16px',
                borderColor: `${styles.accent}40`
              }}
              variant="outline" 
              size="sm" 
              asChild
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-1px)';
                e.currentTarget.style.boxShadow = '0 4px 10px rgba(0, 0, 0, 0.05)';
                e.currentTarget.style.borderColor = styles.accent;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.05)';
                e.currentTarget.style.borderColor = `${styles.accent}40`;
              }}
            >
              <a href={`mailto:${employee.email}`}>
                <Mail className="h-4 w-4 mr-2" />
                Email
              </a>
            </Button>
          )}
          
          {employee.phone && (
            <Button
              className="rounded-md shadow-sm transition-all duration-300"
              style={{ 
                backgroundColor: 'white',
                color: styles.accent,
                padding: '8px 16px',
                borderColor: `${styles.accent}40`
              }}
              variant="outline" 
              size="sm" 
              asChild
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-1px)';
                e.currentTarget.style.boxShadow = '0 4px 10px rgba(0, 0, 0, 0.05)';
                e.currentTarget.style.borderColor = styles.accent;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.05)';
                e.currentTarget.style.borderColor = `${styles.accent}40`;
              }}
            >
              <a href={`tel:${employee.phone}`}>
                <Phone className="h-4 w-4 mr-2" />
                Call
              </a>
            </Button>
          )}
        </div>
      </Card>
      
      <p className="text-sm text-muted-foreground mt-6 text-center">
        Created with Digital Business Card Platform
      </p>
    </div>
  );
}