"use client";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";

const QUICK_LINKS = [
  { href: "/dashboard",               label: "Dashboard",     icon: "⊞" },
  { href: "/dashboard/attendance",    label: "Attendance",    icon: "🕐" },
  { href: "/dashboard/leaves",        label: "Leaves",        icon: "🌿" },
  { href: "/dashboard/approvals",     label: "Approvals",     icon: "✅" },
  { href: "/dashboard/announcements", label: "Announcements", icon: "📢" },
  { href: "/dashboard/profile",       label: "My Profile",    icon: "👤" },
];

const ADMIN_LINKS = [
  { href: "/dashboard/employees",  label: "Employees",          icon: "🧑‍💼" },
  { href: "/dashboard/org-chart",  label: "Org Chart",          icon: "🌳" },
  { href: "/dashboard/onboarding", label: "Onboarding",         icon: "🚀" },
  { href: "/dashboard/users",      label: "User Management",    icon: "⚙️" },
  { href: "/dashboard/roles",      label: "Roles & Permissions",icon: "🔑" },
  { href: "/dashboard/audit",      label: "Audit Logs",         icon: "📋" },
];

const year = new Date().getFullYear();

export default function Footer() {
  const { isRole } = useAuth();
  const showAdmin = isRole("HR", "ADMIN");

  return (
    <footer className="mt-12">
      {/* ── Gradient top border ── */}
      <div className="h-px w-full" style={{ background: "linear-gradient(90deg, transparent, rgb(220,38,38), rgb(249,115,22), transparent)" }} />

      <div className="bg-white pt-10 pb-0 px-5 md:px-6">
        {/* ── Main grid ── */}
        <div className={`grid grid-cols-1 sm:grid-cols-2 ${showAdmin ? "lg:grid-cols-4" : "lg:grid-cols-3"} gap-10 pb-10`}>

          {/* ── Brand column ── */}
          <div className="sm:col-span-2 lg:col-span-1">
            {/* Logo */}
            <Link href="/dashboard" className="flex items-center gap-3 mb-4 w-fit group">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-black text-lg shadow-md group-hover:shadow-lg transition-shadow"
                style={{ background: "linear-gradient(135deg, rgb(220,38,38), rgb(249,115,22))" }}
              >
                A
              </div>
              <div>
                <div className="text-base font-black text-gray-900 leading-none">Atlas HR</div>
                <div className="text-[10px] text-gray-400 font-medium mt-0.5 tracking-wide uppercase">Workforce Platform</div>
              </div>
            </Link>

            <p className="text-xs text-gray-400 leading-relaxed max-w-[230px] mb-5">
              Smart HR &amp; workforce management for modern teams. Attendance, leaves, approvals &amp; more — all in one place.
            </p>

          </div>

          {/* ── Quick Links ── */}
          <div>
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
              <span className="w-3 h-0.5 rounded-full inline-block" style={{ background: "linear-gradient(90deg, rgb(220,38,38), rgb(249,115,22))" }} />
              Quick Links
            </p>
            <ul className="space-y-1">
              {QUICK_LINKS.map((l) => (
                <li key={l.href}>
                  <Link
                    href={l.href}
                    className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs text-gray-500 font-medium hover:bg-red-50 hover:text-red-600 transition-all group"
                  >
                    <span className="text-sm w-5 text-center group-hover:scale-110 transition-transform inline-block">{l.icon}</span>
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* ── Management (HR + Admin only) ── */}
          {showAdmin && (
            <div>
              <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                <span className="w-3 h-0.5 rounded-full inline-block" style={{ background: "linear-gradient(90deg, rgb(220,38,38), rgb(249,115,22))" }} />
                Management
              </p>
              <ul className="space-y-1">
                {ADMIN_LINKS.map((l) => (
                  <li key={l.href}>
                    <Link
                      href={l.href}
                      className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs text-gray-500 font-medium hover:bg-red-50 hover:text-red-600 transition-all group"
                    >
                      <span className="text-sm w-5 text-center group-hover:scale-110 transition-transform inline-block">{l.icon}</span>
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* ── Support & Info ── */}
          <div>
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
              <span className="w-3 h-0.5 rounded-full inline-block" style={{ background: "linear-gradient(90deg, rgb(220,38,38), rgb(249,115,22))" }} />
              Support
            </p>

            <div className="space-y-3">
              {/* Version */}
              <div className="flex items-center justify-between px-3 py-2.5 rounded-xl bg-gray-50 border border-gray-100">
                <span className="text-xs text-gray-500 font-medium">Version</span>
                <span className="text-xs font-bold text-white px-2 py-0.5 rounded-full" style={{ background: "linear-gradient(135deg, rgb(220,38,38), rgb(249,115,22))" }}>
                  v2.0
                </span>
              </div>

              {/* Support email */}
              <a
                href="mailto:support@atlashr.in"
                className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-gray-50 border border-gray-100 hover:bg-red-50 hover:border-red-100 transition-all group"
              >
                <div className="w-7 h-7 rounded-lg bg-white border border-gray-200 flex items-center justify-center text-sm group-hover:border-red-200 transition-colors shrink-0">
                  ✉️
                </div>
                <div>
                  <div className="text-[10px] text-gray-400 font-medium leading-none">Email Support</div>
                  <div className="text-xs font-semibold text-gray-700 group-hover:text-red-600 transition-colors mt-0.5">support@atlashr.in</div>
                </div>
              </a>

              {/* Help doc placeholder */}
              <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-gray-50 border border-gray-100 hover:bg-red-50 hover:border-red-100 transition-all group cursor-pointer">
                <div className="w-7 h-7 rounded-lg bg-white border border-gray-200 flex items-center justify-center text-sm group-hover:border-red-200 transition-colors shrink-0">
                  📖
                </div>
                <div>
                  <div className="text-[10px] text-gray-400 font-medium leading-none">Documentation</div>
                  <div className="text-xs font-semibold text-gray-700 group-hover:text-red-600 transition-colors mt-0.5">Help &amp; Guides</div>
                </div>
              </div>

              {/* Report issue */}
              <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-gray-50 border border-gray-100 hover:bg-red-50 hover:border-red-100 transition-all group cursor-pointer">
                <div className="w-7 h-7 rounded-lg bg-white border border-gray-200 flex items-center justify-center text-sm group-hover:border-red-200 transition-colors shrink-0">
                  🐛
                </div>
                <div>
                  <div className="text-[10px] text-gray-400 font-medium leading-none">Found an issue?</div>
                  <div className="text-xs font-semibold text-gray-700 group-hover:text-red-600 transition-colors mt-0.5">Report a Bug</div>
                </div>
              </div>
            </div>
          </div>

        </div>

        {/* ── Bottom bar ── */}
        <div
          className="py-4 flex flex-col sm:flex-row items-center justify-between gap-3"
          style={{ borderTop: "1px solid #f1f5f9" }}
        >
          <div className="flex items-center gap-2">
            <div
              className="w-5 h-5 rounded-md flex items-center justify-center text-white text-[10px] font-black"
              style={{ background: "linear-gradient(135deg, rgb(220,38,38), rgb(249,115,22))" }}
            >
              A
            </div>
            <p className="text-[11px] text-gray-400">
              © {year} <span className="font-semibold text-gray-500">Atlas HR</span>. All rights reserved.
            </p>
          </div>

          <div className="flex items-center gap-1">
            {[
              { label: "Privacy Policy",   href: "#" },
              { label: "Terms of Use",     href: "#" },
              { label: "Data Security",    href: "#" },
            ].map((item, i, arr) => (
              <span key={item.label} className="flex items-center">
                <a
                  href={item.href}
                  className="text-[11px] text-gray-400 hover:text-red-500 transition-colors font-medium px-2 py-1 rounded hover:bg-red-50"
                >
                  {item.label}
                </a>
                {i < arr.length - 1 && <span className="text-gray-200 text-xs">·</span>}
              </span>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
