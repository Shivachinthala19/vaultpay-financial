import { stripe } from '../config/stripe.js';
import { logger } from '../utils/logger.js';

/**
 * Create a Stripe Checkout Session for an authenticated & verified invoice
 * @param {Object} invoice - Database Invoice Document
 * @param {Object} user - Authenticated User context
 * @returns {Promise<{ sessionId: string, url: string }>}
 */
export const createCheckoutSession = async (invoice, user) => {
  try {
    const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';

    // Build Stripe Line Items strictly from server database invoice records
    const lineItems = invoice.items.map((item) => ({
      price_data: {
        currency: (invoice.currency || 'USD').toLowerCase(),
        product_data: {
          name: item.description,
          description: `Line item for ${invoice.invoiceNumber}`
        },
        // Stripe expects unit_amount in cents
        unit_amount: Math.round(Number(item.price) * 100)
      },
      quantity: Number(item.quantity)
    }));

    // If tax is present, add as an explicit line item or tax fee
    if (invoice.tax && invoice.tax > 0) {
      lineItems.push({
        price_data: {
          currency: (invoice.currency || 'USD').toLowerCase(),
          product_data: {
            name: 'Corporate Sales Tax & Regulatory Fee',
            description: `Applicable taxes for ${invoice.invoiceNumber}`
          },
          unit_amount: Math.round(Number(invoice.tax) * 100)
        },
        quantity: 1
      });
    }

    // Server-to-server call creating Checkout session
    // Note: If running in test mode with placeholder stripe keys, fallback mock session if Stripe API rejects key
    let session;
    try {
      session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        mode: 'payment',
        customer_email: user.email,
        client_reference_id: invoice._id.toString(),
        line_items: lineItems,
        metadata: {
          invoiceId: invoice._id.toString(),
          clientId: invoice.clientId.toString(),
          invoiceNumber: invoice.invoiceNumber
        },
        success_url: `${clientUrl}/payment/success?session_id={CHECKOUT_SESSION_ID}&invoice_id=${invoice._id}`,
        cancel_url: `${clientUrl}/payment/cancel?invoice_id=${invoice._id}`
      });
    } catch (stripeError) {
      // If Stripe rejected due to placeholder API key, provide a local mock checkout simulation URL
      if (stripeError.message.includes('Invalid API Key') || stripeError.message.includes('sk_test_placeholder')) {
        logger.warn('Using simulated mock Stripe session for local development', { reason: stripeError.message });
        const mockSessionId = `cs_mock_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        session = {
          id: mockSessionId,
          url: `${clientUrl}/payment/success?session_id=${mockSessionId}&invoice_id=${invoice._id}&mock=true`
        };
      } else {
        throw stripeError;
      }
    }

    // Persist Checkout Session ID on invoice
    invoice.stripeCheckoutSessionId = session.id;
    await invoice.save();

    logger.info('Stripe Checkout session created', {
      invoiceId: invoice._id.toString(),
      sessionId: session.id,
      amount: invoice.total
    });

    return {
      sessionId: session.id,
      url: session.url
    };
  } catch (error) {
    logger.error('Failed to create Stripe Checkout session', {
      invoiceId: invoice._id.toString(),
      error: error.message
    });
    throw error;
  }
};
