"use client";
import { createContext, useContext, useState, useCallback, useEffect } from "react";

type ToastType = "success" | "error" | "info" | "warning";

interface Toast {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
}

interface ToastContextType {
  success: (title: string, message?: string) => void;
  error:   (title: string, message?: string) => void;
  info:    (title: string, message?: string) => void;
  warning: (title: string, message?: string) => void;
}

const ToastContext = createContext<ToastContextType | null>(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside ToastProvider");
  return ctx;
}

const TOAST_CONFIG: Record<ToastType, { icon: string; bar: string; bg: string; title: string; ring: string }> = {
  success: { icon: "✓", bar: "bg-green-500",  bg: "bg-white", title: "text-green-700", ring: "ring-green-100" },
  error:   { icon: "✕", bar: "bg-red-500",    bg: "bg-white", title: "text-red-600",   ring: "ring-red-100"   },
  info:    { icon: "i", bar: "bg-blue-500",   bg: "bg-white", title: "text-blue-700",  ring: "ring-blue-100"  },
  warning: { icon: "!", bar: "bg-orange-400", bg: "bg-white", title: "text-orange-600",ring: "ring-orange-100"},
};

function ToastItem({ toast, onClose }: { toast: Toast; onClose: () => void }) {
  const cfg = TOAST_CONFIG[toast.type];

  useEffect(() => {
    const t = setTimeout(onClose, 4000);
    return () => clearTimeout(t);
  }, [onClose]);

  return (
    <div
      className={`relative flex items-start gap-3 w-80 rounded-2xl shadow-lg ring-1 ${cfg.ring} ${cfg.bg} px-4 py-3.5 overflow-hidden toast-enter pointer-events-auto`}
    >
      {/* Left accent bar */}
      <div className={`absolute left-0 top-0 bottom-0 w-1 rounded-l-2xl ${cfg.bar}`} />

      {/* Icon */}
      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-black text-white shrink-0 mt-0.5 ${cfg.bar}`}>
        {cfg.icon}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-bold leading-snug ${cfg.title}`}>{toast.title}</p>
        {toast.message && <p className="text-xs text-gray-400 mt-0.5 leading-snug">{toast.message}</p>}
      </div>

      {/* Close */}
      <button
        onClick={onClose}
        className="shrink-0 text-gray-300 hover:text-gray-500 transition-colors p-0.5 rounded mt-0.5"
      >
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      {/* Auto-dismiss progress */}
      <div className={`absolute bottom-0 left-0 h-0.5 ${cfg.bar} opacity-30 toast-progress`} />
    </div>
  );
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const add = useCallback((type: ToastType, title: string, message?: string) => {
    const id = Math.random().toString(36).slice(2);
    setToasts(prev => [...prev.slice(-4), { id, type, title, message }]);
  }, []);

  const remove = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const value: ToastContextType = {
    success: (t, m) => add("success", t, m),
    error:   (t, m) => add("error",   t, m),
    info:    (t, m) => add("info",    t, m),
    warning: (t, m) => add("warning", t, m),
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
      {/* Toast stack — bottom right */}
      <div className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-2.5 pointer-events-none">
        {toasts.map(toast => (
          <ToastItem key={toast.id} toast={toast} onClose={() => remove(toast.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}
