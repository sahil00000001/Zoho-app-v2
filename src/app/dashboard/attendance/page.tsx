"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { api, TeamDailyEntry } from "@/lib/api";

interface AttendanceRecord {
  id: string;
  date: string;
  checkInTime: string | null;
  checkInAddress: string | null;
  checkOutTime: string | null;
  checkOutAddress: string | null;
  workHours: number | null;
  overtimeHours: number | null;
  isWFH: boolean;
  status: string;
  user: { firstName: string; lastName: string; employeeId: string; department?: { name: string } };
}

interface Regularization {
  id: string;
  date: string;
  reason: string;
  requestedCheckIn: string | null;
  requestedCheckOut: string | null;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  reviewNote: string | null;
  user: { firstName: string; lastName: string; employeeId: string };
  attendance: { checkInTime: string | null; checkOutTime: string | null } | null;
}

const STATUS_BADGE: Record<string, string> = {
  PRESENT: 'bg-green-50 text-green-600',
  LATE: 'bg-yellow-50 text-yellow-600',
  ABSENT: 'bg-red-50 text-red-500',
  HALF_DAY: 'bg-orange-50 text-orange-600',
};
const REG_BADGE: Record<string, string> = {
  PENDING: 'bg-yellow-50 text-yellow-700',
  APPROVED: 'bg-green-50 text-green-700',
  REJECTED: 'bg-red-50 text-red-700',
};

const AVATAR_GRADIENTS = [
  'linear-gradient(135deg, #667eea, #764ba2)',
  'linear-gradient(135deg, #f093fb, #f5576c)',
  'linear-gradient(135deg, #4facfe, #00f2fe)',
  'linear-gradient(135deg, #43e97b, #38f9d7)',
  'linear-gradient(135deg, #fa709a, #fee140)',
  'linear-gradient(135deg, #a18cd1, #fbc2eb)',
  'linear-gradient(135deg, #fccb90, #d57eeb)',
  'linear-gradient(135deg, #e0c3fc, #8ec5fc)',
];
const avatarGradient = (name: string) =>
  AVATAR_GRADIENTS[(name.charCodeAt(0) + (name.charCodeAt(1) || 0)) % AVATAR_GRADIENTS.length];

