import React from 'react';
import { Link } from 'wouter';
import { useAuth } from '../hooks/use-auth';

function NotFound() {
  const { user } = useAuth();

  return (
    <div className="not-found-page">
      <div className="not-found-container">
        <h1>404</h1>
        <h2>Page Not Found</h2>
        <p>The page you are looking for doesn't exist or has been moved.</p>
        
        {user ? (
          <Link href="/" className="button">
            Go to Dashboard
          </Link>
        ) : (
          <Link href="/login" className="button">
            Go to Login
          </Link>
        )}
      </div>
    </div>
  );
}

export default NotFound;