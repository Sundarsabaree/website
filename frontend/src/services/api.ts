import axios from 'axios';

export const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json'
  }
});

// Attach access token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('crm_access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Token Refresh Interceptor
let isRefreshing = false;
let failedQueue: Array<{ resolve: (token: string) => void; reject: (err: any) => void }> = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token!);
    }
  });
  failedQueue = [];
};

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry && !originalRequest.url?.includes('/auth/login')) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return api(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const refreshToken = localStorage.getItem('crm_refresh_token');
      if (!refreshToken) {
        localStorage.removeItem('crm_access_token');
        localStorage.removeItem('crm_refresh_token');
        localStorage.removeItem('crm_user');
        window.location.href = '/login';
        return Promise.reject(error);
      }

      try {
        const res = await axios.post('/api/auth/refresh', { refreshToken });
        const { accessToken, refreshToken: newRefreshToken } = res.data.data;

        localStorage.setItem('crm_access_token', accessToken);
        localStorage.setItem('crm_refresh_token', newRefreshToken);

        api.defaults.headers.common.Authorization = `Bearer ${accessToken}`;
        originalRequest.headers.Authorization = `Bearer ${accessToken}`;

        processQueue(null, accessToken);
        return api(originalRequest);
      } catch (refreshErr) {
        processQueue(refreshErr, null);
        localStorage.removeItem('crm_access_token');
        localStorage.removeItem('crm_refresh_token');
        localStorage.removeItem('crm_user');
        window.location.href = '/login';
        return Promise.reject(refreshErr);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

// API Endpoints Services
export const authService = {
  login: (data: any) => api.post('/auth/login', data),
  register: (data: any) => api.post('/auth/register', data),
  me: () => api.get('/auth/me'),
  logout: (refreshToken?: string) => api.post('/auth/logout', { refreshToken }),
  forgotPassword: (email: string) => api.post('/auth/forgot-password', { email }),
  resetPassword: (data: any) => api.post('/auth/reset-password', data)
};

export const customerService = {
  getAll: (params?: any) => api.get('/customers', { params }),
  getById: (id: string) => api.get(`/customers/${id}`),
  create: (data: any) => api.post('/customers', data),
  update: (id: string, data: any) => api.put(`/customers/${id}`, data),
  delete: (id: string) => api.delete(`/customers/${id}`),
  importCsv: (rows: any[]) => api.post('/customers/import-csv', { rows })
};

export const leadService = {
  getAll: (params?: any) => api.get('/leads', { params }),
  create: (data: any) => api.post('/leads', data),
  update: (id: string, data: any) => api.put(`/leads/${id}`, data),
  updateStage: (id: string, stage: string) => api.put(`/leads/${id}/stage`, { stage }),
  delete: (id: string) => api.delete(`/leads/${id}`)
};

export const dealService = {
  getAll: (params?: any) => api.get('/deals', { params }),
  create: (data: any) => api.post('/deals', data),
  update: (id: string, data: any) => api.put(`/deals/${id}`, data),
  delete: (id: string) => api.delete(`/deals/${id}`)
};

export const taskService = {
  getAll: (params?: any) => api.get('/tasks', { params }),
  create: (data: any) => api.post('/tasks', data),
  update: (id: string, data: any) => api.put(`/tasks/${id}`, data),
  delete: (id: string) => api.delete(`/tasks/${id}`)
};

export const calendarService = {
  getEvents: (params?: { start?: string; end?: string }) => api.get('/calendar/events', { params }),
  createMeeting: (data: any) => api.post('/calendar/meetings', data),
  updateMeeting: (id: string, data: any) => api.put(`/calendar/meetings/${id}`, data),
  deleteMeeting: (id: string) => api.delete(`/calendar/meetings/${id}`)
};

export const employeeService = {
  getAll: (params?: any) => api.get('/employees', { params }),
  getPerformance: () => api.get('/employees/performance'),
  create: (data: any) => api.post('/employees', data),
  update: (id: string, data: any) => api.put(`/employees/${id}`, data),
  delete: (id: string) => api.delete(`/employees/${id}`)
};

export const dashboardService = {
  getStats: () => api.get('/dashboard/stats'),
  getCharts: () => api.get('/dashboard/charts'),
  getActivities: () => api.get('/dashboard/activities')
};

export const reportService = {
  getAnalytics: () => api.get('/reports/analytics'),
  exportCsv: (type: 'customers' | 'leads') => api.get(`/reports/export-csv?type=${type}`, { responseType: 'blob' })
};

export const notificationService = {
  getAll: () => api.get('/notifications'),
  markAsRead: (id: string) => api.put(`/notifications/${id}/read`),
  markAllAsRead: () => api.put('/notifications/read-all'),
  delete: (id: string) => api.delete(`/notifications/${id}`)
};

export const profileService = {
  getProfile: () => api.get('/profile'),
  updateProfile: (data: any) => api.put('/profile', data),
  changePassword: (data: any) => api.put('/profile/password', data)
};
