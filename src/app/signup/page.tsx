"use client";
import Link from "next/link";

export default function SignupPage() {
  return (
    <div className="min-h-screen bg-white flex">
      {/* Left panel */}
      <div
        className="hidden lg:flex lg:w-1/2 flex-col justify-between p-12 relative overflow-hidden"
        style={{ background: "linear-gradient(135deg, rgb(220,38,38) 0%, rgb(249,115,22) 100%)" }}
      >
        <div className="absolute inset-0 opacity-10">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="absolute rounded-full border-2 border-white"
              style={{ width: `${(i + 1) * 120}px`, height: `${(i + 1) * 120}px`, top: "50%", left: "50%", transform: "translate(-50%, -50%)" }}
            />
          ))}
        </div>
        <div className="relative z-10">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center">
              <span className="text-white font-black text-base">A</span>
            </div>
            <span className="text-white font-black text-xl">POD-Atlas</span>
          </Link>
        </div>
        <div className="relative z-10">
          <h2 className="text-4xl font-black text-white mb-4 leading-tight">
            Enterprise-grade HR,<br />without the complexity.
          </h2>
          <p className="text-white/75 text-lg leading-relaxed mb-10">
            POD-Atlas is a fully managed HR platform. Your system administrator
            creates and manages all employee accounts.
          </p>
          <div className="space-y-4">
            {[
              "Secure OTP-based login — no passwords needed",
              "Role-based access: Employee, Manager, HR, Admin",
              "Full attendance, leaves & approvals suite",
            ].map((t) => (
              <div key={t} className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center text-white text-xs font-bold shrink-0">✓</div>
                <span className="text-white/85 text-sm font-medium">{t}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="relative z-10 flex items-center gap-3">
          <div className="flex -space-x-2">
            {["SC", "MW", "PN", "AK"].map((a, i) => (
              <div key={i} className="w-8 h-8 rounded-full bg-white/30 border-2 border-white flex items-center justify-center text-white text-xs font-bold">{a}</div>
            ))}
          </div>
          <p className="text-white/70 text-sm">Trusted by 12,000+ employees</p>
        </div>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex flex-col justify-center px-6 lg:px-16 xl:px-24">
        <div className="lg:hidden mb-8">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "linear-gradient(135deg, rgb(220,38,38), rgb(249,115,22))" }}>
              <span className="text-white font-black text-sm">A</span>
            </div>
            <span className="font-black text-xl tracking-tight gradient-text">POD-Atlas</span>
          </Link>
        </div>

        <div className="max-w-md w-full mx-auto lg:mx-0">
          {/* Icon */}
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center mb-6"
            style={{ background: "linear-gradient(135deg, rgb(220,38,38), rgb(249,115,22))" }}
          >
            <span className="text-white text-2xl">🔐</span>
          </div>

          <h1 className="text-3xl font-black text-gray-900 mb-2">Account access</h1>
          <p className="text-gray-500 mb-8">
            POD-Atlas accounts are created and managed by your organization&apos;s system administrator.
          </p>

          {/* Info cards */}
          <div className="space-y-3 mb-8">
            {[
              {
                icon: "📧",
                title: "Already have an account?",
                desc: "Sign in with your work email. You'll receive a one-time code.",
                action: { label: "Sign in →", href: "/login" },
              },
              {
                icon: "👤",
                title: "New to POD-Atlas?",
                desc: "Ask your HR team or system administrator to create your account.",
                action: null,
              },
              {
                icon: "🏢",
                title: "Setting up for your company?",
                desc: "Contact our team to onboard your organization.",
                action: null,
              },
            ].map((card) => (
              <div key={card.title} className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                <div className="flex items-start gap-3">
                  <span className="text-xl shrink-0">{card.icon}</span>
                  <div className="flex-1">
                    <div className="text-sm font-semibold text-gray-900">{card.title}</div>
                    <p className="text-xs text-gray-500 mt-0.5">{card.desc}</p>
                    {card.action && (
                      <Link
                        href={card.action.href}
                        className="inline-block mt-2 text-xs font-bold transition-colors"
                        style={{ color: "rgb(220,38,38)" }}
                      >
                        {card.action.label}
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <Link
            href="/login"
            className="w-full text-white font-bold py-3.5 rounded-xl text-sm transition-all flex items-center justify-center"
            style={{ background: "linear-gradient(90deg, rgb(220,38,38), rgb(249,115,22))", boxShadow: "0 8px 24px rgba(220,38,38,0.25)" }}
          >
            Go to sign in →
          </Link>

          <div className="mt-8 pt-6 border-t border-gray-100">
            <div className="flex items-center gap-3 text-xs text-gray-400">
              <span>🔒</span>
              <span>256-bit encrypted · SOC 2 compliant · GDPR ready</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
