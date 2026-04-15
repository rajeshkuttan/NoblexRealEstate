import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";
import { cacheService } from "./cache";

const API_BASE_URL =
  import.meta.env.VITE_API_URL || "http://localhost:5002/api";

// Request timeout configuration (30 seconds)
const REQUEST_TIMEOUT = 30000;
const MAX_RETRIES = 3; // Increased to 3 for better handling of intermittent issues
const RETRY_DELAY = 1000; // 1 second

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: REQUEST_TIMEOUT,
  headers: {
    "Content-Type": "application/json",
  },
});

// Retry logic for failed requests
const retryRequest = async (
  error: AxiosError,
  retryCount: number = 0,
): Promise<any> => {
  const config = error.config as InternalAxiosRequestConfig & {
    _retry?: boolean;
    _retryCount?: number;
  };

  // Don't retry if already retried or if it's not a network/timeout error
  if (!config || config._retry || retryCount >= MAX_RETRIES) {
    return Promise.reject(error);
  }

  // Only retry on network errors or timeout errors
  if (
    !error.response &&
    (error.code === "ECONNABORTED" ||
      error.code === "ERR_NETWORK" ||
      (error.message?.includes("timeout") ?? false))
  ) {
    config._retry = true;
    config._retryCount = (config._retryCount || 0) + 1;

    // Wait before retrying with exponential backoff
    await new Promise((resolve) =>
      setTimeout(resolve, RETRY_DELAY * Math.pow(2, retryCount)),
    );

    console.log(
      `🔄 Retrying request (${config._retryCount}/${MAX_RETRIES}): ${config.url}`,
    );
    return api(config);
  }

  return Promise.reject(error);
};

// SINGLE REQUEST INTERCEPTOR - combine all request logic
api.interceptors.request.use((config) => {
  // Add metadata first
  (config as any).metadata = { startTime: Date.now() };

  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  // CRITICAL FIX: If sending FormData, let the browser set Content-Type with boundary
  if (config.data instanceof FormData) {
    // Handle both AxiosHeaders object and plain object scenarios
    if (config.headers && typeof (config.headers as any).delete === 'function') {
        (config.headers as any).delete("Content-Type");
    } else {
        delete config.headers["Content-Type"];
    }
  }

  // Check cache for GET requests (skip cache for POST/PUT/DELETE)
  if (config.method?.toLowerCase() === "get" && !(config as any).skipCache) {
    const cacheKey = cacheService.generateKey(config.url || "", config.params);
    const cachedData = cacheService.get(cacheKey);

    if (cachedData !== null) {
      // Create a synthetic cached response
      if (import.meta.env.DEV) {
        console.log(`💾 Cache HIT: ${config.url}`, { cacheKey });
      }

      // Throw a special error that will be caught by the error handler
      // This approach is cleaner than trying to return a Promise.reject
      throw Object.assign(new Error("Cached response"), {
        cached: true,
        data: cachedData,
        config,
        isAxiosError: false,
        toJSON: () => ({ cached: true }),
      });
    }

    if (import.meta.env.DEV) {
      console.log(`💾 Cache MISS: ${config.url}`, { cacheKey });
    }
  }

  // Log request in development mode
  if (import.meta.env.DEV) {
    console.log(
      `📤 API Request: ${config.method?.toUpperCase()} ${config.url}`,
      {
        params: config.params,
        data: config.data, // Log the payload!
        timeout: config.timeout,
      },
    );

    // If data is FormData, log entries for easier debugging
    if (config.data instanceof FormData && import.meta.env.DEV) {
        const entries: Record<string, any> = {};
        config.data.forEach((value, key) => {
            entries[key] = value;
        });
        console.log('📝 FormData Entries:', entries);
    }
  }

  return config;
});

