import { Switch, Route } from "wouter";
import LoginPage from "@/pages/login-page";
import DashboardPage from "@/pages/dashboard-page";
import NotFound from "@/pages/not-found";
import { ProtectedRoute } from "./lib/protected-route";
import { useEffect } from "react";
import { useAuth } from "./hooks/use-auth";
import { useLocation } from "wouter";

function App() {
  const { user, isLoading } = useAuth();
  const [location, setLocation] = useLocation();
  
  // Debug routing
  useEffect(() => {
    console.log("App.tsx - Current route:", location);
    console.log("App.tsx - Auth state:", { user, isLoading });
    
    // Auto-redirect based on auth state when at root
    if (!isLoading && location === "/") {
      if (!user) {
        console.log("App.tsx - Auto-redirect to /login");
        setLocation("/login");
      }
    }
  }, [location, user, isLoading, setLocation]);

  return (
    <Switch>
      <ProtectedRoute path="/" component={DashboardPage} />
      <Route path="/login" component={LoginPage} />
      <Route path="*" component={NotFound} />
    </Switch>
  );
}

export default App;
