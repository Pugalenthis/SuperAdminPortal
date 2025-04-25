import { useState, useEffect, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { loginSchema } from "@shared/schema";
import { z } from "zod";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function AuthPage() {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [, setLocation] = useLocation();
  
  // Navigation function
  const navigate = useCallback((path: string) => {
    setLocation(path);
  }, [setLocation]);
  
  // Get auth information
  const { login, loginLoading, user } = useAuth();
  
  const form = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  // Reset submitting state when login loading changes
  useEffect(() => {
    setIsSubmitting(loginLoading);
  }, [loginLoading]);
  
  // Redirect based on user role if already logged in
  useEffect(() => {
    if (user) {
      console.log("User is logged in, redirecting based on role:", user.userType);
      
      if (user.userType === 'superadmin') {
        navigate('/'); // Super admin dashboard
      } else if (user.userType === 'admin') {
        navigate('/admin/dashboard'); // Regular admin dashboard
      } else {
        console.error("Unknown user type:", user.userType);
        navigate('/');
      }
    }
  }, [user, navigate]);

  function onSubmit(values: z.infer<typeof loginSchema>) {
    console.log("Submitting login form:", values);
    setIsSubmitting(true); // Set submitting state manually
    
    // Use direct fetch with window location change - most reliable approach
    fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(values),
      credentials: 'include'
    })
    .then(async (res) => {
      if (res.ok) {
        // If login succeeded, get user data
        const data = await res.json();
        console.log("Login succeeded:", data);
        
        // Force navigation to dashboard
        console.log("Forcing navigation to dashboard");
        window.location.href = '/'; // For superadmin, always redirect to root
      } else {
        // If login failed
        console.error("Login failed:", res.status, res.statusText);
        toast({
          title: "Login failed",
          description: "Invalid credentials. Please try again.",
          variant: "destructive",
        });
        setIsSubmitting(false);
      }
    })
    .catch((error) => {
      // Handle network errors
      console.error("Login error:", error);
      toast({
        title: "Login error",
        description: error.message || "Something went wrong. Please try again.",
        variant: "destructive",
      });
      setIsSubmitting(false);
    });
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold mb-2">
            Digital Business Card Platform
          </CardTitle>
          <CardDescription>
            Super Admin Access
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="admin@example.com"
                        type="email"
                        autoComplete="email"
                        {...field}
                      />
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
                      <Input
                        placeholder="••••••••"
                        type="password"
                        autoComplete="current-password"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button
                type="submit"
                className="w-full bg-primary hover:bg-primary-hover text-white"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : null}
                Sign In
              </Button>
              
              <div className="text-center text-sm text-muted-foreground pt-2">
                <p>Default credentials:</p>
                <p>Email: admin@example.com</p>
                <p>Password: password123</p>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}