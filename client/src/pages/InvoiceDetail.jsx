import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { invoiceAPI, paymentAPI } from '../services/api';
import { InvoiceStatusBadge } from '../components/InvoiceStatusBadge';
import { PaidStamp } from '../components/PaidStamp';
import {
  ArrowLeft,
  CreditCard,
  Download,
  ShieldCheck,
  Building2,
  Calendar,
  DollarSign,
  AlertOctagon,
  Sparkles,
  RefreshCw
} from 'lucide-react';

export const InvoiceDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  const fetchInvoice = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await invoiceAPI.getInvoiceById(id);
      if (res.data.success) {
        setInvoice(res.data.data);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load invoice details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoice();
  }, [id]);

  const handleStripeCheckout = async () => {
    setIsProcessingPayment(true);
    try {
      const res = await paymentAPI.createCheckoutSession(invoice._id);
      if (res.data.success && res.data.data.url) {
        // Redirect to Stripe checkout
        window.location.href = res.data.data.url;
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to initiate Stripe Checkout session.');
      setIsProcessingPayment(false);
    }
  };

  const handleSimulatePayment = async () => {
    setIsProcessingPayment(true);
    try {
      const res = await paymentAPI.simulateMockPayment(invoice._id);
      if (res.data.success) {
        await fetchInvoice();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Simulation failed.');
    } finally {
      setIsProcessingPayment(false);
    }
  };

  const handleDownloadReceipt = async () => {
    setIsDownloading(true);
    try {
      const response = await invoiceAPI.downloadReceipt(invoice._id);
      const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `receipt-${invoice.invoiceNumber}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      alert(err.response?.data?.message || 'Receipt download failed.');
    } finally {
      setIsDownloading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '100px 20px', color: 'var(--text-muted)' }}>
        <RefreshCw size={28} className="animate-spin" style={{ margin: '0 auto 16px auto', display: 'block' }} />
        Verifying authorization & loading invoice...
      </div>
    );
  }

  if (error) {
    return (
      <div className="animate-fade-in" style={{ padding: '40px 24px', maxWidth: '600px', margin: '0 auto', textAlign: 'center' }}>
        <div className="glass-panel" style={{ padding: '36px', border: '1px solid rgba(239, 68, 68, 0.4)' }}>
          <AlertOctagon size={48} style={{ color: '#ef4444', margin: '0 auto 16px auto' }} />
          <h2 style={{ fontSize: '1.4rem', color: '#ffffff', marginBottom: '8px' }}>Access Prohibited (IDOR Blocked)</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '24px' }}>
            {error}
          </p>
          <div style={{ background: 'rgba(239, 68, 68, 0.1)', padding: '12px', borderRadius: 'var(--radius-md)', fontSize: '0.75rem', color: '#fca5a5', marginBottom: '24px', textAlign: 'left' }}>
            <strong>Zero-Trust Security Enforcement:</strong> The server verified that you do not hold ownership rights for this invoice record. No data or metadata was leaked.
          </div>
          <Link to="/invoices" className="btn btn-primary">
            <ArrowLeft size={15} />
            <span>Return to Invoices</span>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in" style={{ padding: '24px', maxWidth: '900px', margin: '0 auto' }}>
      {/* Navigation Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <button
          type="button"
          onClick={() => navigate('/invoices')}
          className="btn btn-secondary"
          style={{ padding: '6px 12px', fontSize: '0.8125rem' }}
        >
          <ArrowLeft size={14} />
          <span>Back to Invoices</span>
        </button>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          {invoice.status === 'Pending' && (
            <>
              <button
                onClick={handleSimulatePayment}
                className="btn btn-secondary"
                style={{ fontSize: '0.8125rem', borderColor: '#3b82f6', color: '#60a5fa' }}
                disabled={isProcessingPayment}
                title="Instant Server Webhook Simulator"
              >
                <Sparkles size={14} />
                <span>Simulate Webhook Payment</span>
              </button>

              <button
                onClick={handleStripeCheckout}
                className="btn btn-primary"
                disabled={isProcessingPayment}
              >
                <CreditCard size={16} />
                <span>{isProcessingPayment ? 'Initiating Stripe...' : 'Pay with Stripe Checkout'}</span>
              </button>
            </>
          )}

          {invoice.status === 'Paid' && (
            <button
              onClick={handleDownloadReceipt}
              className="btn btn-success"
              disabled={isDownloading}
            >
              <Download size={16} />
              <span>{isDownloading ? 'Generating PDF...' : 'Download PDF Receipt'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Invoice Main Panel */}
      <div className="glass-panel" style={{ padding: '36px', position: 'relative', overflow: 'hidden' }}>
        {/* Top Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '24px', marginBottom: '28px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
              <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#ffffff' }}>
                {invoice.invoiceNumber}
              </h1>
              <InvoiceStatusBadge status={invoice.status} />
            </div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
              {invoice.description || 'Nexus Corporate Enterprise Billing'}
            </p>
          </div>

          {/* Paid Seal or Status Badge */}
          {invoice.status === 'Paid' && (
            <PaidStamp transactionId={invoice.stripePaymentIntentId} paidAt={invoice.paidAt} />
          )}
        </div>

        {/* Invoice Metadata Info Grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '20px',
            marginBottom: '32px',
            background: 'rgba(15, 23, 42, 0.5)',
            padding: '20px',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-subtle)'
          }}
        >
          <div>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '4px' }}>
              Client Reference
            </div>
            <div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#ffffff' }}>
              Account #{invoice.clientId}
            </div>
          </div>

          <div>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '4px' }}>
              Date Created
            </div>
            <div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#ffffff' }}>
              {new Date(invoice.createdAt).toLocaleDateString('en-US', { dateStyle: 'long' })}
            </div>
          </div>

          <div>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '4px' }}>
              Payment Status
            </div>
            <div style={{ fontSize: '0.875rem', fontWeight: 600, color: invoice.status === 'Paid' ? '#34d399' : '#fbbf24' }}>
              {invoice.status === 'Paid' ? `Paid on ${new Date(invoice.paidAt).toLocaleDateString()}` : 'Payment Pending'}
            </div>
          </div>

          {invoice.stripePaymentIntentId && (
            <div>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '4px' }}>
                Stripe Reference
              </div>
              <div style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)', color: 'var(--accent-cyan)' }}>
                {invoice.stripePaymentIntentId}
              </div>
            </div>
          )}
        </div>

        {/* Line Items Table */}
        <div style={{ marginBottom: '32px' }}>
          <h3 style={{ fontSize: '1rem', color: '#ffffff', marginBottom: '12px' }}>Itemized Breakdown</h3>
          <div className="table-container">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Description</th>
                  <th style={{ textAlign: 'center' }}>Qty</th>
                  <th style={{ textAlign: 'right' }}>Unit Price</th>
                  <th style={{ textAlign: 'right' }}>Total</th>
                </tr>
              </thead>
              <tbody>
                {invoice.items.map((item, idx) => (
                  <tr key={idx}>
                    <td style={{ color: '#ffffff', fontWeight: 500 }}>{item.description}</td>
                    <td style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>{item.quantity}</td>
                    <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>
                      ${Number(item.price).toFixed(2)}
                    </td>
                    <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 600, color: '#ffffff' }}>
                      ${Number(item.total).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Financial Summary Box */}
        <div
          style={{
            maxWidth: '350px',
            marginLeft: 'auto',
            background: 'rgba(15, 23, 42, 0.7)',
            padding: '20px',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-subtle)'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
            <span>Subtotal:</span>
            <span style={{ fontFamily: 'var(--font-mono)', color: '#ffffff' }}>${Number(invoice.subtotal).toFixed(2)}</span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
            <span>Taxes & Fees:</span>
            <span style={{ fontFamily: 'var(--font-mono)', color: '#ffffff' }}>${Number(invoice.tax).toFixed(2)}</span>
          </div>

          <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '10px', display: 'flex', justifyContent: 'space-between', fontSize: '1.2rem', fontWeight: 800 }}>
            <span style={{ color: '#ffffff' }}>Total:</span>
            <span style={{ color: 'var(--accent-primary)', fontFamily: 'var(--font-mono)' }}>
              ${Number(invoice.total).toFixed(2)} {invoice.currency || 'USD'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
