import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from './AuthContext';

const ProtectedRoute = ({ children }) => {
  const { isAuthorized } = useAuth();

  if (!isAuthorized) {
    return <Navigate to="/login" />;
  }

  return children;
};

export default ProtectedRoute;
