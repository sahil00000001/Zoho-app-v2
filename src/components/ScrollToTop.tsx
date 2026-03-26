"use client";
import { useEffect, useState } from "react";

export default function ScrollToTop() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Watch the main scrollable container (MainContainer uses overflow-y-auto)
    const container = document.querySelector(".flex-1.overflow-y-auto") as HTMLElement | null;
    if (!container) return;

    const onScroll = () => setVisible(container.scrollTop > 300);
    container.addEventListener("scroll", onScroll, { passive: true });
    return () => container.removeEventListener("scroll", onScroll);
  }, []);

  const scrollUp = () => {
    const container = document.querySelector(".flex-1.overflow-y-auto") as HTMLElement | null;
    container?.scrollTo({ top: 0, behavior: "smooth" });
  };

  if (!visible) return null;

  return (
    <button
      onClick={scrollUp}
      aria-label="Scroll to top"
      className="fixed bottom-6 left-6 z-[9990] w-9 h-9 rounded-full flex items-center justify-center shadow-lg transition-all hover:scale-110 active:scale-95"
      style={{
        background: "linear-gradient(135deg, rgb(220,38,38), rgb(249,115,22))",
        boxShadow: "0 4px 14px rgba(220,38,38,0.35)",
        animation: "scaleIn 0.18s ease forwards",
      }}
    >
      <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 15l7-7 7 7" />
      </svg>
    </button>
  );
}
