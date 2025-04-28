import { useState, useEffect, useCallback } from "react";
import { useLocation, useRoute } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { getQueryFn, apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { CardTemplate } from "@shared/schema";

// UI Components
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Save, Eye, Grid, Palette, Type } from "lucide-react";

export default function AdminTemplateCustomizePage() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [match, params] = useRoute<{ id: string }>("/admin/template/:id");
  const templateId = match ? parseInt(params.id) : null;
  
  // State for customization 
  const [colors, setColors] = useState({
    primary: "#0f766e",
    secondary: "#f59e0b",
    text: "#1e293b",
    background: "#ffffff"
  });
  const [fonts, setFonts] = useState({
    headingFont: "Inter",
    bodyFont: "Roboto"
  });
  const [customName, setCustomName] = useState("");
  const [layout, setLayout] = useState("horizontal");
  const [showLogo, setShowLogo] = useState(true);
  
  // Navigation function
  const navigate = useCallback((path: string) => {
    setLocation(path);
  }, [setLocation]);
  
  // Fetch user to verify admin access
  const { data: user, isLoading: userLoading } = useQuery({
    queryKey: ['/api/user'],
    queryFn: getQueryFn({ on401: "throw" }),
    retry: false,
    onError: () => {
      navigate('/admin/login');
    }
  });
  
  // Check if logged in user is an admin
  useEffect(() => {
    if (user && user.userType !== 'admin') {
      toast({
        title: "Access denied",
        description: "This page is only for organization admins",
        variant: "destructive"
      });
      navigate('/');
    }
  }, [user, navigate, toast]);
  
  // Fetch template data
  const { data: template, isLoading: templateLoading } = useQuery<CardTemplate>({
    queryKey: ['/api/card-templates', templateId],
    queryFn: async () => {
      // Add logging to debug the templateId value
      console.log("Fetching template with ID:", templateId);
      if (!templateId) throw new Error("No template ID provided");
      
      const response = await fetch(`/api/card-templates/${templateId}`);
      if (!response.ok) {
        throw new Error("Failed to fetch template data");
      }
      return await response.json();
    },
    retry: false,
    enabled: !!templateId && !!user && user.userType === 'admin',
    onError: (error) => {
      console.error("Error fetching template:", error);
      toast({
        title: "Error",
        description: "Failed to load template data. " + error.message,
        variant: "destructive"
      });
    }
  });
  
  // Set initial values from template once loaded
  useEffect(() => {
    if (template) {
      setCustomName(template.name + " (Custom)");
      // This would populate customization options if they existed in the template
      if (template.template && typeof template.template === 'object') {
        const templateData = template.template as any;
        if (templateData.colors) {
          setColors(prevColors => ({
            ...prevColors,
            ...templateData.colors
          }));
        }
        if (templateData.fonts) {
          setFonts(prevFonts => ({
            ...prevFonts,
            ...templateData.fonts
          }));
        }
        if (templateData.layout) {
          setLayout(templateData.layout);
        }
        if (templateData.showLogo !== undefined) {
          setShowLogo(templateData.showLogo);
        }
      }
    }
  }, [template]);
  
  // Handle color change
  const handleColorChange = (colorKey: keyof typeof colors, value: string) => {
    setColors(prev => ({
      ...prev,
      [colorKey]: value
    }));
  };
  
  // Handle font change
  const handleFontChange = (fontKey: keyof typeof fonts, value: string) => {
    setFonts(prev => ({
      ...prev,
      [fontKey]: value
    }));
  };
  
  const handleSaveCustomization = async () => {
    if (!template) {
      toast({
        title: "Error",
        description: "No template data available. Please try again.",
        variant: "destructive"
      });
      return;
    }
    
    try {
      console.log("Template being saved:", template);
      console.log("Template ID:", template.id, "Type:", typeof template.id);
      
      // Create a customization data object with all settings
      const customizationData = {
        colors,
        fonts,
        layout,
        showLogo
      };
      
      // Create the data to send to the API
      const templateData = {
        name: customName,
        baseTemplateId: Number(template.id), // Ensure it's a number
        customization: customizationData,
        description: `Custom version of ${template.name}`
      };
      
      console.log("Sending data to API:", templateData);
      
      // Save to backend as a custom template
      const response = await apiRequest('/api/custom-templates', 'POST', templateData);
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error("Error response:", errorData);
        throw new Error(errorData.message || 'Failed to save custom template');
      }
      
      // Success - show toast
      toast({
        title: "Custom template saved",
        description: "Your template has been saved to My Templates",
      });
      
      // First invalidate the custom templates query
      queryClient.invalidateQueries({ queryKey: ['/api/custom-templates'] });
      
      // Explicitly fetch the latest data before redirecting
      try {
        await queryClient.fetchQuery({ 
          queryKey: ['/api/custom-templates'],
          queryFn: getQueryFn({ on401: "throw" })
        });
        console.log("Custom templates refreshed successfully");
      } catch (error) {
        console.error("Error refreshing templates data:", error);
      }
      
      // Redirect to templates page with query parameter to auto-select My Templates tab
      // Add a small delay to ensure data is fully loaded
      setTimeout(() => {
        // Add a query parameter to indicate we should show the My Templates tab
        navigate('/admin/templates?tab=my-templates');
      }, 500);
    } catch (error) {
      console.error("Save error:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to save template customization",
        variant: "destructive"
      });
    }
  };
  
  const handlePreview = () => {
    // This would show a preview in Phase 3
    toast({
      title: "Preview",
      description: "Template preview coming in Phase 3",
    });
  };
  
  // Loading state
  if (userLoading || templateLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full"></div>
      </div>
    );
  }
  
  if (!templateId || !template) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <h2 className="text-2xl font-bold mb-4">Template Not Found</h2>
        <p className="text-muted-foreground mb-6">The template you're looking for doesn't exist.</p>
        <Button onClick={() => navigate('/admin/templates')}>
          Back to Templates
        </Button>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold">Customize Template</h1>
              <p className="text-muted-foreground">
                Customize "{template.name}" template to match your brand
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <Button variant="outline" onClick={() => navigate('/admin/templates')}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Templates
              </Button>
              <Button variant="outline" onClick={handlePreview}>
                <Eye className="h-4 w-4 mr-2" />
                Preview
              </Button>
              <Button onClick={handleSaveCustomization}>
                <Save className="h-4 w-4 mr-2" />
                Save Customization
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Customization options */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle>Customization Options</CardTitle>
                <CardDescription>
                  Adjust these settings to customize the template
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-3">
                  <Label htmlFor="template-name">Custom Template Name</Label>
                  <Input 
                    id="template-name" 
                    value={customName} 
                    onChange={(e) => setCustomName(e.target.value)}
                  />
                </div>
                
                <div className="space-y-3">
                  <Label>Layout Style</Label>
                  <Select value={layout} onValueChange={setLayout}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select layout" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="horizontal">Horizontal</SelectItem>
                      <SelectItem value="vertical">Vertical</SelectItem>
                      <SelectItem value="compact">Compact</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Switch 
                    id="show-logo" 
                    checked={showLogo} 
                    onCheckedChange={setShowLogo} 
                  />
                  <Label htmlFor="show-logo">Show company logo</Label>
                </div>
                
                <Tabs defaultValue="colors">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="colors">
                      <Palette className="h-4 w-4 mr-2" />
                      Colors
                    </TabsTrigger>
                    <TabsTrigger value="typography">
                      <Type className="h-4 w-4 mr-2" />
                      Typography
                    </TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="colors" className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="primary-color">Primary Color</Label>
                      <div className="flex items-center space-x-2">
                        <Input 
                          id="primary-color" 
                          type="color" 
                          className="w-12 h-9 p-1" 
                          value={colors.primary} 
                          onChange={(e) => handleColorChange('primary', e.target.value)}
                        />
                        <Input 
                          value={colors.primary}
                          onChange={(e) => handleColorChange('primary', e.target.value)}
                          className="font-mono"
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="secondary-color">Secondary Color</Label>
                      <div className="flex items-center space-x-2">
                        <Input 
                          id="secondary-color" 
                          type="color" 
                          className="w-12 h-9 p-1" 
                          value={colors.secondary} 
                          onChange={(e) => handleColorChange('secondary', e.target.value)}
                        />
                        <Input 
                          value={colors.secondary}
                          onChange={(e) => handleColorChange('secondary', e.target.value)}
                          className="font-mono"
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="text-color">Text Color</Label>
                      <div className="flex items-center space-x-2">
                        <Input 
                          id="text-color" 
                          type="color" 
                          className="w-12 h-9 p-1" 
                          value={colors.text} 
                          onChange={(e) => handleColorChange('text', e.target.value)}
                        />
                        <Input 
                          value={colors.text}
                          onChange={(e) => handleColorChange('text', e.target.value)}
                          className="font-mono"
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="background-color">Background Color</Label>
                      <div className="flex items-center space-x-2">
                        <Input 
                          id="background-color" 
                          type="color" 
                          className="w-12 h-9 p-1" 
                          value={colors.background} 
                          onChange={(e) => handleColorChange('background', e.target.value)}
                        />
                        <Input 
                          value={colors.background}
                          onChange={(e) => handleColorChange('background', e.target.value)}
                          className="font-mono"
                        />
                      </div>
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="typography" className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="heading-font">Heading Font</Label>
                      <Select 
                        value={fonts.headingFont} 
                        onValueChange={(value) => handleFontChange('headingFont', value)}
                      >
                        <SelectTrigger id="heading-font">
                          <SelectValue placeholder="Select heading font" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Inter">Inter</SelectItem>
                          <SelectItem value="Roboto">Roboto</SelectItem>
                          <SelectItem value="Montserrat">Montserrat</SelectItem>
                          <SelectItem value="Playfair Display">Playfair Display</SelectItem>
                          <SelectItem value="Oswald">Oswald</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="body-font">Body Font</Label>
                      <Select 
                        value={fonts.bodyFont} 
                        onValueChange={(value) => handleFontChange('bodyFont', value)}
                      >
                        <SelectTrigger id="body-font">
                          <SelectValue placeholder="Select body font" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Inter">Inter</SelectItem>
                          <SelectItem value="Roboto">Roboto</SelectItem>
                          <SelectItem value="Open Sans">Open Sans</SelectItem>
                          <SelectItem value="Lato">Lato</SelectItem>
                          <SelectItem value="Nunito">Nunito</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </div>
          
          {/* Right: Preview area */}
          <div className="lg:col-span-2">
            <Card className="h-full">
              <CardHeader>
                <CardTitle>Preview</CardTitle>
                <CardDescription>
                  See how your business card will look with these customizations
                </CardDescription>
              </CardHeader>
              <CardContent className="flex items-center justify-center min-h-[450px]">
                <div className="aspect-[1.7/1] w-full max-w-lg bg-muted relative overflow-hidden rounded-lg border">
                  <div 
                    className="absolute inset-0 flex flex-col p-6"
                    style={{ 
                      backgroundColor: colors.background,
                      color: colors.text,
                      fontFamily: fonts.bodyFont
                    }}
                  >
                    {/* Template preview here - This will be enhanced in Phase 3 */}
                    <div className="flex flex-1 flex-col justify-center items-center">
                      {showLogo && (
                        <div 
                          className="mb-4 h-12 w-12 rounded-full bg-opacity-20"
                          style={{ backgroundColor: colors.primary }}
                        >
                          <div className="h-full w-full flex items-center justify-center">
                            <span className="text-2xl font-bold" style={{ color: colors.primary }}>
                              {user?.orgName?.charAt(0) || 'T'}
                            </span>
                          </div>
                        </div>
                      )}
                      
                      <h3 
                        className="text-xl font-bold mb-1" 
                        style={{ 
                          fontFamily: fonts.headingFont,
                          color: colors.primary 
                        }}
                      >
                        Employee Name
                      </h3>
                      
                      <p className="text-sm mb-3">Job Title</p>
                      
                      <div 
                        className="h-1 w-20 rounded-full my-2"
                        style={{ backgroundColor: colors.secondary }}
                      ></div>
                      
                      <div className="text-center mt-2">
                        <p className="text-sm">email@example.com</p>
                        <p className="text-sm">+1 (555) 123-4567</p>
                        <p 
                          className="text-sm mt-2 font-semibold"
                          style={{ color: colors.primary }}
                        >
                          {user?.orgName || 'Company Name'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="flex justify-between">
                <p className="text-sm text-muted-foreground">
                  Preview mode shows basic layout and styling. Actual card may vary.
                </p>
              </CardFooter>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}