import React, { createContext, useContext, useState, useEffect } from 'react';
import { useLocation } from 'wouter';

// Authentication context
const AuthContext = createContext({
  user: null,
  isLoading: true,
  error: null,
  login: () => {},
  logout: () => {},
  loginLoading: false,
  logoutLoading: false
});

// Authentication provider component
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [loginLoading, setLoginLoading] = useState(false);
  const [logoutLoading, setLogoutLoading] = useState(false);
  const [, setLocation] = useLocation();

  // Fetch current user on mount
  useEffect(() => {
    async function fetchUser() {
      try {
        console.log('AuthProvider state updated:', { isLoading: true });
        setIsLoading(true);
        const response = await fetch('/api/user', {
          credentials: 'include'
        });
        
        if (response.ok) {
          const userData = await response.json();
          console.log('User data fetched:', userData);
          
          if (userData.userType === 'superadmin') {
            console.log('User is a superadmin, redirecting to superadmin page');
            setLocation('/super/admins');
          } else {
            console.log('User is not a superadmin, redirecting to appropriate page');
            // Handle regular admin
          }
          
          setUser(userData);
        } else {
          setUser(null);
        }
      } catch (err) {
        console.error('Error fetching user:', err);
        setUser(null);
      } finally {
        console.log('AuthProvider state updated:', { user, isLoading: false });
        setIsLoading(false);
      }
    }
    
    fetchUser();
  }, [setLocation]);

  // Login function
  const login = async (credentials) => {
    try {
      setLoginLoading(true);
      setError(null);
      
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(credentials),
        credentials: 'include'
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Login failed');
      }

      const userData = await response.json();
      setUser(userData);
      
      // Redirect based on user type
      if (userData.userType === 'superadmin') {
        setLocation('/super/admins');
      } else {
        setLocation('/');
      }
      
      return userData;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoginLoading(false);
    }
  };

  // Logout function
  const logout = async () => {
    try {
      setLogoutLoading(true);
      
      const response = await fetch('/api/logout', {
        method: 'POST',
        credentials: 'include'
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Logout failed');
      }

      setUser(null);
      setLocation('/login');
    } catch (err) {
      setError(err.message);
    } finally {
      setLogoutLoading(false);
    }
  };

  // Context value
  const value = {
    user,
    isLoading,
    error,
    login,
    logout,
    loginLoading,
    logoutLoading
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

// Custom hook to use the auth context
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}