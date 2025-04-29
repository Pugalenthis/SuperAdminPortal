import { useState, useEffect } from "react";
import { useRoute } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { getQueryFn } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Employee, BusinessCard, CardTemplate, CustomTemplate, CompanyCard } from "@shared/schema";
import { Share2, Download, Mail, Phone, Building, Briefcase, QrCode, Smartphone, MapPin, Globe, ExternalLink } from "lucide-react";
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
  interface UserData {
    id: number; 
    email: string; 
    orgName: string; 
    userType: string;
  }
  
  const { data: userData } = useQuery<UserData>({
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
      secondaryColor: "#D3D3D3",
      layout: "standard"
    };
    
    // If we have company branding, use it for the accent and secondary colors
    if (companyCard?.primaryColor) {
      defaultStyles.accent = companyCard.primaryColor;
    }
    
    if (companyCard?.secondaryColor) {
      defaultStyles.secondaryColor = companyCard.secondaryColor;
    }
    
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
            accent: companyCard?.primaryColor || customTemplateData.colors.primary || defaultStyles.accent,
            secondaryColor: companyCard?.secondaryColor || defaultStyles.secondaryColor,
            layout: customTemplateData.layout || defaultStyles.layout
          };
        }
        
        // Fallback to looking for direct properties
        return {
          background: customTemplateData.background || defaultStyles.background,
          textColor: customTemplateData.textColor || defaultStyles.textColor,
          accent: companyCard?.primaryColor || customTemplateData.accent || defaultStyles.accent,
          secondaryColor: companyCard?.secondaryColor || defaultStyles.secondaryColor,
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
          accent: companyCard?.primaryColor || templateData.colors.primary || defaultStyles.accent,
          secondaryColor: companyCard?.secondaryColor || defaultStyles.secondaryColor,
          layout: templateData.layout || defaultStyles.layout
        };
      }
      
      // Fallback to standard properties
      return {
        background: templateData.background || defaultStyles.background,
        textColor: templateData.textColor || defaultStyles.textColor,
        accent: companyCard?.primaryColor || templateData.accent || defaultStyles.accent,
        secondaryColor: companyCard?.secondaryColor || defaultStyles.secondaryColor,
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
          className="w-full px-5 pt-5 pb-4"
          style={{ 
            aspectRatio: '1066/442', // Exact dimensions as specified
            background: styles.background, 
            color: styles.textColor,
            borderTop: `4px solid ${styles.accent}`,
            boxShadow: 'inset 0 0 30px rgba(0,0,0,0.01)'
          }}
        >
          {/* Company Name (Logo removed as requested) */}
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h2 
                className="text-base uppercase tracking-wider font-semibold"
                style={{ color: styles.accent }}
              >
                {adminOrgName}
              </h2>
            </div>
            
            <span 
              className="text-xs px-2.5 py-0.5 rounded-full"
              style={{ 
                backgroundColor: `${styles.accent}10`,
                color: styles.accent
              }}
            >
              Digital Card
            </span>
          </div>
          
          <Separator className="mb-4" style={{ backgroundColor: `${styles.accent}20` }} />
          
          {/* Compact layout with name/title/QR side-by-side */}
          <div className="grid grid-cols-6 gap-2 mb-4">
            {/* Name & Title - Left */}
            <div className="col-span-4">
              {/* Company logo placed strategically above name */}
              {companyCard?.logoPath && (
                <div className="mb-3 flex">
                  <div 
                    className="w-12 h-12 rounded overflow-hidden border-2 mr-2"
                    style={{ 
                      borderColor: `${styles.accent}30`,
                      boxShadow: '0 3px 8px rgba(0,0,0,0.08)'
                    }}
                  >
                    <img 
                      src={companyCard.logoPath} 
                      alt={adminOrgName}
                      className="w-full h-full object-contain p-1" 
                    />
                  </div>
                </div>
              )}
              
              <h1 
                className="text-2xl font-bold mb-1"
                style={{ color: styles.textColor }}
              >
                {employee.firstName} {employee.lastName}
              </h1>
              <p 
                className="text-sm font-medium mb-3"
                style={{ color: styles.accent }}
              >
                {employee.title}
              </p>
              
              {/* Contact Info below name - more compact */}
              <div className="grid grid-cols-1 gap-1.5">
                {employee.email && (
                  <div className="flex items-center gap-2">
                    <Mail 
                      className="h-3.5 w-3.5 flex-shrink-0"
                      style={{ color: styles.accent }} 
                    />
                    <span className="text-xs truncate">{employee.email}</span>
                  </div>
                )}
                
                {employee.phone && (
                  <div className="flex items-center gap-2">
                    <Phone 
                      className="h-3.5 w-3.5 flex-shrink-0"
                      style={{ color: styles.accent }} 
                    />
                    <span className="text-xs">{employee.phone}</span>
                  </div>
                )}

                {employee.department && (
                  <div className="flex items-center gap-2">
                    <MapPin 
                      className="h-3.5 w-3.5 flex-shrink-0"
                      style={{ color: styles.accent }} 
                    />
                    <span className="text-xs">{employee.department}</span>
                  </div>
                )}
                
                <div className="flex items-center gap-2">
                  <Building
                    className="h-3.5 w-3.5 flex-shrink-0"
                    style={{ color: styles.accent }}
                  />
                  <span className="text-xs">{adminOrgName}</span>
                </div>
              </div>
            </div>
            
            {/* QR Code - Right */}
            <div className="col-span-2 flex flex-col items-center justify-start">
              <div 
                className="p-1.5 bg-white rounded-md mb-2"
                style={{ 
                  border: `1px solid ${styles.accent}30`,
                  boxShadow: '0 8px 15px rgba(0,0,0,0.08)'
                }}
              >
                <QrCode 
                  className="h-16 w-16" 
                  style={{ color: styles.textColor }}
                />
              </div>
              
              {/* Website URL directly below QR code */}
              {companyCard?.websiteUrl && (
                <div className="flex items-center justify-center gap-1 mb-1">
                  <Globe 
                    className="h-3 w-3 flex-shrink-0"
                    style={{ color: styles.accent }} 
                  />
                  <span 
                    className="text-center"
                    style={{ 
                      color: styles.accent,
                      fontSize: '0.7rem',
                      fontWeight: 500
                    }}
                  >
                    {new URL(companyCard.websiteUrl).hostname}
                  </span>
                </div>
              )}
              
              <span 
                className="text-center"
                style={{ 
                  color: `${styles.textColor}80`,
                  fontSize: '0.65rem'
                }}
              >
                Scan to connect
              </span>
            </div>
          </div>
        </div>

        {/* Company Card Section (Bottom Section - equal to first section) */}
        {companyCard ? (
          <div
            className="w-full relative"
            style={{
              aspectRatio: '1066/442', // Exactly matching first section
              backgroundColor: styles.secondaryColor || '#f8f8f8',
              borderTop: `2px solid ${styles.accent}20`
            }}
          >
            {/* Background image */}
            <div
              className="absolute inset-0 bg-center bg-cover"
              style={{
                backgroundImage: `url(${companyCard.imagePath})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                boxShadow: 'inset 0 -1px 10px rgba(0,0,0,0.05)'
              }}
            />
            
            {/* Color overlay using the secondary brand color */}
            <div 
              className="absolute inset-0"
              style={{
                background: `linear-gradient(140deg, ${styles.secondaryColor}10 0%, ${styles.secondaryColor}30 50%, ${styles.secondaryColor}20 100%)`,
                mixBlendMode: 'overlay',
                zIndex: 1
              }}
            />
            
            {/* Removed logo overlay as requested */}
            
            {/* Bottom gradient for depth */}
            <div 
              className="absolute bottom-0 left-0 right-0 h-14"
              style={{
                background: `linear-gradient(to top, ${styles.accent}20, transparent)`,
                zIndex: 3
              }}
            />
            
            {/* Top edge accent using primary brand color */}
            <div 
              className="absolute top-0 left-0 right-0 h-1.5"
              style={{
                background: `linear-gradient(to right, ${styles.accent}70, ${styles.accent}20)`,
                zIndex: 3
              }}
            />
          </div>
        ) : (
          <div 
            className="w-full flex items-center justify-center"
            style={{
              aspectRatio: '1066/442', // Exactly matching first section
              backgroundColor: '#f8f9fa',
              borderTop: `2px solid ${styles.accent}20`,
              boxShadow: 'inset 0 1px 6px rgba(0,0,0,0.02)'
            }}
          >
            <div className="text-center p-5">
              <div 
                className="w-16 h-16 mx-auto mb-3 rounded-full flex items-center justify-center"
                style={{ 
                  background: `linear-gradient(135deg, ${styles.accent}10, ${styles.accent}30)`,
                  boxShadow: `0 3px 12px ${styles.accent}20`
                }}
              >
                <Building 
                  className="w-8 h-8 opacity-70" 
                  style={{ color: styles.accent }}
                />
              </div>
              <p className="text-sm font-medium" style={{ color: styles.accent }}>
                Company branding section
              </p>
              <p className="text-xs text-gray-500 mt-1 max-w-xs">
                Upload your company card in Organization Settings
              </p>
            </div>
          </div>
        )}
        
        {/* Actions - Professional styled action bar */}
        <div 
          className="flex justify-center gap-3 py-4 px-5 border-t"
          style={{ 
            borderColor: `${styles.accent}15`,
            background: `linear-gradient(to bottom, #fff, ${styles.secondaryColor}15)`,
            borderBottomLeftRadius: '8px',
            borderBottomRightRadius: '8px'
          }}
        >
          <Button 
            className="rounded-full shadow-sm relative overflow-hidden transition-all duration-300"
            style={{ 
              background: `linear-gradient(135deg, ${styles.accent}, ${styles.accent}dd)`,
              color: 'white',
              padding: '7px 14px',
              border: 'none',
              fontSize: '0.85rem',
              fontWeight: 500
            }}
            size="sm" 
            onClick={handleShare}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-1px)';
              e.currentTarget.style.boxShadow = `0 4px 10px ${styles.accent}30`;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = `0 1px 3px ${styles.accent}20`;
            }}
          >
            <Share2 className="h-4 w-4 mr-1.5" />
            Share
          </Button>
          
          {employee.email && (
            <Button 
              className="rounded-full shadow-sm transition-all duration-300"
              style={{ 
                backgroundColor: 'white',
                color: styles.accent,
                padding: '7px 14px',
                borderColor: `${styles.accent}30`,
                fontSize: '0.85rem',
                fontWeight: 500
              }}
              variant="outline" 
              size="sm" 
              asChild
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-1px)';
                e.currentTarget.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.05)';
                e.currentTarget.style.borderColor = styles.accent;
                e.currentTarget.style.backgroundColor = `${styles.accent}05`;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.05)';
                e.currentTarget.style.borderColor = `${styles.accent}30`;
                e.currentTarget.style.backgroundColor = 'white';
              }}
            >
              <a href={`mailto:${employee.email}`} className="flex items-center">
                <Mail className="h-4 w-4 mr-1.5" />
                Email
              </a>
            </Button>
          )}
          
          {employee.phone && (
            <Button
              className="rounded-full shadow-sm transition-all duration-300"
              style={{ 
                backgroundColor: 'white',
                color: styles.accent,
                padding: '7px 14px',
                borderColor: `${styles.accent}30`,
                fontSize: '0.85rem',
                fontWeight: 500
              }}
              variant="outline" 
              size="sm" 
              asChild
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-1px)';
                e.currentTarget.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.05)';
                e.currentTarget.style.borderColor = styles.accent;
                e.currentTarget.style.backgroundColor = `${styles.accent}05`;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.05)';
                e.currentTarget.style.borderColor = `${styles.accent}30`;
                e.currentTarget.style.backgroundColor = 'white';
              }}
            >
              <a href={`tel:${employee.phone}`} className="flex items-center">
                <Phone className="h-4 w-4 mr-1.5" />
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