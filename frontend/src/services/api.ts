const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

const getHeaders = () => {
  const token =
    localStorage.getItem("crm_access_token") || localStorage.getItem("token");

  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

let refreshPromise: Promise<boolean> | null = null;

const refreshAccessToken = async (): Promise<boolean> => {
  const refreshToken = localStorage.getItem("crm_refresh_token");
  if (!refreshToken) return false;

  if (!refreshPromise) {
    refreshPromise = fetch(`${BASE_URL}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
    })
      .then(async (res) => {
        if (!res.ok) return false;
        const json = await res.json();
        const tokens = json?.data;
        if (!tokens?.accessToken || !tokens?.refreshToken) return false;

        localStorage.setItem("crm_access_token", tokens.accessToken);
        localStorage.setItem("crm_refresh_token", tokens.refreshToken);
        return true;
      })
      .catch(() => false)
      .finally(() => {
        refreshPromise = null;
      });
  }

  return refreshPromise;
};

const request = async (
  endpoint: string,
  init: RequestInit,
  canRetry = true,
): Promise<any> => {
  const res = await fetch(`${BASE_URL}${endpoint}`, {
    ...init,
    headers: {
      ...getHeaders(),
      ...(init.headers || {}),
    },
  });

  if (res.status === 401 && canRetry && !endpoint.startsWith("/auth/")) {
    const refreshed = await refreshAccessToken();
    if (refreshed) return request(endpoint, init, false);
  }

  let json: any = {};
  try {
    json = await res.json();
  } catch {
    // Some proxy and download responses do not contain JSON.
  }

  if (!res.ok) {
    throw new Error(json?.message || `API Error: ${res.statusText}`);
  }

  return { data: json };
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
    return request(endpoint, { method: "GET" });
  },

  async post(endpoint: string, data: unknown) {
    return request(endpoint, {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  async put(endpoint: string, data: unknown) {
    return request(endpoint, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  },

  async delete(endpoint: string) {
    return request(endpoint, { method: "DELETE" });
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
  getAll: (params?: Record<string, any>) =>
    api.get(`/employees${buildQuery(params)}`),

  getPerformance: () => api.get("/employees/performance"),

  create: (data: any) => api.post("/employees", data),

  update: (id: string, data: any) => api.put(`/employees/${id}`, data),

  updateTeam: (id: string, salesExecutiveIds: string[]) =>
    api.put(`/employees/${id}/team`, { salesExecutiveIds }),

  delete: (id: string) => api.delete(`/employees/${id}`),
};

// ================= DASHBOARD =================

export const dashboardService = {
  getStats: () => api.get("/dashboard/stats"),

  getCharts: () => api.get("/dashboard/charts"),

  getActivities: () => api.get("/dashboard/activities"),

  getTeamPerformance: () => api.get("/dashboard/team-performance"),
};

// ================= LEADS =================

export const leadService = {
  getAll: (params?: Record<string, any>) =>
    api.get(`/leads${buildQuery(params)}`),

  create: (data: any) => api.post("/leads", data),

  update: (id: string, data: any) => api.put(`/leads/${id}`, data),

  delete: (id: string) => api.delete(`/leads/${id}`),
};

// ================= DEALS =================

export const dealService = {
  getAll: (params?: Record<string, any>) =>
    api.get(`/deals${buildQuery(params)}`),

  create: (data: any) => api.post("/deals", data),

  update: (id: string, data: any) => api.put(`/deals/${id}`, data),

  delete: (id: string) => api.delete(`/deals/${id}`),
};

// ================= TASKS =================

export const taskService = {
  getAll: (params?: Record<string, any>) =>
    api.get(`/tasks${buildQuery(params)}`),

  create: (data: any) => api.post("/tasks", data),

  update: (id: string, data: any) => api.put(`/tasks/${id}`, data),

  delete: (id: string) => api.delete(`/tasks/${id}`),
};

// ================= CALENDAR =================

export const calendarService = {
  getEvents: (params?: Record<string, any>) =>
    api.get(`/calendar/events${buildQuery(params)}`),

  createMeeting: (data: any) => api.post("/calendar/meetings", data),

  updateMeeting: (id: string, data: any) =>
    api.put(`/calendar/meetings/${id}`, data),

  deleteMeeting: (id: string) => api.delete(`/calendar/meetings/${id}`),
};

// ================= REPORTS =================

export const reportService = {
  getAnalytics: () => api.get("/reports/analytics"),

  // The export endpoint requires the Bearer token, so it can't just be a
  // plain <a href>; fetch it with auth headers and download the blob.
  async exportCsv(type: "customers" | "leads") {
    const res = await fetch(`${BASE_URL}/reports/export-csv?type=${type}`, {
      headers: getHeaders(),
    });
    if (!res.ok) {
      const message = await res
        .json()
        .then((j) => j?.message)
        .catch(() => null);
      throw new Error(message || "Failed to export report.");
    }
    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `smartcrm-${type}-export.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
  },
};

// ================= PROFILE / SETTINGS =================

export const profileService = {
  get: () => api.get("/profile"),

  update: (data: any) => api.put("/profile", data),

  changePassword: (data: { currentPassword: string; newPassword: string }) =>
    api.put("/profile/password", data),
};
