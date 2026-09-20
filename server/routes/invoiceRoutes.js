import express from 'express';
import {
  createInvoice,
  getInvoices,
  getInvoiceById,
  updateInvoice,
  deleteInvoice,
  downloadReceiptPdf
} from '../controllers/invoiceController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';
import { verifyInvoiceOwnership } from '../middleware/ownershipMiddleware.js';
import {
  validateBody,
  createInvoiceSchema,
  updateInvoiceSchema
} from '../middleware/validationMiddleware.js';

const router = express.Router();

// All invoice routes require JWT authentication
router.use(authMiddleware);

// Create new invoice (Zero-Trust: Client ID attached from JWT)
router.post('/', validateBody(createInvoiceSchema), createInvoice);

// Get all invoices belonging to the authenticated client
router.get('/', getInvoices);

// IDOR-Protected Individual Invoice Routes
router.get('/:id', verifyInvoiceOwnership, getInvoiceById);
router.put('/:id', verifyInvoiceOwnership, validateBody(updateInvoiceSchema), updateInvoice);
router.delete('/:id', verifyInvoiceOwnership, deleteInvoice);

// IDOR-Protected PDF Receipt Download
router.get('/:id/receipt', verifyInvoiceOwnership, downloadReceiptPdf);

export default router;
