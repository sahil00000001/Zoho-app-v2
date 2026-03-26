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

interface TodayRecord {
  checkInTime?: string | null;
  checkOutTime?: string | null;
  workHours?: number | null;
  overtimeHours?: number | null;
  status?: string;
  isWFH?: boolean;
}

interface BalanceItem {
  leaveType: { id: string; name: string };
  maxDays: number;
  usedDays: number;
  remainingDays: number;
}

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });
}

function elapsed(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

export default function DashboardPage() {
  const { user, isRole } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [todayAtt, setTodayAtt] = useState<TodayRecord | null | undefined>(undefined);
  const [balance, setBalance] = useState<BalanceItem[]>([]);
  const greeting = getGreeting();

  useEffect(() => {
    Promise.allSettled([
      api.getStats(),
      api.getActivity(),
      api.getTodayAttendance(),
      api.getLeaveBalance(),
    ]).then(([s, a, t, b]) => {
      if (s.status === "fulfilled") setStats(s.value as DashboardStats);
      if (a.status === "fulfilled") setActivity(a.value as ActivityItem[]);
      if (t.status === "fulfilled") setTodayAtt((t.value as TodayRecord) ?? null);
      else setTodayAtt(null);
      if (b.status === "fulfilled") setBalance(b.value as BalanceItem[]);
    }).finally(() => setLoading(false));
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

      {/* ── At a Glance ── */}
      <div>
        <h2 className="text-sm font-bold text-gray-500 uppercase tracking-widest mb-3">At a Glance</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">

          {/* Card 1 — Today's attendance status */}
          <div className="card p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="text-base">🕐</span>
                <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">Today</span>
              </div>
              {todayAtt?.isWFH && (
                <span className="text-[10px] font-bold bg-blue-50 text-blue-600 border border-blue-100 px-2 py-0.5 rounded-full">WFH</span>
              )}
            </div>

            {todayAtt === undefined ? (
              <div className="space-y-2 animate-pulse">
                <div className="skeleton h-5 w-28 rounded" />
                <div className="skeleton h-4 w-20 rounded" />
              </div>
            ) : todayAtt === null ? (
              <>
                <p className="text-sm font-bold text-gray-400">Not checked in</p>
                <p className="text-xs text-gray-400 mt-1">You haven&apos;t checked in yet today</p>
              </>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                    todayAtt.status === "LATE" ? "bg-orange-100 text-orange-700" : "bg-green-100 text-green-700"
                  }`}>{todayAtt.status}</span>
                </div>
                <div className="flex items-center gap-4 text-xs text-gray-500">
                  <span>In {todayAtt.checkInTime ? fmtTime(todayAtt.checkInTime) : "—"}</span>
                  {todayAtt.checkOutTime
                    ? <span>Out {fmtTime(todayAtt.checkOutTime)}</span>
                    : <span className="text-blue-500 font-semibold">{todayAtt.checkInTime ? elapsed(todayAtt.checkInTime) : "—"} elapsed</span>
                  }
                </div>
                {(todayAtt.workHours != null || todayAtt.checkInTime) && (
                  <div className="pt-1">
                    <div className="text-lg font-black text-gray-800">
                      {todayAtt.workHours != null
                        ? `${todayAtt.workHours.toFixed(1)}h`
                        : todayAtt.checkInTime ? elapsed(todayAtt.checkInTime) : "—"}
                    </div>
                    <div className="text-[11px] text-gray-400">
                      {todayAtt.checkOutTime ? "total today" : "so far"}
                      {todayAtt.overtimeHours && todayAtt.overtimeHours > 0
                        ? ` · +${todayAtt.overtimeHours.toFixed(1)}h OT` : ""}
                    </div>
                  </div>
                )}
              </div>
            )}

            <Link href="/dashboard/attendance"
              className="mt-4 flex items-center gap-1 text-xs font-semibold text-red-500 hover:text-red-600 transition-colors">
              {todayAtt ? "View full attendance" : "Go check in"} →
            </Link>
          </div>

          {/* Card 2 — Leave balance */}
          <div className="card p-5">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-base">🌿</span>
              <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">Leave Balance</span>
            </div>

            {loading ? (
              <div className="space-y-2 animate-pulse">
                {[1,2,3].map(i => <div key={i} className="skeleton h-4 w-full rounded" />)}
              </div>
            ) : balance.length === 0 ? (
              <p className="text-sm text-gray-400">No leave types configured</p>
            ) : (
              <div className="space-y-2.5">
                {balance.slice(0, 4).map((b) => {
                  const pct = b.maxDays > 0 ? Math.round((b.remainingDays / b.maxDays) * 100) : 0;
                  const barColor = pct > 50 ? "bg-green-400" : pct > 20 ? "bg-orange-400" : "bg-red-400";
                  return (
                    <div key={b.leaveType.id}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-gray-600 truncate max-w-[110px]">{b.leaveType.name}</span>
                        <span className="text-xs font-bold text-gray-800">{b.remainingDays}<span className="font-normal text-gray-400">/{b.maxDays}</span></span>
                      </div>
                      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full transition-all ${barColor}`} style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <Link href="/dashboard/leaves"
              className="mt-4 flex items-center gap-1 text-xs font-semibold text-red-500 hover:text-red-600 transition-colors">
              Apply for leave →
            </Link>
          </div>

          {/* Card 3 — Pending approvals (managers) or My leave status (employees) */}
          <div className="card p-5">
            {isRole("MANAGER", "HR", "ADMIN") ? (
              <>
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-base">⏳</span>
                  <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">Pending</span>
                </div>
                {loading ? (
                  <div className="space-y-2 animate-pulse">
                    <div className="skeleton h-8 w-16 rounded-lg" />
                    <div className="skeleton h-4 w-28 rounded" />
                  </div>
                ) : (
                  <>
                    <div className="text-4xl font-black" style={{
                      background: "linear-gradient(135deg, rgb(220,38,38), rgb(249,115,22))",
                      WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
                    }}>
                      {isRole("MANAGER")
                        ? (stats?.pendingApprovals ?? 0)
                        : (stats?.pendingLeaves ?? 0)}
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      {(isRole("MANAGER") ? (stats?.pendingApprovals ?? 0) : (stats?.pendingLeaves ?? 0)) === 0
                        ? "All caught up 🎉"
                        : "leave requests need your review"}
                    </p>
                    {isRole("ADMIN", "HR") && stats?.presentToday != null && (
                      <div className="mt-3 pt-3 border-t border-gray-50 flex gap-4 text-xs text-gray-500">
                        <span><span className="font-bold text-gray-800">{stats.presentToday}</span> present</span>
                        <span><span className="font-bold text-gray-800">{stats.onLeaveToday ?? 0}</span> on leave</span>
                        <span><span className="font-bold text-gray-800">{stats.absentToday ?? 0}</span> absent</span>
                      </div>
                    )}
                  </>
                )}
                <Link href="/dashboard/approvals"
                  className="mt-4 flex items-center gap-1 text-xs font-semibold text-red-500 hover:text-red-600 transition-colors">
                  Review requests →
                </Link>
              </>
            ) : (
              <>
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-base">📋</span>
                  <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">My Leaves</span>
                </div>
                {loading ? (
                  <div className="space-y-2 animate-pulse">
                    <div className="skeleton h-8 w-16 rounded-lg" />
                    <div className="skeleton h-4 w-28 rounded" />
                  </div>
                ) : (
                  <>
                    <div className="flex gap-5">
                      <div>
                        <div className="text-3xl font-black text-gray-800">{stats?.leavesUsedThisYear ?? 0}</div>
                        <div className="text-[11px] text-gray-400 mt-0.5">used this year</div>
                      </div>
                      {(stats?.pendingLeaves ?? 0) > 0 && (
                        <div>
                          <div className="text-3xl font-black text-orange-500">{stats?.pendingLeaves}</div>
                          <div className="text-[11px] text-gray-400 mt-0.5">pending approval</div>
                        </div>
                      )}
                    </div>
                    {(stats?.pendingLeaves ?? 0) === 0 && (
                      <p className="text-xs text-gray-400 mt-2">No pending requests</p>
                    )}
                  </>
                )}
                <Link href="/dashboard/leaves"
                  className="mt-4 flex items-center gap-1 text-xs font-semibold text-red-500 hover:text-red-600 transition-colors">
                  View leave history →
                </Link>
              </>
            )}
          </div>

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
