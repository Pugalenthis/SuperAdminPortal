import { useState, useEffect, useCallback } from "react";
import { useLocation, useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { getQueryFn } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Edit, Mail, Phone, Building, CreditCard, Plus, Loader2 } from "lucide-react";
import { Employee } from "@shared/schema";

export default function AdminEmployeeDetailPage() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const params = useParams();
  const employeeId = parseInt(params.employeeId || "0", 10);
  
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
  
  // Fetch employee details
  const { data: employee, isLoading: employeeLoading } = useQuery({
    queryKey: [`/api/employees/${employeeId}`],
    queryFn: getQueryFn({ on401: "throw" }),
    retry: false,
    enabled: !!user && user.userType === 'admin' && !!employeeId
  });
  
  // Fetch employee's business cards
  const { data: businessCards = [], isLoading: cardsLoading } = useQuery({
    queryKey: [`/api/employees/${employeeId}/cards`],
    queryFn: getQueryFn({ on401: "throw" }),
    retry: false,
    enabled: !!user && user.userType === 'admin' && !!employeeId
  });
  
  // Loading state
  if (userLoading || (employeeLoading && user?.userType === 'admin')) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full"></div>
      </div>
    );
  }
  
  // Employee not found state
  if (!employee && !employeeLoading) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center">
        <Card className="w-full max-w-md mx-auto">
          <CardHeader>
            <CardTitle className="text-center">Employee Not Found</CardTitle>
            <CardDescription className="text-center">
              The employee you're looking for might have been removed or doesn't exist.
            </CardDescription>
          </CardHeader>
          <CardFooter className="flex justify-center pb-6">
            <Button onClick={() => navigate('/admin/employees')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Employees
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
          <Button variant="ghost" className="mb-2" onClick={() => navigate('/admin/employees')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Employees
          </Button>
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
            <h1 className="text-2xl font-bold">Employee Details</h1>
            <div className="flex space-x-2">
              <Button variant="outline" onClick={() => navigate(`/admin/employees/${employeeId}/edit`)}>
                <Edit className="h-4 w-4 mr-2" />
                Edit Employee
              </Button>
              <Button onClick={() => navigate(`/admin/employees/${employeeId}/cards/new`)}>
                <Plus className="h-4 w-4 mr-2" />
                New Card
              </Button>
            </div>
          </div>
        </div>
      </header>
      
      <main className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Employee Info Card */}
          <Card className="md:col-span-2">
            <CardHeader className="pb-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                <Avatar className="h-20 w-20">
                  {employee?.profileImage ? (
                    <AvatarImage src={employee.profileImage} alt={`${employee.firstName} ${employee.lastName}`} />
                  ) : null}
                  <AvatarFallback className="text-2xl">
                    {employee?.firstName?.charAt(0)}{employee?.lastName?.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <CardTitle className="text-2xl">
                    {employee?.firstName} {employee?.lastName}
                  </CardTitle>
                  <CardDescription className="text-lg">
                    {employee?.title}
                    {employee?.department && ` • ${employee.department}`}
                  </CardDescription>
                  <Badge variant="outline" className="mt-1">
                    {employee?.status}
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pb-6">
              <Separator className="my-4" />
              <div className="space-y-4">
                <div className="flex items-center">
                  <Mail className="h-5 w-5 mr-2 text-muted-foreground" />
                  <span>{employee?.email}</span>
                </div>
                {employee?.phone && (
                  <div className="flex items-center">
                    <Phone className="h-5 w-5 mr-2 text-muted-foreground" />
                    <span>{employee.phone}</span>
                  </div>
                )}
                {employee?.department && (
                  <div className="flex items-center">
                    <Building className="h-5 w-5 mr-2 text-muted-foreground" />
                    <span>{employee.department}</span>
                  </div>
                )}
              </div>
              
              <Separator className="my-6" />
              
              <div>
                <h3 className="text-lg font-medium mb-3">Business Cards</h3>
                {cardsLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : businessCards.length === 0 ? (
                  <div className="border rounded-lg p-6 text-center">
                    <CreditCard className="h-12 w-12 mx-auto text-muted-foreground opacity-50 mb-3" />
                    <h4 className="text-lg font-medium mb-1">No Business Cards</h4>
                    <p className="text-muted-foreground mb-4">This employee doesn't have any business cards yet.</p>
                    <Button onClick={() => navigate(`/admin/employees/${employeeId}/cards/new`)}>
                      <Plus className="h-4 w-4 mr-2" />
                      Create Card
                    </Button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {businessCards.map((card: any) => (
                      <Card key={card.id} className="overflow-hidden">
                        <div className="p-4">
                          <h4 className="font-medium">{card.template?.name || "Business Card"}</h4>
                          <p className="text-sm text-muted-foreground">Created {new Date(card.createdAt).toLocaleDateString()}</p>
                        </div>
                        <div className="bg-muted p-4">
                          <a 
                            href={`/card/${card.uniqueUrl}`} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-sm text-primary hover:underline"
                          >
                            View Card
                          </a>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
          
          {/* Additional Info Card */}
          <Card>
            <CardHeader>
              <CardTitle>Employee Information</CardTitle>
            </CardHeader>
            <CardContent className="pb-6">
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground">Employee ID</h3>
                  <p>{employee?.id}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground">Added On</h3>
                  <p>{new Date(employee?.createdAt || Date.now()).toLocaleDateString()}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground">Status</h3>
                  <Badge variant={employee?.status === "active" ? "default" : "secondary"} className="mt-1">
                    {employee?.status}
                  </Badge>
                </div>
                <Separator />
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground">Actions</h3>
                  <div className="space-y-2 mt-2">
                    <Button variant="outline" className="w-full justify-start" 
                      onClick={() => navigate(`/admin/employees/${employeeId}/edit`)}>
                      <Edit className="h-4 w-4 mr-2" />
                      Edit Details
                    </Button>
                    <Button variant="outline" className="w-full justify-start"
                      onClick={() => navigate(`/admin/employees/${employeeId}/cards/new`)}>
                      <CreditCard className="h-4 w-4 mr-2" />
                      Create Card
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}