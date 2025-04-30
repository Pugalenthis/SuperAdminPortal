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
        setIsLoading(true);
        const response = await fetch('/api/user', {
          credentials: 'include'
        });
        
        if (response.ok) {
          const userData = await response.json();
          
          if (userData.userType === 'superadmin') {
            setLocation('/super/admins');
          } else {
            // Regular admin stays where they are
          }
          
          setUser(userData);
        } else {
          setUser(null);
        }
      } catch (err) {
        console.error('Error fetching user:', err);
        setUser(null);
      } finally {
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

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Login failed');
      }

      setUser(data);
      
      // Redirect based on user type
      if (data.userType === 'superadmin') {
        setLocation('/super/admins');
      } else {
        setLocation('/');
      }
      
      return data;
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
        try {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Logout failed');
        } catch (e) {
          throw new Error('Logout failed');
        }
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