// RESPONSE INTERCEPTOR - handle both success and errors
api.interceptors.response.use(
  (response) => {
    // Cache successful GET responses
    if (
      response.config.method?.toLowerCase() === "get" &&
      !(response.config as any).skipCache
    ) {
      const cacheKey = cacheService.generateKey(
        response.config.url || "",
        response.config.params,
      );
      // Cache for 5 minutes by default, or use custom TTL
      const ttl = (response.config as any).cacheTTL || 5 * 60 * 1000;
      cacheService.set(cacheKey, response.data, ttl);

      if (import.meta.env.DEV) {
        console.log(`💾 Cached: ${response.config.url}`, {
          cacheKey,
          ttl: `${ttl}ms`,
        });
      }
    }

    // Log response in development mode
    if (import.meta.env.DEV) {
      const config = response.config as any;
      const duration = config.metadata?.startTime
        ? Date.now() - config.metadata.startTime
        : 0;
      console.log(
        `📥 API Response: ${config.method?.toUpperCase()} ${
          config.url
        }`,
        {
          status: response.status,
          duration: `${duration}ms`,
        },
      );
    }
    return response;
  },
  async (error) => {
    // Handle cached responses FIRST
    if (error.cached) {
      if (import.meta.env.DEV) {
        console.log(
          `📥 API Response (Cached): ${error.config?.method?.toUpperCase()} ${error.config?.url}`,
        );
      }

      // Return a synthetic response for cached data
      return Promise.resolve({
        data: error.data,
        status: 200,
        statusText: "OK (Cached)",
        headers: {},
        config: error.config,
        request: {},
      });
    }

    const config = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean;
      _retryCount?: number;
    };

    // Log error for non-cached failures
    if (import.meta.env.DEV) {
      console.error(
        `❌ API Error: ${config?.method?.toUpperCase()} ${config?.url}`,
        {
          status: error.response?.status ?? "undefined",
          message: error.message ?? "undefined",
          code: error.code ?? "undefined",
          retryCount: config?._retryCount || 0,
        },
      );
    }

    // Handle 401 unauthorized
    if (error.response?.status === 401) {
      // Clear token and user data
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      
      // DON'T redirect if:
      // 1. We're already on the login page (to avoid reload loops)
      // 2. This WAS a login request (to let the login form handle the error)
      const isLoginPage = window.location.pathname === "/login";
      const isLoginAction = config?.url?.includes("/auth/login");
      
      if (!isLoginPage && !isLoginAction) {
        console.warn("🔐 Session expired or invalid, redirecting to login...");
        window.location.href = "/login";
      }
      
      return Promise.reject(error);
    }

    // Retry logic for network/timeout errors
    if (!error.response && config && !error.cached) {
      return retryRequest(error, config._retryCount || 0);
    }

    return Promise.reject(error);
  },
);

// Auth APIs
export const authAPI = {
  login: (credentials: any) => api.post("/auth/login", credentials),
  register: (userData: any) => api.post("/auth/register", userData),
  logout: () => api.post("/auth/logout"),
  getCurrentUser: () => api.get("/auth/me"),
  updateProfile: (data: any) => api.put("/auth/profile", data),
  changePassword: (data: any) => api.put("/auth/change-password", data),
};

// User Management APIs
export const usersAPI = {
  getAll: (params?: any, skipCache = false) => api.get("/users", { params, skipCache } as any),
  getById: (id: number) => api.get(`/users/${id}`),
  create: (data: any) => api.post("/users", data),
  update: (id: number, data: any) => api.put(`/users/${id}`, data),
  delete: (id: number) => api.delete(`/users/${id}`),
};

// Lead APIs with proper error handling
export const leadsAPI = {
  getAll: async (params?: any) => {
    try {
      const response = await api.get("/leads", { params });
      return response;
    } catch (err: any) {
      // Handle cached responses
      if (err.cached) {
        return { data: err.data || {} };
      }

      // Only log actual errors, not cached responses
      if (!err.cached && import.meta.env.DEV) {
        console.error("leadsAPI.getAll failed:", {
          params,
          status: err.response?.status ?? "undefined",
          message: err.message ?? "undefined",
          responseData: err.response?.data ?? "undefined",
        });
      }
      return { data: {} };
    }
  },
  getById: (id: number) => api.get(`/leads/${id}`),
  create: (data: any) => api.post("/leads", data),
  update: (id: number, data: any) => api.put(`/leads/${id}`, data),
  delete: (id: number) => api.delete(`/leads/${id}`),
  getStats: () => api.get("/leads/stats"),
  getAnalytics: () => api.get("/leads/analytics"),
  addActivity: (id: number, activity: any) =>
    api.post(`/leads/${id}/activities`, activity),
};

