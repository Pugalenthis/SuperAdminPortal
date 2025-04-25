import { useState, useEffect, useCallback } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { getQueryFn } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Grid, Search, PlusCircle } from "lucide-react";

export default function AdminTemplatesPage() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  
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
  
  // Fetch all templates
  const { data: templates = [], isLoading: templatesLoading } = useQuery({
    queryKey: ['/api/card-templates'],
    queryFn: getQueryFn({ on401: "throw" }),
    retry: false,
    enabled: !!user && user.userType === 'admin'
  });
  
  // Loading state
  if (userLoading || templatesLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full"></div>
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
              <h1 className="text-2xl font-bold">Card Templates</h1>
              <p className="text-muted-foreground">
                View and select templates for your business cards
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search templates..."
                  className="pl-8 h-9 w-[200px] rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <Button onClick={() => navigate('/admin/dashboard')}>
                Back to Dashboard
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="container mx-auto px-4 py-6">
        <Tabs defaultValue="all" className="w-full">
          <TabsList className="mb-4">
            <TabsTrigger value="all">All Templates</TabsTrigger>
            <TabsTrigger value="standard">Standard</TabsTrigger>
            <TabsTrigger value="premium">Premium</TabsTrigger>
          </TabsList>
          
          <TabsContent value="all" className="mt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {templates.length > 0 ? (
                templates.map((template: any) => (
                  <Card key={template.id} className="overflow-hidden">
                    <div className="aspect-video bg-muted relative">
                      {/* This would ideally display a preview image of the template */}
                      <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
                        <Grid className="h-12 w-12" />
                      </div>
                    </div>
                    <CardHeader>
                      <CardTitle>{template.name}</CardTitle>
                      <CardDescription>
                        {template.description || "A professional business card template"}
                      </CardDescription>
                    </CardHeader>
                    <CardFooter className="flex justify-between">
                      <Button 
                        variant="outline" 
                        onClick={() => {
                          // Preview functionality would be added in future phases
                          toast({
                            title: "Preview",
                            description: `Previewing ${template.name} template`,
                          });
                        }}
                      >
                        Preview
                      </Button>
                      <Button onClick={() => navigate(`/admin/new-card?template=${template.id}`)}>
                        Use Template
                      </Button>
                    </CardFooter>
                  </Card>
                ))
              ) : (
                <div className="col-span-full flex flex-col items-center justify-center p-12 text-center">
                  <Grid className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium">No templates found</h3>
                  <p className="text-muted-foreground mt-2">
                    There are no templates available at the moment.
                  </p>
                </div>
              )}
            </div>
          </TabsContent>
          
          <TabsContent value="standard" className="mt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {templates
                .filter((template: any) => template.type === 'standard' || !template.type)
                .map((template: any) => (
                  <Card key={template.id} className="overflow-hidden">
                    <div className="aspect-video bg-muted relative">
                      <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
                        <Grid className="h-12 w-12" />
                      </div>
                    </div>
                    <CardHeader>
                      <CardTitle>{template.name}</CardTitle>
                      <CardDescription>
                        {template.description || "A professional business card template"}
                      </CardDescription>
                    </CardHeader>
                    <CardFooter className="flex justify-between">
                      <Button 
                        variant="outline" 
                        onClick={() => {
                          toast({
                            title: "Preview",
                            description: `Previewing ${template.name} template`,
                          });
                        }}
                      >
                        Preview
                      </Button>
                      <Button onClick={() => navigate(`/admin/new-card?template=${template.id}`)}>
                        Use Template
                      </Button>
                    </CardFooter>
                  </Card>
                ))}
            </div>
          </TabsContent>
          
          <TabsContent value="premium" className="mt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {templates
                .filter((template: any) => template.type === 'premium')
                .length > 0 ? (
                templates
                  .filter((template: any) => template.type === 'premium')
                  .map((template: any) => (
                    <Card key={template.id} className="overflow-hidden">
                      <div className="aspect-video bg-muted relative">
                        <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
                          <Grid className="h-12 w-12" />
                        </div>
                      </div>
                      <CardHeader>
                        <CardTitle>{template.name}</CardTitle>
                        <CardDescription>
                          {template.description || "A professional business card template"}
                        </CardDescription>
                      </CardHeader>
                      <CardFooter className="flex justify-between">
                        <Button 
                          variant="outline" 
                          onClick={() => {
                            toast({
                              title: "Preview",
                              description: `Previewing ${template.name} template`,
                            });
                          }}
                        >
                          Preview
                        </Button>
                        <Button onClick={() => navigate(`/admin/new-card?template=${template.id}`)}>
                          Use Template
                        </Button>
                      </CardFooter>
                    </Card>
                  ))
              ) : (
                <div className="col-span-full flex flex-col items-center justify-center p-12 text-center">
                  <PlusCircle className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium">No premium templates</h3>
                  <p className="text-muted-foreground mt-2">
                    Premium templates will be available in future updates.
                  </p>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}