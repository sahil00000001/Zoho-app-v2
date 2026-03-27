'use client';
import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';

type TaskStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'SKIPPED';
type ITStatus = 'PENDING' | 'IN_PROGRESS' | 'DONE' | 'BLOCKED';
type AssetStatus = 'AVAILABLE' | 'ASSIGNED' | 'UNDER_MAINTENANCE' | 'RETIRED';

interface OnboardingTask {
  id: string;
  title: string;
  description?: string;
  category: string;
  dueDay: number;
  status: TaskStatus;
  completedAt?: string;
  notes?: string;
  responsibleRole?: string;
}

interface ITProvision {
  id: string;
  item: string;
  status: ITStatus;
  notes?: string;
  completedAt?: string;
  user?: { id: string; firstName: string; lastName: string; employeeId: string };
}

interface Asset {
  id: string;
  type: string;
  name: string;
  serialNumber?: string;
  model?: string;
  status: AssetStatus;
  notes?: string;
  assignments?: Array<{
    id: string;
    user?: { id: string; firstName: string; lastName: string; employeeId: string };
    assignedAt: string;
    returnedAt?: string;
    condition?: string;
  }>;
}

interface AssetAssignment {
  id: string;
  asset: Asset;
  assignedAt: string;
  returnedAt?: string;
  condition?: string;
  notes?: string;
}

interface OnboardingData {
  tasks: OnboardingTask[];
  itProvisions: ITProvision[];
  assetAssignments: AssetAssignment[];
}

interface User {
  id: string;
  firstName: string;
  lastName: string;
  employeeId: string;
  role: string;
}

const TASK_STATUS_CONFIG: Record<TaskStatus, { label: string; color: string; bg: string }> = {
  PENDING: { label: 'Pending', color: 'text-yellow-700', bg: 'bg-yellow-50 border-yellow-200' },
  IN_PROGRESS: { label: 'In Progress', color: 'text-blue-700', bg: 'bg-blue-50 border-blue-200' },
  COMPLETED: { label: 'Completed', color: 'text-green-700', bg: 'bg-green-50 border-green-200' },
  SKIPPED: { label: 'Skipped', color: 'text-slate-500', bg: 'bg-gray-50 border-slate-200' },
};

const IT_STATUS_CONFIG: Record<ITStatus, { label: string; color: string; dot: string }> = {
  PENDING: { label: 'Pending', color: 'text-yellow-700 bg-yellow-50', dot: 'bg-yellow-400' },
  IN_PROGRESS: { label: 'In Progress', color: 'text-blue-700 bg-blue-50', dot: 'bg-blue-400' },
  DONE: { label: 'Done', color: 'text-green-700 bg-green-50', dot: 'bg-green-400' },
  BLOCKED: { label: 'Blocked', color: 'text-red-700 bg-red-50', dot: 'bg-red-400' },
};

const CATEGORY_COLORS: Record<string, string> = {
  HR: 'bg-purple-100 text-purple-700',
  IT: 'bg-blue-100 text-blue-700',
  Manager: 'bg-green-100 text-green-700',
  Finance: 'bg-orange-100 text-orange-700',
  General: 'bg-slate-100 text-gray-700',
};

const ASSET_TYPE_ICONS: Record<string, string> = {
  LAPTOP: '💻',
  ACCESS_CARD: '🪪',
  MONITOR: '🖥️',
  KEYBOARD: '⌨️',
  MOUSE: '🖱️',
  PHONE: '📱',
  OTHER: '📦',
};

