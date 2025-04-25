import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";
import { Redirect, Route } from "wouter";
import { useEffect, useState } from "react";
import { queryClient } from "@/lib/queryClient";

export function ProtectedRoute({
  path,
  component: Component,
}: {
  path: string;
  component: () => React.JSX.Element;
}) {
  const [redirectTo, setRedirectTo] = useState<string | null>(null);
  
  try {
    const { user, isLoading } = useAuth();
    
    // Force refetch user data when mounting the protected route
    useEffect(() => {
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
    }, []);

    // Debugging
    useEffect(() => {
      console.log("ProtectedRoute state:", { user, isLoading, redirectTo });
    }, [user, isLoading, redirectTo]);

    if (isLoading) {
      return (
        <Route path={path}>
          <div className="flex items-center justify-center min-h-screen">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        </Route>
      );
    }

    if (!user) {
      return (
        <Route path={path}>
          <Redirect to="/login" />
        </Route>
      );
    }

    return <Route path={path} component={Component} />;
  } catch (error) {
    console.error("Error in ProtectedRoute:", error);
    return (
      <Route path={path}>
        <Redirect to="/login" />
      </Route>
    );
  }
}
