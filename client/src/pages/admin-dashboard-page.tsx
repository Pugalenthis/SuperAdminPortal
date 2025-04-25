import { useState, useEffect, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { getQueryFn } from "@/lib/queryClient";
import { useLocation } from "wouter";
import { Employee } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Plus, Users, CreditCard, LogOut } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface AdminUser {
  id: number;
  email: string;
  orgName: string;
  userType: 'admin';
}

export default function AdminDashboardPage() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [adminInfo, setAdminInfo] = useState<AdminUser | null>(null);
  
  // Navigation function
  const navigate = useCallback((path: string) => {
    setLocation(path);
  }, [setLocation]);
  
  // Fetch current admin user information
  const { data: userData, isLoading: userLoading } = useQuery({
    queryKey: ['/api/user'],
    queryFn: getQueryFn({ on401: "throw" }),
    retry: false,
    onError: () => {
      navigate('/admin/login');
    }
  });
  
  // Fetch employees
  const { data: employees = [], isLoading: employeesLoading } = useQuery({
    queryKey: ['/api/employees'],
    queryFn: getQueryFn({ on401: "throw" }),
    retry: false,
    enabled: !!adminInfo // Only fetch when admin info is available
  });

  // Handle logout
  const handleLogout = async () => {
    try {
      const response = await fetch('/api/logout', {
        method: 'POST'
      });
      
      if (response.ok) {
        toast({
          title: "Logged out successfully",
        });
        navigate('/admin/login');
      } else {
        throw new Error("Logout failed");
      }
    } catch (error) {
      toast({
        title: "Logout failed",
        description: "Please try again",
        variant: "destructive"
      });
    }
  };

  // Check if logged in user is an admin
  useEffect(() => {
    if (userData) {
      if (userData.userType !== 'admin') {
        toast({
          title: "Access denied",
          description: "This dashboard is only for organization admins",
          variant: "destructive"
        });
        navigate('/');
        return;
      }
      
      setAdminInfo(userData as AdminUser);
    }
  }, [userData, navigate, toast]);

  if (userLoading) {
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
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold">Admin Dashboard</h1>
            {adminInfo && (
              <p className="text-muted-foreground">{adminInfo.orgName}</p>
            )}
          </div>
          <Button variant="ghost" onClick={handleLogout}>
            <LogOut className="h-4 w-4 mr-2" />
            Log out
          </Button>
        </div>
      </header>
      
      <main className="container mx-auto px-4 py-6">
        {/* Welcome Card */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Welcome, {adminInfo?.orgName}</CardTitle>
            <CardDescription>Manage your organization's business cards from this dashboard</CardDescription>
          </CardHeader>
          <CardContent>
            <p>From here, you can create and manage digital business cards for your employees. Start by adding your first employee.</p>
          </CardContent>
          <CardFooter>
            <Button onClick={() => navigate('/admin/employees/new')}>
              <Plus className="h-4 w-4 mr-2" />
              Add Employee
            </Button>
          </CardFooter>
        </Card>
        
        {/* Main Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <Card>
            <CardHeader>
              <CardTitle>Employees</CardTitle>
              <CardDescription>Manage your organization's employees</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                <div className="bg-primary/10 p-3 rounded-full">
                  <Users className="h-8 w-8 text-primary" />
                </div>
                <div>
                  <p className="text-3xl font-bold">{employeesLoading ? '...' : employees.length}</p>
                  <p className="text-muted-foreground">Total employees</p>
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button variant="outline" className="w-full" onClick={() => navigate('/admin/employees')}>
                View All Employees
              </Button>
            </CardFooter>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Business Cards</CardTitle>
              <CardDescription>Create and manage business cards</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                <div className="bg-primary/10 p-3 rounded-full">
                  <CreditCard className="h-8 w-8 text-primary" />
                </div>
                <div>
                  <p className="text-3xl font-bold">0</p>
                  <p className="text-muted-foreground">Active cards</p>
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button variant="outline" className="w-full" onClick={() => navigate('/admin/cards')}>
                Manage Cards
              </Button>
            </CardFooter>
          </Card>
        </div>
        
        {/* Recent Employees */}
        <h2 className="text-xl font-semibold mb-4">Recent Employees</h2>
        <Card>
          <CardContent className="p-0">
            {employeesLoading ? (
              <div className="p-6 text-center">
                <div className="animate-spin w-6 h-6 border-4 border-primary border-t-transparent rounded-full inline-block"></div>
                <p className="mt-2">Loading employees...</p>
              </div>
            ) : employees.length > 0 ? (
              <div className="divide-y">
                {employees.slice(0, 5).map((employee: Employee) => (
                  <div key={employee.id} className="p-4 hover:bg-muted/50 transition-colors flex justify-between items-center">
                    <div>
                      <p className="font-medium">{employee.firstName} {employee.lastName}</p>
                      <p className="text-sm text-muted-foreground">{employee.title}</p>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => navigate(`/admin/employees/${employee.id}`)}>
                      View
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-6 text-center">
                <p className="text-muted-foreground">No employees found</p>
                <Button variant="outline" size="sm" className="mt-2" onClick={() => navigate('/admin/employees/new')}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Employee
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}