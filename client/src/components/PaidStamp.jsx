import React from 'react';
import { ShieldCheck } from 'lucide-react';

export const PaidStamp = ({ transactionId, paidAt }) => {
  return (
    <div
      style={{
        display: 'inline-flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        border: '2px solid #10b981',
        borderRadius: '8px',
        padding: '8px 16px',
        background: 'rgba(16, 185, 129, 0.08)',
        color: '#10b981',
        transform: 'rotate(-4deg)',
        boxShadow: '0 0 20px rgba(16, 185, 129, 0.25)'
      }}
      className="pulse-paid-stamp"
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 800, fontSize: '1.25rem', letterSpacing: '0.1em' }}>
        <ShieldCheck size={22} />
        PAID IN FULL
      </div>
      {paidAt && (
        <div style={{ fontSize: '0.7rem', fontWeight: 600, color: '#34d399', marginTop: '2px' }}>
          VERIFIED: {new Date(paidAt).toLocaleDateString()}
        </div>
      )}
      {transactionId && (
        <div style={{ fontSize: '0.65rem', fontFamily: 'var(--font-mono)', color: '#6ee7b7', opacity: 0.85 }}>
          TXN: {transactionId.substring(0, 18)}...
        </div>
      )}
    </div>
  );
};
