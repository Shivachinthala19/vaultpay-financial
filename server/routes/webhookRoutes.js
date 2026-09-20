import express from 'express';
import { handleStripeWebhook } from '../controllers/webhookController.js';

const router = express.Router();

/**
 * Public Stripe Webhook Endpoint
 * Uses express.raw() to preserve raw byte payload needed for cryptographic HMAC signature verification
 */
router.post(
  '/stripe',
  express.raw({ type: 'application/json' }),
  (req, res, next) => {
    // If body is a buffer, preserve rawBody reference
    if (Buffer.isBuffer(req.body)) {
      req.rawBody = req.body;
    }
    next();
  },
  handleStripeWebhook
);

export default router;
