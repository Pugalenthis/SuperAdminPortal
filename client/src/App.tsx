import { Switch, Route } from "wouter";
import LoginPage from "@/pages/login-page";
import DashboardPage from "@/pages/dashboard-page";
import NotFound from "@/pages/not-found";
import { ProtectedRoute } from "./lib/protected-route";

function App() {
  return (
    <Switch>
      <ProtectedRoute path="/" component={DashboardPage} />
      <Route path="/login" component={LoginPage} />
      <Route path="*" component={NotFound} />
    </Switch>
  );
}

export default App;
