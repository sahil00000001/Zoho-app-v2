"use client";
import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { api, User } from "@/lib/api";

interface Department { id: string; name: string; }

const gradientColors = ["rgb(220,38,38)", "rgb(249,115,22)"];

function getInitials(firstName: string, lastName: string) {
  return `${firstName[0]}${lastName[0]}`.toUpperCase();
}

export default function DirectoryPage() {
  const { isRole } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [dept, setDept] = useState("All");
  const [view, setView] = useState<"grid" | "list" | "org">("grid");
  const [selected, setSelected] = useState<User | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [u, d] = await Promise.all([
        api.getUsers({ isActive: "true" }),
        api.getDepartments(),
      ]);
      setUsers(u as User[]);
      setDepartments(d as Department[]);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const filtered = users.filter((u) => {
    const matchesDept = dept === "All" || u.department?.name === dept;
    const q = search.toLowerCase();
    const matchesSearch =
      !search ||
      u.firstName.toLowerCase().includes(q) ||
      u.lastName.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      (u.designation || "").toLowerCase().includes(q) ||
      u.employeeId.toLowerCase().includes(q);
    return matchesDept && matchesSearch;
  });

  const allDepts = ["All", ...departments.map((d) => d.name)];

  const roleBadgeColor: Record<string, string> = {
    EMPLOYEE: "rgba(59,130,246,0.1)",
    MANAGER: "rgba(34,197,94,0.1)",
    HR: "rgba(168,85,247,0.1)",
    ADMIN: "rgba(220,38,38,0.1)",
  };
  const roleBadgeText: Record<string, string> = {
    EMPLOYEE: "rgb(59,130,246)",
    MANAGER: "rgb(34,197,94)",
    HR: "rgb(168,85,247)",
    ADMIN: "rgb(220,38,38)",
  };

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <div className="w-8 h-8 rounded-full border-2 border-red-500/20 border-t-red-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
        <div>
          <h1 className="text-[22px] font-bold text-slate-900">Employee Directory</h1>
          <p className="text-sm text-slate-500">
            {users.length} team member{users.length !== 1 ? "s" : ""} across{" "}
            {departments.length} department{departments.length !== 1 ? "s" : ""}
          </p>
        </div>
        {isRole("ADMIN") && (
          <a
            href="/dashboard/users"
            className="text-white text-sm font-bold px-5 py-2.5 rounded-xl shrink-0 transition-all hover:opacity-90"
            style={{ background: "linear-gradient(90deg, rgb(220,38,38), rgb(249,115,22))", boxShadow: "0 4px 12px rgba(220,38,38,0.25)" }}
          >
            + Add Employee
          </a>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-3 items-start md:items-center">
        <div className="flex items-center gap-2 bg-white rounded-xl px-4 py-2.5 border border-slate-200 flex-1 max-w-sm">
          <span className="text-gray-400 text-sm">🔍</span>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name, email, ID..."
            className="bg-transparent text-sm text-gray-700 placeholder-gray-400 focus:outline-none flex-1"
          />
        </div>

        <div className="flex gap-2 flex-wrap">
          {allDepts.map((d) => (
            <button
              key={d}
              onClick={() => setDept(d)}
              className={`px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                dept === d ? "text-white" : "bg-white border border-slate-200 text-gray-600 hover:border-red-200"
              }`}
              style={dept === d ? { background: "linear-gradient(90deg, rgb(220,38,38), rgb(249,115,22))" } : {}}
            >
              {d}
            </button>
          ))}
        </div>

        <div className="flex gap-1 p-1 bg-slate-100 rounded-xl ml-auto">
          {(["grid", "list", "org"] as const).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                view === v ? "text-white shadow-sm" : "text-gray-500"
              }`}
              style={view === v ? { background: "linear-gradient(90deg, rgb(220,38,38), rgb(249,115,22))" } : {}}
            >
              {v === "grid" ? "⊞" : v === "list" ? "☰" : "🌳"}
            </button>
          ))}
        </div>
      </div>

      {/* Empty state */}
      {filtered.length === 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
          <div className="text-4xl mb-3">👥</div>
          <p className="text-gray-500 font-medium">No employees found</p>
          <p className="text-gray-400 text-sm mt-1">Try adjusting your search or filter</p>
        </div>
      )}

      {/* Grid view */}
      {view === "grid" && filtered.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map((u, i) => (
            <div
              key={u.id}
              onClick={() => setSelected(u)}
              className="bg-white rounded-2xl p-5 hover:shadow-lg transition-all duration-200 hover:-translate-y-1 cursor-pointer group border border-slate-200"
            >
              <div className="flex flex-col items-center text-center">
                <div
                  className="w-14 h-14 rounded-2xl flex items-center justify-center text-white text-lg font-black mb-3 group-hover:scale-105 transition-transform"
                  style={{ background: `linear-gradient(135deg, ${gradientColors[i % 2]}, ${gradientColors[1]})` }}
                >
                  {getInitials(u.firstName, u.lastName)}
                </div>
                <h4 className="font-bold text-gray-900 text-sm">{u.firstName} {u.lastName}</h4>
                <p className="text-xs text-gray-500 mt-0.5">{u.designation || u.role}</p>
                <span
                  className="mt-2 text-xs font-medium px-2.5 py-0.5 rounded-full"
                  style={{ background: "rgba(220,38,38,0.07)", color: "rgb(220,38,38)" }}
                >
                  {u.department?.name || "No Dept"}
                </span>
                <div className="mt-3 pt-3 border-t border-slate-200 w-full flex justify-between text-xs text-gray-400">
                  <span>{u.employeeId}</span>
                  <span
                    className="font-semibold px-1.5 rounded"
                    style={{
                      background: roleBadgeColor[u.role] || "rgba(220,38,38,0.07)",
                      color: roleBadgeText[u.role] || "rgb(220,38,38)",
                    }}
                  >
                    {u.role}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* List view */}
      {view === "list" && filtered.length > 0 && (
        <div className="bg-white rounded-2xl overflow-hidden border border-slate-200">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50/80">
                {["Employee", "Department", "Role", "Designation", ""].map((h) => (
                  <th key={h} className="text-left px-5 py-3 text-xs font-bold text-gray-500 uppercase tracking-wide">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((u) => (
                <tr
                  key={u.id}
                  className="border-t border-gray-50 hover:bg-slate-50/50 transition-colors cursor-pointer"
                  onClick={() => setSelected(u)}
                >
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
                        style={{ background: "linear-gradient(135deg, rgb(220,38,38), rgb(249,115,22))" }}
                      >
                        {getInitials(u.firstName, u.lastName)}
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-gray-800">{u.firstName} {u.lastName}</div>
                        <div className="text-xs text-gray-400">{u.email} · {u.employeeId}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3.5">
                    <span
                      className="text-xs font-medium px-2 py-0.5 rounded-full"
                      style={{ background: "rgba(220,38,38,0.07)", color: "rgb(220,38,38)" }}
                    >
                      {u.department?.name || "—"}
                    </span>
                  </td>
                  <td className="px-5 py-3.5">
                    <span
                      className="text-xs font-semibold px-2 py-0.5 rounded-full"
                      style={{
                        background: roleBadgeColor[u.role] || "rgba(220,38,38,0.07)",
                        color: roleBadgeText[u.role] || "rgb(220,38,38)",
                      }}
                    >
                      {u.role}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-sm text-gray-600">{u.designation || "—"}</td>
                  <td className="px-5 py-3.5">
                    <button
                      className="text-xs font-semibold px-3 py-1.5 rounded-lg border transition-all hover:bg-red-50"
                      style={{ borderColor: "rgba(220,38,38,0.3)", color: "rgb(220,38,38)" }}
                    >
                      View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Org chart — shows real manager/subordinate relationships */}
      {view === "org" && (
        <div className="bg-white rounded-2xl p-8 border border-slate-200">
          <div className="flex flex-col items-center gap-2">
            {/* Top-level (no manager) */}
            {users
              .filter((u) => !u.managerId)
              .map((u) => (
                <div key={u.id} className="flex flex-col items-center">
                  <OrgNode
                    name={`${u.firstName} ${u.lastName}`}
                    role={u.designation || u.role}
                    initials={getInitials(u.firstName, u.lastName)}
                    color="rgb(220,38,38)"
                    onClick={() => setSelected(u)}
                  />
                  {/* Direct reports */}
                  {users.filter((s) => s.managerId === u.id).length > 0 && (
                    <>
                      <div className="w-0.5 h-8" style={{ background: "linear-gradient(180deg, rgb(220,38,38), rgb(249,115,22))" }} />
                      <div className="flex flex-wrap justify-center gap-4">
                        {users
                          .filter((s) => s.managerId === u.id)
                          .map((sub) => (
                            <div key={sub.id} className="flex flex-col items-center">
                              <div className="w-0.5 h-6" style={{ background: "rgb(249,115,22)" }} />
                              <OrgNode
                                name={`${sub.firstName} ${sub.lastName}`}
                                role={sub.designation || sub.role}
                                initials={getInitials(sub.firstName, sub.lastName)}
                                color="rgb(249,115,22)"
                                small
                                onClick={() => setSelected(sub)}
                              />
                            </div>
                          ))}
                      </div>
                    </>
                  )}
                </div>
              ))}
          </div>
          <p className="text-center text-xs text-gray-400 mt-8">
            Showing org hierarchy based on manager assignments · Click a card to view profile
          </p>
        </div>
      )}

      {/* Employee profile drawer */}
      {selected && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex justify-end" onClick={() => setSelected(null)}>
          <div
            className="w-full max-w-md bg-white h-full overflow-y-auto shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between z-10">
              <h3 className="font-bold text-gray-900">Employee Profile</h3>
              <button
                onClick={() => setSelected(null)}
                className="text-gray-400 hover:text-gray-600 text-xl transition-colors w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100"
              >
                ×
              </button>
            </div>

            <div className="p-6">
              {/* Header */}
              <div className="flex flex-col items-center text-center pb-6 border-b border-slate-200">
                <div
                  className="w-20 h-20 rounded-2xl flex items-center justify-center text-white text-2xl font-black mb-4"
                  style={{ background: "linear-gradient(135deg, rgb(220,38,38), rgb(249,115,22))" }}
                >
                  {getInitials(selected.firstName, selected.lastName)}
                </div>
                <h2 className="text-xl font-bold text-slate-900">{selected.firstName} {selected.lastName}</h2>
                <p className="text-gray-500 text-sm mt-1">{selected.designation || "—"}</p>
                <div className="flex items-center gap-2 mt-2">
                  <span
                    className="text-xs font-medium px-3 py-1 rounded-full"
                    style={{ background: "rgba(220,38,38,0.08)", color: "rgb(220,38,38)" }}
                  >
                    {selected.department?.name || "No Department"}
                  </span>
                  <span
                    className="text-xs font-semibold px-3 py-1 rounded-full"
                    style={{
                      background: roleBadgeColor[selected.role] || "rgba(220,38,38,0.07)",
                      color: roleBadgeText[selected.role] || "rgb(220,38,38)",
                    }}
                  >
                    {selected.role}
                  </span>
                </div>
              </div>

              {/* Details */}
              <div className="py-5 space-y-4">
                {[
                  { label: "Employee ID", value: selected.employeeId, icon: "🪪" },
                  { label: "Email", value: selected.email, icon: "✉️" },
                  { label: "Phone", value: selected.phoneNumber || "—", icon: "📞" },
                  {
                    label: "Joined",
                    value: selected.joiningDate
                      ? new Date(selected.joiningDate).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
                      : "—",
                    icon: "📅",
                  },
                  {
                    label: "Manager",
                    value: selected.manager
                      ? `${selected.manager.firstName} ${selected.manager.lastName}`
                      : "—",
                    icon: "👤",
                  },
                  {
                    label: "Status",
                    value: selected.isActive ? "Active" : "Inactive",
                    icon: selected.isActive ? "✅" : "⛔",
                  },
                ].map((d) => (
                  <div key={d.label} className="flex items-center gap-3">
                    <span className="text-base w-6 shrink-0">{d.icon}</span>
                    <div>
                      <div className="text-xs text-gray-400">{d.label}</div>
                      <div className="text-sm font-medium text-gray-800">{d.value}</div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex gap-3 pt-4 border-t border-slate-200">
                <a
                  href={`mailto:${selected.email}`}
                  className="flex-1 py-2.5 text-sm font-bold text-white rounded-xl text-center transition-all hover:opacity-90"
                  style={{ background: "linear-gradient(90deg, rgb(220,38,38), rgb(249,115,22))" }}
                >
                  Send Email
                </a>
                {isRole("ADMIN") && (
                  <a
                    href="/dashboard/users"
                    className="flex-1 py-2.5 text-sm font-semibold rounded-xl border border-slate-200 text-gray-600 hover:bg-slate-50 transition-colors text-center"
                  >
                    Edit Profile
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function OrgNode({
  name, role, initials, color, small, onClick,
}: {
  name: string;
  role: string;
  initials: string;
  color: string;
  small?: boolean;
  onClick?: () => void;
}) {
  return (
    <div
      className={`flex flex-col items-center bg-white border border-slate-200 rounded-xl p-3 hover:shadow-md transition-all cursor-pointer ${small ? "w-32" : "w-40"}`}
      onClick={onClick}
    >
      <div
        className={`${small ? "w-10 h-10 text-sm" : "w-12 h-12 text-base"} rounded-xl flex items-center justify-center text-white font-black mb-2`}
        style={{ background: `linear-gradient(135deg, ${color}, rgb(249,115,22))` }}
      >
        {initials}
      </div>
      <div className={`font-bold text-gray-900 text-center ${small ? "text-xs" : "text-sm"}`}>{name}</div>
      <div className="text-xs text-gray-400 text-center mt-0.5 truncate w-full">{role}</div>
    </div>
  );
}