// Property APIs with proper error handling
export const propertiesAPI = {
  getAll: async (params?: any) => {
    try {
      const response = await api.get("/properties", { params });
      const responseData = response.data;
      const properties =
        responseData?.data?.properties ||
        responseData?.properties ||
        responseData?.rows ||
        responseData?.data ||
        responseData ||
        [];
      
      const pagination = responseData?.data?.pagination || responseData?.pagination;

      return { 
        data: { 
          properties: Array.isArray(properties) ? properties : [],
          pagination
        } 
      };
    } catch (err: any) {
      // Handle cached responses
      if (err.cached) {
        const cachedData = err.data;
        const properties =
          cachedData?.data?.properties ||
          cachedData?.properties ||
          cachedData?.rows ||
          cachedData?.data ||
          cachedData ||
          [];
        
        const pagination = cachedData?.data?.pagination || cachedData?.pagination;

        return { 
          data: { 
            properties: Array.isArray(properties) ? properties : [],
            pagination
          } 
        };
      }

      // Only log actual errors, not cached responses
      if (!err.cached) {
        console.error("propertiesAPI.getAll failed:", {
          params,
          status: err.response?.status ?? "undefined",
          message: err.message ?? "undefined",
          responseData: err.response?.data ?? "undefined",
        });
      }
      return { data: { properties: [] } };
    }
  },
  getById: (id: number) => api.get(`/properties/${id}`),
  create: (data: any) => api.post("/properties", data),
  update: (id: number, data: any) => api.put(`/properties/${id}`, data),
  delete: (id: number) => api.delete(`/properties/${id}`),
  getStats: () => api.get("/properties/stats"),
  getAnalytics: (id: number) => api.get(`/properties/${id}/analytics`),
  import: (data: FormData) => api.post("/properties/import", data, {
    headers: { "Content-Type": "multipart/form-data" },
  }),
};

