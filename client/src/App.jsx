import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';

import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import ProtectedRoute from './routes/ProtectedRoute';
import RoleRoute from './routes/RoleRoute';
import AppLayout from './components/layout/AppLayout';

// Auth Pages
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import ForgotPassword from './pages/auth/ForgotPassword';
import ResetPassword from './pages/auth/ResetPassword';

// Main Application Pages
import Dashboard from './pages/Dashboard';
import Projects from './pages/Projects';
import Vulnerabilities from './pages/Vulnerabilities';
import Pipelines from './pages/Pipelines';
import ScanImport from './pages/ScanImport';
import Compliance from './pages/Compliance';
import Incidents from './pages/Incidents';
import Reports from './pages/Reports';
import Notifications from './pages/Notifications';
import Profile from './pages/Profile';

// Admin Pages
import AdminUsers from './pages/admin/AdminUsers';
import AuditLogs from './pages/admin/AuditLogs';
import ApiKeys from './pages/admin/ApiKeys';
import Settings from './pages/admin/Settings';

// Fallback Pages
import Unauthorized from './pages/Unauthorized';
import NotFound from './pages/NotFound';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 30000
    }
  }
});

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <SocketProvider>
            <BrowserRouter>
            <Toaster
              position="top-right"
              toastOptions={{
                className: 'font-sans text-xs',
                style: {
                  background: '#111A2E',
                  color: '#E6EDF7',
                  border: '1px solid #1F2A44',
                  borderRadius: '8px'
                },
                success: {
                  iconTheme: {
                    primary: '#22C55E',
                    secondary: '#0B1220'
                  }
                },
                error: {
                  iconTheme: {
                    primary: '#EF4444',
                    secondary: '#0B1220'
                  }
                }
              }}
            />

            <Routes>
              {/* Public Authentication Routes */}
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password/:token" element={<ResetPassword />} />

              {/* Protected Shell Routes */}
              <Route element={<ProtectedRoute />}>
                <Route element={<AppLayout />}>
                  <Route path="/" element={<Navigate to="/dashboard" replace />} />
                  <Route path="/dashboard" element={<Dashboard />} />
                  <Route path="/projects" element={<Projects />} />
                  <Route path="/vulnerabilities" element={<Vulnerabilities />} />
                  <Route path="/pipelines" element={<Pipelines />} />
                  <Route path="/compliance" element={<Compliance />} />
                  <Route path="/incidents" element={<Incidents />} />
                  <Route path="/reports" element={<Reports />} />
                  <Route path="/notifications" element={<Notifications />} />
                  <Route path="/profile" element={<Profile />} />

                  {/* Scan Import: Restricted to Analyst and Admin */}
                  <Route element={<RoleRoute allowedRoles={['Admin', 'Security Analyst']} />}>
                    <Route path="/scans/import" element={<ScanImport />} />
                  </Route>

                  {/* Admin Suite: Users, API Keys, Settings (Admin Only) */}
                  <Route element={<RoleRoute allowedRoles={['Admin']} />}>
                    <Route path="/admin/users" element={<AdminUsers />} />
                    <Route path="/admin/api-keys" element={<ApiKeys />} />
                    <Route path="/admin/settings" element={<Settings />} />
                  </Route>

                  {/* Audit Logs: Accessible to Admin and Auditor */}
                  <Route element={<RoleRoute allowedRoles={['Admin', 'Auditor']} />}>
                    <Route path="/admin/audit-logs" element={<AuditLogs />} />
                  </Route>
                </Route>
              </Route>

              {/* Standalone Error Routes */}
              <Route path="/unauthorized" element={<Unauthorized />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
          </SocketProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
