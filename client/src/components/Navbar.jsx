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
          <Link href="/">
            <a className="navbar-logo">Digital Card Hub</a>
          </Link>
        </div>
        
        <div className="navbar-menu">
          <Link href="/">
            <a className={location === '/' ? 'active' : ''}>Dashboard</a>
          </Link>
          
          <Link href="/employees">
            <a className={location === '/employees' ? 'active' : ''}>Employees</a>
          </Link>
          
          <Link href="/business-cards">
            <a className={location === '/business-cards' ? 'active' : ''}>Business Cards</a>
          </Link>
          
          <Link href="/templates">
            <a className={location === '/templates' ? 'active' : ''}>Templates</a>
          </Link>
          
          <Link href="/company-cards">
            <a className={location === '/company-cards' ? 'active' : ''}>Company Cards</a>
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