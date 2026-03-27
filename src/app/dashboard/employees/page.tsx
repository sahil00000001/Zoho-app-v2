"use client";
import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { api, CreateUserData } from "@/lib/api";

interface Employee {
  id: string;
  employeeId: string;
  email: string;
  firstName: string;
  lastName: string;
  role: "EMPLOYEE" | "MANAGER" | "HR" | "ADMIN";
  designation?: string;
  phoneNumber?: string;
  joiningDate?: string;
  isActive: boolean;
  managerId?: string;
  department?: { id: string; name: string };
  manager?: { id: string; firstName: string; lastName: string; employeeId: string };
}

interface Department {
  id: string;
  name: string;
}

const ROLE_BADGE: Record<string, string> = {
  EMPLOYEE: "bg-blue-100 text-blue-700",
  MANAGER:  "bg-green-100 text-green-700",
  HR:       "bg-purple-100 text-purple-700",
  ADMIN:    "bg-red-100 text-red-700",
};

const AVATAR_GRADIENTS = [
  "linear-gradient(135deg,#667eea,#764ba2)",
  "linear-gradient(135deg,#f093fb,#f5576c)",
  "linear-gradient(135deg,#4facfe,#00f2fe)",
  "linear-gradient(135deg,#43e97b,#38f9d7)",
  "linear-gradient(135deg,#fa709a,#fee140)",
  "linear-gradient(135deg,#a18cd1,#fbc2eb)",
  "linear-gradient(135deg,#fccb90,#d57eeb)",
  "linear-gradient(135deg,#e0c3fc,#8ec5fc)",
];

function avatarGradient(name: string) {
  return AVATAR_GRADIENTS[(name.charCodeAt(0) + (name.charCodeAt(1) || 0)) % AVATAR_GRADIENTS.length];
}

type ViewMode = "cards" | "table";

