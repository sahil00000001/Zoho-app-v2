"use client";

// ── Gradient ring SVG spinner ─────────────────────────────────────────────
function GradientRing({ size = 48, strokeWidth = 4 }: { size?: number; strokeWidth?: number }) {
  const r = (size - strokeWidth * 2) / 2;
  const circ = 2 * Math.PI * r;
  const dash = circ * 0.72; // 72% filled arc
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
      {/* Track */}
      <circle
        cx={size / 2} cy={size / 2} r={r}
        fill="none"
        stroke="rgb(220,38,38)"
        strokeOpacity="0.1"
        strokeWidth={strokeWidth}
      />
      {/* Arc */}
      <circle
        cx={size / 2} cy={size / 2} r={r}
        fill="none"
        stroke="url(#spinner-grad)"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeDasharray={`${dash} ${gap}`}
        strokeDashoffset={dash * 0.25}
      />
    </svg>
  );
}

// ── Bouncing dots ─────────────────────────────────────────────────────────
function BounceDots() {
  return (
    <div className="flex items-center gap-1.5">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="w-1.5 h-1.5 rounded-full bounce-dot"
          style={{
            background: "linear-gradient(135deg, rgb(220,38,38), rgb(249,115,22))",
            animationDelay: `${i * 0.15}s`,
          }}
        />
      ))}
    </div>
  );
}

// ── Full-page loader (used by AuthGuard & route loading.tsx) ─────────────
export function PageLoader({ label = "Loading" }: { label?: string }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-white">
      {/* Subtle background blobs */}
      <div
        className="absolute top-1/4 left-1/3 w-72 h-72 rounded-full opacity-[0.06] blur-3xl pointer-events-none"
        style={{ background: "rgb(220,38,38)" }}
      />
      <div
        className="absolute bottom-1/4 right-1/3 w-56 h-56 rounded-full opacity-[0.05] blur-3xl pointer-events-none"
        style={{ background: "rgb(249,115,22)" }}
      />

      <div className="flex flex-col items-center gap-6">
        {/* Logo with glow */}
        <div className="relative">
          <div
            className="absolute inset-0 rounded-2xl blur-xl opacity-50 animate-pulse-soft"
            style={{ background: "linear-gradient(135deg, rgb(220,38,38), rgb(249,115,22))" }}
          />
          <div
            className="relative w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg"
            style={{ background: "linear-gradient(135deg, rgb(220,38,38), rgb(249,115,22))" }}
          >
            <span className="text-white font-black text-2xl select-none">P</span>
          </div>
        </div>

        {/* Gradient ring spinner */}
        <GradientRing size={44} strokeWidth={3.5} />

        {/* Label + dots */}
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-400 tracking-wide">{label}</span>
          <BounceDots />
        </div>
      </div>
    </div>
  );
}

// ── Section loader (used inline when a page section is loading) ──────────
export function SectionLoader({ label }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-4">
      <GradientRing size={40} strokeWidth={3} />
      {label && (
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-gray-400">{label}</span>
          <BounceDots />
        </div>
      )}
    </div>
  );
}

// ── Inline mini spinner (for buttons, rows, small states) ─────────────────
export function MiniSpinner({ size = 16 }: { size?: number }) {
  return <GradientRing size={size} strokeWidth={2} />;
}
