import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { invoiceAPI } from '../services/api';
import { InvoiceStatusBadge } from '../components/InvoiceStatusBadge';
import {
  Plus,
  Search,
  Filter,
  Download,
  CreditCard,
  Receipt,
  FileText,
  RefreshCw,
  Eye
} from 'lucide-react';

export const InvoicesList = () => {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const fetchInvoices = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await invoiceAPI.getInvoices();
      if (res.data.success) {
        setInvoices(res.data.data);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch invoices.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, []);

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

  const filteredInvoices = invoices.filter((inv) => {
    const matchesSearch =
      inv.invoiceNumber.toLowerCase().includes(search.toLowerCase()) ||
      (inv.description && inv.description.toLowerCase().includes(search.toLowerCase()));
    const matchesStatus = statusFilter === 'ALL' || inv.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="animate-fade-in" style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#ffffff' }}>
            Invoices Management
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginTop: '4px' }}>
            Manage, review, pay, and download cryptographically signed receipts
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={fetchInvoices} className="btn btn-secondary" title="Refresh Invoices">
            <RefreshCw size={15} />
            <span>Sync</span>
          </button>
          <Link to="/invoices/new" className="btn btn-primary">
            <Plus size={16} />
            <span>Create Invoice</span>
          </Link>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div
        className="glass-panel"
        style={{
          padding: '16px 20px',
          marginBottom: '24px',
          display: 'flex',
          flexWrap: 'wrap',
          gap: '16px',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: '1 1 300px', maxWidth: '450px' }}>
          <div style={{ position: 'relative', width: '100%' }}>
            <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              type="text"
              placeholder="Search by Invoice # or description..."
              className="form-input"
              style={{ paddingLeft: '38px' }}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Filter size={15} style={{ color: 'var(--text-muted)' }} />
          <span style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Status:</span>
          {['ALL', 'Pending', 'Paid', 'Failed'].map((status) => (
            <button
              key={status}
              type="button"
              onClick={() => setStatusFilter(status)}
              className="btn"
              style={{
                padding: '6px 12px',
                fontSize: '0.75rem',
                borderRadius: 'var(--radius-full)',
                background: statusFilter === status ? 'var(--accent-primary)' : 'var(--bg-input)',
                color: statusFilter === status ? '#ffffff' : 'var(--text-secondary)',
                border: statusFilter === status ? '1px solid var(--accent-primary)' : '1px solid var(--border-subtle)'
              }}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      {/* Invoices List Table */}
      <div className="glass-panel" style={{ padding: '20px' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '50px', color: 'var(--text-muted)' }}>
            Loading invoices from zero-trust repository...
          </div>
        ) : filteredInvoices.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-secondary)' }}>
            <FileText size={48} style={{ color: 'var(--text-muted)', margin: '0 auto 16px auto' }} />
            <h3 style={{ fontSize: '1.2rem', color: '#ffffff', marginBottom: '6px' }}>No matching invoices</h3>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
              Try adjusting your search criteria or create a new invoice.
            </p>
          </div>
        ) : (
          <div className="table-container">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Invoice #</th>
                  <th>Description</th>
                  <th>Items</th>
                  <th>Subtotal</th>
                  <th>Tax</th>
                  <th>Total Amount</th>
                  <th>Status</th>
                  <th>Date</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredInvoices.map((inv) => (
                  <tr key={inv._id}>
                    <td>
                      <Link
                        to={`/invoices/${inv._id}`}
                        style={{ color: '#60a5fa', fontWeight: 700, fontFamily: 'var(--font-mono)', fontSize: '0.8125rem', textDecoration: 'none' }}
                      >
                        {inv.invoiceNumber}
                      </Link>
                    </td>
                    <td style={{ maxWidth: '240px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--text-secondary)' }}>
                      {inv.description}
                    </td>
                    <td style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                      {inv.items?.length || 0} item(s)
                    </td>
                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                      ${Number(inv.subtotal).toFixed(2)}
                    </td>
                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                      ${Number(inv.tax).toFixed(2)}
                    </td>
                    <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: '#ffffff' }}>
                      ${Number(inv.total).toFixed(2)} <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{inv.currency}</span>
                    </td>
                    <td>
                      <InvoiceStatusBadge status={inv.status} />
                    </td>
                    <td style={{ color: 'var(--text-muted)', fontSize: '0.8125rem' }}>
                      {new Date(inv.createdAt).toLocaleDateString()}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                        <Link to={`/invoices/${inv._id}`} className="btn btn-secondary" style={{ padding: '6px 10px', fontSize: '0.75rem' }} title="View Details">
                          <Eye size={13} />
                          <span>View</span>
                        </Link>

                        {inv.status === 'Pending' && (
                          <Link to={`/invoices/${inv._id}`} className="btn btn-primary" style={{ padding: '6px 10px', fontSize: '0.75rem' }}>
                            <CreditCard size={13} />
                            <span>Pay</span>
                          </Link>
                        )}

                        {inv.status === 'Paid' && (
                          <button
                            onClick={() => handleDownloadReceipt(inv._id, inv.invoiceNumber)}
                            className="btn btn-success"
                            style={{ padding: '6px 10px', fontSize: '0.75rem' }}
                            title="Download Official PDF Receipt"
                          >
                            <Download size={13} />
                            <span>PDF</span>
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
