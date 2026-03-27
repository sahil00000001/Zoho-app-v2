"use client";
import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";

interface Leave {
  id: string;
  status: string;
  startDate: string;
  endDate: string;
  reason: string;
  createdAt: string;
  updatedAt: string;
  user: { id: string; employeeId: string; firstName: string; lastName: string; department?: { name: string }; designation?: string };
  leaveType: { id: string; name: string; maxDays: number };
}

function leaveDays(start: string, end: string) {
  const s = new Date(start), e = new Date(end);
  return Math.round((e.getTime() - s.getTime()) / 86400000) + 1;
}

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

const STATUS_STYLE: Record<string, string> = {
  PENDING:   "bg-yellow-100 text-yellow-700 border-yellow-200",
  APPROVED:  "bg-green-100 text-green-700 border-green-200",
  REJECTED:  "bg-red-100 text-red-600 border-red-200",
  CANCELLED: "bg-gray-100 text-gray-500 border-gray-200",
};

const TYPE_COLORS = [
  "bg-blue-100 text-blue-700",
  "bg-purple-100 text-purple-700",
  "bg-teal-100 text-teal-700",
  "bg-orange-100 text-orange-700",
  "bg-pink-100 text-pink-700",
  "bg-indigo-100 text-indigo-700",
];

function leaveTypeColor(name: string) {
  let h = 0;
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) & 0xffff;
  return TYPE_COLORS[h % TYPE_COLORS.length];
}

