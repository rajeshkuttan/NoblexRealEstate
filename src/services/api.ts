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
      const duration = response.config.metadata?.startTime
        ? Date.now() - response.config.metadata.startTime
        : 0;
      console.log(
        `📥 API Response: ${response.config.method?.toUpperCase()} ${
          response.config.url
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
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      window.location.href = "/login";
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
  addActivity: (id: number, activity: any) =>
    api.post(`/leads/${id}/activities`, activity),
};

// Property APIs with proper error handling
export const propertiesAPI = {
  getAll: async (params?: any) => {
    try {
      const response = await api.get("/properties", { params });
      const data =
        response.data?.data?.properties ||
        response.data?.properties ||
        response.data?.rows ||
        response.data?.data ||
        response.data ||
        [];
      return { data: { properties: Array.isArray(data) ? data : [] } };
    } catch (err: any) {
      // Handle cached responses
      if (err.cached) {
        return { data: { properties: err.data || [] } };
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
};

// Tenant APIs
export const tenantsAPI = {
  getAll: (params?: any) => api.get("/tenants", { params }),
  getById: (id: number) => api.get(`/tenants/${id}`),
  create: (data: any) => api.post("/tenants", data),
  update: (id: number, data: any) => api.put(`/tenants/${id}`, data),
  delete: (id: number) => api.delete(`/tenants/${id}`),
  getStats: () => api.get("/tenants/stats"),
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
      return {
        data: Array.isArray(unitsData) ? unitsData : [],
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
  update: (id: number, data: any) => api.put(`/units/${id}`, data),
  delete: (id: number) => api.delete(`/units/${id}`),
  getStats: () => api.get("/units/stats"),
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
};

// Payment APIs
export const paymentsAPI = {
  getAll: (params?: any) => api.get("/payments", { params }),
  getById: (id: number) => api.get(`/payments/${id}`),
  create: (data: any) => api.post("/payments", data),
  update: (id: number, data: any) => api.put(`/payments/${id}`, data),
  delete: (id: number) => api.delete(`/payments/${id}`),
  getStats: () => api.get("/payments/stats"),
  getOverdue: () => api.get("/payments/overdue"),
};

// Invoice APIs
export const invoicesAPI = {
  getAll: (params?: any) => api.get("/invoices", { params }),
  getById: (id: number) => api.get(`/invoices/${id}`),
  create: (data: any) => api.post("/invoices", data),
  update: (id: number, data: any) => api.put(`/invoices/${id}`, data),
  delete: (id: number) => api.delete(`/invoices/${id}`),
  sendEmail: (id: number) => api.post(`/invoices/${id}/send-email`),
  getStats: () => api.get("/invoices/stats"),
};

// Ticket APIs
export const ticketsAPI = {
  getAll: (params?: any) => api.get("/tickets", { params }),
  getById: (id: number) => api.get(`/tickets/${id}`),
  create: (data: any) => api.post("/tickets", data),
  update: (id: number, data: any) => api.put(`/tickets/${id}`, data),
  delete: (id: number) => api.delete(`/tickets/${id}`),
  updateStatus: (id: number, status: string) =>
    api.patch(`/tickets/${id}/status`, { status }),
  getStats: () => api.get("/tickets/stats"),
};

// Chart of Accounts APIs
export const chartOfAccountsAPI = {
  getAll: (params?: any) => api.get("/chart-of-accounts", { params }),
  getById: (id: number) => api.get(`/chart-of-accounts/${id}`),
  create: (data: any) => api.post("/chart-of-accounts", data),
  update: (id: number, data: any) => api.put(`/chart-of-accounts/${id}`, data),
  delete: (id: number) => api.delete(`/chart-of-accounts/${id}`),
  getHierarchy: () => api.get("/chart-of-accounts/hierarchy"),
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
  getAll: (params?: any) => api.get("/vendors", { params }),
  getById: (id: number) => api.get(`/vendors/${id}`),
  create: (data: any) => api.post("/vendors", data),
  update: (id: number, data: any) => api.put(`/vendors/${id}`, data),
  delete: (id: number) => api.delete(`/vendors/${id}`),
  getStats: () => api.get("/vendors/stats"),
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
  getPropertyProfitability: (params?: any) =>
    api.get("/finance/reports/property-profitability", { params }),
  getEnhancedARAging: (params?: any) =>
    api.get("/finance/reports/ar-aging-enhanced", { params }),
  getBudgetVsActual: (params?: any) =>
    api.get("/finance/reports/budget-vs-actual", { params }),
  getFTAVATExport: (params?: any) =>
    api.get("/finance/reports/fta-vat-export", { params }),
};

// Document APIs
export const documentsAPI = {
  upload: (data: FormData) =>
    api.post("/documents/upload", data, {
      headers: { "Content-Type": "multipart/form-data" },
    }),
  getByEntity: (entityType: string, entityId: number, skipCache = false) =>
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

// Procurement Module APIs
export const itemsAPI = {
  getAll: (params?: any) => api.get("/items", { params }),
  getById: (id: number) => api.get(`/items/${id}`),
  create: (data: any) => api.post("/items", data),
  update: (id: number, data: any) => api.put(`/items/${id}`, data),
  delete: (id: number) => api.delete(`/items/${id}`),
};

export const purchaseOrdersAPI = {
  getAll: (params?: any, skipCache?: boolean) => api.get("/purchase-orders", { params, skipCache: skipCache ? true : undefined } as any),
  getById: (id: number) => api.get(`/purchase-orders/${id}`),
  getStatus: (id: number) => api.get(`/purchase-orders/${id}/status`),
  create: (data: any) => api.post("/purchase-orders", data),
  update: (id: number, data: any) => api.put(`/purchase-orders/${id}`, data),
  cancel: (id: number) => api.patch(`/purchase-orders/${id}/cancel`),
};

export const goodsReceiptsAPI = {
  getAll: (params?: any) => api.get("/goods-receipts", { params }),
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
};

export default api;
