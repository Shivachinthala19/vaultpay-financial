process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test_nexus_security_jwt_secret_9988';
process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test_stripe_webhook_secret_123';

import assert from 'assert';
import mongoose from 'mongoose';
import stripePackage from 'stripe';

import app from '../server.js';
import { connectDB, disconnectDB } from '../config/db.js';
import { User } from '../models/User.js';
import { Invoice } from '../models/Invoice.js';
import { Payment } from '../models/Payment.js';
import { generateToken } from '../utils/generateToken.js';

let server;
let baseUrl;

// Test colors
const green = '\x1b[32m';
const red = '\x1b[31m';
const cyan = '\x1b[36m';
const reset = '\x1b[0m';

async function makeRequest(path, options = {}) {
  const url = `${baseUrl}${path}`;
  const headers = { ...options.headers };
  
  if (options.body && typeof options.body === 'object' && !Buffer.isBuffer(options.body)) {
    headers['Content-Type'] = 'application/json';
  }

  const fetchOptions = {
    method: options.method || 'GET',
    headers,
    body: options.body
      ? (typeof options.body === 'object' && !Buffer.isBuffer(options.body)
          ? JSON.stringify(options.body)
          : options.body)
      : undefined
  };

  const res = await fetch(url, fetchOptions);
  let data;
  const contentType = res.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    data = await res.json();
  } else {
    data = await res.text();
  }

  return { status: res.status, headers: res.headers, data };
}

