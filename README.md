# Nexus Corporate Billing System

> **Production-Ready Full-Stack Billing Platform** featuring **Zero-Trust API Architecture**, **Server-to-Server Stripe Webhook Processing with Cryptographic HMAC Signature Verification & Idempotency**, and **Automated Branded PDF Receipt Generation & Transactional Email Delivery**.

---

## Table of Contents

1. [System Overview & Key Features](#1-system-overview--key-features)
2. [Security & Zero-Trust Architecture](#2-security--zero-trust-architecture)
3. [IDOR Prevention Mechanism](#3-idor-prevention-mechanism)
4. [Stripe Webhook Cryptography & Idempotency](#4-stripe-webhook-cryptography--idempotency)
5. [Automated PDF Receipt & Email Delivery Flow](#5-automated-pdf-receipt--email-delivery-flow)
6. [Technology Stack](#6-technology-stack)
7. [Project Structure](#7-project-structure)
8. [Environment Variables Reference](#8-environment-variables-reference)
9. [Installation & Local Setup](#9-installation--local-setup)
10. [Stripe CLI Setup for Local Development](#10-stripe-cli-setup-for-local-development)
11. [Running the Application](#11-running-the-application)
12. [API Reference Documentation](#12-api-reference-documentation)
13. [Critical Security Test Cases & Execution](#13-critical-security-test-cases--execution)
14. [Production Deployment Guidelines](#14-production-deployment-guidelines)

---

## 1. System Overview & Key Features

**Nexus Corporate Billing** is engineered for mission-critical enterprise financial workflows. Unlike naive billing applications that trust client-side data for prices, statuses, or user ownership, Nexus implements a strict **Zero-Trust paradigm**:

* **Zero-Trust Calculations**: Invoices, line items, taxes, totals, and client associations are strictly calculated and enforced on the Node.js server.
* **IDOR Immunity**: Complete isolation between client tenants. Parameterized endpoints (`/api/invoices/:id`, `/api/invoices/:id/receipt`) verify cryptographic token claims against database ownership records, returning `403 Forbidden` with zero metadata leakage on tampering.
* **Stripe Server-to-Server Webhook Integrity**: Invoices can **only** transition to `Paid` through authenticated Stripe Webhook events signed with HMAC-SHA256 secrets.
* **Webhook Idempotency**: Prevents double-billing and duplicate receipt generation using unique `stripeEventId` indexing.
* **Vector Branded PDF Receipts**: Generates high-fidelity PDF receipts via `PDFKit` containing the corporate logo, client metadata, line items breakdown, financial summary, and a distinctive `PAID IN FULL` security stamp.
* **Automated Transactional Emails**: Dispatches official PDF receipts to the verified client email via `Nodemailer` with resilient error handling that never invalidates confirmed payments.
* **Security Showcase / Testing Suite**: Built-in automated testing suite covering all 8 mandatory security attack vectors + interactive in-browser security playground.

---

## 2. Security & Zero-Trust Architecture

```
                  ┌────────────────────────┐
                  │      React Client      │
                  └───────────┬────────────┘
                              │
                    Bearer JWT in Header
                              │
                              ▼
                  ┌────────────────────────┐
                  │   Express API Gateway  │
                  │ (Helmet + Rate Limiter)│
                  └───────────┬────────────┘
                              │
           ┌──────────────────┴──────────────────┐
           │                                     │
           ▼                                     ▼
 ┌───────────────────┐                 ┌───────────────────┐
 │   authMiddleware  │                 │  Webhook Receiver │
 │  - Verifies JWT   │                 │ - Raw Body Parser │
 │  - Validates User │                 │ - HMAC Signature  │
 └─────────┬─────────┘                 └─────────┬─────────┘
           │                                     │
           ▼                                     ▼
 ┌───────────────────┐                 ┌───────────────────┐
 │ownershipMiddleware│                 │Idempotency Barrier│
 │ - IDOR Prevention │                 │ - stripeEventId   │
 │ - Tenant Isolation│                 └─────────┬─────────┘
 └─────────┬─────────┘                           │
           │                                     ▼
           ▼                           ┌───────────────────┐
 ┌───────────────────┐                 │  Invoice -> PAID  │
 │  MongoDB Database │                 │  + PDF Generation │
 │(Protected Entities│                 │  + Email Delivery │
 └───────────────────┘                 └───────────────────┘
```

---

## 3. IDOR Prevention Mechanism

**Insecure Direct Object Reference (IDOR)** is eliminated at the middleware layer before any controller logic executes:

1. **Authentication**: `authMiddleware` extracts and verifies the JWT, attaching `req.user = { userId, role, email, name }`.
2. **Database Verification**: `verifyInvoiceOwnership` queries MongoDB using `Invoice.findById(req.params.id)`.
3. **Strict Comparison**:
   ```javascript
   const isOwner = invoice.clientId.toString() === req.user.userId;
   const isAdmin = req.user.role === 'admin';

   if (!isOwner && !isAdmin) {
     logger.security('IDOR prevention triggered: Unauthorized invoice access attempt', {
       authenticatedUser: req.user.userId,
       targetInvoiceId: req.params.id,
       actualInvoiceOwner: invoice.clientId.toString()
     });

     return res.status(403).json({
       success: false,
       message: 'You are not authorized to access this invoice'
     });
   }
   ```
4. **No Information Leakage**: The response does not reveal whether the target ID belongs to another tenant or if it exists.

---

## 4. Stripe Webhook Cryptography & Idempotency

### Raw Body Preservation

Stripe signature verification requires the exact, unaltered raw byte stream sent over HTTP. Standard `express.json()` alters byte representations. Nexus routes `/api/webhooks/stripe` with `express.raw({ type: 'application/json' })`:

```javascript
event = stripe.webhooks.constructEvent(
  req.rawBody || req.body,
  req.headers['stripe-signature'],
  process.env.STRIPE_WEBHOOK_SECRET
);
```

### Idempotency Strategy

Stripe webhooks may be delivered multiple times due to network retries. Nexus creates a unique index on `Payment.stripeEventId`:

```javascript
const existingPayment = await Payment.findOne({ stripeEventId: event.id });
if (existingPayment) {
  logger.info('Webhook idempotency: Event already processed, returning 200', {
    eventId: event.id
  });
  return res.status(200).json({ received: true, duplicate: true });
}
```

This guarantees that:
* Only **one** database payment record is inserted.
* Only **one** PDF receipt is generated.
* Only **one** email is dispatched.

---

## 5. Automated PDF Receipt & Email Delivery Flow

```
   Stripe Checkout Completed
              │
              ▼
   Webhook Signature Verified
              │
              ▼
    Check Event Idempotency
              │
              ▼
      Invoice.status = 'Paid'
      Invoice.paidAt = Date.now()
              │
              ├─────────────────────────────────┐
              ▼                                 ▼
   Generate PDFKit Receipt             Save PDF to Disk
   - Nexus Corporate Branding          /server/uploads/receipts/
   - Line Items & Financial Summary
   - Prominent PAID Seal
              │
              ▼
    Nodemailer Email Service
    - Recipient: Database Client Email (Zero Trust)
    - Attachment: payment-receipt-INV-XXXX.pdf
              │
              ▼
    Client Receives Official Proof of Payment
```

---

## 6. Technology Stack

### Backend
* **Runtime**: Node.js (ES Modules)
* **Framework**: Express.js
* **Database**: MongoDB & Mongoose (with embedded `mongodb-memory-server` support)
* **Authentication**: JSON Web Tokens (`jsonwebtoken`) & `bcryptjs`
* **Payment Gateway**: Stripe SDK (`stripe`)
* **Document Engine**: `PDFKit`
* **Email Service**: `Nodemailer`
* **Validation**: `Zod`
* **Security Middleware**: `helmet`, `express-rate-limit`, `cors`

### Frontend
* **Framework**: React 18 with Vite
* **Routing**: React Router 6
* **HTTP Client**: Axios with Bearer Interceptors
* **Icons**: Lucide React
* **Styling**: Modern Custom Corporate Design System (CSS Variables, Glassmorphism, Micro-animations)

---

## 7. Project Structure

```text
nexus-corporate/
├── client/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Navbar.jsx
│   │   │   ├── Sidebar.jsx
│   │   │   ├── InvoiceStatusBadge.jsx
│   │   │   └── PaidStamp.jsx
│   │   ├── context/
│   │   │   └── AuthContext.jsx
│   │   ├── pages/
│   │   │   ├── Login.jsx
│   │   │   ├── Register.jsx
│   │   │   ├── Dashboard.jsx
│   │   │   ├── InvoicesList.jsx
│   │   │   ├── CreateInvoice.jsx
│   │   │   ├── InvoiceDetail.jsx
│   │   │   ├── PaymentSuccess.jsx
│   │   │   ├── PaymentCancel.jsx
│   │   │   ├── AdminDashboard.jsx
│   │   │   └── SecurityShowcase.jsx
│   │   ├── services/
│   │   │   └── api.js
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   └── index.css
│   ├── index.html
│   ├── package.json
│   └── vite.config.js
│
├── server/
│   ├── config/
│   │   ├── db.js
│   │   └── stripe.js
│   ├── controllers/
│   │   ├── authController.js
│   │   ├── invoiceController.js
│   │   ├── paymentController.js
│   │   ├── webhookController.js
│   │   └── adminController.js
│   ├── middleware/
│   │   ├── authMiddleware.js
│   │   ├── ownershipMiddleware.js
│   │   ├── roleMiddleware.js
│   │   ├── errorMiddleware.js
│   │   └── validationMiddleware.js
│   ├── models/
│   │   ├── User.js
│   │   ├── Invoice.js
│   │   └── Payment.js
│   ├── routes/
│   │   ├── authRoutes.js
│   │   ├── invoiceRoutes.js
│   │   ├── paymentRoutes.js
│   │   ├── webhookRoutes.js
│   │   └── adminRoutes.js
│   ├── services/
│   │   ├── pdfService.js
│   │   ├── emailService.js
│   │   └── paymentService.js
│   ├── utils/
│   │   ├── generateToken.js
│   │   └── logger.js
│   ├── tests/
│   │   └── security.test.js
│   ├── uploads/receipts/
│   ├── .env.example
│   ├── .env
│   ├── server.js
│   └── package.json
│
└── README.md
```

---

## 8. Environment Variables Reference

Create a `.env` file in `server/` with the following configuration:

```env
# Server Port & Environment
PORT=5000
NODE_ENV=development

# MongoDB Connection String (Local, Atlas, or auto-fallback to in-memory)
MONGO_URI=mongodb://127.0.0.1:27017/nexus_corporate

# JWT Secret & Expiry
JWT_SECRET=nexus_corporate_super_secret_jwt_key_2026_production_grade
JWT_EXPIRES_IN=1d

# Stripe Payment Gateway
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Frontend Client URL (For CORS & Stripe Redirects)
CLIENT_URL=http://localhost:5173

# Nodemailer SMTP Configuration (Optional: defaults to Ethereal/Mock transporter)
SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASSWORD=
SMTP_FROM="Nexus Corporate Billing" <billing@nexuscorporate.com>

# Nexus Branding
NEXUS_CORPORATE_LOGO_URL=
```

---

## 9. Installation & Local Setup

### 1. Clone & Navigate to Repository
```bash
cd "nexus-corporate"
```

### 2. Install Server Dependencies
```bash
cd server
npm install
```

### 3. Install Client Dependencies
```bash
cd ../client
npm install
```

---

## 10. Stripe CLI Setup for Local Development

To forward Stripe webhook events to your local server:

1. **Install Stripe CLI**: Follow instructions at [stripe.com/docs/stripe-cli](https://stripe.com/docs/stripe-cli).
2. **Login to your Stripe Account**:
   ```bash
   stripe login
   ```
3. **Listen and Forward Webhooks**:
   ```bash
   stripe listen --forward-to localhost:5000/api/webhooks/stripe
   ```
4. Copy the webhook signing secret outputted by the CLI (e.g. `whsec_abc123...`) and update your `.env`:
   ```env
   STRIPE_WEBHOOK_SECRET=whsec_abc123...
   ```

---

## 11. Running the Application

### Start the Backend Server:
```bash
cd server
npm run dev
```
*API Server will start on `http://localhost:5000`*.

### Start the Frontend Client:
```bash
cd client
npm run dev
```
*React Client will start on `http://localhost:5173`*.

### Demo User Accounts (Pre-configured in UI):
* **Client A**: `clientA@corporate.com` / `SecurePassword123!`
* **Admin**: `admin@nexuscorporate.com` / `SuperAdminPassword123!`

---

## 12. API Reference Documentation

| Method | Endpoint | Access | Description |
|---|---|---|---|
| `POST` | `/api/auth/register` | Public | Register new client or admin account |
| `POST` | `/api/auth/login` | Public | Authenticate user & receive JWT token |
| `GET` | `/api/auth/me` | JWT | Get current authenticated user profile |
| `GET` | `/api/invoices` | JWT (Tenant) | List all invoices for authenticated client |
| `POST` | `/api/invoices` | JWT (Tenant) | Create invoice (server computes amounts) |
| `GET` | `/api/invoices/:id` | JWT + IDOR Check | Get itemized invoice details |
| `PUT` | `/api/invoices/:id` | JWT + IDOR Check | Update invoice description / items |
| `DELETE`| `/api/invoices/:id` | JWT + IDOR Check | Delete pending invoice |
| `GET` | `/api/invoices/:id/receipt` | JWT + IDOR Check | Download official signed PDF receipt |
| `POST` | `/api/payments/create-checkout-session` | JWT + IDOR Check | Initiate Stripe Checkout session |
| `POST` | `/api/payments/simulate-mock-payment` | JWT (Dev Only) | Instant webhook simulation for development |
| `POST` | `/api/webhooks/stripe` | Public (HMAC Verified) | Stripe server-to-server webhook listener |
| `GET` | `/api/admin/invoices` | JWT (Admin Only) | View all invoices across all tenants |
| `GET` | `/api/admin/users` | JWT (Admin Only) | View all registered client accounts |
| `GET` | `/api/admin/metrics` | JWT (Admin Only) | Get system revenue & tenant metrics |

---

## 13. Critical Security Test Cases & Execution

Nexus includes an automated test runner (`server/tests/security.test.js`) verifying all 8 security requirements:

```bash
cd server
npm test
```

### Test Suite Execution Output:

```text
====================================================
 NEXUS CORPORATE BILLING: ZERO-TRUST SECURITY SUITE 
====================================================

[TEST 1] Missing JWT -> GET /api/invoices/:id
✓ Passed: Rejected with 401 Unauthorized

[TEST 2] Invalid JWT -> GET /api/invoices/:id with forged token
✓ Passed: Rejected forged token with 401 Unauthorized

[TEST 3] IDOR Attack -> Client A requests Client B's invoice
✓ Passed: IDOR blocked with 403 Forbidden & Zero data leakage

[TEST 4] Fake Payment Attempt -> Client B attempts PUT with { status: "Paid" }
✓ Passed: Client-side payment status tampering prevented (Invoice remains Pending)

[TEST 5] Fake Webhook -> POST /api/webhooks/stripe with invalid signature
✓ Passed: Invalid webhook rejected with 400 Bad Request

[TEST 6] Stripe Webhook Idempotency -> Sending valid Stripe Event twice
✓ Passed: Webhook confirmed payment & duplicate was safely deduplicated (Idempotent)

[TEST 7] Cross-User PDF Access -> Client A attempts GET /api/invoices/:id/receipt
✓ Passed: Cross-user receipt download blocked with 403 Forbidden

[TEST 8] Admin Authorization -> Regular Client A attempts GET /api/admin/invoices
✓ Passed: Role-based Access Control correctly enforced

====================================================
 ALL 8 ZERO-TRUST SECURITY TEST CASES PASSED (8/8) 
====================================================
```

---

## 14. Production Deployment Guidelines

1. **Environment Configuration**: Ensure `NODE_ENV=production` is set and secrets are stored in a secure secret manager (e.g., AWS Secrets Manager, Doppler, or HashiCorp Vault).
2. **Reverse Proxy & SSL**: Terminate TLS using Nginx or Cloudflare with HTTP/2 and HSTS enabled.
3. **Database Cluster**: Use MongoDB Atlas with replica sets and IP access lists.
4. **Cloud Storage (Optional)**: Export generated PDF receipts from `/server/uploads/receipts` to an S3 bucket with private ACLs and pre-signed URLs.
5. **Monitoring**: Structured logs are emitted by `server/utils/logger.js` with all sensitive keys (passwords, tokens, Stripe secrets) automatically sanitized for ingestion into Datadog, CloudWatch, or Elasticsearch.
