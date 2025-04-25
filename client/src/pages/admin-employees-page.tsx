import { useState, useEffect, useCallback } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { getQueryFn, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Employee } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { 
  ArrowLeft, Plus, Search, MoreVertical, Edit, Trash, 
  CreditCard, User, Mail, Phone 
} from "lucide-react";
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

export default function AdminEmployeesPage() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  
  // Navigation function
  const navigate = useCallback((path: string) => {
    setLocation(path);
  }, [setLocation]);
  const [searchQuery, setSearchQuery] = useState("");
  const [deleteEmployeeId, setDeleteEmployeeId] = useState<number | null>(null);
  const [employeeToDelete, setEmployeeToDelete] = useState<Employee | null>(null);
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
  
  // Fetch employees
  const { data: employees = [], isLoading: employeesLoading, refetch: refetchEmployees } = useQuery({
    queryKey: ['/api/employees'],
    queryFn: getQueryFn({ on401: "throw" }),
    retry: false,
    enabled: !!user && user.userType === 'admin'
  });
  
  // Manually refetch employees when component mounts or when redirected from employee creation
  useEffect(() => {
    const manuallyRefreshEmployees = async () => {
      if (user && user.userType === 'admin') {
        console.log("Manually refreshing employees list");
        await refetchEmployees();
      }
    };
    
    manuallyRefreshEmployees();
    
    // Check URL parameters for a refresh signal
    const params = new URLSearchParams(window.location.search);
    if (params.get('refresh') === 'true') {
      console.log("Refresh parameter detected, refreshing employees list");
      // Remove the refresh parameter from the URL to prevent infinite refreshes
      window.history.replaceState({}, document.title, window.location.pathname);
      manuallyRefreshEmployees();
    }
  }, [user, refetchEmployees]);
  
  // Filter employees based on search query
  const filteredEmployees = employees.filter((employee: Employee) => {
    const fullName = `${employee.firstName} ${employee.lastName}`.toLowerCase();
    const query = searchQuery.toLowerCase();
    return (
      fullName.includes(query) ||
      employee.email.toLowerCase().includes(query) ||
      (employee.title && employee.title.toLowerCase().includes(query)) ||
      (employee.department && employee.department.toLowerCase().includes(query))
    );
  });
  
  // Function to handle employee deletion
  const confirmDelete = (employee: Employee) => {
    setDeleteEmployeeId(employee.id);
    setEmployeeToDelete(employee);
  };
  
  const handleDeleteEmployee = async () => {
    if (!deleteEmployeeId) return;
    
    setIsDeleting(true);
    try {
      const response = await fetch(`/api/employees/${deleteEmployeeId}`, {
        method: "DELETE",
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || "Failed to delete employee");
      }
      
      // Invalidate the employees query to refresh the list
      queryClient.invalidateQueries({ queryKey: ['/api/employees'] });
      
      toast({
        title: "Employee deleted",
        description: `${employeeToDelete?.firstName} ${employeeToDelete?.lastName} has been removed`,
      });
      
      // Close the dialog
      setDeleteEmployeeId(null);
      setEmployeeToDelete(null);
    } catch (error) {
      console.error("Error deleting employee:", error);
      toast({
        title: "Failed to delete employee",
        description: error instanceof Error ? error.message : "An unknown error occurred",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };
  
  // Loading state
  if (userLoading || (employeesLoading && user?.userType === 'admin')) {
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
            <h1 className="text-2xl font-bold">Employees</h1>
            <Button onClick={() => navigate('/admin/employees/new')}>
              <Plus className="h-4 w-4 mr-2" />
              Add Employee
            </Button>
          </div>
        </div>
      </header>
      
      <main className="container mx-auto px-4 py-6">
        {/* Search */}
        <div className="mb-6 relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search employees by name, email, title, or department..."
            className="pl-10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        
        {/* Employees List */}
        <Card>
          {employees.length === 0 ? (
            <div className="p-6 text-center">
              <User className="h-12 w-12 mx-auto text-muted-foreground opacity-50 mb-3" />
              <h3 className="text-lg font-medium mb-1">No employees found</h3>
              <p className="text-muted-foreground mb-4">You haven't added any employees yet.</p>
              <Button onClick={() => navigate('/admin/employees/new')}>
                <Plus className="h-4 w-4 mr-2" />
                Add First Employee
              </Button>
            </div>
          ) : filteredEmployees.length === 0 ? (
            <div className="p-6 text-center">
              <Search className="h-12 w-12 mx-auto text-muted-foreground opacity-50 mb-3" />
              <h3 className="text-lg font-medium mb-1">No matching employees</h3>
              <p className="text-muted-foreground mb-4">No employees match your search criteria.</p>
              <Button variant="outline" onClick={() => setSearchQuery("")}>
                Clear Search
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead className="hidden md:table-cell">Email</TableHead>
                    <TableHead className="hidden lg:table-cell">Department</TableHead>
                    <TableHead className="hidden lg:table-cell">Phone</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredEmployees.map((employee: Employee) => (
                    <TableRow key={employee.id}>
                      <TableCell className="font-medium">
                        {employee.firstName} {employee.lastName}
                      </TableCell>
                      <TableCell>{employee.title}</TableCell>
                      <TableCell className="hidden md:table-cell">
                        {employee.email}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        {employee.department || "—"}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        {employee.phone || "—"}
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
                            <DropdownMenuItem onClick={() => navigate(`/admin/employees/${employee.id}`)}>
                              <User className="h-4 w-4 mr-2" />
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => navigate(`/admin/employees/${employee.id}/edit`)}>
                              <Edit className="h-4 w-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => navigate(`/admin/employees/${employee.id}/cards/new`)}>
                              <CreditCard className="h-4 w-4 mr-2" />
                              Create Card
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-destructive focus:text-destructive"
                              onClick={() => confirmDelete(employee)}
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
        
        {/* Contact shortcuts for mobile */}
        <div className="md:hidden mt-6 space-y-4">
          <h2 className="text-lg font-medium mb-2">Quick Contact</h2>
          {filteredEmployees.map((employee: Employee) => (
            <Card key={`mobile-${employee.id}`} className="p-4">
              <div className="flex flex-col space-y-3">
                <div>
                  <h3 className="font-medium">{employee.firstName} {employee.lastName}</h3>
                  <p className="text-sm text-muted-foreground">{employee.title}</p>
                </div>
                <div className="flex space-x-2">
                  {employee.email && (
                    <Button variant="outline" size="icon" asChild>
                      <a href={`mailto:${employee.email}`}>
                        <Mail className="h-4 w-4" />
                      </a>
                    </Button>
                  )}
                  {employee.phone && (
                    <Button variant="outline" size="icon" asChild>
                      <a href={`tel:${employee.phone}`}>
                        <Phone className="h-4 w-4" />
                      </a>
                    </Button>
                  )}
                  <Button variant="outline" size="icon" onClick={() => navigate(`/admin/employees/${employee.id}`)}>
                    <User className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </main>
      
      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteEmployeeId} onOpenChange={(open) => !open && setDeleteEmployeeId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete {employeeToDelete?.firstName} {employeeToDelete?.lastName} 
              and all associated business cards. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteEmployee}
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