import React, { useState, useEffect } from 'react';
import { adminAPI } from '../services/api';
import { InvoiceStatusBadge } from '../components/InvoiceStatusBadge';
import {
  Building2,
  Users,
  DollarSign,
  Receipt,
  ShieldCheck,
  RefreshCw,
  Mail,
  Calendar
} from 'lucide-react';

export const AdminDashboard = () => {
  const [metrics, setMetrics] = useState(null);
  const [invoices, setInvoices] = useState([]);
  const [users, setUsers] = useState([]);
  const [activeTab, setActiveTab] = useState('invoices'); // 'invoices' | 'users'
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchAdminData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [metricsRes, invoicesRes, usersRes] = await Promise.all([
        adminAPI.getMetrics(),
        adminAPI.getAllInvoices(),
        adminAPI.getAllUsers()
      ]);

      if (metricsRes.data.success) setMetrics(metricsRes.data.data);
      if (invoicesRes.data.success) setInvoices(invoicesRes.data.data);
      if (usersRes.data.success) setUsers(usersRes.data.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Access Denied: Admin authorization required.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminData();
  }, []);

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '100px 20px', color: 'var(--text-muted)' }}>
        <RefreshCw size={28} className="animate-spin" style={{ margin: '0 auto 16px auto', display: 'block' }} />
        Authenticating administrator role & aggregating system data...
      </div>
    );
  }

  if (error) {
    return (
      <div className="animate-fade-in" style={{ padding: '40px 24px', maxWidth: '600px', margin: '0 auto', textAlign: 'center' }}>
        <div className="glass-panel" style={{ padding: '36px', border: '1px solid rgba(239, 68, 68, 0.4)' }}>
          <Building2 size={48} style={{ color: '#ef4444', margin: '0 auto 16px auto' }} />
          <h2 style={{ fontSize: '1.4rem', color: '#ffffff', marginBottom: '8px' }}>403 Forbidden</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
            {error}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in" style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#ffffff' }}>
              System Administrator Portal
            </h1>
            <span className="badge badge-role">Admin Control</span>
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginTop: '4px' }}>
            Global overview of all corporate client tenants, transactions, and revenue
          </p>
        </div>

        <button onClick={fetchAdminData} className="btn btn-secondary">
          <RefreshCw size={15} />
          <span>Refresh Data</span>
        </button>
      </div>

      {/* Admin Metrics Grid */}
      {metrics && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '20px',
            marginBottom: '32px'
          }}
        >
          <div className="glass-panel" style={{ padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Total Revenue</span>
              <DollarSign size={18} style={{ color: '#34d399' }} />
            </div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#34d399' }}>
              ${metrics.totalRevenue.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </div>
          </div>

          <div className="glass-panel" style={{ padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Corporate Tenants</span>
              <Users size={18} style={{ color: '#60a5fa' }} />
            </div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#ffffff' }}>
              {metrics.totalUsers}
            </div>
          </div>

          <div className="glass-panel" style={{ padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Total Invoices</span>
              <Receipt size={18} style={{ color: '#a78bfa' }} />
            </div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#ffffff' }}>
              {metrics.totalInvoices}
            </div>
          </div>

          <div className="glass-panel" style={{ padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Paid Ratio</span>
              <ShieldCheck size={18} style={{ color: '#10b981' }} />
            </div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#ffffff' }}>
              {metrics.paidInvoices} / {metrics.totalInvoices}
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
        <button
          onClick={() => setActiveTab('invoices')}
          className="btn"
          style={{
            background: activeTab === 'invoices' ? 'var(--accent-primary)' : 'var(--bg-card)',
            color: activeTab === 'invoices' ? '#ffffff' : 'var(--text-secondary)',
            border: '1px solid var(--border-subtle)'
          }}
        >
          <Receipt size={15} />
          <span>All Invoices ({invoices.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('users')}
          className="btn"
          style={{
            background: activeTab === 'users' ? 'var(--accent-primary)' : 'var(--bg-card)',
            color: activeTab === 'users' ? '#ffffff' : 'var(--text-secondary)',
            border: '1px solid var(--border-subtle)'
          }}
        >
          <Users size={15} />
          <span>All User Accounts ({users.length})</span>
        </button>
      </div>

      {/* Content based on Active Tab */}
      <div className="glass-panel" style={{ padding: '20px' }}>
        {activeTab === 'invoices' ? (
          <div className="table-container">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Invoice #</th>
                  <th>Tenant / Client</th>
                  <th>Client Email</th>
                  <th>Total Amount</th>
                  <th>Status</th>
                  <th>Created Date</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((inv) => (
                  <tr key={inv._id}>
                    <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: '#60a5fa' }}>
                      {inv.invoiceNumber}
                    </td>
                    <td style={{ fontWeight: 600, color: '#ffffff' }}>
                      {inv.clientId?.name || 'Unknown Client'}
                    </td>
                    <td style={{ color: 'var(--text-secondary)', fontSize: '0.8125rem' }}>
                      {inv.clientId?.email || 'N/A'}
                    </td>
                    <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: '#ffffff' }}>
                      ${Number(inv.total).toFixed(2)} {inv.currency}
                    </td>
                    <td>
                      <InvoiceStatusBadge status={inv.status} />
                    </td>
                    <td style={{ color: 'var(--text-muted)', fontSize: '0.8125rem' }}>
                      {new Date(inv.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="table-container">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>User ID</th>
                  <th>Organization / Name</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Registered Date</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u._id}>
                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      {u._id}
                    </td>
                    <td style={{ fontWeight: 600, color: '#ffffff' }}>
                      {u.name}
                    </td>
                    <td style={{ color: 'var(--text-secondary)' }}>
                      {u.email}
                    </td>
                    <td>
                      {u.role === 'admin' ? (
                        <span className="badge badge-role">Admin</span>
                      ) : (
                        <span className="badge" style={{ background: 'rgba(59, 130, 246, 0.15)', color: '#60a5fa' }}>Client</span>
                      )}
                    </td>
                    <td style={{ color: 'var(--text-muted)', fontSize: '0.8125rem' }}>
                      {new Date(u.createdAt).toLocaleDateString()}
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
