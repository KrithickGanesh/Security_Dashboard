import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import authApi from '../api/auth.api';
import {
  setStoredAccessToken,
  getStoredAccessToken,
  hasSessionHint,
  clearSessionHint
} from '../api/axios';
import toast from 'react-hot-toast';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [accessToken, setAccessToken] = useState(() => getStoredAccessToken());
  const [isLoading, setIsLoading] = useState(true);

  // Initialize and verify authentication state on app load
  useEffect(() => {
    const initAuth = async () => {
      try {
        const storedToken = getStoredAccessToken();

        // Validate the stored token first. If it has expired the axios
        // interceptor silently refreshes and retries, so this costs nothing
        // in the common case and avoids a needless /auth/refresh round trip.
        if (storedToken) {
          try {
            const res = await authApi.getMe();
            if (res.success && res.data?.user) {
              setUser(res.data.user);
              return;
            }
          } catch {
            // Token was rejected and could not be refreshed; fall through.
          }
        }

        // No usable access token: try the httpOnly refresh cookie once.
        if (hasSessionHint()) {
          try {
            const refreshRes = await authApi.refresh();
            if (refreshRes.success && refreshRes.data) {
              setStoredAccessToken(refreshRes.data.accessToken);
              setAccessToken(refreshRes.data.accessToken);
              setUser(refreshRes.data.user);
              return;
            }
          } catch {
            // Cookie is gone/expired; drop the hint so we stop retrying.
            clearSessionHint();
          }
        }
      } catch (err) {
        setStoredAccessToken(null);
        setAccessToken(null);
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();
  }, []);

  const login = async (credentials) => {
    try {
      const response = await authApi.login(credentials);
      if (response.success && response.data) {
        const { user: loggedInUser, accessToken: token } = response.data;
        setUser(loggedInUser);
        setAccessToken(token);
        setStoredAccessToken(token);
        toast.success(`Welcome back, ${loggedInUser.name}`);
        return { success: true };
      }
      return { success: false, message: response.message };
    } catch (error) {
      const message =
        error.response?.data?.message || error.message || 'Login failed';
      return {
        success: false,
        message,
        statusCode: error.response?.status,
        lockUntil: error.response?.data?.lockUntil
      };
    }
  };

  const register = async (userData) => {
    try {
      const response = await authApi.register(userData);
      if (response.success && response.data) {
        const { user: newUser, accessToken: token } = response.data;
        setUser(newUser);
        setAccessToken(token);
        setStoredAccessToken(token);
        toast.success('Registration successful!');
        return { success: true };
      }
      return { success: false, message: response.message };
    } catch (error) {
      const message =
        error.response?.data?.message ||
        error.response?.data?.errors?.[0]?.message ||
        'Registration failed';
      return { success: false, message };
    }
  };

  const logout = async () => {
    try {
      await authApi.logout();
    } catch (err) {
      // Ignore network errors on logout
    } finally {
      setUser(null);
      setAccessToken(null);
      setStoredAccessToken(null);
      toast.success('Logged out successfully');
    }
  };

  const logoutAll = async () => {
    try {
      await authApi.logoutAll();
    } catch (err) {
      // Ignore
    } finally {
      setUser(null);
      setAccessToken(null);
      setStoredAccessToken(null);
      toast.success('Logged out from all active sessions');
    }
  };

  const updateUserProfile = (updatedUser) => {
    setUser((prev) => ({ ...prev, ...updatedUser }));
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        role: user?.role,
        accessToken,
        isLoading,
        isAuthenticated: !!user,
        login,
        register,
        logout,
        logoutAll,
        updateUserProfile
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;
