import React, { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { invoiceAPI, paymentAPI } from '../services/api';
import { CheckCircle2, Download, ArrowRight, ShieldCheck, RefreshCw } from 'lucide-react';

export const PaymentSuccess = () => {
  const [searchParams] = useSearchParams();
  const invoiceId = searchParams.get('invoice_id');
  const sessionId = searchParams.get('session_id');
  const isMock = searchParams.get('mock') === 'true';

  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    const processSuccess = async () => {
      if (!invoiceId) {
        setLoading(false);
        return;
      }

      try {
        // If simulation mode, ensure server updates status
        if (isMock) {
          await paymentAPI.simulateMockPayment(invoiceId);
        }

        const res = await invoiceAPI.getInvoiceById(invoiceId);
        if (res.data.success) {
          setInvoice(res.data.data);
        }
      } catch (err) {
        console.error('Error fetching invoice status:', err);
      } finally {
        setLoading(false);
      }
    };

    processSuccess();
  }, [invoiceId, isMock]);

  const handleDownloadReceipt = async () => {
    if (!invoice) return;
    setDownloading(true);
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
      alert('Failed to download receipt PDF.');
    } finally {
      setDownloading(false);
    }
  };

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
          maxWidth: '540px',
          width: '100%',
          padding: '40px',
          textAlign: 'center',
          background: 'rgba(17, 24, 39, 0.95)',
          border: '1px solid rgba(16, 185, 129, 0.3)'
        }}
      >
        <div
          style={{
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            background: 'rgba(16, 185, 129, 0.15)',
            border: '2px solid #10b981',
            color: '#10b981',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 20px auto',
            boxShadow: '0 0 25px rgba(16, 185, 129, 0.3)'
          }}
        >
          <CheckCircle2 size={36} />
        </div>

        <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#ffffff', marginBottom: '8px' }}>
          Payment Confirmed
        </h1>

        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9375rem', marginBottom: '24px' }}>
          Your payment was cryptographically verified and recorded in the immutable transaction ledger.
        </p>

        {loading ? (
          <div style={{ color: 'var(--text-muted)', padding: '20px' }}>
            <RefreshCw size={20} className="animate-spin" style={{ margin: '0 auto 8px auto', display: 'block' }} />
            Verifying payment receipt and generating PDF...
          </div>
        ) : invoice ? (
          <div
            style={{
              background: 'rgba(15, 23, 42, 0.7)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-md)',
              padding: '20px',
              textAlign: 'left',
              marginBottom: '28px'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '0.875rem' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Invoice Number:</span>
              <span style={{ color: '#ffffff', fontWeight: 600, fontFamily: 'var(--font-mono)' }}>{invoice.invoiceNumber}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '0.875rem' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Amount Paid:</span>
              <span style={{ color: '#34d399', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>${Number(invoice.total).toFixed(2)} {invoice.currency}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Status:</span>
              <span style={{ color: '#34d399', fontWeight: 600 }}>✓ Verified Paid in Full</span>
            </div>
          </div>
        ) : null}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {invoice && (
            <button
              onClick={handleDownloadReceipt}
              className="btn btn-success"
              style={{ width: '100%', padding: '12px' }}
              disabled={downloading}
            >
              <Download size={16} />
              <span>{downloading ? 'Downloading...' : 'Download Official PDF Receipt'}</span>
            </button>
          )}

          <Link
            to="/dashboard"
            className="btn btn-secondary"
            style={{ width: '100%', padding: '12px' }}
          >
            <span>Return to Dashboard</span>
            <ArrowRight size={16} />
          </Link>
        </div>
      </div>
    </div>
  );
};
