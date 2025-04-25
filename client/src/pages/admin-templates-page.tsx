import { useState, useEffect, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { getQueryFn } from "@/lib/queryClient";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { CardTemplate } from "@shared/schema";
import { Search, Grid, PlusCircle, Bookmark, Palette, Eye } from "lucide-react";
import { TemplatePreviewModal } from "@/components/template-preview-modal";

export default function AdminTemplatesPage() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState<number | null>(null);
  
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
  
  // Fetch templates
  const { data: templates, isLoading: templatesLoading } = useQuery({
    queryKey: ['/api/card-templates'],
    queryFn: getQueryFn({ on401: "throw" }),
    retry: false,
    enabled: !!user && user.userType === 'admin',
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to load templates",
        variant: "destructive"
      });
    }
  });
  
  // Filter templates based on search query
  const filteredTemplates = templates?.filter((template: CardTemplate) => {
    return template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
           (template.description && template.description.toLowerCase().includes(searchQuery.toLowerCase()));
  }) || [];
  
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
              <h1 className="text-2xl font-bold">Business Card Templates</h1>
              <p className="text-muted-foreground">
                Browse and select templates for your business cards
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <Button variant="outline" onClick={() => navigate('/admin/dashboard')}>
                Back to Dashboard
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="container mx-auto px-4 py-6">
        {/* Search and filter */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search templates..."
              className="pl-8"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
        
        {/* Templates tabs */}
        <Tabs defaultValue="all" onValueChange={setActiveTab}>
          <TabsList className="mb-6">
            <TabsTrigger value="all">All Templates</TabsTrigger>
            <TabsTrigger value="standard">Standard</TabsTrigger>
            <TabsTrigger value="premium">Premium</TabsTrigger>
          </TabsList>
          
          <TabsContent value="all" className="mt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredTemplates.length > 0 ? (
                filteredTemplates.map((template: CardTemplate) => (
                  <Card key={template.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                    <div className="aspect-video bg-muted relative">
                      <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
                        <Grid className="h-12 w-12" />
                      </div>
                      {template.type === 'premium' && (
                        <div className="absolute top-2 right-2">
                          <Badge className="bg-gradient-to-r from-amber-500 to-yellow-300 hover:from-amber-600 hover:to-yellow-400">
                            Premium
                          </Badge>
                        </div>
                      )}
                    </div>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle>{template.name}</CardTitle>
                        <Bookmark className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <CardDescription>
                        {template.description || "A professional business card template"}
                      </CardDescription>
                    </CardHeader>
                    <CardFooter className="flex flex-col sm:flex-row gap-2">
                      <div className="flex space-x-2 w-full sm:w-auto">
                        <Button 
                          variant="outline" 
                          className="flex-1 sm:flex-initial"
                          onClick={() => {
                            setSelectedTemplateId(template.id);
                            setPreviewModalOpen(true);
                          }}
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          Preview
                        </Button>
                        <Button
                          variant="outline"
                          className="flex-1 sm:flex-initial"
                          onClick={() => navigate(`/admin/template/${template.id}`)}
                        >
                          <Palette className="h-4 w-4 mr-2" />
                          Customize
                        </Button>
                      </div>
                      <Button 
                        className="w-full sm:w-auto" 
                        onClick={() => navigate(`/admin/new-card?template=${template.id}`)}
                      >
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
                    {searchQuery 
                      ? `No templates match your search for "${searchQuery}".` 
                      : "There are no templates available at the moment."}
                  </p>
                </div>
              )}
            </div>
          </TabsContent>
          
          <TabsContent value="standard" className="mt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredTemplates
                .filter((template: CardTemplate) => template.type === 'standard' || !template.type)
                .length > 0 ? (
                filteredTemplates
                  .filter((template: CardTemplate) => template.type === 'standard' || !template.type)
                  .map((template: CardTemplate) => (
                    <Card key={template.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                      <div className="aspect-video bg-muted relative">
                        <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
                          <Grid className="h-12 w-12" />
                        </div>
                      </div>
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <CardTitle>{template.name}</CardTitle>
                          <Bookmark className="h-5 w-5 text-muted-foreground" />
                        </div>
                        <CardDescription>
                          {template.description || "A professional business card template"}
                        </CardDescription>
                      </CardHeader>
                      <CardFooter className="flex flex-col sm:flex-row gap-2">
                        <div className="flex space-x-2 w-full sm:w-auto">
                          <Button 
                            variant="outline" 
                            className="flex-1 sm:flex-initial"
                            onClick={() => {
                              toast({
                                title: "Preview",
                                description: `Previewing ${template.name} template`,
                              });
                            }}
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            Preview
                          </Button>
                          <Button
                            variant="outline"
                            className="flex-1 sm:flex-initial"
                            onClick={() => navigate(`/admin/template/${template.id}`)}
                          >
                            <Palette className="h-4 w-4 mr-2" />
                            Customize
                          </Button>
                        </div>
                        <Button 
                          className="w-full sm:w-auto" 
                          onClick={() => navigate(`/admin/new-card?template=${template.id}`)}
                        >
                          Use Template
                        </Button>
                      </CardFooter>
                    </Card>
                  ))
              ) : (
                <div className="col-span-full flex flex-col items-center justify-center p-12 text-center">
                  <Grid className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium">No standard templates found</h3>
                  <p className="text-muted-foreground mt-2">
                    {searchQuery 
                      ? `No standard templates match your search for "${searchQuery}".` 
                      : "There are no standard templates available at the moment."}
                  </p>
                </div>
              )}
            </div>
          </TabsContent>
          
          <TabsContent value="premium" className="mt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredTemplates
                .filter((template: CardTemplate) => template.type === 'premium')
                .length > 0 ? (
                filteredTemplates
                  .filter((template: CardTemplate) => template.type === 'premium')
                  .map((template: CardTemplate) => (
                    <Card key={template.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                      <div className="aspect-video bg-muted relative">
                        <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
                          <Grid className="h-12 w-12" />
                        </div>
                        <div className="absolute top-2 right-2">
                          <Badge className="bg-gradient-to-r from-amber-500 to-yellow-300 hover:from-amber-600 hover:to-yellow-400">
                            Premium
                          </Badge>
                        </div>
                      </div>
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <CardTitle>{template.name}</CardTitle>
                          <Bookmark className="h-5 w-5 text-muted-foreground" />
                        </div>
                        <CardDescription>
                          {template.description || "A professional business card template"}
                        </CardDescription>
                      </CardHeader>
                      <CardFooter className="flex flex-col sm:flex-row gap-2">
                        <div className="flex space-x-2 w-full sm:w-auto">
                          <Button 
                            variant="outline" 
                            className="flex-1 sm:flex-initial"
                            onClick={() => {
                              toast({
                                title: "Preview",
                                description: `Previewing ${template.name} template`,
                              });
                            }}
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            Preview
                          </Button>
                          <Button
                            variant="outline"
                            className="flex-1 sm:flex-initial"
                            onClick={() => navigate(`/admin/template/${template.id}`)}
                          >
                            <Palette className="h-4 w-4 mr-2" />
                            Customize
                          </Button>
                        </div>
                        <Button 
                          className="w-full sm:w-auto" 
                          onClick={() => navigate(`/admin/new-card?template=${template.id}`)}
                        >
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
                    {searchQuery 
                      ? `No premium templates match your search for "${searchQuery}".` 
                      : "Premium templates will be available in future updates."}
                  </p>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </main>
      
      {/* Preview Modal */}
      <TemplatePreviewModal
        open={previewModalOpen}
        onOpenChange={setPreviewModalOpen}
        templateId={selectedTemplateId}
      />
    </div>
  );
}