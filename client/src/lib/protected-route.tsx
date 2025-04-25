import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";
import { Redirect, Route } from "wouter";

export function ProtectedRoute({
  path,
  component: Component,
  adminOnly = false,
  superAdminOnly = false,
}: {
  path: string;
  component: () => React.JSX.Element;
  adminOnly?: boolean;
  superAdminOnly?: boolean;
}) {
  // Use the useAuth hook for authentication status
  const { user, isLoading } = useAuth();
  
  console.log("ProtectedRoute state:", { path, user, isLoading, adminOnly, superAdminOnly });
  
  // Custom access control logic
  const canAccess = () => {
    if (!user) return false;
    
    if (superAdminOnly && user.userType !== 'superadmin') {
      console.log("Access denied: requires superadmin");
      return false;
    }
    
    if (adminOnly && user.userType !== 'admin') {
      console.log("Access denied: requires admin");
      return false;
    }
    
    return true;
  };
  
  // Determine redirect path based on user type
  const getRedirectPath = () => {
    if (!user) return "/auth";
    
    // If user is an admin trying to access superadmin route
    if (superAdminOnly && user.userType === 'admin') {
      return "/admin/dashboard"; // Redirect to admin dashboard
    }
    
    // If user is a superadmin trying to access admin route
    if (adminOnly && user.userType === 'superadmin') {
      return "/"; // Redirect to superadmin dashboard
    }
    
    return "/auth"; // Default fallback
  };
  
  return (
    <Route path={path}>
      {isLoading ? (
        // Loading state
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : canAccess() ? (
        // Authenticated and authorized - show component
        <Component />
      ) : (
        // Not authenticated or not authorized - redirect
        <Redirect to={getRedirectPath()} />
      )}
    </Route>
  );
}