export default function ApprovalsPage() {
  const { isRole } = useAuth();
  const canAct = isRole("MANAGER", "HR", "ADMIN");

  const [leaves, setLeaves] = useState<Leave[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState("PENDING");
  const [search, setSearch] = useState("");

  // Per-row action state
  const [approving, setApproving] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectNote, setRejectNote] = useState("");
  const [rejecting, setRejecting] = useState(false);

  const fetchLeaves = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getAllLeaves({ status: statusFilter || undefined });
      setLeaves(data as Leave[]);
    } catch {
      setError("Failed to load leave requests. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => { fetchLeaves(); }, [fetchLeaves]);

  const handleApprove = async (id: string) => {
    setApproving(id);
    try {
      await api.approveLeave(id);
      setLeaves((prev) => prev.map((l) => l.id === id ? { ...l, status: "APPROVED" } : l));
    } catch {
      // silent
    } finally {
      setApproving(null);
    }
  };

  const handleRejectOpen = (id: string) => {
    setRejectingId(id);
    setRejectNote("");
  };

  const handleRejectConfirm = async () => {
    if (!rejectingId) return;
    setRejecting(true);
    try {
      await api.rejectLeave(rejectingId, rejectNote.trim() || undefined);
      setLeaves((prev) => prev.map((l) => l.id === rejectingId ? { ...l, status: "REJECTED" } : l));
      setRejectingId(null);
      setRejectNote("");
    } catch {
      // silent
    } finally {
      setRejecting(false);
    }
  };

  const filtered = leaves.filter((l) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      l.user.firstName.toLowerCase().includes(q) ||
      l.user.lastName.toLowerCase().includes(q) ||
      l.user.employeeId?.toLowerCase().includes(q) ||
      l.leaveType.name.toLowerCase().includes(q) ||
      l.user.department?.name?.toLowerCase().includes(q)
    );
  });

  const counts = {
    PENDING:  leaves.filter((l) => l.status === "PENDING").length,
    APPROVED: leaves.filter((l) => l.status === "APPROVED").length,
    REJECTED: leaves.filter((l) => l.status === "REJECTED").length,
  };

  const FILTERS = [
    { key: "PENDING",  label: "Pending",  count: counts.PENDING },
    { key: "APPROVED", label: "Approved", count: counts.APPROVED },
    { key: "REJECTED", label: "Rejected", count: counts.REJECTED },
    { key: "",         label: "All",      count: leaves.length },
  ];

  return (
    <div className="space-y-5 animate-fade-in">

      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-black text-gray-900 leading-none">Leave Approvals</h1>
          <p className="text-sm text-gray-400 mt-1">
            {counts.PENDING > 0
              ? `${counts.PENDING} request${counts.PENDING !== 1 ? "s" : ""} awaiting your action`
              : "All requests are up to date"}
          </p>
        </div>
        <button
          onClick={fetchLeaves}
          className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 bg-gray-50 hover:bg-gray-100 px-3 py-1.5 rounded-lg transition-colors border border-gray-200"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Refresh
        </button>
      </div>

      {/* ── Stats chips ── */}
      <div className="grid grid-cols-3 gap-3">
        <div className="card p-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-yellow-50 flex items-center justify-center text-lg shrink-0">⏳</div>
          <div>
            <div className="text-2xl font-black text-yellow-700 leading-none">{counts.PENDING}</div>
            <div className="text-xs text-gray-500 mt-0.5">Pending</div>
          </div>
        </div>
        <div className="card p-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-green-50 flex items-center justify-center text-lg shrink-0">✅</div>
          <div>
            <div className="text-2xl font-black text-green-700 leading-none">{counts.APPROVED}</div>
            <div className="text-xs text-gray-500 mt-0.5">Approved</div>
          </div>
        </div>
        <div className="card p-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-red-50 flex items-center justify-center text-lg shrink-0">❌</div>
          <div>
            <div className="text-2xl font-black text-red-600 leading-none">{counts.REJECTED}</div>
            <div className="text-xs text-gray-500 mt-0.5">Rejected</div>
          </div>
        </div>
      </div>

      {/* ── Filters + search ── */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex gap-1.5 bg-gray-100 p-1 rounded-xl">
          {FILTERS.map((f) => (
            <button
              key={f.key || "all"}
              onClick={() => setStatusFilter(f.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                statusFilter === f.key
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {f.label}
              {f.count > 0 && (
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                  statusFilter === f.key ? "bg-red-500 text-white" : "bg-gray-200 text-gray-600"
                }`}>{f.count}</span>
              )}
            </button>
          ))}
        </div>

        <div className="relative flex-1 min-w-[180px] max-w-xs">
          <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, dept…"
            className="w-full pl-8 pr-3 py-2 text-xs border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-red-200 placeholder-gray-400"
          />
        </div>
      </div>

      {/* ── Content ── */}
      {error ? (
        <div className="card p-8 text-center">
          <p className="text-sm text-red-500 mb-3">{error}</p>
          <button onClick={fetchLeaves} className="text-xs bg-red-50 text-red-600 hover:bg-red-100 px-4 py-2 rounded-lg font-semibold transition-colors">
            Try again
          </button>
        </div>
      ) : loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="card p-5 animate-pulse">
              <div className="flex items-center gap-4">
                <div className="w-11 h-11 rounded-xl bg-gray-100 shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-100 rounded w-40" />
                  <div className="h-3 bg-gray-100 rounded w-64" />
                  <div className="h-3 bg-gray-100 rounded w-32" />
                </div>
                <div className="h-8 bg-gray-100 rounded-lg w-20 shrink-0" />
              </div>
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="card p-12 text-center">
          <div className="text-4xl mb-3">
            {statusFilter === "PENDING" ? "🎉" : "📋"}
          </div>
          <p className="text-gray-500 text-sm font-medium">
            {search ? "No results match your search" : statusFilter === "PENDING" ? "All caught up! No pending requests." : `No ${statusFilter.toLowerCase()} requests`}
          </p>
          {search && (
            <button onClick={() => setSearch("")} className="mt-3 text-xs text-red-600 hover:underline">Clear search</button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((leave) => {
            const days = leaveDays(leave.startDate, leave.endDate);
            const initials = `${leave.user.firstName[0]}${leave.user.lastName[0]}`.toUpperCase();
            const typeColor = leaveTypeColor(leave.leaveType.name);
            const isRejectOpen = rejectingId === leave.id;
            const isActing = approving === leave.id || (rejecting && rejectingId === leave.id);

            return (
              <div
                key={leave.id}
                className={`card overflow-hidden transition-all ${leave.status === "PENDING" && canAct ? "border-l-4 border-l-yellow-400" : ""}`}
              >
                <div className="p-4 sm:p-5">
                  <div className="flex items-start gap-4">
                    {/* Avatar */}
                    <div
                      className="w-11 h-11 rounded-xl flex items-center justify-center text-white text-sm font-bold shrink-0 shadow-sm"
                      style={{ background: "linear-gradient(135deg, rgb(220,38,38), rgb(249,115,22))" }}
                    >
                      {initials}
                    </div>

                    {/* Main info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 flex-wrap">
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-sm text-gray-900">
                              {leave.user.firstName} {leave.user.lastName}
                            </span>
                            <span className="text-xs text-gray-400">{leave.user.employeeId}</span>
                            {leave.user.department?.name && (
                              <span className="text-[11px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
                                {leave.user.department.name}
                              </span>
                            )}
                          </div>
                          {leave.user.designation && (
                            <p className="text-xs text-gray-400 mt-0.5">{leave.user.designation}</p>
                          )}
                        </div>
                        <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full border shrink-0 ${STATUS_STYLE[leave.status] ?? "bg-gray-100 text-gray-500"}`}>
                          {leave.status}
                        </span>
                      </div>

                      {/* Leave details row */}
                      <div className="flex items-center gap-2 flex-wrap mt-2.5">
                        <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full ${typeColor}`}>
                          {leave.leaveType.name}
                        </span>
                        <span className="text-xs text-gray-500 flex items-center gap-1">
                          <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          {fmtDate(leave.startDate)} — {fmtDate(leave.endDate)}
                        </span>
                        <span className="text-[11px] font-bold text-gray-700 bg-gray-100 px-2 py-0.5 rounded-full">
                          {days} day{days !== 1 ? "s" : ""}
                        </span>
                      </div>

                      {leave.reason && (
                        <p className="text-xs text-gray-500 mt-2 leading-relaxed line-clamp-2 italic">
                          &ldquo;{leave.reason}&rdquo;
                        </p>
                      )}

                      <p className="text-[11px] text-gray-400 mt-1.5">
                        Applied {new Date(leave.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                      </p>
                    </div>
                  </div>

                  {/* Action buttons */}
                  {leave.status === "PENDING" && canAct && (
                    <div className="mt-3 flex items-center gap-2 pl-15">
                      <button
                        onClick={() => handleApprove(leave.id)}
                        disabled={isActing}
                        className="flex items-center gap-1.5 text-xs font-semibold bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg transition-colors disabled:opacity-50 shadow-sm"
                      >
                        {approving === leave.id ? (
                          <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin inline-block" />
                        ) : (
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                        Approve
                      </button>
                      <button
                        onClick={() => handleRejectOpen(leave.id)}
                        disabled={isActing}
                        className="flex items-center gap-1.5 text-xs font-semibold bg-white hover:bg-red-50 text-red-600 border border-red-200 hover:border-red-300 px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                        Reject
                      </button>
                    </div>
                  )}
                </div>

                {/* Reject panel */}
                {isRejectOpen && (
                  <div className="border-t border-red-100 bg-red-50/60 px-5 py-4">
                    <p className="text-xs font-semibold text-red-700 mb-2">Rejection reason (optional)</p>
                    <textarea
                      value={rejectNote}
                      onChange={(e) => setRejectNote(e.target.value)}
                      placeholder="Let the employee know why their request was rejected…"
                      rows={2}
                      className="w-full text-xs border border-red-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-red-300 placeholder-gray-400 resize-none"
                      autoFocus
                    />
                    <div className="flex gap-2 mt-2.5">
                      <button
                        onClick={handleRejectConfirm}
                        disabled={rejecting}
                        className="flex items-center gap-1.5 text-xs font-semibold bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
                      >
                        {rejecting && <span className="w-3 h-3 border-2 border-white/40 border-t-white rounded-full animate-spin inline-block" />}
                        Confirm Reject
                      </button>
                      <button
                        onClick={() => { setRejectingId(null); setRejectNote(""); }}
                        disabled={rejecting}
                        className="text-xs font-semibold text-gray-500 hover:text-gray-700 px-4 py-2 rounded-lg bg-white border border-gray-200 hover:bg-gray-50 transition-colors"
                      >
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
    </div>
  );
}
