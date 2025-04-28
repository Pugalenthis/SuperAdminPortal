import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Loader2, Upload, AlertTriangle, CheckCircle2, Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default function AdminOrganizationPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedCardId, setSelectedCardId] = useState<number | null>(null);
  
  // Query to get active company card
  const { data: activeCard, isLoading: isLoadingActive } = useQuery({
    queryKey: ['/api/company-cards/active'],
    enabled: !!user,
  });
  
  // Query to get all company cards
  const { data: companyCards, isLoading: isLoadingCards } = useQuery({
    queryKey: ['/api/company-cards'],
    enabled: !!user,
  });
  
  // Mutation to upload a new company card
  const uploadMutation = useMutation({
    mutationFn: async (data: FormData) => {
      const response = await apiRequest('/api/company-cards', { 
        method: 'POST',
        body: data
      });
      return response;
    },
    onSuccess: () => {
      toast({
        title: "Company card uploaded successfully",
        description: "Your company card has been uploaded and is now active.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/company-cards'] });
      queryClient.invalidateQueries({ queryKey: ['/api/company-cards/active'] });
      
      // Reset the form
      setFile(null);
      setPreviewUrl(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to upload company card",
        description: error.message || "An error occurred while uploading your company card.",
        variant: "destructive",
      });
    }
  });
  
  // Mutation to delete a company card
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest(`/api/company-cards/${id}`, { 
        method: 'DELETE'
      });
      return response;
    },
    onSuccess: () => {
      toast({
        title: "Company card deleted successfully",
        description: "The company card has been removed.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/company-cards'] });
      queryClient.invalidateQueries({ queryKey: ['/api/company-cards/active'] });
      setDeleteDialogOpen(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to delete company card",
        description: error.message || "An error occurred while deleting the company card.",
        variant: "destructive",
      });
    }
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      
      // Create a preview URL
      const url = URL.createObjectURL(selectedFile);
      setPreviewUrl(url);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      toast({
        title: "No file selected",
        description: "Please select an image file to upload.",
        variant: "destructive",
      });
      return;
    }
    
    // Create form data for upload
    const formData = new FormData();
    formData.append('image', file);
    formData.append('imagePath', file.name);
    formData.append('width', '1066');
    formData.append('height', '445');
    formData.append('isActive', 'true');
    
    // Upload the file
    uploadMutation.mutate(formData);
  };

  const handleDeleteClick = (id: number) => {
    setSelectedCardId(id);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (selectedCardId) {
      deleteMutation.mutate(selectedCardId);
    }
  };

  return (
    <div className="container py-8">
      <h1 className="text-3xl font-bold mb-6">Organization Settings</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div>
          <Card>
            <CardHeader>
              <CardTitle>Company Card</CardTitle>
              <CardDescription>
                Upload a company card image that will be displayed in the bottom section of all business cards.
                The recommended size is 1066px × 445px.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingActive ? (
                <div className="flex justify-center items-center h-40">
                  <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
                </div>
              ) : activeCard ? (
                <div>
                  <h3 className="text-lg font-medium mb-2">Current Active Company Card</h3>
                  <div className="border rounded-md overflow-hidden">
                    <img 
                      src={activeCard.imagePath} 
                      alt="Active company card" 
                      className="w-full h-auto" 
                    />
                  </div>
                  <div className="mt-2 text-sm text-gray-500">
                    <p>Size: {activeCard.width}px × {activeCard.height}px</p>
                    <p>Uploaded: {new Date(activeCard.createdAt).toLocaleDateString()}</p>
                  </div>
                </div>
              ) : (
                <Alert variant="default" className="bg-yellow-50 border-yellow-200">
                  <AlertTriangle className="h-4 w-4 text-yellow-500" />
                  <AlertTitle>No company card found</AlertTitle>
                  <AlertDescription>
                    You haven't uploaded a company card yet. Business cards will only show employee information.
                  </AlertDescription>
                </Alert>
              )}
              
              <Separator className="my-6" />
              
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Upload New Company Card</h3>
                <div className="grid w-full max-w-sm items-center gap-1.5">
                  <Label htmlFor="company-card">Company Card Image</Label>
                  <Input 
                    id="company-card" 
                    type="file" 
                    accept="image/*"
                    onChange={handleFileChange}
                  />
                </div>
                
                {previewUrl && (
                  <div className="mt-4">
                    <h4 className="text-sm font-medium mb-2">Preview</h4>
                    <div className="border rounded-md overflow-hidden">
                      <img 
                        src={previewUrl} 
                        alt="Company card preview" 
                        className="w-full h-auto" 
                      />
                    </div>
                  </div>
                )}
                
                <Button 
                  onClick={handleUpload} 
                  disabled={!file || uploadMutation.isPending}
                  className="flex items-center gap-2"
                >
                  {uploadMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4" />
                      Upload Card
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
        
        <div>
          <Card>
            <CardHeader>
              <CardTitle>Card History</CardTitle>
              <CardDescription>
                View and manage all company cards that have been uploaded.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingCards ? (
                <div className="flex justify-center items-center h-40">
                  <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
                </div>
              ) : companyCards && companyCards.length > 0 ? (
                <div className="space-y-4">
                  {companyCards.map((card: any) => (
                    <div key={card.id} className="border rounded-md p-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-medium">Company Card #{card.id}</h3>
                            {card.isActive && (
                              <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full flex items-center gap-1">
                                <CheckCircle2 className="h-3 w-3" />
                                Active
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-gray-500 mt-1">
                            Uploaded: {new Date(card.createdAt).toLocaleDateString()}
                          </p>
                          <p className="text-sm text-gray-500">
                            Size: {card.width}px × {card.height}px
                          </p>
                        </div>
                        <Button 
                          variant="destructive" 
                          size="icon"
                          onClick={() => handleDeleteClick(card.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="mt-2">
                        <img 
                          src={card.imagePath} 
                          alt={`Company card ${card.id}`}
                          className="w-full h-auto border rounded"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center p-8 text-gray-500">
                  <p>No company cards found</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
      
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Company Card</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this company card? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={confirmDelete}
              disabled={deleteMutation.isPending}
              className="flex items-center gap-2"
            >
              {deleteMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4" />
                  Delete Card
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}