// Tenant APIs
export const tenantsAPI = {
  getAll: (params?: any, skipCache = false) => api.get("/tenants", { params, skipCache } as any),
  getById: (id: number, skipCache = false) => api.get(`/tenants/${id}`, { skipCache } as any),
  create: async (data: any) => {
    const response = await api.post("/tenants", data);
    cacheService.invalidatePattern(/\/tenants/);
    return response;
  },
  update: async (id: number, data: any) => {
    const response = await api.put(`/tenants/${id}`, data);
    cacheService.invalidatePattern(/\/tenants/);
    return response;
  },
  delete: async (id: number) => {
    const response = await api.delete(`/tenants/${id}`);
    cacheService.invalidatePattern(/\/tenants/);
    return response;
  },
  getStats: () => api.get("/tenants/stats"),
  export: () => api.get("/tenants/data/export", { responseType: 'blob' }),
  import: async (data: FormData) => {
    const response = await api.post("/tenants/data/import", data, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    cacheService.invalidatePattern(/\/tenants/);
    return response;
  },
};


// Unit APIs with proper error handling
export const unitsAPI = {
  getAll: async (params?: any) => {
    try {
      const response = await api.get("/units", { params });
      const unitsData =
        response.data?.data?.units ||
        response.data?.units ||
        response.data?.rows ||
        response.data?.data ||
        response.data ||
        [];
      
      const pagination = response.data?.data?.pagination || response.data?.pagination;

      return {
        data: {
          units: Array.isArray(unitsData) ? unitsData : [],
          pagination
        }
      };
    } catch (err: any) {
      // Handle cached responses
      if (err.cached) {
        return { data: err.data || [] };
      }

      // Only log actual errors, not cached responses
      if (!err.cached) {
        console.error("unitsAPI.getAll failed:", {
          params,
          status: err.response?.status ?? "undefined",
          message: err.message ?? "undefined",
          responseData: err.response?.data ?? "undefined",
        });
      }
      return { data: [] };
    }
  },
  getById: async (id: number) => {
    try {
      const response = await api.get(`/units/${id}`);
      return response;
    } catch (err: any) {
      // Handle cached responses
      if (err.cached) {
        return { data: err.data || {} };
      }

      // Only log actual errors, not cached responses
      if (!err.cached) {
        console.error("unitsAPI.getById failed:", {
          id,
          status: err.response?.status ?? "undefined",
          message: err.message ?? "undefined",
          responseData: err.response?.data ?? "undefined",
        });
      }
      return { data: {} }; // Return empty object to prevent crashes
    }
  },
  create: (data: any) => api.post("/units", data),
  bulkImport: (data: { units: any[] }) =>
    api.post("/units/bulk-import", data, { timeout: 120000 }),
  update: (id: number, data: any) => api.put(`/units/${id}`, data),
  delete: (id: number) => api.delete(`/units/${id}`),
  getStats: (params?: any) => api.get("/units/stats", { params }),
  getByProperty: (propertyId: number) => api.get("/units", { params: { propertyId } }),
};

// Lease APIs
export const leasesAPI = {
  getAll: (params?: any, skipCache = false) => api.get("/leases", { params, skipCache } as any),
  getById: (id: number | string, skipCache = false) => api.get(`/leases/${id}`, { skipCache } as any),
  create: (data: any) => api.post("/leases", data),
  update: (id: number | string, data: any) => api.put(`/leases/${id}`, data),
  delete: (id: number | string) => api.delete(`/leases/${id}`),
  terminate: (id: number | string) =>
    api.post(`/leases/${id}/terminate`, {}),
  approve: (id: number | string) =>
    api.post(`/leases/${id}/approve`, {}),
  getAnalytics: (year?: number, month?: string | number) => api.get('/leases/analytics', { params: { year, month } }),
  getStats: () => api.get("/leases/stats"),
  getByUnit: (unitId: number) => api.get("/leases", { params: { unitId } }),
  getProperties: () => propertiesAPI.getAll({ limit: 100 }),
  getUnits: (propertyId?: string | number) => unitsAPI.getAll({ propertyId, limit: 100 }),
};

// Payment APIs
export const paymentsAPI = {
  getAll: (params?: any, skipCache = false) => api.get("/payments", { params, skipCache } as any),
  getById: (id: number, skipCache = false) => api.get(`/payments/${id}`, { skipCache } as any),
  create: (data: any) => api.post("/payments", data),
  update: (id: number, data: any) => api.put(`/payments/${id}`, data),
  delete: (id: number) => api.delete(`/payments/${id}`),
  getStats: () => api.get("/payments/stats"),
  getOverdue: () => api.get("/payments/overdue"),
  post: (id: number) => api.post(`/payments/${id}/post`),
  unpost: (id: number) => api.post(`/payments/${id}/unpost`),
};

// Invoice APIs
export const invoicesAPI = {
  getAll: (params?: any, skipCache = false) => api.get("/invoices", { params, skipCache } as any),
  getById: (id: number, skipCache = false) => api.get(`/invoices/${id}`, { skipCache } as any),
  create: (data: any) => api.post("/invoices", data),
  update: (id: number, data: any) => api.put(`/invoices/${id}`, data),
  delete: (id: number) => api.delete(`/invoices/${id}`),
  sendEmail: (id: number) => api.post(`/invoices/${id}/send-email`), // Legacy name?
  sendReminder: (id: number) => api.post(`/invoices/${id}/reminder`),
  duplicate: (id: number) => api.post(`/invoices/${id}/duplicate`),
  getHistory: (id: number) => api.get(`/invoices/${id}/history`),
  getStats: () => api.get("/invoices/stats"),
  post: (id: number) => api.post(`/invoices/${id}/post`),
  unpost: (id: number) => api.post(`/invoices/${id}/unpost`),
};

// Ticket APIs
export const ticketsAPI = {
  getAll: (params?: any, skipCache = false) => api.get("/tickets", { params, skipCache } as any),
  getById: (id: number, skipCache = false) => api.get(`/tickets/${id}`, { skipCache } as any),
  create: (data: any) => api.post("/tickets", data),
  update: (id: number, data: any) => api.put(`/tickets/${id}`, data),
  delete: (id: number) => api.delete(`/tickets/${id}`),
  updateStatus: (id: number, status: string) =>
    api.patch(`/tickets/${id}/status`, { status }),
  getStats: () => api.get("/tickets/stats"),
  getOptions: () => api.get("/tickets/options"),
  addNote: (id: number, note: string) => api.post(`/tickets/${id}/notes`, { note }),
  deleteNote: (ticketId: number, noteId: number) => api.delete(`/tickets/${ticketId}/notes/${noteId}`),
};

// Chart of Accounts APIs
export const chartOfAccountsAPI = {
  getAll: (params?: any) => api.get("/chart-of-accounts", { params }),
  getById: (id: number) => api.get(`/chart-of-accounts/${id}`),
  create: (data: any) => api.post("/chart-of-accounts", data),
  bulkImport: (data: { rows: any[] }) =>
    api.post("/chart-of-accounts/bulk-import", data, { timeout: 120000 }),
  update: (id: number, data: any) => api.put(`/chart-of-accounts/${id}`, data),
  delete: (id: number) => api.delete(`/chart-of-accounts/${id}`),
  getHierarchy: () => api.get("/chart-of-accounts/hierarchy"),
  updateOpeningBalances: (data: any) => api.put("/chart-of-accounts/opening-balances", data),
};

// Journal Voucher APIs
export const journalVouchersAPI = {
  getAll: (params?: any) => api.get("/journal-vouchers", { params }),
  getById: (id: number) => api.get(`/journal-vouchers/${id}`),
  create: (data: any) => api.post("/journal-vouchers", data),
  update: (id: number, data: any) => api.put(`/journal-vouchers/${id}`, data),
  delete: (id: number) => api.delete(`/journal-vouchers/${id}`),
  post: (id: number) => api.post(`/journal-vouchers/${id}/post`),
  unpost: (id: number) => api.post(`/journal-vouchers/${id}/unpost`),
};

// Ledger Setup APIs
export const ledgerSetupsAPI = {
  getAll: (params?: any, skipCache = false) => api.get("/ledger-setups", { params, skipCache } as any),
  getById: (id: number, skipCache = false) => api.get(`/ledger-setups/${id}`, { skipCache } as any),
  create: (data: any) => api.post("/ledger-setups", data),
  update: (id: number, data: any) => api.put(`/ledger-setups/${id}`, data),
  delete: (id: number) => api.delete(`/ledger-setups/${id}`),
};

// Financial Transaction APIs
export const financialTransactionsAPI = {
  getAll: (params?: any) => api.get("/financial-transactions", { params }),
  getById: (id: number) => api.get(`/financial-transactions/${id}`),
  getByReference: (reference: string) => api.get(`/financial-transactions/reference/${reference}`),
  create: (data: any) => api.post("/financial-transactions", data),
  update: (id: number, data: any) =>
    api.put(`/financial-transactions/${id}`, data),
  delete: (id: number) => api.delete(`/financial-transactions/${id}`),
  approve: (id: number) => api.post(`/financial-transactions/${id}/approve`),
  reject: (id: number, reason: string) =>
    api.post(`/financial-transactions/${id}/reject`, { reason }),
  getStats: () => api.get("/financial-transactions/stats"),
};

// Budget APIs
export const budgetsAPI = {
  getAll: (params?: any) => api.get("/budgets", { params }),
  getById: (id: number) => api.get(`/budgets/${id}`),
  create: (data: any) => api.post("/budgets", data),
  update: (id: number, data: any) => api.put(`/budgets/${id}`, data),
  delete: (id: number) => api.delete(`/budgets/${id}`),
  getStats: () => api.get("/budgets/stats"),
  approve: (id: number) => api.post(`/budgets/${id}/approve`),
  reject: (id: number) => api.post(`/budgets/${id}/reject`),
};

// Vendor APIs
export const vendorsAPI = {
  getAll: (params?: any, skipCache = false) => api.get("/vendors", { params, skipCache } as any),
  getById: (id: number) => api.get(`/vendors/${id}`),
  create: (data: any) => api.post("/vendors", data),
  update: (id: number, data: any) => api.put(`/vendors/${id}`, data),
  delete: (id: number) => api.delete(`/vendors/${id}`),
  getStats: () => api.get("/vendors/stats"),
  downloadTemplate: () => api.get("/vendors/template", { responseType: 'blob' }),
  export: () => api.get("/vendors/export", { responseType: 'blob' }),
  import: (data: FormData) => api.post("/vendors/import", data, {
    headers: { "Content-Type": "multipart/form-data" },
  }),
};

// Vendor Invoice APIs
export const vendorInvoicesAPI = {
  getAll: (params?: any) => api.get("/vendor-invoices", { params }),
  getById: (id: number) => api.get(`/vendor-invoices/${id}`),
  create: (data: any) => api.post("/vendor-invoices", data),
  update: (id: number, data: any) => api.put(`/vendor-invoices/${id}`, data),
  delete: (id: number) => api.delete(`/vendor-invoices/${id}`),
  approve: (id: number) => api.post(`/vendor-invoices/${id}/approve`),
  getStats: () => api.get("/vendor-invoices/stats"),
  getAgingReport: () => api.get("/vendor-invoices/aging-report"),
};

// Bank Account APIs
export const bankAccountsAPI = {
  getAll: (params?: any) => api.get("/bank-accounts", { params }),
  getById: (id: number) => api.get(`/bank-accounts/${id}`),
  create: (data: any) => api.post("/bank-accounts", data),
  update: (id: number, data: any) => api.put(`/bank-accounts/${id}`, data),
  delete: (id: number) => api.delete(`/bank-accounts/${id}`),
  getStats: () => api.get("/bank-accounts/stats"),
  getCashPosition: () => api.get("/bank-accounts/cash-position"),
};

// Bank Transaction APIs
export const bankTransactionsAPI = {
  getAll: (params?: any) => api.get("/bank-transactions", { params }),
  getById: (id: number) => api.get(`/bank-transactions/${id}`),
  create: (data: any) => api.post("/bank-transactions", data),
  update: (id: number, data: any) => api.put(`/bank-transactions/${id}`, data),
  delete: (id: number) => api.delete(`/bank-transactions/${id}`),
  bulkImport: (data: any) => api.post("/bank-transactions/bulk-import", data),
};

// Reconciliation APIs
export const reconciliationsAPI = {
  getAll: (params?: any) => api.get("/reconciliations", { params }),
  getById: (id: number) => api.get(`/reconciliations/${id}`),
  create: (data: any) => api.post("/reconciliations", data),
  update: (id: number, data: any) => api.put(`/reconciliations/${id}`, data),
  approve: (id: number) => api.post(`/reconciliations/${id}/approve`),
  getStats: () => api.get("/reconciliations/stats"),
};

// Financial Forecast APIs
export const financialForecastsAPI = {
  getAll: (params?: any) => api.get("/financial-forecasts", { params }),
  getById: (id: number) => api.get(`/financial-forecasts/${id}`),
  create: (data: any) => api.post("/financial-forecasts", data),
  update: (id: number, data: any) =>
    api.put(`/financial-forecasts/${id}`, data),
  delete: (id: number) => api.delete(`/financial-forecasts/${id}`),
  getStats: () => api.get("/financial-forecasts/stats"),
};

// Exchange Rate APIs
export const exchangeRatesAPI = {
  getAll: (params?: any) => api.get("/exchange-rates", { params }),
  getById: (id: number) => api.get(`/exchange-rates/${id}`),
  create: (data: any) => api.post("/exchange-rates", data),
  update: (id: number, data: any) => api.put(`/exchange-rates/${id}`, data),
  delete: (id: number) => api.delete(`/exchange-rates/${id}`),
  getLatest: (from: string, to: string) =>
    api.get(`/exchange-rates/latest?from=${from}&to=${to}`),
  updateRates: () => api.post("/exchange-rates/update"),
};

// Financial Reports APIs
export const financialReportsAPI = {
  getPropertyProfitability: (params?: any) => api.get("/finance/reports/property-profitability", { params }),
  getPropertyFinancials: (params?: any) => api.get("/finance/reports/property-financials", { params }),
  getEnhancedARAgingReport: (params?: any) => api.get("/finance/reports/ar-aging-enhanced", { params }),
  getBudgetVsActualReport: (params?: any) => api.get("/finance/reports/budget-vs-actual", { params }),
  getFTAVATExport: (params?: any) => api.get("/finance/reports/vat-export", { params }),
  getAccountsTransactions: (params?: any) => api.get("/finance/reports/accounts-transactions", { params }),
  getCustomerSOA: (tenantId: number | string, params?: any) => api.get(`/finance/reports/customer-soa/${tenantId}`, { params }),
  getVendorSOA: (vendorId: number | string, params?: any) => api.get(`/finance/reports/vendor-soa/${vendorId}`, { params }),
};

// Document APIs
export const documentsAPI = {
  upload: (data: FormData) =>
    api.post("/documents/upload", data, {
      headers: { "Content-Type": "multipart/form-data" },
    }),
  getByEntity: (entityType: string, entityId: number | string, skipCache = false) =>
    api.get(`/documents/${entityType}/${entityId}`, { skipCache } as any),
  download: (id: number) =>
    api.get(`/documents/${id}/download`, { responseType: "blob" }),
  delete: (id: number) => api.delete(`/documents/${id}`),
};

// Report Share APIs
export const reportShareAPI = {
  createShareLink: (data: any) => api.post("/reports/share", data),
  getSharedReport: (token: string) => api.get(`/reports/shared/${token}`),
  revokeShareLink: (id: number) => api.delete(`/reports/shared/${id}`),
};

// Payment Gateway APIs
export const paymentGatewayAPI = {
  getAvailableGateways: () => api.get("/payment-gateway/available"),
  createPaymentIntent: (data: any) =>
    api.post("/payment-gateway/create-intent", data),
  getPaymentStatus: (id: number) =>
    api.get(`/payment-gateway/transactions/${id}`),
  processRefund: (id: number, data: any) =>
    api.post(`/payment-gateway/transactions/${id}/refund`, data),
  getTransactionHistory: (params?: any) =>
    api.get("/payment-gateway/transactions", { params }),
};

// Bank Statement APIs
export const bankStatementsAPI = {
  upload: (data: FormData) =>
    api.post("/bank-statements/upload", data, {
      headers: { "Content-Type": "multipart/form-data" },
    }),
  getHistory: (params?: any) => api.get("/bank-statements/history", { params }),
};

// Auto-Reconciliation APIs
export const autoReconciliationAPI = {
  autoReconcile: (data: any) =>
    api.post("/reconciliation/auto-reconcile", data),
};

// Investment APIs
export const investmentsAPI = {
  getAll: (params?: any) => api.get("/investments", { params }),
  getById: (id: number) => api.get(`/investments/${id}`),
  create: (data: any) => api.post("/investments", data),
  update: (id: number, data: any) => api.put(`/investments/${id}`, data),
  delete: (id: number) => api.delete(`/investments/${id}`),
  calculateInterest: (id: number) =>
    api.get(`/investments/${id}/calculate-interest`),
  getStats: () => api.get("/investments/stats"),
};

// Treasury Reports APIs
export const treasuryReportsAPI = {
  getCashPosition: () => api.get("/treasury-reports/cash-position"),
  getCollections: (params?: any) =>
    api.get("/treasury-reports/collections", { params }),
  getDashboard: () => api.get("/treasury-reports/dashboard"),
};

// Settings APIs
export const settingsAPI = {
  getAll: async (params?: any) => {
    try {
      const response = await api.get("/settings", { params });
      const settingsData =
        response.data?.data?.settings ||
        response.data?.settings ||
        response.data?.data ||
        response.data ||
        {};
      return { data: { settings: settingsData } };
    } catch (err: any) {
      // Handle cached responses
      if (err.cached) {
        return { data: { settings: err.data || {} } };
      }

      // Only log actual errors, not cached responses
      if (!err.cached) {
        console.error("settingsAPI.getAll failed:", {
          params,
          status: err.response?.status ?? "undefined",
          message: err.message ?? "undefined",
          responseData: err.response?.data ?? "undefined",
        });
      }
      return { data: { settings: {} } };
    }
  },
  getByKey: (key: string) => api.get(`/settings/${key}`),
  upsert: (data: any) => api.post("/settings", data),
  update: (key: string, data: any) => api.put(`/settings/${key}`, data),
  delete: (key: string) => api.delete(`/settings/${key}`),
  initialize: () => api.post("/settings/initialize"),
};

export const companySettingsAPI = {
  getAll: () => api.get("/company-settings/all"),
  getSettings: () => api.get("/company-settings"),
  getProfile: () => api.get("/company-settings/profile"),
  getBusinessInfo: () => api.get("/company-settings/business-info"),
  updateSettings: (data: any) => api.put("/company-settings", data),
  updateProfile: (data: any) => api.put("/company-settings/profile", data),
  updateBusinessInfo: (data: any) => api.put("/company-settings/business-info", data),
  uploadLogo: (formData: FormData) =>
    api.post("/company-settings/logo", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    }),
};

