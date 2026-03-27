"use client";
import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { api, CalendarLeave } from "@/lib/api";

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

const STATUS_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
  PENDING:   { bg: 'bg-amber-50',   text: 'text-amber-700',  dot: 'bg-amber-400' },
  APPROVED:  { bg: 'bg-emerald-50', text: 'text-emerald-700',dot: 'bg-emerald-400' },
  REJECTED:  { bg: 'bg-red-50',     text: 'text-red-700',    dot: 'bg-red-400' },
  CANCELLED: { bg: 'bg-gray-50',    text: 'text-gray-500',   dot: 'bg-gray-300' },
};
const COMPOFF_COLORS: Record<string, string> = {
  EARNED: 'bg-yellow-100 text-yellow-700',
  APPROVED: 'bg-green-100 text-green-700',
  USED: 'bg-blue-100 text-blue-700',
  EXPIRED: 'bg-slate-100 text-gray-500',
};
const HOLIDAY_COLORS: Record<string, string> = {
  NATIONAL: 'bg-red-100 text-red-700',
  COMPANY: 'bg-blue-100 text-blue-700',
  OPTIONAL: 'bg-orange-100 text-orange-700',
};

// Distinct colors for leave type chips in calendar
const LEAVE_TYPE_COLORS = [
  { bg: 'bg-violet-100', text: 'text-violet-700' },
  { bg: 'bg-sky-100',    text: 'text-sky-700' },
  { bg: 'bg-teal-100',   text: 'text-teal-700' },
  { bg: 'bg-pink-100',   text: 'text-pink-700' },
  { bg: 'bg-orange-100', text: 'text-orange-700' },
];

const fmtDate = (d: string) => new Date(d).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
const fmtDateShort = (d: string) => new Date(d).toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
const daysBetween = (a: string, b: string) =>
  Math.ceil((new Date(b).getTime() - new Date(a).getTime()) / 86_400_000) + 1;

function initials(first: string, last: string) {
  return `${first[0] ?? ''}${last[0] ?? ''}`.toUpperCase();
}

// Avatar with gradient background, seeded by name for consistent color
const AVATAR_GRADIENTS = [
  'linear-gradient(135deg,#6366f1,#8b5cf6)',
  'linear-gradient(135deg,#3b82f6,#06b6d4)',
  'linear-gradient(135deg,#10b981,#14b8a6)',
  'linear-gradient(135deg,#f59e0b,#f97316)',
  'linear-gradient(135deg,#ef4444,#ec4899)',
  'linear-gradient(135deg,#84cc16,#22c55e)',
  'linear-gradient(135deg,#a855f7,#ec4899)',
];
function avatarGradient(name: string) {
  let hash = 0;
  for (const c of name) hash = (hash * 31 + c.charCodeAt(0)) & 0xffff;
  return AVATAR_GRADIENTS[hash % AVATAR_GRADIENTS.length];
}

type Tab = 'balance' | 'apply' | 'history' | 'calendar' | 'holidays' | 'compoff';
type CalView = 'tiles' | 'list' | 'detailed';