async function runSecurityTestSuite() {
  console.log(`${cyan}====================================================${reset}`);
  console.log(`${cyan} NEXUS CORPORATE BILLING: ZERO-TRUST SECURITY SUITE ${reset}`);
  console.log(`${cyan}====================================================${reset}\n`);

  await connectDB();

  await new Promise((resolve) => {
    server = app.listen(0, () => {
      const port = server.address().port;
      baseUrl = `http://localhost:${port}`;
      resolve();
    });
  });

  let passedTests = 0;
  let totalTests = 8;

  try {
    // Clear collections for fresh test run
    await User.deleteMany({});
    await Invoice.deleteMany({});
    await Payment.deleteMany({});

    // Seed test users: Client A, Client B, Admin
    const clientA = await User.create({
      name: 'Client Alpha Corp',
      email: 'clientA@corporate.com',
      password: 'SecurePassword123!',
      role: 'client'
    });
    const tokenA = generateToken(clientA);

    const clientB = await User.create({
      name: 'Client Beta Ltd',
      email: 'clientB@corporate.com',
      password: 'SecurePassword123!',
      role: 'client'
    });
    const tokenB = generateToken(clientB);

    const adminUser = await User.create({
      name: 'Nexus Corporate Admin',
      email: 'admin@nexuscorporate.com',
      password: 'SuperAdminPassword123!',
      role: 'admin'
    });
    const tokenAdmin = generateToken(adminUser);

    // Seed an invoice for Client B
    const invoiceB = await Invoice.create({
      clientId: clientB._id,
      invoiceNumber: 'NEXUS-INV-2026-TEST-B',
      description: 'Private Enterprise Server Cluster',
      items: [{ description: 'Dedicated Node Cluster', quantity: 2, price: 5000, total: 10000 }],
      subtotal: 10000,
      tax: 800,
      total: 10800,
      currency: 'USD',
      status: 'Pending'
    });

    // Seed a paid invoice for Client B for receipt testing
    const paidInvoiceB = await Invoice.create({
      clientId: clientB._id,
      invoiceNumber: 'NEXUS-INV-2026-PAID-B',
      description: 'Annual Cloud Retainer',
      items: [{ description: 'Retainer Package', quantity: 1, price: 20000, total: 20000 }],
      subtotal: 20000,
      tax: 0,
      total: 20000,
      currency: 'USD',
      status: 'Paid',
      paidAt: new Date(),
      stripePaymentIntentId: 'pi_test_b_already_paid'
    });

    // ----------------------------------------------------
    // TEST 1: Missing JWT
    // ----------------------------------------------------
    console.log(`[TEST 1] Missing JWT -> GET /api/invoices/${invoiceB._id}`);
    const res1 = await makeRequest(`/api/invoices/${invoiceB._id}`);
    assert.strictEqual(res1.status, 401, 'Should reject unauthenticated request with 401');
    assert.strictEqual(res1.data.success, false);
    console.log(`${green}✓ Passed: Rejected with 401 Unauthorized${reset}\n`);
    passedTests++;

    // ----------------------------------------------------
    // TEST 2: Invalid JWT
    // ----------------------------------------------------
    console.log(`[TEST 2] Invalid JWT -> GET /api/invoices/${invoiceB._id} with forged token`);
    const res2 = await makeRequest(`/api/invoices/${invoiceB._id}`, {
      headers: { Authorization: 'Bearer forged.tampered.token123' }
    });
    assert.strictEqual(res2.status, 401, 'Should reject corrupted/forged token with 401');
    assert.strictEqual(res2.data.success, false);
    console.log(`${green}✓ Passed: Rejected forged token with 401 Unauthorized${reset}\n`);
    passedTests++;

    // ----------------------------------------------------
    // TEST 3: IDOR Attack (Client A attempts to view Client B's invoice)
    // ----------------------------------------------------
    console.log(`[TEST 3] IDOR Attack -> Client A requests Client B's invoice: /api/invoices/${invoiceB._id}`);
    const res3 = await makeRequest(`/api/invoices/${invoiceB._id}`, {
      headers: { Authorization: `Bearer ${tokenA}` }
    });
    assert.strictEqual(res3.status, 403, 'Should reject cross-tenant IDOR access with 403 Forbidden');
    assert.strictEqual(res3.data.success, false);
    assert.strictEqual(res3.data.message, 'You are not authorized to access this invoice');
    assert.strictEqual(res3.data.data, undefined, 'Zero invoice data must be leaked');
    console.log(`${green}✓ Passed: IDOR blocked with 403 Forbidden & Zero data leakage${reset}\n`);
    passedTests++;

    // ----------------------------------------------------
    // TEST 4: Fake Payment Attempt (Frontend attempts to mark status: "Paid")
    // ----------------------------------------------------
    console.log(`[TEST 4] Fake Payment Attempt -> Client B attempts PUT /api/invoices/${invoiceB._id} with { status: "Paid" }`);
    const res4 = await makeRequest(`/api/invoices/${invoiceB._id}`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${tokenB}` },
      body: { status: 'Paid', paidAt: new Date().toISOString() }
    });
    
    // Verify invoice remains Pending in MongoDB
    const refreshedInvoiceB = await Invoice.findById(invoiceB._id);
    assert.strictEqual(refreshedInvoiceB.status, 'Pending', 'Invoice status must remain Pending');
    console.log(`${green}✓ Passed: Client-side payment status tampering prevented (Invoice remains Pending)${reset}\n`);
    passedTests++;

    // ----------------------------------------------------
    // TEST 5: Fake Webhook (Invalid Stripe Signature)
    // ----------------------------------------------------
    console.log(`[TEST 5] Fake Webhook -> POST /api/webhooks/stripe with invalid signature`);
    const fakePayload = JSON.stringify({
      id: 'evt_fake_123',
      type: 'checkout.session.completed',
      data: { object: { metadata: { invoiceId: invoiceB._id.toString() } } }
    });
    const res5 = await makeRequest(`/api/webhooks/stripe`, {
      method: 'POST',
      headers: {
        'stripe-signature': 't=123456,v1=invalid_fake_crypto_signature_hash',
        'Content-Type': 'application/json'
      },
      body: fakePayload
    });
    assert.strictEqual(res5.status, 400, 'Fake webhook must be rejected with 400 Bad Request');
    const invoiceBAfterFakeWebhook = await Invoice.findById(invoiceB._id);
    assert.strictEqual(invoiceBAfterFakeWebhook.status, 'Pending', 'Invoice must not be marked paid');
    console.log(`${green}✓ Passed: Invalid webhook rejected with 400 Bad Request${reset}\n`);
    passedTests++;

    // ----------------------------------------------------
    // TEST 6: Webhook Idempotency & Confirmation
    // ----------------------------------------------------
    console.log(`[TEST 6] Stripe Webhook Idempotency -> Sending valid Stripe Event twice`);
    const stripeInstance = stripePackage(process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder');
    const eventPayload = {
      id: `evt_test_valid_${Date.now()}`,
      object: 'event',
      api_version: '2023-10-16',
      created: Math.floor(Date.now() / 1000),
      type: 'checkout.session.completed',
      data: {
        object: {
          id: 'cs_test_session_id_1001',
          payment_intent: 'pi_test_intent_id_1001',
          client_reference_id: invoiceB._id.toString(),
          metadata: {
            invoiceId: invoiceB._id.toString(),
            clientId: clientB._id.toString()
          }
        }
      }
    };
    const rawEventPayload = JSON.stringify(eventPayload);
    const validSignature = stripeInstance.webhooks.generateTestHeaderString({
      payload: rawEventPayload,
      secret: process.env.STRIPE_WEBHOOK_SECRET
    });

    // 1st Webhook delivery:
    const res6_first = await makeRequest(`/api/webhooks/stripe`, {
      method: 'POST',
      headers: {
        'stripe-signature': validSignature,
        'Content-Type': 'application/json'
      },
      body: rawEventPayload
    });
    assert.strictEqual(res6_first.status, 200, 'First webhook delivery should return 200 OK');

    // Verify invoice marked as Paid
    const invoiceBPaid = await Invoice.findById(invoiceB._id);
    assert.strictEqual(invoiceBPaid.status, 'Paid', 'Invoice status must now be Paid');
    assert.ok(invoiceBPaid.paidAt, 'Invoice must have paidAt timestamp');
    assert.strictEqual(invoiceBPaid.stripePaymentIntentId, 'pi_test_intent_id_1001');

    // Verify exactly 1 Payment record created
    const initialPaymentCount = await Payment.countDocuments({ stripeEventId: eventPayload.id });
    assert.strictEqual(initialPaymentCount, 1, 'Exactly 1 Payment record should exist');

    // 2nd Webhook delivery (Duplicate):
    const res6_second = await makeRequest(`/api/webhooks/stripe`, {
      method: 'POST',
      headers: {
        'stripe-signature': validSignature,
        'Content-Type': 'application/json'
      },
      body: rawEventPayload
    });
    assert.strictEqual(res6_second.status, 200, 'Duplicate webhook must return 200 OK without re-processing');

    const finalPaymentCount = await Payment.countDocuments({ stripeEventId: eventPayload.id });
    assert.strictEqual(finalPaymentCount, 1, 'Duplicate webhook must not create a duplicate Payment record');
    console.log(`${green}✓ Passed: Webhook confirmed payment & duplicate was safely deduplicated (Idempotent)${reset}\n`);
    passedTests++;

    // ----------------------------------------------------
    // TEST 7: Cross-User PDF Access
    // ----------------------------------------------------
    console.log(`[TEST 7] Cross-User PDF Access -> Client A attempts GET /api/invoices/${paidInvoiceB._id}/receipt`);
    const res7 = await makeRequest(`/api/invoices/${paidInvoiceB._id}/receipt`, {
      headers: { Authorization: `Bearer ${tokenA}` }
    });
    assert.strictEqual(res7.status, 403, 'Should reject unauthorized PDF receipt download with 403 Forbidden');
    assert.strictEqual(res7.data.success, false);
    console.log(`${green}✓ Passed: Cross-user receipt download blocked with 403 Forbidden${reset}\n`);
    passedTests++;

    // ----------------------------------------------------
    // TEST 8: Admin Authorization & RBAC
    // ----------------------------------------------------
    console.log(`[TEST 8] Admin Authorization -> Regular Client A attempts GET /api/admin/invoices`);
    const res8_client = await makeRequest(`/api/admin/invoices`, {
      headers: { Authorization: `Bearer ${tokenA}` }
    });
    assert.strictEqual(res8_client.status, 403, 'Regular client must receive 403 Forbidden on admin endpoint');

    console.log(`[TEST 8.1] Admin User access -> Admin attempts GET /api/admin/invoices`);
    const res8_admin = await makeRequest(`/api/admin/invoices`, {
      headers: { Authorization: `Bearer ${tokenAdmin}` }
    });
    assert.strictEqual(res8_admin.status, 200, 'Admin must receive 200 OK on admin endpoint');
    assert.ok(Array.isArray(res8_admin.data.data), 'Admin should receive list of all invoices');
    console.log(`${green}✓ Passed: Role-based Access Control correctly enforced${reset}\n`);
    passedTests++;

    console.log(`${green}====================================================${reset}`);
    console.log(`${green} ALL 8 ZERO-TRUST SECURITY TEST CASES PASSED (${passedTests}/${totalTests}) ${reset}`);
    console.log(`${green}====================================================${reset}`);

  } catch (error) {
    console.error(`${red}Security test suite failed:${reset}`, error);
    process.exitCode = 1;
  } finally {
    if (server) server.close();
    await disconnectDB();
  }
}

runSecurityTestSuite();
