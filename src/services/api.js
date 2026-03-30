import axios from 'axios';
import toast from 'react-hot-toast';

const BASE_URL = import.meta.env.VITE_API_URL || '/api';

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
});

// Track if we're refreshing to avoid loops
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach(prom => error ? prom.reject(error) : prom.resolve(token));
  failedQueue = [];
};

// Request interceptor - attach token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken');
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor - handle 401 / refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      // Login failures should pass through so the UI can show a toast
      if (originalRequest.url === '/auth/login') {
        return Promise.reject(error);
      }

      if (originalRequest.url === '/auth/refresh') {
        // Refresh failed — force re-login
        localStorage.clear();
        window.location.href = '/login';
        return Promise.reject(error);
      }

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then(token => {
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return api(originalRequest);
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const refreshToken = localStorage.getItem('refreshToken');
      if (!refreshToken) {
        localStorage.clear();
        window.location.href = '/login';
        return Promise.reject(error);
      }

      try {
        const { data } = await api.post('/auth/refresh', { refreshToken });
        const newToken = data.data.accessToken;
        localStorage.setItem('accessToken', newToken);
        localStorage.setItem('refreshToken', data.data.refreshToken);
        processQueue(null, newToken);
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        localStorage.clear();
        window.location.href = '/login';
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    // Show error toast for non-401 errors
    if (error.response?.status !== 401) {
      const message = error.response?.data?.message || 'An unexpected error occurred';
      if (error.response?.status >= 500) toast.error(message);
    }

    return Promise.reject(error);
  }
);

// API helpers
export const authAPI = {
  login: (data) => api.post('/auth/login', data),
  logout: () => api.post('/auth/logout'),
  refresh: (token) => api.post('/auth/refresh', { refreshToken: token }),
  getMe: () => api.get('/auth/me'),
  updateProfile: (data) => api.put('/auth/profile', data),
  changePassword: (data) => api.put('/auth/change-password', data),
};

export const usersAPI = {
  getAll: (params) => api.get('/users', { params }),
  getById: (id) => api.get(`/users/${id}`),
  create: (data) => api.post('/users', data),
  update: (id, data) => api.put(`/users/${id}`, data),
  delete: (id) => api.delete(`/users/${id}`),
  updatePermissions: (id, data) => api.put(`/users/${id}/permissions`, data),
  resetPassword: (id, data) => api.post(`/users/${id}/reset-password`, data),
  getLoginHistory: (id) => api.get(`/users/${id}/login-history`),
  getStats: () => api.get('/users/stats'),
};

export const rolesAPI = {
  getAll: () => api.get('/roles'),
  getById: (id) => api.get(`/roles/${id}`),
  create: (data) => api.post('/roles', data),
  update: (id, data) => api.put(`/roles/${id}`, data),
  delete: (id) => api.delete(`/roles/${id}`),
  updatePermissions: (roleId, data) => api.put(`/roles/${roleId}/permissions`, data),
};

export const modulesAPI = {
  getAll: () => api.get('/modules'),
};

export const dashboardAPI = {
  getStats: () => api.get('/dashboard/stats'),
};

export const departmentsAPI = {
  delete: (id) => api.delete(`/departments/${id}`),
  getAll: () => api.get('/departments'),
  create: (data) => api.post('/departments', data),
  update: (id, data) => api.put(`/departments/${id}`, data),
};

export const auditAPI = {
  getLogs: (params) => api.get('/audit-logs', { params }),
};

export const settingsAPI = {
  getAll: () => api.get('/settings'),
  update: (data) => api.put('/settings', data),
};

export default api;

export const verticalsAPI = {
  getAll: (params) => api.get('/verticals', { params }),
  getById: (id) => api.get(`/verticals/${id}`),
  create: (data) => api.post('/verticals', data),
  update: (id, data) => api.put(`/verticals/${id}`, data),
  delete: (id) => api.delete(`/verticals/${id}`),
};

export const modulesManageAPI = {
  create: (data) => api.post('/modules/manage', data),
  getAll: () => api.get('/modules/manage'),
  update: (id, data) => api.put(`/modules/manage/${id}`, data),
  toggle: (id) => api.put(`/modules/manage/${id}/toggle`),
  getPermissions: (id) => api.get(`/modules/manage/${id}/permissions`),
};

export const ipTrackingAPI = {
  getLogs: (params) => api.get('/ip-tracking', { params }),
  getStats: () => api.get('/ip-tracking/stats'),
  getBlocked: () => api.get('/ip-tracking/blocked'),
  blockIP: (data) => api.post('/ip-tracking/block', data),
  unblockIP: (ip) => api.delete(`/ip-tracking/block/${encodeURIComponent(ip)}`),
  lookupIP: (ip) => api.get(`/ip-tracking/lookup/${encodeURIComponent(ip)}`),
};

export const companiesAPI = {
  getAll:   (params) => api.get('/companies', { params }),
  getById:  (id) => api.get(`/companies/${id}`),
  create:   (data) => api.post('/companies', data),
  update:   (id, data) => api.put(`/companies/${id}`, data),
  delete:   (id) => api.delete(`/companies/${id}`),
  getStats: () => api.get('/companies/stats'),
};

export const sitesAPI = {
  getAll:          (params) => api.get('/sites', { params }),
  getById:         (id) => api.get(`/sites/${id}`),
  getByCompany:    (companyId) => api.get(`/sites/by-company/${companyId}`),
  create:          (data) => api.post('/sites', data),
  update:          (id, data) => api.put(`/sites/${id}`, data),
  delete:          (id) => api.delete(`/sites/${id}`),
};

export const webServicesAPI = {
  getAll:          (params) => api.get('/web-services', { params }),
  getById:         (id) => api.get(`/web-services/${id}`),
  create:          (data) => api.post('/web-services', data),
  update:          (id, data) => api.put(`/web-services/${id}`, data),
  delete:          (id) => api.delete(`/web-services/${id}`),
  getStats:        () => api.get('/web-services/stats'),
  getEndpoints:    (id) => api.get(`/web-services/${id}/endpoints`),
  createEndpoint:  (id, data) => api.post(`/web-services/${id}/endpoints`, data),
  updateEndpoint:  (id, epId, data) => api.put(`/web-services/${id}/endpoints/${epId}`, data),
  deleteEndpoint:  (id, epId) => api.delete(`/web-services/${id}/endpoints/${epId}`),
  generateApiKey:  (id, data) => api.post(`/web-services/${id}/api-keys`, data),
  revokeApiKey:    (id, keyId) => api.delete(`/web-services/${id}/api-keys/${keyId}`),
  getLogs:         (id, params) => api.get(`/web-services/${id}/logs`, { params }),
  healthCheck:     (id) => api.post(`/web-services/${id}/health-check`),
};

// Change history endpoints
export const changeHistoryAPI = {
  getCompanyChanges:    (id) => api.get(`/companies/${id}/changes`),
  getCompanyDeps:       (id) => api.get(`/companies/${id}/dependencies`),
  getSiteChanges:       (id) => api.get(`/sites/${id}/changes`),
  getServiceChanges:    (id) => api.get(`/web-services/${id}/changes`),
};

export const tasksAPI = {
  getAll:       (params) => api.get('/tasks', { params }),
  getStats:     () => api.get('/tasks/stats'),
  getById:      (id) => api.get(`/tasks/${id}`),
  create:       (data) => api.post('/tasks', data),
  update:       (id, data) => api.put(`/tasks/${id}`, data),
  updateStatus: (id, status) => api.patch(`/tasks/${id}/status`, { status }),
  delete:       (id) => api.delete(`/tasks/${id}`),
  addComment:   (id, comment) => api.post(`/tasks/${id}/comments`, { comment }),
  deleteComment:(id, commentId) => api.delete(`/tasks/${id}/comments/${commentId}`),
};

export const notificationsAPI = {
  getAll:     (params) => api.get('/notifications', { params }),
  getCount:   () => api.get('/notifications/count'),
  markRead:   (id) => api.put(`/notifications/${id}/read`),
  markAllRead:() => api.put('/notifications/read-all'),
  delete:     (id) => api.delete(`/notifications/${id}`),
  clearRead:  () => api.delete('/notifications'),
};

export const hrAPI = {
  getStats:        () => api.get('/hr/stats'),
  getAll:          (params) => api.get('/hr', { params }),
  getById:         (id) => api.get(`/hr/${id}`),
  updateProfile:   (id, data) => api.put(`/hr/${id}/profile`, data),
};

export const attendanceAPI = {
  getStats:  (month) => api.get('/attendance/stats', { params: { month } }),
  getAll:    (params) => api.get('/attendance', { params }),
  getMy:     () => api.get('/attendance/my'),
  mark:      (data) => api.post('/attendance', data),
  checkIn:   () => api.post('/attendance/checkin'),
  checkOut:  () => api.post('/attendance/checkout'),
};

export const leaveAPI = {
  getStats:     () => api.get('/leave/stats'),
  getAll:       (params) => api.get('/leave', { params }),
  create:       (data) => api.post('/leave', data),
  updateStatus: (id, data) => api.put(`/leave/${id}/status`, data),
  delete:       (id) => api.delete(`/leave/${id}`),
};

export const projectsAPI = {
  getStats:  () => api.get('/projects/stats'),
  getAll:    (params) => api.get('/projects', { params }),
  getById:   (id) => api.get(`/projects/${id}`),
  create:    (data) => api.post('/projects', data),
  update:    (id, data) => api.put(`/projects/${id}`, data),
  delete:    (id) => api.delete(`/projects/${id}`),
};

export const reportsAPI = {
  headcount:  () => api.get('/reports/headcount'),
  attendance: (month) => api.get('/reports/attendance', { params: { month } }),
  leave:      (year) => api.get('/reports/leave', { params: { year } }),
  tasks:      () => api.get('/reports/tasks'),
  projects:   () => api.get('/reports/projects'),
};

export const emailSettingsAPI = {
  get:             () => api.get('/email-settings'),
  save:            (data) => api.put('/email-settings', data),
  testConnection:  () => api.post('/email-settings/test-connection'),
  sendTest:        (toEmail) => api.post('/email-settings/send-test', { toEmail }),
  getLogs:         () => api.get('/email-settings/logs'),
};

export const userDashboardAPI = {
  get: () => api.get('/user-dashboard'),
};

export const chatAPI = {
  getUsers:      (search) => api.get('/chat/users', { params: { search } }),
  getRooms:      () => api.get('/chat/rooms'),
  openDirect:    (userId) => api.post('/chat/rooms/direct', { userId }),
  createGroup:   (data) => api.post('/chat/rooms/group', data),
  getMessages:   (roomId, before) => api.get(`/chat/rooms/${roomId}/messages`, { params: { before, limit: 40 } }),
  sendMessage:   (roomId, data) => api.post(`/chat/rooms/${roomId}/messages`, data),
  editMessage:   (msgId, content) => api.put(`/chat/messages/${msgId}`, { content }),
  deleteMessage: (msgId) => api.delete(`/chat/messages/${msgId}`),
  reactMessage:  (msgId, emoji) => api.post(`/chat/messages/${msgId}/react`, { emoji }),
  getMembers:    (roomId) => api.get(`/chat/rooms/${roomId}/members`),
  addMembers:    (roomId, userIds) => api.post(`/chat/rooms/${roomId}/members`, { userIds }),
  leaveRoom:     (roomId) => api.delete(`/chat/rooms/${roomId}/leave`),
  markRead:      (roomId) => api.put(`/chat/rooms/${roomId}/read`),
};

export const supportAPI = {
  getTickets:   () => api.get('/support/tickets'),
  getAgents:    () => api.get('/support/agents'),
  createTicket: (data) => api.post('/support/tickets', data),
  getMessages:  (id) => api.get(`/support/tickets/${id}/messages`),
  sendMessage:  (id, data) => api.post(`/support/tickets/${id}/messages`, data),
  assign:       (id, agentId) => api.post(`/support/tickets/${id}/assign`, agentId ? { agentId } : {}),
  resolve:      (id) => api.patch(`/support/tickets/${id}/resolve`),
};
