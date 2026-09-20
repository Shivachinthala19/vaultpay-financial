import { stripe } from '../config/stripe.js';
import { Invoice } from '../models/Invoice.js';
import { Payment } from '../models/Payment.js';
import { User } from '../models/User.js';
import { generatePdfReceipt } from '../services/pdfService.js';
import { sendPaymentReceiptEmail } from '../services/emailService.js';
import { logger } from '../utils/logger.js';

/**
 * Stripe Server-to-Server Webhook Handler
 * Verifies cryptographic signature and processes confirmed payments with idempotency
 */
export const handleStripeWebhook = async (req, res) => {
  const signature = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event;

  try {
    if (!signature || !webhookSecret) {
      logger.security('Stripe Webhook rejected: Missing signature or webhook secret', {
        hasSignature: !!signature,
        hasSecret: !!webhookSecret
      });
      return res.status(400).json({
        success: false,
        message: 'Webhook signature verification failed: Missing signature or secret'
      });
    }

    // Cryptographic signature verification using raw request body
    event = stripe.webhooks.constructEvent(req.rawBody || req.body, signature, webhookSecret);
    logger.info('Stripe Webhook signature verified successfully', {
      eventId: event.id,
      eventType: event.type
    });
  } catch (err) {
    logger.security('Stripe Webhook signature verification FAILED', {
      error: err.message,
      ip: req.ip
    });
    return res.status(400).json({
      success: false,
      message: `Webhook Signature Verification Error: ${err.message}`
    });
  }

  // --- WEBHOOK IDEMPOTENCY CHECK ---
  // Stripe events might be retried multiple times. Prevent duplicate side-effects.
  try {
    const existingPayment = await Payment.findOne({ stripeEventId: event.id });
    if (existingPayment) {
      logger.info('Webhook idempotency: Event already processed, returning 200', {
        eventId: event.id,
        invoiceId: existingPayment.invoiceId.toString()
      });
      return res.status(200).json({
        received: true,
        idempotencyStatus: 'duplicate_ignored'
      });
    }

    // --- PROCESS EVENTS ---
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        const invoiceId = session.metadata?.invoiceId || session.client_reference_id;
        const paymentIntentId = session.payment_intent;

        if (!invoiceId) {
          logger.warn('Stripe checkout session missing invoiceId metadata', { sessionId: session.id });
          break;
        }

        const invoice = await Invoice.findById(invoiceId);
        if (!invoice) {
          logger.error('Invoice referenced in Stripe webhook not found in database', { invoiceId });
          break;
        }

        // Transition invoice status to Paid
        invoice.status = 'Paid';
        invoice.paidAt = new Date();
        invoice.stripePaymentIntentId = typeof paymentIntentId === 'string' ? paymentIntentId : (session.id || 'STRIPE_PAID');
        await invoice.save();

        logger.info('Invoice payment confirmed via Stripe Webhook', {
          invoiceId: invoice._id.toString(),
          invoiceNumber: invoice.invoiceNumber,
          total: invoice.total
        });

        // Record Payment with unique stripeEventId to ensure idempotency
        await Payment.create({
          invoiceId: invoice._id,
          clientId: invoice.clientId,
          stripePaymentIntentId: invoice.stripePaymentIntentId,
          amount: invoice.total,
          currency: invoice.currency,
          status: 'succeeded',
          stripeEventId: event.id
        });

        // Find registered client user to guarantee email arrives to true owner
        const client = await User.findById(invoice.clientId);

        // Automated PDF receipt generation
        let generatedReceipt = null;
        try {
          generatedReceipt = await generatePdfReceipt(invoice, client, invoice.stripePaymentIntentId);
          invoice.pdfUrl = generatedReceipt.filePath;
          await invoice.save();
          logger.info('PDF Receipt generated & linked after webhook confirmation', {
            invoiceNumber: invoice.invoiceNumber,
            pdfUrl: invoice.pdfUrl
          });
        } catch (pdfErr) {
          logger.error('Failed to generate PDF receipt during webhook execution', { error: pdfErr.message });
        }

        // Automated Email Delivery
        if (client && client.email) {
          try {
            await sendPaymentReceiptEmail({
              to: client.email,
              clientName: client.name,
              invoice,
              pdfPath: generatedReceipt?.filePath,
              pdfBuffer: generatedReceipt?.buffer
            });
          } catch (emailErr) {
            logger.error('Failed to dispatch receipt email during webhook execution', { error: emailErr.message });
          }
        }

        break;
      }

      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object;
        logger.info('Stripe payment_intent.succeeded received', {
          paymentIntentId: paymentIntent.id,
          amount: paymentIntent.amount
        });
        break;
      }

      case 'payment_intent.payment_failed': {
        const failedIntent = event.data.object;
        logger.warn('Stripe payment_intent.payment_failed received', {
          paymentIntentId: failedIntent.id,
          lastError: failedIntent.last_payment_error?.message
        });
        break;
      }

      default:
        logger.info(`Unhandled Stripe event type: ${event.type}`);
    }

    return res.status(200).json({ received: true });
  } catch (error) {
    logger.error('Error processing Stripe webhook event body', {
      eventId: event?.id,
      error: error.message
    });
    return res.status(500).json({
      success: false,
      message: 'Internal server error processing webhook'
    });
  }
};
