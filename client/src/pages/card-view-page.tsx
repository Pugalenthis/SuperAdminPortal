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
        {/* Header Above First Section (Logo removed as requested) */}
        <div className="px-5 py-3 flex justify-between items-center" 
          style={{
            borderBottom: `1px solid ${styles.secondaryColor}30`,
            background: `linear-gradient(to right, ${styles.secondaryColor}15, ${styles.secondaryColor}30)`
          }}
        >
          <div>
            <p className="text-sm font-semibold uppercase tracking-wider" 
               style={{ color: styles.accent }}
            >
              {employee?.adminId && data?.employee?.adminId === 4 ? "TRDFIN" : data?.employee?.department || "BUSINESS CARD"}
            </p>
            {companyCard?.websiteUrl && (
              <p className="text-xs" style={{ color: `${styles.textColor}90` }}>
                {new URL(companyCard.websiteUrl).hostname}
              </p>
            )}
          </div>
          
          <span 
            className="text-xs px-2.5 py-0.5 rounded-full"
            style={{ 
              backgroundColor: `${styles.secondaryColor}50`,
              color: styles.textColor,
              boxShadow: `0 2px 4px ${styles.secondaryColor}20`
            }}
          >
            Digital Card
          </span>
        </div>
      
        {/* Employee Section (Top Section - 1066px × 442px) */}
        <div 
          className="w-full px-5 pt-4 pb-4"
          style={{ 
            aspectRatio: '1066/442', // Exact dimensions as specified
            background: `linear-gradient(to bottom right, ${styles.background}, ${styles.secondaryColor}10)`, 
            color: styles.textColor
          }}
        >
          
          {/* Divider removed as requested */}
          
          {/* Compact layout with name/title/QR side-by-side */}
          <div className="grid grid-cols-6 gap-2 mb-4">
            {/* Name & Title - Left */}
            <div className="col-span-4">
              {/* Logo removed from first section as requested */}
              
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
                    <div 
                      className="rounded-full p-1 flex-shrink-0" 
                      style={{ 
                        background: `linear-gradient(135deg, ${styles.secondaryColor}40, ${styles.secondaryColor}20)`,
                        boxShadow: `0 2px 4px ${styles.secondaryColor}15` 
                      }}
                    >
                      <Mail 
                        className="h-2.5 w-2.5" 
                        style={{ color: styles.textColor }} 
                      />
                    </div>
                    <span className="text-xs truncate">{employee.email}</span>
                  </div>
                )}
                
                {employee.phone && (
                  <div className="flex items-center gap-2">
                    <div 
                      className="rounded-full p-1 flex-shrink-0" 
                      style={{ 
                        background: `linear-gradient(135deg, ${styles.secondaryColor}40, ${styles.secondaryColor}20)`,
                        boxShadow: `0 2px 4px ${styles.secondaryColor}15` 
                      }}
                    >
                      <Phone 
                        className="h-2.5 w-2.5" 
                        style={{ color: styles.textColor }} 
                      />
                    </div>
                    <span className="text-xs">{employee.phone}</span>
                  </div>
                )}

                {employee.department && (
                  <div className="flex items-center gap-2">
                    <div 
                      className="rounded-full p-1 flex-shrink-0" 
                      style={{ 
                        background: `linear-gradient(135deg, ${styles.secondaryColor}40, ${styles.secondaryColor}20)`,
                        boxShadow: `0 2px 4px ${styles.secondaryColor}15` 
                      }}
                    >
                      <MapPin 
                        className="h-2.5 w-2.5" 
                        style={{ color: styles.textColor }} 
                      />
                    </div>
                    <span className="text-xs">{employee.department}</span>
                  </div>
                )}
                
                <div className="flex items-center gap-2">
                  <div 
                    className="rounded-full p-1 flex-shrink-0" 
                    style={{ 
                      background: `linear-gradient(135deg, ${styles.secondaryColor}40, ${styles.secondaryColor}20)`,
                      boxShadow: `0 2px 4px ${styles.secondaryColor}15` 
                    }}
                  >
                    <Building 
                      className="h-2.5 w-2.5" 
                      style={{ color: styles.textColor }} 
                    />
                  </div>
                  <span className="text-xs">{employee?.adminId && data?.employee?.adminId === 4 ? "TRDFIN" : data?.employee?.department || "BUSINESS CARD"}</span>
                </div>
              </div>
            </div>
            
            {/* QR Code - Right */}
            <div className="col-span-2 flex flex-col items-center justify-start">
              <div 
                className="p-1.5 bg-white rounded-md mb-2"
                style={{ 
                  border: `1px solid ${styles.secondaryColor}40`,
                  boxShadow: `0 8px 15px ${styles.secondaryColor}20`,
                  background: `linear-gradient(135deg, #fff, ${styles.secondaryColor}05)`
                }}
              >
                {card?.qrCodeUrl ? (
                  <img 
                    src={card?.qrCodeUrl} 
                    alt="QR Code" 
                    className="h-20 w-20" 
                  />
                ) : (
                  <QrCode 
                    className="h-20 w-20" 
                    style={{ color: styles.textColor }}
                  />
                )}
              </div>
              
              {/* Website URL directly below QR code */}
              {companyCard?.websiteUrl && (
                <div 
                  className="flex items-center justify-center gap-1.5 mb-1 px-2.5 py-1 rounded-full"
                  style={{ 
                    background: `linear-gradient(to right, ${styles.secondaryColor}30, ${styles.secondaryColor}10)`,
                    boxShadow: `0 2px 4px ${styles.secondaryColor}15`
                  }}
                >
                  <Globe 
                    className="h-3 w-3 flex-shrink-0"
                    style={{ color: styles.textColor }} 
                  />
                  <span 
                    className="text-center"
                    style={{ 
                      color: styles.textColor,
                      fontSize: '0.75rem',
                      fontWeight: 500
                    }}
                  >
                    {new URL(companyCard.websiteUrl).hostname}
                  </span>
                </div>
              )}
              
              <div className="flex flex-col items-center">
                <span 
                  className="text-center"
                  style={{ 
                    color: `${styles.textColor}80`,
                    fontSize: '0.65rem'
                  }}
                >
                  Scan to connect
                </span>
                
                {companyCard?.websiteUrl && (
                  <span 
                    className="text-center mt-1.5"
                    style={{ 
                      color: styles.accent,
                      fontSize: '0.75rem',
                      fontWeight: 500
                    }}
                  >
                    {companyCard.websiteUrl}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Company Card Section (Bottom Section - equal to first section) */}
        {companyCard ? (
          <div
            className="w-full relative"
            style={{
              aspectRatio: '1066/442', // Exactly matching first section
              backgroundColor: '#f8f8f8',
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
            
            {/* Simple overlay */}
            <div 
              className="absolute inset-0"
              style={{
                background: 'rgba(255, 255, 255, 0.05)',
                mixBlendMode: 'overlay',
                zIndex: 1
              }}
            />
            
            {/* Removed logo overlay as requested */}
            
            {/* Bottom gradient for depth */}
            <div 
              className="absolute bottom-0 left-0 right-0 h-14"
              style={{
                background: `linear-gradient(to top, rgba(0,0,0,0.05), transparent)`,
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
            className="w-full relative"
            style={{
              aspectRatio: '1066/442', // Exactly matching first section
              backgroundColor: '#f8f9fa',
              borderTop: `2px solid ${styles.accent}20`,
              boxShadow: 'inset 0 1px 6px rgba(0,0,0,0.02)',
              overflow: 'hidden'
            }}
          >
            {/* Simple background pattern */}
            <div 
              className="absolute inset-0 opacity-5"
              style={{ 
                backgroundImage: `repeating-linear-gradient(135deg, #999, #999 10px, transparent 10px, transparent 40px)`,
                zIndex: 1
              }}
            />
            
            <div className="text-center p-5 relative z-10">
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
              <p 
                className="text-xs mt-1 max-w-xs mx-auto"
                style={{ color: '#888' }}
              >
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
                background: `linear-gradient(to right, ${styles.secondaryColor}30, ${styles.secondaryColor}10)`,
                color: styles.textColor,
                padding: '7px 14px',
                borderColor: `${styles.secondaryColor}30`,
                fontSize: '0.85rem',
                fontWeight: 500
              }}
              variant="outline" 
              size="sm" 
              asChild
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-1px)';
                e.currentTarget.style.boxShadow = `0 4px 8px ${styles.secondaryColor}20`;
                e.currentTarget.style.borderColor = styles.secondaryColor;
                e.currentTarget.style.background = `linear-gradient(to right, ${styles.secondaryColor}40, ${styles.secondaryColor}20)`;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = `0 1px 3px ${styles.secondaryColor}10`;
                e.currentTarget.style.borderColor = `${styles.secondaryColor}30`;
                e.currentTarget.style.background = `linear-gradient(to right, ${styles.secondaryColor}30, ${styles.secondaryColor}10)`;
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
                background: `linear-gradient(to right, ${styles.secondaryColor}30, ${styles.secondaryColor}10)`,
                color: styles.textColor,
                padding: '7px 14px',
                borderColor: `${styles.secondaryColor}30`,
                fontSize: '0.85rem',
                fontWeight: 500
              }}
              variant="outline" 
              size="sm" 
              asChild
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-1px)';
                e.currentTarget.style.boxShadow = `0 4px 8px ${styles.secondaryColor}20`;
                e.currentTarget.style.borderColor = styles.secondaryColor;
                e.currentTarget.style.background = `linear-gradient(to right, ${styles.secondaryColor}40, ${styles.secondaryColor}20)`;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = `0 1px 3px ${styles.secondaryColor}10`;
                e.currentTarget.style.borderColor = `${styles.secondaryColor}30`;
                e.currentTarget.style.background = `linear-gradient(to right, ${styles.secondaryColor}30, ${styles.secondaryColor}10)`;
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