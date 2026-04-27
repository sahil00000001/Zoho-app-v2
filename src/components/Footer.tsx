"use client";

const year = new Date().getFullYear();

export default function Footer() {
  return (
    <footer className="mt-auto border-t border-slate-100 bg-white">
      <div className="px-6 py-5 flex flex-col sm:flex-row items-center justify-between gap-3">

        {/* Left — brand */}
        <div className="flex items-center gap-2.5">
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-xs font-bold shrink-0"
            style={{ background: "linear-gradient(135deg, rgb(220,38,38), rgb(249,115,22))" }}
          >
            A
          </div>
          <span className="text-xs text-slate-500">
            © {year} <span className="font-semibold text-slate-700">POD-Atlas HR</span> · Built by PodTech
          </span>
        </div>

        {/* Right — contact + legal */}
        <div className="flex items-center gap-4">
          <a
            href="mailto:sahil.vashisht@podtech.com"
            className="text-xs text-slate-400 hover:text-red-600 transition-colors"
          >
            sahil.vashisht@podtech.com
          </a>
          <span className="text-slate-200 text-xs">·</span>
          <a href="#" className="text-xs text-slate-400 hover:text-slate-600 transition-colors">Privacy</a>
          <span className="text-slate-200 text-xs">·</span>
          <a href="#" className="text-xs text-slate-400 hover:text-slate-600 transition-colors">Terms</a>
        </div>

      </div>
    </footer>
  );
}
