import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5002/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth APIs
export const authAPI = {
  login: (credentials: any) => api.post('/auth/login', credentials),
  register: (userData: any) => api.post('/auth/register', userData),
  logout: () => api.post('/auth/logout'),
  getCurrentUser: () => api.get('/auth/me'),
};

// Lead APIs
export const leadsAPI = {
  getAll: (params?: any) => api.get('/leads', { params }),
  getById: (id: number) => api.get(`/leads/${id}`),
  create: (data: any) => api.post('/leads', data),
  update: (id: number, data: any) => api.put(`/leads/${id}`, data),
  delete: (id: number) => api.delete(`/leads/${id}`),
  getStats: () => api.get('/leads/stats'),
  addActivity: (id: number, activity: any) => api.post(`/leads/${id}/activities`, activity),
};

// Property APIs
export const propertiesAPI = {
  getAll: (params?: any) => api.get('/properties', { params }),
  getById: (id: number) => api.get(`/properties/${id}`),
  create: (data: any) => api.post('/properties', data),
  update: (id: number, data: any) => api.put(`/properties/${id}`, data),
  delete: (id: number) => api.delete(`/properties/${id}`),
  getStats: () => api.get('/properties/stats'),
};

// Tenant APIs
export const tenantsAPI = {
  getAll: (params?: any) => api.get('/tenants', { params }),
  getById: (id: number) => api.get(`/tenants/${id}`),
  create: (data: any) => api.post('/tenants', data),
  update: (id: number, data: any) => api.put(`/tenants/${id}`, data),
  delete: (id: number) => api.delete(`/tenants/${id}`),
  getStats: () => api.get('/tenants/stats'),
};

// Unit APIs
export const unitsAPI = {
  getAll: (params?: any) => api.get('/units', { params }),
  getById: (id: number) => api.get(`/units/${id}`),
  create: (data: any) => api.post('/units', data),
  update: (id: number, data: any) => api.put(`/units/${id}`, data),
  delete: (id: number) => api.delete(`/units/${id}`),
  getStats: () => api.get('/units/stats'),
};

// Lease APIs
export const leasesAPI = {
  getAll: (params?: any) => api.get('/leases', { params }),
  getById: (id: number) => api.get(`/leases/${id}`),
  create: (data: any) => api.post('/leases', data),
  update: (id: number, data: any) => api.put(`/leases/${id}`, data),
  delete: (id: number) => api.delete(`/leases/${id}`),
  terminate: (id: number, data: any) => api.post(`/leases/${id}/terminate`, data),
  getStats: () => api.get('/leases/stats'),
};

// Payment APIs
export const paymentsAPI = {
  getAll: (params?: any) => api.get('/payments', { params }),
  getById: (id: number) => api.get(`/payments/${id}`),
  create: (data: any) => api.post('/payments', data),
  update: (id: number, data: any) => api.put(`/payments/${id}`, data),
  delete: (id: number) => api.delete(`/payments/${id}`),
  getStats: () => api.get('/payments/stats'),
  getOverdue: () => api.get('/payments/overdue'),
};

// Invoice APIs
export const invoicesAPI = {
  getAll: (params?: any) => api.get('/invoices', { params }),
  getById: (id: number) => api.get(`/invoices/${id}`),
  create: (data: any) => api.post('/invoices', data),
  update: (id: number, data: any) => api.put(`/invoices/${id}`, data),
  delete: (id: number) => api.delete(`/invoices/${id}`),
  sendEmail: (id: number) => api.post(`/invoices/${id}/send-email`),
  getStats: () => api.get('/invoices/stats'),
};

// Ticket APIs
export const ticketsAPI = {
  getAll: (params?: any) => api.get('/tickets', { params }),
  getById: (id: number) => api.get(`/tickets/${id}`),
  create: (data: any) => api.post('/tickets', data),
  update: (id: number, data: any) => api.put(`/tickets/${id}`, data),
  delete: (id: number) => api.delete(`/tickets/${id}`),
  updateStatus: (id: number, status: string) => api.patch(`/tickets/${id}/status`, { status }),
  getStats: () => api.get('/tickets/stats'),
};

