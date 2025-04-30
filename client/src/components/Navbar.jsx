import React from 'react';
import { Link, useLocation } from 'wouter';
import { useAuth } from '../hooks/use-auth';

function Navbar() {
  const { user, logout } = useAuth();
  const [location] = useLocation();

  return (
    <nav className="navbar">
      <div className="container navbar-container">
        <div className="navbar-brand">
          <Link href="/" className="navbar-logo">
            Digital Card Hub
          </Link>
        </div>
        
        <div className="navbar-menu">
          <Link href="/" className={location === '/' ? 'active' : ''}>
            Dashboard
          </Link>
          
          <Link href="/employees" className={location === '/employees' ? 'active' : ''}>
            Employees
          </Link>
          
          <Link href="/business-cards" className={location === '/business-cards' ? 'active' : ''}>
            Business Cards
          </Link>
          
          <Link href="/templates" className={location === '/templates' ? 'active' : ''}>
            Templates
          </Link>
          
          <Link href="/company-cards" className={location === '/company-cards' ? 'active' : ''}>
            Company Cards
          </Link>
        </div>
        
        <div className="navbar-end">
          {user && (
            <div className="navbar-user">
              <span>{user.email}</span>
              <button onClick={logout} className="logout-button">
                Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}

export default Navbar;