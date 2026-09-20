import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Shield, Lock, LogOut, User as UserIcon, CheckCircle } from 'lucide-react';

export const Navbar = () => {
  const { user, logout, isAdmin } = useAuth();

  return (
    <header
      style={{
        height: '64px',
        borderBottom: '1px solid var(--border-subtle)',
        background: 'rgba(11, 15, 25, 0.85)',
        backdropFilter: 'blur(12px)',
        position: 'sticky',
        top: 0,
        zIndex: 40,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 24px'
      }}
    >
      {/* Brand & Security Status */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <Link to="/dashboard" style={{ display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none' }}>
          <div
            style={{
              width: '34px',
              height: '34px',
              borderRadius: '8px',
              background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 800,
              color: '#ffffff',
              fontSize: '18px',
              boxShadow: '0 0 15px rgba(59, 130, 246, 0.4)'
            }}
          >
            N
          </div>
          <div>
            <span style={{ fontSize: '1.1rem', fontWeight: 800, letterSpacing: '-0.02em', color: '#ffffff' }}>
              NEXUS
            </span>
            <span style={{ fontSize: '1.1rem', fontWeight: 400, color: 'var(--accent-primary)', marginLeft: '4px' }}>
              CORPORATE
            </span>
          </div>
        </Link>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            background: 'rgba(16, 185, 129, 0.1)',
            border: '1px solid rgba(16, 185, 129, 0.25)',
            padding: '3px 10px',
            borderRadius: 'var(--radius-full)',
            fontSize: '0.75rem',
            color: '#34d399',
            fontWeight: 600
          }}
        >
          <Lock size={12} />
          <span>Zero-Trust API Active</span>
        </div>
      </div>

      {/* User Actions & Profile */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        {user ? (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div
                style={{
                  width: '34px',
                  height: '34px',
                  borderRadius: '50%',
                  background: 'var(--bg-input)',
                  border: '1px solid var(--border-subtle)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--text-secondary)'
                }}
              >
                <UserIcon size={18} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                    {user.name}
                  </span>
                  {isAdmin ? (
                    <span className="badge badge-role">Admin</span>
                  ) : (
                    <span className="badge" style={{ background: 'rgba(59, 130, 246, 0.15)', color: '#60a5fa' }}>Client</span>
                  )}
                </div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  {user.email}
                </span>
              </div>
            </div>

            <button
              onClick={logout}
              className="btn btn-secondary"
              style={{ padding: '7px 12px', fontSize: '0.8125rem' }}
              title="Sign Out"
            >
              <LogOut size={15} />
              <span>Logout</span>
            </button>
          </>
        ) : (
          <div style={{ display: 'flex', gap: '10px' }}>
            <Link to="/login" className="btn btn-secondary">Log In</Link>
            <Link to="/register" className="btn btn-primary">Register</Link>
          </div>
        )}
      </div>
    </header>
  );
};
