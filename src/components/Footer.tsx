"use client";
import Link from "next/link";

const NAV_LINKS = [
  { href: "/dashboard",               label: "Dashboard"     },
  { href: "/dashboard/attendance",    label: "Attendance"    },
  { href: "/dashboard/leaves",        label: "Leaves"        },
  { href: "/dashboard/approvals",     label: "Approvals"     },
  { href: "/dashboard/announcements", label: "Announcements" },
  { href: "/dashboard/profile",       label: "My Profile"    },
];

const year = new Date().getFullYear();

export default function Footer() {
  return (
    <footer className="mt-auto border-t border-slate-200 bg-white">
      <div className="px-6 py-10">

        {/* ── Top section ── */}
        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-10">

          {/* Brand */}
          <div className="max-w-xs">
            <Link href="/dashboard" className="flex items-center gap-2.5 mb-4 w-fit group">
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-bold text-sm shadow-sm"
                style={{ background: "linear-gradient(135deg, rgb(220,38,38), rgb(249,115,22))" }}
              >
                A
              </div>
              <div>
                <div className="text-sm font-bold text-slate-900 leading-none">Atlas HR</div>
                <div className="text-[10px] text-slate-400 mt-0.5">Workforce Platform</div>
              </div>
            </Link>
            <p className="text-xs text-slate-400 leading-relaxed">
              Modern HR platform for smart teams — attendance, leaves, approvals and more, all in one place.
            </p>
            <a
              href="mailto:sahil.vashisht@podtech.com"
              className="inline-flex items-center gap-2 mt-4 text-xs text-slate-500 hover:text-red-600 transition-colors font-medium"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              sahil.vashisht@podtech.com
            </a>
          </div>

          {/* Nav links */}
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-4">Navigation</p>
            <ul className="grid grid-cols-2 gap-x-10 gap-y-2">
              {NAV_LINKS.map(l => (
                <li key={l.href}>
                  <Link
                    href={l.href}
                    className="text-xs text-slate-500 hover:text-red-600 transition-colors font-medium"
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Info */}
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-4">Platform</p>
            <div className="space-y-2.5">
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
                All systems operational
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: "linear-gradient(135deg, rgb(220,38,38), rgb(249,115,22))" }} />
                Version 2.0
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <svg className="w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                256-bit encrypted
              </div>
            </div>
          </div>

        </div>

        {/* ── Bottom bar ── */}
        <div className="mt-8 pt-6 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-[11px] text-slate-400">
            © {year} <span className="font-semibold text-slate-500">Atlas HR</span> · Built by PodTech
          </p>
          <div className="flex items-center gap-4">
            {["Privacy Policy", "Terms of Use"].map(label => (
              <a key={label} href="#" className="text-[11px] text-slate-400 hover:text-slate-600 transition-colors">
                {label}
              </a>
            ))}
          </div>
        </div>

      </div>
    </footer>
  );
}