// Legal Case APIs
export const legalCasesAPI = {
  getAll: (params?: any) => api.get("/legal-cases", { params }),
  getById: (id: number | string, params?: any) => api.get(`/legal-cases/${id}`, { params }),
  create: (data: any) => api.post("/legal-cases", data),
  update: (id: number | string, data: any) => api.put(`/legal-cases/${id}`, data),
  delete: (id: number | string) => api.delete(`/legal-cases/${id}`),
  approve: (id: number | string) => api.post(`/legal-cases/${id}/approve`),
  close: (id: number | string) => api.post(`/legal-cases/${id}/close`),
};

// Services APIs
export const servicesAPI = {
  getByEntity: async (
    entityType: "unit" | "lease",
    entityId: number | string | undefined,
    skipCache = false,
  ) => {
    if (!entityId || isNaN(Number(entityId))) {
      console.warn(`Invalid entityId for services: ${entityId}`);
      return { data: { services: [] } };
    }

    try {
      const response = await api.get("/services", {
        params: { entityType, entityId: Number(entityId) },
        skipCache,
      } as any);
      const servicesData =
        response.data?.data?.services ||
        response.data?.services ||
        response.data?.data ||
        response.data ||
        [];

      return {
        data: {
          services: Array.isArray(servicesData) ? servicesData : [],
        },
      };
    } catch (err: any) {
      // Handle cached responses
      if (err.cached) {
        return { data: { services: err.data || [] } };
      }

      // Only log actual errors, not cached responses
      if (!err.cached) {
        console.error("servicesAPI.getByEntity failed:", {
          entityType,
          entityId,
          status: err.response?.status ?? "undefined",
          message: err.message ?? "undefined",
          responseData: err.response?.data ?? "undefined",
        });
      }
      return { data: { services: [] } };
    }
  },
  getById: (id: number) => api.get(`/services/${id}`),
  create: (data: any) => api.post("/services", data),
  bulkCreate: async (data: {
    services: any[];
    entityType: string;
    entityId: number;
  }) => {
    try {
      const response = await api.post("/services/bulk", data);
      return response;
    } catch (err: any) {
      console.error("servicesAPI.bulkCreate failed:", {
        status: err.response?.status ?? "undefined",
        message: err.message ?? "undefined",
        responseData: err.response?.data ?? "undefined",
      });
      throw err;
    }
  },
  update: async (id: number, data: any) => {
    try {
      const response = await api.put(`/services/${id}`, data);
      return response;
    } catch (err: any) {
      console.error("servicesAPI.update failed:", {
        id,
        status: err.response?.status ?? "undefined",
        message: err.message ?? "undefined",
        responseData: err.response?.data ?? "undefined",
      });
      throw err;
    }
  },
  delete: (id: number, hard?: boolean) =>
    api.delete(`/services/${id}`, { params: { hard } }),
  copyToLease: (unitId: number, leaseId: number) =>
    api.post("/services/copy-to-lease", { unitId, leaseId }),
};

