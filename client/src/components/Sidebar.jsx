import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard,
  ReceiptText,
  PlusCircle,
  ShieldAlert,
  ShieldCheck,
  Building2,
  Users
} from 'lucide-react';

export const Sidebar = () => {
  const { isAdmin } = useAuth();

  const navItems = [
    { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/invoices', label: 'Invoices', icon: ReceiptText },
    { to: '/invoices/new', label: 'Create Invoice', icon: PlusCircle },
    { to: '/security-showcase', label: 'Security Showcase', icon: ShieldCheck }
  ];

  if (isAdmin) {
    navItems.push({ to: '/admin', label: 'Admin Portal', icon: Building2 });
  }

  return (
    <aside
      style={{
        width: '240px',
        borderRight: '1px solid var(--border-subtle)',
        background: 'rgba(11, 15, 25, 0.6)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: '20px 14px',
        minHeight: 'calc(100vh - 64px)'
      }}
    >
      <div>
        <div style={{ padding: '0 10px 12px 10px', fontSize: '0.6875rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          Navigation
        </div>

        <nav style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                style={({ isActive }) => ({
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '10px 14px',
                  borderRadius: 'var(--radius-md)',
                  color: isActive ? '#ffffff' : 'var(--text-secondary)',
                  background: isActive ? 'linear-gradient(135deg, rgba(59, 130, 246, 0.15) 0%, rgba(37, 99, 235, 0.25) 100%)' : 'transparent',
                  border: isActive ? '1px solid var(--border-highlight)' : '1px solid transparent',
                  textDecoration: 'none',
                  fontSize: '0.875rem',
                  fontWeight: isActive ? 600 : 500,
                  transition: 'all 0.15s ease'
                })}
              >
                <Icon size={18} />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>
      </div>

      {/* Security Status Footnote */}
      <div
        className="glass-panel"
        style={{
          padding: '12px',
          background: 'rgba(15, 23, 42, 0.6)',
          fontSize: '0.75rem',
          color: 'var(--text-muted)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#60a5fa', fontWeight: 600, marginBottom: '4px' }}>
          <ShieldAlert size={14} />
          <span>Strict Zero-Trust</span>
        </div>
        <div>
          IDOR Protection & HMAC Stripe Webhooks Active.
        </div>
      </div>
    </aside>
  );
};
