import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getQueryFn, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Upload, Trash2, Building2, Image, Palette } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type { CompanyCard } from "@shared/schema";

export default function AdminOrganizationPage() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  
  // New states for company logo and branding colors
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [primaryColor, setPrimaryColor] = useState<string>("#0066cc");
  const [secondaryColor, setSecondaryColor] = useState<string>("#f5f5f5");
  const [isSavingBranding, setIsSavingBranding] = useState(false);
  
  // Navigation function
  const navigate = (path: string) => {
    setLocation(path);
  };
  
  // Fetch user data
  interface UserData {
    id: number;
    email: string;
    orgName: string;
    userType: string;
  }
  
  const { data: userData } = useQuery<UserData>({
    queryKey: ['/api/user'],
    queryFn: getQueryFn({ on401: "throw" }),
    retry: false,
  });
  
  // Fetch company card
  const { data: companyCards, isLoading: companyCardLoading, refetch: refetchCompanyCard } = useQuery<CompanyCard[]>({
    queryKey: ['/api/company-card'],
    queryFn: getQueryFn({ on401: "throw" }),
    retry: false,
  });
  
  // Upload company card mutation
  const uploadMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      return await apiRequest('/api/company-card', 'POST', formData);
    },
    onSuccess: () => {
      toast({
        title: "Company card uploaded",
        description: "Your company branding has been updated successfully",
      });
      refetchCompanyCard();
      // Clear the preview and file input
      setFilePreview(null);
      setUploadFile(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Upload failed",
        description: error.message || "Failed to upload company card. Please try again.",
        variant: "destructive"
      });
    }
  });
  
  // Update company branding mutation
  const updateBrandingMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      return await apiRequest('/api/company-branding', 'POST', formData);
    },
    onSuccess: () => {
      toast({
        title: "Branding updated",
        description: "Your company branding elements have been updated successfully",
      });
      refetchCompanyCard();
      setIsSavingBranding(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Update failed",
        description: error.message || "Failed to update company branding. Please try again.",
        variant: "destructive"
      });
      setIsSavingBranding(false);
    }
  });
  
  // Delete company card mutation
  const deleteMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest('/api/company-card', 'DELETE');
    },
    onSuccess: () => {
      toast({
        title: "Company card deleted",
        description: "Your company branding has been removed",
      });
      refetchCompanyCard();
      setDeleteConfirmOpen(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Delete failed",
        description: error.message || "Failed to remove company card. Please try again.",
        variant: "destructive"
      });
      setDeleteConfirmOpen(false);
    }
  });
  
  // Handle file selection for company card
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.includes('image/')) {
        toast({
          title: "Invalid file type",
          description: "Please select an image file",
          variant: "destructive"
        });
        return;
      }
      
      setUploadFile(file);
      
      // Create a preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setFilePreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Handle logo file selection
  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.includes('image/')) {
        toast({
          title: "Invalid file type",
          description: "Please select an image file",
          variant: "destructive"
        });
        return;
      }
      
      setLogoFile(file);
      
      // Create a preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setLogoPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };
  
  // Handle upload
  const handleUpload = async () => {
    if (!uploadFile) {
      toast({
        title: "No file selected",
        description: "Please select an image file to upload",
        variant: "destructive"
      });
      return;
    }
    
    const formData = new FormData();
    formData.append('image', uploadFile);
    
    await uploadMutation.mutateAsync(formData);
  };
  
  // Handle save branding
  const handleSaveBranding = async () => {
    setIsSavingBranding(true);
    
    const formData = new FormData();
    
    if (logoFile) {
      formData.append('logo', logoFile);
    }
    
    formData.append('primaryColor', primaryColor);
    formData.append('secondaryColor', secondaryColor);
    
    await updateBrandingMutation.mutateAsync(formData);
  };
  
  // Handle delete
  const handleDelete = async () => {
    setIsDeleting(true);
    await deleteMutation.mutateAsync();
    setIsDeleting(false);
  };
  
  // Format date for display
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };
  
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b">
        <div className="container mx-auto px-4 py-4">
          <Button variant="ghost" className="mb-2" onClick={() => navigate('/admin/dashboard')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
          <h1 className="text-2xl font-bold">Organization Settings</h1>
          <p className="text-muted-foreground">
            Manage your organization branding and settings
          </p>
        </div>
      </header>
      
      <main className="container mx-auto px-4 py-6">
        {/* Company Card Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div>
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-primary" />
                  <CardTitle>Company Card</CardTitle>
                </div>
                <CardDescription>
                  Upload your company branding section for business cards
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="company-logo" className="block mb-2">Upload Image (1066px × 445px)</Label>
                    <Input 
                      id="company-logo" 
                      type="file" 
                      accept="image/*" 
                      onChange={handleFileChange}
                      className="cursor-pointer"
                    />
                    <p className="text-sm text-muted-foreground mt-1">
                      Recommended dimensions: 1066px × 445px
                    </p>
                  </div>
                  
                  {filePreview && (
                    <div className="border rounded-md overflow-hidden">
                      <div className="relative">
                        <img
                          src={filePreview}
                          alt="Company card preview"
                          className="max-w-full h-auto"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
              <CardFooter className="flex justify-between">
                <Button 
                  variant="outline" 
                  disabled={!uploadFile || uploadMutation.isPending}
                  onClick={() => {
                    setFilePreview(null);
                    setUploadFile(null);
                  }}
                >
                  Cancel
                </Button>
                <Button 
                  onClick={handleUpload} 
                  disabled={!uploadFile || uploadMutation.isPending}
                >
                  {uploadMutation.isPending ? "Uploading..." : "Upload Card"}
                  <Upload className="h-4 w-4 ml-2" />
                </Button>
              </CardFooter>
            </Card>
          </div>
          
          <div>
            <Card>
              <CardHeader>
                <CardTitle>Current Company Card</CardTitle>
                <CardDescription>
                  Your company branding section that appears on all business cards
                </CardDescription>
              </CardHeader>
              <CardContent>
                {companyCardLoading ? (
                  <div className="h-40 flex items-center justify-center">
                    <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full"></div>
                  </div>
                ) : companyCards && companyCards.length > 0 ? (
                  <div className="space-y-4">
                    <div className="border rounded-md overflow-hidden">
                      {companyCards.map((card) => (
                        <div key={card.id} className="relative">
                          <img
                            src={card.imagePath}
                            alt="Company card"
                            className="max-w-full h-auto"
                          />
                          <div className="absolute inset-0 bg-black/60 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center">
                            <Button 
                              variant="destructive" 
                              size="sm"
                              onClick={() => setDeleteConfirmOpen(true)}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Remove
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                    
                    {companyCards[0] && (
                      <div className="text-sm text-muted-foreground">
                        <p>Dimensions: {companyCards[0].width} × {companyCards[0].height} pixels</p>
                        <p>Uploaded: {formatDate(companyCards[0].createdAt.toString())}</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="h-40 flex flex-col items-center justify-center gap-2 text-muted-foreground">
                    <Building2 className="h-12 w-12 opacity-20" />
                    <p>No company card uploaded yet</p>
                    <p className="text-sm">Upload your company branding section for business cards</p>
                  </div>
                )}
              </CardContent>
              <CardFooter>
                {companyCards && companyCards.length > 0 && (
                  <Button 
                    variant="destructive" 
                    onClick={() => setDeleteConfirmOpen(true)}
                    disabled={isDeleting}
                    className="ml-auto"
                  >
                    {isDeleting ? "Deleting..." : "Delete Card"}
                    <Trash2 className="h-4 w-4 ml-2" />
                  </Button>
                )}
              </CardFooter>
            </Card>
          </div>
        </div>
        
        {/* Company Branding Section */}
        <div className="mt-8">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Palette className="h-5 w-5 text-primary" />
                <CardTitle>Company Branding</CardTitle>
              </div>
              <CardDescription>
                Customize your company's brand identity for business cards
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="logo" className="w-full">
                <TabsList className="mb-4">
                  <TabsTrigger value="logo" className="flex items-center gap-1">
                    <Image className="h-4 w-4" />
                    Logo
                  </TabsTrigger>
                  <TabsTrigger value="colors" className="flex items-center gap-1">
                    <Palette className="h-4 w-4" />
                    Colors
                  </TabsTrigger>
                </TabsList>
                
                <TabsContent value="logo" className="space-y-4">
                  <div>
                    <Label htmlFor="company-logo-upload" className="block mb-2">
                      Company Logo (400px × 900px)
                    </Label>
                    <Input
                      id="company-logo-upload"
                      type="file"
                      accept="image/*"
                      onChange={handleLogoChange}
                      className="cursor-pointer"
                    />
                    <p className="text-sm text-muted-foreground mt-1">
                      Recommended dimensions: 400px × 900px
                    </p>
                  </div>
                  
                  {logoPreview && (
                    <div className="border rounded-md overflow-hidden p-4 flex justify-center">
                      <div className="max-w-md">
                        <img
                          src={logoPreview}
                          alt="Company logo preview"
                          className="max-w-full h-auto"
                        />
                      </div>
                    </div>
                  )}

                  {companyCards && companyCards[0]?.logoPath && !logoPreview && (
                    <div className="border rounded-md overflow-hidden p-4 flex justify-center">
                      <div className="max-w-md">
                        <img
                          src={companyCards[0].logoPath}
                          alt="Current company logo"
                          className="max-w-full h-auto"
                        />
                      </div>
                    </div>
                  )}
                </TabsContent>
                
                <TabsContent value="colors" className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <Label htmlFor="primary-color" className="block mb-2">
                        Primary Brand Color
                      </Label>
                      <div className="flex items-center gap-3">
                        <div 
                          className="w-10 h-10 rounded-md border" 
                          style={{ backgroundColor: primaryColor }}
                        />
                        <Input
                          id="primary-color"
                          type="color"
                          value={primaryColor}
                          onChange={(e) => setPrimaryColor(e.target.value)}
                          className="w-16 h-10"
                        />
                        <Input
                          value={primaryColor}
                          onChange={(e) => setPrimaryColor(e.target.value)}
                          className="flex-1"
                        />
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        Used for primary elements and accents
                      </p>
                    </div>
                    
                    <div>
                      <Label htmlFor="secondary-color" className="block mb-2">
                        Secondary Brand Color
                      </Label>
                      <div className="flex items-center gap-3">
                        <div 
                          className="w-10 h-10 rounded-md border" 
                          style={{ backgroundColor: secondaryColor }}
                        />
                        <Input
                          id="secondary-color"
                          type="color"
                          value={secondaryColor}
                          onChange={(e) => setSecondaryColor(e.target.value)}
                          className="w-16 h-10"
                        />
                        <Input
                          value={secondaryColor}
                          onChange={(e) => setSecondaryColor(e.target.value)}
                          className="flex-1"
                        />
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        Used for backgrounds and secondary elements
                      </p>
                    </div>
                  </div>
                  
                  <div className="mt-6 p-4 border rounded-md">
                    <h3 className="text-sm font-medium mb-2">Color Preview</h3>
                    <div className="flex flex-col gap-2">
                      <div 
                        className="h-16 rounded-md flex items-center justify-center font-medium" 
                        style={{ backgroundColor: primaryColor, color: secondaryColor }}
                      >
                        Primary Background with Secondary Text
                      </div>
                      <div 
                        className="h-16 rounded-md flex items-center justify-center font-medium" 
                        style={{ backgroundColor: secondaryColor, color: primaryColor }}
                      >
                        Secondary Background with Primary Text
                      </div>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
            <CardFooter className="flex justify-end">
              <Button
                onClick={handleSaveBranding}
                disabled={updateBrandingMutation.isPending || isSavingBranding}
              >
                {updateBrandingMutation.isPending || isSavingBranding ? "Saving..." : "Save Branding"}
              </Button>
            </CardFooter>
          </Card>
        </div>
        
        {/* Company Information */}
        <div className="mt-8">
          <Card>
            <CardHeader>
              <CardTitle>Organization Information</CardTitle>
              <CardDescription>
                Your organization details used across the platform
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row items-start gap-4">
                  <div className="flex-1">
                    <Label htmlFor="org-name" className="block mb-2">Organization Name</Label>
                    <Input 
                      id="org-name" 
                      value={userData?.orgName || ''} 
                      readOnly
                      className="bg-muted" 
                    />
                  </div>
                  <div className="flex-1">
                    <Label htmlFor="org-email" className="block mb-2">Admin Email</Label>
                    <Input 
                      id="org-email" 
                      value={userData?.email || ''} 
                      readOnly 
                      className="bg-muted"
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
      
      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete your company card from all business cards.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleDelete();
              }}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? "Deleting..." : "Delete Company Card"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}