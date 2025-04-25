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
    
    if (superAdminOnly && user.userType !== 'superadmin') {
      return "/"; // Redirect admins to their dashboard
    }
    
    if (adminOnly && user.userType !== 'admin') {
      return "/"; // Redirect superadmins to their dashboard
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
