import { z } from 'zod';
import { logger } from '../utils/logger.js';

export const validateBody = (schema) => (req, res, next) => {
  try {
    req.body = schema.parse(req.body);
    next();
  } catch (error) {
    if (error instanceof z.ZodError) {
      const issues = error.issues.map((i) => `${i.path.join('.')}: ${i.message}`);
      logger.warn('Request validation failed', { issues, path: req.originalUrl });
      return res.status(400).json({
        success: false,
        message: 'Invalid request data',
        errors: issues
      });
    }
    next(error);
  }
};

// Zod Validation Schemas
export const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  role: z.enum(['client', 'admin']).optional()
});

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required')
});

export const lineItemSchema = z.object({
  description: z.string().min(1, 'Item description is required'),
  quantity: z.number().int().positive('Quantity must be a positive integer'),
  price: z.number().nonnegative('Price cannot be negative')
});

export const createInvoiceSchema = z.object({
  description: z.string().optional(),
  items: z.array(lineItemSchema).min(1, 'At least one line item is required'),
  taxRate: z.number().min(0).max(100).optional().default(0),
  currency: z.string().length(3).optional().default('USD')
});

export const updateInvoiceSchema = z.object({
  description: z.string().optional(),
  items: z.array(lineItemSchema).min(1).optional(),
  taxRate: z.number().min(0).max(100).optional()
  // NOTE: status, paidAt, clientId, total, stripePaymentIntentId are strictly prohibited from client updates!
});
