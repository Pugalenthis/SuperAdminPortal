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
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <Loading />;
  }

  return (
    <div className="app">
      {user && <Navbar />}
      <main className="container">
        <Switch>
          <Route path="/login" component={Login} />
          <Route path="/card/:uniqueUrl" component={CardView} />
          
          <ProtectedRoute path="/" component={Dashboard} />
          <ProtectedRoute path="/employees" component={Employees} />
          <ProtectedRoute path="/employees/new" component={EmployeeForm} />
          <ProtectedRoute path="/employees/:id/edit" component={EmployeeForm} />
          <ProtectedRoute path="/business-cards" component={BusinessCards} />
          <ProtectedRoute path="/templates" component={CardTemplates} />
          <ProtectedRoute path="/company-cards" component={CompanyCards} />
          
          <Route component={NotFound} />
        </Switch>
      </main>
    </div>
  );
}

export default App;