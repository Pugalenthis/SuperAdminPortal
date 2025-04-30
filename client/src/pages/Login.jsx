import React, { useState } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '../hooks/use-auth';

function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [formError, setFormError] = useState('');
  const { login, loginLoading, error } = useAuth();
  const [, setLocation] = useLocation();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    
    if (!email) {
      setFormError('Email is required');
      return;
    }
    
    if (!password) {
      setFormError('Password is required');
      return;
    }
    
    try {
      await login({ email, password });
      // Redirect will be handled in the login function
    } catch (error) {
      // Error is already handled by the useAuth hook
      console.error('Login error:', error);
    }
  };

  return (
    <div className="login-page">
      <div className="login-container">
        <div className="card login-card">
          <h2 className="login-title">Login to your account</h2>
          
          <form onSubmit={handleSubmit} className="login-form">
            {(formError || error) && (
              <div className="error-message">
                {formError || error}
              </div>
            )}
            
            <div className="form-group">
              <label htmlFor="email">Email</label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="password">Password</label>
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
              />
            </div>
            
            <button
              type="submit"
              className="login-button"
              disabled={loginLoading}
            >
              {loginLoading ? 'Logging in...' : 'Login'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default Login;