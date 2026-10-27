import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Shield } from 'lucide-react';

export const ProtectedRoute = () => {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-dark-bg flex flex-col items-center justify-center p-4">
        <div className="relative flex items-center justify-center mb-4">
          <Shield className="w-12 h-12 text-accent-cyan animate-pulse" />
          <div className="absolute inset-0 rounded-full border-2 border-accent-cyan/20 animate-ping" />
        </div>
        <p className="text-dark-muted font-mono text-sm">Verifying security credentials...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <Outlet />;
};

export default ProtectedRoute;
