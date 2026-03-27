"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";

function LoginForm() {
  const router = useRouter();
  const { login } = useAuth();
  const [step, setStep] = useState<"email" | "otp">("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp]   = useState("");
  const [loading, setLoading]   = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState("");

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

      <div className="mt-6 text-center">
        <p className="text-[12px] text-slate-500">
          Don&apos;t have an account?{" "}
          <span className="font-semibold text-slate-700">Contact your HR admin</span>
        </p>
      </div>

      <div className="mt-6 pt-5 border-t border-slate-100 flex items-center gap-2 text-xs text-slate-400">
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
