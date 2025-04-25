import { useState, useEffect, useCallback } from "react";
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
  templateId: z.coerce.number(),
  status: z.string(),
  customization: z.record(z.any()).optional(),
});

type CardEditFormValues = z.infer<typeof cardEditFormSchema>;

export default function AdminCardEditPage() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const { cardId } = useParams();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
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
    isLoading: cardLoading 
  } = useQuery({
    queryKey: ['/api/cards', cardId],
    queryFn: getQueryFn({ on401: "throw" }),
    retry: false,
    enabled: !!user && user.userType === 'admin' && !!cardId,
  });
  
  // Fetch all templates for the dropdown
  const { data: templates = [], isLoading: templatesLoading } = useQuery({
    queryKey: ['/api/card-templates'],
    queryFn: getQueryFn({ on401: "throw" }),
    retry: false,
    enabled: !!user && user.userType === 'admin'
  });
  
  // Form definition
  const form = useForm<CardEditFormValues>({
    resolver: zodResolver(cardEditFormSchema),
    defaultValues: {
      templateId: 0,
      status: 'active',
      customization: {},
    },
  });
  
  // Update form values when card data is loaded
  useEffect(() => {
    if (card) {
      form.reset({
        templateId: card.templateId,
        status: card.status || 'active',
        customization: card.customization || {},
      });
    }
  }, [card, form]);
  
  // Update card mutation
  const updateCardMutation = useMutation({
    mutationFn: async (data: CardEditFormValues) => {
      return await apiRequest("PUT", `/api/cards/${cardId}`, data);
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
    try {
      await updateCardMutation.mutateAsync(values);
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Loading state
  if (userLoading || (cardLoading && user?.userType === 'admin') || (templatesLoading && user?.userType === 'admin')) {
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
          {card && card.employee && (
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
                        onValueChange={(value) => field.onChange(parseInt(value))}
                        defaultValue={field.value.toString()} 
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a template" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {templates.map((template: any) => (
                            <SelectItem 
                              key={template.id} 
                              value={template.id.toString()}
                            >
                              {template.name}
                            </SelectItem>
                          ))}
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
                          checked={field.value === "active"}
                          onCheckedChange={(checked) => {
                            field.onChange(checked ? "active" : "inactive");
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
                  disabled={isSubmitting || !form.formState.isDirty}
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