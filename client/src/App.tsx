import { Switch, Route } from "wouter";
import AuthPage from "@/pages/auth-page";
import DashboardPage from "@/pages/dashboard-page";
import NotFound from "@/pages/not-found";
import AdminLoginPage from "@/pages/admin-login-page";
import AdminDashboardPage from "@/pages/admin-dashboard-page";
import AdminEmployeesPage from "@/pages/admin-employees-page";
import AdminNewEmployeePage from "@/pages/admin-new-employee-page";
import AdminEmployeeDetailPage from "@/pages/admin-employee-detail-page";
import AdminEmployeeEditPage from "@/pages/admin-employee-edit-page";
import AdminNewCardPage from "@/pages/admin-new-card-page";
import AdminCardsPage from "@/pages/admin-cards-page";
import AdminCardEditPage from "@/pages/admin-card-edit-page";
import AdminTemplatesPage from "@/pages/admin-templates-page";
import AdminTemplateCustomizePage from "@/pages/admin-template-customize-page";
import CardViewPage from "@/pages/card-view-page";
import { ProtectedRoute } from "./lib/protected-route";
import { Toaster } from "@/components/ui/toaster";

function App() {
  return (
    <>
      <Switch>
        {/* Super Admin Routes - Only accessible by superadmins */}
        <Route path="/" component={DashboardPage} />
        <Route path="/auth" component={AuthPage} />
        
        {/* Admin Routes - Only accessible by admins */}
        <Route path="/admin/login" component={AdminLoginPage} />
        <Route path="/admin/dashboard" component={AdminDashboardPage} />
        <Route path="/admin/employees" component={AdminEmployeesPage} />
        <Route path="/admin/employees/new" component={AdminNewEmployeePage} />
        <Route path="/admin/employees/:employeeId" component={AdminEmployeeDetailPage} />
        <Route path="/admin/employees/:employeeId/edit" component={AdminEmployeeEditPage} />
        <Route path="/admin/employees/:employeeId/cards/new" component={AdminNewCardPage} />
        <Route path="/admin/cards" component={AdminCardsPage} />
        <Route path="/admin/cards/:cardId/edit" component={AdminCardEditPage} />
        <Route path="/admin/templates" component={AdminTemplatesPage} />
        <Route path="/admin/template/:id" component={AdminTemplateCustomizePage} />
        
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
