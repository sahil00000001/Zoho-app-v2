"use client";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect, useRef, useCallback } from "react";
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
  "/dashboard/org-chart":     { title: "Org Chart",     icon: "🌐" },
};

// ── Notification type ─────────────────────────────────────────────────────────
interface Notif {
  id: string;
  icon: string;
  title: string;
  meta: string;
  badgeLabel: string;
  badgeColor: string; // 'orange' | 'green' | 'red' | 'blue'
  href: string;
}

interface TopBarProps {
  onMenuClick?: () => void;
}

const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short" });

const BADGE_STYLES: Record<string, string> = {
  orange: "bg-orange-50 text-orange-600 border border-orange-100",
  green:  "bg-green-50 text-green-600 border border-green-100",
  red:    "bg-red-50 text-red-600 border border-red-100",
  blue:   "bg-blue-50 text-blue-600 border border-blue-100",
};

export default function TopBar({ onMenuClick }: TopBarProps) {
  const path = usePathname();
  const router = useRouter();
  const { user, logout, isRole } = useAuth();

  const [showUserMenu, setShowUserMenu]     = useState(false);
  const [showNotifs,   setShowNotifs]       = useState(false);
  const [scrolled,     setScrolled]         = useState(false);
  const [notifications, setNotifications]   = useState<Notif[]>([]);
  const [notifLoading,  setNotifLoading]    = useState(false);
  const [notifBadge,    setNotifBadge]      = useState(0);

  const menuRef  = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);

  const meta       = PAGE_META[path] || { title: "ATLAS", icon: "⊞" };
  const today      = new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" });
  const initials   = user ? `${user.firstName[0]}${user.lastName[0]}`.toUpperCase() : "U";
  const canApprove = isRole("MANAGER", "HR", "ADMIN");

  // ── Single fetch → filter in JS ──────────────────────────────────────────
  const fetchNotifications = useCallback(async (silent = false) => {
    if (!silent) setNotifLoading(true);

    type LeaveItem   = { id: string; startDate: string; endDate: string; days: number; status: string; leaveType: { name: string }; user: { id: string; firstName: string; lastName: string } };
    type RegItem     = { id: string; date: string; reason: string; status: string; user: { id: string; firstName: string; lastName: string } };
    type CompoffItem = { id: string; earnedDate: string; reason: string; status: string; user: { id: string; firstName: string; lastName: string } };

    try {
      // One request per endpoint — all fired in parallel
      const [leavesRes, regsRes, compoffsRes] = await Promise.allSettled([
        api.getAllLeaves() as Promise<LeaveItem[]>,
        api.getRegularizations() as Promise<RegItem[]>,
        api.getCompOffs() as Promise<CompoffItem[]>,
      ]);

      const leaves   = leavesRes.status   === "fulfilled" ? leavesRes.value   : [];
      const regs     = regsRes.status     === "fulfilled" ? regsRes.value     : [];
      const compoffs = compoffsRes.status === "fulfilled" ? compoffsRes.value : [];

      const notifs: Notif[] = [];
      const myId = user?.id;

      // ── Pending items needing action (approvers) ──────────────────────────
      if (canApprove) {
        for (const l of leaves.filter(l => l.status === "PENDING").slice(0, 8)) {
          notifs.push({
            id: `leave-${l.id}`, icon: "🌿",
            title: `${l.user.firstName} ${l.user.lastName} — ${l.leaveType.name}`,
            meta: `${l.days} day${l.days !== 1 ? "s" : ""} · ${fmtDate(l.startDate)} → ${fmtDate(l.endDate)}`,
            badgeLabel: "Leave pending", badgeColor: "orange", href: "/dashboard/approvals",
          });
        }
        for (const r of regs.filter(r => r.status === "PENDING").slice(0, 5)) {
          notifs.push({
            id: `reg-${r.id}`, icon: "🕐",
            title: `${r.user.firstName} ${r.user.lastName} — Attendance Correction`,
            meta: `${fmtDate(r.date)} · ${r.reason}`,
            badgeLabel: "Regularization", badgeColor: "blue", href: "/dashboard/approvals",
          });
        }
        for (const c of compoffs.filter(c => c.status === "PENDING").slice(0, 5)) {
          notifs.push({
            id: `co-${c.id}`, icon: "⏰",
            title: `${c.user.firstName} ${c.user.lastName} — Comp-off Request`,
            meta: `Earned on ${fmtDate(c.earnedDate)} · ${c.reason}`,
            badgeLabel: "Comp-off", badgeColor: "blue", href: "/dashboard/approvals",
          });
        }
      }

      // ── Own resolved leaves (all users) — filter from same dataset ────────
      for (const l of leaves
        .filter(l => (canApprove ? l.user.id === myId : true) && (l.status === "APPROVED" || l.status === "REJECTED"))
        .slice(0, 5)) {
        notifs.push({
          id: `my-leave-${l.id}`,
          icon: l.status === "APPROVED" ? "✅" : "❌",
          title: `Your ${l.leaveType.name} was ${l.status === "APPROVED" ? "approved" : "rejected"}`,
          meta: `${l.days} day${l.days !== 1 ? "s" : ""} · ${fmtDate(l.startDate)} → ${fmtDate(l.endDate)}`,
          badgeLabel: l.status === "APPROVED" ? "Approved" : "Rejected",
          badgeColor: l.status === "APPROVED" ? "green" : "red",
          href: "/dashboard/leaves",
        });
      }

      // ── Own resolved regularizations (employees — same regs dataset) ──────
      if (!canApprove) {
        for (const r of regs.filter(r => r.status === "APPROVED" || r.status === "REJECTED").slice(0, 3)) {
          notifs.push({
            id: `my-reg-${r.id}`,
            icon: r.status === "APPROVED" ? "✅" : "❌",
            title: `Your attendance correction was ${r.status === "APPROVED" ? "approved" : "rejected"}`,
            meta: fmtDate(r.date),
            badgeLabel: r.status, badgeColor: r.status === "APPROVED" ? "green" : "red",
            href: "/dashboard/attendance",
          });
        }
      }

      setNotifications(notifs);
      setNotifBadge(notifs.filter(n => n.badgeColor === "orange" || n.badgeColor === "blue").length);
    } catch { /* silent */ }

    if (!silent) setNotifLoading(false);
  }, [canApprove, user?.id]);

  // ── Fetch on mount + auto-refresh every 60s ───────────────────────────────
  useEffect(() => {
    if (!user) return;
    fetchNotifications(true);
    const id = setInterval(() => fetchNotifications(true), 60_000);
    return () => clearInterval(id);
  }, [user, fetchNotifications]);

  // ── Refresh badge on navigation ───────────────────────────────────────────
  useEffect(() => {
    if (user) fetchNotifications(true);
  }, [path]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Scroll shadow ─────────────────────────────────────────────────────────
  useEffect(() => {
    const main = document.querySelector("main");
    if (!main) return;
    const onScroll = () => setScrolled(main.scrollTop > 8);
    main.addEventListener("scroll", onScroll);
    return () => main.removeEventListener("scroll", onScroll);
  }, []);

  // ── Click outside ─────────────────────────────────────────────────────────
  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node))
        setShowUserMenu(false);
      if (notifRef.current && !notifRef.current.contains(e.target as Node))
        setShowNotifs(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  // ── Toggle notification panel ─────────────────────────────────────────────
  const toggleNotifs = () => {
    const next = !showNotifs;
    setShowNotifs(next);
    setShowUserMenu(false);
    // Full refresh (with spinner) only when explicitly opening the panel
    if (next) fetchNotifications(false);
  };

  return (
    <header
      className={`h-16 bg-white/80 backdrop-blur-md flex items-center px-6 gap-4 shrink-0 sticky top-0 z-40 transition-all duration-200 border-b border-slate-200 ${
        scrolled ? "shadow-sm" : ""
      }`}
    >
      {/* Hamburger — mobile only */}
      <button onClick={onMenuClick}
        className="lg:hidden p-2 -ml-1 rounded-xl text-gray-500 hover:bg-gray-100 transition-colors shrink-0"
        aria-label="Open menu">
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

        {/* ── Notification bell ─────────────────────────────────────────── */}
        <div className="relative" ref={notifRef}>
          <button onClick={toggleNotifs}
            className={`relative p-2 rounded-xl transition-colors ${showNotifs ? "bg-slate-100 text-slate-700" : "text-gray-400 hover:bg-gray-50 hover:text-gray-700"}`}
            title="Notifications">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
            {notifBadge > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center rounded-full text-white text-[10px] font-bold px-1"
                style={{ background: "linear-gradient(135deg, #DC2626, #F97316)" }}>
                {notifBadge > 99 ? "99+" : notifBadge}
              </span>
            )}
          </button>

          {/* Notification dropdown panel */}
          {showNotifs && (
            <div className="absolute right-0 top-full mt-2 w-[360px] bg-white rounded-2xl shadow-2xl border border-slate-200 z-50 overflow-hidden"
              style={{ animation: "notifIn .15s ease-out" }}>

              {/* Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-slate-800">Notifications</span>
                  {notifBadge > 0 && (
                    <span className="text-[10px] font-bold text-white px-1.5 py-0.5 rounded-full"
                      style={{ background: "linear-gradient(135deg, #DC2626, #F97316)" }}>
                      {notifBadge}
                    </span>
                  )}
                </div>
                <button onClick={fetchNotifications}
                  title="Refresh"
                  className="text-slate-400 hover:text-slate-600 transition-colors text-base leading-none p-1 rounded-lg hover:bg-slate-50">
                  ↺
                </button>
              </div>

              {/* List */}
              <div className="max-h-[420px] overflow-y-auto divide-y divide-slate-50">
                {notifLoading ? (
                  <div className="flex flex-col items-center justify-center py-12 gap-3">
                    <div className="w-7 h-7 rounded-full border-2 border-slate-200 border-t-red-500 animate-spin" />
                    <p className="text-xs text-slate-400">Loading notifications…</p>
                  </div>
                ) : notifications.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 gap-2 text-center px-4">
                    <span className="text-3xl">🎉</span>
                    <p className="text-sm font-semibold text-slate-600">You&apos;re all caught up!</p>
                    <p className="text-xs text-slate-400">No pending notifications right now.</p>
                  </div>
                ) : (
                  notifications.map(n => (
                    <Link key={n.id} href={n.href}
                      onClick={() => setShowNotifs(false)}
                      className="flex items-start gap-3 px-4 py-3.5 hover:bg-slate-50 transition-colors group">
                      <span className="text-xl shrink-0 mt-0.5">{n.icon}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-800 leading-snug truncate group-hover:text-red-600 transition-colors">
                          {n.title}
                        </p>
                        <p className="text-xs text-slate-400 mt-0.5 truncate">{n.meta}</p>
                      </div>
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0 mt-0.5 whitespace-nowrap ${BADGE_STYLES[n.badgeColor]}`}>
                        {n.badgeLabel}
                      </span>
                    </Link>
                  ))
                )}
              </div>

              {/* Footer */}
              {canApprove && (
                <div className="border-t border-slate-100 px-4 py-2.5">
                  <Link href="/dashboard/approvals"
                    onClick={() => setShowNotifs(false)}
                    className="text-xs font-semibold text-red-500 hover:text-red-600 transition-colors">
                    View all approvals →
                  </Link>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── User menu ──────────────────────────────────────────────────── */}
        <div className="relative" ref={menuRef}>
          <button onClick={() => { setShowUserMenu(!showUserMenu); setShowNotifs(false); }}
            className="flex items-center gap-2.5 hover:bg-gray-50 rounded-xl px-2 py-1.5 transition-colors border border-transparent hover:border-gray-100 group">
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center text-white text-xs font-bold shadow-sm transition-transform group-hover:scale-105"
              style={{ background: "linear-gradient(135deg, rgb(220,38,38), rgb(249,115,22))" }}>
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
              <div className="px-4 py-3 border-b border-gray-50">
                <div className="flex items-center gap-3">
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-xs font-bold shrink-0"
                    style={{ background: "linear-gradient(135deg, rgb(220,38,38), rgb(249,115,22))" }}>
                    {initials}
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-gray-900 truncate">{user?.firstName} {user?.lastName}</div>
                    <div className="text-xs text-gray-400 truncate">{user?.email}</div>
                  </div>
                </div>
              </div>

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
                    {notifBadge > 0 && (
                      <span className="text-[10px] font-bold text-white px-1.5 py-0.5 rounded-full"
                        style={{ background: "linear-gradient(135deg, rgb(220,38,38), rgb(249,115,22))" }}>
                        {notifBadge}
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
                  className="w-full flex items-center gap-3 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  Sign out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes notifIn {
          from { opacity: 0; transform: translateY(-6px) scale(0.98); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </header>
  );
}
