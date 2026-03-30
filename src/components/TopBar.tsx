"use client";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";
import Link from "next/link";

const PAGE_META: Record<string, { title: string; icon: string }> = {
  "/dashboard":               { title: "Dashboard",     icon: "⊞" },
  "/dashboard/attendance":    { title: "Attendance",    icon: "🕐" },
  "/dashboard/leaves":        { title: "Leaves",        icon: "🌿" },
  "/dashboard/announcements": { title: "Announcements", icon: "📢" },
  "/dashboard/approvals":     { title: "Approvals",     icon: "✅" },
  "/dashboard/profile":       { title: "My Profile",    icon: "👤" },
  "/dashboard/employees":     { title: "Employees",     icon: "👥" },
};

interface TopBarProps {
  onMenuClick?: () => void;
}

export default function TopBar({ onMenuClick }: TopBarProps) {
  const path = usePathname();
  const router = useRouter();
  const { user, logout, isRole } = useAuth();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const menuRef = useRef<HTMLDivElement>(null);

  const meta = PAGE_META[path] || { title: "ATLAS", icon: "⊞" };
  const today = new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" });
  const initials = user ? `${user.firstName[0]}${user.lastName[0]}`.toUpperCase() : "U";
  const canApprove = isRole("MANAGER", "HR", "ADMIN");

  // Fetch pending approvals count for notification bell
  useEffect(() => {
    if (!canApprove) return;
    api.getAllLeaves({ status: "PENDING" })
      .then((data: unknown) => setPendingCount((data as unknown[]).length))
      .catch(() => {});
  }, [canApprove, path]); // re-check when navigating

  useEffect(() => {
    const main = document.querySelector("main");
    if (!main) return;
    const onScroll = () => setScrolled(main.scrollTop > 8);
    main.addEventListener("scroll", onScroll);
    return () => main.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowUserMenu(false);
      }
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  return (
    <header
      className={`h-16 bg-white/80 backdrop-blur-md flex items-center px-6 gap-4 shrink-0 sticky top-0 z-40 transition-all duration-200 border-b border-slate-200 ${
        scrolled ? "shadow-sm" : ""
      }`}
    >
      {/* Hamburger — mobile only */}
      <button
        onClick={onMenuClick}
        className="lg:hidden p-2 -ml-1 rounded-xl text-gray-500 hover:bg-gray-100 transition-colors shrink-0"
        aria-label="Open menu"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      {/* Page title */}
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <div>
          <h1 className="text-sm font-bold text-slate-900 leading-none">{meta.title}</h1>
          <p className="text-xs text-slate-400 mt-0.5 hidden sm:block">{today}</p>
        </div>
      </div>

      {/* Right side */}
      <div className="flex items-center gap-2">

        {/* Notification bell — pending approvals */}
        {canApprove && (
          <Link
            href="/dashboard/approvals"
            className="relative p-2 rounded-xl text-gray-400 hover:bg-gray-50 hover:text-gray-700 transition-colors"
            title={pendingCount > 0 ? `${pendingCount} pending approvals` : "Approvals"}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
            {pendingCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center rounded-full text-white text-[10px] font-bold px-1"
                style={{ background: "linear-gradient(135deg, rgb(220,38,38), rgb(249,115,22))" }}>
                {pendingCount > 99 ? "99+" : pendingCount}
              </span>
            )}
          </Link>
        )}

        {/* User menu */}
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center gap-2.5 hover:bg-gray-50 rounded-xl px-2 py-1.5 transition-colors border border-transparent hover:border-gray-100 group"
          >
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center text-white text-xs font-bold shadow-sm transition-transform group-hover:scale-105"
              style={{ background: "linear-gradient(135deg, rgb(220,38,38), rgb(249,115,22))" }}
            >
              {initials}
            </div>
            <div className="hidden sm:block text-left">
              <div className="text-xs font-semibold text-gray-800 leading-none">{user?.firstName} {user?.lastName}</div>
              <div className="text-xs text-gray-400 mt-0.5">{user?.role}</div>
            </div>
            <svg className={`w-3 h-3 text-gray-400 transition-transform ${showUserMenu ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {showUserMenu && (
            <div className="absolute right-0 top-full mt-2 w-52 bg-white rounded-2xl shadow-xl border border-gray-100 py-1.5 z-50 overflow-hidden">
              {/* User info */}
              <div className="px-4 py-3 border-b border-gray-50">
                <div className="flex items-center gap-3">
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-xs font-bold shrink-0"
                    style={{ background: "linear-gradient(135deg, rgb(220,38,38), rgb(249,115,22))" }}
                  >
                    {initials}
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-gray-900 truncate">{user?.firstName} {user?.lastName}</div>
                    <div className="text-xs text-gray-400 truncate">{user?.email}</div>
                  </div>
                </div>
              </div>

              {/* Links */}
              <div className="py-1">
                <Link href="/dashboard/profile" onClick={() => setShowUserMenu(false)}
                  className="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                  <span>👤</span> My Profile
                </Link>
                <Link href="/dashboard/attendance" onClick={() => setShowUserMenu(false)}
                  className="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                  <span>🕐</span> Attendance
                </Link>
                <Link href="/dashboard/leaves" onClick={() => setShowUserMenu(false)}
                  className="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                  <span>🌿</span> My Leaves
                </Link>
                {canApprove && (
                  <Link href="/dashboard/approvals" onClick={() => setShowUserMenu(false)}
                    className="flex items-center justify-between gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                    <div className="flex items-center gap-3"><span>✅</span> Approvals</div>
                    {pendingCount > 0 && (
                      <span className="text-[10px] font-bold text-white px-1.5 py-0.5 rounded-full"
                        style={{ background: "linear-gradient(135deg, rgb(220,38,38), rgb(249,115,22))" }}>
                        {pendingCount}
                      </span>
                    )}
                  </Link>
                )}
                <Link href="/dashboard/announcements" onClick={() => setShowUserMenu(false)}
                  className="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                  <span>📢</span> Announcements
                </Link>
              </div>

              <div className="border-t border-gray-50 pt-1">
                <button
                  onClick={() => { setShowUserMenu(false); logout(); router.push("/login"); }}
                  className="w-full flex items-center gap-3 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  Sign out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
