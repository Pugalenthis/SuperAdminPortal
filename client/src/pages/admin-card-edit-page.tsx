import { useState, useEffect, useCallback, useMemo } from "react";
import { useLocation, useParams } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { getQueryFn, apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, Save } from "lucide-react";

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
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";

// Edit card form schema
const cardEditFormSchema = z.object({
  templateId: z.coerce.number({
    required_error: "Please select a template",
    invalid_type_error: "Template ID must be a number",
  }),
  status: z.string({
    required_error: "Please select a status",
  }),
  customization: z.record(z.any()).optional(),
  // Hidden field to track if this is a custom template and separate templateId from customTemplateId
  templateInfo: z.string().optional(),
});

type CardEditFormValues = z.infer<typeof cardEditFormSchema>;

export default function AdminCardEditPage() {
  const { toast } = useToast();
  const [location, setLocation] = useLocation();
  const { cardId } = useParams();
  const [isSubmitting, setIsSubmitting] = useState(false);
  // Initialize cardStatus to null (undefined), so it doesn't show as active by default
  const [cardStatus, setCardStatus] = useState<string | null>(null);
  
  // Check for refresh parameter in URL
  const refreshParam = location.includes('refresh=') ? new URLSearchParams(location.split('?')[1]).get('refresh') : null;
  
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
  
  // Fetch the specific business card
  const { 
    data: card, 
    isLoading: cardLoading,
    refetch: refetchCard
  } = useQuery({
    queryKey: ['/api/cards', cardId],
    queryFn: async () => {
      try {
        // Direct fetch with explicit URL to avoid path composition issues
        const response = await fetch(`/api/cards/${cardId}`, {
          credentials: 'include',
          headers: {
            'Accept': 'application/json'
          },
          cache: 'no-store' // Important: don't cache this request
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || `Failed to fetch card: ${response.status}`);
        }
        
        const data = await response.json();
        console.log("Raw card data from API:", data);
        return data;
      } catch (error) {
        console.error("Error fetching card:", error);
        throw error;
      }
    },
    retry: false,
    enabled: !!user && user.userType === 'admin' && !!cardId,
    onSuccess: (data) => {
      console.log("Card data received:", JSON.stringify(data));
      console.log("Card status from API:", data?.status);
      
      // Always log the complete data object for debugging
      console.log("Full card data:", data);
      
      // Check if data exists and has a status property (even if it's empty)
      if (data) {
        // Default to inactive if status is not present
        const status = data.status === 'active' ? 'active' : 'inactive';
        console.log("Setting cardStatus to:", status);
        setCardStatus(status);
        
        // Also update the form's status field directly
        form.setValue('status', status);
      }
      
      if (data && templates.length > 0) {
        console.log("Templates available:", templates);
      }
    },
    refetchOnWindowFocus: true, // Refetch when window gets focus
    cacheTime: 0, // Don't cache this query at all
    staleTime: 0, // Consider data stale immediately so it always refetches
  });
  
  // Fetch all base templates for the dropdown
  const { data: templates = [], isLoading: templatesLoading } = useQuery({
    queryKey: ['/api/card-templates'],
    queryFn: getQueryFn({ on401: "throw" }),
    retry: false,
    enabled: !!user && user.userType === 'admin',
    onSuccess: (data) => {
      console.log("Base templates loaded:", data);
    }
  });
  
  // Fetch custom templates for the dropdown
  const { data: customTemplates = [], isLoading: customTemplatesLoading } = useQuery({
    queryKey: ['/api/custom-templates'],
    queryFn: getQueryFn({ on401: "throw" }),
    retry: false,
    enabled: !!user && user.userType === 'admin',
    onSuccess: (data) => {
      console.log("Custom templates loaded:", data);
    }
  });
  
  // Combine templates for dropdown display
  const allTemplates = useMemo(() => {
    // Add type property to distinguish between template types
    const baseTemplatesWithType = (templates as any[]).map(t => ({ 
      ...t, 
      type: 'base' 
    }));
    const customTemplatesWithType = (customTemplates as any[]).map(t => ({ 
      ...t, 
      type: 'custom' 
    }));
    return [...baseTemplatesWithType, ...customTemplatesWithType];
  }, [templates, customTemplates]);
  
  // Form definition
  const form = useForm<CardEditFormValues>({
    resolver: zodResolver(cardEditFormSchema),
    defaultValues: {
      templateId: 0,
      // Don't set a default status - we want to use the one from the API
      status: undefined as unknown as string,
      customization: {},
    },
  });
  
  // Watch for form changes to update cardStatus
  useEffect(() => {
    const subscription = form.watch((value, { name }) => {
      if (name === "status" && value.status) {
        setCardStatus(value.status);
      }
    });
    return () => subscription.unsubscribe();
  }, [form]);
  
  // Force data refresh when refreshParam changes
  useEffect(() => {
    if (refreshParam && refetchCard) {
      console.log("Forcing card data refresh due to URL parameter");
      refetchCard();
    }
  }, [refreshParam, refetchCard]);

  // Update form values when card data is loaded AND templates are loaded
  useEffect(() => {
    if (card && templates && templates.length > 0) {
      // Determine which template to select in the UI
      // The templateId field in the form will represent whether it's a base template
      // or a custom template based on where it's selected from in the UI
      let displayTemplateId;
      let actualTemplateId = card.templateId; // Use this for base templates
      let actualCustomTemplateId = card.customTemplateId; // Use this for custom templates
      let isCustomTemplate = false;
      
      // Check if we need to use a customTemplateId instead
      if (card.customTemplateId && customTemplates && customTemplates.length > 0) {
        const matchingCustomTemplate = (customTemplates as any[]).find(t => t.id === card.customTemplateId);
        if (matchingCustomTemplate) {
          displayTemplateId = matchingCustomTemplate.id;
          isCustomTemplate = true;
          console.log("Using custom template ID:", displayTemplateId);
        }
      }
      
      // If not a custom template, use the standard template
      if (!isCustomTemplate) {
        displayTemplateId = card.templateId;
      }
      
      // Fallback if displayTemplateId is invalid
      if (typeof displayTemplateId !== 'number' || displayTemplateId <= 0) {
        displayTemplateId = templates.length > 0 ? (templates as any[])[0].id : 0;
        isCustomTemplate = false; // Ensure we know it's a base template
      }
      
      // Extract status directly - use strict equality to check for 'active'
      // Any status that isn't explicitly 'active' is treated as inactive
      const status = card.status === 'active' ? 'active' : 'inactive';
      
      console.log("Setting form with display template ID:", displayTemplateId, "from card:", card.templateId);
      console.log("Is custom template:", isCustomTemplate);
      console.log("Card status (normalized):", status, "Original status:", card.status);
      
      // Always update our state variable for card status
      console.log("Updating cardStatus state to:", status);
      setCardStatus(status);
      
      // Store the template selection info in a hidden field to use during updates
      const templateInfo = {
        isCustomTemplate,
        templateId: isCustomTemplate ? null : displayTemplateId, // Only set if standard template
        customTemplateId: isCustomTemplate ? displayTemplateId : null, // Only set if custom template
      };
      
      // Reset form with the correct values
      form.reset({
        templateId: displayTemplateId, // Use this for display purposes only
        status,
        customization: card.customization || {},
        templateInfo: JSON.stringify(templateInfo), // Hidden field 
      });
      
      // Also explicitly set the status field to ensure it's updated
      form.setValue('status', status);
    }
  }, [card, templates, customTemplates, form]);
  
  // Update card mutation
  const updateCardMutation = useMutation({
    mutationFn: async (data: CardEditFormValues) => {
      try {
        // Direct fetch with explicit URL to avoid path composition issues
        const response = await fetch(`/api/cards/${cardId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          credentials: 'include',
          body: JSON.stringify(data)
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || `Failed to update card: ${response.status}`);
        }
        
        return await response.json();
      } catch (error) {
        console.error("Error updating card:", error);
        throw error;
      }
    },
    onSuccess: async () => {
      toast({
        title: "Card updated",
        description: "The business card has been updated successfully",
      });
      
      // Clear cache and redirect to the cards list with a refresh param
      await queryClient.invalidateQueries({ queryKey: ['/api/cards'] });
      navigate('/admin/cards?refresh=' + new Date().getTime());
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update card",
        description: error.message || "An error occurred while updating the card",
        variant: "destructive",
      });
    },
  });
  
  // Form submission handler
  const onSubmit = async (values: CardEditFormValues) => {
    setIsSubmitting(true);
    // Make sure cardStatus is updated before submission
    setCardStatus(values.status);
    
    try {
      // Parse the template info to determine which ID goes where
      let templateInfo = { isCustomTemplate: false, templateId: null, customTemplateId: null };
      if (values.templateInfo) {
        try {
          templateInfo = JSON.parse(values.templateInfo);
          console.log("Using template info:", templateInfo);
        } catch (e) {
          console.error("Error parsing template info:", e);
        }
      }
      
      // Prepare data for server - separate templateId and customTemplateId
      // First check if the selected template exists in the appropriate collection
      const selectedTemplateId = values.templateId;
      const isValidStandardTemplate = templates.some((t: any) => t.id === selectedTemplateId);
      const isValidCustomTemplate = customTemplates.some((t: any) => t.id === selectedTemplateId);
      
      console.log(`Template selection check - ID: ${selectedTemplateId}, Is standard: ${isValidStandardTemplate}, Is custom: ${isValidCustomTemplate}`);
      
      // Determine if this is actually a custom template based on where it exists
      const actuallyIsCustomTemplate = templateInfo.isCustomTemplate && isValidCustomTemplate;
      
      const dataToSubmit = {
        // For template ID: 
        // - If using standard template, use the selected ID
        // - If using custom template, use the base ID or keep existing
        templateId: actuallyIsCustomTemplate 
          ? (card?.templateId || 1) // Keep original or use default if using custom template
          : values.templateId,
          
        // For custom template ID:
        // - If using custom template and the ID exists in custom templates, use it
        // - Otherwise set to null (using standard template)
        customTemplateId: actuallyIsCustomTemplate && isValidCustomTemplate
          ? values.templateId // Use selected ID as customTemplateId if it's a valid custom template
          : null, // Clear customTemplateId if using standard template
          
        status: values.status,
        customization: values.customization
      };
      
      console.log("Submitting data to server:", dataToSubmit);
      await updateCardMutation.mutateAsync(dataToSubmit as any);
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Loading state
  if (userLoading || 
      (cardLoading && user?.userType === 'admin') || 
      (templatesLoading && user?.userType === 'admin') ||
      (customTemplatesLoading && user?.userType === 'admin')) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full"></div>
      </div>
    );
  }
  
  // Error state - card not found
  if (!card && !cardLoading && user?.userType === 'admin') {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Card Not Found</CardTitle>
            <CardDescription>The business card you are looking for doesn't exist or you don't have permission to view it.</CardDescription>
          </CardHeader>
          <CardFooter>
            <Button onClick={() => navigate('/admin/cards')} className="w-full">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Cards
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b">
        <div className="container mx-auto px-4 py-4">
          <Button variant="ghost" className="mb-2" onClick={() => navigate('/admin/cards')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Cards
          </Button>
          <h1 className="text-2xl font-bold">Edit Business Card</h1>
          {card?.employee && (
            <p className="text-muted-foreground">
              For {card.employee.firstName} {card.employee.lastName}
            </p>
          )}
        </div>
      </header>
      
      <main className="container mx-auto px-4 py-6">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <Card>
              <CardHeader>
                <CardTitle>Card Settings</CardTitle>
                <CardDescription>Edit your business card settings</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Template Selection */}
                <FormField
                  control={form.control}
                  name="templateId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Card Template</FormLabel>
                      <Select 
                        onValueChange={(value) => {
                          const numValue = parseInt(value, 10);
                          if (!isNaN(numValue)) {
                            field.onChange(numValue);
                            // Mark form as dirty
                            form.formState.dirtyFields.templateId = true;
                          }
                        }}
                        defaultValue={field.value?.toString()}
                        value={field.value?.toString()}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a template" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {/* Standard Templates section */}
                          <div className="px-2 py-1.5 text-sm font-semibold">Standard Templates</div>
                          {(templates as any[]).map((template) => (
                            <SelectItem 
                              key={template.id} 
                              value={template.id.toString()}
                            >
                              {template.name}
                            </SelectItem>
                          ))}
                          
                          {/* My Templates section - only show if there are custom templates */}
                          {(customTemplates as any[]).length > 0 && (
                            <>
                              <div className="px-2 py-1.5 text-sm font-semibold mt-2">My Templates</div>
                              {(customTemplates as any[]).map((template) => (
                                <SelectItem 
                                  key={template.id} 
                                  value={template.id.toString()}
                                >
                                  {template.name}
                                </SelectItem>
                              ))}
                            </>
                          )}
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        Choose a template for your business card design
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <Separator />
                
                {/* Status Toggle */}
                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Active Status</FormLabel>
                        <FormDescription>
                          When inactive, the card won't be accessible via its public URL
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          // If cardStatus is null, default to assuming it's inactive for safety
                          checked={cardStatus === "active"}
                          onCheckedChange={(checked) => {
                            const newStatus = checked ? "active" : "inactive";
                            console.log("Switch toggled to:", newStatus);
                            setCardStatus(newStatus);
                            field.onChange(newStatus);
                            // Mark form as dirty
                            form.formState.dirtyFields.status = true;
                          }}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </CardContent>
              <CardFooter className="flex justify-between">
                <Button 
                  variant="outline" 
                  type="button" 
                  onClick={() => navigate('/admin/cards')}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={isSubmitting || (!form.formState.isDirty && !form.formState.dirtyFields.templateId && !form.formState.dirtyFields.status)}
                >
                  {isSubmitting ? (
                    <>
                      <div className="animate-spin mr-2 h-4 w-4 border-2 border-current border-t-transparent rounded-full" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Save Changes
                    </>
                  )}
                </Button>
              </CardFooter>
            </Card>
          </form>
        </Form>
      </main>
    </div>
  );
}