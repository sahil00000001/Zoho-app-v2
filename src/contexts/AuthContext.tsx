"use client";
import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { api, User, MyPermissions } from "@/lib/api";

interface AuthContextType {
  user: User | null;
  permissions: MyPermissions | null;
  loading: boolean;
  login: (email: string, otp: string) => Promise<void>;
  logout: () => Promise<void>;
  isRole: (...roles: string[]) => boolean;
  canAccess: (module: string) => boolean;
  refreshPermissions: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

// Fallback when no customRole assigned
const DEFAULT_MODULE_ACCESS: Record<string, string[]> = {
  dashboard:     ['EMPLOYEE', 'MANAGER', 'HR', 'ADMIN'],
  attendance:    ['EMPLOYEE', 'MANAGER', 'HR', 'ADMIN'],
  leaves:        ['EMPLOYEE', 'MANAGER', 'HR', 'ADMIN'],
  announcements: ['EMPLOYEE', 'MANAGER', 'HR', 'ADMIN'],
  directory:     ['EMPLOYEE', 'MANAGER', 'HR', 'ADMIN'],
  profile:       ['EMPLOYEE', 'MANAGER', 'HR', 'ADMIN'],
  onboarding:    ['EMPLOYEE', 'MANAGER', 'HR', 'ADMIN'],
  approvals:     ['MANAGER', 'HR', 'ADMIN'],
  documents:     ['EMPLOYEE', 'MANAGER', 'HR', 'ADMIN'],
  users:         ['ADMIN', 'HR'],
  roles:         ['ADMIN'],
  audit:         ['ADMIN', 'HR'],
  'org-chart':   ['EMPLOYEE', 'MANAGER', 'HR', 'ADMIN'],
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [permissions, setPermissions] = useState<MyPermissions | null>(null);
  const [loading, setLoading] = useState(true);

  const loadPermissions = useCallback(async () => {
    try {
      const perms = await api.getMyPermissions();
      setPermissions(perms);
      localStorage.setItem('permissions', JSON.stringify(perms));
    } catch {
      // fall back to default
    }
  }, []);

  useEffect(() => {
    const stored = localStorage.getItem('user');
    const storedPerms = localStorage.getItem('permissions');
    if (stored) {
      try { setUser(JSON.parse(stored)); } catch {}
    }
    if (storedPerms) {
      try { setPermissions(JSON.parse(storedPerms)); } catch {}
    }

    const { accessToken } = api.getTokens();
    if (accessToken) {
      // getMe() is the auth gate — if it fails, clear session
      // getMyPermissions() is best-effort — failure must never log the user out
      api.getMe()
        .then(async (u) => {
          setUser(u);
          localStorage.setItem('user', JSON.stringify(u));
          try {
            const perms = await api.getMyPermissions();
            setPermissions(perms);
            localStorage.setItem('permissions', JSON.stringify(perms));
          } catch {
            // permissions endpoint failed — fall back to defaults, keep user logged in
          }
        })
        .catch(() => {
          api.clearTokens();
          localStorage.removeItem('permissions');
          setUser(null);
          setPermissions(null);
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = useCallback(async (email: string, otp: string) => {
    const result = await api.verifyOtp(email, otp);
    api.setTokens(result.accessToken, result.refreshToken);
    localStorage.setItem('user', JSON.stringify(result.user));
    setUser(result.user);
    // Fetch permissions after login
    try {
      const perms = await api.getMyPermissions();
      setPermissions(perms);
      localStorage.setItem('permissions', JSON.stringify(perms));
    } catch {}
  }, []);

  const logout = useCallback(async () => {
    await api.logout();
    localStorage.removeItem('permissions');
    setUser(null);
    setPermissions(null);
    window.location.href = '/login';
  }, []);

  const refreshPermissions = useCallback(async () => {
    await loadPermissions();
  }, [loadPermissions]);

  const isRole = useCallback((...roles: string[]) => {
    if (!user) return false;
    return roles.includes(user.role);
  }, [user]);

  const canAccess = useCallback((module: string) => {
    if (!user) return false;
    const defaultAllowed = (DEFAULT_MODULE_ACCESS[module] || []).includes(user.role);
    if (permissions?.modules) {
      // If module is explicitly granted by custom role — allow
      if (permissions.modules.includes(module)) return true;
      // Module not in stored role permissions — fall back to role-based default
      // This handles modules added after the role was originally seeded
      return defaultAllowed;
    }
    return defaultAllowed;
  }, [user, permissions]);

  return (
    <AuthContext.Provider value={{ user, permissions, loading, login, logout, isRole, canAccess, refreshPermissions }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
