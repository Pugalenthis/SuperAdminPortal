import { useState, useEffect, useCallback } from "react";
import { useLocation, useParams } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Save } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { getQueryFn, queryClient } from "@/lib/queryClient";

// Employee form schema
const employeeEditFormSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Please enter a valid email"),
  phone: z.string().optional(),
  title: z.string().min(1, "Job title is required"),
  department: z.string().optional(),
  profileImage: z.string().optional(),
});

type EmployeeEditFormValues = z.infer<typeof employeeEditFormSchema>;

export default function AdminEmployeeEditPage() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const params = useParams();
  const employeeId = parseInt(params.employeeId || "0", 10);
  
  // Navigation function
  const navigate = useCallback((path: string) => {
    setLocation(path);
  }, [setLocation]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Define the form
  const form = useForm<EmployeeEditFormValues>({
    resolver: zodResolver(employeeEditFormSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      title: "",
      department: "",
      profileImage: "",
    },
  });
  
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
    enabled: !!user && user.userType === 'admin' && !!employeeId,
  });
  
  // Update form when employee data is loaded
  useEffect(() => {
    if (employee) {
      console.log("Setting form values with employee data:", employee);
      form.reset({
        firstName: employee.firstName || "",
        lastName: employee.lastName || "",
        email: employee.email || "",
        phone: employee.phone || "",
        title: employee.title || "",
        department: employee.department || "",
        profileImage: employee.profileImage || "",
      });
    }
  }, [employee, form]);
  
  // Form submission handler
  const onSubmit = async (values: EmployeeEditFormValues) => {
    if (!employeeId) return;
    
    setIsSubmitting(true);
    try {
      // Clean values before sending to avoid any issues with special characters
      const cleanData = {
        ...values,
        // Sanitize the URL by encoding any problematic characters
        profileImage: values.profileImage ? encodeURI(values.profileImage) : "",
      };

      console.log("Submitting employee update with data:", cleanData);
      
      const response = await fetch(`/api/employees/${employeeId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(cleanData),
        credentials: 'include'
      });
      
      if (!response.ok) {
        const contentType = response.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
          const data = await response.json();
          throw new Error(data.message || "Failed to update employee");
        } else {
          const text = await response.text();
          throw new Error(`Server error: ${response.status} - ${text}`);
        }
      }
      
      // If we got here, it was successful
      console.log("Employee updated successfully");
      
      // Force refetch to ensure we get the latest data
      await queryClient.invalidateQueries({ queryKey: [`/api/employees/${employeeId}`] });
      await queryClient.invalidateQueries({ queryKey: ['/api/employees'] });
      
      // Force reset the cache to prevent stale data
      queryClient.resetQueries({ queryKey: [`/api/employees/${employeeId}`] });
      queryClient.resetQueries({ queryKey: ['/api/employees'] });
      
      toast({
        title: "Employee updated successfully",
        description: `${values.firstName} ${values.lastName}'s information has been updated`,
      });
      
      // Navigate back with a refresh trigger
      navigate(`/admin/employees?refresh=${Date.now()}`);
    } catch (error) {
      console.error("Error updating employee:", error);
      toast({
        title: "Failed to update employee",
        description: error instanceof Error ? error.message : "An unexpected JSON parsing error occurred. Try simplifying the profile image URL.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  
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
          </CardHeader>
          <CardContent>
            <p className="text-center text-muted-foreground">
              The employee you're trying to edit might have been removed or doesn't exist.
            </p>
          </CardContent>
          <CardFooter className="flex justify-center pb-6">
            <Button onClick={() => navigate('/admin/employees')}>
              Back to Employees List
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
          <Button 
            variant="ghost" 
            className="mb-2" 
            onClick={() => navigate(`/admin/employees/${employeeId}`)}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Employee Details
          </Button>
          <h1 className="text-2xl font-bold">Edit Employee</h1>
        </div>
      </header>
      
      <main className="container mx-auto px-4 py-6">
        <Card>
          <CardHeader>
            <CardTitle>Employee Information</CardTitle>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form id="employee-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* First Name */}
                  <FormField
                    control={form.control}
                    name="firstName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>First Name</FormLabel>
                        <FormControl>
                          <Input placeholder="John" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  {/* Last Name */}
                  <FormField
                    control={form.control}
                    name="lastName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Last Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Doe" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  {/* Email */}
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input placeholder="john.doe@example.com" type="email" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  {/* Phone */}
                  <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Phone</FormLabel>
                        <FormControl>
                          <Input placeholder="+1 (555) 123-4567" {...field} />
                        </FormControl>
                        <FormDescription>Optional</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  {/* Job Title */}
                  <FormField
                    control={form.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Job Title</FormLabel>
                        <FormControl>
                          <Input placeholder="Marketing Director" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  {/* Department */}
                  <FormField
                    control={form.control}
                    name="department"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Department</FormLabel>
                        <FormControl>
                          <Input placeholder="Marketing" {...field} />
                        </FormControl>
                        <FormDescription>Optional</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  {/* Profile Image URL */}
                  <FormField
                    control={form.control}
                    name="profileImage"
                    render={({ field }) => (
                      <FormItem className="col-span-full">
                        <FormLabel>Profile Image URL</FormLabel>
                        <FormControl>
                          <Input placeholder="https://example.com/profile.jpg" {...field} />
                        </FormControl>
                        <FormDescription>
                          Optional. Enter a URL to the employee's profile picture
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </form>
            </Form>
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button 
              variant="outline" 
              onClick={() => navigate(`/admin/employees/${employeeId}`)}
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              form="employee-form" 
              disabled={isSubmitting}
            >
              <Save className="h-4 w-4 mr-2" />
              {isSubmitting ? "Saving..." : "Save Changes"}
            </Button>
          </CardFooter>
        </Card>
      </main>
    </div>
  );
}