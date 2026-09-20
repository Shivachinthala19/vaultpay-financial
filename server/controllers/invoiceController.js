import { Invoice } from '../models/Invoice.js';
import { User } from '../models/User.js';
import { generatePdfReceipt } from '../services/pdfService.js';
import { logger } from '../utils/logger.js';
import fs from 'fs';

export const createInvoice = async (req, res, next) => {
  try {
    const { items, description, taxRate = 0, currency = 'USD' } = req.body;

    // Zero-Trust: Recalculate line totals and financial summary strictly on the server
    const processedItems = items.map((item) => ({
      description: item.description.trim(),
      quantity: Number(item.quantity),
      price: Number(item.price),
      total: Number((Number(item.quantity) * Number(item.price)).toFixed(2))
    }));

    const subtotal = Number(
      processedItems.reduce((acc, curr) => acc + curr.total, 0).toFixed(2)
    );
    const tax = Number(((subtotal * Number(taxRate)) / 100).toFixed(2));
    const total = Number((subtotal + tax).toFixed(2));

    const invoiceNumber = await Invoice.generateInvoiceNumber();

    // Zero-Trust: clientId is strictly extracted from req.user.userId (never req.body)
    const invoice = await Invoice.create({
      clientId: req.user.userId,
      invoiceNumber,
      description: description || 'Nexus Corporate Enterprise Billing',
      items: processedItems,
      subtotal,
      tax,
      total,
      currency: currency.toUpperCase(),
      status: 'Pending' // Never allow client to set status
    });

    logger.info('Invoice created successfully', {
      invoiceId: invoice._id.toString(),
      invoiceNumber: invoice.invoiceNumber,
      clientId: req.user.userId,
      total: invoice.total
    });

    return res.status(201).json({
      success: true,
      data: invoice
    });
  } catch (error) {
    next(error);
  }
};

export const getInvoices = async (req, res, next) => {
  try {
    // Zero-Trust: Query strictly scoped to authenticated user ID
    const invoices = await Invoice.find({ clientId: req.user.userId }).sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      data: invoices
    });
  } catch (error) {
    next(error);
  }
};

export const getInvoiceById = async (req, res, next) => {
  try {
    // Ownership verified by verifyInvoiceOwnership middleware
    const invoice = req.invoice;

    return res.status(200).json({
      success: true,
      data: invoice
    });
  } catch (error) {
    next(error);
  }
};

export const updateInvoice = async (req, res, next) => {
  try {
    const invoice = req.invoice;

    // Cannot update invoices that are already Paid
    if (invoice.status === 'Paid') {
      return res.status(400).json({
        success: false,
        message: 'Paid invoices cannot be modified'
      });
    }

    const { description, items, taxRate } = req.body;

    if (description !== undefined) {
      invoice.description = description;
    }

    if (items && Array.isArray(items) && items.length > 0) {
      const processedItems = items.map((item) => ({
        description: item.description.trim(),
        quantity: Number(item.quantity),
        price: Number(item.price),
        total: Number((Number(item.quantity) * Number(item.price)).toFixed(2))
      }));

      invoice.items = processedItems;
      invoice.subtotal = Number(
        processedItems.reduce((acc, curr) => acc + curr.total, 0).toFixed(2)
      );

      const effectiveTaxRate = taxRate !== undefined ? Number(taxRate) : (invoice.tax / (invoice.subtotal || 1)) * 100;
      invoice.tax = Number(((invoice.subtotal * effectiveTaxRate) / 100).toFixed(2));
      invoice.total = Number((invoice.subtotal + invoice.tax).toFixed(2));
    }

    // Zero-Trust: If client attempted to inject status/paidAt in req.body, it was rejected by validation/ignored
    await invoice.save();

    logger.info('Invoice updated successfully', {
      invoiceId: invoice._id.toString(),
      updatedBy: req.user.userId
    });

    return res.status(200).json({
      success: true,
      data: invoice
    });
  } catch (error) {
    next(error);
  }
};

export const deleteInvoice = async (req, res, next) => {
  try {
    const invoice = req.invoice;

    if (invoice.status === 'Paid') {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete a paid invoice'
      });
    }

    await Invoice.findByIdAndDelete(invoice._id);

    logger.info('Invoice deleted', {
      invoiceId: invoice._id.toString(),
      deletedBy: req.user.userId
    });

    return res.status(200).json({
      success: true,
      message: 'Invoice deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

export const downloadReceiptPdf = async (req, res, next) => {
  try {
    // Ownership verified by verifyInvoiceOwnership middleware
    const invoice = req.invoice;

    if (invoice.status !== 'Paid') {
      return res.status(400).json({
        success: false,
        message: 'Receipt is only available for paid invoices'
      });
    }

    const client = await User.findById(invoice.clientId);

    // If PDF already generated and exists on disk, stream it
    if (invoice.pdfUrl && fs.existsSync(invoice.pdfUrl)) {
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="receipt-${invoice.invoiceNumber}.pdf"`);
      const fileStream = fs.createReadStream(invoice.pdfUrl);
      return fileStream.pipe(res);
    }

    // Otherwise generate the PDF receipt
    const { filePath, filename, buffer } = await generatePdfReceipt(
      invoice,
      client,
      invoice.stripePaymentIntentId
    );

    invoice.pdfUrl = filePath;
    await invoice.save();

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    return res.send(buffer);
  } catch (error) {
    logger.error('Error downloading receipt PDF', { error: error.message });
    next(error);
  }
};
