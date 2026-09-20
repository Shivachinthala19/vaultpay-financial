import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Lock, Mail, ArrowRight, ShieldCheck, UserCheck } from 'lucide-react';

export const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [formError, setFormError] = useState('');
  
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    setIsLoading(true);

    const res = await login(email, password);
    setIsLoading(false);

    if (res.success) {
      navigate('/dashboard');
    } else {
      setFormError(res.message);
    }
  };

  const handleQuickDemoLogin = async (demoEmail, demoPassword) => {
    setEmail(demoEmail);
    setPassword(demoPassword);
    setIsLoading(true);
    setFormError('');
    const res = await login(demoEmail, demoPassword);
    setIsLoading(false);
    if (res.success) {
      navigate('/dashboard');
    } else {
      setFormError(res.message);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        position: 'relative'
      }}
    >
      <div
        className="glass-panel animate-fade-in"
        style={{
          width: '100%',
          maxWidth: '460px',
          padding: '36px',
          background: 'rgba(17, 24, 39, 0.92)'
        }}
      >
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 800,
              color: '#ffffff',
              fontSize: '24px',
              margin: '0 auto 16px auto',
              boxShadow: '0 0 20px rgba(59, 130, 246, 0.4)'
            }}
          >
            N
          </div>
          <h2 style={{ fontSize: '1.6rem', color: '#ffffff', marginBottom: '6px' }}>
            Nexus Corporate
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
            Zero-Trust Corporate Billing & Financial Gateway
          </p>
        </div>

        {formError && (
          <div
            style={{
              background: 'rgba(239, 68, 68, 0.15)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              color: '#fca5a5',
              padding: '12px 14px',
              borderRadius: 'var(--radius-md)',
              fontSize: '0.875rem',
              marginBottom: '20px'
            }}
          >
            {formError}
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Corporate Email</label>
            <div style={{ position: 'relative' }}>
              <input
                type="email"
                required
                className="form-input"
                placeholder="client@corporate.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Password</label>
            <div style={{ position: 'relative' }}>
              <input
                type="password"
                required
                className="form-input"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: '100%', padding: '12px', marginTop: '10px' }}
            disabled={isLoading}
          >
            {isLoading ? 'Authenticating...' : 'Sign In to Portal'}
            <ArrowRight size={16} />
          </button>
        </form>

        {/* Quick Demo Credentials */}
        <div style={{ marginTop: '28px', paddingTop: '20px', borderTop: '1px solid var(--border-subtle)' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '10px', textAlign: 'center' }}>
            Quick Demo Accounts (Instant Fill)
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            <button
              type="button"
              onClick={() => handleQuickDemoLogin('clientA@corporate.com', 'SecurePassword123!')}
              className="btn btn-secondary"
              style={{ fontSize: '0.75rem', padding: '8px' }}
            >
              <UserCheck size={14} />
              Client A (Alpha)
            </button>
            <button
              type="button"
              onClick={() => handleQuickDemoLogin('admin@nexuscorporate.com', 'SuperAdminPassword123!')}
              className="btn btn-secondary"
              style={{ fontSize: '0.75rem', padding: '8px' }}
            >
              <ShieldCheck size={14} />
              Admin Portal
            </button>
          </div>
        </div>

        {/* Register Link */}
        <div style={{ textAlign: 'center', marginTop: '24px', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
          Don't have a corporate account?{' '}
          <Link to="/register" style={{ color: 'var(--accent-primary)', fontWeight: 600, textDecoration: 'none' }}>
            Register Organization
          </Link>
        </div>
      </div>
    </div>
  );
};
