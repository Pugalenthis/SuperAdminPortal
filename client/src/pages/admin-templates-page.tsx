import { useState, useEffect, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { getQueryFn, apiRequest, queryClient } from "@/lib/queryClient";
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
import { CardTemplate, CustomTemplate } from "@shared/schema";
import { 
  Search, Grid, PlusCircle, Bookmark, Palette, Eye, 
  Trash2, Edit, Star, FileEdit, User, Folder 
} from "lucide-react";
import { TemplatePreviewModal } from "@/components/template-preview-modal";

export default function AdminTemplatesPage() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState<number | null>(null);
  const [isCustomTemplate, setIsCustomTemplate] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [templateToDelete, setTemplateToDelete] = useState<CustomTemplate | null>(null);
  
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
  
  // Fetch standard templates
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
  
  // Fetch custom templates
  const { 
    data: customTemplates, 
    isLoading: customTemplatesLoading, 
    refetch: refetchCustomTemplates 
  } = useQuery({
    queryKey: ['/api/custom-templates'],
    queryFn: getQueryFn({ on401: "throw" }),
    retry: false,
    enabled: !!user && user.userType === 'admin',
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to load custom templates",
        variant: "destructive"
      });
    }
  });
  
  // Delete custom template mutation
  const deleteTemplateMutation = useMutation({
    mutationFn: async (templateId: number) => {
      const response = await apiRequest('DELETE', `/api/custom-templates/${templateId}`);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to delete template');
      }
      return { success: true, deletedId: templateId };
    },
    onSuccess: (result) => {
      toast({
        title: "Template deleted",
        description: "The custom template has been deleted successfully."
      });
      
      // Immediately update the UI by updating React Query cache
      queryClient.setQueryData(['/api/custom-templates'], (oldData: CustomTemplate[] | undefined) => {
        if (!oldData) return [];
        // Filter out the deleted template
        return oldData.filter(template => template.id !== result.deletedId);
      });
      
      // Manually refetch the custom templates
      refetchCustomTemplates();
      
      // Close the delete modal
      setDeleteModalOpen(false);
      setTemplateToDelete(null);
      
      // Force a refresh of the component state
      setActiveTab(prev => {
        // Toggle to a different tab and back to force a re-render
        const temp = prev === 'my-templates' ? 'all' : 'standard';
        setTimeout(() => setActiveTab('my-templates'), 10);
        return temp;
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete template",
        variant: "destructive"
      });
    }
  });
  
  // Filter templates based on search query
  const filteredTemplates = templates?.filter((template: CardTemplate) => {
    return template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
           (template.description && template.description.toLowerCase().includes(searchQuery.toLowerCase()));
  }) || [];
  
  // Filter custom templates based on search query
  const filteredCustomTemplates = customTemplates?.filter((template: CustomTemplate) => {
    return template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
           (template.description && template.description.toLowerCase().includes(searchQuery.toLowerCase()));
  }) || [];
  
  // Handle preview click for standard templates
  const handlePreviewClick = (templateId: number, isCustom = false) => {
    setSelectedTemplateId(templateId);
    setIsCustomTemplate(isCustom);
    setPreviewModalOpen(true);
  };
  
  // Handle delete click for custom templates
  const handleDeleteClick = (template: CustomTemplate) => {
    setTemplateToDelete(template);
    setDeleteModalOpen(true);
  };
  
  // Handle confirming the delete action
  const confirmDelete = () => {
    if (templateToDelete) {
      deleteTemplateMutation.mutate(templateToDelete.id);
    }
  };
  
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
            <TabsTrigger value="my-templates">
              <Folder className="h-4 w-4 mr-2" />
              My Templates
            </TabsTrigger>
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
                          onClick={() => handlePreviewClick(template.id)}
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
                            onClick={() => handlePreviewClick(template.id)}
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
                            onClick={() => handlePreviewClick(template.id)}
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
          
          {/* My Templates tab */}
          <TabsContent value="my-templates" className="mt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredCustomTemplates && filteredCustomTemplates.length > 0 ? (
                filteredCustomTemplates.map((template: CustomTemplate) => (
                  <Card key={template.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                    <div className="aspect-video bg-muted relative">
                      <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
                        <FileEdit className="h-12 w-12" />
                      </div>
                      <div className="absolute top-2 right-2">
                        <Badge className="bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600">
                          Custom
                        </Badge>
                      </div>
                    </div>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle>{template.name}</CardTitle>
                        <Star className="h-5 w-5 text-amber-400 fill-amber-400" />
                      </div>
                      <CardDescription>
                        {template.description || "Your customized template"}
                      </CardDescription>
                    </CardHeader>
                    <CardFooter className="flex flex-col gap-3">
                      <div className="flex space-x-2 w-full">
                        <Button 
                          variant="outline" 
                          className="flex-1"
                          onClick={() => handlePreviewClick(template.id, true)}
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          Preview
                        </Button>
                        <Button
                          variant="outline"
                          className="flex-1"
                          onClick={() => navigate(`/admin/new-card?customTemplate=${template.id}`)}
                        >
                          <User className="h-4 w-4 mr-2" />
                          Use Template
                        </Button>
                      </div>
                      <div className="flex space-x-2 w-full">
                        <Button 
                          variant="outline"
                          className="flex-1"
                          onClick={() => navigate(`/admin/template/custom/${template.id}/edit`)}
                        >
                          <Edit className="h-4 w-4 mr-2" />
                          Edit
                        </Button>
                        <Button 
                          variant="outline"
                          className="flex-1"
                          onClick={() => handleDeleteClick(template)}
                          disabled={deleteTemplateMutation.isPending}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </Button>
                      </div>
                    </CardFooter>
                  </Card>
                ))
              ) : (
                <div className="col-span-full flex flex-col items-center justify-center p-12 text-center">
                  <FileEdit className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium">No custom templates yet</h3>
                  <p className="text-muted-foreground mt-2 mb-6">
                    {searchQuery 
                      ? `No custom templates match your search for "${searchQuery}".` 
                      : "You haven't created any custom templates yet. Customize a standard template to get started."}
                  </p>
                  <Button onClick={() => setActiveTab('standard')}>
                    <Palette className="h-4 w-4 mr-2" />
                    Customize a Template
                  </Button>
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
        isCustomTemplate={isCustomTemplate}
      />
      
      {/* Delete Confirmation Dialog */}
      {templateToDelete && (
        <div className={`fixed inset-0 bg-black/50 flex items-center justify-center z-50 ${deleteModalOpen ? 'block' : 'hidden'}`}>
          <div className="bg-background rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-xl font-bold mb-2">Confirm Deletion</h3>
            <p className="text-muted-foreground mb-4">
              Are you sure you want to delete the custom template <span className="font-medium">{templateToDelete.name}</span>? 
              This action cannot be undone.
            </p>
            <div className="flex justify-end space-x-2 pt-2">
              <Button 
                variant="outline" 
                onClick={() => {
                  setDeleteModalOpen(false);
                  setTemplateToDelete(null);
                }}
                disabled={deleteTemplateMutation.isPending}
              >
                Cancel
              </Button>
              <Button 
                variant="destructive"
                onClick={confirmDelete}
                disabled={deleteTemplateMutation.isPending}
              >
                {deleteTemplateMutation.isPending ? (
                  <>
                    <div className="w-4 h-4 rounded-full border-2 border-background border-t-transparent animate-spin mr-2" />
                    Deleting...
                  </>
                ) : (
                  <>Delete</>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}