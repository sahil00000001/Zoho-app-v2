"use client";
import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";

interface LeaveType { id: string; name: string; maxDays: number; }
interface Leave {
  id: string; status: string; startDate: string; endDate: string;
  reason: string; createdAt: string;
  leaveType: { id: string; name: string };
  user: { firstName: string; lastName: string; employeeId: string };
}
interface Balance { leaveType: LeaveType; maxDays: number; usedDays: number; remainingDays: number; }
interface Holiday { id: string; name: string; date: string; type: string; year: number; }
interface CompOff {
  id: string; status: string; reason: string; earnedDate: string; expiresAt: string;
  user: { firstName: string; lastName: string; employeeId: string };
  approver: { firstName: string; lastName: string } | null;
}

const STATUS_COLORS: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-700',
  APPROVED: 'bg-green-100 text-green-700',
  REJECTED: 'bg-red-100 text-red-700',
  CANCELLED: 'bg-gray-100 text-gray-500',
};
const COMPOFF_COLORS: Record<string, string> = {
  EARNED: 'bg-yellow-100 text-yellow-700',
  APPROVED: 'bg-green-100 text-green-700',
  USED: 'bg-blue-100 text-blue-700',
  EXPIRED: 'bg-gray-100 text-gray-500',
};
const HOLIDAY_COLORS: Record<string, string> = {
  NATIONAL: 'bg-red-100 text-red-700',
  COMPANY: 'bg-blue-100 text-blue-700',
  OPTIONAL: 'bg-orange-100 text-orange-700',
};

const fmtDate = (d: string) => new Date(d).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
const daysBetween = (a: string, b: string) =>
  Math.ceil((new Date(b).getTime() - new Date(a).getTime()) / 86_400_000) + 1;

type Tab = 'balance' | 'apply' | 'history' | 'holidays' | 'compoff';

