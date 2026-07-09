import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";
import { cacheService } from "./cache";
import { getActiveCompanyId } from "@/lib/activeCompanyStorage";
import { getFinancePostingErrorMessage } from "@/lib/financePostingErrors";

/** Normalize API error messages (including cross-company posting blocks). */
export function getApiErrorMessage(
  error: unknown,
  fallback = "Request failed",
): string {
  return getFinancePostingErrorMessage(error, fallback);
}

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

  // Only retry on network errors or timeout errors (skip POST/PUT/PATCH — not idempotent)
  const method = (config.method || '').toUpperCase();
  if (method === 'POST' || method === 'PUT' || method === 'PATCH') {
    return Promise.reject(error);
  }
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

/** GET cache keys must include active company — same URL returns different data per tenant. */
function cacheKeyForGet(url: string, params?: Record<string, unknown>) {
  const companyId = getActiveCompanyId() ?? "none";
  return cacheService.generateKey(url, { ...(params ?? {}), companyId });
}

// SINGLE REQUEST INTERCEPTOR - combine all request logic
api.interceptors.request.use((config) => {
  // Add metadata first
  (config as any).metadata = { startTime: Date.now() };

  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  const companyId = getActiveCompanyId();
  if (companyId) {
    config.headers["x-company-id"] = String(companyId);
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
    const cacheKey = cacheKeyForGet(config.url || "", config.params);
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
      const cacheKey = cacheKeyForGet(
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

    const apiMessage = error.response?.data?.message;
    if (typeof apiMessage === "string" && apiMessage.length > 0) {
      (error as AxiosError & { userMessage?: string }).userMessage =
        getApiErrorMessage(error, apiMessage);
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

export const rolesAPI = {
  getAllRoles: () => api.get("/roles"),
  getPermissions: () => api.get("/roles/permissions"),
  createRole: (data: any) => api.post("/roles", data),
  updateRole: (id: number, data: any) => api.put(`/roles/${id}`, data),
  deleteRole: (id: number) => api.delete(`/roles/${id}`),
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
  update: (id: number, data: any) => {
    cacheService.invalidatePattern(/\/leads/);
    return api.put(`/leads/${id}`, data);
  },
  delete: (id: number) => api.delete(`/leads/${id}`),
  getStats: () => api.get("/leads/stats"),
  getAnalytics: () => api.get("/leads/analytics"),
  addActivity: (id: number, activity: any) =>
    api.post(`/leads/${id}/activities`, activity),
};

/** Public marketing site — no auth required */
export const marketingAPI = {
  getListings: (params?: { companyId?: number; limit?: number }) =>
    api.get("/marketing/listings", { params }),
  submitInquiry: (data: {
    name: string;
    email: string;
    phone: string;
    message?: string;
    contactMethod?: string;
    unitId?: number;
    propertyId?: number;
    propertyName?: string;
    budget?: number;
    preferredLocation?: string;
    propertyType?: string;
    buildingType?: string;
    requirements?: string;
    companyId?: number;
  }) => api.post("/marketing/inquiries", data),
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
  export: (params?: any) => api.get("/tenants/data/export", { params, responseType: 'blob' }),
  import: async (data: FormData) => {
    const response = await api.post("/tenants/data/import", data, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    cacheService.invalidatePattern(/\/tenants/);
    return response;
  },
  getOptions: async () => {
    const response = await api.get("/tenants/options", { skipCache: true } as any);
    const rd = response.data;
    const tenants = rd?.data?.tenants || rd?.tenants || [];
    return { data: { tenants: Array.isArray(tenants) ? tenants : [] } };
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
export const auditLogsAPI = {
  getAll: (params?: any) => api.get("/audit-logs", { params }),
};

export const vatReturnsAPI = {
  getQuarterSummary: (params?: any) =>
    api.get("/vat-returns/summary", { params }),
  suggestJournalVoucher: (body: any) =>
    api.post("/vat-returns/suggest-jv", body),
};

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
  getProperties: async () => {
    const response = await api.get("/units/property-options");
    const rd = response.data;
    const properties = rd?.data?.properties || rd?.properties || [];
    return { data: { properties: Array.isArray(properties) ? properties : [] } };
  },
  getUnits: async (propertyId?: string | number) => {
    const params: any = {};
    if (propertyId) params.propertyId = propertyId;
    const response = await api.get("/units/unit-options", { params });
    const rd = response.data;
    const units = rd?.data?.units || rd?.units || [];
    return { data: { units: Array.isArray(units) ? units : [] } };
  },
  importExcel: (formData: FormData) =>
    api.post("/leases/import", formData, { timeout: 600000 }),
  bulkCreate: (leases: any[]) =>
    api.post("/leases/bulk-create", { leases }, { timeout: 600000 }),
  getExpiring: (days = 120) => api.get("/leases/expiring", { params: { days } }),
  getRenewalNoticePreview: (id: number | string, params?: any) => api.get(`/leases/${id}/renewal-notice-preview`, { params }),
  sendRenewalNotice: (id: number | string, data: any) => api.post(`/leases/${id}/send-renewal-notice`, data),
  broadcastAnnouncement: (data: {
    propertyId: number;
    subject: string;
    html: string;
    minDaysEndDate?: number;
    strictRenewalFilter?: boolean;
    minInitialTermDays?: number;
    sendEmails?: boolean;
    maxSend?: number;
  }) => api.post("/leases/broadcast-announcement", data),
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
  downloadTemplate: () => api.get("/invoices/template", { responseType: "blob" }),
  export: (params?: any) =>
    api.get("/invoices/export", { params, responseType: "blob" }),
  import: (data: FormData) =>
    api.post("/invoices/import", data, {
      headers: { "Content-Type": "multipart/form-data" },
    }),
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
export const directPurchaseInvoicesAPI = {
  getAll: (params?: Record<string, unknown>) =>
    api.get("/direct-purchase-invoices", { params }),
  getById: (id: number) => api.get(`/direct-purchase-invoices/${id}`),
  create: (data: unknown) => api.post("/direct-purchase-invoices", data),
  update: (id: number, data: unknown) => api.put(`/direct-purchase-invoices/${id}`, data),
  delete: (id: number) => api.delete(`/direct-purchase-invoices/${id}`),
  post: (id: number) => api.post(`/direct-purchase-invoices/${id}/post`),
  cancel: (id: number) => api.post(`/direct-purchase-invoices/${id}/cancel`),
  getOpenPayables: (params?: Record<string, unknown>) =>
    api.get("/direct-purchase-invoices/open-payables", { params }),
};

export const vendorInvoicesAPI = {
  getAll: (params?: any) => api.get("/vendor-invoices", { params }),
  getById: (id: number) => api.get(`/vendor-invoices/${id}`),
  create: (data: any) => api.post("/vendor-invoices", data),
  update: (id: number, data: any) => api.put(`/vendor-invoices/${id}`, data),
  delete: (id: number) => api.delete(`/vendor-invoices/${id}`),
  approve: (id: number) => api.post(`/vendor-invoices/${id}/approve`),
  getStats: () => api.get("/vendor-invoices/stats"),
  getAgingReport: (params?: any) => api.get("/vendor-invoices/aging-report", { params }),
  downloadTemplate: () =>
    api.get("/vendor-invoices/template", { responseType: "blob" }),
  export: (params?: any) =>
    api.get("/vendor-invoices/export", { params, responseType: "blob" }),
  import: (data: FormData) =>
    api.post("/vendor-invoices/import", data, {
      headers: { "Content-Type": "multipart/form-data" },
    }),
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

// Treasury term deposit APIs (legacy)
export const treasuryDepositsAPI = {
  getAll: (params?: any) => api.get("/treasury/deposits", { params }),
  getById: (id: number) => api.get(`/treasury/deposits/${id}`),
  create: (data: any) => api.post("/treasury/deposits", data),
  update: (id: number, data: any) => api.put(`/treasury/deposits/${id}`, data),
  delete: (id: number) => api.delete(`/treasury/deposits/${id}`),
  calculateInterest: (id: number) =>
    api.get(`/treasury/deposits/${id}/calculate-interest`),
  getStats: () => api.get("/treasury/deposits/stats"),
};

// Investment Management module APIs
export const investmentsAPI = {
  getDashboard: (params?: any) => api.get("/investments/dashboard", { params }),
  getPortfolio: (params?: any) => api.get("/investments/portfolio", { params }),
  createAsset: (data: any) => api.post("/investments/assets", data),
  getAsset: (id: number) => api.get(`/investments/assets/${id}`),
  updateAsset: (id: number, data: any) => api.put(`/investments/assets/${id}`, data),
  deleteAsset: (id: number) => api.delete(`/investments/assets/${id}`),
  getAssetTransactions: (id: number, params?: any) =>
    api.get(`/investments/assets/${id}/transactions`, { params }),
  getTransactions: (params?: any) => api.get("/investments/transactions", { params }),
  getTransactionLedger: (id: number) => api.get(`/investments/transactions/${id}/ledger`),
  createTransaction: (data: any) => api.post("/investments/transactions", data),
  approveTransaction: (id: number) => api.post(`/investments/transactions/${id}/approve`),
  postTransaction: (id: number) => api.post(`/investments/transactions/${id}/post`),
  cancelTransaction: (id: number) => api.post(`/investments/transactions/${id}/cancel`),
  rejectTransaction: (id: number) => api.post(`/investments/transactions/${id}/reject`),
  getAssetValuations: (id: number, params?: any) =>
    api.get(`/investments/assets/${id}/valuations`, { params }),
  createValuation: (data: any) => api.post("/investments/valuations", data),
  importValuations: (data: { rows: unknown[]; autoApprove?: boolean }) =>
    api.post("/investments/valuations/import", data),
  approveValuation: (id: number) => api.post(`/investments/valuations/${id}/approve`),
  getDistributions: (params?: any) => api.get("/investments/distributions", { params }),
  getDistribution: (id: number) => api.get(`/investments/distributions/${id}`),
  prepareDistribution: (investmentTransactionId: number) =>
    api.post("/investments/distributions/prepare", { investmentTransactionId }),
  approveDistribution: (id: number) => api.post(`/investments/distributions/${id}/approve`),
  postDistribution: (id: number) => api.post(`/investments/distributions/${id}/post`),
  cancelDistribution: (id: number) => api.post(`/investments/distributions/${id}/cancel`),
  getAssetAllocations: (id: number) => api.get(`/investments/assets/${id}/allocations`),
  createAllocation: (id: number, data: any) =>
    api.post(`/investments/assets/${id}/allocations`, data),
  updateAllocation: (id: number, data: any) =>
    api.put(`/investments/allocations/${id}`, data),
  deleteAllocation: (id: number) => api.delete(`/investments/allocations/${id}`),
  getReportPortfolio: (params?: any) => api.get("/investments/reports/portfolio", { params }),
  getReportLedger: (params?: any) => api.get("/investments/reports/ledger", { params }),
  getReportDividends: (params?: any) => api.get("/investments/reports/dividends", { params }),
  getReportGainLoss: (params?: any) => api.get("/investments/reports/gain-loss", { params }),
  getReportValuations: (params?: any) => api.get("/investments/reports/valuations", { params }),
  getMonthEndReconciliation: (params?: any) =>
    api.get("/investments/reports/month-end-reconciliation", { params }),
  getPartnerStatement: (partnerId: number, params?: any) =>
    api.get(`/investments/reports/partner-statement/${partnerId}`, { params }),
  uploadDocument: (id: number, formData: FormData) =>
    api.post(`/investments/assets/${id}/documents`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    }),
  getAssetDocuments: (id: number) => api.get(`/investments/assets/${id}/documents`),
  deleteDocument: (id: number) => api.delete(`/investments/documents/${id}`),
  getAccountSettings: () => api.get("/investments/settings/accounts"),
  updateAccountSettings: (data: any) => api.put("/investments/settings/accounts", data),
  getCategories: (params?: any) => api.get("/investments/categories", { params }),
  createCategory: (data: any) => api.post("/investments/categories", data),
  updateCategory: (id: number, data: unknown) => api.put(`/investments/categories/${id}`, data),
  deleteCategory: (id: number) => api.delete(`/investments/categories/${id}`),
  getValuationProviderSettings: () => api.get("/investments/settings/valuation-providers"),
  updateValuationProviderSettings: (data: unknown) =>
    api.put("/investments/settings/valuation-providers", data),
  getPartners: () => api.get("/investments/partners"),
};

// Treasury Reports APIs
export const treasuryReportsAPI = {
  getCashPosition: () => api.get("/treasury-reports/cash-position"),
  getCollections: (params?: any) =>
    api.get("/treasury-reports/collections", { params }),
  getDashboard: () => api.get("/treasury-reports/dashboard"),
  getInvestmentCash: (params?: any) => api.get("/treasury-reports/investment-cash", { params }),
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
  getMyCompanies: () => api.get("/company-settings/my-companies"),
  getCurrent: () => api.get("/company-settings/current"),
  getAll: () => api.get("/company-settings/all"),
  getById: (id: number | string) => api.get(`/company-settings/${id}`),
  getSettings: () => api.get("/company-settings"),
  getProfile: () => api.get("/company-settings/profile"),
  getBusinessInfo: () => api.get("/company-settings/business-info"),
  create: (data: Record<string, unknown>) => {
    cacheService.invalidatePattern(/\/company-settings/);
    return api.post("/company-settings", data);
  },
  updateById: (id: number | string, data: Record<string, unknown>) => {
    cacheService.invalidatePattern(/\/company-settings/);
    return api.put(`/company-settings/${id}`, data);
  },
  patchStatus: (id: number | string, isActive: boolean) => {
    cacheService.invalidatePattern(/\/company-settings/);
    return api.patch(`/company-settings/${id}/status`, { isActive });
  },
  switchCompany: (companyId: number) => {
    cacheService.invalidatePattern(/\/company-settings/);
    return api.post("/company-settings/switch", { company_id: companyId });
  },
  getUsers: (id: number | string) => api.get(`/company-settings/${id}/users`),
  assignUser: (
    id: number | string,
    body: { userId: number; roleInCompany?: string; isDefault?: boolean }
  ) => {
    cacheService.invalidatePattern(/\/company-settings/);
    return api.post(`/company-settings/${id}/users`, body);
  },
  removeUser: (id: number | string, userId: number | string) => {
    cacheService.invalidatePattern(/\/company-settings/);
    return api.delete(`/company-settings/${id}/users/${userId}`);
  },
  setUserDefault: (id: number | string, userId: number | string) => {
    cacheService.invalidatePattern(/\/company-settings/);
    return api.patch(`/company-settings/${id}/users/${userId}/default`);
  },
  getAudit: (id: number | string, params?: Record<string, unknown>) =>
    api.get(`/company-settings/${id}/audit`, { params }),
  updateSettings: (data: any) => {
    cacheService.invalidatePattern(/\/company-settings/);
    return api.put("/company-settings", data);
  },
  updateProfile: (data: any) => {
    cacheService.invalidatePattern(/\/company-settings/);
    return api.put("/company-settings/profile", data);
  },
  updateBusinessInfo: (data: any) => {
    cacheService.invalidatePattern(/\/company-settings/);
    return api.put("/company-settings/business-info", data);
  },
  uploadLogo: (formData: FormData) => {
    cacheService.invalidatePattern(/\/company-settings/);
    return api.post("/company-settings/logo", formData);
  },
};

export const systemHealthAPI = {
  getSummary: () => api.get("/system-health"),
  getAudits: (params?: Record<string, unknown>) =>
    api.get("/system-health/audits", { params }),
  runAudit: (body?: { summaryOnly?: boolean }) =>
    api.post("/system-health/run", body ?? { summaryOnly: true }),
  getReport: (params?: { runId?: string; format?: string }) =>
    api.get("/system-health/report", { params }),
  getUatScenarios: () => api.get("/system-health/uat-scenarios"),
};

function invalidateCompanyFinanceCache() {
  cacheService.invalidatePattern(/\/company-finance/);
}

function companyFinanceGet(url: string, config?: Record<string, unknown>) {
  return api.get(url, { ...config, skipCache: true } as any);
}

function companyFinanceMutate<T>(promise: Promise<T>) {
  return promise.then((res) => {
    invalidateCompanyFinanceCache();
    return res;
  });
}

export const companyFinanceAPI = {
  getNumberSeries: () => companyFinanceGet("/company-finance/number-series"),
  createNumberSeries: (data: Record<string, unknown>) =>
    companyFinanceMutate(api.post("/company-finance/number-series", data)),
  updateNumberSeries: (id: number | string, data: Record<string, unknown>) =>
    companyFinanceMutate(api.put(`/company-finance/number-series/${id}`, data)),
  previewNumber: (documentType: string) =>
    companyFinanceGet("/company-finance/number-series/preview", {
      params: { documentType },
    }),
  seedNumberSeriesDefaults: () =>
    companyFinanceMutate(api.post("/company-finance/number-series/seed-defaults")),
  getFinancialYears: () => companyFinanceGet("/company-finance/financial-years"),
  createFinancialYear: (data: Record<string, unknown>) =>
    companyFinanceMutate(api.post("/company-finance/financial-years", data)),
  closeFinancialYear: (id: number | string) =>
    companyFinanceMutate(api.post(`/company-finance/financial-years/${id}/close`)),
  getFinancialPeriods: () => companyFinanceGet("/company-finance/financial-periods"),
  getCurrentPeriodStatus: (date?: string) =>
    companyFinanceGet("/company-finance/financial-periods/current-status", {
      params: date ? { date } : {},
    }),
  closeFinancialPeriod: (id: number | string, mode: "soft" | "hard") =>
    companyFinanceMutate(
      api.post(`/company-finance/financial-periods/${id}/close`, { mode }),
    ),
  openFinancialPeriod: (id: number | string) =>
    companyFinanceMutate(api.post(`/company-finance/financial-periods/${id}/open`)),
  getVatPeriods: () => companyFinanceGet("/company-finance/vat-periods"),
  openVatPeriod: (data: Record<string, unknown>) =>
    companyFinanceMutate(api.post("/company-finance/vat-periods/open", data)),
  submitVatPeriod: (id: number | string) =>
    companyFinanceMutate(api.post(`/company-finance/vat-periods/${id}/submit`)),
  lockVatPeriod: (id: number | string) =>
    companyFinanceMutate(api.post(`/company-finance/vat-periods/${id}/lock`)),
  getDocumentTemplates: () => companyFinanceGet("/company-finance/document-templates"),
  resolveDocumentTemplate: (documentType: string) =>
    companyFinanceGet(`/company-finance/document-templates/${documentType}`),
  upsertDocumentTemplate: (data: Record<string, unknown>) =>
    companyFinanceMutate(api.put("/company-finance/document-templates", data)),
  getOpeningBalanceBatches: () =>
    companyFinanceGet("/company-finance/opening-balance-batches"),
  createOpeningBalanceBatch: (data: Record<string, unknown>) =>
    companyFinanceMutate(api.post("/company-finance/opening-balance-batches", data)),
  markOpeningBalanceImported: (id: number | string) =>
    companyFinanceMutate(
      api.post(`/company-finance/opening-balance-batches/${id}/imported`),
    ),
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
  getPDCRegister: (params?: any) => api.get("/cheques/pdc-register", { params }),
  getPDCOutstanding: (params?: any) => api.get("/cheques/reports/pdc-outstanding", { params }),
  deposit: (id: number, data: { bankAccountId: number; depositDate?: string; bankReference?: string }) =>
    api.post(`/cheques/${id}/deposit`, data),
  bulkOpeningImport: (cheques: any[]) =>
    api.post("/cheques/opening-balance/import", { cheques }),
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

const payrollBase = "/payroll";

export const payrollAPI = {
  workspace: {
    commandCenter: (params?: Record<string, unknown>) =>
      api.get(`${payrollBase}/dashboard/command-center`, { params }),
    employee360: (id: number) => api.get(`${payrollBase}/employees/${id}/360`),
    attendanceExceptions: (params?: Record<string, unknown>) =>
      api.get(`${payrollBase}/attendance/exceptions`, { params }),
    runDetail: (id: number) => api.get(`${payrollBase}/runs/${id}/detail`),
    runEmployeeLine: (runId: number, employeeId: number) =>
      api.get(`${payrollBase}/runs/${runId}/employees/${employeeId}/line`),
    wpsBatchDetail: (id: number) => api.get(`${payrollBase}/wps/batches/${id}/detail`),
    settlementDetail: (id: number) => api.get(`${payrollBase}/settlements/${id}/detail`),
    costAllocation: (params?: Record<string, unknown>) =>
      api.get(`${payrollBase}/reports/cost-allocation`, { params }),
    audit: (params?: Record<string, unknown>) => api.get(`${payrollBase}/audit`, { params }),
  },
  organization: {
    listEntities: () => api.get(`${payrollBase}/organization/entities`),
    list: (entity: string, params?: Record<string, unknown>) =>
      api.get(`${payrollBase}/organization/${entity}`, { params }),
    create: (entity: string, data: unknown) => api.post(`${payrollBase}/organization/${entity}`, data),
    update: (entity: string, id: number, data: unknown) =>
      api.put(`${payrollBase}/organization/${entity}/${id}`, data),
    remove: (entity: string, id: number) => api.delete(`${payrollBase}/organization/${entity}/${id}`),
  },
  employees: {
    list: (params?: Record<string, unknown>) => api.get(`${payrollBase}/employees`, { params }),
    getById: (id: number) => api.get(`${payrollBase}/employees/${id}`),
    create: (data: unknown) => api.post(`${payrollBase}/employees`, data),
    update: (id: number, data: unknown) => api.put(`${payrollBase}/employees/${id}`, data),
    addHistory: (id: number, data: unknown) => api.post(`${payrollBase}/employees/${id}/history`, data),
  },
  documents: {
    listExpiring: (params?: Record<string, unknown>) => api.get(`${payrollBase}/documents/expiring`, { params }),
    listByEmployee: (employeeId: number) => api.get(`${payrollBase}/documents/employee/${employeeId}`),
    create: (data: FormData) =>
      api.post(`${payrollBase}/documents`, data, { headers: { "Content-Type": "multipart/form-data" } }),
  },
  salaryStructure: {
    list: (params?: Record<string, unknown>) => api.get(`${payrollBase}/salary-structure`, { params }),
    create: (data: unknown) => api.post(`${payrollBase}/salary-structure`, data),
    update: (id: number, data: unknown) => api.put(`${payrollBase}/salary-structure/${id}`, data),
  },
  leavePolicy: {
    listTypes: () => api.get(`${payrollBase}/leave-policy/types`),
    listPolicies: () => api.get(`${payrollBase}/leave-policy/policies`),
    createPolicy: (data: unknown) => api.post(`${payrollBase}/leave-policy/policies`, data),
    listAssignments: (params?: Record<string, unknown>) =>
      api.get(`${payrollBase}/leave-policy/assignments`, { params }),
  },
  components: {
    list: (params?: Record<string, unknown>) => api.get(`${payrollBase}/payroll-components`, { params }),
    create: (data: unknown) => api.post(`${payrollBase}/payroll-components`, data),
    update: (id: number, data: unknown) => api.put(`${payrollBase}/payroll-components/${id}`, data),
  },
  shift: {
    listShifts: () => api.get(`${payrollBase}/shift/shifts`),
    listHolidayCalendars: () => api.get(`${payrollBase}/shift/holiday-calendars`),
    listWorkCalendars: () => api.get(`${payrollBase}/shift/work-calendars`),
  },
  leaveOpeningBalances: {
    list: (params?: Record<string, unknown>) => api.get(`${payrollBase}/leave-opening-balances`, { params }),
    create: (data: unknown) => api.post(`${payrollBase}/leave-opening-balances`, data),
    approve: (id: number) => api.post(`${payrollBase}/leave-opening-balances/${id}/approve`),
  },
  leaveApplications: {
    list: (params?: Record<string, unknown>) => api.get(`${payrollBase}/leave-applications`, { params }),
    create: (data: unknown) => api.post(`${payrollBase}/leave-applications`, data),
    submit: (id: number) => api.post(`${payrollBase}/leave-applications/${id}/submit`),
    approve: (id: number) => api.post(`${payrollBase}/leave-applications/${id}/approve`),
    reject: (id: number, data?: unknown) => api.post(`${payrollBase}/leave-applications/${id}/reject`, data),
    cancel: (id: number) => api.post(`${payrollBase}/leave-applications/${id}/cancel`),
  },
  attendance: {
    listLogs: (params?: Record<string, unknown>) => api.get(`${payrollBase}/attendance/logs`, { params }),
    importLogs: (logs: unknown[]) => api.post(`${payrollBase}/attendance/logs/import`, { logs }),
    listDailySummaries: (params?: Record<string, unknown>) =>
      api.get(`${payrollBase}/attendance/daily-summaries`, { params }),
    adjustDaily: (data: unknown) => api.post(`${payrollBase}/attendance/daily-summaries/adjust`, data),
    generateStaff: (data: unknown) => api.post(`${payrollBase}/attendance/generate-staff`, data),
    monthlySummary: (params?: Record<string, unknown>) =>
      api.get(`${payrollBase}/attendance/monthly-summary`, { params }),
    payrollReadiness: (params?: Record<string, unknown>) =>
      api.get(`${payrollBase}/attendance/payroll-readiness`, { params }),
  },
  labourTimesheets: {
    list: (params?: Record<string, unknown>) => api.get(`${payrollBase}/labour-timesheets`, { params }),
    getById: (id: number) => api.get(`${payrollBase}/labour-timesheets/${id}`),
    create: (data: unknown) => api.post(`${payrollBase}/labour-timesheets`, data),
    update: (id: number, data: unknown) => api.put(`${payrollBase}/labour-timesheets/${id}`, data),
    submit: (id: number) => api.post(`${payrollBase}/labour-timesheets/${id}/submit`),
    approve: (id: number) => api.post(`${payrollBase}/labour-timesheets/${id}/approve`),
  },
  overtime: {
    list: (params?: Record<string, unknown>) => api.get(`${payrollBase}/overtime-requests`, { params }),
    create: (data: unknown) => api.post(`${payrollBase}/overtime-requests`, data),
    submit: (id: number) => api.post(`${payrollBase}/overtime-requests/${id}/submit`),
    approve: (id: number, data?: unknown) => api.post(`${payrollBase}/overtime-requests/${id}/approve`, data),
    reject: (id: number) => api.post(`${payrollBase}/overtime-requests/${id}/reject`),
  },
  attendancePeriods: {
    list: () => api.get(`${payrollBase}/attendance-periods`),
    generate: (data: unknown) => api.post(`${payrollBase}/attendance-periods/generate`, data),
    approve: (id: number) => api.post(`${payrollBase}/attendance-periods/${id}/approve`),
    lock: (id: number) => api.post(`${payrollBase}/attendance-periods/${id}/lock`),
  },
  operations: {
    dashboard: (params?: Record<string, unknown>) => api.get(`${payrollBase}/operations/dashboard`, { params }),
  },
  reports: {
    monthlyAttendance: (params?: Record<string, unknown>) =>
      api.get(`${payrollBase}/reports/monthly-attendance`, { params }),
    labourTimesheet: (params?: Record<string, unknown>) =>
      api.get(`${payrollBase}/reports/labour-timesheet`, { params }),
    leaveBalance: (params?: Record<string, unknown>) =>
      api.get(`${payrollBase}/reports/leave-balance`, { params }),
    leaveTransaction: (params?: Record<string, unknown>) =>
      api.get(`${payrollBase}/reports/leave-transaction`, { params }),
    overtimeApproval: (params?: Record<string, unknown>) =>
      api.get(`${payrollBase}/reports/overtime-approval`, { params }),
    attendanceException: (params?: Record<string, unknown>) =>
      api.get(`${payrollBase}/reports/attendance-exception`, { params }),
  },
  processing: {
    payrollPeriods: {
      list: () => api.get(`${payrollBase}/payroll-periods`),
      generate: (data: unknown) => api.post(`${payrollBase}/payroll-periods/generate`, data),
      approve: (id: number) => api.post(`${payrollBase}/payroll-periods/${id}/approve`),
      lock: (id: number) => api.post(`${payrollBase}/payroll-periods/${id}/lock`),
    },
    runs: {
      list: (params?: Record<string, unknown>) => api.get(`${payrollBase}/runs`, { params }),
      getById: (id: number) => api.get(`${payrollBase}/runs/${id}`),
      create: (data: unknown) => api.post(`${payrollBase}/runs`, data),
      calculate: (id: number) => api.post(`${payrollBase}/runs/${id}/calculate`),
      approve: (id: number) => api.post(`${payrollBase}/runs/${id}/approve`),
      lock: (id: number) => api.post(`${payrollBase}/runs/${id}/lock`),
      reverse: (id: number) => api.post(`${payrollBase}/runs/${id}/reverse`),
    },
    adjustments: {
      list: (params?: Record<string, unknown>) => api.get(`${payrollBase}/adjustments`, { params }),
      create: (data: unknown) => api.post(`${payrollBase}/adjustments`, data),
      approve: (id: number) => api.post(`${payrollBase}/adjustments/${id}/approve`),
    },
    loans: {
      list: (params?: Record<string, unknown>) => api.get(`${payrollBase}/loans`, { params }),
      create: (data: unknown) => api.post(`${payrollBase}/loans`, data),
      listInstallments: (loanId: number) => api.get(`${payrollBase}/loans/${loanId}/installments`),
      addInstallment: (loanId: number, data: unknown) =>
        api.post(`${payrollBase}/loans/${loanId}/installments`, data),
      approveInstallment: (id: number) => api.post(`${payrollBase}/loan-installments/${id}/approve`),
    },
    register: (params?: Record<string, unknown>) => api.get(`${payrollBase}/register`, { params }),
    variance: (params?: Record<string, unknown>) => api.get(`${payrollBase}/variance`, { params }),
    dashboard: (params?: Record<string, unknown>) =>
      api.get(`${payrollBase}/calculation/dashboard`, { params }),
  },
  wps: {
    dashboard: () => api.get(`${payrollBase}/wps/dashboard`),
    configurations: {
      list: () => api.get(`${payrollBase}/wps/configurations`),
      create: (data: unknown) => api.post(`${payrollBase}/wps/configurations`, data),
      update: (id: number, data: unknown) => api.put(`${payrollBase}/wps/configurations/${id}`, data),
    },
    compliance: (params: { payroll_run_id: number }) =>
      api.get(`${payrollBase}/wps/compliance`, { params }),
    generate: (data: { payroll_run_id: number }) => api.post(`${payrollBase}/wps/generate`, data),
    batches: {
      list: (params?: Record<string, unknown>) => api.get(`${payrollBase}/wps/batches`, { params }),
      getById: (id: number) => api.get(`${payrollBase}/wps/batches/${id}`),
      review: (id: number) => api.post(`${payrollBase}/wps/batches/${id}/review`),
      approve: (id: number) => api.post(`${payrollBase}/wps/batches/${id}/approve`),
      export: (id: number, download?: boolean) =>
        api.post(`${payrollBase}/wps/batches/${id}/export`, null, {
          params: download ? { download: "1" } : undefined,
        }),
      cancel: (id: number) => api.post(`${payrollBase}/wps/batches/${id}/cancel`),
    },
    updateEmployeeBank: (employeeId: number, data: unknown) =>
      api.put(`${payrollBase}/employees/${employeeId}/wps-bank`, data),
    reports: {
      register: () => api.get(`${payrollBase}/wps/reports/register`),
      sifHistory: () => api.get(`${payrollBase}/wps/reports/sif-history`),
      complianceExceptions: (params: { payroll_run_id: number }) =>
        api.get(`${payrollBase}/wps/reports/compliance-exceptions`, { params }),
      bankValidation: () => api.get(`${payrollBase}/wps/reports/bank-validation`),
      emiratisation: (params?: Record<string, unknown>) =>
        api.get(`${payrollBase}/wps/reports/emiratisation`, { params }),
      gpssaEligibility: () => api.get(`${payrollBase}/wps/reports/gpssa-eligibility`),
    },
  },
  gpssa: {
    getConfiguration: () => api.get(`${payrollBase}/gpssa/configuration`),
    updateConfiguration: (data: unknown) => api.put(`${payrollBase}/gpssa/configuration`, data),
  },
  emiratisation: {
    getMetrics: (params?: Record<string, unknown>) => api.get(`${payrollBase}/emiratisation`, { params }),
  },
  settlement: {
    dashboard: () => api.get(`${payrollBase}/settlements/dashboard`),
    separations: {
      list: (params?: Record<string, unknown>) => api.get(`${payrollBase}/separations`, { params }),
      getById: (id: number) => api.get(`${payrollBase}/separations/${id}`),
      create: (data: unknown) => api.post(`${payrollBase}/separations`, data),
      update: (id: number, data: unknown) => api.put(`${payrollBase}/separations/${id}`, data),
      submit: (id: number) => api.post(`${payrollBase}/separations/${id}/submit`),
      approve: (id: number) => api.post(`${payrollBase}/separations/${id}/approve`),
      cancel: (id: number) => api.post(`${payrollBase}/separations/${id}/cancel`),
    },
    settlements: {
      list: (params?: Record<string, unknown>) => api.get(`${payrollBase}/settlements`, { params }),
      getById: (id: number) => api.get(`${payrollBase}/settlements/${id}`),
      create: (data: unknown) => api.post(`${payrollBase}/settlements`, data),
      calculate: (id: number) => api.post(`${payrollBase}/settlements/${id}/calculate`),
      approve: (id: number) => api.post(`${payrollBase}/settlements/${id}/approve`),
      lock: (id: number) => api.post(`${payrollBase}/settlements/${id}/lock`),
      cancel: (id: number) => api.post(`${payrollBase}/settlements/${id}/cancel`),
    },
    eos: {
      list: () => api.get(`${payrollBase}/eos/configurations`),
      create: (data: unknown) => api.post(`${payrollBase}/eos/configurations`, data),
      update: (id: number, data: unknown) => api.put(`${payrollBase}/eos/configurations/${id}`, data),
      listTiers: (configId: number) => api.get(`${payrollBase}/eos/configurations/${configId}/tiers`),
      createTier: (configId: number, data: unknown) =>
        api.post(`${payrollBase}/eos/configurations/${configId}/tiers`, data),
    },
    reports: {
      register: () => api.get(`${payrollBase}/settlements/reports/register`),
      eosLiability: () => api.get(`${payrollBase}/settlements/reports/eos-liability`),
      leaveEncashment: () => api.get(`${payrollBase}/settlements/reports/leave-encashment`),
      separations: () => api.get(`${payrollBase}/settlements/reports/separations`),
      variance: () => api.get(`${payrollBase}/settlements/reports/variance`),
    },
  },
  finance: {
    dashboard: () => api.get(`${payrollBase}/finance/dashboard`),
    reconciliation: () => api.get(`${payrollBase}/reconciliation`),
    accountConfig: {
      get: () => api.get(`${payrollBase}/account-config`),
      update: (data: unknown) => api.put(`${payrollBase}/account-config`, data),
    },
    employeeLedger: (params: { employee_id: number }) =>
      api.get(`${payrollBase}/employee-ledger`, { params }),
    post: {
      run: (id: number) => api.post(`${payrollBase}/post/run/${id}`),
      reverseRun: (id: number) => api.post(`${payrollBase}/post/run/${id}/reverse`),
      settlement: (id: number) => api.post(`${payrollBase}/post/settlement/${id}`),
      reverseSettlement: (id: number) => api.post(`${payrollBase}/post/settlement/${id}/reverse`),
      wpsClear: (id: number) => api.post(`${payrollBase}/post/wps/${id}/clear`),
    },
    reports: {
      postingRegister: () => api.get(`${payrollBase}/finance/reports/posting-register`),
      employeeLedger: (params?: Record<string, unknown>) =>
        api.get(`${payrollBase}/finance/reports/employee-ledger`, { params }),
      liabilities: () => api.get(`${payrollBase}/finance/reports/liabilities`),
      eosProvision: () => api.get(`${payrollBase}/finance/reports/eos-provision`),
      loanRecovery: () => api.get(`${payrollBase}/finance/reports/loan-recovery`),
      glReconciliation: () => api.get(`${payrollBase}/finance/reports/gl-reconciliation`),
    },
  },
  documentsHub: {
    dashboard: () => api.get(`${payrollBase}/documents-hub/dashboard`),
    payslips: {
      list: (params?: Record<string, unknown>) => api.get(`${payrollBase}/payslips`, { params }),
      getById: (id: number) => api.get(`${payrollBase}/payslips/${id}`),
      generate: (data: { payroll_run_employee_id: number }) =>
        api.post(`${payrollBase}/payslips/generate`, data),
      batch: (data: { payroll_run_id: number }) => api.post(`${payrollBase}/payslips/batch`, data),
      publish: (data: { payroll_run_id: number }) => api.post(`${payrollBase}/payslips/publish`, data),
      void: (id: number) => api.post(`${payrollBase}/payslips/${id}/void`),
      download: (id: number) =>
        api.get(`${payrollBase}/payslips/${id}/download`, { responseType: "blob" }),
    },
    certificates: {
      list: () => api.get(`${payrollBase}/certificates`),
      generate: (data: { employee_id: number; certificate_type?: string }) =>
        api.post(`${payrollBase}/certificates/generate`, data),
      download: (id: number) =>
        api.get(`${payrollBase}/certificates/${id}/download`, { responseType: "blob" }),
    },
    settlementDocuments: {
      generate: (settlementId: number) =>
        api.post(`${payrollBase}/settlement-documents/${settlementId}/generate`),
      download: (id: number) =>
        api.get(`${payrollBase}/settlement-documents/${id}/download`, { responseType: "blob" }),
    },
    ledgerStatements: {
      generate: (data: { employee_id: number }) =>
        api.post(`${payrollBase}/ledger-statements/generate`, data),
      download: (id: number) =>
        api.get(`${payrollBase}/ledger-statements/${id}/download`, { responseType: "blob" }),
    },
    exports: {
      listTypes: () => api.get(`${payrollBase}/exports/types`),
      list: () => api.get(`${payrollBase}/exports`),
      create: (data: { report_type: string; format: string; parameters?: Record<string, unknown> }) =>
        api.post(`${payrollBase}/exports`, data),
      download: (id: number) =>
        api.get(`${payrollBase}/exports/${id}/download`, { responseType: "blob" }),
    },
    distribution: {
      prepare: (data: unknown) => api.post(`${payrollBase}/distribution/prepare`, data),
      archive: (data: { export_ids?: number[]; payslip_ids?: number[] }, download?: boolean) =>
        api.post(`${payrollBase}/distribution/archive`, data, {
          params: download ? { download: "1" } : undefined,
          responseType: download ? "blob" : undefined,
        }),
      queue: () => api.get(`${payrollBase}/distribution/queue`),
    },
    reports: {
      payslipRegister: () => api.get(`${payrollBase}/documents-hub/reports/payslip-register`),
      salaryCertificateRegister: () =>
        api.get(`${payrollBase}/documents-hub/reports/salary-certificate-register`),
      payrollHistory: (params?: { employee_id?: number }) =>
        api.get(`${payrollBase}/documents-hub/reports/payroll-history`, { params }),
      payrollTrend: () => api.get(`${payrollBase}/documents-hub/reports/payroll-trend`),
      payrollCostSummary: () => api.get(`${payrollBase}/documents-hub/reports/payroll-cost-summary`),
    },
  },
};