// Chart of Accounts APIs
export const chartOfAccountsAPI = {
  getAll: (params?: any) => api.get('/chart-of-accounts', { params }),
  getById: (id: number) => api.get(`/chart-of-accounts/${id}`),
  create: (data: any) => api.post('/chart-of-accounts', data),
  update: (id: number, data: any) => api.put(`/chart-of-accounts/${id}`, data),
  delete: (id: number) => api.delete(`/chart-of-accounts/${id}`),
  getHierarchy: () => api.get('/chart-of-accounts/hierarchy'),
};

// Financial Transaction APIs
export const financialTransactionsAPI = {
  getAll: (params?: any) => api.get('/financial-transactions', { params }),
  getById: (id: number) => api.get(`/financial-transactions/${id}`),
  create: (data: any) => api.post('/financial-transactions', data),
  update: (id: number, data: any) => api.put(`/financial-transactions/${id}`, data),
  delete: (id: number) => api.delete(`/financial-transactions/${id}`),
  approve: (id: number) => api.post(`/financial-transactions/${id}/approve`),
  reject: (id: number, reason: string) => api.post(`/financial-transactions/${id}/reject`, { reason }),
  getStats: () => api.get('/financial-transactions/stats'),
};

// Budget APIs
export const budgetsAPI = {
  getAll: (params?: any) => api.get('/budgets', { params }),
  getById: (id: number) => api.get(`/budgets/${id}`),
  create: (data: any) => api.post('/budgets', data),
  update: (id: number, data: any) => api.put(`/budgets/${id}`, data),
  delete: (id: number) => api.delete(`/budgets/${id}`),
  getStats: () => api.get('/budgets/stats'),
  approve: (id: number) => api.post(`/budgets/${id}/approve`),
  reject: (id: number) => api.post(`/budgets/${id}/reject`),
};

// Vendor APIs
export const vendorsAPI = {
  getAll: (params?: any) => api.get('/vendors', { params }),
  getById: (id: number) => api.get(`/vendors/${id}`),
  create: (data: any) => api.post('/vendors', data),
  update: (id: number, data: any) => api.put(`/vendors/${id}`, data),
  delete: (id: number) => api.delete(`/vendors/${id}`),
  getStats: () => api.get('/vendors/stats'),
};

// Vendor Invoice APIs
export const vendorInvoicesAPI = {
  getAll: (params?: any) => api.get('/vendor-invoices', { params }),
  getById: (id: number) => api.get(`/vendor-invoices/${id}`),
  create: (data: any) => api.post('/vendor-invoices', data),
  update: (id: number, data: any) => api.put(`/vendor-invoices/${id}`, data),
  delete: (id: number) => api.delete(`/vendor-invoices/${id}`),
  approve: (id: number) => api.post(`/vendor-invoices/${id}/approve`),
  getStats: () => api.get('/vendor-invoices/stats'),
  getAgingReport: () => api.get('/vendor-invoices/aging-report'),
};

// Bank Account APIs
export const bankAccountsAPI = {
  getAll: (params?: any) => api.get('/bank-accounts', { params }),
  getById: (id: number) => api.get(`/bank-accounts/${id}`),
  create: (data: any) => api.post('/bank-accounts', data),
  update: (id: number, data: any) => api.put(`/bank-accounts/${id}`, data),
  delete: (id: number) => api.delete(`/bank-accounts/${id}`),
  getStats: () => api.get('/bank-accounts/stats'),
  getCashPosition: () => api.get('/bank-accounts/cash-position'),
};

// Bank Transaction APIs
export const bankTransactionsAPI = {
  getAll: (params?: any) => api.get('/bank-transactions', { params }),
  getById: (id: number) => api.get(`/bank-transactions/${id}`),
  create: (data: any) => api.post('/bank-transactions', data),
  update: (id: number, data: any) => api.put(`/bank-transactions/${id}`, data),
  delete: (id: number) => api.delete(`/bank-transactions/${id}`),
  bulkImport: (data: any) => api.post('/bank-transactions/bulk-import', data),
};

// Reconciliation APIs
export const reconciliationsAPI = {
  getAll: (params?: any) => api.get('/reconciliations', { params }),
  getById: (id: number) => api.get(`/reconciliations/${id}`),
  create: (data: any) => api.post('/reconciliations', data),
  update: (id: number, data: any) => api.put(`/reconciliations/${id}`, data),
  approve: (id: number) => api.post(`/reconciliations/${id}/approve`),
  getStats: () => api.get('/reconciliations/stats'),
};

