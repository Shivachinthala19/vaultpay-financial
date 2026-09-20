import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json'
  }
});

// Request Interceptor: Attach JWT Bearer Token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('nexus_auth_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor: Handle Global Errors & Token Expiration
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && !window.location.pathname.includes('/login') && !window.location.pathname.includes('/register')) {
      // Clear token on 401 unauthorized
      localStorage.removeItem('nexus_auth_token');
      localStorage.removeItem('nexus_user');
      // Dispatch custom event so React context updates smoothly
      window.dispatchEvent(new Event('auth:unauthorized'));
    }
    return Promise.reject(error);
  }
);

export const authAPI = {
  login: (credentials) => api.post('/auth/login', credentials),
  register: (userData) => api.post('/auth/register', userData),
  getMe: () => api.get('/auth/me')
};

export const invoiceAPI = {
  getInvoices: () => api.get('/invoices'),
  getInvoiceById: (id) => api.get(`/invoices/${id}`),
  createInvoice: (invoiceData) => api.post('/invoices', invoiceData),
  updateInvoice: (id, updateData) => api.put(`/invoices/${id}`, updateData),
  deleteInvoice: (id) => api.delete(`/invoices/${id}`),
  downloadReceipt: (id) =>
    api.get(`/invoices/${id}/receipt`, {
      responseType: 'blob'
    })
};

export const paymentAPI = {
  createCheckoutSession: (invoiceId) => api.post('/payments/create-checkout-session', { invoiceId }),
  simulateMockPayment: (invoiceId) => api.post('/payments/simulate-mock-payment', { invoiceId })
};

export const adminAPI = {
  getAllInvoices: () => api.get('/admin/invoices'),
  getAllUsers: () => api.get('/admin/users'),
  getMetrics: () => api.get('/admin/metrics')
};

export default api;
