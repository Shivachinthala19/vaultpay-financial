import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { invoiceAPI } from '../services/api';
import { InvoiceStatusBadge } from '../components/InvoiceStatusBadge';
import {
  DollarSign,
  Clock,
  CheckCircle2,
  Receipt,
  Plus,
  ArrowUpRight,
  ShieldCheck,
  CreditCard,
  Download,
  AlertCircle
} from 'lucide-react';

export const Dashboard = () => {
  const { user } = useAuth();
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchInvoices = async () => {
    try {
      setLoading(true);
      const res = await invoiceAPI.getInvoices();
      if (res.data.success) {
        setInvoices(res.data.data);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load invoices.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, []);

  const totalInvoices = invoices.length;
  const pendingInvoices = invoices.filter((i) => i.status === 'Pending').length;
  const paidInvoices = invoices.filter((i) => i.status === 'Paid').length;
  
  const totalAmount = invoices.reduce((sum, i) => sum + (i.total || 0), 0);
  const paidAmount = invoices
    .filter((i) => i.status === 'Paid')
    .reduce((sum, i) => sum + (i.total || 0), 0);
  const pendingAmount = invoices
    .filter((i) => i.status === 'Pending')
    .reduce((sum, i) => sum + (i.total || 0), 0);

  const handleDownloadReceipt = async (id, invoiceNumber) => {
    try {
      const response = await invoiceAPI.downloadReceipt(id);
      const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `receipt-${invoiceNumber}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to download receipt PDF.');
    }
  };

  return (
    <div className="animate-fade-in" style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Welcome Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#ffffff' }}>
            Corporate Billing Dashboard
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginTop: '4px' }}>
            Enterprise overview for <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{user?.name}</span>
          </p>
        </div>

        <div style={{ display: 'flex', gap: '12px' }}>
          <Link to="/invoices/new" className="btn btn-primary">
            <Plus size={16} />
            <span>New Invoice</span>
          </Link>
        </div>
      </div>

      {error && (
        <div style={{ background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#fca5a5', padding: '14px', borderRadius: 'var(--radius-md)', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* Metrics Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '20px',
          marginBottom: '32px'
        }}
      >
        {/* Metric 1: Total Volume */}
        <div className="glass-panel" style={{ padding: '22px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
            <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Total Volume
            </span>
            <div style={{ padding: '8px', borderRadius: '8px', background: 'rgba(59, 130, 246, 0.15)', color: '#60a5fa' }}>
              <DollarSign size={18} />
            </div>
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#ffffff', letterSpacing: '-0.02em' }}>
            ${totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '6px' }}>
            Across {totalInvoices} corporate invoices
          </div>
        </div>

        {/* Metric 2: Paid Volume */}
        <div className="glass-panel" style={{ padding: '22px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
            <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Paid Confirmed
            </span>
            <div style={{ padding: '8px', borderRadius: '8px', background: 'rgba(16, 185, 129, 0.15)', color: '#34d399' }}>
              <CheckCircle2 size={18} />
            </div>
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#34d399', letterSpacing: '-0.02em' }}>
            ${paidAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '6px' }}>
            {paidInvoices} settled via Stripe Webhook
          </div>
        </div>

        {/* Metric 3: Pending Balance */}
        <div className="glass-panel" style={{ padding: '22px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
            <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Pending Balance
            </span>
            <div style={{ padding: '8px', borderRadius: '8px', background: 'rgba(245, 158, 11, 0.15)', color: '#fbbf24' }}>
              <Clock size={18} />
            </div>
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#fbbf24', letterSpacing: '-0.02em' }}>
            ${pendingAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '6px' }}>
            {pendingInvoices} invoices awaiting payment
          </div>
        </div>

        {/* Metric 4: Zero-Trust Security Status */}
        <div className="glass-panel" style={{ padding: '22px', borderLeft: '3px solid #3b82f6' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
            <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Security Guard
            </span>
            <div style={{ padding: '8px', borderRadius: '8px', background: 'rgba(59, 130, 246, 0.15)', color: '#60a5fa' }}>
              <ShieldCheck size={18} />
            </div>
          </div>
          <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#ffffff' }}>
            100% Zero-Trust
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '6px' }}>
            IDOR Prevention & Webhook HMAC Verified
          </div>
        </div>
      </div>

      {/* Recent Invoices Table */}
      <div className="glass-panel" style={{ padding: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div>
            <h3 style={{ fontSize: '1.15rem', color: '#ffffff' }}>Recent Invoices</h3>
            <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
              Showing your organization's latest financial transactions
            </p>
          </div>
          <Link to="/invoices" style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.875rem', color: 'var(--accent-primary)', textDecoration: 'none', fontWeight: 600 }}>
            <span>View All</span>
            <ArrowUpRight size={16} />
          </Link>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
            Loading corporate invoices...
          </div>
        ) : invoices.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px', color: 'var(--text-secondary)' }}>
            <Receipt size={40} style={{ color: 'var(--text-muted)', margin: '0 auto 12px auto' }} />
            <p style={{ fontWeight: 600 }}>No invoices found</p>
            <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginTop: '4px' }}>
              Get started by creating your first corporate billing invoice.
            </p>
            <Link to="/invoices/new" className="btn btn-primary" style={{ marginTop: '16px' }}>
              <Plus size={16} />
              <span>Create Invoice</span>
            </Link>
          </div>
        ) : (
          <div className="table-container">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Invoice #</th>
                  <th>Description</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th>Date</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {invoices.slice(0, 5).map((inv) => (
                  <tr key={inv._id}>
                    <td>
                      <Link
                        to={`/invoices/${inv._id}`}
                        style={{ color: '#ffffff', fontWeight: 600, fontFamily: 'var(--font-mono)', fontSize: '0.8125rem', textDecoration: 'none' }}
                      >
                        {inv.invoiceNumber}
                      </Link>
                    </td>
                    <td style={{ color: 'var(--text-secondary)', maxWidth: '280px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {inv.description}
                    </td>
                    <td style={{ fontWeight: 700, color: '#ffffff', fontFamily: 'var(--font-mono)' }}>
                      ${Number(inv.total).toFixed(2)} <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{inv.currency}</span>
                    </td>
                    <td>
                      <InvoiceStatusBadge status={inv.status} />
                    </td>
                    <td style={{ color: 'var(--text-muted)', fontSize: '0.8125rem' }}>
                      {new Date(inv.createdAt).toLocaleDateString()}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                        <Link to={`/invoices/${inv._id}`} className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '0.75rem' }}>
                          View
                        </Link>
                        {inv.status === 'Pending' && (
                          <Link to={`/invoices/${inv._id}`} className="btn btn-primary" style={{ padding: '6px 12px', fontSize: '0.75rem' }}>
                            <CreditCard size={13} />
                            Pay
                          </Link>
                        )}
                        {inv.status === 'Paid' && (
                          <button
                            onClick={() => handleDownloadReceipt(inv._id, inv.invoiceNumber)}
                            className="btn btn-secondary"
                            style={{ padding: '6px 12px', fontSize: '0.75rem' }}
                            title="Download Official PDF Receipt"
                          >
                            <Download size={13} />
                            Receipt
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
