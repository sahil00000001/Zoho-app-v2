"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

function LoginForm() {
  const router = useRouter();
  const { login } = useAuth();
  const [step, setStep] = useState<"email" | "otp">("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp]   = useState("");
  const [loading, setLoading]   = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState("");

  // ── DEV ONLY: direct login bypass ─────────────────────────
  const [devEmail, setDevEmail] = useState("");
  const [devLoading, setDevLoading] = useState(false);
  const [showDev, setShowDev] = useState(false);

  const devLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setDevLoading(true); setError("");
    try {
      await api.sendOtp(devEmail);
      setEmail(devEmail);
      setStep("otp");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setDevLoading(false);
    }
  };
  // ──────────────────────────────────────────────────────────

  const sendOtp = async (e: React.FormEvent) => {
    e.preventDefault(); setError(""); setLoading(true);
    try { await api.sendOtp(email); setStep("otp"); }
    catch (err) { setError(err instanceof Error ? err.message : "Failed to send code"); }
    finally { setLoading(false); }
  };

  const verifyOtp = async (e: React.FormEvent) => {
    e.preventDefault(); setError(""); setLoading(true);
    try { await login(email, otp); router.push("/dashboard"); }
    catch (err) { setError(err instanceof Error ? err.message : "Invalid code"); }
    finally { setLoading(false); }
  };

  const resend = async () => {
    setResending(true); setError("");
    try { await api.sendOtp(email); }
    catch (err) { setError(err instanceof Error ? err.message : "Failed to resend"); }
    finally { setResending(false); }
  };

  const inputCls = "w-full h-[44px] px-4 rounded-[10px] border border-slate-200 focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none transition-all text-sm text-slate-900 placeholder:text-slate-400";

  return (
    <div className="w-full max-w-[380px] flex flex-col">
      {step === "email" ? (
        <>
          <div className="mb-6">
            <h2 className="text-[26px] font-bold text-slate-900 mb-1">Welcome back</h2>
            <p className="text-slate-500 text-sm">Enter your work email to receive a sign-in code</p>
          </div>
          <form onSubmit={sendOtp} className="flex flex-col gap-5">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider" htmlFor="email">
                Email address
              </label>
              <input id="email" type="email" required value={email} onChange={e => setEmail(e.target.value)}
                placeholder="name@company.com" className={inputCls} autoFocus />
            </div>
            {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl">{error}</div>}
            <div className="pt-1">
              <button type="submit" disabled={loading}
                className="w-full h-[44px] text-white font-bold rounded-[12px] flex items-center justify-center gap-2 transition-all disabled:opacity-60"
                style={{ background: "linear-gradient(135deg, #DC2626 0%, #F97316 100%)", boxShadow: "0 4px 14px rgba(220,38,38,0.30)" }}>
                {loading
                  ? <><span className="w-4 h-4 rounded-full border-2 border-white/40 border-t-white animate-spin" />Sending code…</>
                  : "Send sign-in code →"}
              </button>
            </div>
          </form>
        </>
      ) : (
        <>
          <button onClick={() => { setStep("email"); setOtp(""); setError(""); }}
            className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 mb-5 transition-colors">
            ← Back
          </button>
          <div className="mb-6">
            <h2 className="text-[26px] font-bold text-slate-900 mb-1">Check your email</h2>
            <p className="text-slate-500 text-sm">We sent a 6-digit code to</p>
            <p className="font-semibold text-slate-800 text-sm mt-0.5">{email}</p>
          </div>
          <form onSubmit={verifyOtp} className="flex flex-col gap-5">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider" htmlFor="otp">
                Sign-in code
              </label>
              <input id="otp" type="text" inputMode="numeric" pattern="[0-9]{6}" maxLength={6} required
                value={otp} onChange={e => setOtp(e.target.value.replace(/\D/g, ""))}
                placeholder="000000"
                className={`${inputCls} text-center text-2xl font-mono tracking-[0.4em]`} autoFocus />
              <p className="text-xs text-slate-400 text-center">Code expires in 10 minutes</p>
            </div>
            {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl">{error}</div>}
            <div className="pt-1">
              <button type="submit" disabled={loading || otp.length !== 6}
                className="w-full h-[44px] text-white font-bold rounded-[12px] flex items-center justify-center gap-2 transition-all disabled:opacity-60"
                style={{ background: "linear-gradient(135deg, #DC2626 0%, #F97316 100%)", boxShadow: "0 4px 14px rgba(220,38,38,0.30)" }}>
                {loading
                  ? <><span className="w-4 h-4 rounded-full border-2 border-white/40 border-t-white animate-spin" />Verifying…</>
                  : "Sign in →"}
              </button>
            </div>
            <div className="text-center">
              <p className="text-sm text-slate-500">
                Didn&apos;t receive it?{" "}
                <button type="button" onClick={resend} disabled={resending}
                  className="font-bold text-red-600 hover:text-red-700 transition-colors">
                  {resending ? "Sending…" : "Resend code"}
                </button>
              </p>
            </div>
          </form>
        </>
      )}

      {/* SSO divider */}
      <div className="mt-6 flex items-center gap-3">
        <div className="flex-1 h-px bg-slate-100" />
        <span className="text-xs text-slate-400 font-medium">or sign in with</span>
        <div className="flex-1 h-px bg-slate-100" />
      </div>

      {/* SSO Buttons */}
      <div className="mt-4 flex flex-col gap-2.5">
        <a
          href={`${API_BASE}/api/auth/google`}
          className="w-full h-[44px] flex items-center justify-center gap-3 rounded-[12px] border border-slate-200 bg-white text-sm font-semibold text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-all"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          Continue with Google
        </a>

        <a
          href={`${API_BASE}/api/auth/microsoft`}
          className="w-full h-[44px] flex items-center justify-center gap-3 rounded-[12px] border border-slate-200 bg-white text-sm font-semibold text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-all"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <rect x="1" y="1" width="10" height="10" fill="#F25022"/>
            <rect x="13" y="1" width="10" height="10" fill="#7FBA00"/>
            <rect x="1" y="13" width="10" height="10" fill="#00A4EF"/>
            <rect x="13" y="13" width="10" height="10" fill="#FFB900"/>
          </svg>
          Continue with Microsoft
        </a>
      </div>

      {/* ── DEV ONLY — remove before go-live ─────────────────── */}
      <div className="mt-5">
        <button
          type="button"
          onClick={() => setShowDev(v => !v)}
          className="w-full flex items-center justify-center gap-2 py-2 rounded-xl border border-dashed border-amber-300 bg-amber-50 text-amber-700 text-xs font-semibold hover:bg-amber-100 transition-colors"
        >
          ⚠️ Dev Login {showDev ? "▲" : "▼"}
        </button>
        {showDev && (
          <form onSubmit={devLogin} className="mt-2 flex gap-2">
            <input
              type="email"
              required
              placeholder="dev@email.com"
              value={devEmail}
              onChange={e => setDevEmail(e.target.value)}
              className="flex-1 h-[38px] px-3 rounded-lg border border-amber-300 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300 bg-amber-50"
            />
            <button
              type="submit"
              disabled={devLoading}
              className="h-[38px] px-4 rounded-lg bg-amber-400 hover:bg-amber-500 text-white text-xs font-bold disabled:opacity-60 transition-colors"
            >
              {devLoading ? "…" : "Go"}
            </button>
          </form>
        )}
      </div>
      {/* ── end DEV ONLY ─────────────────────────────────────── */}

      <div className="mt-6 text-center">
        <p className="text-[12px] text-slate-500">
          Don&apos;t have an account?{" "}
          <span className="font-semibold text-slate-700">Contact your HR admin</span>
        </p>
      </div>

      <div className="mt-4 pt-4 border-t border-slate-100 flex items-center gap-2 text-xs text-slate-400">
        <span>🔒</span>
        <span>256-bit encrypted · SOC 2 compliant · GDPR ready</span>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <AuthProvider>
      <div className="h-screen flex overflow-hidden font-sans">
        {/* Left panel */}
        <section className="hidden lg:flex lg:w-[45%] relative flex-col items-center justify-center p-12 text-white"
          style={{ background: "linear-gradient(135deg, #DC2626 0%, #F97316 100%)" }}>
          {/* Grid overlay */}
          <div className="absolute inset-0 opacity-30"
            style={{ backgroundImage: "radial-gradient(rgba(255,255,255,0.15) 1px, transparent 1px)", backgroundSize: "32px 32px" }} />
          <div className="relative z-10 flex flex-col items-center text-center max-w-sm">
            {/* Logo */}
            <div className="w-16 h-16 rounded-xl border-2 border-white/30 flex items-center justify-center mb-6 bg-white/10 backdrop-blur-sm">
              <span className="text-3xl font-black text-white">A</span>
            </div>
            <h1 className="text-[28px] font-bold tracking-tight mb-1">Atlas HR</h1>
            <p className="text-white/80 text-sm font-medium mb-12">Workforce Platform</p>
            {/* Features */}
            <ul className="space-y-5 text-left w-full px-4">
              {["Smart attendance tracking", "Leave & approvals workflow", "Team analytics & insights"].map(f => (
                <li key={f} className="flex items-center gap-4">
                  <div className="flex-shrink-0 w-5 h-5 rounded-full bg-white/20 flex items-center justify-center">
                    <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <span className="text-[15px] font-medium">{f}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Right panel */}
        <section className="w-full lg:w-[55%] flex flex-col items-center justify-center p-8 relative bg-white">
          {/* Mobile logo */}
          <div className="lg:hidden mb-8 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-black text-base"
              style={{ background: "linear-gradient(135deg, #DC2626, #F97316)" }}>A</div>
            <span className="font-black text-xl text-slate-900">Atlas HR</span>
          </div>
          <LoginForm />
          <p className="absolute bottom-6 text-[11px] text-slate-400 tracking-wide font-medium">
            Atlas HR · Secured · v2.0
          </p>
        </section>
      </div>
    </AuthProvider>
  );
}
