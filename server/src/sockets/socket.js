import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import logger from '../utils/logger.js';

let io = null;

export const initSocket = (httpServer) => {
  const allowedOrigins = [
    process.env.CLIENT_URL || 'http://localhost:5173',
    'http://127.0.0.1:5173'
  ];

  io = new Server(httpServer, {
    cors: {
      origin: allowedOrigins,
      credentials: true
    }
  });

  // Socket.io JWT Authentication Middleware
  io.use(async (socket, next) => {
    try {
      const token =
        socket.handshake.auth?.token ||
        socket.handshake.headers?.authorization?.replace('Bearer ', '');

      if (!token) {
        // Allow anonymous guest connection to public feeds if needed, but mark as unauthenticated
        socket.user = null;
        return next();
      }

      const decoded = jwt.verify(
        token,
        process.env.JWT_SECRET || 'devsecops_jwt_secret_fallback'
      );

      const user = await User.findById(decoded.id);
      if (!user || !user.isActive) {
        socket.user = null;
        return next();
      }

      socket.user = user;
      next();
    } catch (err) {
      logger.warn(`Socket auth warning: ${err.message}`);
      socket.user = null;
      next();
    }
  });

  io.on('connection', (socket) => {
    if (socket.user) {
      const userRoom = `user_${socket.user._id}`;
      const roleRoom = `role_${socket.user.role}`;
      socket.join(userRoom);
      socket.join(roleRoom);
      socket.join('security_feed');

      logger.info(
        `WebSocket connected: ${socket.user.name} (${socket.user.role}) [ID: ${socket.id}]`
      );
    } else {
      socket.join('security_feed');
      logger.info(`WebSocket connected: Guest [ID: ${socket.id}]`);
    }

    socket.on('disconnect', () => {
      logger.debug(`WebSocket disconnected: ${socket.id}`);
    });
  });

  return io;
};

export const getIO = () => {
  return io;
};

/**
 * Emit event directly to a specific user's private room.
 */
export const emitToUser = (userId, event, payload) => {
  if (io && userId) {
    io.to(`user_${userId.toString()}`).emit(event, payload);
  }
};

/**
 * Emit event to all users holding a specific role.
 */
export const emitToRole = (role, event, payload) => {
  if (io && role) {
    io.to(`role_${role}`).emit(event, payload);
  }
};

/**
 * Broadcast real-time security alert to all connected sockets.
 */
export const broadcastSecurityAlert = (alert) => {
  if (io) {
    io.emit('security_alert', alert);
  }
};

/**
 * General broadcast event.
 */
export const broadcastEvent = (event, data) => {
  if (io) {
    io.emit(event, data);
  }
};

export default {
  initSocket,
  getIO,
  emitToUser,
  emitToRole,
  broadcastSecurityAlert,
  broadcastEvent
};
