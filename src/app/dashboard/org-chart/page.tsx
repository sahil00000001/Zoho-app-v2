'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  Panel,
  useNodesState,
  useEdgesState,
  addEdge,
  MarkerType,
  ConnectionLineType,
  ConnectionMode,
  BackgroundVariant,
  type Node,
  type Edge,
  type Connection,
  type OnConnect,
  type NodeProps,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Handle, Position } from '@xyflow/react';
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';

// ─── Types ────────────────────────────────────────────────────────────────────
type OrgUser = {
  id: string;
  employeeId: string;
  firstName: string;
  lastName: string;
  email: string;
  role: 'EMPLOYEE' | 'MANAGER' | 'HR' | 'ADMIN';
  designation: string | null;
  managerId: string | null;
  department: { id: string; name: string } | null;
  _count: { subordinates: number };
  profile: { photoUrl: string | null } | null;
};

type OrgNodeData = {
  user: OrgUser;
  isPending: boolean;
  isHighlighted: boolean;
  isDimmed: boolean;
};

// ─── Constants ────────────────────────────────────────────────────────────────
const NODE_W = 230;
const NODE_H = 120;
const H_GAP  = 60;
const V_GAP  = 80;

const ROLE_CONFIG = {
  ADMIN:    { gradient: 'from-red-500 to-rose-600',    badge: 'bg-red-100 text-red-700',    dot: '#ef4444', label: 'Admin'    },
  MANAGER:  { gradient: 'from-blue-500 to-indigo-600', badge: 'bg-blue-100 text-blue-700',  dot: '#3b82f6', label: 'Manager'  },
  HR:       { gradient: 'from-emerald-500 to-teal-600',badge: 'bg-emerald-100 text-emerald-700', dot: '#10b981', label: 'HR' },
  EMPLOYEE: { gradient: 'from-violet-500 to-purple-600',badge: 'bg-violet-100 text-violet-700', dot: '#8b5cf6', label: 'Employee'},
};

// ─── Tree Layout Algorithm ────────────────────────────────────────────────────
function computeLayout(users: OrgUser[]): Map<string, { x: number; y: number }> {
  const idSet = new Set(users.map(u => u.id));
  const childrenOf = new Map<string, string[]>();
  childrenOf.set('__root__', []);

  for (const u of users) {
    const parentId = u.managerId && idSet.has(u.managerId) ? u.managerId : '__root__';
    if (!childrenOf.has(parentId)) childrenOf.set(parentId, []);
    childrenOf.get(parentId)!.push(u.id);
    if (!childrenOf.has(u.id)) childrenOf.set(u.id, []);
  }

  const widthCache = new Map<string, number>();
  function subtreeW(id: string): number {
    if (widthCache.has(id)) return widthCache.get(id)!;
    const kids = childrenOf.get(id) ?? [];
    const w = kids.length === 0
      ? NODE_W
      : kids.reduce((sum, k, i) => sum + subtreeW(k) + (i > 0 ? H_GAP : 0), 0);
    widthCache.set(id, Math.max(NODE_W, w));
    return widthCache.get(id)!;
  }

  const positions = new Map<string, { x: number; y: number }>();
  const visited = new Set<string>();

  function layout(id: string, cx: number, y: number) {
    if (visited.has(id)) return;
    visited.add(id);
    positions.set(id, { x: cx - NODE_W / 2, y });
    const kids = childrenOf.get(id) ?? [];
    if (!kids.length) return;
    const total = kids.reduce((s, k, i) => s + subtreeW(k) + (i > 0 ? H_GAP : 0), 0);
    let x = cx - total / 2;
    for (const kid of kids) {
      const w = subtreeW(kid);
      layout(kid, x + w / 2, y + NODE_H + V_GAP);
      x += w + H_GAP;
    }
  }

  const roots = childrenOf.get('__root__') ?? [];
  let startX = 0;
  for (const root of roots) {
    const w = subtreeW(root);
    layout(root, startX + w / 2, 0);
    startX += w + H_GAP * 2;
  }

  return positions;
}

