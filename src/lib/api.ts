const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

// ── In-memory GET cache ───────────────────────────────────────────────────
const _cache = new Map<string, { data: unknown; expiresAt: number }>();
// Longer TTL for data that rarely changes (leave types, departments, holidays)
const STABLE_ROUTES = ['/api/leave-types', '/api/users/departments', '/api/holidays', '/api/roles/modules'];
const CACHE_TTL        = 60_000;   // 60s for regular data
const STABLE_CACHE_TTL = 300_000;  // 5 min for stable reference data

function cacheGet<T>(key: string): T | null {
  const entry = _cache.get(key);
  if (entry && entry.expiresAt > Date.now()) return entry.data as T;
  return null;
}
function cacheSet(key: string, data: unknown) {
  const ttl = STABLE_ROUTES.some(r => key.startsWith(r)) ? STABLE_CACHE_TTL : CACHE_TTL;
  _cache.set(key, { data, expiresAt: Date.now() + ttl });
}
export function invalidateCache(prefix?: string) {
  if (!prefix) { _cache.clear(); return; }
  for (const key of _cache.keys()) {
    if (key.startsWith(prefix)) _cache.delete(key);
  }
}

// ── In-flight deduplication ───────────────────────────────────────────────
// Prevents duplicate HTTP requests when two components request the same URL simultaneously
const _inflight = new Map<string, Promise<unknown>>();

function getTokens() {
  if (typeof window === 'undefined') return { accessToken: null, refreshToken: null };
  return {
    accessToken: localStorage.getItem('accessToken'),
    refreshToken: localStorage.getItem('refreshToken'),
  };
}

function setTokens(accessToken: string, refreshToken: string) {
  localStorage.setItem('accessToken', accessToken);
  localStorage.setItem('refreshToken', refreshToken);
}

function clearTokens() {
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
  localStorage.removeItem('user');
}

