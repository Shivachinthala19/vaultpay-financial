import express from 'express';
import { createCheckoutSession, simulateMockPayment } from '../controllers/paymentController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';

const router = express.Router();

// Payment operations require authenticated JWT user
router.use(authMiddleware);

// Server-to-server Stripe checkout session initiator (verifies ownership & pricing server-side)
router.post('/create-checkout-session', createCheckoutSession);

// Development / test simulation endpoint
router.post('/simulate-mock-payment', simulateMockPayment);

export default router;
