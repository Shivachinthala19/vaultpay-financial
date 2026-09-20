import React from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { XCircle, ArrowLeft, RefreshCw } from 'lucide-react';

export const PaymentCancel = () => {
  const [searchParams] = useSearchParams();
  const invoiceId = searchParams.get('invoice_id');

  return (
    <div
      className="animate-fade-in"
      style={{
        minHeight: '80vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px'
      }}
    >
      <div
        className="glass-panel"
        style={{
          maxWidth: '500px',
          width: '100%',
          padding: '40px',
          textAlign: 'center',
          background: 'rgba(17, 24, 39, 0.95)',
          border: '1px solid rgba(245, 158, 11, 0.3)'
        }}
      >
        <div
          style={{
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            background: 'rgba(245, 158, 11, 0.15)',
            border: '2px solid #f59e0b',
            color: '#fbbf24',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 20px auto'
          }}
        >
          <XCircle size={36} />
        </div>

        <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#ffffff', marginBottom: '8px' }}>
          Payment Cancelled
        </h1>

        <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '28px' }}>
          The Stripe checkout session was cancelled. No charges were made to your card, and your invoice remains pending.
        </p>

        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
          {invoiceId ? (
            <Link to={`/invoices/${invoiceId}`} className="btn btn-primary" style={{ padding: '10px 18px' }}>
              <RefreshCw size={15} />
              <span>Retry Payment</span>
            </Link>
          ) : null}
          <Link to="/invoices" className="btn btn-secondary" style={{ padding: '10px 18px' }}>
            <ArrowLeft size={15} />
            <span>View Invoices</span>
          </Link>
        </div>
      </div>
    </div>
  );
};
