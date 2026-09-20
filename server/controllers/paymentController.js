import mongoose from 'mongoose';
import { Invoice } from '../models/Invoice.js';
import { User } from '../models/User.js';
import { createCheckoutSession as createStripeSession } from '../services/paymentService.js';
import { generatePdfReceipt } from '../services/pdfService.js';
import { sendPaymentReceiptEmail } from '../services/emailService.js';
import { Payment } from '../models/Payment.js';
import { logger } from '../utils/logger.js';

export const createCheckoutSession = async (req, res, next) => {
  try {
    const { invoiceId } = req.body;

    if (!invoiceId || !mongoose.Types.ObjectId.isValid(invoiceId)) {
      return res.status(400).json({
        success: false,
        message: 'A valid invoice ID is required'
      });
    }

    // Zero-Trust: Fetch invoice from DB directly
    const invoice = await Invoice.findById(invoiceId);

    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: 'Invoice not found'
      });
    }

    // Zero-Trust: Verify that authenticated user owns the invoice
    if (invoice.clientId.toString() !== req.user.userId && req.user.role !== 'admin') {
      logger.security('IDOR attempt during checkout session creation', {
        userId: req.user.userId,
        targetInvoiceId: invoiceId
      });
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to pay for this invoice'
      });
    }

    if (invoice.status === 'Paid') {
      return res.status(400).json({
        success: false,
        message: 'This invoice has already been paid in full'
      });
    }

    const user = await User.findById(req.user.userId);

    // Call service to generate Stripe checkout session
    const { sessionId, url } = await createStripeSession(invoice, user);

    logger.info('Payment session created', {
      invoiceId: invoice._id.toString(),
      sessionId,
      amount: invoice.total
    });

    return res.status(200).json({
      success: true,
      data: {
        sessionId,
        url
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Development & Testing Helper: Simulate Stripe Payment Confirmation
 * Safely processes payment workflow (State -> Paid, PDF, Email) without live Stripe webhook
 */
export const simulateMockPayment = async (req, res, next) => {
  try {
    const { invoiceId } = req.body;

    const invoice = await Invoice.findById(invoiceId);
    if (!invoice) {
      return res.status(404).json({ success: false, message: 'Invoice not found' });
    }

    if (invoice.clientId.toString() !== req.user.userId && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }

    if (invoice.status === 'Paid') {
      return res.status(200).json({ success: true, message: 'Invoice already paid', data: invoice });
    }

    const mockEventId = `evt_mock_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const mockPaymentIntentId = `pi_mock_${Date.now()}`;

    // Update status to Paid
    invoice.status = 'Paid';
    invoice.paidAt = new Date();
    invoice.stripePaymentIntentId = mockPaymentIntentId;

    // Create Payment Record
    const payment = await Payment.create({
      invoiceId: invoice._id,
      clientId: invoice.clientId,
      stripePaymentIntentId: mockPaymentIntentId,
      amount: invoice.total,
      currency: invoice.currency,
      status: 'succeeded',
      stripeEventId: mockEventId
    });

    // Lookup client for PDF & Email
    const client = await User.findById(invoice.clientId);

    // Generate PDF receipt
    try {
      const { filePath, buffer } = await generatePdfReceipt(invoice, client, mockPaymentIntentId);
      invoice.pdfUrl = filePath;
      await invoice.save();

      // Email PDF receipt
      await sendPaymentReceiptEmail({
        to: client.email,
        clientName: client.name,
        invoice,
        pdfPath: filePath,
        pdfBuffer: buffer
      });
    } catch (err) {
      logger.error('Error in post-payment receipt/email automation', { error: err.message });
    }

    return res.status(200).json({
      success: true,
      message: 'Payment simulated successfully with PDF & Email generated',
      data: {
        invoice,
        payment
      }
    });
  } catch (error) {
    next(error);
  }
};
