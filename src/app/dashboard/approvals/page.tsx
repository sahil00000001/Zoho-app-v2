"use client";
import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";

// ── Types ─────────────────────────────────────────────────────────────────────
interface Leave {
  id: string;
  status: string;
  startDate: string;
  endDate: string;
  reason: string;
  createdAt: string;
  user: { id: string; employeeId: string; firstName: string; lastName: string; department?: { name: string }; designation?: string };
  leaveType: { id: string; name: string; maxDays: number };
}

interface Regularization {
  id: string;
  date: string;
  reason: string;
  requestedCheckIn: string | null;
  requestedCheckOut: string | null;
  status: "PENDING" | "APPROVED" | "REJECTED";
  reviewNote: string | null;
  createdAt: string;
  user: { id: string; employeeId: string; firstName: string; lastName: string; department?: { name: string }; designation?: string };
  attendance: { checkInTime: string | null; checkOutTime: string | null } | null;
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function leaveDays(start: string, end: string) {
  return Math.round((new Date(end).getTime() - new Date(start).getTime()) / 86400000) + 1;
}
function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}
function fmtTime(d: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}
function initials(u: { firstName: string; lastName: string }) {
  return `${u.firstName[0]}${u.lastName[0]}`.toUpperCase();
}

const STATUS_STYLE: Record<string, string> = {
  PENDING:  "bg-yellow-100 text-yellow-700 border-yellow-200",
  APPROVED: "bg-green-100 text-green-700 border-green-200",
  REJECTED: "bg-red-100 text-red-600 border-red-200",
};
const TYPE_COLORS = [
  "bg-blue-100 text-blue-700", "bg-purple-100 text-purple-700",
  "bg-teal-100 text-teal-700", "bg-orange-100 text-orange-700",
  "bg-pink-100 text-pink-700", "bg-indigo-100 text-indigo-700",
];
function leaveTypeColor(name: string) {
  let h = 0;
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) & 0xffff;
  return TYPE_COLORS[h % TYPE_COLORS.length];
}

// ── Avatar ────────────────────────────────────────────────────────────────────
function Avatar({ user }: { user: { firstName: string; lastName: string } }) {
  return (
    <div className="w-11 h-11 rounded-xl flex items-center justify-center text-white text-sm font-bold shrink-0 shadow-sm"
      style={{ background: "linear-gradient(135deg, rgb(220,38,38), rgb(249,115,22))" }}>
      {initials(user)}
    </div>
  );
}

