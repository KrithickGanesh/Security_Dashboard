import React from 'react';
import { Link } from 'react-router-dom';
import { FileQuestion, ArrowLeft } from 'lucide-react';

export const NotFound = () => {
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center text-center p-6">
      <div className="p-4 rounded-card bg-dark-surface border border-dark-border text-dark-muted mb-4">
        <FileQuestion className="w-12 h-12 text-accent-cyan" />
      </div>
      <h1 className="text-2xl font-bold font-mono tracking-tight text-dark-text">
        404 - Resource Not Found
      </h1>
      <p className="text-sm text-dark-muted max-w-md mt-2">
        The requested monitoring view or endpoint does not exist or has been relocated.
      </p>
      <div className="mt-6">
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

export default NotFound;
