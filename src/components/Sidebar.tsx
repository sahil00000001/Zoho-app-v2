"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";

const NAV_GROUPS = [
  {
    label: "Main",
    items: [
      { href: "/dashboard",               label: "Dashboard",     icon: "⊞",  module: "dashboard" },
      { href: "/dashboard/attendance",    label: "Attendance",    icon: "🕐",  module: "attendance" },
      { href: "/dashboard/leaves",        label: "Leaves",        icon: "🌿",  module: "leaves" },
      { href: "/dashboard/announcements", label: "Announcements", icon: "📢",  module: "announcements" },
      { href: "/dashboard/employees",     label: "Employees",     icon: "👥",  module: "users" },
    ],
  },
  {
    label: "Personal",
    items: [
      { href: "/dashboard/approvals",     label: "Approvals",     icon: "✅",  module: "approvals" },
      { href: "/dashboard/profile",       label: "My Profile",    icon: "👤",  module: "profile" },
    ],
  },
];

const ROLE_BADGES: Record<string, { label: string; color: string }> = {
  EMPLOYEE: { label: "Employee",   color: "#3b82f6" },
  MANAGER:  { label: "Manager",    color: "#22c55e" },
  HR:       { label: "HR",         color: "#a855f7" },
  ADMIN:    { label: "Super Admin",color: "#ef4444" },
};

interface SidebarProps {
  mobileOpen?: boolean;
  onClose?: () => void;
}

export default function Sidebar({ mobileOpen = false, onClose }: SidebarProps) {
  const path = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const { user, canAccess, logout } = useAuth();

  // Close mobile sidebar on navigation
  useEffect(() => {
    if (mobileOpen && onClose) onClose();
  }, [path]); // eslint-disable-line react-hooks/exhaustive-deps

  const initials = user ? `${user.firstName[0]}${user.lastName[0]}`.toUpperCase() : "U";
  const roleBadge = user ? ROLE_BADGES[user.role] : null;
  const customRole = user?.customRole;

  function isActive(href: string) {
    return href === "/dashboard" ? path === href : path.startsWith(href);
  }

  const sidebarContent = (
    <aside
      className={`${collapsed ? "w-[64px]" : "w-[240px]"} transition-all duration-300 ease-in-out flex flex-col bg-white h-full`}
      style={{ borderRight: "1px solid #f0f0f0", boxShadow: "1px 0 20px rgba(0,0,0,0.04)" }}
    >
      {/* Logo */}
      <div className={`h-16 flex items-center shrink-0 ${collapsed ? "justify-center px-3" : "px-5 gap-3"}`}
        style={{ borderBottom: "1px solid #f5f5f5" }}>
        <div
          className="w-9 h-9 rounded-2xl flex items-center justify-center shrink-0"
          style={{ background: "linear-gradient(135deg, rgb(220,38,38), rgb(249,115,22))", boxShadow: "0 4px 12px rgba(220,38,38,0.3)" }}
        >
          <span className="text-white font-black text-sm">A</span>
        </div>
        {!collapsed && (
          <div>
            <span className="font-black text-base tracking-tight gradient-text">Atlas</span>
            <div className="text-[10px] text-gray-400 font-medium -mt-0.5">HR Platform</div>
          </div>
        )}
        {/* Close button on mobile */}
        {!collapsed && onClose && (
          <button onClick={onClose} className="ml-auto p-1 rounded-lg text-gray-400 hover:text-gray-600 lg:hidden">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-5">
        {NAV_GROUPS.map(group => {
          const visibleItems = group.items.filter(item => canAccess(item.module));
          if (visibleItems.length === 0) return null;
          return (
            <div key={group.label}>
              {!collapsed && (
                <div className="px-2 mb-2">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{group.label}</span>
                </div>
              )}
              <div className="space-y-0.5">
                {visibleItems.map(item => {
                  const active = isActive(item.href);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      title={collapsed ? item.label : undefined}
                      className={`flex items-center gap-3 rounded-xl text-sm font-medium transition-all duration-150 group relative
                        ${collapsed ? "justify-center p-3" : "px-3 py-2.5"}
                        ${active
                          ? "text-white"
                          : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                        }`}
                      style={active ? {
                        background: "linear-gradient(90deg, rgb(220,38,38), rgb(249,115,22))",
                        boxShadow: "0 4px 16px rgba(220,38,38,0.28)",
                      } : {}}
                    >
                      <span className={`text-base shrink-0 leading-none ${!active ? "group-hover:scale-110 transition-transform" : ""}`}>
                        {item.icon}
                      </span>
                      {!collapsed && (
                        <span className="flex-1 truncate text-[13px] font-semibold">{item.label}</span>
                      )}
                      {active && !collapsed && (
                        <span className="w-1.5 h-1.5 rounded-full bg-white/70 shrink-0" />
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })}
      </nav>

      {/* Bottom user section */}
      <div className="shrink-0 px-3 pb-3 pt-2" style={{ borderTop: "1px solid #f5f5f5" }}>
        {/* User card */}
        {!collapsed && user && (
          <Link
            href="/dashboard/profile"
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-gray-50 transition-colors mb-1 group"
          >
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center text-white text-xs font-bold shrink-0 group-hover:scale-105 transition-transform"
              style={{ background: "linear-gradient(135deg, rgb(220,38,38), rgb(249,115,22))" }}
            >
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-bold text-gray-900 truncate leading-none">
                {user.firstName} {user.lastName}
              </div>
              <div className="mt-1">
                {customRole ? (
                  <span
                    className="text-[10px] font-bold px-1.5 py-0.5 rounded-full text-white"
                    style={{ background: customRole.color || "#6366f1" }}
                  >
                    {customRole.name}
                  </span>
                ) : roleBadge ? (
                  <span
                    className="text-[10px] font-bold px-1.5 py-0.5 rounded-full text-white"
                    style={{ background: roleBadge.color }}
                  >
                    {roleBadge.label}
                  </span>
                ) : null}
              </div>
            </div>
          </Link>
        )}

        {collapsed && user && (
          <Link
            href="/dashboard/profile"
            title="My Profile"
            className="flex justify-center p-2.5 rounded-xl hover:bg-gray-50 transition-colors mb-1"
          >
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center text-white text-xs font-bold"
              style={{ background: "linear-gradient(135deg, rgb(220,38,38), rgb(249,115,22))" }}
            >
              {initials}
            </div>
          </Link>
        )}

        {/* Sign out */}
        <button
          onClick={logout}
          title="Sign out"
          className={`w-full flex items-center gap-2.5 py-2 rounded-xl text-gray-400 hover:bg-red-50 hover:text-red-500 transition-colors text-xs font-medium mb-1
            ${collapsed ? "justify-center px-2" : "px-3"}`}
        >
          <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          {!collapsed && <span>Sign out</span>}
        </button>

        {/* Collapse toggle — desktop only */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="hidden lg:flex w-full items-center justify-center p-2 rounded-xl text-gray-300 hover:bg-gray-50 hover:text-gray-500 transition-colors"
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          <svg
            className={`w-4 h-4 transition-transform duration-300 ${collapsed ? "rotate-180" : ""}`}
            fill="none" stroke="currentColor" viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
          </svg>
        </button>
      </div>
    </aside>
  );

  return (
    <>
      {/* Desktop sidebar — always visible on lg+ */}
      <div className="hidden lg:flex shrink-0 sticky top-0 h-screen">
        {sidebarContent}
      </div>

      {/* Mobile drawer overlay */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={onClose}
          />
          {/* Drawer */}
          <div className="relative z-10 flex h-full">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
}
