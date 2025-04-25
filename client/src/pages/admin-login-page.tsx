import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";

const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function AdminLoginPage() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [, setLocation] = useLocation();
  const { user, login, loginLoading } = useAuth();

  // Redirect based on user role if already logged in
  useEffect(() => {
    if (user) {
      console.log("User is already logged in:", user.userType);
      
      if (user.userType === 'admin') {
        // Admin is already logged in, redirect to admin dashboard
        setLocation('/admin/dashboard');
      } else if (user.userType === 'superadmin') {
        // Superadmin is logged in, redirect to superadmin dashboard
        setLocation('/');
      }
    }
  }, [user, setLocation]);

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  // Reset submitting state when login loading changes
  useEffect(() => {
    setIsLoading(loginLoading);
  }, [loginLoading]);

  function onSubmit(values: LoginFormValues) {
    console.log("Submitting admin login form:", values);
    setIsLoading(true);
    
    // First, try to logout to clear any existing session
    fetch('/api/logout', {
      method: 'POST',
      credentials: 'include'
    })
    .then(() => {
      console.log("Logout completed before admin login");
      
      // Use direct fetch with window location change - most reliable approach
      return fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
        credentials: 'include'
      });
    })
    .then(async (res) => {
      if (res.ok) {
        // If login succeeded, get user data
        const data = await res.json();
        console.log("Admin login succeeded:", data);
        
        // Force navigation to admin dashboard immediately
        console.log("Forcing navigation to admin dashboard now");
        
        // Store login state in sessionStorage for the dashboard to detect
        sessionStorage.setItem('userLoggedIn', 'true');
        sessionStorage.setItem('userType', data.userType);

        // For admins, always use replace to avoid back button issues
        window.location.replace('/admin/dashboard');
      } else {
        // If login failed
        console.error("Admin login failed:", res.status, res.statusText);
        toast({
          title: "Login failed",
          description: "Invalid credentials. Please try again.",
          variant: "destructive",
        });
        setIsLoading(false);
      }
    })
    .catch((error) => {
      // Handle network errors
      console.error("Admin login error:", error);
      toast({
        title: "Login error",
        description: error.message || "Something went wrong. Please try again.",
        variant: "destructive",
      });
      setIsLoading(false);
    });
  }

  return (
    <div className="flex min-h-screen">
      {/* Left Column - Form */}
      <div className="w-full lg:w-1/2 flex flex-col justify-center p-8 lg:p-12">
        <div className="max-w-md mx-auto w-full">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold tracking-tight mb-2">Organization Admin Login</h1>
            <p className="text-muted-foreground">
              Access your organization's digital business card management dashboard
            </p>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input placeholder="your.email@organization.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="••••••••" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? "Logging in..." : "Login"}
              </Button>
            </form>
          </Form>

          <div className="mt-6 text-center text-sm">
            <p className="text-muted-foreground">
              Contact your Super Admin if you need assistance with your account
            </p>
          </div>
        </div>
      </div>

      {/* Right Column - Hero */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-r from-blue-500 to-indigo-600 text-white">
        <div className="flex flex-col justify-center p-12">
          <h1 className="text-4xl font-bold mb-6">
            Digital Business Card Platform
          </h1>
          <p className="text-xl opacity-90 mb-8">
            Create and manage professional digital business cards for your entire organization in one place.
          </p>
          <ul className="space-y-4">
            <li className="flex items-center">
              <div className="rounded-full bg-white/20 p-1 mr-3">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                  <polyline points="22 4 12 14.01 9 11.01"></polyline>
                </svg>
              </div>
              Create personalized business cards for your employees
            </li>
            <li className="flex items-center">
              <div className="rounded-full bg-white/20 p-1 mr-3">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                  <polyline points="22 4 12 14.01 9 11.01"></polyline>
                </svg>
              </div>
              Choose from professional templates and customize each card
            </li>
            <li className="flex items-center">
              <div className="rounded-full bg-white/20 p-1 mr-3">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                  <polyline points="22 4 12 14.01 9 11.01"></polyline>
                </svg>
              </div>
              Share cards with unique URLs for easy access
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}