"use client";

// ── Gradient ring SVG spinner (used for inline/mini states only) ───────────
function GradientRing({ size = 48, strokeWidth = 4 }: { size?: number; strokeWidth?: number }) {
  const r = (size - strokeWidth * 2) / 2;
  const circ = 2 * Math.PI * r;
  const dash = circ * 0.72;
  const gap  = circ - dash;

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className="animate-spin"
      style={{ animationDuration: "0.9s", animationTimingFunction: "linear" }}
    >
      <defs>
        <linearGradient id="spinner-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%"   stopColor="rgb(220,38,38)" />
          <stop offset="100%" stopColor="rgb(249,115,22)" />
        </linearGradient>
      </defs>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgb(220,38,38)" strokeOpacity="0.1" strokeWidth={strokeWidth} />
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="url(#spinner-grad)" strokeWidth={strokeWidth}
        strokeLinecap="round" strokeDasharray={`${dash} ${gap}`} strokeDashoffset={dash * 0.25} />
    </svg>
  );
}

// ── Full-page loader ────────────────────────────────────────────────────────
export function PageLoader({ label: _label }: { label?: string }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-white">
      {/* Ambient glow blobs */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-64 h-64 rounded-full opacity-[0.07] blur-3xl pointer-events-none"
        style={{ background: "rgb(220,38,38)" }} />

      <div className="flex flex-col items-center gap-8">
        {/* Logo */}
        <div className="relative">
          {/* Soft radial glow behind logo */}
          <div className="absolute -inset-3 rounded-3xl blur-2xl opacity-40 animate-pulse-soft"
            style={{ background: "linear-gradient(135deg, rgb(220,38,38), rgb(249,115,22))" }} />
          <div
            className="relative w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg"
            style={{
              background: "linear-gradient(135deg, rgb(220,38,38), rgb(249,115,22))",
              animation: "logo-breathe 2.4s ease-in-out infinite",
            }}
          >
            <span className="text-white font-black text-2xl select-none">A</span>
          </div>
        </div>

        {/* Thin indeterminate progress bar */}
        <div className="w-32 h-[3px] rounded-full overflow-hidden bg-gray-100">
          <div
            className="h-full rounded-full"
            style={{
              background: "linear-gradient(90deg, rgb(220,38,38), rgb(249,115,22), rgb(220,38,38))",
              backgroundSize: "200% 100%",
              animation: "bar-slide 1.6s ease-in-out infinite",
            }}
          />
        </div>
      </div>
    </div>
  );
}

// ── Section loader (inline page-level) ─────────────────────────────────────
export function SectionLoader({ label }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-4">
      <GradientRing size={40} strokeWidth={3} />
      {label && <span className="text-xs font-medium text-gray-400">{label}</span>}
    </div>
  );
}

// ── Inline mini spinner (buttons, rows) ────────────────────────────────────
export function MiniSpinner({ size = 16 }: { size?: number }) {
  return <GradientRing size={size} strokeWidth={2} />;
}
