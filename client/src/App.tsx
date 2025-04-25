import { Switch, Route } from "wouter";
import AuthPage from "@/pages/auth-page";
import DashboardPage from "@/pages/dashboard-page";
import NotFound from "@/pages/not-found";
import AdminLoginPage from "@/pages/admin-login-page";
import AdminDashboardPage from "@/pages/admin-dashboard-page";
import AdminEmployeesPage from "@/pages/admin-employees-page";
import AdminNewEmployeePage from "@/pages/admin-new-employee-page";
import AdminNewCardPage from "@/pages/admin-new-card-page";
import CardViewPage from "@/pages/card-view-page";
import { ProtectedRoute } from "./lib/protected-route";
import { Toaster } from "@/components/ui/toaster";

function App() {
  return (
    <>
      <Switch>
        {/* Super Admin Routes */}
        <ProtectedRoute path="/" component={DashboardPage} />
        <Route path="/auth" component={AuthPage} />
        
        {/* Admin Routes */}
        <Route path="/admin/login" component={AdminLoginPage} />
        <ProtectedRoute path="/admin/dashboard" component={AdminDashboardPage} />
        <ProtectedRoute path="/admin/employees" component={AdminEmployeesPage} />
        <ProtectedRoute path="/admin/employees/new" component={AdminNewEmployeePage} />
        <ProtectedRoute path="/admin/employees/:employeeId/cards/new" component={AdminNewCardPage} />
        
        {/* Public Card View */}
        <Route path="/card/:uniqueUrl" component={CardViewPage} />
        
        {/* 404 Page */}
        <Route component={NotFound} />
      </Switch>
      
      {/* UI Components */}
      <Toaster />
    </>
  );
}

export default App;
