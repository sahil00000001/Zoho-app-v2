'use client';
import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { SectionLoader } from '@/components/Loader';

type Priority = 'HIGH' | 'NORMAL' | 'LOW';
type AnnType = 'COMPANY' | 'DEPARTMENT';

interface Announcement {
  id: string;
  title: string;
  content: string;
  type: AnnType;
  priority: Priority;
  departmentId?: string;
  expiresAt?: string;
  isPinned: boolean;
  createdAt: string;
  updatedAt: string;
  createdBy: { id: string; firstName: string; lastName: string; role: string };
}

interface Celebration {
  userId: string;
  firstName: string;
  lastName: string;
  employeeId: string;
  designation?: string;
  department?: string;
  photoUrl?: string;
  daysUntil: number;
  isToday: boolean;
  years?: number;
}

interface CelebrationsData {
  birthdays: Celebration[];
  anniversaries: Celebration[];
}

interface Department { id: string; name: string; }

const PRIORITY_CONFIG: Record<Priority, { label: string; color: string; bg: string; dot: string }> = {
  HIGH: { label: 'High', color: 'text-red-700', bg: 'bg-red-50 border-red-200', dot: 'bg-red-500' },
  NORMAL: { label: 'Normal', color: 'text-blue-700', bg: 'bg-blue-50 border-blue-200', dot: 'bg-blue-400' },
  LOW: { label: 'Low', color: 'text-gray-500', bg: 'bg-gray-50 border-gray-200', dot: 'bg-gray-400' },
};

