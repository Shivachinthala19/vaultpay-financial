import Stripe from 'stripe';
import dotenv from 'dotenv';
dotenv.config();

const stripeKey = process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder_key_nexus_corporate';

export const stripe = new Stripe(stripeKey, {
  apiVersion: '2023-10-16',
  appInfo: {
    name: 'Nexus Corporate Billing',
    version: '1.0.0'
  }
});