// Service Templates APIs
export const serviceTemplatesAPI = {
  getAll: (params?: any) => api.get("/service-templates", { params }),
  getById: (id: number) => api.get(`/service-templates/${id}`),
  getByCategory: (category: string) =>
    api.get(`/service-templates/category/${category}`),
  getCategories: () => api.get("/service-templates/categories"),
  create: (data: any) => api.post("/service-templates", data),
  update: (id: number, data: any) => api.put(`/service-templates/${id}`, data),
  delete: (id: number, hard?: boolean) =>
    api.delete(`/service-templates/${id}`, { params: { hard } }),
};

// Item Master APIs
export const itemsAPI = {
  getAll: (params?: any, skipCache = false) => {
    // If skipping cache, add cache-busting parameter
    const queryParams = { ...params };
    if (skipCache) {
      queryParams._t = Date.now();
    }
    return api.get("/items", { params: queryParams });
  },
  getById: (id: number) => api.get(`/items/${id}`),
  create: (data: any) => api.post("/items", data),
  update: (id: number, data: any) => api.put(`/items/${id}`, data),
  delete: (id: number) => api.delete(`/items/${id}`),
  downloadTemplate: () => api.get("/items/template", { responseType: 'blob' }),
  export: () => api.get("/items/export", { responseType: 'blob' }),
  import: (data: FormData) => api.post("/items/import", data, {
    headers: { "Content-Type": "multipart/form-data" },
  }),
};

