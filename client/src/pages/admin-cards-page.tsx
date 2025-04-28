import { useState, useEffect, useCallback } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { getQueryFn, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { BusinessCard, CardTemplate } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { 
  ArrowLeft, Plus, Search, MoreVertical, Eye, Edit, Trash, 
  CreditCard, User, Mail, Link, Calendar, Check, X 
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";

export default function AdminCardsPage() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  
  // Navigation function
  const navigate = useCallback((path: string) => {
    setLocation(path);
  }, [setLocation]);
  
  const [searchQuery, setSearchQuery] = useState("");
  const [deleteCardId, setDeleteCardId] = useState<number | null>(null);
  const [cardToDelete, setCardToDelete] = useState<BusinessCard | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  
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
  
  // Fetch all business cards for this admin
  const { 
    data: businessCards = [], 
    isLoading: cardsLoading, 
    refetch: refetchCards 
  } = useQuery({
    queryKey: ['/api/cards'],
    queryFn: async () => {
      try {
        // Direct fetch with explicit URL to avoid caching issues
        const response = await fetch('/api/cards', {
          credentials: 'include',
          headers: {
            'Accept': 'application/json'
          },
          cache: 'no-store' // Important: don't cache this request
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || `Failed to fetch cards: ${response.status}`);
        }
        
        console.log("Manually refreshing cards list with forced cache reset");
        const data = await response.json();
        return data;
      } catch (error) {
        console.error("Error fetching cards:", error);
        throw error;
      }
    },
    retry: false,
    enabled: !!user && user.userType === 'admin',
    refetchOnWindowFocus: true, // Refetch when window gets focus
    cacheTime: 0, // Don't cache this query
    staleTime: 0, // Consider data stale immediately
  });
  
  // Fetch all templates for reference
  const { 
    data: templates = [], 
    isLoading: templatesLoading 
  } = useQuery({
    queryKey: ['/api/card-templates'],
    queryFn: getQueryFn({ on401: "throw" }),
    retry: false,
    enabled: !!user && user.userType === 'admin'
  });
  
  // Manually refetch cards when component mounts or when redirected with refresh param
  useEffect(() => {
    const manuallyRefreshCards = async () => {
      if (user && user.userType === 'admin') {
        console.log("Manually refreshing cards list with forced cache reset");
        
        // Force clear the cache before refetching
        queryClient.removeQueries({ queryKey: ['/api/cards'] });
        
        // Fetch fresh data
        await refetchCards();
      }
    };
    
    manuallyRefreshCards();
    
    // Check URL parameters for a refresh signal
    const params = new URLSearchParams(window.location.search);
    if (params.get('refresh')) {
      console.log("Refresh parameter detected, forcing complete data refresh");
      
      // Remove the refresh parameter from the URL to prevent infinite refreshes
      window.history.replaceState({}, document.title, window.location.pathname);
      
      // Force a stronger refresh
      queryClient.resetQueries({ queryKey: ['/api/cards'] });
      setTimeout(() => {
        manuallyRefreshCards();
      }, 100);
    }
  }, [user, refetchCards, queryClient]);
  
  // Find template name by ID
  const getTemplateName = (templateId: number) => {
    const template = templates.find((t: CardTemplate) => t.id === templateId);
    return template ? template.name : "Unknown Template";
  };
  
  // Get employee name for a card
  const getEmployeeName = (card: BusinessCard) => {
    return card.employee ? 
      `${card.employee.firstName} ${card.employee.lastName}` : 
      "Unknown Employee";
  };
  
  // Filter cards based on search query
  const filteredCards = businessCards.filter((card: BusinessCard) => {
    const templateName = getTemplateName(card.templateId).toLowerCase();
    const employeeName = card.employee ? 
      `${card.employee.firstName} ${card.employee.lastName}`.toLowerCase() : 
      "";
    const query = searchQuery.toLowerCase();
    
    return (
      templateName.includes(query) ||
      employeeName.includes(query) ||
      card.uniqueUrl.toLowerCase().includes(query) ||
      (card.status && card.status.toLowerCase().includes(query))
    );
  });
  
  // Function to handle card deletion
  const confirmDelete = (card: BusinessCard) => {
    setDeleteCardId(card.id);
    setCardToDelete(card);
  };
  
  const handleDeleteCard = async () => {
    if (!deleteCardId) return;
    
    setIsDeleting(true);
    try {
      const response = await fetch(`/api/cards/${deleteCardId}`, {
        method: "DELETE",
        credentials: 'include'
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || "Failed to delete business card");
      }
      
      // Close the dialog first
      setDeleteCardId(null);
      setCardToDelete(null);
      
      // Then invalidate and manually refetch
      await queryClient.invalidateQueries({ queryKey: ['/api/cards'] });
      
      // Directly update the UI by removing the deleted card from the current list
      const currentCards = queryClient.getQueryData(['/api/cards']) as BusinessCard[] || [];
      const updatedCards = currentCards.filter(card => card.id !== deleteCardId);
      queryClient.setQueryData(['/api/cards'], updatedCards);
      
      // Then refetch to ensure we have the latest data
      await refetchCards();
      
      toast({
        title: "Business card deleted",
        description: `The business card has been removed`,
      });
    } catch (error) {
      console.error("Error deleting card:", error);
      toast({
        title: "Failed to delete business card",
        description: error instanceof Error ? error.message : "An unknown error occurred",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };
  
  // Generate copyable card URL
  const getCardUrl = (uniqueUrl: string) => {
    return `${window.location.origin}/card/${uniqueUrl}`;
  };
  
  // Copy card URL to clipboard
  const copyCardUrl = (uniqueUrl: string) => {
    const url = getCardUrl(uniqueUrl);
    navigator.clipboard.writeText(url);
    toast({
      title: "URL copied",
      description: "Business card URL copied to clipboard",
    });
  };
  
  // Status badge component
  const StatusBadge = ({ status }: { status: string }) => {
    let variant: "default" | "outline" | "secondary" | "destructive" = "outline";
    let icon = null;
    
    switch (status.toLowerCase()) {
      case 'active':
        variant = "default";
        icon = <Check className="h-3 w-3 mr-1" />;
        break;
      case 'inactive':
      case 'disabled':
        variant = "secondary";
        icon = <X className="h-3 w-3 mr-1" />;
        break;
      case 'pending':
        variant = "outline";
        break;
      default:
        variant = "outline";
    }
    
    return (
      <Badge variant={variant} className="inline-flex items-center">
        {icon}
        {status}
      </Badge>
    );
  };
  
  // Loading state
  if (userLoading || (cardsLoading && user?.userType === 'admin') || (templatesLoading && user?.userType === 'admin')) {
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
          <Button variant="ghost" className="mb-2" onClick={() => navigate('/admin/dashboard')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
            <h1 className="text-2xl font-bold">Business Cards</h1>
            <Button onClick={() => navigate('/admin/employees')}>
              <Plus className="h-4 w-4 mr-2" />
              Create New Card
            </Button>
          </div>
        </div>
      </header>
      
      <main className="container mx-auto px-4 py-6">
        {/* Search */}
        <div className="mb-6 relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search cards by employee, template, or status..."
            className="pl-10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        
        {/* Cards List */}
        <Card>
          {businessCards.length === 0 ? (
            <div className="p-6 text-center">
              <CreditCard className="h-12 w-12 mx-auto text-muted-foreground opacity-50 mb-3" />
              <h3 className="text-lg font-medium mb-1">No business cards found</h3>
              <p className="text-muted-foreground mb-4">You haven't created any business cards yet.</p>
              <Button onClick={() => navigate('/admin/employees')}>
                <Plus className="h-4 w-4 mr-2" />
                Create First Card
              </Button>
            </div>
          ) : filteredCards.length === 0 ? (
            <div className="p-6 text-center">
              <Search className="h-12 w-12 mx-auto text-muted-foreground opacity-50 mb-3" />
              <h3 className="text-lg font-medium mb-1">No matching business cards</h3>
              <p className="text-muted-foreground mb-4">No business cards match your search criteria.</p>
              <Button variant="outline" onClick={() => setSearchQuery("")}>
                Clear Search
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Template</TableHead>
                    <TableHead className="hidden md:table-cell">Created</TableHead>
                    <TableHead className="hidden lg:table-cell">URL</TableHead>
                    <TableHead className="hidden lg:table-cell">Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCards.map((card: BusinessCard) => (
                    <TableRow key={card.id}>
                      <TableCell className="font-medium">
                        {getEmployeeName(card)}
                      </TableCell>
                      <TableCell>
                        {getTemplateName(card.templateId)}
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        {card.createdAt 
                          ? formatDistanceToNow(new Date(card.createdAt), { addSuffix: true }) 
                          : "—"
                        }
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        <div className="flex items-center">
                          <span className="truncate max-w-[200px] mr-2">{card.uniqueUrl}</span>
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="h-7 w-7"
                                  onClick={() => copyCardUrl(card.uniqueUrl)}
                                >
                                  <Link className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Copy Link</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        {card.status ? <StatusBadge status={card.status} /> : "—"}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreVertical className="h-4 w-4" />
                              <span className="sr-only">Actions</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => window.open(`/card/${card.uniqueUrl}`, '_blank')}>
                              <Eye className="h-4 w-4 mr-2" />
                              View Card
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => navigate(`/admin/cards/${card.id}/edit?refresh=${Date.now()}`)}>
                              <Edit className="h-4 w-4 mr-2" />
                              Edit Card
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => copyCardUrl(card.uniqueUrl)}>
                              <Link className="h-4 w-4 mr-2" />
                              Copy URL
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-destructive focus:text-destructive"
                              onClick={() => confirmDelete(card)}
                            >
                              <Trash className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </Card>
      </main>
      
      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteCardId} onOpenChange={(open) => !open && setDeleteCardId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this business card. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteCard}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}