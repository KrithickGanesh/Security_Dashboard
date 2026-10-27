import http from 'http';
import app from './app.js';
import connectDB from './config/db.js';
import { initSocket } from './sockets/socket.js';
import { startSlaCronJob } from './jobs/slaCron.js';
import logger from './utils/logger.js';

const PORT = process.env.PORT || 5000;
const server = http.createServer(app);

// Initialize Socket.io on the HTTP server
initSocket(server);

const startServer = async () => {
  try {
    await connectDB();

    // Start background cron jobs in development/production
    if (process.env.NODE_ENV !== 'test') {
      startSlaCronJob();
    }

    server.listen(PORT, () => {
      logger.info(
        `DevSecOps API Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`
      );
    });
  } catch (error) {
    logger.error(`Failed to start server: ${error.message}`);
    process.exit(1);
  }
};

startServer();

// Handle unexpected process errors
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  server.close(() => process.exit(1));
});

process.on('uncaughtException', (error) => {
  logger.error(`Uncaught Exception: ${error.message}`, { stack: error.stack });
  process.exit(1);
});

export { server };