async function fetchOnce<T>(path: string, options: RequestInit, retry: boolean): Promise<T> {
  const { accessToken, refreshToken } = getTokens();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  if (accessToken) headers['Authorization'] = `Bearer ${accessToken}`;

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });

  if (res.status === 401 && retry && refreshToken) {
    try {
      const refreshRes = await fetch(`${API_BASE}/api/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });
      if (refreshRes.ok) {
        const data = await refreshRes.json();
        setTokens(data.data.accessToken, data.data.refreshToken);
        return fetchOnce<T>(path, options, false);
      }
    } catch {}
    clearTokens();
    throw new Error('Session expired. Please log in again.');
  }

  const data = await res.json();
  if (!res.ok) throw new Error(data.error?.message || 'Request failed');
  return data.data as T;
}

async function request<T>(path: string, options: RequestInit = {}, retry = true): Promise<T> {
  const method = (options.method ?? 'GET').toUpperCase();

  if (method === 'GET') {
    // 1. Return from cache if fresh
    const cached = cacheGet<T>(path);
    if (cached !== null) return cached;

    // 2. Deduplicate: if an identical request is already in-flight, share its promise
    const existing = _inflight.get(path);
    if (existing) return existing as Promise<T>;

    // 3. Fire the request, register it as in-flight, cache on success
    const promise = fetchOnce<T>(path, options, retry).then((result) => {
      cacheSet(path, result);
      return result;
    }).finally(() => {
      _inflight.delete(path);
    });
    _inflight.set(path, promise);
    return promise;
  }

  // Mutations: invalidate related cache keys
  const prefix = '/' + path.split('/').slice(1, 3).join('/');
  invalidateCache(prefix);

  return fetchOnce<T>(path, options, retry);
}

export const api = {
  // Auth
  sendOtp: (email: string) =>
    request('/api/auth/login', { method: 'POST', body: JSON.stringify({ email }) }),
  verifyOtp: (email: string, otp: string) =>
    request<{ accessToken: string; refreshToken: string; user: User }>('/api/auth/verify-otp', {
      method: 'POST',
      body: JSON.stringify({ email, otp }),
    }),
  getMe: () => request<User>('/api/auth/me'),
  logout: () => {
    const { refreshToken } = getTokens();
    clearTokens();
    return fetch(`${API_BASE}/api/auth/logout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    }).catch(() => {});
  },

  // Dashboard
  getStats: () => request<DashboardStats>('/api/dashboard/stats'),
  getActivity: () => request<ActivityItem[]>('/api/dashboard/activity'),

  // Attendance
  checkIn: (location?: { lat: number; lng: number; address?: string }, isWFH?: boolean) =>
    request('/api/attendance/check-in', { method: 'POST', body: JSON.stringify({ ...location, isWFH }) }),
  checkOut: (location?: { lat: number; lng: number; address?: string }) =>
    request('/api/attendance/check-out', { method: 'POST', body: JSON.stringify(location ?? {}) }),
  reCheckIn: () =>
    request('/api/attendance/re-check-in', { method: 'POST', body: JSON.stringify({}) }),
  getTodayAttendance: () => request('/api/attendance/today'),
  getAttendanceHistory: (limit?: number) =>
    request(`/api/attendance/history${limit ? `?limit=${limit}` : ''}`),
  getMonthlyAttendance: (month?: string) =>
    request(`/api/attendance/monthly${month ? `?month=${month}` : ''}`),
  getTeamAttendance: (date?: string) =>
    request(`/api/attendance/team${date ? `?date=${date}` : ''}`),
  getDailyAttendance: (date?: string) =>
    request<TeamDailyEntry[]>(`/api/attendance/daily${date ? `?date=${date}` : ''}`),
  getRegularizations: () => request('/api/attendance/regularizations'),
  submitRegularization: (data: { date: string; reason: string; requestedCheckIn?: string; requestedCheckOut?: string }) =>
    request('/api/attendance/regularizations', { method: 'POST', body: JSON.stringify(data) }),
  approveRegularization: (id: string) =>
    request(`/api/attendance/regularizations/${id}/approve`, { method: 'PATCH' }),
  rejectRegularization: (id: string, reviewNote?: string) =>
    request(`/api/attendance/regularizations/${id}/reject`, { method: 'PATCH', body: JSON.stringify({ reviewNote }) }),

  // Leaves
  getMyLeaves: () => request('/api/leaves/my'),
  applyLeave: (data: ApplyLeaveData) =>
    request('/api/leaves', { method: 'POST', body: JSON.stringify(data) }),
  cancelLeave: (id: string) => request(`/api/leaves/${id}/cancel`, { method: 'PATCH' }),
  getAllLeaves: (params?: { status?: string; userId?: string }) => {
    const clean = Object.fromEntries(
      Object.entries(params ?? {}).filter(([, v]) => v !== undefined && v !== '' && v !== 'undefined')
    );
    const qs = new URLSearchParams(clean).toString();
    return request(`/api/leaves${qs ? `?${qs}` : ''}`);
  },
  approveLeave: (id: string) => request(`/api/leaves/${id}/approve`, { method: 'PATCH' }),
  rejectLeave: (id: string, reason?: string) =>
    request(`/api/leaves/${id}/reject`, { method: 'PATCH', body: JSON.stringify({ reason }) }),
  getLeaveBalance: () => request('/api/leaves/balance/me'),
  getLeaveTypes: () => request('/api/leave-types'),
  getLeaveCalendar: (month?: string) => {
    const qs = month ? `?month=${month}` : '';
    return request<CalendarLeave[]>(`/api/leaves/calendar${qs}`);
  },

  // Holidays
  getHolidays: (year?: number) => request(`/api/holidays${year ? `?year=${year}` : ''}`),
  addHoliday: (data: { name: string; date: string; type?: string }) =>
    request('/api/holidays', { method: 'POST', body: JSON.stringify(data) }),
  deleteHoliday: (id: string) => request(`/api/holidays/${id}`, { method: 'DELETE' }),
  seedHolidays: () => request('/api/holidays/seed', { method: 'POST' }),

  // Comp-off
  getCompOffs: () => request('/api/compoffs'),
  getCompOffBalance: () => request('/api/compoffs/balance'),
  requestCompOff: (data: { earnedDate: string; reason: string }) =>
    request('/api/compoffs', { method: 'POST', body: JSON.stringify(data) }),
  approveCompOff: (id: string) => request(`/api/compoffs/${id}/approve`, { method: 'PATCH' }),
  rejectCompOff: (id: string) => request(`/api/compoffs/${id}/reject`, { method: 'PATCH' }),

  // Profile
  getMyProfile: () => request('/api/profile/me'),
  updateProfile: (data: Partial<ProfileUpdateData>) =>
    request('/api/profile/me', { method: 'PATCH', body: JSON.stringify(data) }),
  updateBasicInfo: (data: { phoneNumber?: string; designation?: string }) =>
    request('/api/profile/me/basic', { method: 'PATCH', body: JSON.stringify(data) }),
  addSkill: (name: string, level?: string) =>
    request('/api/profile/me/skills', { method: 'POST', body: JSON.stringify({ name, level }) }),
  deleteSkill: (id: string) => request(`/api/profile/me/skills/${id}`, { method: 'DELETE' }),
  addCertification: (data: CertificationData) =>
    request('/api/profile/me/certifications', { method: 'POST', body: JSON.stringify(data) }),
  deleteCertification: (id: string) => request(`/api/profile/me/certifications/${id}`, { method: 'DELETE' }),
  getMyKRA: () => request('/api/profile/me/kra'),
  uploadKRA: (data: { title: string; period?: string; fileUrl: string; fileName: string; fileSize?: number; mimeType?: string }) =>
    request('/api/profile/me/kra', { method: 'POST', body: JSON.stringify(data) }),
  deleteKRA: (id: string) => request(`/api/profile/me/kra/${id}`, { method: 'DELETE' }),
  getAllKRA: () => request('/api/profile/kra/all'),
  getProfileById: (userId: string) => request(`/api/profile/${userId}`),

  // Announcements
  getAnnouncements: () => request('/api/announcements'),
  getAllAnnouncements: () => request('/api/announcements/all'),
  createAnnouncement: (data: AnnouncementData) =>
    request('/api/announcements', { method: 'POST', body: JSON.stringify(data) }),
  updateAnnouncement: (id: string, data: Partial<AnnouncementData>) =>
    request(`/api/announcements/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteAnnouncement: (id: string) => request(`/api/announcements/${id}`, { method: 'DELETE' }),
  shareAnnouncement: (id: string) =>
    request(`/api/announcements/${id}/send`, { method: 'POST' }),
  getCelebrations: () => request('/api/announcements/celebrations'),

  // Onboarding
  initOnboarding: (userId: string) => request(`/api/onboarding/init/${userId}`, { method: 'POST' }),
  getMyOnboarding: () => request('/api/onboarding/me'),
  getOnboarding: (userId: string) => request(`/api/onboarding/${userId}`),
  updateOnboardingTask: (id: string, status: string, notes?: string) =>
    request(`/api/onboarding/tasks/${id}`, { method: 'PATCH', body: JSON.stringify({ status, notes }) }),
  addOnboardingTask: (userId: string, data: { title: string; description?: string; category: string; dueDay: number; responsibleRole?: string }) =>
    request(`/api/onboarding/${userId}/tasks`, { method: 'POST', body: JSON.stringify(data) }),
  deleteOnboardingTask: (id: string) => request(`/api/onboarding/tasks/${id}`, { method: 'DELETE' }),
  listAssets: (status?: string) => {
    const qs = status ? `?status=${status}` : '';
    return request(`/api/onboarding/assets/list${qs}`);
  },
  addAsset: (data: { type: string; name: string; serialNumber?: string; model?: string; notes?: string }) =>
    request('/api/onboarding/assets', { method: 'POST', body: JSON.stringify(data) }),
  assignAsset: (assetId: string, userId: string, condition?: string, notes?: string) =>
    request(`/api/onboarding/assets/${assetId}/assign`, { method: 'POST', body: JSON.stringify({ userId, condition, notes }) }),
  returnAsset: (assignmentId: string) =>
    request(`/api/onboarding/assets/assignments/${assignmentId}/return`, { method: 'PATCH' }),
  getUserAssets: (userId: string) => request(`/api/onboarding/assets/user/${userId}`),
  getMyAssets: () => request('/api/onboarding/assets/my'),
  listITProvisions: (userId?: string) => {
    const qs = userId ? `?userId=${userId}` : '';
    return request(`/api/onboarding/it-provisions${qs}`);
  },
  updateITProvision: (id: string, status: string, notes?: string) =>
    request(`/api/onboarding/it-provisions/${id}`, { method: 'PATCH', body: JSON.stringify({ status, notes }) }),
  addITProvision: (userId: string, item: string) =>
    request(`/api/onboarding/${userId}/it-provisions`, { method: 'POST', body: JSON.stringify({ item }) }),

  // Users / Directory
  getUsers: (params?: { role?: string; departmentId?: string; isActive?: string; search?: string }) => {
    const qs = new URLSearchParams(
      Object.entries(params ?? {})
        .filter(([, v]) => v !== undefined && v !== null && v !== '' && v !== 'undefined')
        .map(([k, v]) => [k, v as string])
    ).toString();
    return request(`/api/users${qs ? `?${qs}` : ''}`);
  },
  getUser: (id: string) => request(`/api/users/${id}`),
  createUser: (data: CreateUserData) =>
    request('/api/users', { method: 'POST', body: JSON.stringify(data) }),
  updateUser: (id: string, data: Partial<CreateUserData>) =>
    request(`/api/users/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deactivateUser: (id: string) => request(`/api/users/${id}`, { method: 'DELETE' }),
  getDepartments: () => request('/api/users/departments'),

  // Roles & Permissions
  getRoles: () => request<CustomRole[]>('/api/roles'),
  getRole: (id: string) => request<CustomRole>(`/api/roles/${id}`),
  getModules: () => request<AppModule[]>('/api/roles/modules'),
  getMyPermissions: () => request<MyPermissions>('/api/roles/my-permissions'),
  createRole: (data: { name: string; description?: string; basePermissionLevel: string; color?: string; moduleKeys: string[] }) =>
    request('/api/roles', { method: 'POST', body: JSON.stringify(data) }),
  updateRole: (id: string, data: { name?: string; description?: string; basePermissionLevel?: string; color?: string; moduleKeys?: string[] }) =>
    request(`/api/roles/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteRole: (id: string) => request(`/api/roles/${id}`, { method: 'DELETE' }),
  seedRoles: () => request('/api/roles/seed', { method: 'POST' }),

  // Audit Logs
  getAuditLogs: (params?: { userId?: string; module?: string; action?: string; from?: string; to?: string; limit?: number; offset?: number }) => {
    const qs = new URLSearchParams(Object.entries(params ?? {}).filter(([,v]) => v !== undefined).map(([k,v]) => [k, String(v)])).toString();
    return request<{ total: number; logs: AuditLog[]; limit: number; offset: number }>(`/api/audit${qs ? `?${qs}` : ''}`);
  },
  getErrorLogs: (params?: { from?: string; to?: string; limit?: number; offset?: number }) => {
    const qs = new URLSearchParams(Object.entries(params ?? {}).filter(([,v]) => v !== undefined).map(([k,v]) => [k, String(v)])).toString();
    return request<{ total: number; logs: ErrorLog[]; limit: number; offset: number }>(`/api/audit/errors${qs ? `?${qs}` : ''}`);
  },

  // Org Chart
  getOrgChart: () => request('/api/org-chart'),
  assignManager: (userId: string, managerId: string | null) =>
    request('/api/org-chart/assign', { method: 'PATCH', body: JSON.stringify({ userId, managerId }) }),
  bulkAssignManagers: (assignments: { userId: string; managerId: string | null }[]) =>
    request('/api/org-chart/bulk-assign', { method: 'PATCH', body: JSON.stringify({ assignments }) }),

  // Tokens
  setTokens,
  clearTokens,
  getTokens,

  // Warm up the backend serverless function (fire-and-forget)
  warmup: () => fetch(`${API_BASE}/api/health`, { cache: 'no-store' }).catch(() => {}),
};

// Types
export interface User {
  id: string;
  employeeId: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'EMPLOYEE' | 'MANAGER' | 'HR' | 'ADMIN';
  designation?: string;
  phoneNumber?: string;
  joiningDate?: string;
  isActive: boolean;
  managerId?: string;
  customRoleId?: string;
  customRole?: { id: string; name: string; color: string };
  department?: { id: string; name: string };
  manager?: { id: string; firstName: string; lastName: string; employeeId: string };
  permissions?: MyPermissions;
}

export interface AppModule {
  key: string;
  name: string;
  icon: string;
}

export interface CustomRole {
  id: string;
  name: string;
  description?: string;
  basePermissionLevel: string;
  isSystem: boolean;
  color: string;
  createdAt: string;
  modulePermissions: { moduleKey: string; canAccess: boolean }[];
  _count?: { users: number };
}

export interface MyPermissions {
  customRole: { id: string; name: string; color: string } | null;
  modules: string[];
}

export interface AuditLog {
  id: string;
  userId?: string;
  userEmail?: string;
  userName?: string;
  action: string;
  module: string;
  resourceId?: string;
  details?: Record<string, unknown>;
  ipAddress?: string;
  createdAt: string;
}

export interface ErrorLog {
  id: string;
  message: string;
  stack?: string;
  endpoint?: string;
  method?: string;
  userId?: string;
  statusCode?: number;
  createdAt: string;
}

export interface DashboardStats {
  role: string;
  // Employee
  todayAttendance?: unknown;
  pendingLeaves?: number;
  leavesUsedThisYear?: number;
  // Manager
  teamSize?: number;
  teamPresent?: number;
  teamOnLeave?: number;
  pendingApprovals?: number;
  // Admin/HR
  totalEmployees?: number;
  presentToday?: number;
  onLeaveToday?: number;
  absentToday?: number;
}

export interface ActivityItem {
  id: string;
  type: string;
  title: string;
  status: string;
  date: string;
}

export interface ApplyLeaveData {
  leaveTypeId: string;
  startDate: string;
  endDate: string;
  reason: string;
}

export interface CreateUserData {
  email: string;
  firstName: string;
  lastName: string;
  role: 'EMPLOYEE' | 'MANAGER' | 'HR' | 'ADMIN';
  designation?: string;
  phoneNumber?: string;
  departmentId?: string;
  managerId?: string;
  joiningDate?: string;
}

export interface ProfileUpdateData {
  photoUrl?: string;
  bio?: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  emergencyName?: string;
  emergencyPhone?: string;
  emergencyRelation?: string;
  dateOfBirth?: string;
}

export interface AnnouncementData {
  title: string;
  content: string;
  type?: 'COMPANY' | 'DEPARTMENT';
  priority?: 'HIGH' | 'NORMAL' | 'LOW';
  departmentId?: string;
  expiresAt?: string;
  isPinned?: boolean;
}

export interface TeamDailyEntry {
  user: {
    id: string;
    firstName: string;
    lastName: string;
    employeeId: string;
    designation?: string;
    department?: { name: string };
  };
  attendance: {
    id: string;
    checkInTime: string | null;
    checkOutTime: string | null;
    checkInAddress?: string | null;
    checkOutAddress?: string | null;
    workHours: number | null;
    overtimeHours: number | null;
    isWFH: boolean;
    status: string;
  } | null;
}

export interface CalendarLeave {
  id: string;
  status: 'APPROVED' | 'PENDING';
  startDate: string;
  endDate: string;
  reason: string;
  leaveType: { id: string; name: string };
  user: {
    id: string;
    employeeId: string;
    firstName: string;
    lastName: string;
    designation?: string;
    department?: { name: string };
  };
}

export interface CertificationData {
  name: string;
  issuer?: string;
  issueDate?: string;
  expiryDate?: string;
  credentialId?: string;
}
