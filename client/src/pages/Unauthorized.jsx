import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldX, ArrowLeft } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const Unauthorized = () => {
  const { user } = useAuth();

  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center text-center p-6">
      <div className="p-4 rounded-card bg-severity-critical/15 border border-severity-critical/30 text-severity-critical mb-4">
        <ShieldX className="w-12 h-12" />
      </div>
      <h1 className="text-2xl font-bold font-mono tracking-tight text-dark-text">
        403 - Access Denied
      </h1>
      <p className="text-sm text-dark-muted max-w-md mt-2">
        Your current role (<strong>{user?.role || 'Guest'}</strong>) does not have sufficient
        privileges to view or modify this resource.
      </p>
      <div className="mt-6 flex items-center gap-3">
        <Link
          to="/dashboard"
          className="px-4 py-2 rounded-control bg-accent-cyan text-dark-bg text-xs font-semibold flex items-center gap-2 hover:bg-accent-cyan/90 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Return to Dashboard</span>
        </Link>
      </div>
    </div>
  );
};

export default Unauthorized;