// ── User row ──────────────────────────────────────────────────────────────────
function UserMeta({ user, status }: { user: Leave["user"] | Regularization["user"]; status: string }) {
  return (
    <div className="flex items-start justify-between gap-2 flex-wrap">
      <div>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-bold text-sm text-gray-900">{user.firstName} {user.lastName}</span>
          <span className="text-xs text-gray-400">{user.employeeId}</span>
          {user.department?.name && (
            <span className="text-[11px] bg-slate-100 text-gray-500 px-2 py-0.5 rounded-full">{user.department.name}</span>
          )}
        </div>
        {user.designation && <p className="text-xs text-gray-400 mt-0.5">{user.designation}</p>}
      </div>
      <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full border shrink-0 ${STATUS_STYLE[status] ?? "bg-slate-100 text-gray-500"}`}>
        {status}
      </span>
    </div>
  );
}

// ── Stats chips ───────────────────────────────────────────────────────────────
function StatsRow({ pending, approved, rejected }: { pending: number; approved: number; rejected: number }) {
  return (
    <div className="grid grid-cols-3 gap-4">
      {[
        { label: "Pending",  val: pending,  icon: "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z", iconCls: "text-yellow-600", bg: "bg-yellow-50" },
        { label: "Approved", val: approved, icon: "M5 13l4 4L19 7",                                iconCls: "text-green-600",  bg: "bg-green-50"  },
        { label: "Rejected", val: rejected, icon: "M6 18L18 6M6 6l12 12",                          iconCls: "text-red-500",    bg: "bg-red-50"    },
      ].map(({ label, val, icon, iconCls, bg }) => (
        <div key={label} className="bg-white border border-slate-200 rounded-2xl p-5 flex items-center gap-4">
          <div className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center shrink-0`}>
            <svg className={`w-5 h-5 ${iconCls}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={icon} />
            </svg>
          </div>
          <div>
            <div className="text-2xl font-bold text-slate-900 leading-none">{val}</div>
            <div className="text-xs text-slate-500 mt-0.5 font-medium">{label}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Filter bar ────────────────────────────────────────────────────────────────
function FilterBar({ status, setStatus, search, setSearch, counts }: {
  status: string; setStatus: (s: string) => void;
  search: string; setSearch: (s: string) => void;
  counts: Record<string, number>;
}) {
  const FILTERS = [
    { key: "PENDING", label: "Pending" }, { key: "APPROVED", label: "Approved" },
    { key: "REJECTED", label: "Rejected" }, { key: "", label: "All" },
  ];
  return (
    <div className="flex items-center gap-3 flex-wrap">
      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl">
        {FILTERS.map(f => (
          <button key={f.key || "all"} onClick={() => setStatus(f.key)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
              status === f.key ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
            }`}>
            {f.label}
            {(counts[f.key || "ALL"] ?? 0) > 0 && (
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                status === f.key ? "bg-red-500 text-white" : "bg-gray-200 text-gray-600"
              }`}>{counts[f.key || "ALL"]}</span>
            )}
          </button>
        ))}
      </div>
      <div className="relative flex-1 min-w-[180px] max-w-xs">
        <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name, dept…"
          className="w-full pl-8 pr-3 py-2 text-xs border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-red-200 placeholder-gray-400" />
      </div>
    </div>
  );
}

// ── Skeleton ──────────────────────────────────────────────────────────────────
function Skeleton() {
  return (
    <div className="space-y-3">
      {[1, 2, 3].map(i => (
        <div key={i} className="bg-white border border-slate-200 rounded-2xl p-5 animate-pulse">
          <div className="flex items-center gap-4">
            <div className="w-11 h-11 rounded-xl bg-slate-100 shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-slate-100 rounded w-40" />
              <div className="h-3 bg-slate-100 rounded w-64" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function ApprovalsPage() {
  const { isRole } = useAuth();
  const canAct = isRole("MANAGER", "HR", "ADMIN");

  type TabKey = "leaves" | "regularizations";
  const [tab, setTab] = useState<TabKey>("leaves");

  // ── Leave state ───────────────────────────────────────────────────────────
  const [leaves, setLeaves]             = useState<Leave[]>([]);
  const [leaveLoading, setLeaveLoading] = useState(true);
  const [leaveError, setLeaveError]     = useState("");
  const [leaveStatus, setLeaveStatus]   = useState("PENDING");
  const [leaveSearch, setLeaveSearch]   = useState("");
  const [approvingId, setApprovingId]   = useState<string | null>(null);
  const [rejectingId, setRejectingId]   = useState<string | null>(null);
  const [rejectNote, setRejectNote]     = useState("");
  const [rejecting, setRejecting]       = useState(false);

  // ── Regularization state ──────────────────────────────────────────────────
  const [regs, setRegs]                   = useState<Regularization[]>([]);
  const [regLoading, setRegLoading]       = useState(true);
  const [regError, setRegError]           = useState("");
  const [regStatus, setRegStatus]         = useState("PENDING");
  const [regSearch, setRegSearch]         = useState("");
  const [regApprovingId, setRegApprovingId] = useState<string | null>(null);
  const [regRejectingId, setRegRejectingId] = useState<string | null>(null);
  const [regRejectNote, setRegRejectNote]   = useState("");
  const [regRejecting, setRegRejecting]     = useState(false);

  // ── Fetch both at once ────────────────────────────────────────────────────
  const fetchAll = useCallback(async () => {
    setLeaveLoading(true); setRegLoading(true);
    setLeaveError(""); setRegError("");
    const [leavesRes, regsRes] = await Promise.allSettled([
      api.getAllLeaves() as Promise<Leave[]>,
      api.getRegularizations() as Promise<Regularization[]>,
    ]);
    if (leavesRes.status === "fulfilled") setLeaves(leavesRes.value);
    else setLeaveError("Failed to load leave requests.");
    if (regsRes.status === "fulfilled") setRegs(regsRes.value);
    else setRegError("Failed to load regularization requests.");
    setLeaveLoading(false); setRegLoading(false);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // ── Leave actions ─────────────────────────────────────────────────────────
  const handleLeaveApprove = async (id: string) => {
    setApprovingId(id);
    try {
      await api.approveLeave(id);
      setLeaves(prev => prev.map(l => l.id === id ? { ...l, status: "APPROVED" } : l));
    } catch { /* silent */ } finally { setApprovingId(null); }
  };
  const handleLeaveRejectConfirm = async () => {
    if (!rejectingId) return;
    setRejecting(true);
    try {
      await api.rejectLeave(rejectingId, rejectNote.trim() || undefined);
      setLeaves(prev => prev.map(l => l.id === rejectingId ? { ...l, status: "REJECTED" } : l));
      setRejectingId(null); setRejectNote("");
    } catch { /* silent */ } finally { setRejecting(false); }
  };

  // ── Regularization actions ────────────────────────────────────────────────
  const handleRegApprove = async (id: string) => {
    setRegApprovingId(id);
    try {
      await api.approveRegularization(id);
      setRegs(prev => prev.map(r => r.id === id ? { ...r, status: "APPROVED" } : r));
    } catch { /* silent */ } finally { setRegApprovingId(null); }
  };
  const handleRegRejectConfirm = async () => {
    if (!regRejectingId) return;
    setRegRejecting(true);
    try {
      await api.rejectRegularization(regRejectingId, regRejectNote.trim() || undefined);
      setRegs(prev => prev.map(r => r.id === regRejectingId ? { ...r, status: "REJECTED" } : r));
      setRegRejectingId(null); setRegRejectNote("");
    } catch { /* silent */ } finally { setRegRejecting(false); }
  };

  // ── Derived counts ────────────────────────────────────────────────────────
  const leaveCounts = {
    PENDING: leaves.filter(l => l.status === "PENDING").length,
    APPROVED: leaves.filter(l => l.status === "APPROVED").length,
    REJECTED: leaves.filter(l => l.status === "REJECTED").length,
    ALL: leaves.length,
  };
  const regCounts = {
    PENDING: regs.filter(r => r.status === "PENDING").length,
    APPROVED: regs.filter(r => r.status === "APPROVED").length,
    REJECTED: regs.filter(r => r.status === "REJECTED").length,
    ALL: regs.length,
  };

  // ── Filtered lists ────────────────────────────────────────────────────────
  const filteredLeaves = leaves
    .filter(l => !leaveStatus || l.status === leaveStatus)
    .filter(l => {
      const q = leaveSearch.toLowerCase();
      return !q || `${l.user.firstName} ${l.user.lastName}`.toLowerCase().includes(q) ||
        l.user.employeeId?.toLowerCase().includes(q) || l.leaveType.name.toLowerCase().includes(q) ||
        l.user.department?.name?.toLowerCase().includes(q);
    });

  const filteredRegs = regs
    .filter(r => !regStatus || r.status === regStatus)
    .filter(r => {
      const q = regSearch.toLowerCase();
      return !q || `${r.user.firstName} ${r.user.lastName}`.toLowerCase().includes(q) ||
        r.user.employeeId?.toLowerCase().includes(q) || r.reason.toLowerCase().includes(q) ||
        r.user.department?.name?.toLowerCase().includes(q);
    });

  const totalPending = leaveCounts.PENDING + regCounts.PENDING;

  return (
    <div className="p-6 space-y-5">

      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-[22px] font-bold text-slate-900 leading-none">Approvals</h1>
          <p className="text-sm text-slate-500 mt-1">
            {totalPending > 0
              ? `${totalPending} request${totalPending !== 1 ? "s" : ""} awaiting your action`
              : "All requests are up to date"}
          </p>
        </div>
        <button onClick={fetchAll}
          className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 bg-slate-50 hover:bg-slate-100 px-3 py-1.5 rounded-lg transition-colors border border-slate-200">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Refresh
        </button>
      </div>

      {/* ── Tab switcher ── */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-fit">
        {([
          { key: "leaves",          label: "Leave Requests",         icon: "🌿", badge: leaveCounts.PENDING },
          { key: "regularizations", label: "Attendance Corrections",  icon: "🕐", badge: regCounts.PENDING  },
        ] as { key: TabKey; label: string; icon: string; badge: number }[]).map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
              tab === t.key ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
            }`}>
            {t.icon} {t.label}
            {t.badge > 0 && (
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                tab === t.key ? "bg-red-500 text-white" : "bg-slate-300 text-slate-600"
              }`}>{t.badge}</span>
            )}
          </button>
        ))}
      </div>

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* ── LEAVE REQUESTS TAB ── */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      {tab === "leaves" && (
        <>
          <StatsRow pending={leaveCounts.PENDING} approved={leaveCounts.APPROVED} rejected={leaveCounts.REJECTED} />
          <FilterBar status={leaveStatus} setStatus={setLeaveStatus} search={leaveSearch} setSearch={setLeaveSearch} counts={leaveCounts} />

          {leaveError ? (
            <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center">
              <p className="text-sm text-red-500 mb-3">{leaveError}</p>
              <button onClick={fetchAll} className="text-xs bg-red-50 text-red-600 hover:bg-red-100 px-4 py-2 rounded-lg font-semibold transition-colors">Try again</button>
            </div>
          ) : leaveLoading ? <Skeleton /> : filteredLeaves.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center">
              <div className="text-4xl mb-3">{leaveStatus === "PENDING" ? "🎉" : "📋"}</div>
              <p className="text-gray-500 text-sm font-medium">
                {leaveSearch ? "No results match your search" : leaveStatus === "PENDING" ? "All caught up! No pending requests." : `No ${leaveStatus.toLowerCase()} requests`}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredLeaves.map(leave => {
                const days = leaveDays(leave.startDate, leave.endDate);
                const typeColor = leaveTypeColor(leave.leaveType.name);
                const isRejectOpen = rejectingId === leave.id;
                const isActing = approvingId === leave.id || (rejecting && rejectingId === leave.id);
                return (
                  <div key={leave.id}
                    className={`bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden transition-all hover:shadow-md ${leave.status === "PENDING" && canAct ? "border-l-4 border-l-amber-400" : ""}`}>
                    <div className="p-4 sm:p-5">
                      <div className="flex items-start gap-4">
                        <Avatar user={leave.user} />
                        <div className="flex-1 min-w-0">
                          <UserMeta user={leave.user} status={leave.status} />
                          <div className="flex items-center gap-2 flex-wrap mt-2.5">
                            <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full ${typeColor}`}>{leave.leaveType.name}</span>
                            <span className="text-xs text-gray-500 flex items-center gap-1">
                              <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>
                              {fmtDate(leave.startDate)} — {fmtDate(leave.endDate)}
                            </span>
                            <span className="text-[11px] font-bold text-gray-700 bg-slate-100 px-2 py-0.5 rounded-full">{days} day{days !== 1 ? "s" : ""}</span>
                          </div>
                          {leave.reason && (
                            <p className="text-xs text-gray-500 mt-2 leading-relaxed line-clamp-2 italic">&ldquo;{leave.reason}&rdquo;</p>
                          )}
                          <p className="text-[11px] text-gray-400 mt-1.5">Applied {fmtDate(leave.createdAt)}</p>
                        </div>
                      </div>
                      {leave.status === "PENDING" && canAct && (
                        <div className="mt-3 flex items-center gap-2">
                          <button onClick={() => handleLeaveApprove(leave.id)} disabled={isActing}
                            className="flex items-center gap-1.5 text-xs font-semibold bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg transition-colors disabled:opacity-50 shadow-sm">
                            {approvingId === leave.id
                              ? <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                              : <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>}
                            Approve
                          </button>
                          <button onClick={() => { setRejectingId(leave.id); setRejectNote(""); }} disabled={isActing}
                            className="flex items-center gap-1.5 text-xs font-semibold bg-white hover:bg-red-50 text-red-600 border border-red-200 px-4 py-2 rounded-lg transition-colors disabled:opacity-50">
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
                            Reject
                          </button>
                        </div>
                      )}
                    </div>
                    {isRejectOpen && (
                      <div className="border-t border-red-100 bg-red-50/60 px-5 py-4">
                        <p className="text-xs font-semibold text-red-700 mb-2">Rejection reason (optional)</p>
                        <textarea value={rejectNote} onChange={e => setRejectNote(e.target.value)}
                          placeholder="Let the employee know why…" rows={2} autoFocus
                          className="w-full text-xs border border-red-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-red-300 resize-none" />
                        <div className="flex gap-2 mt-2.5">
                          <button onClick={handleLeaveRejectConfirm} disabled={rejecting}
                            className="flex items-center gap-1.5 text-xs font-semibold bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg disabled:opacity-50">
                            {rejecting && <span className="w-3 h-3 border-2 border-white/40 border-t-white rounded-full animate-spin" />}
                            Confirm Reject
                          </button>
                          <button onClick={() => { setRejectingId(null); setRejectNote(""); }} disabled={rejecting}
                            className="text-xs font-semibold text-gray-500 px-4 py-2 rounded-lg bg-white border border-slate-200 hover:bg-slate-50">
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* ── ATTENDANCE CORRECTIONS TAB ── */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      {tab === "regularizations" && (
        <>
          <StatsRow pending={regCounts.PENDING} approved={regCounts.APPROVED} rejected={regCounts.REJECTED} />
          <FilterBar status={regStatus} setStatus={setRegStatus} search={regSearch} setSearch={setRegSearch} counts={regCounts} />

          {regError ? (
            <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center">
              <p className="text-sm text-red-500 mb-3">{regError}</p>
              <button onClick={fetchAll} className="text-xs bg-red-50 text-red-600 hover:bg-red-100 px-4 py-2 rounded-lg font-semibold">Try again</button>
            </div>
          ) : regLoading ? <Skeleton /> : filteredRegs.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center">
              <div className="text-4xl mb-3">{regStatus === "PENDING" ? "🎉" : "📋"}</div>
              <p className="text-gray-500 text-sm font-medium">
                {regSearch ? "No results match your search" : regStatus === "PENDING" ? "All caught up! No pending corrections." : `No ${regStatus.toLowerCase()} corrections`}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredRegs.map(reg => {
                const isRejectOpen = regRejectingId === reg.id;
                const isActing = regApprovingId === reg.id || (regRejecting && regRejectingId === reg.id);
                return (
                  <div key={reg.id}
                    className={`bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden transition-all hover:shadow-md ${reg.status === "PENDING" && canAct ? "border-l-4 border-l-blue-400" : ""}`}>
                    <div className="p-4 sm:p-5">
                      <div className="flex items-start gap-4">
                        <Avatar user={reg.user} />
                        <div className="flex-1 min-w-0">
                          <UserMeta user={reg.user} status={reg.status} />

                          {/* Date */}
                          <div className="flex items-center gap-2 mt-2.5">
                            <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-blue-50 text-blue-700">Attendance Correction</span>
                            <span className="text-xs text-gray-500 flex items-center gap-1">
                              <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>
                              {fmtDate(reg.date)}
                            </span>
                          </div>

                          {/* Original vs requested times */}
                          <div className="mt-2.5 grid grid-cols-2 gap-2">
                            <div className="bg-slate-50 rounded-xl px-3 py-2 border border-slate-100">
                              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">Original</p>
                              <p className="text-xs text-slate-600">
                                In: <span className="font-semibold">{fmtTime(reg.attendance?.checkInTime ?? null)}</span>
                              </p>
                              <p className="text-xs text-slate-600">
                                Out: <span className="font-semibold">{fmtTime(reg.attendance?.checkOutTime ?? null)}</span>
                              </p>
                            </div>
                            <div className="bg-blue-50 rounded-xl px-3 py-2 border border-blue-100">
                              <p className="text-[10px] font-bold text-blue-400 uppercase tracking-wide mb-1">Requested</p>
                              <p className="text-xs text-blue-700">
                                In: <span className="font-semibold">{fmtTime(reg.requestedCheckIn)}</span>
                              </p>
                              <p className="text-xs text-blue-700">
                                Out: <span className="font-semibold">{fmtTime(reg.requestedCheckOut)}</span>
                              </p>
                            </div>
                          </div>

                          {reg.reason && (
                            <p className="text-xs text-gray-500 mt-2 leading-relaxed italic">&ldquo;{reg.reason}&rdquo;</p>
                          )}
                          {reg.reviewNote && (
                            <p className="text-xs text-slate-400 mt-1 italic">Review note: {reg.reviewNote}</p>
                          )}
                        </div>
                      </div>

                      {reg.status === "PENDING" && canAct && (
                        <div className="mt-3 flex items-center gap-2">
                          <button onClick={() => handleRegApprove(reg.id)} disabled={isActing}
                            className="flex items-center gap-1.5 text-xs font-semibold bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg transition-colors disabled:opacity-50 shadow-sm">
                            {regApprovingId === reg.id
                              ? <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                              : <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>}
                            Approve
                          </button>
                          <button onClick={() => { setRegRejectingId(reg.id); setRegRejectNote(""); }} disabled={isActing}
                            className="flex items-center gap-1.5 text-xs font-semibold bg-white hover:bg-red-50 text-red-600 border border-red-200 px-4 py-2 rounded-lg transition-colors disabled:opacity-50">
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
                            Reject
                          </button>
                        </div>
                      )}
                    </div>

                    {isRejectOpen && (
                      <div className="border-t border-red-100 bg-red-50/60 px-5 py-4">
                        <p className="text-xs font-semibold text-red-700 mb-2">Rejection reason (optional)</p>
                        <textarea value={regRejectNote} onChange={e => setRegRejectNote(e.target.value)}
                          placeholder="Let the employee know why…" rows={2} autoFocus
                          className="w-full text-xs border border-red-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-red-300 resize-none" />
                        <div className="flex gap-2 mt-2.5">
                          <button onClick={handleRegRejectConfirm} disabled={regRejecting}
                            className="flex items-center gap-1.5 text-xs font-semibold bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg disabled:opacity-50">
                            {regRejecting && <span className="w-3 h-3 border-2 border-white/40 border-t-white rounded-full animate-spin" />}
                            Confirm Reject
                          </button>
                          <button onClick={() => { setRegRejectingId(null); setRegRejectNote(""); }} disabled={regRejecting}
                            className="text-xs font-semibold text-gray-500 px-4 py-2 rounded-lg bg-white border border-slate-200 hover:bg-slate-50">
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