// ─── Custom Org Node ──────────────────────────────────────────────────────────
function OrgNode({ data, selected }: NodeProps) {
  const d = data as OrgNodeData;
  const { user, isPending, isHighlighted, isDimmed } = d;
  const cfg = ROLE_CONFIG[user.role] ?? ROLE_CONFIG.EMPLOYEE;
  const initials = `${user.firstName[0] ?? ''}${user.lastName[0] ?? ''}`.toUpperCase();

  return (
    <div
      style={{ width: NODE_W, opacity: isDimmed ? 0.35 : 1 }}
      className={`
        relative bg-white rounded-2xl overflow-hidden transition-all duration-200
        ${selected ? 'shadow-2xl ring-2 ring-indigo-400 ring-offset-2' : 'shadow-lg hover:shadow-xl'}
        ${isHighlighted ? 'ring-2 ring-amber-400 ring-offset-2' : ''}
        ${isPending ? 'ring-2 ring-orange-400 ring-offset-1' : ''}
      `}
    >
      {/* Top gradient bar */}
      <div className={`h-1.5 bg-gradient-to-r ${cfg.gradient}`} />

      {/* Target handle — top (incoming from manager) */}
      <Handle
        type="target"
        position={Position.Top}
        style={{ background: '#94a3b8', width: 10, height: 10, border: '2px solid white' }}
      />

      {/* Source handle — bottom (outgoing to subordinates) */}
      <Handle
        type="source"
        position={Position.Bottom}
        style={{ background: '#94a3b8', width: 10, height: 10, border: '2px solid white' }}
      />

      <div className="px-3 py-3">
        {/* Avatar + Name row */}
        <div className="flex items-center gap-2.5 mb-2.5">
          {user.profile?.photoUrl ? (
            <img
              src={user.profile.photoUrl}
              alt={user.firstName}
              className="w-10 h-10 rounded-full object-cover flex-shrink-0"
            />
          ) : (
            <div
              className={`w-10 h-10 rounded-full bg-gradient-to-br ${cfg.gradient} flex items-center justify-center text-white font-bold text-sm flex-shrink-0`}
            >
              {initials}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-slate-800 text-sm leading-tight truncate">
              {user.firstName} {user.lastName}
            </p>
            <p className="text-xs text-slate-400 truncate mt-0.5">
              {user.designation || user.employeeId}
            </p>
          </div>
          {isPending && (
            <span className="flex-shrink-0 w-2 h-2 rounded-full bg-orange-400" title="Unsaved change" />
          )}
        </div>

        {/* Badges row */}
        <div className="flex items-center justify-between gap-1">
          <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 truncate max-w-[110px]">
            {user.department?.name ?? 'No dept'}
          </span>
          <span className={`text-xs px-2 py-0.5 rounded-full ${cfg.badge} font-medium flex-shrink-0`}>
            {cfg.label}
          </span>
        </div>

        {/* Team count */}
        {user._count.subordinates > 0 && (
          <p className="mt-1.5 text-xs text-slate-400 flex items-center gap-1">
            <span>👥</span>
            {user._count.subordinates} direct report{user._count.subordinates !== 1 ? 's' : ''}
          </p>
        )}
      </div>
    </div>
  );
}

const nodeTypes = { orgNode: OrgNode };

const defaultEdgeOptions = {
  type: 'smoothstep',
  reconnectable: false,   // disabled — causes edge hijacking when creating new connections
  markerEnd: { type: MarkerType.ArrowClosed, color: '#94a3b8', width: 16, height: 16 },
  style: { stroke: '#cbd5e1', strokeWidth: 2 },
  deletable: true,
};

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function OrgChartPage() {
  const { isRole } = useAuth();
  const canEdit = isRole('MANAGER', 'HR', 'ADMIN');

  const [users, setUsers] = useState<OrgUser[]>([]);
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const [selectedUser, setSelectedUser] = useState<OrgUser | null>(null);
  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [pendingChanges, setPendingChanges] = useState<Map<string, string | null>>(new Map());

const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  // ── Build nodes & edges from users ──────────────────────────────────────────
  const buildGraph = useCallback((userList: OrgUser[], pending: Map<string, string | null> = new Map()) => {
    const positions = computeLayout(userList);

    const newNodes: Node[] = userList.map(u => ({
      id: u.id,
      type: 'orgNode',
      position: positions.get(u.id) ?? { x: 0, y: 0 },
      data: {
        user: u,
        isPending: pending.has(u.id),
        isHighlighted: false,
        isDimmed: false,
      } as OrgNodeData,
    }));

    const newEdges: Edge[] = userList
      .filter(u => {
        const mgrId = pending.has(u.id) ? pending.get(u.id) : u.managerId;
        return mgrId;
      })
      .map(u => {
        const mgrId = (pending.has(u.id) ? pending.get(u.id) : u.managerId) as string;
        return {
          id: `e-${mgrId}-${u.id}`,
          source: mgrId,
          target: u.id,
          ...defaultEdgeOptions,
        } as Edge;
      });

    return { newNodes, newEdges };
  }, []);

  // ── Load org chart ───────────────────────────────────────────────────────────
  const loadOrgChart = useCallback(async () => {
    setLoading(true);
    try {
      const data = (await api.getOrgChart()) as OrgUser[];
      setUsers(data);
      const { newNodes, newEdges } = buildGraph(data, new Map());
      setNodes(newNodes);
      setEdges(newEdges);
      setPendingChanges(new Map());
    } catch {
      showToast('Failed to load org chart', 'error');
    } finally {
      setLoading(false);
    }
  }, [buildGraph]);

  useEffect(() => { loadOrgChart(); }, [loadOrgChart]);

  // ── Re-layout ────────────────────────────────────────────────────────────────
  const reLayout = useCallback(() => {
    const positions = computeLayout(users);
    setNodes(nds => nds.map(n => ({
      ...n,
      position: positions.get(n.id) ?? n.position,
    })));
  }, [users]);

  // ── Handle new connection ────────────────────────────────────────────────────
  // Convention: user drags FROM the employee node TO the manager node.
  //   params.source = employee (who dragged), params.target = manager (dropped on)
  //   We store edge as { source: manager, target: employee } for correct top-down visual.
  //   We record: employee.managerId = manager
  const onConnect: OnConnect = useCallback((params: Connection) => {
    if (!canEdit) return;
    const { source, target } = params;
    if (!source || !target || source === target) return;

    const employeeId = source; // node dragged FROM = the subordinate
    const managerId  = target; // node dropped ON  = the manager

    setEdges(eds => {
      // Remove employee's existing manager edge (each person has at most 1 manager)
      const filtered = eds.filter(e => e.target !== employeeId);
      // Add edge: manager (source/top) → employee (target/bottom) — downward arrow ✓
      return addEdge({
        id: `e-${managerId}-${employeeId}`,
        source: managerId,
        target: employeeId,
        ...defaultEdgeOptions,
      }, filtered);
    });

    setPendingChanges(prev => {
      const next = new Map(prev);
      next.set(employeeId, managerId); // employee.managerId = manager
      return next;
    });

    setNodes(nds => nds.map(n =>
      n.id === employeeId ? { ...n, data: { ...n.data, isPending: true } } : n
    ));
  }, [canEdit]);

  // ── Handle edge delete ────────────────────────────────────────────────────────
  const onEdgesDelete = useCallback((deletedEdges: Edge[]) => {
    if (!canEdit) return;
    for (const edge of deletedEdges) {
      setPendingChanges(prev => {
        const next = new Map(prev);
        next.set(edge.target, null);
        return next;
      });
      setNodes(nds => nds.map(n =>
        n.id === edge.target ? { ...n, data: { ...n.data, isPending: true } } : n
      ));
    }
  }, [canEdit]);

  // ── Remove manager for selected user ─────────────────────────────────────────
  const removeManager = useCallback(() => {
    if (!selectedUser || !canEdit) return;
    setEdges(eds => eds.filter(e => e.target !== selectedUser.id));
    setPendingChanges(prev => {
      const next = new Map(prev);
      next.set(selectedUser.id, null);
      return next;
    });
    setNodes(nds => nds.map(n =>
      n.id === selectedUser.id ? { ...n, data: { ...n.data, isPending: true } } : n
    ));
  }, [selectedUser, canEdit]);

  // ── Save changes ──────────────────────────────────────────────────────────────
  const saveChanges = useCallback(async () => {
    if (!pendingChanges.size || saving) return;
    setSaving(true);
    try {
      const assignments = Array.from(pendingChanges.entries()).map(([userId, managerId]) => ({
        userId,
        managerId,
      }));
      await api.bulkAssignManagers(assignments);
      showToast(`Saved ${pendingChanges.size} change${pendingChanges.size > 1 ? 's' : ''}!`);
      // Reload to get fresh data
      await loadOrgChart();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to save changes', 'error');
    } finally {
      setSaving(false);
    }
  }, [pendingChanges, saving, loadOrgChart]);

  // ── Discard changes ───────────────────────────────────────────────────────────
  const discardChanges = useCallback(() => {
    const { newNodes, newEdges } = buildGraph(users, new Map());
    setNodes(newNodes);
    setEdges(newEdges);
    setPendingChanges(new Map());
    setSelectedUser(null);
  }, [users, buildGraph]);

  // ── Search & filter ───────────────────────────────────────────────────────────
  const filteredNodes = useMemo(() => {
    const q = search.toLowerCase();
    return nodes.map(n => {
      const user = (n.data as OrgNodeData).user;
      const matchesSearch = !q ||
        `${user.firstName} ${user.lastName}`.toLowerCase().includes(q) ||
        (user.designation ?? '').toLowerCase().includes(q) ||
        (user.employeeId ?? '').toLowerCase().includes(q);
      const matchesDept = !deptFilter || user.department?.id === deptFilter;
      const matchesRole = !roleFilter || user.role === roleFilter;
      const visible = matchesSearch && matchesDept && matchesRole;
      return {
        ...n,
        data: {
          ...n.data,
          isHighlighted: !!q && matchesSearch,
          isDimmed: !!(q || deptFilter || roleFilter) && !visible,
        },
      };
    });
  }, [nodes, search, deptFilter, roleFilter]);

  // ── Click node ────────────────────────────────────────────────────────────────
  const onNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
    const user = users.find(u => u.id === node.id) ?? null;
    setSelectedUser(user);
  }, [users]);

  // ── Pane click (deselect) ──────────────────────────────────────────────────────
  const onPaneClick = useCallback(() => {
    setSelectedUser(null);
  }, []);

  // ── Departments for filter ─────────────────────────────────────────────────────
  const departments = useMemo(() => {
    const map = new Map<string, string>();
    for (const u of users) {
      if (u.department) map.set(u.department.id, u.department.name);
    }
    return Array.from(map.entries()).sort((a, b) => a[1].localeCompare(b[1]));
  }, [users]);

  // ── Selected user's current manager ───────────────────────────────────────────
  const selectedUserManager = useMemo(() => {
    if (!selectedUser) return null;
    const managerId = pendingChanges.has(selectedUser.id)
      ? pendingChanges.get(selectedUser.id)
      : selectedUser.managerId;
    if (!managerId) return null;
    return users.find(u => u.id === managerId) ?? null;
  }, [selectedUser, users, pendingChanges]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full w-full">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-red-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-500">Building org chart…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full">
      {/* ── Toast ─────────────────────────────────────────────────── */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-5 py-3 rounded-xl shadow-xl text-sm font-medium text-white transition-all ${toast.type === 'success' ? 'bg-emerald-500' : 'bg-red-500'}`}>
          {toast.type === 'success' ? '✅' : '❌'} {toast.msg}
        </div>
      )}

      {/* ── ReactFlow canvas ──────────────────────────────────────── */}
      <ReactFlow
        nodes={filteredNodes}
        edges={edges}
        nodeTypes={nodeTypes}
        defaultEdgeOptions={defaultEdgeOptions}
        connectionMode={ConnectionMode.Loose}
        connectionLineType={ConnectionLineType.SmoothStep}
        connectionLineStyle={{ stroke: '#6366f1', strokeWidth: 2, strokeDasharray: '6 3' }}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={canEdit ? onConnect : undefined}
        onEdgesDelete={canEdit ? onEdgesDelete : undefined}
        onNodeClick={onNodeClick}
        onPaneClick={onPaneClick}
        fitView
        fitViewOptions={{ padding: 0.15 }}
        deleteKeyCode={canEdit ? ['Backspace', 'Delete'] : null}
        nodesDraggable
        nodesConnectable={canEdit}
        minZoom={0.08}
        maxZoom={2}
      >
        <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="#e2e8f0" />
        <Controls className="!shadow-lg !rounded-xl !border-0" />
        <MiniMap
          nodeColor={n => {
            const user = (n.data as OrgNodeData)?.user;
            return ROLE_CONFIG[user?.role as keyof typeof ROLE_CONFIG]?.dot ?? '#94a3b8';
          }}
          className="!rounded-xl !border !border-slate-200 !shadow-lg"
          maskColor="rgba(241,245,249,0.7)"
        />

        {/* ── Toolbar ───────────────────────────────────────────────── */}
        <Panel position="top-center" className="w-full max-w-4xl px-4">
          <div className="bg-white/95 backdrop-blur-sm border border-slate-200 rounded-2xl shadow-xl p-3 flex flex-wrap items-center gap-2">
            {/* Search */}
            <div className="relative flex-1 min-w-[160px]">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">🔍</span>
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search people…"
                className="w-full pl-8 pr-3 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-red-300"
              />
            </div>

            {/* Dept filter */}
            <select
              value={deptFilter}
              onChange={e => setDeptFilter(e.target.value)}
              className="text-sm rounded-xl border border-slate-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-300 bg-white"
            >
              <option value="">All Departments</option>
              {departments.map(([id, name]) => (
                <option key={id} value={id}>{name}</option>
              ))}
            </select>

            {/* Role filter */}
            <select
              value={roleFilter}
              onChange={e => setRoleFilter(e.target.value)}
              className="text-sm rounded-xl border border-slate-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-300 bg-white"
            >
              <option value="">All Roles</option>
              <option value="ADMIN">Admin</option>
              <option value="MANAGER">Manager</option>
              <option value="HR">HR</option>
              <option value="EMPLOYEE">Employee</option>
            </select>

            <div className="flex items-center gap-2 ml-auto">
              {/* Re-layout */}
              <button
                onClick={reLayout}
                className="text-sm px-3 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 font-medium flex items-center gap-1.5"
              >
                ↻ Re-layout
              </button>

              {/* Discard */}
              {pendingChanges.size > 0 && (
                <button
                  onClick={discardChanges}
                  className="text-sm px-3 py-2 rounded-xl border border-orange-200 text-orange-600 hover:bg-orange-50 font-medium"
                >
                  ✕ Discard
                </button>
              )}

              {/* Save */}
              <button
                onClick={saveChanges}
                disabled={!pendingChanges.size || saving}
                className={`text-sm px-4 py-2 rounded-xl font-semibold transition-all flex items-center gap-1.5
                  ${pendingChanges.size > 0 && !saving
                    ? 'bg-gradient-to-r from-red-500 to-orange-500 text-white shadow-md hover:shadow-lg hover:-translate-y-0.5'
                    : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                  }`}
              >
                {saving ? (
                  <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Saving…</>
                ) : pendingChanges.size > 0 ? (
                  <>💾 Save {pendingChanges.size} change{pendingChanges.size !== 1 ? 's' : ''}</>
                ) : (
                  <>✓ Saved</>
                )}
              </button>
            </div>
          </div>
        </Panel>

        {/* ── Legend ────────────────────────────────────────────────── */}
        <Panel position="bottom-left">
          <div className="bg-white/95 backdrop-blur-sm border border-slate-200 rounded-xl shadow-lg p-3 text-xs space-y-1.5">
            <p className="font-semibold text-slate-500 mb-2 uppercase tracking-wide text-[10px]">Legend</p>
            {Object.entries(ROLE_CONFIG).map(([role, cfg]) => (
              <div key={role} className="flex items-center gap-2">
                <div className={`w-2.5 h-2.5 rounded-full`} style={{ background: cfg.dot }} />
                <span className="text-slate-600">{cfg.label}</span>
              </div>
            ))}
          </div>
        </Panel>

        {/* ── Edit hint ─────────────────────────────────────────────── */}
        {canEdit && (
          <Panel position="bottom-center">
            <div className="bg-slate-800/80 backdrop-blur-sm text-white text-xs px-4 py-2 rounded-full shadow-lg flex items-center gap-3">
              <span>🔗 Drag <strong>employee → manager</strong> to set reporting line</span>
              <span className="opacity-50">|</span>
              <span>↔ Drag edge endpoint to reassign</span>
              <span className="opacity-50">|</span>
              <span>⌫ Select edge + Delete to remove</span>
            </div>
          </Panel>
        )}
      </ReactFlow>

      {/* ── Side Panel ────────────────────────────────────────────────── */}
      {selectedUser && (
        <div className="absolute top-4 right-4 bottom-4 w-72 bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col z-20 animate-fade-in-up">
          {/* Header gradient */}
          <div className={`h-24 bg-gradient-to-br ${ROLE_CONFIG[selectedUser.role]?.gradient ?? 'from-slate-400 to-slate-600'} relative`}>
            <button
              onClick={() => setSelectedUser(null)}
              className="absolute top-3 right-3 w-7 h-7 rounded-full bg-white/20 hover:bg-white/30 text-white flex items-center justify-center text-sm"
            >
              ✕
            </button>
            {/* Avatar */}
            <div className="absolute -bottom-7 left-4">
              {selectedUser.profile?.photoUrl ? (
                <img
                  src={selectedUser.profile.photoUrl}
                  className="w-14 h-14 rounded-full border-4 border-white object-cover"
                  alt=""
                />
              ) : (
                <div
                  className={`w-14 h-14 rounded-full border-4 border-white bg-gradient-to-br ${ROLE_CONFIG[selectedUser.role]?.gradient} flex items-center justify-center text-white font-bold text-lg`}
                >
                  {selectedUser.firstName[0]}{selectedUser.lastName[0]}
                </div>
              )}
            </div>
          </div>

          {/* Content */}
          <div className="pt-10 px-4 pb-4 flex-1 overflow-y-auto">
            <h3 className="font-bold text-slate-800 text-base">
              {selectedUser.firstName} {selectedUser.lastName}
            </h3>
            <p className="text-sm text-slate-500">{selectedUser.designation ?? 'No designation'}</p>
            <p className="text-xs text-slate-400 mt-0.5">{selectedUser.employeeId}</p>

            {/* Info grid */}
            <div className="mt-4 space-y-2.5">
              <InfoRow icon="🏢" label="Department" value={selectedUser.department?.name ?? '—'} />
              <InfoRow icon="🎭" label="Role" value={ROLE_CONFIG[selectedUser.role]?.label ?? selectedUser.role} />
              <InfoRow icon="✉️" label="Email" value={selectedUser.email} small />
              <InfoRow
                icon="👤"
                label="Reports to"
                value={selectedUserManager
                  ? `${selectedUserManager.firstName} ${selectedUserManager.lastName}`
                  : '— (Root)'}
              />
              {selectedUser._count.subordinates > 0 && (
                <InfoRow icon="👥" label="Direct reports" value={`${selectedUser._count.subordinates}`} />
              )}
            </div>

            {/* Pending badge */}
            {pendingChanges.has(selectedUser.id) && (
              <div className="mt-3 text-xs bg-orange-50 border border-orange-200 text-orange-600 rounded-lg px-3 py-2">
                ⚡ Unsaved change — click Save to persist
              </div>
            )}
          </div>

          {/* Actions */}
          {canEdit && (
            <div className="px-4 pb-4 space-y-2 border-t border-slate-100 pt-3">
              {selectedUser.managerId || pendingChanges.get(selectedUser.id) ? (
                <button
                  onClick={removeManager}
                  className="w-full text-sm px-3 py-2 rounded-xl border border-red-200 text-red-600 hover:bg-red-50 font-medium transition-colors"
                >
                  🔗 Remove Manager
                </button>
              ) : null}
              <button
                onClick={() => {
                  // Focus the node in view
                  setSearch(`${selectedUser.firstName} ${selectedUser.lastName}`);
                  setTimeout(() => setSearch(''), 2000);
                }}
                className="w-full text-sm px-3 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 font-medium transition-colors"
              >
                🔍 Highlight in Chart
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Helper components ────────────────────────────────────────────────────────
function InfoRow({ icon, label, value, small }: { icon: string; label: string; value: string; small?: boolean }) {
  return (
    <div className="flex items-start gap-2">
      <span className="text-sm mt-0.5">{icon}</span>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-slate-400">{label}</p>
        <p className={`font-medium text-slate-700 ${small ? 'text-xs break-all' : 'text-sm truncate'}`}>{value}</p>
      </div>
    </div>
  );
}
