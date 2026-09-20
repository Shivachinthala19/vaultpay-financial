import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

import { connectDB } from './config/db.js';
import { logger } from './utils/logger.js';
import { errorHandler, notFoundHandler } from './middleware/errorMiddleware.js';

// Route Imports
import authRoutes from './routes/authRoutes.js';
import invoiceRoutes from './routes/invoiceRoutes.js';
import paymentRoutes from './routes/paymentRoutes.js';
import webhookRoutes from './routes/webhookRoutes.js';
import adminRoutes from './routes/adminRoutes.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

// --- SECURITY MIDDLEWARE ---
// 1. Helmet HTTP Security Headers
app.use(helmet());

// 2. CORS configuration
app.use(
  cors({
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'stripe-signature']
  })
);

// 3. Rate Limiting to prevent brute force & DoS
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200, // max 200 requests per window
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again after 15 minutes'
  }
});
app.use('/api/', limiter);

// --- CRITICAL: STRIPE WEBHOOK ROUTE (Must receive raw body) ---
app.use('/api/webhooks', webhookRoutes);

// --- BODY PARSERS FOR STANDARD API ROUTES ---
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    status: 'OPERATIONAL',
    service: 'Nexus Corporate Billing API',
    timestamp: new Date().toISOString()
  });
});

// --- API ROUTES ---
app.use('/api/auth', authRoutes);
app.use('/api/invoices', invoiceRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/admin', adminRoutes);

// Centralized Error Handling
app.use(notFoundHandler);
app.use(errorHandler);

// Start server function with robust error catching
const startServer = async () => {
  if (process.env.NODE_ENV === 'test') {
    return;
  }

  try {
    await connectDB();

    const serverInstance = app.listen(PORT, () => {
      logger.info(`Nexus Corporate Billing Server running on port ${PORT}`);
      logger.info(`Stripe Webhook Listener active at http://localhost:${PORT}/api/webhooks/stripe`);
    });

    serverInstance.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        logger.error(`Port ${PORT} is already in use. Please terminate any hanging node processes.`, { port: PORT });
      } else {
        logger.error('Server encountered an error', { error: err.message });
      }
    });
  } catch (err) {
    logger.error('Failed to start database or server', { error: err.message });
  }
};

startServer();

export default app;
