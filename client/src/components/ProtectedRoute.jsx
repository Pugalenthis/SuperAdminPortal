import React from 'react';
import { Route, Redirect } from 'wouter';
import { useAuth } from '../hooks/use-auth';
import Loading from './Loading';

function ProtectedRoute({ component: Component, ...rest }) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <Loading />;
  }

  return (
    <Route
      {...rest}
      component={(props) =>
        user ? (
          <Component {...props} />
        ) : (
          <Redirect to="/login" />
        )
      }
    />
  );
}

export default ProtectedRoute;