function timeAgo(date: string) {
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  const hrs = Math.floor(mins / 60);
  const days = Math.floor(hrs / 24);
  if (days > 6) return new Date(date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  if (days > 0) return `${days}d ago`;
  if (hrs > 0) return `${hrs}h ago`;
  if (mins > 0) return `${mins}m ago`;
  return 'Just now';
}

function daysLabel(n: number) {
  if (n === 0) return 'Today 🎉';
  if (n === 1) return 'Tomorrow';
  return `In ${n} days`;
}

export default function AnnouncementsPage() {
  const { user, isRole } = useAuth();
  const [tab, setTab] = useState<'feed' | 'celebrations' | 'manage'>('feed');
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [celebrations, setCelebrations] = useState<CelebrationsData>({ birthdays: [], anniversaries: [] });
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Compose form
  const [showCompose, setShowCompose] = useState(false);
  const [editId, setEditId] = useState('');
  const [form, setForm] = useState({
    title: '', content: '', type: 'COMPANY' as AnnType,
    priority: 'NORMAL' as Priority, departmentId: '',
    expiresAt: '', isPinned: false,
  });
  const [saving, setSaving] = useState(false);

  const canManage = isRole('HR', 'ADMIN', 'MANAGER');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [ann, cel, depts] = await Promise.all([
        api.getAnnouncements() as Promise<Announcement[]>,
        api.getCelebrations() as Promise<CelebrationsData>,
        api.getDepartments() as Promise<Department[]>,
      ]);
      setAnnouncements(ann);
      setCelebrations(cel);
      setDepartments(depts);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  function showSuccessMsg(msg: string) {
    setSuccess(msg);
    setTimeout(() => setSuccess(''), 3000);
  }

  function resetForm() {
    setForm({ title: '', content: '', type: 'COMPANY', priority: 'NORMAL', departmentId: '', expiresAt: '', isPinned: false });
    setEditId('');
    setShowCompose(false);
  }

  function startEdit(ann: Announcement) {
    setForm({
      title: ann.title,
      content: ann.content,
      type: ann.type,
      priority: ann.priority,
      departmentId: ann.departmentId || '',
      expiresAt: ann.expiresAt ? ann.expiresAt.split('T')[0] : '',
      isPinned: ann.isPinned,
    });
    setEditId(ann.id);
    setShowCompose(true);
    setTab('manage');
  }

  async function handleSubmit() {
    if (!form.title.trim() || !form.content.trim()) return;
    setSaving(true);
    try {
      const payload = {
        ...form,
        departmentId: form.type === 'DEPARTMENT' ? form.departmentId : undefined,
        expiresAt: form.expiresAt || undefined,
      };
      if (editId) {
        await api.updateAnnouncement(editId, payload);
        showSuccessMsg('Announcement updated');
      } else {
        await api.createAnnouncement(payload);
        showSuccessMsg('Announcement posted');
      }
      resetForm();
      await load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this announcement?')) return;
    try {
      await api.deleteAnnouncement(id);
      await load();
      showSuccessMsg('Deleted');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed');
    }
  }

  async function togglePin(ann: Announcement) {
    try {
      await api.updateAnnouncement(ann.id, { isPinned: !ann.isPinned });
      await load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed');
    }
  }

  const pinnedAnn = announcements.filter(a => a.isPinned);
  const regularAnn = announcements.filter(a => !a.isPinned);
  const todayCelebrations = [
    ...celebrations.birthdays.filter(b => b.isToday),
    ...celebrations.anniversaries.filter(a => a.isToday),
  ];
  const totalCelebrations = celebrations.birthdays.length + celebrations.anniversaries.length;

  if (loading) {
    return <SectionLoader label="Loading announcements" />;
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Announcements</h1>
          <p className="text-gray-500 text-sm mt-1">Company notices, department updates, and celebrations</p>
        </div>
        {canManage && (
          <button
            onClick={() => { resetForm(); setShowCompose(true); setTab('manage'); }}
            className="shrink-0 px-4 py-2 rounded-xl text-sm font-semibold text-white shadow-sm"
            style={{ background: 'linear-gradient(90deg, rgb(220,38,38), rgb(249,115,22))' }}
          >
            + New Announcement
          </button>
        )}
      </div>

      {/* Alerts */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm flex justify-between">
          {error}<button onClick={() => setError('')} className="text-red-400">✕</button>
        </div>
      )}
      {success && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-xl text-green-700 text-sm flex justify-between">
          ✓ {success}<button onClick={() => setSuccess('')} className="text-green-400">✕</button>
        </div>
      )}

      {/* Today's celebrations banner */}
      {todayCelebrations.length > 0 && (
        <div className="mb-5 p-4 rounded-2xl border border-yellow-200 bg-gradient-to-r from-yellow-50 to-orange-50 flex items-center gap-3">
          <span className="text-2xl">🎉</span>
          <div>
            <div className="font-semibold text-yellow-800 text-sm">Celebrations Today!</div>
            <div className="text-yellow-700 text-xs mt-0.5">
              {todayCelebrations.map((c, i) => (
                <span key={c.userId}>
                  {i > 0 && ', '}
                  <strong>{c.firstName} {c.lastName}</strong>
                  {(c as { years?: number }).years ? ` — ${(c as { years?: number }).years} year anniversary 🏅` : ' — Birthday 🎂'}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 mb-5 bg-gray-100 p-1 rounded-xl w-fit">
        {[
          { id: 'feed', label: `📢 Feed${announcements.length > 0 ? ` (${announcements.length})` : ''}` },
          { id: 'celebrations', label: `🎉 Celebrations${totalCelebrations > 0 ? ` (${totalCelebrations})` : ''}` },
          ...(canManage ? [{ id: 'manage', label: '⚙️ Manage' }] : []),
        ].map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id as typeof tab)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              tab === t.id ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Feed Tab ──────────────────────────────────────────── */}
      {tab === 'feed' && (
        <div className="space-y-4">
          {/* Pinned */}
          {pinnedAnn.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-sm">📌</span>
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Pinned</span>
              </div>
              <div className="space-y-3">
                {pinnedAnn.map(ann => (
                  <AnnouncementCard key={ann.id} ann={ann} canManage={canManage} onEdit={startEdit} onDelete={handleDelete} onPin={togglePin} />
                ))}
              </div>
            </div>
          )}

          {/* Regular */}
          {regularAnn.length > 0 && (
            <div>
              {pinnedAnn.length > 0 && (
                <div className="flex items-center gap-2 mb-3 mt-4">
                  <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Recent</span>
                </div>
              )}
              <div className="space-y-3">
                {regularAnn.map(ann => (
                  <AnnouncementCard key={ann.id} ann={ann} canManage={canManage} onEdit={startEdit} onDelete={handleDelete} onPin={togglePin} />
                ))}
              </div>
            </div>
          )}

          {announcements.length === 0 && (
            <div className="text-center py-20 bg-white rounded-2xl border border-gray-100">
              <div className="text-5xl mb-3">📭</div>
              <p className="text-gray-500 font-medium">No announcements yet</p>
              <p className="text-gray-400 text-sm mt-1">Check back later for company updates</p>
            </div>
          )}
        </div>
      )}

      {/* ── Celebrations Tab ──────────────────────────────────── */}
      {tab === 'celebrations' && (
        <div className="space-y-6">
          {/* Birthdays */}
          <div>
            <h2 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
              🎂 Upcoming Birthdays
              <span className="text-xs font-normal text-gray-400">(next 7 days)</span>
            </h2>
            {celebrations.birthdays.length === 0 ? (
              <div className="bg-white border border-gray-100 rounded-2xl p-8 text-center text-gray-400 text-sm">
                No birthdays in the next 7 days
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {celebrations.birthdays.map(b => (
                  <CelebrationCard key={b.userId} person={b} type="birthday" />
                ))}
              </div>
            )}
          </div>

          {/* Work Anniversaries */}
          <div>
            <h2 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
              🏅 Work Anniversaries
              <span className="text-xs font-normal text-gray-400">(next 7 days)</span>
            </h2>
            {celebrations.anniversaries.length === 0 ? (
              <div className="bg-white border border-gray-100 rounded-2xl p-8 text-center text-gray-400 text-sm">
                No work anniversaries in the next 7 days
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {celebrations.anniversaries.map(a => (
                  <CelebrationCard key={a.userId} person={a} type="anniversary" />
                ))}
              </div>
            )}
          </div>

          {totalCelebrations === 0 && (
            <div className="text-center py-16 bg-white rounded-2xl border border-gray-100">
              <div className="text-5xl mb-3">🗓️</div>
              <p className="text-gray-500">No celebrations in the next 7 days</p>
            </div>
          )}
        </div>
      )}

      {/* ── Manage Tab (HR/Admin/Manager) ─────────────────────── */}
      {tab === 'manage' && canManage && (
        <div className="space-y-5">
          {/* Compose / Edit form */}
          {showCompose && (
            <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-5">
              <h2 className="font-semibold text-gray-800 mb-4">
                {editId ? 'Edit Announcement' : 'New Announcement'}
              </h2>
              <div className="space-y-4">
                <input
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-red-200"
                  placeholder="Announcement title *"
                  value={form.title}
                  onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
                />
                <textarea
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-200 resize-none"
                  placeholder="Write your announcement here... *"
                  rows={5}
                  value={form.content}
                  onChange={e => setForm(p => ({ ...p, content: e.target.value }))}
                />
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Audience</label>
                    <select
                      className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-200"
                      value={form.type}
                      onChange={e => setForm(p => ({ ...p, type: e.target.value as AnnType }))}
                    >
                      <option value="COMPANY">🌐 Company-wide</option>
                      <option value="DEPARTMENT">🏢 Department</option>
                    </select>
                  </div>
                  {form.type === 'DEPARTMENT' && (
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Department</label>
                      <select
                        className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-200"
                        value={form.departmentId}
                        onChange={e => setForm(p => ({ ...p, departmentId: e.target.value }))}
                      >
                        <option value="">Select department</option>
                        {departments.map(d => (
                          <option key={d.id} value={d.id}>{d.name}</option>
                        ))}
                      </select>
                    </div>
                  )}
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Priority</label>
                    <select
                      className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-200"
                      value={form.priority}
                      onChange={e => setForm(p => ({ ...p, priority: e.target.value as Priority }))}
                    >
                      <option value="LOW">🔵 Low</option>
                      <option value="NORMAL">🟡 Normal</option>
                      <option value="HIGH">🔴 High</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Expires On</label>
                    <input
                      type="date"
                      className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-200"
                      value={form.expiresAt}
                      onChange={e => setForm(p => ({ ...p, expiresAt: e.target.value }))}
                    />
                  </div>
                </div>
                <label className="flex items-center gap-2 cursor-pointer w-fit">
                  <input
                    type="checkbox"
                    checked={form.isPinned}
                    onChange={e => setForm(p => ({ ...p, isPinned: e.target.checked }))}
                    className="w-4 h-4 accent-red-500"
                  />
                  <span className="text-sm text-gray-700">📌 Pin this announcement</span>
                </label>
              </div>
              <div className="flex gap-2 mt-4">
                <button
                  onClick={handleSubmit}
                  disabled={saving || !form.title.trim() || !form.content.trim()}
                  className="px-5 py-2 rounded-xl text-sm font-semibold text-white disabled:opacity-50"
                  style={{ background: 'linear-gradient(90deg, rgb(220,38,38), rgb(249,115,22))' }}
                >
                  {saving ? 'Posting...' : editId ? 'Update' : 'Post Announcement'}
                </button>
                <button
                  onClick={resetForm}
                  className="px-5 py-2 rounded-xl text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {!showCompose && (
            <button
              onClick={() => { resetForm(); setShowCompose(true); }}
              className="w-full py-3 border-2 border-dashed border-gray-200 rounded-2xl text-sm text-gray-400 hover:border-red-300 hover:text-red-400 transition-colors"
            >
              + Post new announcement
            </button>
          )}

          {/* List all announcements for management */}
          <div className="space-y-3">
            {announcements.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-2xl border border-gray-100 text-gray-400 text-sm">
                No announcements posted yet
              </div>
            ) : (
              announcements.map(ann => (
                <AnnouncementCard
                  key={ann.id}
                  ann={ann}
                  canManage={true}
                  onEdit={startEdit}
                  onDelete={handleDelete}
                  onPin={togglePin}
                  showActions
                />
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Sub-components ─────────────────────────────────────────────

function AnnouncementCard({
  ann, canManage, onEdit, onDelete, onPin, showActions,
}: {
  ann: Announcement;
  canManage: boolean;
  onEdit: (a: Announcement) => void;
  onDelete: (id: string) => void;
  onPin: (a: Announcement) => void;
  showActions?: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const cfg = PRIORITY_CONFIG[ann.priority];
  const isExpired = ann.expiresAt && new Date(ann.expiresAt) < new Date();
  const shortContent = ann.content.length > 200;

  return (
    <div className={`bg-white border rounded-2xl shadow-sm overflow-hidden transition-all ${ann.isPinned ? 'border-yellow-200 ring-1 ring-yellow-100' : 'border-gray-100'} ${isExpired ? 'opacity-60' : ''}`}>
      {/* Priority stripe */}
      {ann.priority === 'HIGH' && (
        <div className="h-1 w-full" style={{ background: 'linear-gradient(90deg, rgb(220,38,38), rgb(249,115,22))' }} />
      )}
      <div className="p-5">
        <div className="flex items-start gap-3">
          <div className="flex-1 min-w-0">
            {/* Header */}
            <div className="flex items-center gap-2 flex-wrap mb-1">
              {ann.isPinned && <span className="text-sm">📌</span>}
              <h3 className="font-semibold text-gray-900 text-sm leading-snug">{ann.title}</h3>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium border ${cfg.bg} ${cfg.color}`}>
                {cfg.label}
              </span>
              <span className={`text-xs px-2 py-0.5 rounded-full ${ann.type === 'COMPANY' ? 'bg-blue-50 text-blue-600' : 'bg-purple-50 text-purple-600'}`}>
                {ann.type === 'COMPANY' ? '🌐 Company' : '🏢 Dept'}
              </span>
              {isExpired && <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-400">Expired</span>}
            </div>

            {/* Content */}
            <div className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap">
              {shortContent && !expanded ? ann.content.slice(0, 200) + '...' : ann.content}
            </div>
            {shortContent && (
              <button
                onClick={() => setExpanded(!expanded)}
                className="text-xs text-red-500 hover:text-red-700 mt-1 font-medium"
              >
                {expanded ? 'Show less' : 'Read more'}
              </button>
            )}

            {/* Footer */}
            <div className="flex items-center gap-3 mt-3 flex-wrap">
              <span className="text-xs text-gray-400">
                {ann.createdBy.firstName} {ann.createdBy.lastName}
              </span>
              <span className="text-gray-200">·</span>
              <span className="text-xs text-gray-400">{timeAgo(ann.createdAt)}</span>
              {ann.expiresAt && !isExpired && (
                <>
                  <span className="text-gray-200">·</span>
                  <span className="text-xs text-orange-400">
                    Expires {new Date(ann.expiresAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                  </span>
                </>
              )}
            </div>
          </div>

          {/* Actions */}
          {canManage && (
            <div className="flex items-center gap-1 shrink-0">
              <button
                onClick={() => onPin(ann)}
                className={`p-1.5 rounded-lg transition-colors text-sm ${ann.isPinned ? 'text-yellow-500 bg-yellow-50' : 'text-gray-300 hover:text-yellow-400 hover:bg-yellow-50'}`}
                title={ann.isPinned ? 'Unpin' : 'Pin'}
              >
                📌
              </button>
              <button
                onClick={() => onEdit(ann)}
                className="p-1.5 rounded-lg text-gray-300 hover:text-blue-400 hover:bg-blue-50 transition-colors text-sm"
                title="Edit"
              >
                ✏️
              </button>
              <button
                onClick={() => onDelete(ann.id)}
                className="p-1.5 rounded-lg text-gray-300 hover:text-red-400 hover:bg-red-50 transition-colors text-sm"
                title="Delete"
              >
                🗑️
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function CelebrationCard({ person, type }: { person: Celebration; type: 'birthday' | 'anniversary' }) {
  const initials = `${person.firstName[0]}${person.lastName[0]}`.toUpperCase();
  const isBirthday = type === 'birthday';

  return (
    <div className={`bg-white border rounded-2xl p-4 shadow-sm flex items-center gap-4 transition-all ${
      person.isToday
        ? isBirthday ? 'border-pink-200 ring-1 ring-pink-100' : 'border-yellow-200 ring-1 ring-yellow-100'
        : 'border-gray-100'
    }`}>
      {/* Avatar */}
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-sm shrink-0 overflow-hidden ${
        isBirthday ? 'bg-gradient-to-br from-pink-400 to-red-400' : 'bg-gradient-to-br from-yellow-400 to-orange-400'
      }`}>
        {person.photoUrl ? (
          <img src={person.photoUrl} alt={person.firstName} className="w-full h-full object-cover" />
        ) : initials}
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-semibold text-gray-900 text-sm">
          {person.firstName} {person.lastName}
          {person.isToday && <span className="ml-2">{isBirthday ? '🎂' : '🏅'}</span>}
        </div>
        <div className="text-xs text-gray-400 truncate">
          {person.designation || person.employeeId}
          {person.department && ` · ${person.department}`}
        </div>
        {type === 'anniversary' && person.years && (
          <div className="text-xs font-medium text-yellow-600 mt-0.5">
            {person.years} {person.years === 1 ? 'year' : 'years'} with the company
          </div>
        )}
      </div>
      <div className={`text-xs font-semibold px-2.5 py-1 rounded-full shrink-0 ${
        person.isToday
          ? isBirthday ? 'bg-pink-100 text-pink-700' : 'bg-yellow-100 text-yellow-700'
          : 'bg-gray-100 text-gray-500'
      }`}>
        {daysLabel(person.daysUntil)}
      </div>
    </div>
  );
}
