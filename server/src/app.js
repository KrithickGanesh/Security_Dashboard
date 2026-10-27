import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import mongoSanitize from 'express-mongo-sanitize';
import hpp from 'hpp';
import morgan from 'morgan';
import dotenv from 'dotenv';
import errorHandler from './middleware/error.js';
import authRoutes from './routes/auth.routes.js';
import projectRoutes from './routes/project.routes.js';
import vulnerabilityRoutes from './routes/vulnerability.routes.js';
import webhookRoutes from './routes/webhook.routes.js';
import scanUploadRoutes from './routes/scanUpload.routes.js';
import pipelineRoutes from './routes/pipeline.routes.js';
import complianceRoutes from './routes/compliance.routes.js';
import notificationRoutes from './routes/notification.routes.js';
import adminRoutes from './routes/admin.routes.js';
import incidentRoutes from './routes/incident.routes.js';
import reportRoutes from './routes/report.routes.js';
import dashboardRoutes from './routes/dashboard.routes.js';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import swaggerUi from 'swagger-ui-express';
import logger from './utils/logger.js';
import { isOriginAllowed } from './config/cors.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const swaggerDocument = JSON.parse(
  fs.readFileSync(path.join(__dirname, 'docs/swagger.json'), 'utf8')
);

dotenv.config();

const app = express();

// Behind nginx, Render, Railway or any load balancer, req.ip is the proxy
// address unless Express is told how many hops to trust. Without this, rate
// limiting and audit logs would attribute every client to the proxy.
app.set('trust proxy', Number(process.env.TRUST_PROXY ?? 1));

// Security HTTP headers
app.use(
  helmet({
    contentSecurityPolicy: false
  })
);

// CORS configuration
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (e.g. mobile apps, curl, postman)
      if (isOriginAllowed(origin)) {
        return callback(null, true);
      }
      return callback(new Error('Blocked by CORS policy'));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key', 'X-Signature']
  })
);

// Body parsing with raw body retention for HMAC verification
app.use(
  express.json({
    limit: '15mb',
    verify: (req, res, buf) => {
      req.rawBody = buf;
    }
  })
);
app.use(express.urlencoded({ extended: true, limit: '15mb' }));

// Sanitize inputs to prevent NoSQL query injection
app.use(mongoSanitize());

// Protect against HTTP Parameter Pollution
app.use(hpp());

// HTTP request logging
if (process.env.NODE_ENV !== 'test') {
  app.use(
    morgan('combined', {
      stream: {
        write: (message) => logger.info(message.trim())
      }
    })
  );
}

// Global API rate limiter
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => process.env.NODE_ENV === 'test',
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again after 15 minutes',
    data: null
  }
});
app.use('/api/', globalLimiter);

// Health check endpoint
app.get('/api/v1/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'DevSecOps Monitoring Dashboard API is operational',
    data: {
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development'
    }
  });
});

// Swagger API Documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// Mount Routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/projects', projectRoutes);
app.use('/api/v1/vulnerabilities', vulnerabilityRoutes);
app.use('/api/v1/webhooks', webhookRoutes);
app.use('/api/v1/scans', scanUploadRoutes);
app.use('/api/v1/pipelines', pipelineRoutes);
app.use('/api/v1', complianceRoutes);
app.use('/api/v1', notificationRoutes);
app.use('/api/v1', adminRoutes);
app.use('/api/v1/incidents', incidentRoutes);
app.use('/api/v1/reports', reportRoutes);
app.use('/api/v1/dashboard', dashboardRoutes);

// Catch-all 404 for undefined routes
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: `Endpoint not found: ${req.method} ${req.originalUrl}`,
    data: null
  });
});

// Centralized error handling middleware
app.use(errorHandler);

export default app;
