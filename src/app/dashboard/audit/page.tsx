"use client";
import { useEffect, useState, useCallback } from "react";
import { api, AuditLog, ErrorLog } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";

const MODULE_COLORS: Record<string, string> = {
  users: "#6366f1", attendance: "#0ea5e9", leaves: "#10b981",
  announcements: "#f59e0b", onboarding: "#8b5cf6", profile: "#ec4899",
  roles: "#dc2626", audit: "#64748b", auth: "#14b8a6", default: "#9ca3af",
};

const ACTION_ICONS: Record<string, string> = {
  CREATE: "➕", UPDATE: "✏️", DELETE: "🗑️", APPROVE: "✅",
  REJECT: "❌", LOGIN: "🔑", LOGOUT: "↩", CHECK_IN: "🟢",
  CHECK_OUT: "🔴", UPLOAD: "📤", DOWNLOAD: "📥",
};

function getActionIcon(action: string) {
  const prefix = action.split("_")[0];
  return ACTION_ICONS[prefix] || "📋";
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function timeSince(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function AuditPage() {
  const { isRole } = useAuth();
  const [tab, setTab] = useState<"audit" | "errors">("audit");

  // Audit state
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [auditTotal, setAuditTotal] = useState(0);
  const [auditLoading, setAuditLoading] = useState(false);
  const [auditOffset, setAuditOffset] = useState(0);
  const AUDIT_LIMIT = 50;
  const [auditFilters, setAuditFilters] = useState({ module: "", action: "", from: "", to: "" });

  // Error state
  const [errorLogs, setErrorLogs] = useState<ErrorLog[]>([]);
  const [errorTotal, setErrorTotal] = useState(0);
  const [errorLoading, setErrorLoading] = useState(false);
  const [errorOffset, setErrorOffset] = useState(0);
  const ERROR_LIMIT = 50;
  const [expandedError, setExpandedError] = useState<string | null>(null);

  const loadAudit = useCallback(async (offset = 0) => {
    setAuditLoading(true);
    try {
      const res = await api.getAuditLogs({
        ...auditFilters,
        limit: AUDIT_LIMIT,
        offset,
      });
      setAuditLogs(res.logs);
      setAuditTotal(res.total);
      setAuditOffset(offset);
    } catch {/* ignore */}
    finally { setAuditLoading(false); }
  }, [auditFilters]);

  const loadErrors = useCallback(async (offset = 0) => {
    setErrorLoading(true);
    try {
      const res = await api.getErrorLogs({ limit: ERROR_LIMIT, offset });
      setErrorLogs(res.logs);
      setErrorTotal(res.total);
      setErrorOffset(offset);
    } catch {/* ignore */}
    finally { setErrorLoading(false); }
  }, []);

  useEffect(() => { if (tab === "audit") loadAudit(0); }, [tab, loadAudit]);
  useEffect(() => { if (tab === "errors") loadErrors(0); }, [tab, loadErrors]);

  if (!isRole("ADMIN", "HR")) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <span className="text-4xl">🔒</span>
        <p className="text-gray-500 font-medium">Admin or HR access required</p>
      </div>
    );
  }

  const auditPages = Math.ceil(auditTotal / AUDIT_LIMIT);
  const currentAuditPage = Math.floor(auditOffset / AUDIT_LIMIT) + 1;
  const errorPages = Math.ceil(errorTotal / ERROR_LIMIT);
  const currentErrorPage = Math.floor(errorOffset / ERROR_LIMIT) + 1;

  // Derive stat cards from loaded audit data
  const today = new Date().toDateString();
  const eventsToday = auditLogs.filter(l => new Date(l.createdAt).toDateString() === today).length;
  const failedLogins = auditLogs.filter(l => l.action.includes("LOGIN") && l.module === "auth" && (l.details as Record<string, unknown>)?.success === false).length;
  const dataChanges = auditLogs.filter(l => ["CREATE", "UPDATE", "DELETE"].some(a => l.action.startsWith(a))).length;
  const adminActions = auditLogs.filter(l => l.module === "roles" || l.module === "users").length;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[22px] font-bold text-slate-900">Audit & Error Logs</h1>
          <p className="text-sm text-slate-500 mt-0.5">Track all user actions and system errors for security and compliance</p>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Events Today", value: eventsToday, icon: "📋", color: "text-indigo-600", bg: "bg-indigo-50" },
          { label: "Failed Logins", value: failedLogins, icon: "🔑", color: "text-red-600", bg: "bg-red-50" },
          { label: "Data Changes", value: dataChanges, icon: "✏️", color: "text-amber-600", bg: "bg-amber-50" },
          { label: "Admin Actions", value: adminActions, icon: "🛡️", color: "text-purple-600", bg: "bg-purple-50" },
        ].map(s => (
          <div key={s.label} className="bg-white border border-slate-200 rounded-2xl p-4 flex items-center gap-4">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0 ${s.bg}`}>{s.icon}</div>
            <div>
              <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
              <div className="text-xs text-slate-500 mt-0.5">{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 rounded-xl p-1 w-fit">
        {[
          { key: "audit" as const, label: "Audit Trail", icon: "📋" },
          { key: "errors" as const, label: "Error Log", icon: "⚠️" },
        ].map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${tab === t.key ? "bg-white shadow-sm text-slate-900" : "text-slate-500 hover:text-slate-700"}`}>
            {t.icon} {t.label}
            {t.key === "errors" && errorTotal > 0 && (
              <span className="ml-1.5 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">{errorTotal}</span>
            )}
          </button>
        ))}
      </div>

      {/* AUDIT TAB */}
      {tab === "audit" && (
        <div className="space-y-4">
          {/* Filters */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">Module</label>
                <select className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all" value={auditFilters.module}
                  onChange={e => setAuditFilters(f => ({ ...f, module: e.target.value }))}>
                  <option value="">All modules</option>
                  {Object.keys(MODULE_COLORS).filter(k => k !== "default").map(m => (
                    <option key={m} value={m}>{m.charAt(0).toUpperCase() + m.slice(1)}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">Action contains</label>
                <input className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all" placeholder="e.g. CREATE, APPROVE" value={auditFilters.action}
                  onChange={e => setAuditFilters(f => ({ ...f, action: e.target.value }))} />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">From</label>
                <input type="date" className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all" value={auditFilters.from}
                  onChange={e => setAuditFilters(f => ({ ...f, from: e.target.value }))} />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">To</label>
                <input type="date" className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all" value={auditFilters.to}
                  onChange={e => setAuditFilters(f => ({ ...f, to: e.target.value }))} />
              </div>
            </div>
            <div className="flex gap-2 mt-3">
              <button onClick={() => loadAudit(0)} className="px-4 py-1.5 rounded-lg text-sm font-bold text-white" style={{ background: "linear-gradient(90deg, rgb(220,38,38), rgb(249,115,22))" }}>
                Apply Filters
              </button>
              <button onClick={() => { setAuditFilters({ module: "", action: "", from: "", to: "" }); }}
                className="px-4 py-1.5 rounded-lg border border-slate-200 text-sm text-gray-500 hover:bg-gray-50">
                Clear
              </button>
            </div>
          </div>

          {/* Stats */}
          <div className="text-sm text-gray-500">
            Showing {auditLogs.length} of <strong>{auditTotal.toLocaleString()}</strong> events
          </div>

          {/* Log table */}
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
            {auditLoading ? (
              <div className="space-y-3 p-4">
                {[...Array(8)].map((_, i) => <div key={i} className="h-12 bg-slate-100 animate-pulse rounded-lg" />)}
              </div>
            ) : auditLogs.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-40 gap-2">
                <span className="text-3xl">📋</span>
                <p className="text-gray-400 text-sm">No audit events found</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="text-xs font-bold text-gray-400 uppercase tracking-wider border-b border-slate-200">
                      <th className="text-left px-4 py-3">Event</th>
                      <th className="text-left px-4 py-3">User</th>
                      <th className="text-left px-4 py-3">Module</th>
                      <th className="text-left px-4 py-3">Details</th>
                      <th className="text-left px-4 py-3">Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {auditLogs.map((log, i) => {
                      const moduleColor = MODULE_COLORS[log.module] || MODULE_COLORS.default;
                      return (
                        <tr key={log.id} className={`border-b border-gray-50 hover:bg-gray-50 transition-colors ${i % 2 === 0 ? "" : "bg-gray-50/30"}`}>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <span className="text-lg">{getActionIcon(log.action)}</span>
                              <span className="text-sm font-semibold text-gray-800">{log.action}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="text-sm font-medium text-gray-900">{log.userName || "—"}</div>
                            <div className="text-xs text-gray-400">{log.userEmail || "—"}</div>
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-xs font-bold px-2 py-1 rounded-full text-white" style={{ background: moduleColor }}>
                              {log.module}
                            </span>
                          </td>
                          <td className="px-4 py-3 max-w-xs">
                            {log.details ? (
                              <div className="text-xs text-gray-500 font-mono truncate max-w-[200px]" title={JSON.stringify(log.details)}>
                                {JSON.stringify(log.details)}
                              </div>
                            ) : (
                              <span className="text-xs text-gray-300">—</span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <div className="text-xs font-medium text-gray-700">{timeSince(log.createdAt)}</div>
                            <div className="text-xs text-gray-400">{formatDate(log.createdAt)}</div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Pagination */}
          {auditPages > 1 && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">Page {currentAuditPage} of {auditPages}</span>
              <div className="flex gap-2">
                <button disabled={auditOffset === 0} onClick={() => loadAudit(auditOffset - AUDIT_LIMIT)}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-40">
                  ← Prev
                </button>
                <button disabled={currentAuditPage >= auditPages} onClick={() => loadAudit(auditOffset + AUDIT_LIMIT)}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-40">
                  Next →
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ERRORS TAB */}
      {tab === "errors" && (
        <div className="space-y-4">
          <div className="text-sm text-gray-500">
            <strong>{errorTotal.toLocaleString()}</strong> errors recorded
          </div>

          {errorLoading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => <div key={i} className="h-20 bg-slate-100 animate-pulse rounded-xl" />)}
            </div>
          ) : errorLogs.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-2xl flex flex-col items-center justify-center h-48 gap-3">
              <span className="text-4xl">✅</span>
              <p className="text-gray-400 text-sm font-medium">No errors logged — system is healthy</p>
            </div>
          ) : (
            <div className="space-y-2">
              {errorLogs.map(err => (
                <div key={err.id} className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
                  <button className="w-full text-left p-4 hover:bg-gray-50 transition-colors"
                    onClick={() => setExpandedError(expandedError === err.id ? null : err.id)}>
                    <div className="flex items-start gap-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${(err.statusCode ?? 0) >= 500 ? "bg-red-100" : "bg-amber-100"}`}>
                        <span className="text-sm">{(err.statusCode ?? 0) >= 500 ? "💥" : "⚠️"}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          {err.statusCode && (
                            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${(err.statusCode ?? 0) >= 500 ? "bg-red-100 text-red-600" : "bg-amber-100 text-amber-600"}`}>
                              {err.statusCode}
                            </span>
                          )}
                          {err.method && (
                            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-slate-100 text-gray-600">{err.method}</span>
                          )}
                          {err.endpoint && (
                            <span className="text-xs font-mono text-gray-500 truncate">{err.endpoint}</span>
                          )}
                        </div>
                        <p className="text-sm font-semibold text-gray-900 mt-1 truncate">{err.message}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-xs text-gray-400">{timeSince(err.createdAt)}</div>
                        <div className="text-xs text-gray-300">{formatDate(err.createdAt)}</div>
                      </div>
                      <span className={`text-gray-400 text-xs transition-transform ${expandedError === err.id ? "rotate-180" : ""}`}>▼</span>
                    </div>
                  </button>

                  {expandedError === err.id && (
                    <div className="px-4 pb-4 border-t border-slate-200">
                      <div className="mt-3 space-y-2">
                        {err.userId && (
                          <div className="text-xs">
                            <span className="font-bold text-gray-500">User ID: </span>
                            <span className="font-mono text-gray-700">{err.userId}</span>
                          </div>
                        )}
                        {err.stack && (
                          <div>
                            <p className="text-xs font-bold text-gray-500 mb-1">Stack trace:</p>
                            <pre className="text-xs text-red-600 bg-red-50 p-3 rounded-lg overflow-x-auto whitespace-pre-wrap break-all font-mono leading-relaxed">
                              {err.stack}
                            </pre>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Pagination */}
          {errorPages > 1 && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">Page {currentErrorPage} of {errorPages}</span>
              <div className="flex gap-2">
                <button disabled={errorOffset === 0} onClick={() => loadErrors(errorOffset - ERROR_LIMIT)}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-40">
                  ← Prev
                </button>
                <button disabled={currentErrorPage >= errorPages} onClick={() => loadErrors(errorOffset + ERROR_LIMIT)}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-40">
                  Next →
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
