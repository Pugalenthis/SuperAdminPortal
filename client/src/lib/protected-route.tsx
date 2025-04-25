import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";
import { Redirect, Route } from "wouter";
import { useEffect, useState } from "react";
import { apiRequest } from "@/lib/queryClient";

export function ProtectedRoute({
  path,
  component: Component,
}: {
  path: string;
  component: () => React.JSX.Element;
}) {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  
  // Direct check for authentication status
  useEffect(() => {
    async function checkAuth() {
      try {
        console.log("ProtectedRoute: Directly checking auth status...");
        const response = await apiRequest("GET", "/api/user");
        
        if (response.ok) {
          console.log("ProtectedRoute: User is authenticated");
          setIsAuthenticated(true);
        } else {
          console.log("ProtectedRoute: User is not authenticated");
          setIsAuthenticated(false);
        }
      } catch (error) {
        console.error("ProtectedRoute: Auth check failed", error);
        setIsAuthenticated(false);
      }
    }
    
    checkAuth();
  }, []);

  return (
    <Route path={path}>
      {isAuthenticated === null ? (
        // Loading state
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : isAuthenticated ? (
        // Authenticated - show component
        <Component />
      ) : (
        // Not authenticated - redirect to login
        <Redirect to="/login" />
      )}
    </Route>
  );
}
