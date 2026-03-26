"use client";
import { useState, useEffect, useCallback } from "react";
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

const STATUS_COLORS: Record<string, string> = {
  PRESENT: 'bg-green-100 text-green-700',
  LATE: 'bg-yellow-100 text-yellow-700',
  ABSENT: 'bg-red-100 text-red-400',
  HALF_DAY: 'bg-orange-100 text-orange-700',
};
const REG_COLORS: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-700',
  APPROVED: 'bg-green-100 text-green-700',
  REJECTED: 'bg-red-100 text-red-700',
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
    else setTodayErr('Could not load today's record');

    if (histRes.status === 'fulfilled') setHistory(histRes.value as AttendanceRecord[]);
    if (monRes.status === 'fulfilled') setMonthly(monRes.value as AttendanceRecord[]);
    else setCalErr('Could not load calendar data');
    if (regsRes.status === 'fulfilled') setRegularizations(regsRes.value as Regularization[]);

    setLoading(false);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { fetchInitialData(); }, [fetchInitialData]);

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
    if (dow === 0 || dow === 6) return 'bg-gray-100 text-gray-400';
    if (cellDate > today) return 'bg-white text-gray-300';
    if (!r) return 'bg-red-50 text-red-400';
    if (r.isWFH) return 'bg-blue-100 text-blue-700';
    return { PRESENT: 'bg-green-100 text-green-700', LATE: 'bg-yellow-100 text-yellow-700', HALF_DAY: 'bg-orange-100 text-orange-700', ABSENT: 'bg-red-100 text-red-400' }[r.status] ?? 'bg-gray-100 text-gray-500';
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

  const tabs: { key: Tab; label: string }[] = [
    { key: 'my', label: 'History' },
    { key: 'calendar', label: 'Calendar' },
    { key: 'team', label: 'Team' },
    { key: 'regularize', label: 'Regularize' },
  ];

  if (loading) return (
    <div className="flex justify-center py-12">
      <div className="w-8 h-8 rounded-full border-2 border-red-500/20 border-t-red-500 animate-spin" />
    </div>
  );

  return (
    <div className="space-y-6">
      {/* ── Today's Card ───────────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-gray-900">Today&apos;s Attendance</h3>
          <div className="flex items-center gap-3">
            {todayRecord?.isWFH && (
              <span className="text-xs font-semibold bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">🏠 WFH</span>
            )}
            {!todayRecord?.checkInTime && (
              <label className="flex items-center gap-2 cursor-pointer">
                <div onClick={() => setIsWFH(v => !v)}
                  className={`relative w-10 h-5 rounded-full transition-colors ${isWFH ? 'bg-blue-500' : 'bg-gray-200'}`}>
                  <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${isWFH ? 'translate-x-5' : 'translate-x-0.5'}`} />
                </div>
                <span className="text-sm text-gray-600 font-medium">Work from Home</span>
              </label>
            )}
            <button onClick={() => fetchInitialData()} title="Refresh"
              className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors text-sm">
              ↺
            </button>
          </div>
        </div>

        {(error || todayErr) && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl">
            {error || todayErr}
          </div>
        )}

        <div className="grid grid-cols-4 gap-3 mb-5">
          {[
            { label: 'Check In', value: fmt(todayRecord?.checkInTime ?? null) },
            { label: 'Check Out', value: fmt(todayRecord?.checkOutTime ?? null) },
            { label: 'Hours', value: todayRecord?.workHours ? `${todayRecord.workHours}h` : '—' },
            { label: 'Overtime', value: todayRecord?.overtimeHours ? `+${todayRecord.overtimeHours}h` : '—', highlight: !!todayRecord?.overtimeHours },
          ].map(({ label, value, highlight }) => (
            <div key={label} className="text-center p-3 bg-gray-50 rounded-xl">
              <div className="text-xs text-gray-500 mb-1">{label}</div>
              <div className={`font-bold text-sm ${highlight ? 'text-orange-600' : 'text-gray-900'}`}>{value}</div>
            </div>
          ))}
        </div>

        {todayRecord && (
          <div className="mb-4 space-y-2">
            <span className={`text-sm font-semibold px-3 py-1 rounded-full ${STATUS_COLORS[todayRecord.status]}`}>
              {todayRecord.status}
            </span>
            {todayRecord.checkInAddress && (
              <div className="flex items-start gap-2 text-xs text-gray-500 mt-2">
                <span>📍</span>
                <span><span className="font-medium text-gray-700">Check-in:</span> {todayRecord.checkInAddress}</span>
              </div>
            )}
            {todayRecord.checkOutAddress && (
              <div className="flex items-start gap-2 text-xs text-gray-500">
                <span>📍</span>
                <span><span className="font-medium text-gray-700">Check-out:</span> {todayRecord.checkOutAddress}</span>
              </div>
            )}
          </div>
        )}

        <div className="flex gap-3">
          {!todayRecord?.checkInTime && (
            <button onClick={handleCheckIn} disabled={actionLoading}
              className="text-white font-bold px-6 py-2.5 rounded-xl text-sm disabled:opacity-70 flex items-center gap-2"
              style={{ background: isWFH ? 'linear-gradient(90deg,#3b82f6,#2563eb)' : 'linear-gradient(90deg,rgb(220,38,38),rgb(249,115,22))', boxShadow: '0 4px 12px rgba(220,38,38,0.25)' }}>
              {actionLoading && <span className="w-4 h-4 rounded-full border-2 border-white/40 border-t-white animate-spin" />}
              {isWFH ? '🏠 Check In (WFH)' : 'Check In'}
            </button>
          )}
          {todayRecord?.checkInTime && !todayRecord?.checkOutTime && (
            <button onClick={handleCheckOut} disabled={actionLoading}
              className="text-white font-bold px-6 py-2.5 rounded-xl text-sm disabled:opacity-70 flex items-center gap-2"
              style={{ background: 'linear-gradient(90deg,rgb(100,100,100),rgb(60,60,60))' }}>
              {actionLoading && <span className="w-4 h-4 rounded-full border-2 border-white/40 border-t-white animate-spin" />}
              Check Out
            </button>
          )}
          {todayRecord?.checkOutTime && (
            <div className="text-sm text-gray-500 py-2.5">Work day complete ✓</div>
          )}
        </div>
      </div>

      {/* ── Tabs ──────────────────────────────────────────────────────────── */}
      <div className="flex gap-1 border-b border-gray-200">
        {tabs.map(t => (
          <button key={t.key} onClick={() => setActiveTab(t.key)}
            className={`px-4 py-2 text-sm font-semibold border-b-2 transition-colors ${activeTab === t.key ? 'border-red-500 text-red-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── History ───────────────────────────────────────────────────────── */}
      {activeTab === 'my' && (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          {history.length === 0 ? (
            <div className="p-8 text-center text-gray-500 text-sm">No attendance records yet</div>
          ) : history.map(r => (
            <div key={r.id} className="flex items-center gap-4 px-5 py-3.5 border-b border-gray-50 last:border-0">
              <div className="w-14 text-xs text-gray-500 shrink-0 font-medium">{fmtDate(r.date)}</div>
              <div className="flex-1 flex items-center gap-2 flex-wrap">
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${STATUS_COLORS[r.status]}`}>{r.status}</span>
                {r.isWFH && <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">🏠 WFH</span>}
                <span className="text-xs text-gray-500">{fmt(r.checkInTime)} → {fmt(r.checkOutTime)}</span>
                {r.workHours && <span className="text-xs text-gray-400">{r.workHours}h</span>}
                {r.overtimeHours && <span className="text-xs font-semibold text-orange-500">+{r.overtimeHours}h OT</span>}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Personal Monthly Calendar ──────────────────────────────────────── */}
      {activeTab === 'calendar' && (
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          {calErr && <div className="mb-4 bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl">{calErr}</div>}
          <div className="flex items-center justify-between mb-5">
            <button onClick={() => {
              const [y, m] = currentMonth.split('-').map(Number);
              const prev = new Date(y, m - 2, 1);
              setCurrentMonth(`${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, '0')}`);
            }} className="p-2 hover:bg-gray-100 rounded-lg text-gray-500">←</button>
            <h3 className="font-bold text-gray-900">
              {new Date(`${currentMonth}-01`).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </h3>
            <button onClick={() => {
              const [y, m] = currentMonth.split('-').map(Number);
              const next = new Date(y, m, 1);
              setCurrentMonth(`${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}`);
            }} className="p-2 hover:bg-gray-100 rounded-lg text-gray-500">→</button>
          </div>

          <div className="flex flex-wrap gap-3 mb-4 text-xs">
            {[['bg-green-100', 'Present'], ['bg-yellow-100', 'Late'], ['bg-blue-100', 'WFH'], ['bg-orange-100', 'Half Day'], ['bg-red-50', 'Absent'], ['bg-gray-100', 'Weekend']].map(([bg, label]) => (
              <div key={label} className="flex items-center gap-1.5">
                <div className={`w-3 h-3 rounded-sm ${bg}`} />
                <span className="text-gray-600">{label}</span>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1 text-xs font-semibold text-gray-400 mb-1">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
              <div key={d} className="text-center py-1">{d}</div>
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

      {/* ── Team Attendance (all employees) ───────────────────────────────── */}
      {activeTab === 'team' && (
        <div className="space-y-4">
          {/* Controls */}
          <div className="bg-white rounded-2xl border border-gray-100 p-4">
            <div className="flex flex-wrap items-center gap-3">
              {/* Date picker */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-gray-500">Date</span>
                <input type="date" value={teamDate} onChange={e => setTeamDate(e.target.value)}
                  max={todayStr()}
                  className="border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-400" />
              </div>

              {/* Status filter */}
              <div className="flex gap-1">
                {(['ALL', 'PRESENT', 'LATE', 'WFH', 'ABSENT'] as TeamFilter[]).map(f => (
                  <button key={f} onClick={() => setTeamFilter(f)}
                    className={`text-xs font-semibold px-2.5 py-1 rounded-lg transition-colors ${teamFilter === f ? 'bg-red-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                    {f}
                  </button>
                ))}
              </div>

              {/* Search */}
              <input type="text" placeholder="Search name, dept…" value={teamSearch} onChange={e => setTeamSearch(e.target.value)}
                className="flex-1 min-w-32 border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-400" />

              {/* View toggle */}
              <div className="flex rounded-lg overflow-hidden border border-gray-200 ml-auto">
                <button onClick={() => setTeamView('tiles')}
                  className={`px-3 py-1.5 text-xs font-semibold transition-colors ${teamView === 'tiles' ? 'bg-red-500 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}>
                  ⊞ Tiles
                </button>
                <button onClick={() => setTeamView('list')}
                  className={`px-3 py-1.5 text-xs font-semibold transition-colors ${teamView === 'list' ? 'bg-red-500 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}>
                  ≡ List
                </button>
              </div>
            </div>
          </div>

          {/* Stats chips */}
          {!teamLoading && teamData.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {[
                { label: 'Total', val: teamStats.total, color: 'bg-gray-100 text-gray-700' },
                { label: 'Present', val: teamStats.present, color: 'bg-green-100 text-green-700' },
                { label: 'Late', val: teamStats.late, color: 'bg-yellow-100 text-yellow-700' },
                { label: 'WFH', val: teamStats.wfh, color: 'bg-blue-100 text-blue-700' },
                { label: 'Absent', val: teamStats.absent, color: 'bg-red-100 text-red-600' },
              ].map(({ label, val, color }) => (
                <div key={label} className={`px-3 py-1 rounded-full text-xs font-semibold ${color}`}>
                  {label}: {val}
                </div>
              ))}
            </div>
          )}

          {/* Error */}
          {teamErr && <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl">{teamErr}</div>}

          {/* Loading */}
          {teamLoading && (
            <div className="flex justify-center py-10">
              <div className="w-8 h-8 rounded-full border-2 border-red-500/20 border-t-red-500 animate-spin" />
            </div>
          )}

          {/* Empty */}
          {!teamLoading && !teamErr && filteredTeam.length === 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 p-10 text-center text-gray-400 text-sm">
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
                const statusStyle = a
                  ? a.isWFH
                    ? 'bg-blue-100 text-blue-700'
                    : STATUS_COLORS[a.status] ?? 'bg-gray-100 text-gray-600'
                  : 'bg-red-100 text-red-500';
                return (
                  <div key={u.id} className="bg-white rounded-2xl border border-gray-100 p-4 flex flex-col items-center text-center gap-2 hover:shadow-md transition-shadow">
                    <div className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0"
                      style={{ background: avatarGradient(fullName) }}>
                      {u.firstName[0]}{u.lastName[0]}
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-gray-900 leading-tight">{fullName}</div>
                      <div className="text-xs text-gray-400">{u.employeeId}</div>
                      {u.department?.name && <div className="text-xs text-gray-400">{u.department.name}</div>}
                    </div>
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${statusStyle}`}>{statusKey}</span>
                    {a && (
                      <div className="text-xs text-gray-400 space-y-0.5">
                        <div>In: {fmt(a.checkInTime)}</div>
                        {a.checkOutTime && <div>Out: {fmt(a.checkOutTime)}</div>}
                        {a.workHours && <div className="font-medium text-gray-600">{a.workHours}h</div>}
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
            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
              {filteredTeam.map(entry => {
                const a = entry.attendance;
                const u = entry.user;
                const fullName = `${u.firstName} ${u.lastName}`;
                const statusKey = a ? (a.isWFH ? 'WFH' : a.status) : 'ABSENT';
                const statusStyle = a
                  ? a.isWFH
                    ? 'bg-blue-100 text-blue-700'
                    : STATUS_COLORS[a.status] ?? 'bg-gray-100 text-gray-600'
                  : 'bg-red-100 text-red-500';
                return (
                  <div key={u.id} className="flex items-center gap-4 px-5 py-3.5 border-b border-gray-50 last:border-0 hover:bg-gray-50/50">
                    <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
                      style={{ background: avatarGradient(fullName) }}>
                      {u.firstName[0]}{u.lastName[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold text-gray-900">{fullName}</div>
                      <div className="text-xs text-gray-400 truncate">
                        {u.employeeId}{u.department?.name ? ` · ${u.department.name}` : ''}
                        {u.designation ? ` · ${u.designation}` : ''}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="flex items-center justify-end gap-1.5 mb-0.5">
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${statusStyle}`}>{statusKey}</span>
                      </div>
                      {a ? (
                        <div className="text-xs text-gray-400">
                          {fmt(a.checkInTime)} → {fmt(a.checkOutTime)}
                          {a.workHours && <span className="ml-1 text-gray-600 font-medium">{a.workHours}h</span>}
                          {a.overtimeHours && <span className="ml-1 text-orange-500 font-semibold">+{a.overtimeHours}h OT</span>}
                        </div>
                      ) : (
                        <div className="text-xs text-gray-400">Not checked in</div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── Regularization ─────────────────────────────────────────────────── */}
      {activeTab === 'regularize' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            <h3 className="font-bold text-gray-900 mb-4">Request Attendance Correction</h3>
            {regSuccess && <div className="mb-4 bg-green-50 border border-green-200 text-green-700 text-sm px-4 py-3 rounded-xl">{regSuccess}</div>}
            {error && <div className="mb-4 bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl">{error}</div>}
            <form onSubmit={handleRegularize} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                  <input type="date" required value={regForm.date} onChange={e => setRegForm(f => ({ ...f, date: e.target.value }))}
                    max={new Date().toISOString().split('T')[0]}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-400" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Reason</label>
                  <input type="text" required placeholder="e.g. Forgot to check in" value={regForm.reason}
                    onChange={e => setRegForm(f => ({ ...f, reason: e.target.value }))}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-400" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Requested Check-in Time</label>
                  <input type="time" value={regForm.requestedCheckIn} onChange={e => setRegForm(f => ({ ...f, requestedCheckIn: e.target.value }))}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-400" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Requested Check-out Time</label>
                  <input type="time" value={regForm.requestedCheckOut} onChange={e => setRegForm(f => ({ ...f, requestedCheckOut: e.target.value }))}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-400" />
                </div>
              </div>
              <button type="submit" disabled={regLoading}
                className="text-white font-bold px-6 py-2.5 rounded-xl text-sm disabled:opacity-70"
                style={{ background: 'linear-gradient(90deg,rgb(220,38,38),rgb(249,115,22))' }}>
                {regLoading ? 'Submitting...' : 'Submit Request'}
              </button>
            </form>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100">
              <h3 className="font-bold text-gray-900">
                {isRole('MANAGER', 'HR', 'ADMIN') ? 'All Regularization Requests' : 'My Requests'}
              </h3>
            </div>
            {regularizations.length === 0 ? (
              <div className="p-8 text-center text-gray-500 text-sm">No requests yet</div>
            ) : regularizations.map(r => (
              <div key={r.id} className="px-5 py-4 border-b border-gray-50 last:border-0">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    {isRole('MANAGER', 'HR', 'ADMIN') && (
                      <div className="text-sm font-semibold text-gray-900 mb-0.5">
                        {r.user.firstName} {r.user.lastName} ({r.user.employeeId})
                      </div>
                    )}
                    <div className="text-sm text-gray-700">
                      <span className="font-medium">{fmtDate(r.date)}</span> — {r.reason}
                    </div>
                    {(r.requestedCheckIn || r.requestedCheckOut) && (
                      <div className="text-xs text-gray-500 mt-0.5">
                        Requested: {fmt(r.requestedCheckIn)} → {fmt(r.requestedCheckOut)}
                      </div>
                    )}
                    {r.reviewNote && <div className="text-xs text-gray-500 mt-0.5 italic">{r.reviewNote}</div>}
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${REG_COLORS[r.status]}`}>{r.status}</span>
                    {isRole('MANAGER', 'HR', 'ADMIN') && r.status === 'PENDING' && (
                      <div className="flex gap-1.5">
                        <button onClick={() => handleRegAction(r.id, 'approve')}
                          className="text-xs bg-green-100 text-green-700 font-semibold px-3 py-1 rounded-lg hover:bg-green-200">
                          Approve
                        </button>
                        <button onClick={() => handleRegAction(r.id, 'reject')}
                          className="text-xs bg-red-100 text-red-700 font-semibold px-3 py-1 rounded-lg hover:bg-red-200">
                          Reject
                        </button>
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