export const purchaseOrdersAPI = {
  getAll: (params?: any, skipCache?: boolean) => api.get("/purchase-orders", { params, skipCache: skipCache ? true : undefined } as any),
  getById: (id: number, skipCache = false) => api.get(`/purchase-orders/${id}`, { skipCache } as any),
  getStatus: (id: number) => api.get(`/purchase-orders/${id}/status`),
  create: (data: any) => api.post("/purchase-orders", data),
  update: (id: number, data: any) => api.put(`/purchase-orders/${id}`, data),
  cancel: (id: number) => api.patch(`/purchase-orders/${id}/cancel`),
};

export const goodsReceiptsAPI = {
  getAll: (params?: any, skipCache?: boolean) => api.get("/goods-receipts", { params, skipCache: skipCache ? true : undefined } as any),
  getById: (id: number) => api.get(`/goods-receipts/${id}`),
  getByPO: (poId: number) => api.get(`/goods-receipts/po/${poId}`),
  create: (data: any) => api.post("/goods-receipts", data),
  update: (id: number, data: any) => api.put(`/goods-receipts/${id}`, data),
};

export const purchaseInvoicesAPI = {
  getAll: (params?: any, skipCache?: boolean) => api.get("/purchase-invoices", { params, skipCache: skipCache ? true : undefined } as any),
  getById: (id: number) => api.get(`/purchase-invoices/${id}`),
  create: (data: any) => api.post("/purchase-invoices", data),
  update: (id: number, data: any) => api.put(`/purchase-invoices/${id}`, data),
  approve: (id: number) => api.patch(`/purchase-invoices/${id}/approve`),
  cancel: (id: number) => api.patch(`/purchase-invoices/${id}/cancel`),
  getStats: () => api.get("/purchase-invoices/stats"),
};

export default api;
// Cheque APIs
export const chequesAPI = {
  getAll: (params?: any) => api.get("/cheques", { params }),
  getById: (id: number) => api.get(`/cheques/${id}`),
  create: (data: any) => api.post("/cheques", data),
  update: (id: number, data: any) => api.put(`/cheques/${id}`, data),
  delete: (id: number) => api.delete(`/cheques/${id}`),
  getStats: () => api.get("/cheques/stats"),
};

// Document Numbering APIs
export const documentNumberingAPI = {
  getAll: (params?: any, skipCache = false) => api.get("/document-numbering", { params, skipCache } as any),
  create: async (data: any) => {
    const response = await api.post("/document-numbering", data);
    cacheService.invalidatePattern(/\/document-numbering/);
    return response;
  },
  update: async (id: number, data: any) => {
    const response = await api.put(`/document-numbering/${id}`, data);
    cacheService.invalidatePattern(/\/document-numbering/);
    return response;
  },
  delete: async (id: number) => {
    const response = await api.delete(`/document-numbering/${id}`);
    cacheService.invalidatePattern(/\/document-numbering/);
    return response;
  },
  generate: (data: { documentName: string; useTransactionNo?: boolean; year?: number }) => api.post("/document-numbering/generate", data),
};
