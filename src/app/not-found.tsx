import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center px-6 text-center">
      {/* Illustration */}
      <div className="relative mb-8 select-none">
        {/* Background blob */}
        <div className="absolute inset-0 rounded-full blur-3xl opacity-20"
          style={{ background: "linear-gradient(135deg, #DC2626, #F97316)", transform: "scale(1.4)" }} />

        <svg width="220" height="200" viewBox="0 0 220 200" fill="none" xmlns="http://www.w3.org/2000/svg" className="relative">
          {/* Ground shadow */}
          <ellipse cx="110" cy="188" rx="72" ry="10" fill="#e2e8f0" />

          {/* File / page body */}
          <rect x="52" y="28" width="116" height="148" rx="10" fill="white" stroke="#e2e8f0" strokeWidth="2" />

          {/* Folded corner */}
          <path d="M136 28 L168 60 L136 60 Z" fill="#f1f5f9" stroke="#e2e8f0" strokeWidth="1.5" />
          <path d="M136 28 L136 60 L168 60" fill="none" stroke="#e2e8f0" strokeWidth="1.5" />

          {/* Lines on page */}
          <rect x="68" y="76" width="56" height="7" rx="3.5" fill="#f1f5f9" />
          <rect x="68" y="94" width="84" height="6" rx="3" fill="#f8fafc" />
          <rect x="68" y="108" width="72" height="6" rx="3" fill="#f8fafc" />
          <rect x="68" y="122" width="60" height="6" rx="3" fill="#f8fafc" />

          {/* Big 404 on page */}
          <text x="110" y="68" textAnchor="middle" fontFamily="system-ui, sans-serif" fontWeight="800"
            fontSize="26" fill="url(#grad404)">404</text>

          {/* Magnifying glass */}
          <circle cx="148" cy="138" r="22" fill="white" stroke="#cbd5e1" strokeWidth="2.5" />
          <circle cx="148" cy="138" r="14" fill="none" stroke="url(#grad404)" strokeWidth="3" />
          <line x1="158" y1="150" x2="170" y2="164" stroke="url(#grad404)" strokeWidth="3.5" strokeLinecap="round" />

          {/* Question mark inside magnifier */}
          <text x="148" y="144" textAnchor="middle" fontFamily="system-ui, sans-serif" fontWeight="800"
            fontSize="14" fill="url(#grad404)">?</text>

          {/* Small star sparkles */}
          <circle cx="44" cy="52" r="4" fill="#fca5a5" opacity="0.7" />
          <circle cx="178" cy="32" r="3" fill="#fdba74" opacity="0.7" />
          <circle cx="40" cy="150" r="2.5" fill="#fca5a5" opacity="0.5" />
          <circle cx="185" cy="110" r="2" fill="#fdba74" opacity="0.6" />

          <defs>
            <linearGradient id="grad404" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#DC2626" />
              <stop offset="100%" stopColor="#F97316" />
            </linearGradient>
          </defs>
        </svg>
      </div>

      {/* Text */}
      <h1 className="text-3xl font-extrabold text-slate-900 mb-2 tracking-tight">Page Not Found</h1>
      <p className="text-slate-500 text-base max-w-sm mb-8">
        The page you&apos;re looking for doesn&apos;t exist or may have been moved.
      </p>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Link href="/dashboard"
          className="px-6 py-2.5 text-white font-bold rounded-xl text-sm shadow-md shadow-orange-200 hover:opacity-90 active:scale-95 transition-all"
          style={{ background: "linear-gradient(135deg, #DC2626, #F97316)" }}>
          Go to Dashboard
        </Link>
        <Link href="/login"
          className="px-6 py-2.5 bg-white border border-slate-200 text-slate-700 font-semibold rounded-xl text-sm hover:bg-slate-50 active:scale-95 transition-all">
          Back to Login
        </Link>
      </div>

      {/* Subtle brand */}
      <p className="mt-10 text-xs text-slate-300 font-medium tracking-widest uppercase">Atlas HR</p>
    </div>
  );
}