export default function LeavesPage() {
  const { isRole } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>('balance');
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [myLeaves, setMyLeaves] = useState<Leave[]>([]);
  const [balance, setBalance] = useState<Balance[]>([]);
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [compoffs, setCompoffs] = useState<CompOff[]>([]);
  const [compOffBalance, setCompOffBalance] = useState(0);
  const [loading, setLoading] = useState(true);

  // Apply form
  const [form, setForm] = useState({ leaveTypeId: '', startDate: '', endDate: '', reason: '' });
  const [applying, setApplying] = useState(false);
  const [applyError, setApplyError] = useState('');
  const [applySuccess, setApplySuccess] = useState('');

  // Comp-off form
  const [coForm, setCoForm] = useState({ earnedDate: '', reason: '' });
  const [coLoading, setCoLoading] = useState(false);
  const [coError, setCoError] = useState('');

  // Holiday form (admin)
  const [hForm, setHForm] = useState({ name: '', date: '', type: 'COMPANY' });
  const [hLoading, setHLoading] = useState(false);

  const fetchAll = useCallback(async () => {
    try {
      const [lt, leaves, bal, hols, cos, cobal] = await Promise.all([
        api.getLeaveTypes(),
        api.getMyLeaves(),
        api.getLeaveBalance(),
        api.getHolidays(new Date().getFullYear()),
        api.getCompOffs(),
        api.getCompOffBalance(),
      ]);
      setLeaveTypes(lt as LeaveType[]);
      setMyLeaves(leaves as Leave[]);
      setBalance(bal as Balance[]);
      setHolidays(hols as Holiday[]);
      setCompoffs(cos as CompOff[]);
      setCompOffBalance((cobal as { available: number }).available);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const handleApply = async (e: React.FormEvent) => {
    e.preventDefault(); setApplying(true); setApplyError(''); setApplySuccess('');
    try {
      const leave = await api.applyLeave(form) as Leave;
      setMyLeaves(prev => [leave, ...prev]);
      setApplySuccess('Leave application submitted successfully!');
      setForm({ leaveTypeId: '', startDate: '', endDate: '', reason: '' });
    } catch (err) { setApplyError(err instanceof Error ? err.message : 'Failed to apply'); }
    finally { setApplying(false); }
  };

  const handleCancel = async (id: string) => {
    if (!confirm('Cancel this leave request?')) return;
    try {
      await api.cancelLeave(id);
      setMyLeaves(prev => prev.map(l => l.id === id ? { ...l, status: 'CANCELLED' } : l));
    } catch (err) { console.error(err); }
  };

  const handleCompOff = async (e: React.FormEvent) => {
    e.preventDefault(); setCoLoading(true); setCoError('');
    try {
      await api.requestCompOff(coForm);
      setCoForm({ earnedDate: '', reason: '' });
      const cos = await api.getCompOffs();
      setCompoffs(cos as CompOff[]);
    } catch (err) { setCoError(err instanceof Error ? err.message : 'Failed'); }
    finally { setCoLoading(false); }
  };

  const handleCompOffAction = async (id: string, action: 'approve' | 'reject') => {
    try {
      if (action === 'approve') await api.approveCompOff(id);
      else await api.rejectCompOff(id);
      const cos = await api.getCompOffs();
      setCompoffs(cos as CompOff[]);
    } catch (err) { console.error(err); }
  };

  const handleAddHoliday = async (e: React.FormEvent) => {
    e.preventDefault(); setHLoading(true);
    try {
      await api.addHoliday(hForm);
      setHForm({ name: '', date: '', type: 'COMPANY' });
      const h = await api.getHolidays(new Date().getFullYear());
      setHolidays(h as Holiday[]);
    } catch (err) { console.error(err); }
    finally { setHLoading(false); }
  };

  const handleSeedHolidays = async () => {
    try {
      await api.seedHolidays();
      const h = await api.getHolidays(new Date().getFullYear());
      setHolidays(h as Holiday[]);
    } catch (err) { console.error(err); }
  };

  // CSV Export
  const exportCSV = () => {
    const rows = [
      ['Leave Type', 'Start Date', 'End Date', 'Days', 'Reason', 'Status', 'Applied On'],
      ...myLeaves.map(l => [
        l.leaveType.name,
        fmtDate(l.startDate),
        fmtDate(l.endDate),
        daysBetween(l.startDate, l.endDate),
        `"${l.reason.replace(/"/g, '""')}"`,
        l.status,
        fmtDate(l.createdAt),
      ]),
    ];
    const csv = rows.map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'leave-history.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  const inputClass = "w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-400";

  const tabs: { key: Tab; label: string; emoji: string }[] = [
    { key: 'balance', label: 'Balance', emoji: '📊' },
    { key: 'apply', label: 'Apply', emoji: '📝' },
    { key: 'history', label: 'History', emoji: '📋' },
    { key: 'holidays', label: 'Holidays', emoji: '🗓️' },
    { key: 'compoff', label: 'Comp-off', emoji: '🔄' },
  ];

  if (loading) return (
    <div className="flex justify-center py-12">
      <div className="w-8 h-8 rounded-full border-2 border-red-500/20 border-t-red-500 animate-spin" />
    </div>
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-black text-gray-900">Leaves</h2>
        <p className="text-sm text-gray-500 mt-0.5">Manage your leave requests and balance</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200 overflow-x-auto">
        {tabs.map(t => (
          <button key={t.key} onClick={() => setActiveTab(t.key)}
            className={`px-4 py-2 text-sm font-semibold border-b-2 transition-colors whitespace-nowrap ${activeTab === t.key ? 'border-red-500 text-red-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
            {t.emoji} {t.label}
          </button>
        ))}
      </div>

      {/* Balance */}
      {activeTab === 'balance' && (
        <div className="space-y-4">
          {compOffBalance > 0 && (
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 rounded-2xl p-4 flex items-center justify-between">
              <div>
                <div className="font-bold text-blue-900">Comp-off Available</div>
                <div className="text-sm text-blue-600">{compOffBalance} day(s) available to redeem</div>
              </div>
              <div className="text-3xl font-black text-blue-600">{compOffBalance}</div>
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {balance.map(b => {
              const pct = b.maxDays > 0 ? Math.min(100, (b.usedDays / b.maxDays) * 100) : 0;
              const color = b.remainingDays === 0 ? '#ef4444' : b.remainingDays <= 2 ? '#f97316' : '#22c55e';
              return (
                <div key={b.leaveType.id} className="bg-white rounded-2xl border border-gray-100 p-5">
                  <div className="flex items-center justify-between mb-3">
                    <div className="font-bold text-gray-900">{b.leaveType.name}</div>
                    <div className="text-2xl font-black" style={{ color }}>{b.remainingDays}</div>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2 mb-2">
                    <div className="h-2 rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: color }} />
                  </div>
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>{b.usedDays} used</span>
                    <span>{b.maxDays} total</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Apply */}
      {activeTab === 'apply' && (
        <div className="bg-white rounded-2xl border border-gray-100 p-6 max-w-lg">
          <h3 className="font-bold text-gray-900 mb-4">Apply for Leave</h3>
          {applySuccess && <div className="mb-4 bg-green-50 border border-green-200 text-green-700 text-sm px-4 py-3 rounded-xl">{applySuccess}</div>}
          {applyError && <div className="mb-4 bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl">{applyError}</div>}
          <form onSubmit={handleApply} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Leave Type</label>
              <select required value={form.leaveTypeId} onChange={e => setForm(f => ({ ...f, leaveTypeId: e.target.value }))} className={inputClass}>
                <option value="">Select leave type</option>
                {leaveTypes.map(lt => <option key={lt.id} value={lt.id}>{lt.name} (max {lt.maxDays} days)</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                <input type="date" required value={form.startDate} min={new Date().toISOString().split('T')[0]}
                  onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))} className={inputClass} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                <input type="date" required value={form.endDate} min={form.startDate || new Date().toISOString().split('T')[0]}
                  onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))} className={inputClass} />
              </div>
            </div>
            {form.startDate && form.endDate && (
              <div className="text-sm text-gray-600 bg-gray-50 rounded-lg px-3 py-2">
                Duration: <strong>{daysBetween(form.startDate, form.endDate)} day(s)</strong>
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Reason</label>
              <textarea required rows={3} value={form.reason} placeholder="Briefly describe the reason..."
                onChange={e => setForm(f => ({ ...f, reason: e.target.value }))}
                className={`${inputClass} resize-none`} />
            </div>
            <button type="submit" disabled={applying}
              className="text-white font-bold px-6 py-2.5 rounded-xl text-sm disabled:opacity-70"
              style={{ background: 'linear-gradient(90deg, rgb(220,38,38), rgb(249,115,22))' }}>
              {applying ? 'Submitting...' : 'Submit Application'}
            </button>
          </form>
        </div>
      )}

      {/* History */}
      {activeTab === 'history' && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-gray-900">Leave History</h3>
            <button onClick={exportCSV}
              className="text-sm font-semibold px-4 py-2 border border-gray-200 rounded-xl hover:bg-gray-50 flex items-center gap-2">
              ⬇️ Export CSV
            </button>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            {myLeaves.length === 0 ? (
              <div className="p-8 text-center text-gray-500 text-sm">No leave records yet</div>
            ) : myLeaves.map(l => (
              <div key={l.id} className="px-5 py-4 border-b border-gray-50 last:border-0">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-semibold text-gray-900">{l.leaveType.name}</span>
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${STATUS_COLORS[l.status]}`}>{l.status}</span>
                    </div>
                    <div className="text-xs text-gray-500">
                      {fmtDate(l.startDate)} → {fmtDate(l.endDate)} ({daysBetween(l.startDate, l.endDate)} day{daysBetween(l.startDate, l.endDate) > 1 ? 's' : ''})
                    </div>
                    <div className="text-xs text-gray-400 mt-0.5">{l.reason}</div>
                  </div>
                  {l.status === 'PENDING' && (
                    <button onClick={() => handleCancel(l.id)}
                      className="text-xs text-red-500 hover:text-red-700 font-medium shrink-0">
                      Cancel
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Holidays */}
      {activeTab === 'holidays' && (
        <div className="space-y-4">
          {isRole('ADMIN') && (
            <div className="bg-white rounded-2xl border border-gray-100 p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-gray-900">Add Holiday</h3>
                <button onClick={handleSeedHolidays}
                  className="text-xs font-semibold px-3 py-1.5 border border-gray-200 rounded-lg hover:bg-gray-50">
                  🌱 Seed 2026 National Holidays
                </button>
              </div>
              <form onSubmit={handleAddHoliday} className="flex flex-wrap gap-3 items-end">
                <div className="flex-1 min-w-32">
                  <label className="block text-xs font-medium text-gray-700 mb-1">Name</label>
                  <input type="text" required placeholder="Holiday name" value={hForm.name}
                    onChange={e => setHForm(f => ({ ...f, name: e.target.value }))} className={inputClass} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Date</label>
                  <input type="date" required value={hForm.date}
                    onChange={e => setHForm(f => ({ ...f, date: e.target.value }))} className={inputClass} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Type</label>
                  <select value={hForm.type} onChange={e => setHForm(f => ({ ...f, type: e.target.value }))} className={inputClass}>
                    <option value="COMPANY">Company</option>
                    <option value="NATIONAL">National</option>
                    <option value="OPTIONAL">Optional</option>
                  </select>
                </div>
                <button type="submit" disabled={hLoading}
                  className="text-white font-bold px-4 py-2 rounded-xl text-sm disabled:opacity-70"
                  style={{ background: 'linear-gradient(90deg, rgb(220,38,38), rgb(249,115,22))' }}>
                  {hLoading ? '...' : 'Add'}
                </button>
              </form>
            </div>
          )}

          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100">
              <h3 className="font-bold text-gray-900">Holidays {new Date().getFullYear()}</h3>
              <p className="text-xs text-gray-500 mt-0.5">{holidays.length} holiday(s)</p>
            </div>
            {holidays.length === 0 ? (
              <div className="p-8 text-center text-gray-500 text-sm">
                No holidays added.{isRole('ADMIN') ? ' Click "Seed 2026 National Holidays" above.' : ' Contact admin.'}
              </div>
            ) : holidays.map(h => {
              const d = new Date(h.date);
              const isPast = d < new Date();
              return (
                <div key={h.id} className={`flex items-center gap-4 px-5 py-3.5 border-b border-gray-50 last:border-0 ${isPast ? 'opacity-50' : ''}`}>
                  <div className="w-12 text-center shrink-0">
                    <div className="text-xs text-gray-500">{d.toLocaleDateString('en-US', { month: 'short' })}</div>
                    <div className="text-xl font-black text-gray-900">{d.getUTCDate()}</div>
                    <div className="text-xs text-gray-400">{d.toLocaleDateString('en-US', { weekday: 'short' })}</div>
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-semibold text-gray-900">{h.name}</div>
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${HOLIDAY_COLORS[h.type]}`}>{h.type}</span>
                  </div>
                  {isRole('ADMIN') && (
                    <button onClick={async () => { await api.deleteHoliday(h.id); setHolidays(hs => hs.filter(x => x.id !== h.id)); }}
                      className="text-xs text-red-400 hover:text-red-600 font-medium">Remove</button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Comp-off */}
      {activeTab === 'compoff' && (
        <div className="space-y-5">
          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            <h3 className="font-bold text-gray-900 mb-1">Request Comp-off</h3>
            <p className="text-sm text-gray-500 mb-4">Worked on a weekend or holiday? Request a compensatory day off.</p>
            {coError && <div className="mb-4 bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl">{coError}</div>}
            <form onSubmit={handleCompOff} className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date Worked</label>
                <input type="date" required value={coForm.earnedDate}
                  max={new Date().toISOString().split('T')[0]}
                  onChange={e => setCoForm(f => ({ ...f, earnedDate: e.target.value }))} className={inputClass} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Reason</label>
                <input type="text" required placeholder="e.g. Sprint release weekend" value={coForm.reason}
                  onChange={e => setCoForm(f => ({ ...f, reason: e.target.value }))} className={inputClass} />
              </div>
              <button type="submit" disabled={coLoading}
                className="text-white font-bold px-5 py-2 rounded-xl text-sm disabled:opacity-70"
                style={{ background: 'linear-gradient(90deg, rgb(220,38,38), rgb(249,115,22))' }}>
                {coLoading ? 'Submitting...' : 'Request'}
              </button>
            </form>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100">
              <h3 className="font-bold text-gray-900">{isRole('MANAGER', 'HR', 'ADMIN') ? 'All Comp-off Requests' : 'My Comp-off Requests'}</h3>
            </div>
            {compoffs.length === 0 ? (
              <div className="p-8 text-center text-gray-500 text-sm">No comp-off requests yet</div>
            ) : compoffs.map(c => (
              <div key={c.id} className="px-5 py-4 border-b border-gray-50 last:border-0">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    {isRole('MANAGER', 'HR', 'ADMIN') && (
                      <div className="text-sm font-semibold text-gray-900 mb-0.5">
                        {c.user.firstName} {c.user.lastName} ({c.user.employeeId})
                      </div>
                    )}
                    <div className="text-sm text-gray-700">
                      Worked on <span className="font-medium">{fmtDate(c.earnedDate)}</span> — {c.reason}
                    </div>
                    <div className="text-xs text-gray-400 mt-0.5">
                      Expires: {fmtDate(c.expiresAt)}
                      {c.approver && ` · Reviewed by ${c.approver.firstName} ${c.approver.lastName}`}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${COMPOFF_COLORS[c.status]}`}>{c.status}</span>
                    {isRole('MANAGER', 'HR', 'ADMIN') && c.status === 'EARNED' && (
                      <div className="flex gap-1.5">
                        <button onClick={() => handleCompOffAction(c.id, 'approve')}
                          className="text-xs bg-green-100 text-green-700 font-semibold px-3 py-1 rounded-lg hover:bg-green-200">Approve</button>
                        <button onClick={() => handleCompOffAction(c.id, 'reject')}
                          className="text-xs bg-red-100 text-red-700 font-semibold px-3 py-1 rounded-lg hover:bg-red-200">Reject</button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