const fmt = (dt: string | null) =>
  dt ? new Date(dt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—';
const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
const fmtDateFull = (d: string) =>
  new Date(d).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
const fmtDay = (d: string) =>
  new Date(d).toLocaleDateString('en-US', { weekday: 'long' });
const todayStr = () => new Date().toISOString().split('T')[0];

type Tab = 'my' | 'calendar' | 'team' | 'regularize';
type TeamView = 'tiles' | 'list';
type TeamFilter = 'ALL' | 'PRESENT' | 'LATE' | 'WFH' | 'ABSENT';

export default function AttendancePage() {
  const { isRole } = useAuth();

  // Core state
  const [todayRecord, setTodayRecord] = useState<AttendanceRecord | null>(null);
  const [history, setHistory] = useState<AttendanceRecord[]>([]);
  const [monthly, setMonthly] = useState<AttendanceRecord[]>([]);
  const [teamData, setTeamData] = useState<TeamDailyEntry[]>([]);
  const [regularizations, setRegularizations] = useState<Regularization[]>([]);

  // Loading / error
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [teamLoading, setTeamLoading] = useState(false);
  const [todayErr, setTodayErr] = useState('');
  const [calErr, setCalErr] = useState('');
  const [teamErr, setTeamErr] = useState('');
  const [error, setError] = useState('');

  // UI state
  const [activeTab, setActiveTab] = useState<Tab>('my');
  const [isWFH, setIsWFH] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('All');

  // Calendar month (personal)
  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  // Team tab state
  const [teamDate, setTeamDate] = useState(todayStr);
  const [teamView, setTeamView] = useState<TeamView>('tiles');
  const [teamFilter, setTeamFilter] = useState<TeamFilter>('ALL');
  const [teamSearch, setTeamSearch] = useState('');

  // Live elapsed timer (seconds since check-in, updates every second)
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Regularization form
  const [regForm, setRegForm] = useState({ date: '', reason: '', requestedCheckIn: '', requestedCheckOut: '' });
  const [regLoading, setRegLoading] = useState(false);
  const [regSuccess, setRegSuccess] = useState('');

  // ── Initial fetch ──────────────────────────────────────────────────────────
  const fetchInitialData = useCallback(async () => {
    setLoading(true);
    const [todayRes, histRes, monRes, regsRes] = await Promise.allSettled([
      api.getTodayAttendance(),
      api.getAttendanceHistory(30),
      api.getMonthlyAttendance(currentMonth),
      api.getRegularizations(),
    ]);

    if (todayRes.status === 'fulfilled') setTodayRecord(todayRes.value as AttendanceRecord);
    else setTodayErr("Could not load today's record");

    if (histRes.status === 'fulfilled') setHistory(histRes.value as AttendanceRecord[]);
    if (monRes.status === 'fulfilled') setMonthly(monRes.value as AttendanceRecord[]);
    else setCalErr('Could not load calendar data');
    if (regsRes.status === 'fulfilled') setRegularizations(regsRes.value as Regularization[]);

    setLoading(false);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { fetchInitialData(); }, [fetchInitialData]);

  // ── Auto-refresh today's record every 30s ────────────────────────────────
  useEffect(() => {
    const id = setInterval(async () => {
      try {
        const record = await api.getTodayAttendance();
        setTodayRecord(record as AttendanceRecord);
      } catch { /* silent background refresh */ }
    }, 30000);
    return () => clearInterval(id);
  }, []);

  // ── Live elapsed timer (ticks every second while session is active) ───────
  useEffect(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    const checkInTime = todayRecord?.checkInTime;
    const checkedOut = !!todayRecord?.checkOutTime;
    if (!checkInTime || checkedOut) { setElapsedSeconds(0); return; }
    const tick = () => setElapsedSeconds(Math.floor((Date.now() - new Date(checkInTime).getTime()) / 1000));
    tick();
    timerRef.current = setInterval(tick, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [todayRecord?.checkInTime, todayRecord?.checkOutTime]);

  // ── Refetch monthly when month changes ────────────────────────────────────
  const fetchMonthly = useCallback(async (month: string) => {
    setCalErr('');
    try {
      const r = await api.getMonthlyAttendance(month);
      setMonthly(r as AttendanceRecord[]);
    } catch { setCalErr('Could not load calendar data'); }
  }, []);

  useEffect(() => { fetchMonthly(currentMonth); }, [currentMonth, fetchMonthly]);

  // ── Fetch team attendance ─────────────────────────────────────────────────
  const fetchTeam = useCallback(async (date: string) => {
    setTeamLoading(true); setTeamErr('');
    try {
      const r = await api.getDailyAttendance(date);
      setTeamData(r);
    } catch { setTeamErr('Could not load team attendance'); }
    finally { setTeamLoading(false); }
  }, []);

  useEffect(() => {
    if (activeTab === 'team') fetchTeam(teamDate);
  }, [activeTab, teamDate, fetchTeam]);

  // ── Geolocation ───────────────────────────────────────────────────────────
  const getLocation = (): Promise<{ lat: number; lng: number; address?: string } | undefined> =>
    new Promise(resolve => {
      if (!navigator.geolocation) return resolve(undefined);
      navigator.geolocation.getCurrentPosition(
        async pos => {
          const { latitude: lat, longitude: lng } = pos.coords;
          try {
            const res = await fetch(
              `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`,
              { headers: { 'Accept-Language': 'en' } }
            );
            const data = await res.json() as { display_name?: string };
            resolve({ lat, lng, address: data.display_name });
          } catch { resolve({ lat, lng }); }
        },
        () => resolve(undefined),
        { timeout: 8000 }
      );
    });

  // ── Check-in / Check-out ──────────────────────────────────────────────────
  const handleCheckIn = async () => {
    setActionLoading(true); setError(''); setTodayErr('');
    try {
      const location = await getLocation();
      const record = await api.checkIn(location, isWFH);
      setTodayRecord(record as AttendanceRecord);
    } catch (err) { setError(err instanceof Error ? err.message : 'Failed to check in'); }
    finally { setActionLoading(false); }
  };

  const handleCheckOut = async () => {
    setActionLoading(true); setError(''); setTodayErr('');
    try {
      const location = await getLocation();
      const record = await api.checkOut(location);
      setTodayRecord(record as AttendanceRecord);
    } catch (err) { setError(err instanceof Error ? err.message : 'Failed to check out'); }
    finally { setActionLoading(false); }
  };

  const handleReCheckIn = async () => {
    setActionLoading(true); setError(''); setTodayErr('');
    try {
      const record = await api.reCheckIn();
      setTodayRecord(record as AttendanceRecord);
    } catch (err) { setError(err instanceof Error ? err.message : 'Failed to reopen session'); }
    finally { setActionLoading(false); }
  };

  // ── Regularization ────────────────────────────────────────────────────────
  const handleRegularize = async (e: React.FormEvent) => {
    e.preventDefault(); setRegLoading(true); setRegSuccess(''); setError('');
    try {
      await api.submitRegularization({
        date: regForm.date,
        reason: regForm.reason,
        ...(regForm.requestedCheckIn && { requestedCheckIn: `${regForm.date}T${regForm.requestedCheckIn}:00` }),
        ...(regForm.requestedCheckOut && { requestedCheckOut: `${regForm.date}T${regForm.requestedCheckOut}:00` }),
      });
      setRegSuccess('Regularization request submitted successfully.');
      setRegForm({ date: '', reason: '', requestedCheckIn: '', requestedCheckOut: '' });
      const regs = await api.getRegularizations();
      setRegularizations(regs as Regularization[]);
    } catch (err) { setError(err instanceof Error ? err.message : 'Failed to submit'); }
    finally { setRegLoading(false); }
  };

  const handleRegAction = async (id: string, action: 'approve' | 'reject') => {
    try {
      if (action === 'approve') await api.approveRegularization(id);
      else await api.rejectRegularization(id);
      const regs = await api.getRegularizations();
      setRegularizations(regs as Regularization[]);
    } catch (err) { setError(err instanceof Error ? err.message : 'Action failed'); }
  };

  // ── Calendar helpers ──────────────────────────────────────────────────────
  const calendarDays = () => {
    const [year, month] = currentMonth.split('-').map(Number);
    const firstDay = new Date(year, month - 1, 1).getDay();
    const daysInMonth = new Date(year, month, 0).getDate();
    const attendanceMap = new Map(monthly.map(r => [new Date(r.date).getUTCDate(), r]));
    const cells: Array<{ day: number | null; record?: AttendanceRecord }> = [];
    for (let i = 0; i < firstDay; i++) cells.push({ day: null });
    for (let d = 1; d <= daysInMonth; d++) cells.push({ day: d, record: attendanceMap.get(d) });
    return cells;
  };

  const calendarColor = (r?: AttendanceRecord, day?: number | null) => {
    if (!day) return '';
    const today = new Date();
    const [year, month] = currentMonth.split('-').map(Number);
    const cellDate = new Date(year, month - 1, day);
    const dow = cellDate.getDay();
    if (dow === 0 || dow === 6) return 'bg-slate-100 text-slate-400';
    if (cellDate > today) return 'bg-white text-slate-300 border border-slate-100';
    if (!r) return 'bg-red-50 text-red-400';
    if (r.isWFH) return 'bg-blue-50 text-blue-600';
    return { PRESENT: 'bg-green-50 text-green-600', LATE: 'bg-yellow-50 text-yellow-600', HALF_DAY: 'bg-orange-50 text-orange-600', ABSENT: 'bg-red-50 text-red-400' }[r.status] ?? 'bg-slate-100 text-slate-500';
  };

  // ── Team helpers ──────────────────────────────────────────────────────────
  const filteredTeam = teamData.filter(entry => {
    const a = entry.attendance;
    const matchStatus =
      teamFilter === 'ALL' ? true :
      teamFilter === 'PRESENT' ? a?.status === 'PRESENT' :
      teamFilter === 'LATE' ? a?.status === 'LATE' :
      teamFilter === 'WFH' ? a?.isWFH === true :
      teamFilter === 'ABSENT' ? !a : false;
    const q = teamSearch.toLowerCase();
    const matchSearch = !q || `${entry.user.firstName} ${entry.user.lastName}`.toLowerCase().includes(q)
      || entry.user.employeeId.toLowerCase().includes(q)
      || (entry.user.department?.name ?? '').toLowerCase().includes(q);
    return matchStatus && matchSearch;
  });

  const teamStats = {
    present: teamData.filter(e => e.attendance?.status === 'PRESENT').length,
    late: teamData.filter(e => e.attendance?.status === 'LATE').length,
    wfh: teamData.filter(e => e.attendance?.isWFH).length,
    absent: teamData.filter(e => !e.attendance).length,
    total: teamData.length,
  };

  // ── Monthly stats from history ────────────────────────────────────────────
  const monthStats = {
    present: history.filter(r => r.status === 'PRESENT' || r.status === 'LATE').length,
    absent: history.filter(r => r.status === 'ABSENT').length,
    wfh: history.filter(r => r.isWFH).length,
    avgHours: history.length > 0
      ? (history.reduce((s, r) => s + (r.workHours || 0), 0) / history.filter(r => r.workHours).length || 0).toFixed(1)
      : '0',
  };

  // Filtered history
  const filteredHistory = statusFilter === 'All'
    ? history
    : history.filter(r => {
        if (statusFilter === 'WFH') return r.isWFH;
        if (statusFilter === 'Holiday') return false;
        return r.status === statusFilter.toUpperCase();
      });

  const tabs: { key: Tab; label: string }[] = [
    { key: 'my', label: 'History' },
    { key: 'calendar', label: 'Calendar' },
    { key: 'team', label: 'Team' },
    { key: 'regularize', label: 'Regularize' },
  ];

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <div className="w-8 h-8 rounded-full border-2 border-red-500/20 border-t-red-500 animate-spin" />
    </div>
  );

  const isCheckedIn = !!todayRecord?.checkInTime;
  const isCheckedOut = !!todayRecord?.checkOutTime;
  const activeSession = isCheckedIn && !isCheckedOut;

  const fmtElapsed = (sec: number) => {
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    return `${h}h ${m}m`;
  };

  const displayHours = activeSession
    ? fmtElapsed(elapsedSeconds)
    : todayRecord?.workHours ? `${todayRecord.workHours}h` : '0h 0m';

  const workPct = activeSession
    ? Math.min(100, (elapsedSeconds / 3600 / 8) * 100)
    : todayRecord?.workHours ? Math.min(100, (todayRecord.workHours / 8) * 100) : 0;

  return (
    <div className="p-4 md:p-6 space-y-4 md:space-y-6">
      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl md:text-[22px] font-bold text-slate-900">Attendance</h1>
          <p className="text-slate-500 text-sm mt-0.5 hidden sm:block">Track your check-ins, hours, and team presence</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {!isCheckedIn && (
            <button onClick={() => setIsWFH(v => !v)}
              className={`px-3 py-2 border font-semibold rounded-lg text-sm transition-all active:scale-95 ${isWFH ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'}`}>
              {isWFH ? '🏠 WFH' : 'Mark WFH'}
            </button>
          )}
          {!isCheckedIn && (
            <button onClick={handleCheckIn} disabled={actionLoading}
              className="px-5 py-2 text-white font-bold rounded-lg text-sm shadow-md shadow-orange-200 hover:opacity-90 transition-all active:scale-95 disabled:opacity-60 flex items-center gap-2"
              style={{ background: isWFH ? 'linear-gradient(135deg, #3b82f6, #2563eb)' : 'linear-gradient(135deg, #DC2626, #F97316)' }}>
              {actionLoading && <span className="w-4 h-4 rounded-full border-2 border-white/40 border-t-white animate-spin" />}
              {isWFH ? '🏠 Check In (WFH)' : 'Check In'}
            </button>
          )}
          {isCheckedIn && !isCheckedOut && (
            <button onClick={handleCheckOut} disabled={actionLoading}
              className="px-5 py-2 bg-red-50 text-red-600 font-bold rounded-lg text-sm hover:bg-red-100 transition-all active:scale-95 border border-red-100 flex items-center gap-2">
              {actionLoading && <span className="w-4 h-4 rounded-full border-2 border-red-300 border-t-red-600 animate-spin" />}
              Check Out
            </button>
          )}
          {isCheckedIn && isCheckedOut && (
            <button onClick={handleReCheckIn} disabled={actionLoading}
              title="Accidentally checked out? Resume your session — original check-in time is preserved"
              className="px-4 py-2 bg-amber-50 text-amber-700 font-semibold rounded-lg text-sm hover:bg-amber-100 transition-all active:scale-95 border border-amber-200 flex items-center gap-2">
              {actionLoading && <span className="w-4 h-4 rounded-full border-2 border-amber-400 border-t-amber-700 animate-spin" />}
              ↩ Check In Again
            </button>
          )}
          <button onClick={() => fetchInitialData()} title="Refresh"
            className="p-2 rounded-lg border border-slate-200 text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-colors text-base">
            ↺
          </button>
        </div>
      </div>

      {/* ── Error Banner ── */}
      {(error || todayErr) && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl flex justify-between">
          {error || todayErr}
          <button onClick={() => { setError(''); setTodayErr(''); }} className="text-red-400 ml-2">✕</button>
        </div>
      )}

      {/* ── Today Card ── */}
      <section className="bg-white border border-slate-200 rounded-2xl p-5 flex flex-col md:flex-row items-center justify-between gap-6">
        {/* Left: Status */}
        <div className="flex-shrink-0">
          {isCheckedIn ? (
            <div className="flex items-center gap-2 mb-1">
              <span className="w-2.5 h-2.5 bg-green-500 rounded-full" />
              <span className="text-green-600 font-bold text-sm">
                {isCheckedOut ? 'Work Day Complete' : 'Currently Checked In'}
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-2 mb-1">
              <span className="w-2.5 h-2.5 bg-slate-300 rounded-full" />
              <span className="text-slate-500 font-medium text-sm">Not Checked In</span>
            </div>
          )}
          <p className="text-slate-500 text-sm">
            {isCheckedIn ? `Checked in at ${fmt(todayRecord?.checkInTime ?? null)}` : 'Ready to start your day'}
          </p>
          {isCheckedOut && (
            <p className="text-slate-500 text-sm">Checked out at {fmt(todayRecord?.checkOutTime ?? null)}</p>
          )}
          {todayRecord?.checkInAddress && (
            <p className="text-xs text-slate-400 mt-1 max-w-[260px] truncate" title={todayRecord.checkInAddress}>
              📍 {todayRecord.checkInAddress.split(',').slice(0, 2).join(',')}
            </p>
          )}
        </div>

        {/* Center: Progress */}
        <div className="flex-1 w-full max-w-sm text-center">
          <span className="text-4xl font-extrabold text-slate-900 tracking-tight">
            {displayHours}
          </span>
          <p className="text-slate-400 text-sm mb-3">of 8h 0m daily target</p>
          <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
            <div className="h-full rounded-full transition-all"
              style={{ width: `${workPct}%`, background: 'linear-gradient(90deg, #DC2626, #F97316)' }} />
          </div>
          {todayRecord?.isWFH && (
            <span className="mt-2 inline-block px-2.5 py-0.5 bg-blue-50 text-blue-600 text-xs font-bold rounded-md">🏠 WFH</span>
          )}
        </div>

        {/* Right: Stats */}
        <div className="flex flex-col items-end gap-2 shrink-0">
          <div className="grid grid-cols-2 gap-2 text-center">
            {[
              { label: 'Check In', value: fmt(todayRecord?.checkInTime ?? null) },
              { label: 'Check Out', value: fmt(todayRecord?.checkOutTime ?? null) },
              { label: 'Hours', value: activeSession ? fmtElapsed(elapsedSeconds) : (todayRecord?.workHours ? `${todayRecord.workHours}h` : '—') },
              { label: 'OT Hours', value: todayRecord?.overtimeHours ? `+${todayRecord.overtimeHours}h` : '0h 0m' },
            ].map(({ label, value }) => (
              <div key={label} className="text-center p-2.5 bg-slate-50 rounded-xl min-w-[80px]">
                <div className="text-[10px] text-slate-400 uppercase tracking-wide mb-0.5">{label}</div>
                <div className="font-bold text-sm text-slate-900">{value}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Monthly Stats ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Present Days', value: monthStats.present, color: 'text-green-600', bg: 'bg-green-50', icon: '✓' },
          { label: 'Absent', value: monthStats.absent, color: 'text-red-600', bg: 'bg-red-50', icon: '✗' },
          { label: 'WFH Days', value: monthStats.wfh, color: 'text-blue-600', bg: 'bg-blue-50', icon: '🏠' },
          { label: 'Avg Hours', value: `${monthStats.avgHours}h`, color: 'text-slate-700', bg: 'bg-slate-50', icon: '⏱' },
        ].map(({ label, value, color, bg, icon }) => (
          <div key={label} className="bg-white p-5 rounded-2xl border border-slate-200">
            <p className="text-slate-500 text-sm font-medium mb-2">{label}</p>
            <div className="flex items-end justify-between">
              <h3 className="text-3xl font-bold text-slate-900 leading-none">{value}</h3>
              <span className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold ${bg} ${color}`}>{icon}</span>
            </div>
          </div>
        ))}
      </div>

      {/* ── Tabs ── */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between px-4 pt-4 pb-0 border-b border-slate-100 gap-2">
          <div className="flex gap-1 bg-slate-50 p-1 rounded-xl mb-1 sm:mb-3 overflow-x-auto">
            {tabs.map(t => (
              <button key={t.key} onClick={() => setActiveTab(t.key)}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all whitespace-nowrap ${activeTab === t.key ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                {t.label}
              </button>
            ))}
          </div>

          {/* Status filter (only on History tab) */}
          {activeTab === 'my' && (
            <div className="flex gap-1 mb-2 sm:mb-3 overflow-x-auto pb-1">
              {['All', 'Present', 'Absent', 'WFH'].map(f => (
                <button key={f} onClick={() => setStatusFilter(f)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap ${statusFilter === f ? 'bg-white text-slate-900 shadow-sm border border-slate-200' : 'text-slate-500 hover:text-slate-700'}`}>
                  {f}
                </button>
              ))}
            </div>
          )}

          {/* Month nav (calendar tab) */}
          {activeTab === 'calendar' && (
            <div className="flex items-center gap-2 mb-2 sm:mb-3 bg-slate-50 rounded-xl px-3 py-1.5 border border-slate-100">
              <button onClick={() => {
                const [y, m] = currentMonth.split('-').map(Number);
                const prev = new Date(y, m - 2, 1);
                setCurrentMonth(`${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, '0')}`);
              }} className="text-slate-400 hover:text-slate-600 font-bold">‹</button>
              <span className="text-sm font-bold text-slate-700 min-w-[120px] text-center">
                {new Date(`${currentMonth}-01`).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
              </span>
              <button onClick={() => {
                const [y, m] = currentMonth.split('-').map(Number);
                const next = new Date(y, m, 1);
                setCurrentMonth(`${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}`);
              }} className="text-slate-400 hover:text-slate-600 font-bold">›</button>
            </div>
          )}
        </div>

        {/* ── History Tab ── */}
        {activeTab === 'my' && (
          filteredHistory.length === 0 ? (
            <div className="p-12 text-center text-slate-400 text-sm">No attendance records found</div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  {['Date', 'Day', 'Check In', 'Check Out', 'Hours', 'Status', 'Notes'].map(h => (
                    <th key={h} className="px-5 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredHistory.map(r => (
                  <tr key={r.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-5 py-4 text-sm font-semibold text-slate-900">{fmtDateFull(r.date)}</td>
                    <td className="px-5 py-4 text-sm text-slate-600 font-medium">{fmtDay(r.date)}</td>
                    <td className="px-5 py-4 text-sm text-slate-600">{fmt(r.checkInTime)}</td>
                    <td className="px-5 py-4 text-sm text-slate-600">{fmt(r.checkOutTime)}</td>
                    <td className="px-5 py-4 text-sm font-bold text-slate-900">
                      {r.workHours ? `${r.workHours}h` : '0h 0m'}
                      {r.overtimeHours ? <span className="ml-1 text-orange-500 text-xs">+{r.overtimeHours}h OT</span> : null}
                    </td>
                    <td className="px-5 py-4">
                      <span className={`px-2.5 py-1 text-xs font-bold rounded-full ${r.isWFH ? 'bg-blue-50 text-blue-600' : STATUS_BADGE[r.status] ?? 'bg-slate-100 text-slate-500'}`}>
                        {r.isWFH ? 'WFH' : r.status}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-sm text-slate-400">
                      {r.checkInAddress ? r.checkInAddress.split(',')[0] : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )
        )}

        {/* ── Calendar Tab ── */}
        {activeTab === 'calendar' && (
          <div className="p-5">
            {calErr && <div className="mb-4 bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl">{calErr}</div>}

            {/* Legend */}
            <div className="flex flex-wrap gap-3 mb-4 text-xs">
              {[['bg-green-50 text-green-600', 'Present'], ['bg-yellow-50 text-yellow-600', 'Late'], ['bg-blue-50 text-blue-600', 'WFH'], ['bg-orange-50 text-orange-600', 'Half Day'], ['bg-red-50 text-red-400', 'Absent'], ['bg-slate-100 text-slate-400', 'Weekend']].map(([cls, label]) => (
                <div key={label} className="flex items-center gap-1.5">
                  <div className={`w-3 h-3 rounded-sm ${cls.split(' ')[0]}`} />
                  <span className="text-slate-500">{label}</span>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-1 text-xs font-bold text-slate-400 mb-1 text-center">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
                <div key={d} className="py-1">{d}</div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {calendarDays().map((cell, i) => (
                <div key={i} className={`aspect-square flex flex-col items-center justify-center rounded-lg text-xs font-medium transition-all ${cell.day ? calendarColor(cell.record, cell.day) : ''}`}>
                  {cell.day && (
                    <>
                      <span className="font-bold">{cell.day}</span>
                      {cell.record?.workHours && <span className="text-[10px] opacity-75">{cell.record.workHours}h</span>}
                      {cell.record?.isWFH && !cell.record.workHours && <span className="text-[10px]">🏠</span>}
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Team Tab ── */}
        {activeTab === 'team' && (
          <div className="p-5 space-y-4">
            {/* Controls */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2 bg-slate-50 rounded-xl px-3 py-2 border border-slate-100">
                <span className="text-xs font-medium text-slate-500">Date</span>
                <input type="date" value={teamDate} onChange={e => setTeamDate(e.target.value)} max={todayStr()}
                  className="border-0 bg-transparent text-sm font-medium text-slate-700 focus:outline-none" />
              </div>

              <div className="flex bg-slate-50 p-1 rounded-xl gap-1 border border-slate-100">
                {(['ALL', 'PRESENT', 'LATE', 'WFH', 'ABSENT'] as TeamFilter[]).map(f => (
                  <button key={f} onClick={() => setTeamFilter(f)}
                    className={`px-3 py-1 text-xs font-bold rounded-lg transition-colors ${teamFilter === f ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                    {f}
                  </button>
                ))}
              </div>

              <input type="text" placeholder="Search name, dept…" value={teamSearch} onChange={e => setTeamSearch(e.target.value)}
                className="flex-1 min-w-32 border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-400" />

              <div className="flex rounded-lg overflow-hidden border border-slate-200 ml-auto">
                <button onClick={() => setTeamView('tiles')}
                  className={`px-3 py-1.5 text-xs font-semibold transition-colors ${teamView === 'tiles' ? 'bg-slate-900 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'}`}>
                  ⊞ Tiles
                </button>
                <button onClick={() => setTeamView('list')}
                  className={`px-3 py-1.5 text-xs font-semibold transition-colors ${teamView === 'list' ? 'bg-slate-900 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'}`}>
                  ≡ List
                </button>
              </div>
            </div>

            {/* Stats chips */}
            {!teamLoading && teamData.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {[
                  { label: 'Total', val: teamStats.total, cls: 'bg-slate-100 text-slate-700' },
                  { label: 'Present', val: teamStats.present, cls: 'bg-green-50 text-green-700' },
                  { label: 'Late', val: teamStats.late, cls: 'bg-yellow-50 text-yellow-700' },
                  { label: 'WFH', val: teamStats.wfh, cls: 'bg-blue-50 text-blue-700' },
                  { label: 'Absent', val: teamStats.absent, cls: 'bg-red-50 text-red-600' },
                ].map(({ label, val, cls }) => (
                  <div key={label} className={`px-3 py-1 rounded-full text-xs font-bold ${cls}`}>
                    {label}: {val}
                  </div>
                ))}
              </div>
            )}

            {teamErr && <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl">{teamErr}</div>}

            {teamLoading && (
              <div className="flex justify-center py-10">
                <div className="w-8 h-8 rounded-full border-2 border-red-500/20 border-t-red-500 animate-spin" />
              </div>
            )}

            {!teamLoading && !teamErr && filteredTeam.length === 0 && (
              <div className="py-10 text-center text-slate-400 text-sm">
                {teamData.length === 0 ? 'No employees found' : 'No records match your filter'}
              </div>
            )}

            {/* Tiles view */}
            {!teamLoading && teamView === 'tiles' && filteredTeam.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                {filteredTeam.map(entry => {
                  const a = entry.attendance;
                  const u = entry.user;
                  const fullName = `${u.firstName} ${u.lastName}`;
                  const statusKey = a ? (a.isWFH ? 'WFH' : a.status) : 'ABSENT';
                  const badgeCls = a ? (a.isWFH ? 'bg-blue-50 text-blue-600' : STATUS_BADGE[a.status] ?? 'bg-slate-100 text-slate-600') : 'bg-red-50 text-red-500';
                  return (
                    <div key={u.id} className="bg-slate-50 rounded-2xl border border-slate-100 p-4 flex flex-col items-center text-center gap-2 hover:shadow-md transition-shadow">
                      <div className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-sm"
                        style={{ background: avatarGradient(fullName) }}>
                        {u.firstName[0]}{u.lastName[0]}
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-slate-900 leading-tight">{fullName}</div>
                        <div className="text-xs text-slate-400">{u.employeeId}</div>
                        {u.department?.name && <div className="text-xs text-slate-400">{u.department.name}</div>}
                      </div>
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${badgeCls}`}>{statusKey}</span>
                      {a && (
                        <div className="text-xs text-slate-400 space-y-0.5">
                          <div>In: {fmt(a.checkInTime)}</div>
                          {a.checkOutTime && <div>Out: {fmt(a.checkOutTime)}</div>}
                          {a.workHours && <div className="font-medium text-slate-600">{a.workHours}h</div>}
                          {a.overtimeHours && <div className="text-orange-500 font-semibold">+{a.overtimeHours}h OT</div>}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* List view */}
            {!teamLoading && teamView === 'list' && filteredTeam.length > 0 && (
              <div className="border border-slate-100 rounded-xl overflow-hidden">
                {filteredTeam.map(entry => {
                  const a = entry.attendance;
                  const u = entry.user;
                  const fullName = `${u.firstName} ${u.lastName}`;
                  const statusKey = a ? (a.isWFH ? 'WFH' : a.status) : 'ABSENT';
                  const badgeCls = a ? (a.isWFH ? 'bg-blue-50 text-blue-600' : STATUS_BADGE[a.status] ?? 'bg-slate-100 text-slate-600') : 'bg-red-50 text-red-500';
                  return (
                    <div key={u.id} className="flex items-center gap-4 px-5 py-3.5 border-b border-slate-50 last:border-0 hover:bg-slate-50/50">
                      <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
                        style={{ background: avatarGradient(fullName) }}>
                        {u.firstName[0]}{u.lastName[0]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold text-slate-900">{fullName}</div>
                        <div className="text-xs text-slate-400 truncate">
                          {u.employeeId}{u.department?.name ? ` · ${u.department.name}` : ''}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${badgeCls}`}>{statusKey}</span>
                        {a ? (
                          <div className="text-xs text-slate-400 mt-0.5">
                            {fmt(a.checkInTime)} → {fmt(a.checkOutTime)}
                            {a.workHours && <span className="ml-1 text-slate-600 font-medium">{a.workHours}h</span>}
                          </div>
                        ) : (
                          <div className="text-xs text-slate-400 mt-0.5">Not checked in</div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ── Regularize Tab ── */}
        {activeTab === 'regularize' && (
          <div className="p-5 space-y-5">
            {/* Form */}
            <div className="bg-slate-50 rounded-xl border border-slate-100 p-5">
              <h3 className="font-bold text-slate-900 mb-4">Request Attendance Correction</h3>
              {regSuccess && <div className="mb-4 bg-green-50 border border-green-200 text-green-700 text-sm px-4 py-3 rounded-xl">{regSuccess}</div>}
              {error && <div className="mb-4 bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl">{error}</div>}
              <form onSubmit={handleRegularize} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1.5">Date</label>
                    <input type="date" required value={regForm.date} onChange={e => setRegForm(f => ({ ...f, date: e.target.value }))}
                      max={new Date().toISOString().split('T')[0]}
                      className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-400" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1.5">Reason</label>
                    <input type="text" required placeholder="e.g. Forgot to check in" value={regForm.reason}
                      onChange={e => setRegForm(f => ({ ...f, reason: e.target.value }))}
                      className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-400" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1.5">Requested Check-in</label>
                    <input type="time" value={regForm.requestedCheckIn} onChange={e => setRegForm(f => ({ ...f, requestedCheckIn: e.target.value }))}
                      className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-400" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1.5">Requested Check-out</label>
                    <input type="time" value={regForm.requestedCheckOut} onChange={e => setRegForm(f => ({ ...f, requestedCheckOut: e.target.value }))}
                      className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-400" />
                  </div>
                </div>
                <button type="submit" disabled={regLoading}
                  className="text-white font-bold px-6 py-2.5 rounded-xl text-sm disabled:opacity-60 flex items-center gap-2"
                  style={{ background: 'linear-gradient(135deg, #DC2626, #F97316)' }}>
                  {regLoading && <span className="w-4 h-4 rounded-full border-2 border-white/40 border-t-white animate-spin" />}
                  {regLoading ? 'Submitting...' : 'Submit Request'}
                </button>
              </form>
            </div>

            {/* Requests list */}
            <div>
              <h3 className="font-bold text-slate-900 mb-3">
                {isRole('MANAGER', 'HR', 'ADMIN') ? 'All Regularization Requests' : 'My Requests'}
              </h3>
              {regularizations.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-sm bg-slate-50 rounded-xl">No requests yet</div>
              ) : (
                <div className="space-y-2">
                  {regularizations.map(r => (
                    <div key={r.id} className="bg-white border border-slate-200 rounded-xl px-5 py-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          {isRole('MANAGER', 'HR', 'ADMIN') && (
                            <div className="text-sm font-semibold text-slate-900 mb-0.5">
                              {r.user.firstName} {r.user.lastName} <span className="text-slate-400 font-normal">({r.user.employeeId})</span>
                            </div>
                          )}
                          <div className="text-sm text-slate-700">
                            <span className="font-semibold">{fmtDate(r.date)}</span> — {r.reason}
                          </div>
                          {(r.requestedCheckIn || r.requestedCheckOut) && (
                            <div className="text-xs text-slate-500 mt-0.5">
                              Requested: {fmt(r.requestedCheckIn)} → {fmt(r.requestedCheckOut)}
                            </div>
                          )}
                          {r.reviewNote && <div className="text-xs text-slate-400 mt-0.5 italic">{r.reviewNote}</div>}
                        </div>
                        <div className="flex flex-col items-end gap-2 shrink-0">
                          <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${REG_BADGE[r.status]}`}>{r.status}</span>
                          {isRole('MANAGER', 'HR', 'ADMIN') && r.status === 'PENDING' && (
                            <div className="flex gap-1.5">
                              <button onClick={() => handleRegAction(r.id, 'approve')}
                                className="text-xs bg-green-100 text-green-700 font-bold px-3 py-1 rounded-lg hover:bg-green-200 transition-colors">
                                Approve
                              </button>
                              <button onClick={() => handleRegAction(r.id, 'reject')}
                                className="text-xs bg-red-100 text-red-700 font-bold px-3 py-1 rounded-lg hover:bg-red-200 transition-colors">
                                Reject
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
