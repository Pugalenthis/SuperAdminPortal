import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";
import { Redirect, Route } from "wouter";

export function ProtectedRoute({
  path,
  component: Component,
}: {
  path: string;
  component: () => React.JSX.Element;
}) {
  // Use the useAuth hook for authentication status
  const { user, isLoading } = useAuth();
  
  console.log("ProtectedRoute state:", { path, user, isLoading });
  
  return (
    <Route path={path}>
      {isLoading ? (
        // Loading state
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : user ? (
        // Authenticated - show component
        <Component />
      ) : (
        // Not authenticated - redirect to auth page
        <Redirect to="/auth" />
      )}
    </Route>
  );
}
