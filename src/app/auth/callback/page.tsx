"use client";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { api } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { Suspense } from "react";

function CallbackHandler() {
  const router = useRouter();
  const params = useSearchParams();
  const { loginWithTokens } = useAuth();
  const [error, setError] = useState("");

  useEffect(() => {
    const accessToken = params.get("accessToken");
    const refreshToken = params.get("refreshToken");
    const err = params.get("error");

    if (err) {
      setError(decodeURIComponent(err));
      return;
    }

    if (accessToken && refreshToken) {
      api.setTokens(accessToken, refreshToken);
      loginWithTokens(accessToken, refreshToken)
        .then(() => router.replace("/dashboard"))
        .catch(() => setError("Failed to complete sign-in. Please try again."));
    } else {
      setError("Missing authentication tokens. Please try again.");
    }
  }, [params, router, loginWithTokens]);

  if (error) {
    return (
      <div className="h-screen flex flex-col items-center justify-center gap-4">
        <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center text-2xl">✕</div>
        <h2 className="text-lg font-bold text-slate-900">Sign-in failed</h2>
        <p className="text-sm text-slate-500 max-w-xs text-center">{error}</p>
        <button
          onClick={() => router.replace("/login")}
          className="mt-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white"
          style={{ background: "linear-gradient(135deg, #DC2626, #F97316)" }}
        >
          Back to Login
        </button>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col items-center justify-center gap-4">
      <div className="w-10 h-10 rounded-full border-2 border-red-500/20 border-t-red-500 animate-spin" />
      <p className="text-sm text-slate-500 font-medium">Completing sign-in…</p>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <AuthProvider>
      <Suspense fallback={
        <div className="h-screen flex items-center justify-center">
          <div className="w-10 h-10 rounded-full border-2 border-red-500/20 border-t-red-500 animate-spin" />
        </div>
      }>
        <CallbackHandler />
      </Suspense>
    </AuthProvider>
  );
}
