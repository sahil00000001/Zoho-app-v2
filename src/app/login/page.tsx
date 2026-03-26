"use client";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";

function LoginForm() {
  const router = useRouter();
  const { login } = useAuth();
  const [step, setStep] = useState<'email' | 'otp'>('email');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [resending, setResending] = useState(false);

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await api.sendOtp(email);
      setStep('otp');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, otp);
      router.push('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setResending(true);
    setError('');
    try {
      await api.sendOtp(email);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to resend OTP');
    } finally {
      setResending(false);
    }
  };

  const inputClass = "w-full px-4 py-3 rounded-xl border border-gray-200 text-gray-900 text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all";

  return (
    <div className="max-w-md w-full mx-auto lg:mx-0">
      {step === 'email' ? (
        <>
          <h1 className="text-3xl font-black text-gray-900 mb-2">Welcome back</h1>
          <p className="text-gray-500 mb-8">Enter your work email to receive a sign-in code</p>

          <form onSubmit={handleEmailSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Work email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                required
                className={inputClass}
                autoFocus
              />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full text-white font-bold py-3.5 rounded-xl text-sm transition-all disabled:opacity-70 flex items-center justify-center gap-2"
              style={{ background: "linear-gradient(90deg, rgb(220,38,38), rgb(249,115,22))", boxShadow: loading ? "none" : "0 8px 24px rgba(220,38,38,0.25)" }}
            >
              {loading ? (
                <><span className="w-4 h-4 rounded-full border-2 border-white/40 border-t-white animate-spin" />Sending code...</>
              ) : "Send sign-in code →"}
            </button>
          </form>
        </>
      ) : (
        <>
          <button onClick={() => { setStep('email'); setOtp(''); setError(''); }} className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 mb-6 transition-colors">
            ← Back
          </button>
          <h1 className="text-3xl font-black text-gray-900 mb-2">Check your email</h1>
          <p className="text-gray-500 mb-2">We sent a 6-digit code to</p>
          <p className="font-semibold text-gray-800 mb-3">{email}</p>
          <p className="text-xs text-gray-400 mb-6">Can&apos;t find it? Check your spam/junk folder. The code expires in 10 minutes.</p>

          <form onSubmit={handleOtpSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Sign-in code</label>
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]{6}"
                maxLength={6}
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                placeholder="000000"
                required
                className={`${inputClass} text-center text-2xl font-mono tracking-[0.5em]`}
                autoFocus
              />
              <p className="text-xs text-gray-400 mt-1.5 text-center">Code expires in 10 minutes</p>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || otp.length !== 6}
              className="w-full text-white font-bold py-3.5 rounded-xl text-sm transition-all disabled:opacity-70 flex items-center justify-center gap-2"
              style={{ background: "linear-gradient(90deg, rgb(220,38,38), rgb(249,115,22))", boxShadow: loading ? "none" : "0 8px 24px rgba(220,38,38,0.25)" }}
            >
              {loading ? (
                <><span className="w-4 h-4 rounded-full border-2 border-white/40 border-t-white animate-spin" />Verifying...</>
              ) : "Sign in →"}
            </button>

            <div className="text-center">
              <p className="text-sm text-gray-500">
                Didn&apos;t receive it?{" "}
                <button type="button" onClick={handleResend} disabled={resending} className="font-bold transition-colors" style={{ color: "rgb(220,38,38)" }}>
                  {resending ? "Sending..." : "Resend code"}
                </button>
              </p>
            </div>
          </form>
        </>
      )}

      <div className="mt-6 text-center">
        <p className="text-sm text-gray-500">
          Don&apos;t have an account?{" "}
          <Link href="/signup" className="font-bold" style={{ color: "rgb(220,38,38)" }}>Contact your admin</Link>
        </p>
      </div>

      <div className="mt-8 pt-6 border-t border-gray-100">
        <div className="flex items-center gap-3 text-xs text-gray-400">
          <span>🔒</span>
          <span>256-bit encrypted · SOC 2 compliant · GDPR ready</span>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <AuthProvider>
      <div className="min-h-screen bg-white flex">
        {/* Left panel */}
        <div
          className="hidden lg:flex lg:w-1/2 flex-col justify-between p-12 relative overflow-hidden"
          style={{ background: "linear-gradient(135deg, rgb(220,38,38) 0%, rgb(249,115,22) 100%)" }}
        >
          <div className="absolute inset-0 opacity-10">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="absolute rounded-full border-2 border-white" style={{ width: `${(i+1)*120}px`, height: `${(i+1)*120}px`, top: "50%", left: "50%", transform: "translate(-50%, -50%)" }} />
            ))}
          </div>
          <div className="relative z-10">
            <Link href="/" className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center">
                <span className="text-white font-black text-base">A</span>
              </div>
              <span className="text-white font-black text-xl">Atlas</span>
            </Link>
          </div>
          <div className="relative z-10">
            <h2 className="text-4xl font-black text-white mb-4 leading-tight">Your team&apos;s HR,<br />simplified.</h2>
            <p className="text-white/75 text-lg leading-relaxed mb-10">Manage attendance, leaves, approvals, and docs — all in one place.</p>
            <div className="space-y-4">
              {["One-click attendance tracking", "Smart leave management", "Instant approval workflows"].map((t) => (
                <div key={t} className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center text-white text-xs font-bold shrink-0">✓</div>
                  <span className="text-white/85 text-sm font-medium">{t}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="relative z-10 flex items-center gap-3">
            <div className="flex -space-x-2">
              {["SC","MW","PN","AK"].map((a, i) => (
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
                <span className="text-white font-black text-sm">P</span>
              </div>
              <span className="font-black text-xl text-gray-900">Atlas</span>
            </Link>
          </div>
          <LoginForm />
        </div>
      </div>
    </AuthProvider>
  );
}
