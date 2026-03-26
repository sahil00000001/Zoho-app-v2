"use client";
import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";

interface Command {
  id: string;
  label: string;
  description?: string;
  icon: string;
  href?: string;
  action?: () => void;
  role?: "all" | "admin" | "manager";
  keywords?: string[];
}

const BASE_COMMANDS: Command[] = [
  { id: "dashboard",      label: "Dashboard",         icon: "⊞", href: "/dashboard",                    description: "Home overview" },
  { id: "attendance",     label: "Attendance",         icon: "🕐", href: "/dashboard/attendance",         description: "Clock in/out & history" },
  { id: "leaves",         label: "My Leaves",          icon: "🌿", href: "/dashboard/leaves",             description: "Apply & track leave" },
  { id: "approvals",      label: "Approvals",          icon: "✅", href: "/dashboard/approvals",          description: "Pending requests", role: "manager" },
  { id: "announcements",  label: "Announcements",      icon: "📢", href: "/dashboard/announcements",      description: "Company updates" },
  { id: "directory",      label: "Directory",          icon: "👥", href: "/dashboard/directory",          description: "Find colleagues" },
  { id: "profile",        label: "My Profile",         icon: "👤", href: "/dashboard/profile",            description: "Edit your profile" },
  { id: "employees",      label: "Employees",          icon: "🧑‍💼", href: "/dashboard/employees",         description: "Manage all employees", role: "admin" },
  { id: "org-chart",      label: "Org Chart",          icon: "🌳", href: "/dashboard/org-chart",          description: "Company hierarchy" },
  { id: "onboarding",     label: "Onboarding",         icon: "🚀", href: "/dashboard/onboarding",         description: "New hire management", role: "admin" },
  { id: "users",          label: "User Management",    icon: "⚙️", href: "/dashboard/users",              description: "Manage user accounts", role: "admin" },
  { id: "roles",          label: "Roles & Permissions",icon: "🔑", href: "/dashboard/roles",              description: "Access control", role: "admin" },
  { id: "audit",          label: "Audit Logs",         icon: "📋", href: "/dashboard/audit",              description: "Activity history", role: "admin" },
  { id: "team-calendar",  label: "Team Calendar",      icon: "📅", href: "/dashboard/leaves/team-calendar",description: "Team leave overview" },
];

export default function CommandPalette() {
  const [open, setOpen]   = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const router   = useRouter();
  const { isRole } = useAuth();

  const isAdmin   = isRole("ADMIN", "HR");
  const isManager = isRole("ADMIN", "HR", "MANAGER");

  const commands = BASE_COMMANDS.filter(c => {
    if (c.role === "admin")   return isAdmin;
    if (c.role === "manager") return isManager;
    return true;
  });

  const filtered = query.trim()
    ? commands.filter(c => {
        const q = query.toLowerCase();
        return (
          c.label.toLowerCase().includes(q) ||
          (c.description?.toLowerCase().includes(q)) ||
          (c.keywords?.some(k => k.includes(q)))
        );
      })
    : commands;

  const execute = useCallback((cmd: Command) => {
    setOpen(false);
    setQuery("");
    if (cmd.href) router.push(cmd.href);
    else cmd.action?.();
  }, [router]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen(o => !o);
        setQuery("");
        setActive(0);
      }
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 20);
  }, [open]);

  useEffect(() => { setActive(0); }, [query]);

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") { e.preventDefault(); setActive(a => Math.min(a + 1, filtered.length - 1)); }
    if (e.key === "ArrowUp")   { e.preventDefault(); setActive(a => Math.max(a - 1, 0)); }
    if (e.key === "Enter" && filtered[active]) execute(filtered[active]);
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[9998] flex items-start justify-center pt-[15vh]"
      style={{ background: "rgba(15,23,42,0.45)", backdropFilter: "blur(4px)" }}
      onClick={() => setOpen(false)}
    >
      <div
        className="w-full max-w-lg mx-4 rounded-2xl overflow-hidden shadow-2xl border border-white/20"
        style={{ background: "#fff", animation: "scaleIn 0.15s ease forwards" }}
        onClick={e => e.stopPropagation()}
        onKeyDown={handleKey}
      >
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-gray-100">
          <svg className="w-4 h-4 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search pages, actions…"
            className="flex-1 text-sm text-gray-800 placeholder-gray-400 outline-none bg-transparent"
          />
          <kbd className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-semibold text-gray-400 bg-gray-100 border border-gray-200">
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div className="max-h-[320px] overflow-y-auto py-1.5">
          {filtered.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-gray-400">No results for "{query}"</p>
          ) : (
            filtered.map((cmd, i) => (
              <button
                key={cmd.id}
                onClick={() => execute(cmd)}
                onMouseEnter={() => setActive(i)}
                className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                  i === active ? "bg-red-50" : "hover:bg-gray-50"
                }`}
              >
                <span className="w-8 h-8 rounded-lg flex items-center justify-center text-base shrink-0"
                  style={{ background: i === active ? "linear-gradient(135deg,rgb(220,38,38),rgb(249,115,22))" : "#f1f5f9" }}>
                  <span style={i === active ? { filter: "brightness(10)" } : {}}>{cmd.icon}</span>
                </span>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium truncate ${i === active ? "text-red-700" : "text-gray-800"}`}>{cmd.label}</p>
                  {cmd.description && <p className="text-xs text-gray-400 truncate">{cmd.description}</p>}
                </div>
                {i === active && (
                  <kbd className="shrink-0 px-1.5 py-0.5 rounded text-[10px] font-semibold text-red-500 bg-red-50 border border-red-100">↵</kbd>
                )}
              </button>
            ))
          )}
        </div>

        {/* Footer hint */}
        <div className="flex items-center gap-3 px-4 py-2 border-t border-gray-100 bg-gray-50/60">
          <span className="flex items-center gap-1 text-[10px] text-gray-400">
            <kbd className="px-1 py-0.5 rounded bg-gray-100 border border-gray-200 font-semibold">↑↓</kbd> navigate
          </span>
          <span className="flex items-center gap-1 text-[10px] text-gray-400">
            <kbd className="px-1 py-0.5 rounded bg-gray-100 border border-gray-200 font-semibold">↵</kbd> open
          </span>
          <span className="ml-auto text-[10px] text-gray-300">⌘K to close</span>
        </div>
      </div>
    </div>
  );
}
