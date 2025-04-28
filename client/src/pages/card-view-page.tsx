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
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gradient-to-b from-gray-50 to-gray-100">
      {/* Business Card - Dual Section Design with exact dimensions */}
      <Card 
        className="w-full max-w-md mx-auto overflow-hidden relative group"
        style={{
          boxShadow: '0 10px 30px rgba(0, 0, 0, 0.1)',
          transition: 'all 0.3s ease',
          transform: 'perspective(1000px) rotateX(0deg)',
          borderRadius: '12px'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'perspective(1000px) rotateX(2deg) scale(1.01)';
          e.currentTarget.style.boxShadow = '0 15px 35px rgba(0, 0, 0, 0.1)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'perspective(1000px) rotateX(0deg)';
          e.currentTarget.style.boxShadow = '0 10px 30px rgba(0, 0, 0, 0.1)';
        }}
      >
        {/* Employee Section (Top Section - 1066px × 442px) */}
        <div 
          className="w-full"
          style={{ 
            aspectRatio: '1066/442',
            background: styles.background, 
            color: styles.textColor,
            position: 'relative',
            overflow: 'hidden'
          }}
        >
          {/* Background design elements */}
          <div className="absolute top-0 left-0 w-full h-full opacity-5">
            <div 
              className="absolute top-[-150px] right-[-150px] w-[500px] h-[500px] rounded-full" 
              style={{ backgroundColor: styles.accent }}
            />
            <div 
              className="absolute bottom-[-200px] left-[-200px] w-[400px] h-[400px] rounded-full" 
              style={{ backgroundColor: styles.accent }}
            />
          </div>

          {/* Two-column layout */}
          <div className="grid grid-cols-2 h-full relative z-10">
            {/* Left Side */}
            <div className="flex flex-col justify-center p-8 relative">
              <div 
                className="absolute top-0 bottom-0 right-0 w-[1px]" 
                style={{
                  background: `linear-gradient(to bottom, transparent, ${styles.accent}80, transparent)`
                }}
              />
              
              {/* Name */}
              <div className="mb-6">
                <h1 
                  className="text-3xl font-bold"
                  style={{ color: styles.accent }}
                >
                  {employee.firstName} {employee.lastName}
                </h1>
                <p className="text-lg opacity-90 mt-1">{employee.title}</p>
              </div>
              
              {/* Contact Information */}
              <div className="space-y-4">
                {employee.email && (
                  <div className="flex items-center gap-3 group">
                    <div 
                      className="w-8 h-8 rounded-full flex items-center justify-center transition-colors"
                      style={{ backgroundColor: `${styles.accent}15` }}
                    >
                      <Mail 
                        className="h-4 w-4 flex-shrink-0"
                        style={{ color: styles.accent }} 
                      />
                    </div>
                    <span className="text-sm">{employee.email}</span>
                  </div>
                )}
                
                {employee.phone && (
                  <div className="flex items-center gap-3 group">
                    <div 
                      className="w-8 h-8 rounded-full flex items-center justify-center"
                      style={{ backgroundColor: `${styles.accent}15` }}
                    >
                      <Phone 
                        className="h-4 w-4 flex-shrink-0"
                        style={{ color: styles.accent }} 
                      />
                    </div>
                    <span className="text-sm">{employee.phone}</span>
                  </div>
                )}

                {/* Mobile/WhatsApp - Using phone as fallback */}
                {employee.phone && (
                  <div className="flex items-center gap-3 group">
                    <div 
                      className="w-8 h-8 rounded-full flex items-center justify-center"
                      style={{ backgroundColor: `${styles.accent}15` }}
                    >
                      <Smartphone 
                        className="h-4 w-4 flex-shrink-0"
                        style={{ color: styles.accent }} 
                      />
                    </div>
                    <span className="text-sm">{employee.phone} (Mobile)</span>
                  </div>
                )}

                {/* Address - Using department as fallback */}
                {employee.department && (
                  <div className="flex items-center gap-3 group">
                    <div 
                      className="w-8 h-8 rounded-full flex items-center justify-center"
                      style={{ backgroundColor: `${styles.accent}15` }}
                    >
                      <MapPin 
                        className="h-4 w-4 flex-shrink-0"
                        style={{ color: styles.accent }} 
                      />
                    </div>
                    <span className="text-sm">{employee.department}</span>
                  </div>
                )}
              </div>
            </div>
            
            {/* Right Side */}
            <div className="flex flex-col justify-between p-8">
              {/* Company Name (using Organization Name) */}
              <div className="text-center">
                <h2 
                  className="text-xl font-semibold"
                  style={{ color: styles.accent }}
                >
                  {adminOrgName}
                </h2>
              </div>
              
              {/* QR Code */}
              <div 
                className="mx-auto flex items-center justify-center p-3 rounded-lg shadow-sm"
                style={{ 
                  background: 'white',
                  border: `2px solid ${styles.accent}20`
                }}
              >
                <div 
                  className="border-4 rounded-md p-1"
                  style={{ borderColor: `${styles.accent}30` }}
                >
                  <QrCode className="h-24 w-24 text-gray-800" />
                </div>
              </div>
              
              {/* Website */}
              <div className="text-center">
                <span 
                  className="text-sm px-4 py-1 rounded-full inline-block"
                  style={{ 
                    backgroundColor: `${styles.accent}15`,
                    color: styles.accent
                  }}
                >
                  www.companywebsite.com
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Company Card Section (Bottom Section - 1066px × 445px) */}
        <div 
          className="w-full border-t relative"
          style={{
            overflow: 'hidden',
            borderColor: `${styles.accent}30`
          }}
        >
          {companyCard ? (
            <>
              <div
                className="w-full relative"
                style={{
                  aspectRatio: '1066/445',
                }}
              >
                {/* Subtle gradient overlay */}
                <div 
                  className="absolute inset-0"
                  style={{
                    backgroundImage: 'linear-gradient(to bottom, rgba(0,0,0,0.05), rgba(0,0,0,0))',
                    zIndex: 1
                  }}
                />
                
                {/* Background image */}
                <div
                  className="absolute inset-0 bg-center bg-cover"
                  style={{
                    backgroundImage: `url(${companyCard.imagePath})`,
                    transform: 'scale(1.02)',
                    filter: 'brightness(1.03)',
                    transition: 'transform 0.3s ease-in-out'
                  }}
                />
                
                {/* Bottom shadow */}
                <div 
                  className="absolute bottom-0 left-0 right-0 h-8"
                  style={{
                    background: 'linear-gradient(to top, rgba(0,0,0,0.1), rgba(0,0,0,0))',
                    zIndex: 2
                  }}
                />
              </div>
            </>
          ) : (
            <div 
              className="relative"
              style={{
                aspectRatio: '1066/445'
              }}
            >
              {/* Background pattern */}
              <div 
                className="absolute inset-0 opacity-5"
                style={{
                  background: `radial-gradient(circle at 30% 40%, ${styles.accent} 0%, transparent 80%)`,
                }}
              />
              
              <div 
                className="absolute inset-0 flex items-center justify-center bg-gray-50"
                style={{
                  background: 'linear-gradient(to bottom right, #f9f9f9, #f0f0f0)'
                }}
              >
                <div className="text-center p-6 rounded-lg">
                  <Building 
                    className="w-12 h-12 mx-auto mb-2 opacity-20" 
                    style={{ color: styles.accent }}
                  />
                  <p className="text-sm text-gray-500 italic">
                    Company branding section not yet configured
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
        
        {/* Actions */}
        <CardContent className="p-4 border-t" style={{ borderColor: `${styles.accent}20` }}>
          <div className="flex justify-center gap-4">
            <Button 
              className="transition-all hover:shadow-md"
              style={{ 
                backgroundColor: styles.accent,
                color: 'white',
                borderRadius: '20px',
                paddingLeft: '18px',
                paddingRight: '18px'
              }}
              size="sm" 
              onClick={handleShare}
            >
              <Share2 className="h-4 w-4 mr-2" />
              Share
            </Button>
            
            {employee.email && (
              <Button 
                className="transition-all hover:shadow-md"
                style={{ 
                  backgroundColor: `${styles.accent}15`,
                  color: styles.accent,
                  borderRadius: '20px',
                  paddingLeft: '18px',
                  paddingRight: '18px',
                  border: 'none'
                }}
                variant="outline" 
                size="sm" 
                asChild
              >
                <a href={`mailto:${employee.email}`}>
                  <Mail className="h-4 w-4 mr-2" />
                  Email
                </a>
              </Button>
            )}
            
            {employee.phone && (
              <Button 
                className="transition-all hover:shadow-md"
                style={{ 
                  backgroundColor: `${styles.accent}15`,
                  color: styles.accent,
                  borderRadius: '20px',
                  paddingLeft: '18px',
                  paddingRight: '18px',
                  border: 'none'
                }}
                variant="outline" 
                size="sm" 
                asChild
              >
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