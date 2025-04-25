import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";
import { Redirect, Route, useLocation } from "wouter";
import { useEffect, useState } from "react";

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
  // State to track if we've attempted to redirect
  const [redirectAttempted, setRedirectAttempted] = useState(false);
  const [location, setLocation] = useLocation();
  
  // Use the useAuth hook for authentication status
  const { user, isLoading } = useAuth();
  
  console.log("ProtectedRoute state:", { path, user, isLoading, adminOnly, superAdminOnly, location });
  
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
  
  // Handle redirection with force navigation when wouter doesn't work
  useEffect(() => {
    // Skip if still loading or if we can access the page
    if (isLoading || canAccess() || redirectAttempted) return;
    
    // Mark that we've attempted a redirect
    setRedirectAttempted(true);
    
    const redirectPath = getRedirectPath();
    console.log(`Forcing navigation to ${redirectPath} from ${location}`);
    
    // First try wouter's navigation
    setLocation(redirectPath);
    
    // As a fallback, use window.location after a short delay
    const timer = setTimeout(() => {
      if (window.location.pathname === location) {
        console.log("Wouter navigation failed, using window.location.href");
        window.location.href = redirectPath;
      }
    }, 100);
    
    return () => clearTimeout(timer);
  }, [isLoading, user, location, redirectAttempted]);
  
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
        // Handle redirection in the useEffect
        // This is a fallback if the useEffect redirect fails
        <Redirect to={getRedirectPath()} />
      )}
    </Route>
  );
}
