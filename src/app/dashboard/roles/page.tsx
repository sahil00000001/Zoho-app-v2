"use client";
import { useEffect, useState, useCallback } from "react";
import { api, CustomRole, AppModule } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";

const BASE_LEVELS = [
  { value: "EMPLOYEE", label: "Employee", icon: "👤" },
  { value: "MANAGER",  label: "Manager",  icon: "👥" },
  { value: "HR",       label: "HR",       icon: "🏢" },
  { value: "ADMIN",    label: "Admin",    icon: "⚙️" },
];

const COLORS = [
  "#6366f1","#0ea5e9","#10b981","#f59e0b",
  "#ef4444","#8b5cf6","#ec4899","#14b8a6","#f97316","#dc2626",
];

export default function RolesPage() {
  const { isRole } = useAuth();
  const [roles, setRoles]     = useState<CustomRole[]>([]);
  const [modules, setModules] = useState<AppModule[]>([]);
  const [loading, setLoading] = useState(true);
  const [active, setActive]   = useState<CustomRole | null>(null);
  const [isNew, setIsNew]     = useState(false);
  const [saving, setSaving]   = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [toast, setToast]     = useState<{ msg: string; ok: boolean } | null>(null);

  const [form, setForm] = useState({
    name: "", description: "", basePermissionLevel: "EMPLOYEE",
    color: "#6366f1", moduleKeys: [] as string[],
  });

  const pop = (msg: string, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3000);
  };

  const load = useCallback(async () => {
    setLoading(true);
    const [mr, rr] = await Promise.allSettled([api.getModules(), api.getRoles()]);
    if (mr.status === "fulfilled") setModules(mr.value);
    if (rr.status === "fulfilled") {
      let r = rr.value;
      if (r.length === 0) {
        try { await api.seedRoles(); r = await api.getRoles(); } catch { /* ignore */ }
      }
      setRoles(r);
    } else {
      pop("Could not load roles", false);
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  function pick(role: CustomRole) {
    setIsNew(false);
    setActive(role);
    setForm({
      name: role.name,
      description: role.description ?? "",
      basePermissionLevel: role.basePermissionLevel,
      color: role.color,
      moduleKeys: role.modulePermissions.filter(p => p.canAccess).map(p => p.moduleKey),
    });
  }

  function startNew() {
    setActive(null);
    setIsNew(true);
    setForm({ name: "", description: "", basePermissionLevel: "EMPLOYEE", color: "#6366f1", moduleKeys: [] });
  }

  function toggle(key: string) {
    setForm(f => ({
      ...f,
      moduleKeys: f.moduleKeys.includes(key)
        ? f.moduleKeys.filter(k => k !== key)
        : [...f.moduleKeys, key],
    }));
  }

  async function save() {
    if (!form.name.trim()) return pop("Role name is required", false);
    if (!form.moduleKeys.length) return pop("Enable at least one module", false);
    setSaving(true);
    try {
      if (isNew) {
        await api.createRole(form);
        pop("Role created");
        const fresh = await api.getRoles();
        setRoles(fresh);
        const created = fresh.find(r => r.name === form.name);
        if (created) pick(created);
        setIsNew(false);
      } else if (active) {
        await api.updateRole(active.id, form);
        pop("Saved");
        const fresh = await api.getRoles();
        setRoles(fresh);
        const updated = fresh.find(r => r.id === active.id);
        if (updated) pick(updated);
      }
    } catch (e: unknown) {
      pop(e instanceof Error ? e.message : "Save failed", false);
    } finally { setSaving(false); }
  }

  async function del() {
    if (!active) return;
    setDeleting(false);
    try {
      await api.deleteRole(active.id);
      pop("Role deleted");
      setActive(null);
      setIsNew(false);
      load();
    } catch (e: unknown) {
      pop(e instanceof Error ? e.message : "Delete failed", false);
    }
  }

  if (!isRole("ADMIN")) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <span className="text-4xl">🔒</span>
        <p className="text-gray-500 font-medium">Admin access required</p>
      </div>
    );
  }

  const hasEditor = active || isNew;

  return (
    <div style={{ height: "calc(100vh - 64px)" }} className="flex overflow-hidden bg-[#f8fafc]">

      {/* ── Toast ── */}
      {toast && (
        <div className={`fixed top-5 right-5 z-50 flex items-center gap-2 px-4 py-3 rounded-2xl shadow-xl text-sm font-semibold text-white animate-fade-in-up ${toast.ok ? "bg-emerald-500" : "bg-red-500"}`}>
          <span>{toast.ok ? "✓" : "✗"}</span> {toast.msg}
        </div>
      )}

      {/* ══════════════ LEFT PANEL ══════════════ */}
      <aside className="w-64 shrink-0 bg-white border-r border-gray-100 flex flex-col">

        {/* header */}
        <div className="px-4 pt-5 pb-3">
          <div className="flex items-center justify-between">
            <h2 className="font-black text-gray-900 text-base tracking-tight">Roles</h2>
            <button
              onClick={startNew}
              className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-lg leading-none font-bold transition-transform hover:scale-110"
              style={{ background: "linear-gradient(135deg,#dc2626,#f97316)" }}
              title="Create new role"
            >+</button>
          </div>
          <p className="text-[11px] text-gray-400 mt-0.5">
            {loading ? "Loading…" : `${roles.length} role${roles.length !== 1 ? "s" : ""}`}
          </p>
        </div>

        {/* list */}
        <div className="flex-1 overflow-y-auto px-2 pb-4 space-y-0.5">
          {loading
            ? [...Array(5)].map((_, i) => <div key={i} className="h-14 rounded-xl skeleton mx-1 mb-1" />)
            : roles.map(role => {
                const isSel = active?.id === role.id;
                const count = role.modulePermissions.filter(p => p.canAccess).length;
                return (
                  <button
                    key={role.id}
                    onClick={() => pick(role)}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all"
                    style={isSel
                      ? { background: role.color + "18", borderLeft: `3px solid ${role.color}` }
                      : { borderLeft: "3px solid transparent" }
                    }
                  >
                    {/* avatar */}
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-black text-sm shrink-0"
                      style={{ background: role.color }}
                    >
                      {role.name[0]?.toUpperCase()}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1">
                        <span className="text-sm font-semibold text-gray-900 truncate leading-tight">{role.name}</span>
                        {role.isSystem && (
                          <span className="text-[9px] px-1 rounded bg-gray-100 text-gray-400 font-bold shrink-0">SYS</span>
                        )}
                      </div>
                      <span className="text-[11px] text-gray-400">{count} modules · {role._count?.users ?? 0} users</span>
                    </div>

                    {isSel && (
                      <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: role.color }} />
                    )}
                  </button>
                );
              })
          }

          {/* new-role placeholder */}
          {isNew && !loading && (
            <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl mx-0"
              style={{ background: form.color + "18", borderLeft: `3px solid ${form.color}` }}>
              <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-black text-sm shrink-0"
                style={{ background: form.color }}>
                {form.name ? form.name[0].toUpperCase() : "+"}
              </div>
              <div>
                <span className="text-sm font-semibold text-gray-900">{form.name || "New Role"}</span>
                <p className="text-[11px] text-gray-400">Unsaved</p>
              </div>
            </div>
          )}
        </div>
      </aside>

      {/* ══════════════ RIGHT PANEL ══════════════ */}
      {hasEditor ? (
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-xl mx-auto py-8 px-6 space-y-5">

            {/* ── Identity card ── */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="h-1.5" style={{ background: `linear-gradient(90deg, ${form.color}, ${form.color}88)` }} />
              <div className="p-5 space-y-4">
                {/* Avatar + inputs */}
                <div className="flex items-start gap-4">
                  <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-white font-black text-2xl shrink-0 shadow-sm transition-colors"
                    style={{ background: form.color }}>
                    {form.name ? form.name[0].toUpperCase() : "?"}
                  </div>
                  <div className="flex-1 space-y-1.5">
                    <input
                      className="w-full text-lg font-black text-gray-900 outline-none border-b-2 border-transparent focus:border-gray-200 pb-0.5 placeholder-gray-300 bg-transparent"
                      placeholder="Role name…"
                      value={form.name}
                      onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    />
                    <input
                      className="w-full text-sm text-gray-400 outline-none placeholder-gray-300 bg-transparent"
                      placeholder="Short description (optional)…"
                      value={form.description}
                      onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                    />
                  </div>
                </div>

                {/* Color row */}
                <div>
                  <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Role colour</p>
                  <div className="flex gap-2 flex-wrap">
                    {COLORS.map(c => (
                      <button
                        key={c}
                        onClick={() => setForm(f => ({ ...f, color: c }))}
                        className="w-7 h-7 rounded-lg transition-all hover:scale-110"
                        style={{
                          background: c,
                          outline: form.color === c ? `3px solid ${c}` : "3px solid transparent",
                          outlineOffset: "2px",
                        }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* ── Permission level ── */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <p className="text-sm font-bold text-gray-900 mb-0.5">Permission Level</p>
              <p className="text-xs text-gray-400 mb-3">Controls what backend actions users with this role can perform</p>

              <div className="grid grid-cols-4 gap-2">
                {BASE_LEVELS.map(lvl => {
                  const sel = form.basePermissionLevel === lvl.value;
                  const locked = !!(active?.isSystem);
                  return (
                    <button
                      key={lvl.value}
                      onClick={() => !locked && setForm(f => ({ ...f, basePermissionLevel: lvl.value }))}
                      disabled={locked}
                      className={`py-3 rounded-xl text-xs font-bold flex flex-col items-center gap-1 transition-all ${locked ? "opacity-50 cursor-not-allowed" : "hover:scale-105"}`}
                      style={sel
                        ? { background: form.color + "18", color: form.color, border: `2px solid ${form.color}` }
                        : { background: "#f8fafc", color: "#6b7280", border: "2px solid #e5e7eb" }
                      }
                    >
                      <span className="text-base">{lvl.icon}</span>
                      <span>{lvl.label}</span>
                    </button>
                  );
                })}
              </div>
              {active?.isSystem && (
                <p className="text-[11px] text-amber-500 mt-2.5">⚠ System roles cannot change permission level</p>
              )}
            </div>

            {/* ── Module toggles ── */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-sm font-bold text-gray-900">Module Access</p>
                  <p className="text-xs text-gray-400">
                    <span className="font-semibold" style={{ color: form.color }}>{form.moduleKeys.length}</span>
                    /{modules.length} modules enabled
                  </p>
                </div>
                <div className="flex items-center gap-3 text-xs">
                  <button onClick={() => setForm(f => ({ ...f, moduleKeys: modules.map(m => m.key) }))}
                    className="text-blue-500 hover:underline font-medium">All on</button>
                  <span className="text-gray-200">|</span>
                  <button onClick={() => setForm(f => ({ ...f, moduleKeys: [] }))}
                    className="text-gray-400 hover:underline font-medium">All off</button>
                </div>
              </div>

              <div className="space-y-1">
                {modules.map(m => {
                  const on = form.moduleKeys.includes(m.key);
                  return (
                    <div
                      key={m.key}
                      onClick={() => toggle(m.key)}
                      className="flex items-center justify-between px-3 py-3 rounded-xl cursor-pointer hover:bg-gray-50 transition-colors group"
                    >
                      {/* icon + name */}
                      <div className="flex items-center gap-3">
                        <div
                          className="w-9 h-9 rounded-xl flex items-center justify-center text-lg transition-colors"
                          style={{ background: on ? form.color + "20" : "#f3f4f6" }}
                        >
                          {m.icon}
                        </div>
                        <span className={`text-sm font-medium transition-colors ${on ? "text-gray-900" : "text-gray-400"}`}>
                          {m.name}
                        </span>
                      </div>

                      {/* Toggle pill */}
                      <div
                        className="relative w-11 h-6 rounded-full transition-colors duration-200 shrink-0"
                        style={{ background: on ? form.color : "#e5e7eb" }}
                      >
                        <div
                          className="absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all duration-200"
                          style={{ left: on ? "calc(100% - 20px)" : "4px" }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* ── Footer actions ── */}
            <div className="flex gap-3 pb-8">
              {active && !active.isSystem && (
                <button
                  onClick={() => setDeleting(true)}
                  className="px-4 py-2.5 rounded-xl border border-red-200 text-sm font-medium text-red-500 hover:bg-red-50 transition-colors"
                >
                  Delete
                </button>
              )}
              <button
                onClick={save}
                disabled={saving}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white transition-all disabled:opacity-60 hover:opacity-90 shadow-sm"
                style={{ background: `linear-gradient(135deg, ${form.color}, ${form.color}cc)` }}
              >
                {saving ? "Saving…" : isNew ? "Create Role" : "Save Changes"}
              </button>
            </div>
          </div>
        </main>
      ) : (
        /* ── Empty state ── */
        <div className="flex-1 flex flex-col items-center justify-center text-center p-8 gap-4">
          <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center text-3xl">🔑</div>
          <div>
            <h3 className="font-bold text-gray-800 text-base mb-1">Select a role to configure</h3>
            <p className="text-sm text-gray-400 max-w-xs">
              Choose a role from the left panel to edit its name, colour, permission level, and module access.
            </p>
          </div>
          <button
            onClick={startNew}
            className="mt-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white shadow-sm hover:opacity-90 transition-opacity"
            style={{ background: "linear-gradient(135deg,#dc2626,#f97316)" }}
          >
            + Create New Role
          </button>
        </div>
      )}

      {/* ── Delete confirm ── */}
      {deleting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-xs w-full animate-scale-in text-center">
            <div className="w-14 h-14 rounded-2xl bg-red-50 flex items-center justify-center text-3xl mx-auto mb-3">🗑</div>
            <h3 className="font-black text-gray-900 text-lg mb-1">Delete Role?</h3>
            <p className="text-sm text-gray-400 mb-5">
              This cannot be undone. Roles with users assigned cannot be deleted.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setDeleting(false)}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50">
                Cancel
              </button>
              <button onClick={del}
                className="flex-1 py-2.5 rounded-xl bg-red-500 text-white text-sm font-bold hover:bg-red-600 transition-colors">
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
