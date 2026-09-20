import nodemailer from 'nodemailer';
import { logger } from '../utils/logger.js';

let transporter = null;

/**
 * Initialize or retrieve Nodemailer Transporter
 */
const getTransporter = async () => {
  if (transporter) return transporter;

  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASSWORD;

  if (host && user && pass) {
    transporter = nodemailer.createTransport({
      host,
      port: Number(process.env.SMTP_PORT) || 587,
      secure: Number(process.env.SMTP_PORT) === 465,
      auth: { user, pass }
    });
    logger.info('Nodemailer configured with custom SMTP server', { host });
  } else {
    // In local dev without live SMTP, configure a test transporter or ethereal account
    try {
      const testAccount = await nodemailer.createTestAccount();
      transporter = nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        secure: false,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass
        }
      });
      logger.info('Nodemailer initialized with Ethereal Mock Transporter', { user: testAccount.user });
    } catch (err) {
      // Fallback to JSON transport (logs messages in memory without network failure)
      transporter = nodemailer.createTransport({
        jsonTransport: true
      });
      logger.info('Nodemailer initialized with JSON transport fallback');
    }
  }

  return transporter;
};

/**
 * Send official Payment Receipt via Email with PDF attachment
 * @param {Object} options
 * @param {string} options.to - Client's verified email from database
 * @param {string} options.clientName - Client's full name
 * @param {Object} options.invoice - Invoice document
 * @param {string} options.pdfPath - Local file path to generated receipt PDF
 * @param {Buffer} [options.pdfBuffer] - Optional Buffer of receipt PDF
 * @returns {Promise<boolean>}
 */
export const sendPaymentReceiptEmail = async ({ to, clientName, invoice, pdfPath, pdfBuffer }) => {
  try {
    const mailClient = await getTransporter();
    const fromAddress = process.env.SMTP_FROM || '"Nexus Corporate Billing" <billing@nexuscorporate.com>';

    const subject = `Payment Successful: Official Receipt for Invoice ${invoice.invoiceNumber}`;
    const html = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #1e293b; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px;">
        <div style="border-bottom: 2px solid #3b82f6; padding-bottom: 15px; margin-bottom: 20px; display: flex; align-items: center;">
          <h2 style="color: #0f172a; margin: 0; font-size: 22px;">NEXUS CORPORATE</h2>
        </div>
        
        <p style="font-size: 16px; font-weight: 600; color: #0f172a; margin-bottom: 10px;">Payment Successful</p>
        
        <p>Dear ${clientName || 'Corporate Client'},</p>
        
        <p>Your payment for invoice <strong>${invoice.invoiceNumber}</strong> in the amount of <strong>$${Number(invoice.total).toFixed(2)} ${invoice.currency || 'USD'}</strong> has been successfully received and verified.</p>
        
        <div style="background-color: #f8fafc; border-left: 4px solid #10b981; padding: 12px 16px; margin: 20px 0; border-radius: 0 6px 6px 0;">
          <p style="margin: 0; font-size: 14px; color: #065f46;"><strong>Status:</strong> Paid in Full</p>
          <p style="margin: 4px 0 0 0; font-size: 13px; color: #475569;"><strong>Stripe Transaction Reference:</strong> ${invoice.stripePaymentIntentId || 'STRIPE_TXN_VERIFIED'}</p>
        </div>
        
        <p>Please find your official cryptographically verified payment receipt attached to this email.</p>
        
        <p style="margin-top: 30px;">Thank you for your business,<br>
        <strong>Nexus Corporate Systems</strong><br>
        <span style="font-size: 12px; color: #64748b;">Enterprise Financial Services</span></p>
      </div>
    `;

    const text = `
Payment Successful

Dear ${clientName || 'Valued Client'},

Your payment for invoice ${invoice.invoiceNumber} in the amount of $${Number(invoice.total).toFixed(2)} ${invoice.currency || 'USD'} has been successfully received.

Please find your official payment receipt attached.

Thank you,
Nexus Corporate
    `;

    const attachmentFilename = `payment-receipt-${invoice.invoiceNumber}.pdf`;
    const attachments = [];

    if (pdfBuffer) {
      attachments.push({
        filename: attachmentFilename,
        content: pdfBuffer,
        contentType: 'application/pdf'
      });
    } else if (pdfPath) {
      attachments.push({
        filename: attachmentFilename,
        path: pdfPath,
        contentType: 'application/pdf'
      });
    }

    const info = await mailClient.sendMail({
      from: fromAddress,
      to,
      subject,
      text,
      html,
      attachments
    });

    logger.info('Payment receipt email sent successfully', {
      recipient: to,
      invoiceNumber: invoice.invoiceNumber,
      messageId: info.messageId,
      previewUrl: nodemailer.getTestMessageUrl(info) || undefined
    });

    return true;
  } catch (error) {
    // Critical: If email fails, log error but DO NOT crash and DO NOT undo paid payment status!
    logger.error('Failed to send payment receipt email', {
      recipient: to,
      invoiceNumber: invoice?.invoiceNumber,
      error: error.message
    });
    return false;
  }
};