// Financial Forecast APIs
export const financialForecastsAPI = {
  getAll: (params?: any) => api.get('/financial-forecasts', { params }),
  getById: (id: number) => api.get(`/financial-forecasts/${id}`),
  create: (data: any) => api.post('/financial-forecasts', data),
  update: (id: number, data: any) => api.put(`/financial-forecasts/${id}`, data),
  delete: (id: number) => api.delete(`/financial-forecasts/${id}`),
  getStats: () => api.get('/financial-forecasts/stats'),
};

// Exchange Rate APIs
export const exchangeRatesAPI = {
  getAll: (params?: any) => api.get('/exchange-rates', { params }),
  getById: (id: number) => api.get(`/exchange-rates/${id}`),
  create: (data: any) => api.post('/exchange-rates', data),
  update: (id: number, data: any) => api.put(`/exchange-rates/${id}`, data),
  delete: (id: number) => api.delete(`/exchange-rates/${id}`),
  getLatest: (from: string, to: string) => api.get(`/exchange-rates/latest?from=${from}&to=${to}`),
  updateRates: () => api.post('/exchange-rates/update'),
};

// Financial Reports APIs
export const financialReportsAPI = {
  getPropertyProfitability: (params?: any) => api.get('/finance/reports/property-profitability', { params }),
  getEnhancedARAging: (params?: any) => api.get('/finance/reports/ar-aging-enhanced', { params }),
  getBudgetVsActual: (params?: any) => api.get('/finance/reports/budget-vs-actual', { params }),
  getFTAVATExport: (params?: any) => api.get('/finance/reports/fta-vat-export', { params }),
};

// Document APIs
export const documentsAPI = {
  upload: (data: FormData) => api.post('/documents/upload', data, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  getByEntity: (entityType: string, entityId: number) => api.get(`/documents/${entityType}/${entityId}`),
  download: (id: number) => api.get(`/documents/${id}/download`, { responseType: 'blob' }),
  delete: (id: number) => api.delete(`/documents/${id}`),
};

// Report Share APIs
export const reportShareAPI = {
  createShareLink: (data: any) => api.post('/reports/share', data),
  getSharedReport: (token: string) => api.get(`/reports/shared/${token}`),
  revokeShareLink: (id: number) => api.delete(`/reports/shared/${id}`),
};

// Payment Gateway APIs
export const paymentGatewayAPI = {
  getAvailableGateways: () => api.get('/payment-gateway/available'),
  createPaymentIntent: (data: any) => api.post('/payment-gateway/create-intent', data),
  getPaymentStatus: (id: number) => api.get(`/payment-gateway/transactions/${id}`),
  processRefund: (id: number, data: any) => api.post(`/payment-gateway/transactions/${id}/refund`, data),
  getTransactionHistory: (params?: any) => api.get('/payment-gateway/transactions', { params }),
};

// Bank Statement APIs
export const bankStatementsAPI = {
  upload: (data: FormData) => api.post('/bank-statements/upload', data, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  getHistory: (params?: any) => api.get('/bank-statements/history', { params }),
};

// Auto-Reconciliation APIs
export const autoReconciliationAPI = {
  autoReconcile: (data: any) => api.post('/reconciliation/auto-reconcile', data),
};

// Investment APIs
export const investmentsAPI = {
  getAll: (params?: any) => api.get('/investments', { params }),
  getById: (id: number) => api.get(`/investments/${id}`),
  create: (data: any) => api.post('/investments', data),
  update: (id: number, data: any) => api.put(`/investments/${id}`, data),
  delete: (id: number) => api.delete(`/investments/${id}`),
  calculateInterest: (id: number) => api.get(`/investments/${id}/calculate-interest`),
  getStats: () => api.get('/investments/stats'),
};

// Treasury Reports APIs
export const treasuryReportsAPI = {
  getCashPosition: () => api.get('/treasury-reports/cash-position'),
  getCollections: (params?: any) => api.get('/treasury-reports/collections', { params }),
  getDashboard: () => api.get('/treasury-reports/dashboard'),
};

export default api;
