"use client";
import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { api, User, CreateUserData } from "@/lib/api";

interface Department { id: string; name: string; }

export default function UsersPage() {
  const { isRole, loading: authLoading } = useAuth();
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');
  const [fetchError, setFetchError] = useState('');
  const [form, setForm] = useState<CreateUserData>({
    email: '', firstName: '', lastName: '', role: 'EMPLOYEE',
    designation: '', departmentId: '', phoneNumber: '',
  });

  useEffect(() => {
    if (!authLoading && !isRole('ADMIN')) {
      router.push('/dashboard');
    }
  }, [authLoading, isRole, router]);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setFetchError('');

    // Fetch independently so a departments failure doesn't block user list
    const [usersResult, deptsResult] = await Promise.allSettled([
      api.getUsers({ search: search || undefined, role: roleFilter || undefined }),
      api.getDepartments(),
    ]);

    if (usersResult.status === 'fulfilled') {
      setUsers(usersResult.value as User[]);
    } else {
      const msg = usersResult.reason instanceof Error ? usersResult.reason.message : 'Failed to load users';
      setFetchError(msg);
    }

    if (deptsResult.status === 'fulfilled') {
      setDepartments(deptsResult.value as Department[]);
    }
    // departments failure is silent — form will just have no options

    setLoading(false);
  }, [search, roleFilter]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setCreateError('');
    try {
      const user = await api.createUser(form);
      setUsers((prev) => [user as User, ...prev]);
      setShowCreate(false);
      setForm({ email: '', firstName: '', lastName: '', role: 'EMPLOYEE', designation: '', departmentId: '', phoneNumber: '' });
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : 'Failed to create user');
    } finally {
      setCreating(false);
    }
  };

  const handleDeactivate = async (id: string) => {
    if (!confirm('Deactivate this user?')) return;
    await api.deactivateUser(id);
    setUsers((prev) => prev.map((u) => u.id === id ? { ...u, isActive: false } : u));
  };

  const roleBadges: Record<string, string> = {
    EMPLOYEE: 'bg-blue-100 text-blue-700',
    MANAGER: 'bg-green-100 text-green-700',
    HR: 'bg-purple-100 text-purple-700',
    ADMIN: 'bg-red-100 text-red-700',
  };

  const inputClass = "w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all";

  if (authLoading) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-black text-gray-900">User Management</h2>
          <p className="text-sm text-gray-500 mt-0.5">{users.length} users</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="text-white font-bold px-5 py-2.5 rounded-xl text-sm transition-all"
          style={{ background: "linear-gradient(90deg, rgb(220,38,38), rgb(249,115,22))", boxShadow: "0 4px 12px rgba(220,38,38,0.25)" }}
        >
          + Add User
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <input
          type="text"
          placeholder="Search name, email, ID..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 w-64 transition-all"
        />
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all"
        >
          <option value="">All Roles</option>
          <option value="EMPLOYEE">Employee</option>
          <option value="MANAGER">Manager</option>
          <option value="HR">HR</option>
          <option value="ADMIN">Admin</option>
        </select>
      </div>

      {fetchError && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl flex items-center justify-between">
          <span>{fetchError}</span>
          <button onClick={fetchUsers} className="text-red-600 font-semibold hover:underline text-xs">Retry</button>
        </div>
      )}

      {/* Users table */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 rounded-full border-2 border-red-500/20 border-t-red-500 animate-spin" />
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left text-xs font-semibold text-gray-500 px-5 py-3">Employee</th>
                  <th className="text-left text-xs font-semibold text-gray-500 px-5 py-3">Role</th>
                  <th className="text-left text-xs font-semibold text-gray-500 px-5 py-3 hidden md:table-cell">Department</th>
                  <th className="text-left text-xs font-semibold text-gray-500 px-5 py-3 hidden lg:table-cell">Designation</th>
                  <th className="text-left text-xs font-semibold text-gray-500 px-5 py-3">Status</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody>
                {users.length === 0 && !loading && (
                  <tr><td colSpan={6} className="text-center py-10 text-sm text-gray-400">No users found</td></tr>
                )}
                {users.map((user) => (
                  <tr key={user.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50 transition-colors">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0" style={{ background: "linear-gradient(135deg, rgb(220,38,38), rgb(249,115,22))" }}>
                          {user.firstName[0]}{user.lastName[0]}
                        </div>
                        <div>
                          <div className="text-sm font-semibold text-gray-900">{user.firstName} {user.lastName}</div>
                          <div className="text-xs text-gray-400">{user.email} · {user.employeeId}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={`text-xs font-semibold px-2 py-1 rounded-full ${roleBadges[user.role]}`}>{user.role}</span>
                    </td>
                    <td className="px-5 py-3.5 hidden md:table-cell">
                      <span className="text-sm text-gray-600">{user.department?.name || '—'}</span>
                    </td>
                    <td className="px-5 py-3.5 hidden lg:table-cell">
                      <span className="text-sm text-gray-600">{user.designation || '—'}</span>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={`text-xs font-semibold px-2 py-1 rounded-full ${user.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                        {user.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      {user.isActive && (
                        <button
                          onClick={() => handleDeactivate(user.id)}
                          className="text-xs text-red-500 hover:text-red-700 font-medium transition-colors"
                        >
                          Deactivate
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Create user modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-black text-gray-900">Add New User</h3>
              <button onClick={() => { setShowCreate(false); setCreateError(''); }} className="text-gray-400 hover:text-gray-600 text-xl">×</button>
            </div>
            <form onSubmit={handleCreate} className="p-6 space-y-4">
              {createError && <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl">{createError}</div>}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">First Name *</label>
                  <input className={inputClass} value={form.firstName} onChange={(e) => setForm((f) => ({ ...f, firstName: e.target.value }))} required />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Last Name *</label>
                  <input className={inputClass} value={form.lastName} onChange={(e) => setForm((f) => ({ ...f, lastName: e.target.value }))} required />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Work Email *</label>
                <input type="email" className={inputClass} value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} required />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Role *</label>
                <select className={inputClass} value={form.role} onChange={(e) => setForm((f) => ({ ...f, role: e.target.value as CreateUserData['role'] }))}>
                  <option value="EMPLOYEE">Employee</option>
                  <option value="MANAGER">Manager</option>
                  <option value="HR">HR</option>
                  <option value="ADMIN">Admin</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Designation</label>
                <input className={inputClass} value={form.designation || ''} onChange={(e) => setForm((f) => ({ ...f, designation: e.target.value }))} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Department</label>
                <select className={inputClass} value={form.departmentId || ''} onChange={(e) => setForm((f) => ({ ...f, departmentId: e.target.value }))}>
                  <option value="">No Department</option>
                  {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Phone</label>
                <input className={inputClass} value={form.phoneNumber || ''} onChange={(e) => setForm((f) => ({ ...f, phoneNumber: e.target.value }))} />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowCreate(false)} className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors">Cancel</button>
                <button type="submit" disabled={creating} className="flex-1 text-white font-bold py-2.5 rounded-xl text-sm disabled:opacity-70 flex items-center justify-center gap-2" style={{ background: "linear-gradient(90deg, rgb(220,38,38), rgb(249,115,22))" }}>
                  {creating ? <span className="w-4 h-4 rounded-full border-2 border-white/40 border-t-white animate-spin" /> : null}
                  {creating ? 'Creating...' : 'Create User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
