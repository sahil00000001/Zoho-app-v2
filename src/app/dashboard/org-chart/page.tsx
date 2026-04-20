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
  MarkerType,
  BackgroundVariant,
  type Node,
  type Edge,
  type NodeProps,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Handle, Position } from '@xyflow/react';
import { api } from '@/lib/api';

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
  isHighlighted: boolean;
  isDimmed: boolean;
};

// ─── Constants ────────────────────────────────────────────────────────────────
const NODE_W = 240;
const NODE_H = 130;
const H_GAP  = 64;
const V_GAP  = 72;

const ROLE_CONFIG = {
  ADMIN:    { gradient: 'from-red-500 to-rose-600',         badge: 'bg-red-50 text-red-600 border border-red-100',          dot: '#ef4444', label: 'Admin'    },
  MANAGER:  { gradient: 'from-blue-500 to-indigo-600',      badge: 'bg-blue-50 text-blue-600 border border-blue-100',        dot: '#3b82f6', label: 'Manager'  },
  HR:       { gradient: 'from-emerald-500 to-teal-600',     badge: 'bg-emerald-50 text-emerald-600 border border-emerald-100', dot: '#10b981', label: 'HR'      },
  EMPLOYEE: { gradient: 'from-violet-500 to-purple-600',    badge: 'bg-violet-50 text-violet-600 border border-violet-100',  dot: '#8b5cf6', label: 'Employee' },
};

