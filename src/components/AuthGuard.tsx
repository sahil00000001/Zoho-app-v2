"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="flex flex-col items-center gap-4">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: "linear-gradient(135deg, rgb(220,38,38), rgb(249,115,22))" }}
          >
            <span className="text-white font-black text-base">P</span>
          </div>
          <div className="w-6 h-6 rounded-full border-2 border-red-500/20 border-t-red-500 animate-spin" />
        </div>
      </div>
    );
  }

  if (!user) return null;

  return <>{children}</>;
}
