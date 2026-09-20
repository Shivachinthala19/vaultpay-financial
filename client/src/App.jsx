import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';

// Pages
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { Dashboard } from './pages/Dashboard';
import { InvoicesList } from './pages/InvoicesList';
import { CreateInvoice } from './pages/CreateInvoice';
import { InvoiceDetail } from './pages/InvoiceDetail';
import { PaymentSuccess } from './pages/PaymentSuccess';
import { PaymentCancel } from './pages/PaymentCancel';
import { AdminDashboard } from './pages/AdminDashboard';
import { SecurityShowcase } from './pages/SecurityShowcase';

// Protected Route Guard
const ProtectedLayout = () => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-main)', color: 'var(--text-secondary)' }}>
        Authenticating session...
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Navbar />
      <div style={{ display: 'flex', flex: 1 }}>
        <Sidebar />
        <main style={{ flex: 1, overflowY: 'auto' }}>
          <Outlet />
        </main>
      </div>
    </div>
  );
};

// Admin Role Guard
const AdminRoute = () => {
  const { isAdmin, loading } = useAuth();

  if (loading) return null;
  if (!isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  return <AdminDashboard />;
};

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* Protected Routes */}
          <Route element={<ProtectedLayout />}>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/invoices" element={<InvoicesList />} />
            <Route path="/invoices/new" element={<CreateInvoice />} />
            <Route path="/invoices/:id" element={<InvoiceDetail />} />
            <Route path="/payment/success" element={<PaymentSuccess />} />
            <Route path="/payment/cancel" element={<PaymentCancel />} />
            <Route path="/security-showcase" element={<SecurityShowcase />} />
            <Route path="/admin" element={<AdminRoute />} />
          </Route>

          {/* Catch-all redirect */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