// ── Mini calendar ──────────────────────────────────────────────────────────
function MiniCalendar({ month, leaves, onDayClick, selectedDay }: {
  month: string;
  leaves: CalendarLeave[];
  onDayClick: (day: number | null) => void;
  selectedDay: number | null;
}) {
  const [year, m] = month.split('-').map(Number);
  const daysInMonth = new Date(year, m, 0).getDate();
  // Sunday=0 → shift so Monday=0
  const rawFirst = new Date(year, m - 1, 1).getDay();
  const firstWeekday = (rawFirst + 6) % 7; // Mon-based

  // Build day → Set of people on leave
  const dayMap: Record<number, Set<string>> = {};
  leaves.forEach(l => {
    const start = new Date(l.startDate);
    const end   = new Date(l.endDate);
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      if (d.getFullYear() === year && d.getMonth() === m - 1) {
        const day = d.getDate();
        if (!dayMap[day]) dayMap[day] = new Set();
        dayMap[day].add(l.user.id);
      }
    }
  });

  const today = new Date();
  const isCurrentMonth = today.getFullYear() === year && today.getMonth() === m - 1;

  const cells: (number | null)[] = [
    ...Array(firstWeekday).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  // Pad to complete last row
  while (cells.length % 7 !== 0) cells.push(null);

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-4">
      <div className="grid grid-cols-7 mb-2">
        {['Mo','Tu','We','Th','Fr','Sa','Su'].map(d => (
          <div key={d} className="text-center text-[10px] font-bold text-gray-400 py-1">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-y-1">
        {cells.map((day, i) => {
          if (!day) return <div key={i} />;
          const count = dayMap[day]?.size ?? 0;
          const isToday = isCurrentMonth && today.getDate() === day;
          const isSelected = selectedDay === day;
          const isSat = (firstWeekday + day - 1) % 7 === 5;
          const isSun = (firstWeekday + day - 1) % 7 === 6;
          const isWeekend = isSat || isSun;

          return (
            <button
              key={i}
              onClick={() => onDayClick(isSelected ? null : day)}
              className={`relative flex flex-col items-center justify-center rounded-xl py-1 text-xs font-semibold transition-all
                ${isSelected
                  ? 'text-white shadow-md'
                  : isToday
                  ? 'bg-red-50 text-red-600 ring-1 ring-red-300'
                  : isWeekend
                  ? 'text-gray-300'
                  : count > 0
                  ? 'text-gray-800 hover:bg-gray-50'
                  : 'text-gray-400 hover:bg-gray-50'
                }`}
              style={isSelected ? { background: 'linear-gradient(135deg,rgb(220,38,38),rgb(249,115,22))' } : {}}
            >
              {day}
              {count > 0 && (
                <span className={`mt-0.5 text-[9px] font-bold px-1 rounded-full
                  ${isSelected ? 'bg-white/30 text-white' : 'bg-orange-100 text-orange-600'}`}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── Tile card ───────────────────────────────────────────────────────────────
function LeaveCard({ leave, leaveTypeIndex }: { leave: CalendarLeave; leaveTypeIndex: number }) {
  const sc = STATUS_COLORS[leave.status] || STATUS_COLORS.PENDING;
  const ltc = LEAVE_TYPE_COLORS[leaveTypeIndex % LEAVE_TYPE_COLORS.length];
  const days = daysBetween(leave.startDate, leave.endDate);
  const grad = avatarGradient(leave.user.firstName + leave.user.lastName);

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-4 hover:shadow-md transition-all hover:-translate-y-0.5 flex flex-col gap-3">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div
          className="w-10 h-10 rounded-2xl flex items-center justify-center text-white text-sm font-bold shrink-0"
          style={{ background: grad }}
        >
          {initials(leave.user.firstName, leave.user.lastName)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-bold text-gray-900 truncate">
            {leave.user.firstName} {leave.user.lastName}
          </div>
          <div className="text-xs text-gray-400 truncate">
            {leave.user.designation || leave.user.department?.name || leave.user.employeeId}
          </div>
        </div>
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${sc.bg} ${sc.text}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${sc.dot}`} />
          {leave.status}
        </span>
      </div>

      {/* Leave type + dates */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <span className={`text-[11px] font-bold px-2 py-0.5 rounded-lg ${ltc.bg} ${ltc.text}`}>
            {leave.leaveType.name}
          </span>
          <span className="text-xs font-bold text-gray-600">{days} day{days > 1 ? 's' : ''}</span>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-gray-500">
          <span className="text-gray-300">📅</span>
          <span>{fmtDateShort(leave.startDate)}</span>
          {days > 1 && <><span className="text-gray-300">→</span><span>{fmtDateShort(leave.endDate)}</span></>}
        </div>
      </div>

      {/* Department chip */}
      {leave.user.department && (
        <div className="text-[10px] text-gray-400 bg-gray-50 rounded-lg px-2 py-1">
          {leave.user.department.name}
        </div>
      )}
    </div>
  );
}

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

  // Calendar state
  const [calMonth, setCalMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [calLeaves, setCalLeaves] = useState<CalendarLeave[]>([]);
  const [calLoading, setCalLoading] = useState(false);
  const [calView, setCalView] = useState<CalView>('tiles');
  const [calSearch, setCalSearch] = useState('');
  const [calSelectedDay, setCalSelectedDay] = useState<number | null>(null);
  const [calStatusFilter, setCalStatusFilter] = useState<'ALL' | 'APPROVED' | 'PENDING'>('ALL');

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

  const fetchCalendar = useCallback(async (month: string) => {
    setCalLoading(true);
    try {
      const data = await api.getLeaveCalendar(month);
      setCalLeaves(data);
    } catch (err) { console.error(err); }
    finally { setCalLoading(false); }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  useEffect(() => {
    if (activeTab === 'calendar') fetchCalendar(calMonth);
  }, [activeTab, calMonth, fetchCalendar]);

  // Month navigation helpers
  function prevMonth() {
    const [y, m] = calMonth.split('-').map(Number);
    const d = new Date(y, m - 2, 1);
    setCalMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
    setCalSelectedDay(null);
  }
  function nextMonth() {
    const [y, m] = calMonth.split('-').map(Number);
    const d = new Date(y, m, 1);
    setCalMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
    setCalSelectedDay(null);
  }
  function monthLabel(m: string) {
    const [y, mo] = m.split('-').map(Number);
    return new Date(y, mo - 1, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  }

  // Filter calendar leaves
  const filteredCalLeaves = calLeaves.filter(l => {
    if (calStatusFilter !== 'ALL' && l.status !== calStatusFilter) return false;
    if (calSearch) {
      const q = calSearch.toLowerCase();
      const name = `${l.user.firstName} ${l.user.lastName}`.toLowerCase();
      const dept = l.user.department?.name.toLowerCase() ?? '';
      const lt   = l.leaveType.name.toLowerCase();
      if (!name.includes(q) && !dept.includes(q) && !lt.includes(q)) return false;
    }
    if (calSelectedDay !== null) {
      const [year, m] = calMonth.split('-').map(Number);
      const selectedDate = new Date(year, m - 1, calSelectedDay);
      const start = new Date(l.startDate);
      const end   = new Date(l.endDate);
      if (selectedDate < start || selectedDate > end) return false;
    }
    return true;
  });

  // Build a stable index map so leave type colors are consistent per type name
  const leaveTypeIndexMap: Record<string, number> = {};
  calLeaves.forEach(l => {
    if (!(l.leaveType.name in leaveTypeIndexMap)) {
      leaveTypeIndexMap[l.leaveType.name] = Object.keys(leaveTypeIndexMap).length;
    }
  });

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

  const inputClass = "w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-400";

  const tabs: { key: Tab; label: string; emoji: string }[] = [
    { key: 'balance',   label: 'Balance',   emoji: '📊' },
    { key: 'apply',     label: 'Apply',     emoji: '📝' },
    { key: 'history',   label: 'History',   emoji: '📋' },
    { key: 'calendar',  label: 'Calendar',  emoji: '🗓️' },
    { key: 'holidays',  label: 'Holidays',  emoji: '🎉' },
    { key: 'compoff',   label: 'Comp-off',  emoji: '🔄' },
  ];

  if (loading) return (
    <div className="flex justify-center py-12">
      <div className="w-8 h-8 rounded-full border-2 border-red-500/20 border-t-red-500 animate-spin" />
    </div>
  );

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-[22px] font-bold text-slate-900">Leaves</h1>
        <p className="text-sm text-slate-500 mt-0.5">Manage your leave requests and view team availability</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-fit overflow-x-auto">
        {tabs.map(t => (
          <button key={t.key} onClick={() => setActiveTab(t.key)}
            className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all whitespace-nowrap ${activeTab === t.key ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}>
            {t.emoji} {t.label}
          </button>
        ))}
      </div>

      {/* ── Balance ─────────────────────────────────────────────────────── */}
      {activeTab === 'balance' && (
        <div className="space-y-4">
          {compOffBalance > 0 && (
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 rounded-2xl p-4 flex items-center justify-between">
              <div>
                <div className="font-bold text-blue-900">Comp-off Available</div>
                <div className="text-sm text-blue-600">{compOffBalance} day(s) available to redeem</div>
              </div>
              <div className="text-3xl font-bold text-blue-600">{compOffBalance}</div>
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {balance.map(b => {
              const pct = b.maxDays > 0 ? Math.min(100, (b.usedDays / b.maxDays) * 100) : 0;
              const color = b.remainingDays === 0 ? '#ef4444' : b.remainingDays <= 2 ? '#f97316' : '#22c55e';
              return (
                <div key={b.leaveType.id} className="bg-white rounded-2xl border border-slate-200 p-5">
                  <div className="flex items-center justify-between mb-3">
                    <div className="font-bold text-gray-900">{b.leaveType.name}</div>
                    <div className="text-2xl font-bold" style={{ color }}>{b.remainingDays}</div>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2 mb-2">
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

      {/* ── Apply ───────────────────────────────────────────────────────── */}
      {activeTab === 'apply' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 max-w-lg">
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

      {/* ── History ─────────────────────────────────────────────────────── */}
      {activeTab === 'history' && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-gray-900">Leave History</h3>
            <button onClick={exportCSV}
              className="text-sm font-semibold px-4 py-2 border border-slate-200 rounded-xl hover:bg-gray-50 flex items-center gap-2">
              ⬇️ Export CSV
            </button>
          </div>
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            {myLeaves.length === 0 ? (
              <div className="p-8 text-center text-gray-500 text-sm">No leave records yet</div>
            ) : myLeaves.map(l => {
              const sc = STATUS_COLORS[l.status] || STATUS_COLORS.PENDING;
              return (
                <div key={l.id} className="px-5 py-4 border-b border-gray-50 last:border-0">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-semibold text-gray-900">{l.leaveType.name}</span>
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full flex items-center gap-1 ${sc.bg} ${sc.text}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${sc.dot}`} />
                          {l.status}
                        </span>
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
              );
            })}
          </div>
        </div>
      )}

      {/* ── Calendar ────────────────────────────────────────────────────── */}
      {activeTab === 'calendar' && (
        <div className="space-y-4">
          {/* Header controls */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Month nav */}
            <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-2xl px-3 py-2">
              <button onClick={prevMonth} className="w-7 h-7 rounded-xl hover:bg-slate-100 flex items-center justify-center text-gray-500 transition-colors">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
              </button>
              <span className="text-sm font-bold text-gray-900 min-w-[130px] text-center">{monthLabel(calMonth)}</span>
              <button onClick={nextMonth} className="w-7 h-7 rounded-xl hover:bg-slate-100 flex items-center justify-center text-gray-500 transition-colors">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
              </button>
            </div>

            {/* View mode toggle */}
            <div className="flex bg-slate-100 rounded-xl p-0.5 gap-0.5">
              {(['tiles','list','detailed'] as CalView[]).map(v => (
                <button
                  key={v}
                  onClick={() => setCalView(v)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all capitalize
                    ${calView === v ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                >
                  {v === 'tiles' ? '⊞ Tiles' : v === 'list' ? '≡ List' : '☰ Detailed'}
                </button>
              ))}
            </div>

            {/* Status filter */}
            <div className="flex bg-slate-100 rounded-xl p-0.5 gap-0.5">
              {(['ALL','APPROVED','PENDING'] as const).map(s => (
                <button
                  key={s}
                  onClick={() => setCalStatusFilter(s)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all
                    ${calStatusFilter === s ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                >
                  {s === 'ALL' ? 'All' : s === 'APPROVED' ? '✅ Approved' : '⏳ Pending'}
                </button>
              ))}
            </div>

            {/* Search */}
            <div className="relative flex-1 min-w-[180px] max-w-xs">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder="Search name, dept, type..."
                value={calSearch}
                onChange={e => setCalSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-400 bg-white"
              />
            </div>

            {/* Count badge */}
            {!calLoading && (
              <div className="ml-auto flex items-center gap-2 text-sm text-gray-500">
                <span className="font-bold text-lg text-gray-900">{filteredCalLeaves.length}</span>
                <span>{filteredCalLeaves.length === 1 ? 'leave' : 'leaves'}{calSelectedDay ? ` on ${calSelectedDay}` : ' this month'}</span>
              </div>
            )}
          </div>

          {calLoading ? (
            <div className="flex justify-center py-12">
              <div className="w-8 h-8 rounded-full border-2 border-red-500/20 border-t-red-500 animate-spin" />
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-4 items-start">
              {/* Mini calendar */}
              <MiniCalendar
                month={calMonth}
                leaves={calLeaves}
                onDayClick={setCalSelectedDay}
                selectedDay={calSelectedDay}
              />

              {/* Leave content */}
              <div>
                {calSelectedDay && (
                  <div className="mb-3 flex items-center justify-between bg-orange-50 border border-orange-200 rounded-xl px-4 py-2.5">
                    <span className="text-sm font-semibold text-orange-800">
                      Showing leaves on {calSelectedDay} {monthLabel(calMonth).split(' ')[0]}
                    </span>
                    <button onClick={() => setCalSelectedDay(null)} className="text-xs text-orange-500 font-bold hover:text-orange-700">
                      Clear ×
                    </button>
                  </div>
                )}

                {filteredCalLeaves.length === 0 ? (
                  <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
                    <div className="text-4xl mb-3">🌴</div>
                    <div className="font-bold text-gray-700 mb-1">No leaves found</div>
                    <div className="text-sm text-gray-400">
                      {calSearch || calStatusFilter !== 'ALL' || calSelectedDay ? 'Try adjusting your filters' : 'Everyone is available this month!'}
                    </div>
                  </div>
                ) : calView === 'tiles' ? (
                  /* ── Tiles view ── */
                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                    {filteredCalLeaves.map(l => (
                      <LeaveCard key={l.id} leave={l} leaveTypeIndex={leaveTypeIndexMap[l.leaveType.name] ?? 0} />
                    ))}
                  </div>
                ) : calView === 'list' ? (
                  /* ── List view ── */
                  <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                    <div className="grid text-[10px] font-bold text-gray-400 uppercase tracking-widest px-4 py-3 border-b border-slate-200 bg-gray-50"
                      style={{ gridTemplateColumns: '2fr 1.5fr 1fr 1fr 80px' }}>
                      <span>Employee</span>
                      <span>Leave Type</span>
                      <span>From</span>
                      <span>To</span>
                      <span className="text-right">Status</span>
                    </div>
                    {filteredCalLeaves.map(l => {
                      const sc = STATUS_COLORS[l.status] || STATUS_COLORS.PENDING;
                      const grad = avatarGradient(l.user.firstName + l.user.lastName);
                      const days = daysBetween(l.startDate, l.endDate);
                      return (
                        <div key={l.id}
                          className="grid items-center px-4 py-3 border-b border-gray-50 last:border-0 hover:bg-gray-50/50 transition-colors"
                          style={{ gridTemplateColumns: '2fr 1.5fr 1fr 1fr 80px' }}>
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="w-7 h-7 rounded-xl flex items-center justify-center text-white text-[11px] font-bold shrink-0"
                              style={{ background: grad }}>
                              {initials(l.user.firstName, l.user.lastName)}
                            </div>
                            <div className="min-w-0">
                              <div className="text-sm font-semibold text-gray-900 truncate">{l.user.firstName} {l.user.lastName}</div>
                              <div className="text-[10px] text-gray-400 truncate">{l.user.department?.name || l.user.employeeId}</div>
                            </div>
                          </div>
                          <div className="min-w-0">
                            <div className="text-xs font-semibold text-gray-700 truncate">{l.leaveType.name}</div>
                            <div className="text-[10px] text-gray-400">{days} day{days > 1 ? 's' : ''}</div>
                          </div>
                          <div className="text-xs text-gray-600">{fmtDateShort(l.startDate)}</div>
                          <div className="text-xs text-gray-600">{fmtDateShort(l.endDate)}</div>
                          <div className="flex justify-end">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${sc.bg} ${sc.text}`}>
                              {l.status}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  /* ── Detailed view ── */
                  <div className="space-y-3">
                    {filteredCalLeaves.map(l => {
                      const sc = STATUS_COLORS[l.status] || STATUS_COLORS.PENDING;
                      const ltc = LEAVE_TYPE_COLORS[leaveTypeIndexMap[l.leaveType.name] % LEAVE_TYPE_COLORS.length];
                      const grad = avatarGradient(l.user.firstName + l.user.lastName);
                      const days = daysBetween(l.startDate, l.endDate);
                      return (
                        <div key={l.id} className="bg-white rounded-2xl border border-slate-200 p-5 hover:shadow-md transition-all">
                          <div className="flex items-start gap-4">
                            {/* Avatar */}
                            <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-white font-bold shrink-0"
                              style={{ background: grad }}>
                              {initials(l.user.firstName, l.user.lastName)}
                            </div>

                            {/* Main info */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-3 mb-2">
                                <div>
                                  <div className="text-sm font-bold text-gray-900">
                                    {l.user.firstName} {l.user.lastName}
                                  </div>
                                  <div className="text-xs text-gray-400">
                                    {l.user.designation && <span>{l.user.designation} · </span>}
                                    {l.user.department?.name && <span>{l.user.department.name} · </span>}
                                    <span>{l.user.employeeId}</span>
                                  </div>
                                </div>
                                <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full shrink-0 flex items-center gap-1 ${sc.bg} ${sc.text}`}>
                                  <span className={`w-1.5 h-1.5 rounded-full ${sc.dot}`} />
                                  {l.status}
                                </span>
                              </div>

                              {/* Details grid */}
                              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                <div className="bg-gray-50 rounded-xl p-3">
                                  <div className="text-[10px] font-bold text-gray-400 uppercase mb-1">Leave Type</div>
                                  <span className={`text-xs font-bold px-2 py-0.5 rounded-lg ${ltc.bg} ${ltc.text}`}>
                                    {l.leaveType.name}
                                  </span>
                                </div>
                                <div className="bg-gray-50 rounded-xl p-3">
                                  <div className="text-[10px] font-bold text-gray-400 uppercase mb-1">Duration</div>
                                  <div className="text-sm font-bold text-gray-900">{days}</div>
                                  <div className="text-[10px] text-gray-400">day{days > 1 ? 's' : ''}</div>
                                </div>
                                <div className="bg-gray-50 rounded-xl p-3">
                                  <div className="text-[10px] font-bold text-gray-400 uppercase mb-1">From</div>
                                  <div className="text-xs font-semibold text-gray-800">{fmtDateShort(l.startDate)}</div>
                                </div>
                                <div className="bg-gray-50 rounded-xl p-3">
                                  <div className="text-[10px] font-bold text-gray-400 uppercase mb-1">To</div>
                                  <div className="text-xs font-semibold text-gray-800">{fmtDateShort(l.endDate)}</div>
                                </div>
                              </div>

                              {/* Reason */}
                              <div className="mt-3 bg-gray-50 rounded-xl px-3 py-2.5">
                                <div className="text-[10px] font-bold text-gray-400 uppercase mb-1">Reason</div>
                                <div className="text-xs text-gray-700 leading-relaxed">{l.reason}</div>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Holidays ────────────────────────────────────────────────────── */}
      {activeTab === 'holidays' && (
        <div className="space-y-4">
          {isRole('ADMIN') && (
            <div className="bg-white rounded-2xl border border-slate-200 p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-gray-900">Add Holiday</h3>
                <button onClick={handleSeedHolidays}
                  className="text-xs font-semibold px-3 py-1.5 border border-slate-200 rounded-lg hover:bg-gray-50">
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

          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200">
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
                    <div className="text-xl font-bold text-gray-900">{d.getUTCDate()}</div>
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

      {/* ── Comp-off ────────────────────────────────────────────────────── */}
      {activeTab === 'compoff' && (
        <div className="space-y-5">
          <div className="bg-white rounded-2xl border border-slate-200 p-6">
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

          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200">
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
