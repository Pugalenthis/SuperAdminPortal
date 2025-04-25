import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";
import { Redirect, Route } from "wouter";
import { useEffect } from "react";
import { queryClient } from "@/lib/queryClient";

export function ProtectedRoute({
  path,
  component: Component,
}: {
  path: string;
  component: () => React.JSX.Element;
}) {
  try {
    const { user, isLoading } = useAuth();
    
    // Force refetch user data when mounting the protected route
    useEffect(() => {
      console.log("ProtectedRoute mounted: forcing refresh of user data");
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
    }, []);

    // Debugging
    useEffect(() => {
      console.log("ProtectedRoute state:", { user, isLoading, path });
    }, [user, isLoading, path]);

    return (
      <Route path={path}>
        {isLoading ? (
          <div className="flex items-center justify-center min-h-screen">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : !user ? (
          <Redirect to="/login" />
        ) : (
          <Component />
        )}
      </Route>
    );
  } catch (error) {
    console.error("Error in ProtectedRoute:", error);
    return (
      <Route path={path}>
        <Redirect to="/login" />
      </Route>
    );
  }
}
