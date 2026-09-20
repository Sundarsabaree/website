const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

const getHeaders = () => {
  const token =
    localStorage.getItem("crm_access_token") || localStorage.getItem("token");

  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

const buildQuery = (params?: Record<string, any>) => {
  if (!params) return "";

  const search = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      search.append(key, String(value));
    }
  });

  const query = search.toString();
  return query ? `?${query}` : "";
};

export const api = {
  async get(endpoint: string) {
    const res = await fetch(`${BASE_URL}${endpoint}`, {
      headers: getHeaders(),
    });

    const json = await res.json();

    if (!res.ok) {
      throw new Error(json?.message || `API Error: ${res.statusText}`);
    }

    return { data: json };
  },

  async post(endpoint: string, data: unknown) {
    const res = await fetch(`${BASE_URL}${endpoint}`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify(data),
    });

    const json = await res.json();

    if (!res.ok) {
      throw new Error(json?.message || `API Error: ${res.statusText}`);
    }

    return { data: json };
  },

  async put(endpoint: string, data: unknown) {
    const res = await fetch(`${BASE_URL}${endpoint}`, {
      method: "PUT",
      headers: getHeaders(),
      body: JSON.stringify(data),
    });

    const json = await res.json();

    if (!res.ok) {
      throw new Error(json?.message || `API Error: ${res.statusText}`);
    }

    return { data: json };
  },

  async delete(endpoint: string) {
    const res = await fetch(`${BASE_URL}${endpoint}`, {
      method: "DELETE",
      headers: getHeaders(),
    });

    let json = {};
    try {
      json = await res.json();
    } catch {}

    if (!res.ok) {
      throw new Error((json as any)?.message || `API Error: ${res.statusText}`);
    }

    return { data: json };
  },
};

// ================= AUTH =================

export const authService = {
  login: (credentials: any) => api.post("/auth/login", credentials),

  register: (data: any) => api.post("/auth/register", data),

  logout: (refreshToken?: string) => api.post("/auth/logout", { refreshToken }),

  me: () => api.get("/auth/me"),
};

// ============== NOTIFICATIONS ==============

export const notificationService = {
  getAll: () => api.get("/notifications"),

  markAsRead: (id: string) => api.put(`/notifications/${id}/read`, {}),

  markAllAsRead: () => api.put("/notifications/read-all", {}),

  delete: (id: string) => api.delete(`/notifications/${id}`),
};

// ================= CUSTOMERS =================

export const customerService = {
  getAll: (params?: Record<string, any>) =>
    api.get(`/customers${buildQuery(params)}`),

  getById: (id: string) => api.get(`/customers/${id}`),

  create: (data: any) => api.post("/customers", data),

  update: (id: string, data: any) => api.put(`/customers/${id}`, data),

  delete: (id: string) => api.delete(`/customers/${id}`),

  importCsv: (data: any) => api.post("/customers/import-csv", data),
};

// ================= EMPLOYEES =================

export const employeeService = {
  getAll: () => api.get("/employees"),

  getPerformance: () => api.get("/employees/performance"),
};

// ================= DASHBOARD =================

export const dashboardService = {
  getStats: () => api.get("/dashboard/stats"),

  getCharts: () => api.get("/dashboard/charts"),

  getActivities: () => api.get("/dashboard/activities"),
};
