"use client";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";

const QUICK_LINKS = [
  { href: "/dashboard",              label: "Dashboard" },
  { href: "/dashboard/attendance",   label: "Attendance" },
  { href: "/dashboard/leaves",       label: "Leaves" },
  { href: "/dashboard/approvals",    label: "Approvals" },
  { href: "/dashboard/announcements",label: "Announcements" },
  { href: "/dashboard/directory",    label: "Directory" },
  { href: "/dashboard/profile",      label: "My Profile" },
];

const ADMIN_LINKS = [
  { href: "/dashboard/employees",  label: "Employees" },
  { href: "/dashboard/org-chart",  label: "Org Chart" },
  { href: "/dashboard/onboarding", label: "Onboarding" },
  { href: "/dashboard/users",      label: "User Management" },
  { href: "/dashboard/roles",      label: "Roles & Permissions" },
  { href: "/dashboard/audit",      label: "Audit Logs" },
];

const year = new Date().getFullYear();

export default function Footer() {
  const { isRole } = useAuth();
  const showAdmin = isRole("HR", "ADMIN");

  return (
    <footer className="mt-10 border-t border-gray-100">
      {/* ── Main footer body ── */}
      <div className="py-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">

        {/* Brand */}
        <div className="lg:col-span-1">
          <div className="flex items-center gap-2.5 mb-3">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-sm font-black shadow-sm"
              style={{ background: "linear-gradient(135deg, rgb(220,38,38), rgb(249,115,22))" }}
            >
              A
            </div>
            <span className="text-sm font-black text-gray-900 tracking-tight">Atlas HR</span>
          </div>
          <p className="text-xs text-gray-400 leading-relaxed max-w-[220px]">
            Smart HR &amp; workforce management for modern teams. Attendance, leaves, approvals — all in one place.
          </p>
          <div className="flex items-center gap-1.5 mt-4">
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse-soft" />
            <span className="text-[11px] text-gray-400 font-medium">All systems operational</span>
          </div>
        </div>

        {/* Quick links */}
        <div>
          <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-3">Quick Links</p>
          <ul className="space-y-2">
            {QUICK_LINKS.map((l) => (
              <li key={l.href}>
                <Link
                  href={l.href}
                  className="text-xs text-gray-500 hover:text-red-500 transition-colors font-medium"
                >
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Admin / management links — only for HR + Admin */}
        {showAdmin && (
          <div>
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-3">Management</p>
            <ul className="space-y-2">
              {ADMIN_LINKS.map((l) => (
                <li key={l.href}>
                  <Link
                    href={l.href}
                    className="text-xs text-gray-500 hover:text-red-500 transition-colors font-medium"
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Platform info */}
        <div>
          <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-3">Platform</p>
          <ul className="space-y-2.5">
            <li className="flex items-start gap-2">
              <span className="text-xs text-gray-400 leading-relaxed">
                Built with Next.js, Express &amp; PostgreSQL. Hosted on Vercel.
              </span>
            </li>
          </ul>
          <div className="mt-4 space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-gray-400">Version</span>
              <span className="text-[11px] font-bold text-gray-600 bg-gray-100 px-1.5 py-0.5 rounded">v2.0</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-gray-400">Support</span>
              <a
                href="mailto:support@atlashr.in"
                className="text-[11px] font-medium text-red-500 hover:text-red-600 transition-colors"
              >
                support@atlashr.in
              </a>
            </div>
          </div>
        </div>

      </div>

      {/* ── Bottom bar ── */}
      <div className="py-4 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-2">
        <p className="text-[11px] text-gray-400">
          © {year} Atlas HR. All rights reserved.
        </p>
        <div className="flex items-center gap-4">
          <span className="text-[11px] text-gray-300 hover:text-gray-500 transition-colors cursor-pointer">
            Privacy Policy
          </span>
          <span className="text-[11px] text-gray-300 hover:text-gray-500 transition-colors cursor-pointer">
            Terms of Use
          </span>
          <span className="text-[11px] text-gray-300 hover:text-gray-500 transition-colors cursor-pointer">
            Data Security
          </span>
        </div>
      </div>
    </footer>
  );
}
