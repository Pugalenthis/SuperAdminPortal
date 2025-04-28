import { useState, useEffect, useCallback } from "react";
import { useRoute, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { getQueryFn, apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Form, FormControl, FormDescription, FormField, FormItem, 
  FormLabel, FormMessage 
} from "@/components/ui/form";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ArrowLeft, Save, ExternalLink } from "lucide-react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Employee, CardTemplate } from "@shared/schema";

// Form schema
const cardFormSchema = z.object({
  templateId: z.string().min(1, "Please select a template"),
  customization: z.record(z.any()).optional()
});

type CardFormValues = z.infer<typeof cardFormSchema>;

export default function AdminNewCardPage() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  
  // Navigation function
  const navigate = useCallback((path: string) => {
    setLocation(path);
  }, [setLocation]);
  const [, params] = useRoute("/admin/employees/:employeeId/cards/new");
  const employeeId = params?.employeeId ? parseInt(params.employeeId) : null;
  
  // Verify admin access
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
  
  // Fetch employee
  const { data: employee, isLoading: employeeLoading } = useQuery<Employee>({
    queryKey: [`/api/employees/${employeeId}`],
    queryFn: getQueryFn({ on401: "throw" }),
    retry: false,
    enabled: !!employeeId && !!user && user.userType === 'admin',
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to fetch employee information",
        variant: "destructive"
      });
      navigate('/admin/employees');
    }
  });
  
  // Fetch standard templates
  const { data: standardTemplates = [], isLoading: standardTemplatesLoading } = useQuery<CardTemplate[]>({
    queryKey: ['/api/card-templates'],
    queryFn: getQueryFn({ on401: "throw" }),
    retry: false,
    enabled: !!user && user.userType === 'admin'
  });

  // Fetch custom templates
  const { data: customTemplates = [], isLoading: customTemplatesLoading } = useQuery({
    queryKey: ['/api/custom-templates'],
    queryFn: getQueryFn({ on401: "throw" }),
    retry: false,
    enabled: !!user && user.userType === 'admin'
  });
  
  // Combine templates
  const templates = [...standardTemplates, ...customTemplates];
  
  // Get default template ID
  const getDefaultTemplateId = () => {
    const defaultTemplate = templates.find(template => template.isDefault);
    return defaultTemplate ? defaultTemplate.id.toString() : 
           templates.length > 0 ? templates[0].id.toString() : "";
  };
  
  // Setup form
  const form = useForm<CardFormValues>({
    resolver: zodResolver(cardFormSchema),
    defaultValues: {
      templateId: "",
      customization: {}
    }
  });
  
  // Update default template when templates are loaded
  useEffect(() => {
    if (templates.length > 0) {
      form.setValue('templateId', getDefaultTemplateId());
    }
  }, [templates]);
  
  // Get selected template
  const selectedTemplateId = form.watch('templateId');
  const selectedTemplate = templates.find(t => t.id.toString() === selectedTemplateId);
  
  // Get template styles for preview
  const getTemplateStyles = (template: any) => {
    if (!template) return {};
    
    try {
      // Check if this is a custom template
      if (template.customization) {
        // For custom templates, use the customization data
        const colors = template.customization.colors || {};
        return {
          background: colors.background || "#ffffff",
          textColor: colors.text || "#1e293b",
          accent: colors.primary || "#0f766e",
          layout: template.customization.layout || "standard"
        };
      } else {
        // For standard templates
        const templateData = typeof template.template === 'string' 
          ? JSON.parse(template.template) 
          : template.template;
        
        return {
          background: templateData.background || "#ffffff",
          textColor: templateData.textColor || "#000000",
          accent: templateData.accent || "#0066cc",
          layout: templateData.layout || "standard"
        };
      }
    } catch (error) {
      console.error("Error parsing template:", error);
      return {
        background: "#ffffff",
        textColor: "#000000",
        accent: "#0066cc",
        layout: "standard"
      };
    }
  };
  
  const styles = getTemplateStyles(selectedTemplate);
  
  // Mutation for creating card
  const createCardMutation = useMutation({
    mutationFn: async (data: CardFormValues) => {
      const response = await apiRequest("POST", "/api/cards", {
        employeeId: employeeId,
        templateId: parseInt(data.templateId),
        customization: data.customization
      });
      
      return await response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Business card created",
        description: "The business card has been created successfully"
      });
      
      // Navigate to employee page
      navigate(`/admin/employees/${employeeId}`);
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to create business card",
        description: error.message || "An error occurred",
        variant: "destructive"
      });
    }
  });
  
  // Submit handler
  const onSubmit = (values: CardFormValues) => {
    if (!employeeId) {
      toast({
        title: "Error",
        description: "Employee ID is missing",
        variant: "destructive"
      });
      return;
    }
    
    createCardMutation.mutate(values);
  };
  
  // Loading state
  if (userLoading || employeeLoading || standardTemplatesLoading || customTemplatesLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full"></div>
      </div>
    );
  }
  
  // If no employee found
  if (!employee) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Employee Not Found</h1>
          <p className="mb-6">The employee you're looking for doesn't exist.</p>
          <Button onClick={() => navigate('/admin/employees')}>
            Go Back to Employees
          </Button>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b">
        <div className="container mx-auto px-4 py-4">
          <Button variant="ghost" className="mb-2" onClick={() => navigate(`/admin/employees/${employeeId}`)}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Employee
          </Button>
          <h1 className="text-2xl font-bold">Create Business Card</h1>
          <p className="text-muted-foreground">
            For: {employee.firstName} {employee.lastName}
          </p>
        </div>
      </header>
      
      <main className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Template Selection Form */}
          <Card>
            <CardHeader>
              <CardTitle>Select Template</CardTitle>
              <CardDescription>
                Choose a template for the business card
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form id="card-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  <FormField
                    control={form.control}
                    name="templateId"
                    render={({ field }) => (
                      <FormItem className="space-y-6">
                        <FormLabel>Card Design</FormLabel>
                        <FormControl>
                          <RadioGroup
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                            className="grid grid-cols-1 md:grid-cols-2 gap-4"
                          >
                            {templates.map((template) => {
                              const templateStyles = getTemplateStyles(template);
                              return (
                                <div key={template.id}>
                                  <RadioGroupItem
                                    value={template.id.toString()}
                                    id={`template-${template.id}`}
                                    className="peer sr-only"
                                  />
                                  <label
                                    htmlFor={`template-${template.id}`}
                                    className="flex flex-col gap-2 rounded-lg border-2 p-4 cursor-pointer hover:bg-muted/50 peer-checked:border-primary"
                                  >
                                    <div
                                      className="w-full h-32 rounded-md mb-2 flex items-center justify-center"
                                      style={{ 
                                        background: templateStyles.background,
                                        color: templateStyles.textColor
                                      }}
                                    >
                                      <div className="text-center">
                                        <div className="text-sm font-medium mb-1" style={{ color: templateStyles.accent }}>
                                          {template.name}
                                        </div>
                                        <div className="text-xs opacity-70">
                                          Sample Card
                                        </div>
                                      </div>
                                    </div>
                                    <div>
                                      <p className="font-medium">{template.name}</p>
                                      <p className="text-sm text-muted-foreground">
                                        {template.description}
                                      </p>
                                    </div>
                                  </label>
                                </div>
                              );
                            })}
                          </RadioGroup>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </form>
              </Form>
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button variant="outline" onClick={() => navigate(`/admin/employees/${employeeId}`)}>
                Cancel
              </Button>
              <Button 
                type="submit" 
                form="card-form" 
                disabled={createCardMutation.isPending}
              >
                <Save className="h-4 w-4 mr-2" />
                {createCardMutation.isPending ? "Creating..." : "Create Card"}
              </Button>
            </CardFooter>
          </Card>
          
          {/* Preview */}
          <div className="flex flex-col">
            <h2 className="text-xl font-semibold mb-4">Preview</h2>
            <Card className="flex-1 shadow-lg overflow-hidden">
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
                    <div 
                      className="flex items-center gap-3 p-2 rounded"
                    >
                      <div 
                        className="h-5 w-5 flex-shrink-0"
                        style={{ color: styles.accent }} 
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <rect width="20" height="16" x="2" y="4" rx="2" />
                          <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                        </svg>
                      </div>
                      <span className="text-sm break-all">{employee.email}</span>
                    </div>
                  )}
                  
                  {employee.phone && (
                    <div 
                      className="flex items-center gap-3 p-2 rounded"
                    >
                      <div 
                        className="h-5 w-5 flex-shrink-0"
                        style={{ color: styles.accent }} 
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                        </svg>
                      </div>
                      <span className="text-sm">{employee.phone}</span>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="p-4 bg-white border-t">
                <p className="text-sm text-center text-muted-foreground">
                  Card Preview - Content will be shareable after creation
                </p>
              </div>
            </Card>
            
            <div className="mt-4">
              <p className="text-sm text-muted-foreground">
                Once created, this card will be publicly accessible via a unique URL.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}