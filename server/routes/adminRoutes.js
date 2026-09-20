import express from 'express';
import { getAllInvoices, getAllUsers, getAdminMetrics } from '../controllers/adminController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';
import { requireRole } from '../middleware/roleMiddleware.js';

const router = express.Router();

// Strict Admin-only endpoints
router.use(authMiddleware);
router.use(requireRole('admin'));

router.get('/invoices', getAllInvoices);
router.get('/users', getAllUsers);
router.get('/metrics', getAdminMetrics);

export default router;
