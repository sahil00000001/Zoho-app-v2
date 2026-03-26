"use client";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import Link from "next/link";

const PAGE_META: Record<string, { title: string; icon: string }> = {
  "/dashboard":               { title: "Dashboard",     icon: "⊞" },
  "/dashboard/attendance":    { title: "Attendance",    icon: "🕐" },
  "/dashboard/leaves":        { title: "Leaves",        icon: "🌿" },
  "/dashboard/announcements": { title: "Announcements", icon: "📢" },
  "/dashboard/approvals":     { title: "Approvals",     icon: "✅" },
  "/dashboard/profile":       { title: "My Profile",    icon: "👤" },
};

export default function TopBar() {
  const path = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const meta = PAGE_META[path] || { title: "Atlas", icon: "⊞" };
  const today = new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" });
  const initials = user ? `${user.firstName[0]}${user.lastName[0]}`.toUpperCase() : "U";

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
      className={`h-16 bg-white flex items-center px-6 gap-4 shrink-0 sticky top-0 z-40 transition-all duration-200 ${
        scrolled ? "shadow-sm" : ""
      }`}
      style={{ borderBottom: "1px solid #f5f5f5" }}
    >
      {/* Page title */}
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <div
          className="w-8 h-8 rounded-xl flex items-center justify-center text-sm shrink-0"
          style={{ background: "linear-gradient(135deg, rgba(220,38,38,0.08), rgba(249,115,22,0.08))" }}
        >
          {meta.icon}
        </div>
        <div>
          <h1 className="text-sm font-bold text-gray-900 leading-none">{meta.title}</h1>
          <p className="text-xs text-gray-400 mt-0.5 hidden sm:block">{today}</p>
        </div>
      </div>

      {/* Right side */}
      <div className="flex items-center gap-2">
        {/* Profile link shortcut */}
        <Link
          href="/dashboard/profile"
          className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs text-gray-500 hover:bg-gray-50 hover:text-gray-800 transition-colors border border-transparent hover:border-gray-100"
        >
          <span>👤</span>
          <span className="font-medium">{user?.firstName}</span>
        </Link>

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
            <div className="absolute right-0 top-full mt-2 w-52 bg-white rounded-2xl shadow-xl border border-gray-100 py-1.5 z-50 animate-scale-in overflow-hidden">
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
              <div className="py-1">
                <Link
                  href="/dashboard/profile"
                  onClick={() => setShowUserMenu(false)}
                  className="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  <span>👤</span> My Profile
                </Link>
                <Link
                  href="/dashboard/announcements"
                  onClick={() => setShowUserMenu(false)}
                  className="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  <span>📢</span> Announcements
                </Link>
              </div>
              <div className="border-t border-gray-50 pt-1">
                <button
                  onClick={() => { setShowUserMenu(false); logout(); }}
                  className="w-full flex items-center gap-3 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                >
                  <span>↩</span> Sign out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