export default function OnboardingPage() {
  const { user, isRole } = useAuth();
  const [tab, setTab] = useState<'checklist' | 'assets' | 'it'>('checklist');
  const [onboardingData, setOnboardingData] = useState<OnboardingData | null>(null);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [allITProvisions, setAllITProvisions] = useState<ITProvision[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedUserId, setSelectedUserId] = useState('');
  const [initLoading, setInitLoading] = useState(false);

  // Add task modal
  const [showAddTask, setShowAddTask] = useState(false);
  const [newTask, setNewTask] = useState({ title: '', description: '', category: 'General', dueDay: 1, responsibleRole: '' });

  // Add asset modal
  const [showAddAsset, setShowAddAsset] = useState(false);
  const [newAsset, setNewAsset] = useState({ type: 'LAPTOP', name: '', serialNumber: '', model: '', notes: '' });

  // Assign asset modal
  const [assignAssetId, setAssignAssetId] = useState('');
  const [assignUserId, setAssignUserId] = useState('');
  const [assignCondition, setAssignCondition] = useState('');

  const isHRAdmin = isRole('HR', 'ADMIN');
  const isManager = isRole('MANAGER');
  const canManage = isHRAdmin || isManager;

  const loadMyOnboarding = useCallback(async () => {
    try {
      const data = await api.getMyOnboarding() as OnboardingData;
      setOnboardingData(data);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed to load';
      setError(msg);
    }
  }, []);

  const loadUserOnboarding = useCallback(async (uid: string) => {
    try {
      const data = await api.getOnboarding(uid) as OnboardingData;
      setOnboardingData(data);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed to load';
      setError(msg);
    }
  }, []);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        if (canManage) {
          const [usersData, assetsData, itData] = await Promise.all([
            api.getUsers() as Promise<User[]>,
            api.listAssets() as Promise<Asset[]>,
            api.listITProvisions() as Promise<ITProvision[]>,
          ]);
          setUsers(usersData);
          setAssets(assetsData);
          setAllITProvisions(itData);
          // Load first user or self
          if (usersData.length > 0) {
            const uid = user?.id || usersData[0].id;
            setSelectedUserId(uid);
            await loadUserOnboarding(uid);
          }
        } else {
          await loadMyOnboarding();
        }
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : 'Failed to load';
        setError(msg);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [canManage, user?.id, loadMyOnboarding, loadUserOnboarding]);

  async function handleUserChange(uid: string) {
    setSelectedUserId(uid);
    setOnboardingData(null);
    await loadUserOnboarding(uid);
  }

  async function handleInitOnboarding() {
    if (!selectedUserId) return;
    setInitLoading(true);
    try {
      await api.initOnboarding(selectedUserId);
      await loadUserOnboarding(selectedUserId);
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Failed');
    } finally {
      setInitLoading(false);
    }
  }

  async function handleTaskStatus(id: string, status: TaskStatus) {
    try {
      await api.updateOnboardingTask(id, status);
      if (canManage && selectedUserId) await loadUserOnboarding(selectedUserId);
      else await loadMyOnboarding();
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Failed');
    }
  }

  async function handleAddTask() {
    if (!newTask.title) return;
    const uid = canManage ? selectedUserId : user?.id;
    if (!uid) return;
    try {
      await api.addOnboardingTask(uid, newTask);
      if (canManage) await loadUserOnboarding(uid);
      else await loadMyOnboarding();
      setShowAddTask(false);
      setNewTask({ title: '', description: '', category: 'General', dueDay: 1, responsibleRole: '' });
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Failed');
    }
  }

  async function handleDeleteTask(id: string) {
    if (!confirm('Delete this task?')) return;
    try {
      await api.deleteOnboardingTask(id);
      if (canManage && selectedUserId) await loadUserOnboarding(selectedUserId);
      else await loadMyOnboarding();
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Failed');
    }
  }

  async function handleAddAsset() {
    if (!newAsset.name) return;
    try {
      await api.addAsset(newAsset);
      const updated = await api.listAssets() as Asset[];
      setAssets(updated);
      setShowAddAsset(false);
      setNewAsset({ type: 'LAPTOP', name: '', serialNumber: '', model: '', notes: '' });
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Failed');
    }
  }

  async function handleAssignAsset() {
    if (!assignAssetId || !assignUserId) return;
    try {
      await api.assignAsset(assignAssetId, assignUserId, assignCondition);
      const updated = await api.listAssets() as Asset[];
      setAssets(updated);
      setAssignAssetId('');
      setAssignUserId('');
      setAssignCondition('');
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Failed');
    }
  }

  async function handleReturnAsset(assignmentId: string) {
    try {
      await api.returnAsset(assignmentId);
      const updated = await api.listAssets() as Asset[];
      setAssets(updated);
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Failed');
    }
  }

  async function handleITStatus(id: string, status: ITStatus) {
    try {
      await api.updateITProvision(id, status);
      const updated = await api.listITProvisions() as ITProvision[];
      setAllITProvisions(updated);
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Failed');
    }
  }

  const tasks = onboardingData?.tasks || [];
  const completedCount = tasks.filter(t => t.status === 'COMPLETED').length;
  const progress = tasks.length > 0 ? Math.round((completedCount / tasks.length) * 100) : 0;

  const tasksByDay = tasks.reduce<Record<number, OnboardingTask[]>>((acc, t) => {
    const key = t.dueDay;
    if (!acc[key]) acc[key] = [];
    acc[key].push(t);
    return acc;
  }, {});

  const dayGroups = [
    { label: 'Day 1', days: [1] },
    { label: 'Days 2–3', days: [2, 3] },
    { label: 'Week 1 (Days 4–7)', days: [4, 5, 6, 7] },
    { label: 'Week 2 (Days 8–14)', days: [8, 9, 10, 11, 12, 13, 14] },
    { label: 'Week 3–4 (Days 15–30)', days: Array.from({ length: 16 }, (_, i) => i + 15) },
  ];

  const getGroupTasks = (days: number[]) => tasks.filter(t => days.includes(t.dueDay));

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="w-10 h-10 border-2 border-red-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-slate-500 text-sm">Loading onboarding...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-[22px] font-bold text-slate-900">Onboarding</h1>
        <p className="text-slate-500 text-sm mt-0.5">New hire checklist, asset tracking, and IT provisioning</p>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError('')} className="text-red-400 hover:text-red-600 ml-4">✕</button>
        </div>
      )}

      {/* Employee selector (HR/Admin) */}
      {canManage && (
        <div className="mb-5 flex items-center gap-3 flex-wrap">
          <select
            className="border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-200 bg-white"
            value={selectedUserId}
            onChange={e => handleUserChange(e.target.value)}
          >
            <option value="">Select employee</option>
            {users.map(u => (
              <option key={u.id} value={u.id}>{u.firstName} {u.lastName} ({u.employeeId})</option>
            ))}
          </select>
          {selectedUserId && (!onboardingData || tasks.length === 0) && (
            <button
              onClick={handleInitOnboarding}
              disabled={initLoading}
              className="px-4 py-2 rounded-xl text-sm font-medium text-white transition-all disabled:opacity-60"
              style={{ background: 'linear-gradient(90deg, rgb(220,38,38), rgb(249,115,22))' }}
            >
              {initLoading ? 'Initializing...' : '🚀 Initialize Onboarding'}
            </button>
          )}
        </div>
      )}

      {/* Progress bar */}
      {tasks.length > 0 && (
        <div className="mb-6 bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <div>
              <span className="text-sm font-semibold text-gray-800">Overall Progress</span>
              <span className="ml-2 text-xs text-slate-400">{completedCount}/{tasks.length} tasks completed</span>
            </div>
            <span className="text-lg font-bold" style={{ color: 'rgb(220,38,38)' }}>{progress}%</span>
          </div>
          <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{ width: `${progress}%`, background: 'linear-gradient(90deg, rgb(220,38,38), rgb(249,115,22))' }}
            />
          </div>
          <div className="mt-3 grid grid-cols-4 gap-2">
            {(['PENDING', 'IN_PROGRESS', 'COMPLETED', 'SKIPPED'] as TaskStatus[]).map(s => {
              const count = tasks.filter(t => t.status === s).length;
              const cfg = TASK_STATUS_CONFIG[s];
              return (
                <div key={s} className={`text-center p-2 rounded-xl border ${cfg.bg}`}>
                  <div className={`text-lg font-bold ${cfg.color}`}>{count}</div>
                  <div className={`text-xs ${cfg.color}`}>{cfg.label}</div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 mb-5 bg-slate-100 p-1 rounded-xl w-fit">
        {[
          { id: 'checklist', label: '✅ Checklist' },
          { id: 'assets', label: '📦 Assets' },
          { id: 'it', label: '🖥️ IT Provisioning' },
        ].map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id as typeof tab)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              tab === t.id ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Checklist Tab ─────────────────────────────────────── */}
      {tab === 'checklist' && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-800">30-Day Onboarding Checklist</h2>
            {canManage && (
              <button
                onClick={() => setShowAddTask(true)}
                className="px-3 py-1.5 text-sm font-medium text-white rounded-xl transition-all"
                style={{ background: 'linear-gradient(90deg, rgb(220,38,38), rgb(249,115,22))' }}
              >
                + Add Task
              </button>
            )}
          </div>

          {tasks.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-2xl border border-slate-200">
              <div className="text-4xl mb-3">🚀</div>
              <p className="text-slate-500 text-sm">
                {canManage ? 'Select an employee and click "Initialize Onboarding" to begin.' : 'Your onboarding checklist has not been set up yet. Contact HR.'}
              </p>
            </div>
          ) : (
            <div className="space-y-5">
              {dayGroups.map(group => {
                const groupTasks = getGroupTasks(group.days);
                if (groupTasks.length === 0) return null;
                const groupDone = groupTasks.filter(t => t.status === 'COMPLETED').length;
                return (
                  <div key={group.label} className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                    <div className="px-4 py-3 border-b border-gray-50 flex items-center justify-between bg-gray-50/50">
                      <h3 className="font-semibold text-gray-800 text-sm">{group.label}</h3>
                      <span className="text-xs text-slate-400">{groupDone}/{groupTasks.length}</span>
                    </div>
                    <div className="divide-y divide-gray-50">
                      {groupTasks.map(task => {
                        const cfg = TASK_STATUS_CONFIG[task.status];
                        return (
                          <div key={task.id} className={`p-4 flex items-start gap-3 ${task.status === 'COMPLETED' ? 'opacity-70' : ''}`}>
                            {/* Checkbox */}
                            <button
                              onClick={() => handleTaskStatus(task.id, task.status === 'COMPLETED' ? 'PENDING' : 'COMPLETED')}
                              className={`mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${
                                task.status === 'COMPLETED'
                                  ? 'bg-green-500 border-green-500 text-white'
                                  : 'border-gray-300 hover:border-green-400'
                              }`}
                            >
                              {task.status === 'COMPLETED' && <span className="text-xs">✓</span>}
                            </button>

                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className={`text-sm font-medium ${task.status === 'COMPLETED' ? 'line-through text-slate-400' : 'text-gray-800'}`}>
                                  {task.title}
                                </span>
                                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${CATEGORY_COLORS[task.category] || 'bg-slate-100 text-gray-600'}`}>
                                  {task.category}
                                </span>
                                {task.responsibleRole && (
                                  <span className="text-xs text-slate-400">by {task.responsibleRole}</span>
                                )}
                              </div>
                              {task.description && (
                                <p className="text-xs text-slate-400 mt-0.5">{task.description}</p>
                              )}
                              {task.completedAt && (
                                <p className="text-xs text-green-500 mt-0.5">
                                  Completed {new Date(task.completedAt).toLocaleDateString()}
                                </p>
                              )}
                            </div>

                            <div className="flex items-center gap-1 shrink-0">
                              {/* Status dropdown */}
                              <select
                                value={task.status}
                                onChange={e => handleTaskStatus(task.id, e.target.value as TaskStatus)}
                                className={`text-xs px-2 py-1 rounded-lg border ${cfg.bg} ${cfg.color} focus:outline-none cursor-pointer`}
                              >
                                <option value="PENDING">Pending</option>
                                <option value="IN_PROGRESS">In Progress</option>
                                <option value="COMPLETED">Completed</option>
                                <option value="SKIPPED">Skipped</option>
                              </select>
                              {isHRAdmin && (
                                <button
                                  onClick={() => handleDeleteTask(task.id)}
                                  className="text-gray-300 hover:text-red-400 transition-colors p-1"
                                >
                                  ✕
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Add Task Modal */}
          {showAddTask && (
            <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
                <h3 className="font-bold text-slate-900 mb-4">Add Onboarding Task</h3>
                <div className="space-y-3">
                  <input
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-200"
                    placeholder="Task title *"
                    value={newTask.title}
                    onChange={e => setNewTask(p => ({ ...p, title: e.target.value }))}
                  />
                  <textarea
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-200 resize-none"
                    placeholder="Description (optional)"
                    rows={2}
                    value={newTask.description}
                    onChange={e => setNewTask(p => ({ ...p, description: e.target.value }))}
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-slate-500 mb-1">Category</label>
                      <select
                        className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-200"
                        value={newTask.category}
                        onChange={e => setNewTask(p => ({ ...p, category: e.target.value }))}
                      >
                        {['HR', 'IT', 'Manager', 'Finance', 'General'].map(c => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-slate-500 mb-1">Due Day (1–30)</label>
                      <input
                        type="number"
                        min={1}
                        max={30}
                        className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-200"
                        value={newTask.dueDay}
                        onChange={e => setNewTask(p => ({ ...p, dueDay: parseInt(e.target.value) || 1 }))}
                      />
                    </div>
                  </div>
                  <input
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-200"
                    placeholder="Responsible (e.g. HR, IT, MANAGER)"
                    value={newTask.responsibleRole}
                    onChange={e => setNewTask(p => ({ ...p, responsibleRole: e.target.value }))}
                  />
                </div>
                <div className="flex gap-2 mt-4">
                  <button
                    onClick={handleAddTask}
                    className="flex-1 py-2 rounded-xl text-sm font-medium text-white"
                    style={{ background: 'linear-gradient(90deg, rgb(220,38,38), rgb(249,115,22))' }}
                  >
                    Add Task
                  </button>
                  <button
                    onClick={() => setShowAddTask(false)}
                    className="flex-1 py-2 rounded-xl text-sm font-medium text-gray-600 bg-slate-100 hover:bg-gray-200"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Assets Tab ────────────────────────────────────────── */}
      {tab === 'assets' && (
        <div>
          {!canManage ? (
            // Employee view: my assigned assets
            <div>
              <h2 className="font-semibold text-gray-800 mb-4">My Assigned Assets</h2>
              {onboardingData?.assetAssignments.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-2xl border border-slate-200">
                  <div className="text-4xl mb-2">📦</div>
                  <p className="text-slate-400 text-sm">No assets assigned to you</p>
                </div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {(onboardingData?.assetAssignments || []).map(a => (
                    <div key={a.id} className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
                      <div className="flex items-start gap-3">
                        <span className="text-3xl">{ASSET_TYPE_ICONS[a.asset.type] || '📦'}</span>
                        <div>
                          <div className="font-semibold text-slate-900 text-sm">{a.asset.name}</div>
                          {a.asset.model && <div className="text-xs text-slate-400">{a.asset.model}</div>}
                          {a.asset.serialNumber && <div className="text-xs text-slate-400">S/N: {a.asset.serialNumber}</div>}
                          <div className="text-xs text-slate-400 mt-1">
                            Assigned {new Date(a.assignedAt).toLocaleDateString()}
                          </div>
                          {a.condition && <div className="text-xs text-slate-500 mt-0.5">Condition: {a.condition}</div>}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            // HR/Admin view: all assets
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold text-gray-800">Asset Registry</h2>
                <button
                  onClick={() => setShowAddAsset(true)}
                  className="px-3 py-1.5 text-sm font-medium text-white rounded-xl"
                  style={{ background: 'linear-gradient(90deg, rgb(220,38,38), rgb(249,115,22))' }}
                >
                  + Add Asset
                </button>
              </div>

              {/* Assign asset form */}
              <div className="mb-4 bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
                <h3 className="text-sm font-semibold text-gray-700 mb-3">Assign Asset to Employee</h3>
                <div className="flex gap-3 flex-wrap items-end">
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Asset</label>
                    <select
                      className="border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-200"
                      value={assignAssetId}
                      onChange={e => setAssignAssetId(e.target.value)}
                    >
                      <option value="">Select asset</option>
                      {assets.filter(a => a.status === 'AVAILABLE').map(a => (
                        <option key={a.id} value={a.id}>{ASSET_TYPE_ICONS[a.type]} {a.name} {a.serialNumber ? `(${a.serialNumber})` : ''}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Employee</label>
                    <select
                      className="border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-200"
                      value={assignUserId}
                      onChange={e => setAssignUserId(e.target.value)}
                    >
                      <option value="">Select employee</option>
                      {users.map(u => (
                        <option key={u.id} value={u.id}>{u.firstName} {u.lastName}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Condition</label>
                    <input
                      className="border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-200"
                      placeholder="e.g. New, Good"
                      value={assignCondition}
                      onChange={e => setAssignCondition(e.target.value)}
                    />
                  </div>
                  <button
                    onClick={handleAssignAsset}
                    disabled={!assignAssetId || !assignUserId}
                    className="px-4 py-2 text-sm font-medium text-white rounded-xl disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{ background: 'linear-gradient(90deg, rgb(220,38,38), rgb(249,115,22))' }}
                  >
                    Assign
                  </button>
                </div>
              </div>

              {/* Assets table */}
              <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-slate-200">
                    <tr>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500">Asset</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500">Serial / Model</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500">Status</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500">Assigned To</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {assets.length === 0 && (
                      <tr><td colSpan={5} className="text-center py-8 text-slate-400 text-sm">No assets registered</td></tr>
                    )}
                    {assets.map(asset => {
                      const currentAssignment = asset.assignments?.[0];
                      const statusColors: Record<AssetStatus, string> = {
                        AVAILABLE: 'bg-green-50 text-green-700',
                        ASSIGNED: 'bg-blue-50 text-blue-700',
                        UNDER_MAINTENANCE: 'bg-yellow-50 text-yellow-700',
                        RETIRED: 'bg-gray-50 text-slate-500',
                      };
                      return (
                        <tr key={asset.id} className="hover:bg-gray-50/50">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <span className="text-xl">{ASSET_TYPE_ICONS[asset.type] || '📦'}</span>
                              <div>
                                <div className="font-medium text-slate-900">{asset.name}</div>
                                <div className="text-xs text-slate-400 capitalize">{asset.type.replace('_', ' ')}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-slate-500">
                            {asset.serialNumber && <div className="text-xs">{asset.serialNumber}</div>}
                            {asset.model && <div className="text-xs text-slate-400">{asset.model}</div>}
                          </td>
                          <td className="px-4 py-3">
                            <span className={`text-xs px-2 py-1 rounded-full font-medium ${statusColors[asset.status]}`}>
                              {asset.status.replace('_', ' ')}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            {currentAssignment?.user ? (
                              <div className="text-xs">
                                <div className="font-medium text-gray-800">{currentAssignment.user.firstName} {currentAssignment.user.lastName}</div>
                                <div className="text-slate-400">{currentAssignment.user.employeeId}</div>
                              </div>
                            ) : (
                              <span className="text-gray-300 text-xs">—</span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            {asset.status === 'ASSIGNED' && currentAssignment && (
                              <button
                                onClick={() => handleReturnAsset(currentAssignment.id)}
                                className="text-xs px-2 py-1 bg-orange-50 text-orange-600 rounded-lg hover:bg-orange-100 transition-colors"
                              >
                                Return
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Add Asset Modal */}
              {showAddAsset && (
                <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
                  <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
                    <h3 className="font-bold text-slate-900 mb-4">Add New Asset</h3>
                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs text-slate-500 mb-1">Type</label>
                        <select
                          className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-200"
                          value={newAsset.type}
                          onChange={e => setNewAsset(p => ({ ...p, type: e.target.value }))}
                        >
                          {Object.keys(ASSET_TYPE_ICONS).map(t => (
                            <option key={t} value={t}>{ASSET_TYPE_ICONS[t]} {t.replace('_', ' ')}</option>
                          ))}
                        </select>
                      </div>
                      <input
                        className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-200"
                        placeholder="Asset name * (e.g. MacBook Pro 14)"
                        value={newAsset.name}
                        onChange={e => setNewAsset(p => ({ ...p, name: e.target.value }))}
                      />
                      <input
                        className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-200"
                        placeholder="Serial number"
                        value={newAsset.serialNumber}
                        onChange={e => setNewAsset(p => ({ ...p, serialNumber: e.target.value }))}
                      />
                      <input
                        className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-200"
                        placeholder="Model"
                        value={newAsset.model}
                        onChange={e => setNewAsset(p => ({ ...p, model: e.target.value }))}
                      />
                      <input
                        className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-200"
                        placeholder="Notes"
                        value={newAsset.notes}
                        onChange={e => setNewAsset(p => ({ ...p, notes: e.target.value }))}
                      />
                    </div>
                    <div className="flex gap-2 mt-4">
                      <button
                        onClick={handleAddAsset}
                        className="flex-1 py-2 rounded-xl text-sm font-medium text-white"
                        style={{ background: 'linear-gradient(90deg, rgb(220,38,38), rgb(249,115,22))' }}
                      >
                        Add Asset
                      </button>
                      <button
                        onClick={() => setShowAddAsset(false)}
                        className="flex-1 py-2 rounded-xl text-sm font-medium text-gray-600 bg-slate-100 hover:bg-gray-200"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── IT Provisioning Tab ───────────────────────────────── */}
      {tab === 'it' && (
        <div>
          <h2 className="font-semibold text-gray-800 mb-4">IT Provisioning Tracker</h2>

          {!canManage ? (
            // Employee: my IT provisions
            <div className="grid gap-3 sm:grid-cols-2">
              {(onboardingData?.itProvisions || []).length === 0 ? (
                <div className="col-span-2 text-center py-12 bg-white rounded-2xl border border-slate-200">
                  <div className="text-4xl mb-2">🖥️</div>
                  <p className="text-slate-400 text-sm">No IT provisioning items set up yet</p>
                </div>
              ) : (
                (onboardingData?.itProvisions || []).map((item: ITProvision) => {
                  const cfg = IT_STATUS_CONFIG[item.status];
                  return (
                    <div key={item.id} className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex items-center gap-3">
                      <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${cfg.dot}`} />
                      <div className="flex-1">
                        <div className="font-medium text-slate-900 text-sm">{item.item}</div>
                        {item.notes && <div className="text-xs text-slate-400 mt-0.5">{item.notes}</div>}
                        {item.completedAt && <div className="text-xs text-green-500 mt-0.5">Done {new Date(item.completedAt).toLocaleDateString()}</div>}
                      </div>
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${cfg.color}`}>{cfg.label}</span>
                    </div>
                  );
                })
              )}
            </div>
          ) : (
            // HR/Admin: all provisions with filters
            <div>
              {/* Summary stats */}
              <div className="grid grid-cols-4 gap-3 mb-5">
                {(['PENDING', 'IN_PROGRESS', 'DONE', 'BLOCKED'] as ITStatus[]).map(s => {
                  const count = allITProvisions.filter(p => p.status === s).length;
                  const cfg = IT_STATUS_CONFIG[s];
                  return (
                    <div key={s} className={`bg-white border rounded-2xl p-3 text-center ${cfg.color.includes('green') ? 'border-green-100' : cfg.color.includes('blue') ? 'border-blue-100' : cfg.color.includes('red') ? 'border-red-100' : 'border-yellow-100'}`}>
                      <div className={`text-2xl font-bold ${cfg.color}`}>{count}</div>
                      <div className={`text-xs font-medium ${cfg.color}`}>{cfg.label}</div>
                    </div>
                  );
                })}
              </div>

              <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-slate-200">
                    <tr>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500">Employee</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500">IT Item</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500">Status</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {allITProvisions.length === 0 && (
                      <tr><td colSpan={4} className="text-center py-8 text-slate-400 text-sm">No IT provision items</td></tr>
                    )}
                    {allITProvisions.map(item => {
                      const cfg = IT_STATUS_CONFIG[item.status];
                      return (
                        <tr key={item.id} className="hover:bg-gray-50/50">
                          <td className="px-4 py-3">
                            {item.user ? (
                              <div>
                                <div className="font-medium text-slate-900 text-sm">{item.user.firstName} {item.user.lastName}</div>
                                <div className="text-xs text-slate-400">{item.user.employeeId}</div>
                              </div>
                            ) : <span className="text-gray-300">—</span>}
                          </td>
                          <td className="px-4 py-3 font-medium text-gray-800">{item.item}</td>
                          <td className="px-4 py-3">
                            <span className={`text-xs px-2 py-1 rounded-full font-medium flex items-center gap-1 w-fit ${cfg.color}`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                              {cfg.label}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <select
                              value={item.status}
                              onChange={e => handleITStatus(item.id, e.target.value as ITStatus)}
                              className="text-xs border border-slate-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-red-200"
                            >
                              <option value="PENDING">Pending</option>
                              <option value="IN_PROGRESS">In Progress</option>
                              <option value="DONE">Done</option>
                              <option value="BLOCKED">Blocked</option>
                            </select>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
