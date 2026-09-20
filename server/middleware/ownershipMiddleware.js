import mongoose from 'mongoose';
import { Invoice } from '../models/Invoice.js';
import { logger } from '../utils/logger.js';

export const verifyInvoiceOwnership = async (req, res, next) => {
  try {
    const invoiceId = req.params.id || req.params.invoiceId;

    if (!invoiceId || !mongoose.Types.ObjectId.isValid(invoiceId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid invoice ID format'
      });
    }

    const invoice = await Invoice.findById(invoiceId);

    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: 'Invoice not found'
      });
    }

    const isOwner = invoice.clientId.toString() === req.user.userId;
    const isAdmin = req.user.role === 'admin';

    if (!isOwner && !isAdmin) {
      // High-priority security audit log for IDOR attempt
      logger.security('IDOR prevention triggered: Unauthorized invoice access attempt', {
        authenticatedUser: req.user.userId,
        targetInvoiceId: invoiceId,
        actualInvoiceOwner: invoice.clientId.toString(),
        method: req.method,
        path: req.originalUrl,
        ip: req.ip
      });

      return res.status(403).json({
        success: false,
        message: 'You are not authorized to access this invoice'
      });
    }

    // Attach validated invoice to request
    req.invoice = invoice;
    next();
  } catch (error) {
    logger.error('Error in invoice ownership middleware', { error: error.message });
    return res.status(500).json({
      success: false,
      message: 'Internal server error validating invoice ownership'
    });
  }
};
