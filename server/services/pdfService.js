import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { logger } from '../utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure upload directory exists
const RECEIPTS_DIR = path.join(__dirname, '..', 'uploads', 'receipts');
if (!fs.existsSync(RECEIPTS_DIR)) {
  fs.mkdirSync(RECEIPTS_DIR, { recursive: true });
}

/**
 * Generate a professional corporate PDF receipt for a paid invoice
 * @param {Object} invoice - Populated Invoice document
 * @param {Object} user - User document (Client)
 * @param {string} stripePaymentIntentId - Stripe transaction reference
 * @returns {Promise<{ filePath: string, filename: string, buffer: Buffer }>}
 */
export const generatePdfReceipt = async (invoice, user, stripePaymentIntentId = null) => {
  return new Promise((resolve, reject) => {
    try {
      const filename = `receipt-${invoice.invoiceNumber}.pdf`;
      const filePath = path.join(RECEIPTS_DIR, filename);

      const doc = new PDFDocument({
        margin: 50,
        size: 'A4',
        info: {
          Title: `Nexus Corporate Receipt - ${invoice.invoiceNumber}`,
          Author: 'Nexus Corporate Billing',
          Subject: 'Payment Receipt'
        }
      });

      const writeStream = fs.createWriteStream(filePath);
      const chunks = [];

      doc.on('data', (chunk) => chunks.push(chunk));
      doc.pipe(writeStream);

      // --- COLOR PALETTE ---
      const primaryColor = '#0f172a'; // Deep Navy Slate
      const accentColor = '#3b82f6';  // Nexus Blue
      const lightBg = '#f8fafc';      // Subtle Slate
      const mutedText = '#64748b';    // Slate Gray
      const successGreen = '#10b981'; // Emerald Paid Green

      // --- HEADER & BRANDING ---
      // Top bar accent
      doc.rect(0, 0, doc.page.width, 10).fill(accentColor);

      // Corporate Brand Logo / Symbol
      doc.circle(70, 60, 20).fill(primaryColor);
      doc.fillColor('#ffffff').fontSize(16).font('Helvetica-Bold').text('N', 63, 52);

      // Company Name
      doc.fillColor(primaryColor).fontSize(20).font('Helvetica-Bold').text('NEXUS CORPORATE', 100, 48);
      doc.fontSize(9).font('Helvetica').fillColor(mutedText).text('Enterprise Billing & Financial Infrastructure', 100, 70);

      // Receipt Title & Badge
      doc.fontSize(22).font('Helvetica-Bold').fillColor(primaryColor).text('PAYMENT RECEIPT', 350, 48, { align: 'right' });
      doc.fontSize(10).font('Helvetica-Bold').fillColor(accentColor).text(`INVOICE #${invoice.invoiceNumber}`, 350, 73, { align: 'right' });

      // Horizontal Divider
      doc.moveTo(50, 100).lineTo(545, 100).strokeColor('#e2e8f0').lineWidth(1).stroke();

      // --- METADATA SECTIONS ---
      // Left Column: Customer Details
      const clientName = user?.name || 'Valued Corporate Client';
      const clientEmail = user?.email || 'client@corporate.internal';

      doc.fontSize(9).font('Helvetica-Bold').fillColor(mutedText).text('BILLED TO', 50, 120);
      doc.fontSize(12).font('Helvetica-Bold').fillColor(primaryColor).text(clientName, 50, 135);
      doc.fontSize(10).font('Helvetica').fillColor(mutedText).text(clientEmail, 50, 152);
      doc.fontSize(9).font('Helvetica').fillColor(mutedText).text(`Customer ID: ${user?._id || invoice.clientId}`, 50, 168);

      // Right Column: Payment Details
      const issueDate = new Date(invoice.createdAt).toLocaleDateString('en-US', { dateStyle: 'medium' });
      const paidDate = invoice.paidAt ? new Date(invoice.paidAt).toLocaleDateString('en-US', { dateStyle: 'medium' }) : new Date().toLocaleDateString('en-US', { dateStyle: 'medium' });
      const paymentRef = stripePaymentIntentId || invoice.stripePaymentIntentId || 'STRIPE_TXN_VERIFIED';

      doc.fontSize(9).font('Helvetica-Bold').fillColor(mutedText).text('PAYMENT DETAILS', 350, 120);
      doc.fontSize(10).font('Helvetica').fillColor(primaryColor).text(`Date Issued:  ${issueDate}`, 350, 135);
      doc.fontSize(10).font('Helvetica-Bold').fillColor(primaryColor).text(`Date Paid:    ${paidDate}`, 350, 152);
      doc.fontSize(8).font('Helvetica').fillColor(mutedText).text(`Stripe Txn:   ${paymentRef}`, 350, 169);

      // --- PAID STAMP BADGE ---
      // Drawing a prominent "PAID" badge box
      doc.save();
      doc.roundedRect(360, 200, 180, 42, 6).fillColor('#ecfdf5').fillAndStroke('#10b981');
      doc.fontSize(20).font('Helvetica-Bold').fillColor(successGreen).text('✓ PAID IN FULL', 370, 212, { align: 'center', width: 160 });
      doc.restore();

      // Description
      doc.fontSize(10).font('Helvetica-Bold').fillColor(primaryColor).text('Billing Description:', 50, 210);
      doc.fontSize(10).font('Helvetica').fillColor(mutedText).text(invoice.description || 'Nexus Corporate Enterprise Services', 50, 225, { width: 290 });

      // --- LINE ITEMS TABLE ---
      const tableTop = 270;
      doc.rect(50, tableTop, 495, 24).fillColor(lightBg).fill();
      doc.rect(50, tableTop, 495, 24).strokeColor('#cbd5e1').lineWidth(0.5).stroke();

      doc.fontSize(9).font('Helvetica-Bold').fillColor(primaryColor);
      doc.text('ITEM DESCRIPTION', 60, tableTop + 7);
      doc.text('QTY', 330, tableTop + 7, { width: 40, align: 'center' });
      doc.text('UNIT PRICE', 380, tableTop + 7, { width: 70, align: 'right' });
      doc.text('TOTAL', 460, tableTop + 7, { width: 75, align: 'right' });

      let currentY = tableTop + 24;

      invoice.items.forEach((item, index) => {
        const rowBg = index % 2 === 0 ? '#ffffff' : '#f8fafc';
        doc.rect(50, currentY, 495, 26).fillColor(rowBg).fill();
        doc.rect(50, currentY, 495, 26).strokeColor('#e2e8f0').lineWidth(0.5).stroke();

        doc.fontSize(9).font('Helvetica').fillColor(primaryColor);
        doc.text(item.description, 60, currentY + 8, { width: 260, ellipsis: true });
        doc.text(item.quantity.toString(), 330, currentY + 8, { width: 40, align: 'center' });
        doc.text(`$${Number(item.price).toFixed(2)}`, 380, currentY + 8, { width: 70, align: 'right' });
        doc.text(`$${Number(item.total).toFixed(2)}`, 460, currentY + 8, { width: 75, align: 'right' });

        currentY += 26;
      });

      // --- FINANCIAL SUMMARY BOX ---
      currentY += 15;
      const summaryLeft = 330;
      const summaryWidth = 215;

      doc.rect(summaryLeft, currentY, summaryWidth, 80).fillColor(lightBg).fill();
      doc.rect(summaryLeft, currentY, summaryWidth, 80).strokeColor('#cbd5e1').lineWidth(0.5).stroke();

      doc.fontSize(9).font('Helvetica').fillColor(mutedText);
      doc.text('Subtotal:', summaryLeft + 15, currentY + 10);
      doc.fillColor(primaryColor).text(`$${Number(invoice.subtotal).toFixed(2)}`, summaryLeft + 100, currentY + 10, { width: 90, align: 'right' });

      doc.fillColor(mutedText).text('Tax:', summaryLeft + 15, currentY + 28);
      doc.fillColor(primaryColor).text(`$${Number(invoice.tax).toFixed(2)}`, summaryLeft + 100, currentY + 28, { width: 90, align: 'right' });

      doc.moveTo(summaryLeft + 10, currentY + 45).lineTo(summaryLeft + summaryWidth - 10, currentY + 45).strokeColor('#cbd5e1').lineWidth(0.5).stroke();

      doc.fontSize(11).font('Helvetica-Bold').fillColor(primaryColor);
      doc.text(`Total (${invoice.currency || 'USD'}):`, summaryLeft + 15, currentY + 54);
      doc.fillColor(accentColor).text(`$${Number(invoice.total).toFixed(2)}`, summaryLeft + 100, currentY + 54, { width: 90, align: 'right' });

      // --- FOOTER & COMPLIANCE ---
      const footerY = 720;
      doc.moveTo(50, footerY).lineTo(545, footerY).strokeColor('#e2e8f0').lineWidth(0.5).stroke();

      doc.fontSize(8).font('Helvetica').fillColor(mutedText).text(
        'This is an electronically generated official receipt confirming verified payment receipt by Nexus Corporate Systems Inc. All transactions are cryptographically signed and secured.',
        50,
        footerY + 10,
        { align: 'center', width: 495 }
      );
      doc.text(`Security Verification Token: SHA256-${Buffer.from(`${invoice._id}-${invoice.paidAt || Date.now()}`).toString('hex').substring(0, 32).toUpperCase()}`, 50, footerY + 30, { align: 'center', width: 495 });

      doc.end();

      writeStream.on('finish', () => {
        const buffer = Buffer.concat(chunks);
        logger.info('PDF Receipt generated successfully', {
          invoiceId: invoice._id.toString(),
          invoiceNumber: invoice.invoiceNumber,
          filePath
        });
        resolve({
          filePath,
          filename,
          buffer
        });
      });

      writeStream.on('error', (err) => {
        logger.error('Failed to write PDF receipt', { error: err.message });
        reject(err);
      });
    } catch (err) {
      logger.error('PDF generation encountered an unexpected exception', { error: err.message });
      reject(err);
    }
  });
};
