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
  user: { id: string; employeeId: string; firstName: string; lastName: string; department?: { name: string } };
  leaveType: { id: string; name: string; maxDays: number };
}

export default function ApprovalsPage() {
  const { isRole } = useAuth();
  const [leaves, setLeaves] = useState<Leave[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('PENDING');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [selected, setSelected] = useState<Leave | null>(null);

  const fetchLeaves = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.getAllLeaves({ status: statusFilter || undefined });
      setLeaves(data as Leave[]);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => { fetchLeaves(); }, [fetchLeaves]);

  const handleApprove = async (id: string) => {
    setActionLoading(id);
    try {
      await api.approveLeave(id);
      setLeaves((prev) => prev.map((l) => l.id === id ? { ...l, status: 'APPROVED' } : l));
      if (selected?.id === id) setSelected((s) => s ? { ...s, status: 'APPROVED' } : s);
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (id: string) => {
    setActionLoading(id);
    try {
      await api.rejectLeave(id);
      setLeaves((prev) => prev.map((l) => l.id === id ? { ...l, status: 'REJECTED' } : l));
      if (selected?.id === id) setSelected((s) => s ? { ...s, status: 'REJECTED' } : s);
    } finally {
      setActionLoading(null);
    }
  };

  const statusColors: Record<string, string> = {
    PENDING: 'bg-yellow-100 text-yellow-700',
    APPROVED: 'bg-green-100 text-green-700',
    REJECTED: 'bg-red-100 text-red-700',
    CANCELLED: 'bg-gray-100 text-gray-700',
  };

  const pendingCount = leaves.filter((l) => l.status === 'PENDING').length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-black text-gray-900">Leave Approvals</h2>
          <p className="text-sm text-gray-500 mt-0.5">{pendingCount} pending requests</p>
        </div>
        <div className="flex gap-2">
          {['', 'PENDING', 'APPROVED', 'REJECTED'].map((s) => (
            <button
              key={s || 'all'}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${statusFilter === s ? 'text-white shadow-md' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
              style={statusFilter === s ? { background: "linear-gradient(90deg, rgb(220,38,38), rgb(249,115,22))" } : {}}
            >
              {s || 'All'}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 rounded-full border-2 border-red-500/20 border-t-red-500 animate-spin" />
        </div>
      ) : leaves.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
          <div className="text-4xl mb-3">✅</div>
          <p className="text-gray-500">No {statusFilter.toLowerCase() || ''} leave requests</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          {leaves.map((leave) => (
            <div
              key={leave.id}
              className="flex items-center gap-4 px-5 py-4 border-b border-gray-50 last:border-0 hover:bg-gray-50/50 transition-colors cursor-pointer"
              onClick={() => setSelected(selected?.id === leave.id ? null : leave)}
            >
              <div className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0" style={{ background: "linear-gradient(135deg, rgb(220,38,38), rgb(249,115,22))" }}>
                {leave.user.firstName[0]}{leave.user.lastName[0]}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-sm text-gray-900">{leave.user.firstName} {leave.user.lastName}</span>
                  <span className="text-xs text-gray-400">{leave.user.employeeId}</span>
                  {leave.user.department && <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{leave.user.department.name}</span>}
                </div>
                <div className="text-xs text-gray-500 mt-0.5">
                  {leave.leaveType.name} · {new Date(leave.startDate).toLocaleDateString()} – {new Date(leave.endDate).toLocaleDateString()}
                </div>
                <div className="text-xs text-gray-400 mt-0.5 truncate">{leave.reason}</div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className={`text-xs font-semibold px-2 py-1 rounded-full ${statusColors[leave.status]}`}>{leave.status}</span>
                {leave.status === 'PENDING' && isRole('MANAGER', 'HR', 'ADMIN') && (
                  <>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleApprove(leave.id); }}
                      disabled={actionLoading === leave.id}
                      className="text-xs bg-green-100 text-green-700 hover:bg-green-200 font-semibold px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
                    >
                      {actionLoading === leave.id ? '...' : 'Approve'}
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleReject(leave.id); }}
                      disabled={actionLoading === leave.id}
                      className="text-xs bg-red-100 text-red-700 hover:bg-red-200 font-semibold px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
                    >
                      Reject
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
