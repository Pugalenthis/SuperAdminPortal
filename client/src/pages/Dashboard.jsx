import React from 'react';
import { Link } from 'wouter';
import { useAuth } from '../hooks/use-auth';

function Dashboard() {
  const { user } = useAuth();

  return (
    <div className="dashboard-page">
      <h1 className="page-title">Dashboard</h1>
      
      <div className="welcome-message">
        <h2>Welcome back, {user?.orgName}</h2>
        <p>Manage your digital business cards and employees from this dashboard.</p>
      </div>
      
      <div className="dashboard-cards">
        <div className="card dashboard-card">
          <h3>Employees</h3>
          <p>Manage your employees and their information</p>
          <Link href="/employees" className="card-link">
            View Employees
          </Link>
        </div>
        
        <div className="card dashboard-card">
          <h3>Business Cards</h3>
          <p>Create and manage digital business cards</p>
          <Link href="/business-cards" className="card-link">
            View Business Cards
          </Link>
        </div>
        
        <div className="card dashboard-card">
          <h3>Card Templates</h3>
          <p>Explore and customize card templates</p>
          <Link href="/templates" className="card-link">
            View Templates
          </Link>
        </div>
        
        <div className="card dashboard-card">
          <h3>Company Cards</h3>
          <p>Manage your company card settings</p>
          <Link href="/company-cards" className="card-link">
            View Company Cards
          </Link>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;