// ─── Tree Layout ──────────────────────────────────────────────────────────────
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
  const { user, isHighlighted, isDimmed } = data as OrgNodeData;
  const cfg = ROLE_CONFIG[user.role] ?? ROLE_CONFIG.EMPLOYEE;
  const initials = `${user.firstName[0] ?? ''}${user.lastName[0] ?? ''}`.toUpperCase();

  return (
    <div
      style={{ width: NODE_W, opacity: isDimmed ? 0.2 : 1 }}
      className={`
        relative bg-white rounded-2xl overflow-hidden cursor-pointer
        transition-all duration-200 select-none
        ${selected
          ? 'shadow-2xl ring-2 ring-indigo-400 ring-offset-2 -translate-y-0.5'
          : 'shadow-[0_2px_16px_rgba(0,0,0,0.08)] hover:shadow-[0_8px_32px_rgba(0,0,0,0.14)] hover:-translate-y-0.5'}
        ${isHighlighted ? 'ring-2 ring-amber-400 ring-offset-2 shadow-xl' : ''}
      `}
    >
      {/* Invisible handles — required for edges but hidden in view mode */}
      <Handle type="target" position={Position.Top}
        style={{ opacity: 0, pointerEvents: 'none', width: 1, height: 1 }} />
      <Handle type="source" position={Position.Bottom}
        style={{ opacity: 0, pointerEvents: 'none', width: 1, height: 1 }} />

      {/* Role-coloured top bar */}
      <div className={`h-[3px] bg-gradient-to-r ${cfg.gradient}`} />

      <div className="px-3.5 pt-3 pb-3">
        {/* Avatar + name */}
        <div className="flex items-center gap-3 mb-2.5">
          {user.profile?.photoUrl ? (
            <img src={user.profile.photoUrl} alt=""
              className="w-11 h-11 rounded-full object-cover border-2 border-slate-100 shrink-0" />
          ) : (
            <div className={`w-11 h-11 rounded-full bg-gradient-to-br ${cfg.gradient} flex items-center justify-center text-white font-bold text-sm shrink-0`}>
              {initials}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="font-bold text-[13px] text-slate-800 leading-snug truncate">
              {user.firstName} {user.lastName}
            </p>
            <p className="text-[11px] text-slate-400 truncate mt-0.5">
              {user.designation || user.email.split('@')[0]}
            </p>
          </div>
        </div>

        {/* Dept + role row */}
        <div className="flex items-center justify-between gap-1.5">
          <span className="text-[10px] px-2 py-[3px] rounded-md bg-slate-50 text-slate-500 border border-slate-100 truncate max-w-[130px]">
            {user.department?.name ?? 'No dept'}
          </span>
          <span className={`text-[10px] px-2 py-[3px] rounded-md font-semibold shrink-0 ${cfg.badge}`}>
            {cfg.label}
          </span>
        </div>

        {/* Subordinate count */}
        {user._count.subordinates > 0 && (
          <div className="mt-2 flex items-center gap-1 text-[10px] text-slate-400">
            <span>👥</span>
            <span>{user._count.subordinates} direct report{user._count.subordinates !== 1 ? 's' : ''}</span>
          </div>
        )}
      </div>
    </div>
  );
}

const nodeTypes = { orgNode: OrgNode };

const defaultEdgeOptions: Partial<Edge> = {
  type: 'smoothstep',
  markerEnd: { type: MarkerType.ArrowClosed, color: '#cbd5e1', width: 14, height: 14 },
  style: { stroke: '#cbd5e1', strokeWidth: 1.5 },
  deletable: false,
  selectable: false,
};

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function OrgChartPage() {
  const [users, setUsers] = useState<OrgUser[]>([]);
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, , ] = useEdgesState<Edge>([]);
  const [allEdges, setAllEdges] = useState<Edge[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedUser, setSelectedUser] = useState<OrgUser | null>(null);
  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState('');
  const [roleFilter, setRoleFilter] = useState('');

  // ── Build nodes & edges ────────────────────────────────────────────────────
  const buildGraph = useCallback((userList: OrgUser[]) => {
    const positions = computeLayout(userList);

    const newNodes: Node[] = userList.map(u => ({
      id: u.id,
      type: 'orgNode',
      position: positions.get(u.id) ?? { x: 0, y: 0 },
      draggable: false,
      selectable: true,
      data: { user: u, isHighlighted: false, isDimmed: false } as OrgNodeData,
    }));

    const newEdges: Edge[] = userList
      .filter(u => u.managerId)
      .map(u => ({
        id: `e-${u.managerId}-${u.id}`,
        source: u.managerId as string,
        target: u.id,
        ...defaultEdgeOptions,
      } as Edge));

    return { newNodes, newEdges };
  }, []);

  // ── Load ───────────────────────────────────────────────────────────────────
  const loadOrgChart = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const data = (await api.getOrgChart()) as OrgUser[];
      setUsers(data);
      const { newNodes, newEdges } = buildGraph(data);
      setNodes(newNodes);
      setAllEdges(newEdges);
    } catch {
      setError('Failed to load org chart. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [buildGraph, setNodes]);

  useEffect(() => { loadOrgChart(); }, [loadOrgChart]);

  // ── Re-layout ──────────────────────────────────────────────────────────────
  const reLayout = useCallback(() => {
    const positions = computeLayout(users);
    setNodes(nds => nds.map(n => ({
      ...n,
      position: positions.get(n.id) ?? n.position,
    })));
  }, [users, setNodes]);

  // ── Search & filter ────────────────────────────────────────────────────────
  const filteredNodes = useMemo(() => {
    const q = search.toLowerCase();
    return nodes.map(n => {
      const user = (n.data as OrgNodeData).user;
      const matchesSearch = !q ||
        `${user.firstName} ${user.lastName}`.toLowerCase().includes(q) ||
        (user.designation ?? '').toLowerCase().includes(q) ||
        user.employeeId.toLowerCase().includes(q);
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

  // ── Click node ─────────────────────────────────────────────────────────────
  const onNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
    setSelectedUser(users.find(u => u.id === node.id) ?? null);
  }, [users]);

  // ── Departments ────────────────────────────────────────────────────────────
  const departments = useMemo(() => {
    const map = new Map<string, string>();
    for (const u of users) {
      if (u.department) map.set(u.department.id, u.department.name);
    }
    return Array.from(map.entries()).sort((a, b) => a[1].localeCompare(b[1]));
  }, [users]);

  // ── Selected user's manager ────────────────────────────────────────────────
  const selectedUserManager = useMemo(() => {
    if (!selectedUser?.managerId) return null;
    return users.find(u => u.id === selectedUser.managerId) ?? null;
  }, [selectedUser, users]);

  // ── Stats ──────────────────────────────────────────────────────────────────
  const stats = useMemo(() => ({
    total: users.length,
    managers: users.filter(u => u.role === 'MANAGER').length,
    hr: users.filter(u => u.role === 'HR').length,
    depts: departments.length,
  }), [users, departments]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full w-full gap-4">
        <div className="w-12 h-12 rounded-full border-4 border-slate-200 border-t-red-500 animate-spin" />
        <p className="text-slate-400 text-sm font-medium">Building org chart…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full w-full gap-4">
        <div className="text-4xl">⚠️</div>
        <p className="text-slate-600 font-semibold">{error}</p>
        <button onClick={loadOrgChart}
          className="px-4 py-2 rounded-xl text-sm font-semibold text-white"
          style={{ background: 'linear-gradient(135deg, #DC2626, #F97316)' }}>
          Try again
        </button>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full">
      <ReactFlow
        nodes={filteredNodes}
        edges={allEdges}
        nodeTypes={nodeTypes}
        defaultEdgeOptions={defaultEdgeOptions}
        onNodesChange={onNodesChange}
        onNodeClick={onNodeClick}
        onPaneClick={() => setSelectedUser(null)}
        fitView
        fitViewOptions={{ padding: 0.18 }}
        nodesDraggable={false}
        nodesConnectable={false}
        nodesFocusable={true}
        edgesFocusable={false}
        deleteKeyCode={null}
        minZoom={0.05}
        maxZoom={2}
        proOptions={{ hideAttribution: true }}
      >
        <Background variant={BackgroundVariant.Dots} gap={24} size={1} color="#e2e8f0" />

        <Controls
          showInteractive={false}
          className="!shadow-lg !rounded-xl !border !border-slate-200 !overflow-hidden"
        />

        <MiniMap
          nodeColor={n => ROLE_CONFIG[(n.data as OrgNodeData)?.user?.role as keyof typeof ROLE_CONFIG]?.dot ?? '#94a3b8'}
          className="!rounded-xl !border !border-slate-200 !shadow-lg"
          maskColor="rgba(241,245,249,0.75)"
          pannable
          zoomable
        />

        {/* ── Top toolbar ─────────────────────────────────────────────── */}
        <Panel position="top-center" className="w-full max-w-3xl px-4 pt-2">
          <div className="bg-white/95 backdrop-blur-sm border border-slate-200 rounded-2xl shadow-xl p-3 flex flex-wrap items-center gap-2">
            {/* Search */}
            <div className="relative flex-1 min-w-[160px]">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs">🔍</span>
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search by name, ID…"
                className="w-full pl-8 pr-3 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-red-300 bg-white" />
            </div>

            {/* Dept filter */}
            <select value={deptFilter} onChange={e => setDeptFilter(e.target.value)}
              className="text-sm rounded-xl border border-slate-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-300 bg-white text-slate-700">
              <option value="">All Departments</option>
              {departments.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
            </select>

            {/* Role filter */}
            <select value={roleFilter} onChange={e => setRoleFilter(e.target.value)}
              className="text-sm rounded-xl border border-slate-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-300 bg-white text-slate-700">
              <option value="">All Roles</option>
              <option value="ADMIN">Admin</option>
              <option value="MANAGER">Manager</option>
              <option value="HR">HR</option>
              <option value="EMPLOYEE">Employee</option>
            </select>

            {/* Re-layout */}
            <button onClick={reLayout}
              className="text-sm px-3 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 font-medium flex items-center gap-1.5 transition-colors">
              ↻ Reset layout
            </button>
          </div>
        </Panel>

        {/* ── Stats bar ───────────────────────────────────────────────── */}
        <Panel position="top-left" className="pl-4 pt-2">
          <div className="bg-white/95 backdrop-blur-sm border border-slate-200 rounded-xl shadow-lg px-4 py-2.5 flex items-center gap-4 text-xs">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-slate-400" />
              <span className="font-semibold text-slate-700">{stats.total}</span>
              <span className="text-slate-400">people</span>
            </div>
            <div className="w-px h-3 bg-slate-200" />
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-blue-500" />
              <span className="font-semibold text-slate-700">{stats.managers}</span>
              <span className="text-slate-400">managers</span>
            </div>
            <div className="w-px h-3 bg-slate-200" />
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span className="font-semibold text-slate-700">{stats.hr}</span>
              <span className="text-slate-400">HR</span>
            </div>
            <div className="w-px h-3 bg-slate-200" />
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-violet-500" />
              <span className="font-semibold text-slate-700">{stats.depts}</span>
              <span className="text-slate-400">depts</span>
            </div>
          </div>
        </Panel>

        {/* ── Legend ──────────────────────────────────────────────────── */}
        <Panel position="bottom-left">
          <div className="bg-white/95 backdrop-blur-sm border border-slate-200 rounded-xl shadow-lg px-3 py-2.5 space-y-1.5">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Legend</p>
            {Object.entries(ROLE_CONFIG).map(([role, cfg]) => (
              <div key={role} className="flex items-center gap-2">
                <div className={`w-5 h-[3px] rounded-full bg-gradient-to-r ${cfg.gradient}`} />
                <span className="text-xs text-slate-600">{cfg.label}</span>
              </div>
            ))}
          </div>
        </Panel>
      </ReactFlow>

      {/* ── Side panel (click a node to open) ───────────────────────────── */}
      {selectedUser && (
        <div className="absolute top-4 right-4 bottom-4 w-72 bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col z-20"
          style={{ animation: 'slideIn .18s ease-out' }}>

          {/* Gradient header */}
          <div className={`h-28 bg-gradient-to-br ${ROLE_CONFIG[selectedUser.role]?.gradient ?? 'from-slate-400 to-slate-600'} relative shrink-0`}>
            <button onClick={() => setSelectedUser(null)}
              className="absolute top-3 right-3 w-7 h-7 rounded-full bg-white/25 hover:bg-white/40 text-white flex items-center justify-center text-sm transition-colors">
              ✕
            </button>
            <div className="absolute -bottom-8 left-5">
              {selectedUser.profile?.photoUrl ? (
                <img src={selectedUser.profile.photoUrl}
                  className="w-16 h-16 rounded-full border-4 border-white object-cover shadow-lg" alt="" />
              ) : (
                <div className={`w-16 h-16 rounded-full border-4 border-white bg-gradient-to-br ${ROLE_CONFIG[selectedUser.role]?.gradient} flex items-center justify-center text-white font-bold text-xl shadow-lg`}>
                  {selectedUser.firstName[0]}{selectedUser.lastName[0]}
                </div>
              )}
            </div>
          </div>

          {/* Info */}
          <div className="pt-11 px-5 pb-5 flex-1 overflow-y-auto">
            <div className="mb-4">
              <h3 className="font-bold text-slate-800 text-base leading-snug">
                {selectedUser.firstName} {selectedUser.lastName}
              </h3>
              <p className="text-sm text-slate-500 mt-0.5">{selectedUser.designation ?? 'No designation'}</p>
              <span className={`mt-2 inline-flex text-[11px] px-2.5 py-1 rounded-full font-semibold ${ROLE_CONFIG[selectedUser.role]?.badge}`}>
                {ROLE_CONFIG[selectedUser.role]?.label}
              </span>
            </div>

            <div className="space-y-3">
              <InfoRow icon="🪪" label="Employee ID" value={selectedUser.employeeId} />
              <InfoRow icon="🏢" label="Department" value={selectedUser.department?.name ?? '—'} />
              <InfoRow icon="✉️" label="Email" value={selectedUser.email} small />
              <InfoRow
                icon="👤"
                label="Reports to"
                value={selectedUserManager
                  ? `${selectedUserManager.firstName} ${selectedUserManager.lastName}`
                  : '— (Top of hierarchy)'}
              />
              {selectedUser._count.subordinates > 0 && (
                <InfoRow icon="👥" label="Direct reports" value={`${selectedUser._count.subordinates}`} />
              )}
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes slideIn {
          from { opacity: 0; transform: translateX(16px); }
          to   { opacity: 1; transform: translateX(0); }
        }
      `}</style>
    </div>
  );
}

// ─── Helper ───────────────────────────────────────────────────────────────────
function InfoRow({ icon, label, value, small }: { icon: string; label: string; value: string; small?: boolean }) {
  return (
    <div className="flex items-start gap-2.5">
      <span className="text-base mt-0.5 shrink-0">{icon}</span>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] text-slate-400 uppercase tracking-wide mb-0.5">{label}</p>
        <p className={`font-semibold text-slate-700 ${small ? 'text-xs break-all' : 'text-sm truncate'}`}>{value}</p>
      </div>
    </div>
  );
}