export default function EmployeesPage() {
  const { isRole } = useAuth();
  const isAdmin = isRole("ADMIN");
  const isHR = isRole("HR");
  const canManage = isAdmin;

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Filters
  const [search, setSearch] = useState("");
  const [filterDept, setFilterDept] = useState("");
  const [filterRole, setFilterRole] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>("cards");

  // Add employee modal
  const [showAdd, setShowAdd] = useState(false);
  const [addForm, setAddForm] = useState<CreateUserData>({ email: '', firstName: '', lastName: '', role: 'EMPLOYEE', designation: '', departmentId: '', phoneNumber: '' });
  const [addLoading, setAddLoading] = useState(false);
  const [addError, setAddError] = useState('');

  // Per-row manager edit state: { [employeeId]: selectedManagerId | "__editing__" }
  const [editingManager, setEditingManager] = useState<Record<string, string>>({});
  const [savingManager, setSavingManager] = useState<Record<string, boolean>>({});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [users, depts] = await Promise.all([
        api.getUsers({ isActive: "true" }) as Promise<Employee[]>,
        api.getDepartments() as Promise<Department[]>,
      ]);
      setEmployees(users);
      setDepartments(depts);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load employees");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  function showSuccess(msg: string) {
    setSuccess(msg);
    setTimeout(() => setSuccess(""), 3000);
  }

  async function saveManager(employeeId: string) {
    const newManagerId = editingManager[employeeId];
    if (!newManagerId) return;
    setSavingManager(s => ({ ...s, [employeeId]: true }));
    try {
      await api.assignManager(employeeId, newManagerId === "__none__" ? null : newManagerId);
      // Refresh list
      const users = await api.getUsers({ isActive: "true" }) as Employee[];
      setEmployees(users);
      setEditingManager(s => { const n = { ...s }; delete n[employeeId]; return n; });
      showSuccess("Manager updated");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to update manager");
    } finally {
      setSavingManager(s => { const n = { ...s }; delete n[employeeId]; return n; });
    }
  }

  function cancelEdit(employeeId: string) {
    setEditingManager(s => { const n = { ...s }; delete n[employeeId]; return n; });
  }

  async function handleAddEmployee(e: React.FormEvent) {
    e.preventDefault();
    setAddLoading(true);
    setAddError('');
    try {
      await api.createUser(addForm);
      showSuccess('Employee added! A welcome email has been sent to ' + addForm.email);
      setShowAdd(false);
      setAddForm({ email: '', firstName: '', lastName: '', role: 'EMPLOYEE', designation: '', departmentId: '', phoneNumber: '' });
      await load();
    } catch (err) {
      setAddError(err instanceof Error ? err.message : 'Failed to add employee');
    } finally {
      setAddLoading(false);
    }
  }

  // Filtered list
  const filtered = employees.filter(e => {
    const q = search.toLowerCase();
    const matchSearch = !q ||
      `${e.firstName} ${e.lastName}`.toLowerCase().includes(q) ||
      e.employeeId.toLowerCase().includes(q) ||
      (e.email || "").toLowerCase().includes(q) ||
      (e.designation || "").toLowerCase().includes(q);
    const matchDept = !filterDept || e.department?.id === filterDept;
    const matchRole = !filterRole || e.role === filterRole;
    return matchSearch && matchDept && matchRole;
  });

  const stats = {
    total: employees.length,
    employees: employees.filter(e => e.role === "EMPLOYEE").length,
    managers: employees.filter(e => e.role === "MANAGER").length,
    hr: employees.filter(e => e.role === "HR").length,
    admins: employees.filter(e => e.role === "ADMIN").length,
  };

  if (loading) return (
    <div className="flex justify-center items-center min-h-[60vh]">
      <div className="w-10 h-10 rounded-full border-2 border-red-500/20 border-t-red-500 animate-spin" />
    </div>
  );

  return (
    <div className="p-6 space-y-5">
      {/* Alerts */}
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm flex justify-between">
          <span>{error}</span>
          <button onClick={() => setError("")} className="text-red-400 hover:text-red-600">✕</button>
        </div>
      )}
      {success && (
        <div className="p-3 bg-green-50 border border-green-200 rounded-xl text-green-700 text-sm flex justify-between">
          <span>✓ {success}</span>
          <button onClick={() => setSuccess("")} className="text-green-400">✕</button>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[22px] font-bold text-slate-900">Employees</h1>
          <p className="text-slate-500 text-sm mt-0.5">{employees.length} team members across {departments.length} departments</p>
        </div>
        {canManage && (
          <button
            onClick={() => setShowAdd(true)}
            className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-bold text-white rounded-xl shadow-lg shadow-red-500/20 hover:opacity-90 transition-all active:scale-95"
            style={{ background: 'linear-gradient(135deg, rgb(220,38,38), rgb(249,115,22))' }}
          >
            + Add Employee
          </button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {[
          { label: "Total", value: stats.total, color: "border-slate-200 bg-white", valColor: "text-slate-900" },
          { label: "Employees", value: stats.employees, color: "border-blue-100 bg-blue-50", valColor: "text-blue-700" },
          { label: "Managers", value: stats.managers, color: "border-green-100 bg-green-50", valColor: "text-green-700" },
          { label: "HR", value: stats.hr, color: "border-purple-100 bg-purple-50", valColor: "text-purple-700" },
          { label: "Admins", value: stats.admins, color: "border-red-100 bg-red-50", valColor: "text-red-700" },
        ].map(s => (
          <div key={s.label} className={`rounded-xl border p-4 text-center ${s.color}`}>
            <div className={`text-2xl font-bold ${s.valColor}`}>{s.value}</div>
            <div className="text-xs text-slate-500 mt-0.5 font-medium uppercase tracking-wide">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4">
        <div className="flex flex-wrap items-center gap-3">
          {/* Search */}
          <div className="relative flex-1 min-w-48">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">🔍</span>
            <input
              type="text"
              placeholder="Search by name, ID, email, designation…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-200"
            />
          </div>

          {/* Department filter */}
          <select
            value={filterDept}
            onChange={e => setFilterDept(e.target.value)}
            className="border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-200 bg-white"
          >
            <option value="">All Departments</option>
            {departments.map(d => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>

          {/* Role filter */}
          <select
            value={filterRole}
            onChange={e => setFilterRole(e.target.value)}
            className="border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-200 bg-white"
          >
            <option value="">All Roles</option>
            {["EMPLOYEE", "MANAGER", "HR", "ADMIN"].map(r => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>

          {/* View toggle */}
          <div className="flex rounded-xl overflow-hidden border border-slate-200 ml-auto">
            <button
              onClick={() => setViewMode("cards")}
              className={`px-3 py-2 text-xs font-semibold transition-colors ${viewMode === "cards" ? "bg-red-500 text-white" : "bg-white text-gray-600 hover:bg-slate-50"}`}
            >
              ⊞ Cards
            </button>
            <button
              onClick={() => setViewMode("table")}
              className={`px-3 py-2 text-xs font-semibold transition-colors ${viewMode === "table" ? "bg-red-500 text-white" : "bg-white text-gray-600 hover:bg-slate-50"}`}
            >
              ≡ Table
            </button>
          </div>
        </div>
        <div className="mt-2 text-xs text-gray-400">
          Showing {filtered.length} of {employees.length} employees
          {(isAdmin || isHR) && <span className="ml-2 text-orange-500 font-medium">• Manager assignment available</span>}
        </div>
      </div>

      {filtered.length === 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-gray-400">
          <div className="text-4xl mb-2">👥</div>
          <div className="text-sm">No employees match your search</div>
        </div>
      )}

      {/* Cards View */}
      {viewMode === "cards" && filtered.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map(emp => {
            const fullName = `${emp.firstName} ${emp.lastName}`;
            const isEditing = emp.id in editingManager;
            const isSaving = savingManager[emp.id];
            return (
              <div key={emp.id} className="bg-white rounded-2xl border border-slate-200 overflow-hidden hover:shadow-md transition-shadow">
                {/* Card top gradient strip */}
                <div className="h-2 w-full" style={{ background: avatarGradient(fullName) }} />
                <div className="p-5">
                  {/* Avatar + name */}
                  <div className="flex items-start gap-3 mb-4">
                    <div
                      className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-sm shrink-0"
                      style={{ background: avatarGradient(fullName) }}
                    >
                      {emp.firstName[0]}{emp.lastName[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-gray-900 text-sm leading-tight truncate">{fullName}</div>
                      <div className="text-xs text-gray-400 mt-0.5">{emp.employeeId}</div>
                      <span className={`inline-block text-xs font-semibold px-2 py-0.5 rounded-full mt-1 ${ROLE_BADGE[emp.role]}`}>
                        {emp.role}
                      </span>
                    </div>
                  </div>

                  {/* Details */}
                  <div className="space-y-1.5 mb-4">
                    {emp.designation && (
                      <div className="flex items-center gap-1.5 text-xs text-gray-500">
                        <span className="text-gray-300">💼</span>
                        <span className="truncate">{emp.designation}</span>
                      </div>
                    )}
                    {emp.department && (
                      <div className="flex items-center gap-1.5 text-xs text-gray-500">
                        <span className="text-gray-300">🏢</span>
                        <span className="truncate">{emp.department.name}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-1.5 text-xs text-gray-500">
                      <span className="text-gray-300">✉️</span>
                      <span className="truncate">{emp.email}</span>
                    </div>
                    {emp.joiningDate && (
                      <div className="flex items-center gap-1.5 text-xs text-gray-500">
                        <span className="text-gray-300">📅</span>
                        <span>{new Date(emp.joiningDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</span>
                      </div>
                    )}
                  </div>

                  {/* Manager section */}
                  <div className="pt-3 border-t border-slate-200">
                    <div className="text-xs text-gray-400 mb-1.5 font-medium uppercase tracking-wide">Manager</div>
                    {isEditing ? (
                      <div className="space-y-2">
                        <select
                          value={editingManager[emp.id]}
                          onChange={e => setEditingManager(s => ({ ...s, [emp.id]: e.target.value }))}
                          className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-red-200 bg-white"
                          autoFocus
                        >
                          <option value="__none__">— No manager —</option>
                          {employees
                            .filter(m => m.id !== emp.id)
                            .map(m => (
                              <option key={m.id} value={m.id}>
                                {m.firstName} {m.lastName} ({m.employeeId})
                              </option>
                            ))}
                        </select>
                        <div className="flex gap-2">
                          <button
                            onClick={() => saveManager(emp.id)}
                            disabled={isSaving}
                            className="flex-1 text-xs font-semibold text-white py-1.5 rounded-lg disabled:opacity-60 flex items-center justify-center gap-1"
                            style={{ background: "linear-gradient(90deg,rgb(220,38,38),rgb(249,115,22))" }}
                          >
                            {isSaving ? <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" /> : null}
                            Save
                          </button>
                          <button
                            onClick={() => cancelEdit(emp.id)}
                            disabled={isSaving}
                            className="flex-1 text-xs font-semibold text-gray-500 bg-slate-100 hover:bg-gray-200 py-1.5 rounded-lg transition-colors"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-medium text-gray-700 truncate">
                          {emp.manager ? `${emp.manager.firstName} ${emp.manager.lastName}` : <span className="text-gray-300 italic text-xs">Not assigned</span>}
                        </span>
                        {canManage && (
                          <button
                            onClick={() => setEditingManager(s => ({ ...s, [emp.id]: emp.manager?.id ?? "__none__" }))}
                            className="shrink-0 text-xs font-semibold text-red-500 hover:text-red-700 bg-red-50 hover:bg-red-100 px-2 py-1 rounded-lg transition-colors"
                          >
                            {emp.manager ? "Change" : "Assign"}
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Employee Modal */}
      {showAdd && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-900">Add New Employee</h3>
                <p className="text-xs text-slate-500 mt-0.5">A welcome email with login instructions will be sent automatically</p>
              </div>
              <button onClick={() => { setShowAdd(false); setAddError(''); }} className="text-gray-400 hover:text-gray-600 text-xl w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100">×</button>
            </div>
            <form onSubmit={handleAddEmployee} className="p-6 space-y-4">
              {addError && <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl">{addError}</div>}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">First Name *</label>
                  <input className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all" value={addForm.firstName} onChange={e => setAddForm(f => ({ ...f, firstName: e.target.value }))} required />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Last Name *</label>
                  <input className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all" value={addForm.lastName} onChange={e => setAddForm(f => ({ ...f, lastName: e.target.value }))} required />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Work Email *</label>
                <input type="email" className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all" value={addForm.email} onChange={e => setAddForm(f => ({ ...f, email: e.target.value }))} required />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Role *</label>
                  <select className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all" value={addForm.role} onChange={e => setAddForm(f => ({ ...f, role: e.target.value as CreateUserData['role'] }))}>
                    <option value="EMPLOYEE">Employee</option>
                    <option value="MANAGER">Manager</option>
                    <option value="HR">HR</option>
                    <option value="ADMIN">Admin</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Department</label>
                  <select className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all" value={addForm.departmentId || ''} onChange={e => setAddForm(f => ({ ...f, departmentId: e.target.value }))}>
                    <option value="">No Department</option>
                    {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Designation</label>
                  <input className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all" value={addForm.designation || ''} onChange={e => setAddForm(f => ({ ...f, designation: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Phone</label>
                  <input className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all" value={addForm.phoneNumber || ''} onChange={e => setAddForm(f => ({ ...f, phoneNumber: e.target.value }))} />
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => { setShowAdd(false); setAddError(''); }} className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-gray-600 hover:bg-slate-50 transition-colors">Cancel</button>
                <button type="submit" disabled={addLoading} className="flex-1 text-white font-bold py-2.5 rounded-xl text-sm disabled:opacity-70 flex items-center justify-center gap-2" style={{ background: 'linear-gradient(90deg, rgb(220,38,38), rgb(249,115,22))' }}>
                  {addLoading && <span className="w-4 h-4 rounded-full border-2 border-white/40 border-t-white animate-spin" />}
                  {addLoading ? 'Adding...' : '✉️ Add & Send Email'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Table View */}
      {viewMode === "table" && filtered.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Employee</th>
                  <th className="text-left px-4 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Department</th>
                  <th className="text-left px-4 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Role</th>
                  <th className="text-left px-4 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Joined</th>
                  <th className="text-left px-4 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Manager {canManage && <span className="text-orange-400 font-normal normal-case">(click to change)</span>}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map(emp => {
                  const fullName = `${emp.firstName} ${emp.lastName}`;
                  const isEditing = emp.id in editingManager;
                  const isSaving = savingManager[emp.id];
                  return (
                    <tr key={emp.id} className="hover:bg-slate-50/60 transition-colors">
                      {/* Employee */}
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div
                            className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-xs font-bold shrink-0"
                            style={{ background: avatarGradient(fullName) }}
                          >
                            {emp.firstName[0]}{emp.lastName[0]}
                          </div>
                          <div>
                            <div className="font-semibold text-gray-900">{fullName}</div>
                            <div className="text-xs text-gray-400">{emp.employeeId} · {emp.email}</div>
                            {emp.designation && <div className="text-xs text-gray-400">{emp.designation}</div>}
                          </div>
                        </div>
                      </td>
                      {/* Department */}
                      <td className="px-4 py-3.5 text-sm text-gray-600">
                        {emp.department?.name || <span className="text-gray-300">—</span>}
                      </td>
                      {/* Role */}
                      <td className="px-4 py-3.5">
                        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${ROLE_BADGE[emp.role]}`}>
                          {emp.role}
                        </span>
                      </td>
                      {/* Joined */}
                      <td className="px-4 py-3.5 text-sm text-gray-500">
                        {emp.joiningDate
                          ? new Date(emp.joiningDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
                          : <span className="text-gray-300">—</span>}
                      </td>
                      {/* Manager */}
                      <td className="px-4 py-3.5">
                        {isEditing ? (
                          <div className="flex items-center gap-2">
                            <select
                              value={editingManager[emp.id]}
                              onChange={e => setEditingManager(s => ({ ...s, [emp.id]: e.target.value }))}
                              className="border border-slate-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-red-200 bg-white"
                              autoFocus
                            >
                              <option value="__none__">— No manager —</option>
                              {employees
                                .filter(m => m.id !== emp.id)
                                .map(m => (
                                  <option key={m.id} value={m.id}>
                                    {m.firstName} {m.lastName} ({m.employeeId})
                                  </option>
                                ))}
                            </select>
                            <button
                              onClick={() => saveManager(emp.id)}
                              disabled={isSaving}
                              className="text-xs font-semibold text-white px-3 py-1.5 rounded-lg disabled:opacity-60 flex items-center gap-1"
                              style={{ background: "linear-gradient(90deg,rgb(220,38,38),rgb(249,115,22))" }}
                            >
                              {isSaving ? <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" /> : null}
                              Save
                            </button>
                            <button
                              onClick={() => cancelEdit(emp.id)}
                              disabled={isSaving}
                              className="text-xs text-gray-500 px-2 py-1.5 rounded-lg hover:bg-slate-100 transition-colors"
                            >
                              ✕
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-gray-700">
                              {emp.manager
                                ? `${emp.manager.firstName} ${emp.manager.lastName}`
                                : <span className="text-gray-300 italic text-xs">Not assigned</span>}
                            </span>
                            {canManage && (
                              <button
                                onClick={() => setEditingManager(s => ({ ...s, [emp.id]: emp.manager?.id ?? "__none__" }))}
                                className="text-xs font-semibold text-red-500 hover:text-red-700 bg-red-50 hover:bg-red-100 px-2 py-1 rounded-lg transition-colors opacity-0 group-hover:opacity-100 shrink-0"
                                style={{ opacity: 1 }}
                              >
                                {emp.manager ? "Change" : "Assign"}
                              </button>
                            )}
                          </div>
                        )}
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
  );
}
