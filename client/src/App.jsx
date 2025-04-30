import React from 'react';
import { Route, Switch } from 'wouter';
import { useAuth } from './hooks/use-auth.jsx';

// Pages
import Login from './pages/Login.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Employees from './pages/Employees.jsx';
import EmployeeForm from './pages/EmployeeForm.jsx';
import BusinessCards from './pages/BusinessCards.jsx';
import CardTemplates from './pages/CardTemplates.jsx';
import CompanyCards from './pages/CompanyCards.jsx';
import CardView from './pages/CardView.jsx';
import NotFound from './pages/NotFound.jsx';

// Components
import Navbar from './components/Navbar.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import Loading from './components/Loading.jsx';

function App() {
  // Temporary approach - bypassing auth check for development
  const mockUser = {
    id: 1,
    email: 'admin1@example.com',
    orgName: 'Test Company',
    userType: 'admin'
  };
  
  return (
    <div className="app">
      <Navbar />
      <main className="container">
        <Switch>
          <Route path="/login" component={Login} />
          <Route path="/card/:uniqueUrl" component={CardView} />
          <Route path="/" component={Dashboard} />
          <Route path="/employees" component={Employees} />
          <Route path="/employees/new" component={EmployeeForm} />
          <Route path="/employees/:id/edit" component={EmployeeForm} />
          <Route path="/business-cards" component={BusinessCards} />
          <Route path="/templates" component={CardTemplates} />
          <Route path="/company-cards" component={CompanyCards} />
          <Route component={NotFound} />
        </Switch>
      </main>
    </div>
  );
}

export default App;