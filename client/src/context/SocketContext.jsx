import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';
import notificationsApi from '../api/notifications.api';
import toast from 'react-hot-toast';

const SocketContext = createContext();

export const SocketProvider = ({ children }) => {
  const { user, accessToken } = useAuth();
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [liveAlerts, setLiveAlerts] = useState([]);
  const [notifications, setNotifications] = useState([]);

  // Fetch initial unread count and latest notifications
  const refreshNotifications = useCallback(async () => {
    if (!user) return;
    try {
      const res = await notificationsApi.getNotifications({ limit: 10 });
      if (res.success && res.data) {
        setNotifications(res.data.notifications || []);
        setUnreadCount(res.data.unreadCount || 0);
      }
    } catch {
      // non-fatal
    }
  }, [user]);

  // Fetch active alerts for live feed
  const refreshAlerts = useCallback(async () => {
    try {
      const res = await notificationsApi.getAlerts({ limit: 10 });
      if (res.success && res.data?.alerts) {
        setLiveAlerts(res.data.alerts);
      }
    } catch {
      // non-fatal
    }
  }, []);

  useEffect(() => {
    if (user) {
      refreshNotifications();
      refreshAlerts();
    }
  }, [user, refreshNotifications, refreshAlerts]);

  // Manage WebSocket connection
  useEffect(() => {
    if (!accessToken) {
      if (socket) {
        socket.disconnect();
        setSocket(null);
        setIsConnected(false);
      }
      return;
    }

    const socketInstance = io(
      import.meta.env.VITE_SOCKET_URL || import.meta.env.VITE_API_URL || '/',
      {
        auth: { token: accessToken },
        transports: ['websocket', 'polling'],
        reconnectionAttempts: 5,
        reconnectionDelay: 2000
      }
    );

    socketInstance.on('connect', () => {
      setIsConnected(true);
    });

    socketInstance.on('disconnect', () => {
      setIsConnected(false);
    });

    // Listen for direct user notifications
    socketInstance.on('notification', (notif) => {
      setNotifications((prev) => [notif, ...prev.slice(0, 19)]);
      setUnreadCount((prev) => prev + 1);

      // Trigger hot-toast
      if (notif.severity === 'Critical') {
        toast.error(`[CRITICAL] ${notif.title}: ${notif.message}`, { duration: 6000 });
      } else if (notif.severity === 'High') {
        toast(`⚠️ ${notif.title}: ${notif.message}`, { duration: 5000 });
      } else {
        toast.success(`ℹ️ ${notif.title}: ${notif.message}`, { duration: 4000 });
      }
    });

    // Listen for broadcast security alerts
    socketInstance.on('security_alert', (alert) => {
      setLiveAlerts((prev) => [alert, ...prev.slice(0, 19)]);
      toast.error(`🚨 Security Alert: ${alert.title}`, { duration: 6000 });
    });

    setSocket(socketInstance);

    return () => {
      socketInstance.disconnect();
    };
  }, [accessToken]);

  const markAllAsRead = async () => {
    try {
      await notificationsApi.markAllAsRead();
      setUnreadCount(0);
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    } catch {
      toast.error('Failed to mark all as read');
    }
  };

  return (
    <SocketContext.Provider
      value={{
        socket,
        isConnected,
        unreadCount,
        liveAlerts,
        notifications,
        setUnreadCount,
        markAllAsRead,
        refreshNotifications,
        refreshAlerts
      }}
    >
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};

export default SocketContext;
