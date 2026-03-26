"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { api, DashboardStats, ActivityItem } from "@/lib/api";

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return { text: "Good morning", emoji: "☀️" };
  if (h < 17) return { text: "Good afternoon", emoji: "⛅" };
  return { text: "Good evening", emoji: "🌙" };
}

function SkeletonCard() {
  return (
    <div className="card p-5 animate-pulse">
      <div className="skeleton h-10 w-10 rounded-xl mb-3" />
      <div className="skeleton h-7 w-16 mb-1.5 rounded-lg" />
      <div className="skeleton h-3.5 w-24 rounded" />
    </div>
  );
}

export default function DashboardPage() {
  const { user, isRole } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const greeting = getGreeting();

  useEffect(() => {
    Promise.all([api.getStats(), api.getActivity()])
      .then(([s, a]) => {
        setStats(s as DashboardStats);
        setActivity(a as ActivityItem[]);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const today = new Date().toLocaleDateString("en-IN", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });

  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* ── Hero Header ── */}
      <div className="relative overflow-hidden rounded-2xl p-6 text-white" style={{ background: "linear-gradient(135deg, rgb(220,38,38) 0%, rgb(234,67,22) 50%, rgb(249,115,22) 100%)" }}>
        {/* Background decoration */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-12 -right-12 w-48 h-48 rounded-full bg-white/10" />
          <div className="absolute -bottom-8 -left-8 w-36 h-36 rounded-full bg-white/5" />
          <div className="absolute top-1/2 right-1/4 w-24 h-24 rounded-full bg-white/5" />
        </div>

        <div className="relative z-10 flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-2xl">{greeting.emoji}</span>
              <p className="text-white/75 text-sm font-medium">{greeting.text}</p>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white mb-2">
              {user?.firstName} {user?.lastName}
            </h1>
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-xs bg-white/20 text-white px-3 py-1 rounded-full font-semibold backdrop-blur-sm">
                {user?.role}
              </span>
              {user?.department?.name && (
                <span className="text-xs bg-white/15 text-white/85 px-3 py-1 rounded-full">
                  {user.department.name}
                </span>
              )}
              {user?.designation && (
                <span className="text-xs text-white/70">{user.designation}</span>
              )}
            </div>
          </div>
          <div className="text-right shrink-0">
            <div className="text-white/60 text-xs mb-0.5">Today</div>
            <div className="text-white font-medium text-sm">{today}</div>
            {isRole("ADMIN", "HR") && stats?.pendingLeaves !== undefined && stats.pendingLeaves > 0 && (
              <div className="mt-2 bg-white/20 backdrop-blur-sm text-white text-xs px-3 py-1.5 rounded-xl font-medium">
                ⏳ {stats.pendingLeaves} pending approvals
              </div>
            )}
            {isRole("MANAGER") && stats?.pendingApprovals !== undefined && stats.pendingApprovals > 0 && (
              <div className="mt-2 bg-white/20 backdrop-blur-sm text-white text-xs px-3 py-1.5 rounded-xl font-medium">
                ⏳ {stats.pendingApprovals} requests waiting
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Stats Grid ── */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold text-gray-500 uppercase tracking-widest">Overview</h2>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {loading ? (
            Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)
          ) : (
            <>
              {isRole("ADMIN", "HR") && stats && (
                <>
                  <StatCard label="Total Employees" value={stats.totalEmployees ?? 0} icon="👤" variant="blue" trend="Total headcount" />
                  <StatCard label="Present Today" value={stats.presentToday ?? 0} icon="✅" variant="green" trend={`${stats.totalEmployees ? Math.round(((stats.presentToday ?? 0) / stats.totalEmployees) * 100) : 0}% attendance`} />
                  <StatCard label="On Leave" value={stats.onLeaveToday ?? 0} icon="🌴" variant="orange" trend="Active leaves" />
                  <StatCard label="Pending Approvals" value={stats.pendingLeaves ?? 0} icon="⏳" variant="red" trend="Needs review" urgent={(stats.pendingLeaves ?? 0) > 0} />
                </>
              )}
              {isRole("MANAGER") && stats && (
                <>
                  <StatCard label="Team Size" value={stats.teamSize ?? 0} icon="👥" variant="blue" trend="Direct reports" />
                  <StatCard label="Present Today" value={stats.teamPresent ?? 0} icon="✅" variant="green" trend={`of ${stats.teamSize} members`} />
                  <StatCard label="On Leave" value={stats.teamOnLeave ?? 0} icon="🌴" variant="orange" trend="Away today" />
                  <StatCard label="Pending Approvals" value={stats.pendingApprovals ?? 0} icon="⏳" variant="red" trend="Awaiting action" urgent={(stats.pendingApprovals ?? 0) > 0} />
                </>
              )}
              {isRole("EMPLOYEE") && stats && (
                <>
                  <StatCard label="Leaves Used" value={stats.leavesUsedThisYear ?? 0} icon="📅" variant="blue" trend="This year" />
                  <StatCard label="Pending Requests" value={stats.pendingLeaves ?? 0} icon="⏳" variant="orange" trend="Awaiting approval" />
                </>
              )}
            </>
          )}
        </div>
      </div>

      {/* ── Quick Actions ── */}
      <div>
        <h2 className="text-sm font-bold text-gray-500 uppercase tracking-widest mb-3">Quick Actions</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-3">
          <QuickAction href="/dashboard/attendance" icon="🕐" label="Attendance" sub="Check in / out" color="blue" />
          <QuickAction href="/dashboard/leaves" icon="🌿" label="Apply Leave" sub="Request time off" color="green" />
          <QuickAction href="/dashboard/announcements" icon="📢" label="Announcements" sub="Latest updates" color="purple" />
          <QuickAction href="/dashboard/profile" icon="👤" label="My Profile" sub="View & edit info" color="orange" />
          {isRole("MANAGER", "HR", "ADMIN") && (
            <QuickAction href="/dashboard/approvals" icon="✅" label="Approvals" sub="Review requests" color="red" />
          )}
          {isRole("HR", "ADMIN") && (
            <QuickAction href="/dashboard/onboarding" icon="🚀" label="Onboarding" sub="Manage new hires" color="teal" />
          )}
          <QuickAction href="/dashboard/directory" icon="👥" label="Directory" sub="Find colleagues" color="gray" />
          {isRole("ADMIN") && (
            <QuickAction href="/dashboard/users" icon="⚙️" label="Users" sub="Manage accounts" color="slate" />
          )}
        </div>
      </div>

      {/* ── Recent Activity ── */}
      {!loading && (
        <div className="animate-fade-in-up delay-200">
          <h2 className="text-sm font-bold text-gray-500 uppercase tracking-widest mb-3">Recent Activity</h2>
          {activity.length === 0 ? (
            <div className="card p-8 text-center">
              <p className="text-sm text-gray-400">No recent activity yet</p>
            </div>
          ) : (
            <div className="card p-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6">
                {activity.map((item) => (
                  <div key={item.id} className="flex items-start gap-2.5 py-2 border-b border-gray-50 last:border-0">
                    <span className="mt-0.5 shrink-0 text-sm leading-none">{ACTIVITY_ICON[item.type] ?? "📋"}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-gray-700 leading-snug line-clamp-1">{item.title}</p>
                      <p className="text-[11px] text-gray-400 mt-0.5">{timeAgo(item.date)}</p>
                    </div>
                    <span className={`shrink-0 text-[10px] font-semibold px-1.5 py-0.5 rounded-full mt-0.5 ${ACTIVITY_STATUS_COLOR[item.status] ?? "bg-gray-100 text-gray-500"}`}>
                      {ACTIVITY_STATUS_LABEL[item.status] ?? item.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ── Activity helpers ── */

const ACTIVITY_ICON: Record<string, string> = {
  leave:          "🌿",
  announcement:   "📢",
  regularization: "🔧",
  manager_change: "👥",
  new_user:       "🎉",
  attendance:     "🕐",
};
const ACTIVITY_STATUS_COLOR: Record<string, string> = {
  PENDING:   "bg-yellow-100 text-yellow-700",
  APPROVED:  "bg-green-100 text-green-700",
  REJECTED:  "bg-red-100 text-red-600",
  CANCELLED: "bg-gray-100 text-gray-500",
  ACTIVE:    "bg-green-100 text-green-700",
  UPDATED:   "bg-blue-100 text-blue-700",
  URGENT:    "bg-red-100 text-red-700",
  HIGH:      "bg-orange-100 text-orange-700",
  NORMAL:    "bg-purple-100 text-purple-600",
};
const ACTIVITY_STATUS_LABEL: Record<string, string> = {
  PENDING: "Pending", APPROVED: "Approved", REJECTED: "Rejected",
  CANCELLED: "Cancelled", ACTIVE: "Active", UPDATED: "Updated",
  URGENT: "Urgent", HIGH: "High", NORMAL: "Posted",
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return new Date(dateStr).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

/* ── Sub-components ── */

const STAT_VARIANTS = {
  blue:   { bg: "stat-blue",   icon: "text-blue-600",   val: "text-blue-700",  sub: "text-blue-500" },
  green:  { bg: "stat-green",  icon: "text-green-600",  val: "text-green-700", sub: "text-green-500" },
  orange: { bg: "stat-orange", icon: "text-orange-600", val: "text-orange-700",sub: "text-orange-500" },
  red:    { bg: "stat-red",    icon: "text-red-600",    val: "text-red-700",   sub: "text-red-500" },
  purple: { bg: "stat-purple", icon: "text-purple-600", val: "text-purple-700",sub: "text-purple-500" },
};

function StatCard({ label, value, icon, variant, trend, urgent }: {
  label: string; value: number; icon: string;
  variant: keyof typeof STAT_VARIANTS; trend?: string; urgent?: boolean;
}) {
  const v = STAT_VARIANTS[variant];
  return (
    <div className={`card card-interactive p-5 border ${v.bg} animate-count-up`}>
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl mb-3 bg-white/60 shadow-sm ${urgent ? "animate-pulse-soft" : ""}`}>
        {icon}
      </div>
      <div className={`text-3xl font-black mb-1 ${v.val}`}>{value}</div>
      <div className="text-xs font-semibold text-gray-700 mb-0.5">{label}</div>
      {trend && <div className={`text-xs ${v.sub} opacity-80`}>{trend}</div>}
    </div>
  );
}

const QUICK_COLORS: Record<string, { bg: string; hover: string; icon: string; label: string }> = {
  blue:   { bg: "bg-blue-50",   hover: "hover:bg-blue-100 hover:border-blue-200",   icon: "bg-blue-100",   label: "text-blue-700" },
  green:  { bg: "bg-green-50",  hover: "hover:bg-green-100 hover:border-green-200", icon: "bg-green-100",  label: "text-green-700" },
  orange: { bg: "bg-orange-50", hover: "hover:bg-orange-100 hover:border-orange-200",icon: "bg-orange-100",label: "text-orange-700" },
  red:    { bg: "bg-red-50",    hover: "hover:bg-red-100 hover:border-red-200",     icon: "bg-red-100",    label: "text-red-700" },
  purple: { bg: "bg-purple-50", hover: "hover:bg-purple-100 hover:border-purple-200",icon: "bg-purple-100",label: "text-purple-700" },
  teal:   { bg: "bg-teal-50",   hover: "hover:bg-teal-100 hover:border-teal-200",   icon: "bg-teal-100",   label: "text-teal-700" },
  gray:   { bg: "bg-gray-50",   hover: "hover:bg-gray-100 hover:border-gray-200",   icon: "bg-gray-100",   label: "text-gray-600" },
  slate:  { bg: "bg-slate-50",  hover: "hover:bg-slate-100 hover:border-slate-200", icon: "bg-slate-100",  label: "text-slate-600" },
};

function QuickAction({ href, icon, label, sub, color }: { href: string; icon: string; label: string; sub: string; color: string }) {
  const c = QUICK_COLORS[color] || QUICK_COLORS.gray;
  return (
    <Link
      href={href}
      className={`card card-interactive p-4 flex flex-col gap-2 group border ${c.bg} ${c.hover} transition-all`}
    >
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl ${c.icon} transition-transform group-hover:scale-110`}>
        {icon}
      </div>
      <div>
        <div className={`text-sm font-bold ${c.label}`}>{label}</div>
        <div className="text-xs text-gray-400 mt-0.5">{sub}</div>
      </div>
    </Link>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    PENDING:   "badge badge-pending",
    APPROVED:  "badge badge-approved",
    REJECTED:  "badge badge-rejected",
    CANCELLED: "badge badge-gray",
    PRESENT:   "badge badge-approved",
    ABSENT:    "badge badge-rejected",
  };
  return (
    <span className={map[status] || "badge badge-gray"}>
      {status.charAt(0) + status.slice(1).toLowerCase()}
    </span>
  );
}
