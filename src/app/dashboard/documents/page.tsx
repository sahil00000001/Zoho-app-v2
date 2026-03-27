"use client";
import { useState } from "react";

type DocCategory = "all" | "policies" | "contracts" | "handbooks" | "forms" | "reports";

interface Doc {
  id: number;
  name: string;
  category: Exclude<DocCategory, "all">;
  type: "pdf" | "doc" | "xlsx" | "ppt";
  size: string;
  updatedAt: string;
  updatedBy: string;
  version: string;
  tags: string[];
  pinned?: boolean;
}

const docs: Doc[] = [
  { id: 1, name: "Employee Handbook 2026", category: "handbooks", type: "pdf", size: "2.4 MB", updatedAt: "Mar 1, 2026", updatedBy: "Alex Kumar", version: "v3.2", tags: ["onboarding", "culture"], pinned: true },
  { id: 2, name: "Remote Work Policy", category: "policies", type: "pdf", size: "540 KB", updatedAt: "Mar 9, 2026", updatedBy: "Alex Kumar", version: "v2.1", tags: ["remote", "policy"], pinned: true },
  { id: 3, name: "Employment Contract Template", category: "contracts", type: "doc", size: "128 KB", updatedAt: "Feb 20, 2026", updatedBy: "Jake Brown", version: "v1.5", tags: ["legal", "hr"] },
  { id: 4, name: "Leave Application Form", category: "forms", type: "pdf", size: "85 KB", updatedAt: "Jan 15, 2026", updatedBy: "Alex Kumar", version: "v2.0", tags: ["leave", "forms"] },
  { id: 5, name: "Code of Conduct", category: "policies", type: "pdf", size: "320 KB", updatedAt: "Dec 10, 2025", updatedBy: "Legal Team", version: "v4.0", tags: ["compliance", "ethics"] },
  { id: 6, name: "Expense Reimbursement Policy", category: "policies", type: "pdf", size: "210 KB", updatedAt: "Nov 5, 2025", updatedBy: "Jake Brown", version: "v1.2", tags: ["finance", "policy"] },
  { id: 7, name: "Q1 2026 Headcount Report", category: "reports", type: "xlsx", size: "1.2 MB", updatedAt: "Apr 1, 2026", updatedBy: "Alex Kumar", version: "v1.0", tags: ["analytics", "headcount"] },
  { id: 8, name: "Benefits Overview 2026", category: "handbooks", type: "pdf", size: "890 KB", updatedAt: "Jan 2, 2026", updatedBy: "Alex Kumar", version: "v2.3", tags: ["benefits", "hr"] },
  { id: 9, name: "Performance Review Template", category: "forms", type: "doc", size: "95 KB", updatedAt: "Feb 1, 2026", updatedBy: "Alex Kumar", version: "v3.1", tags: ["performance", "forms"] },
  { id: 10, name: "NDA Template", category: "contracts", type: "doc", size: "72 KB", updatedAt: "Jan 10, 2026", updatedBy: "Legal Team", version: "v2.0", tags: ["legal", "nda"] },
  { id: 11, name: "IT Security Policy", category: "policies", type: "pdf", size: "445 KB", updatedAt: "Oct 15, 2025", updatedBy: "Dave Wilson", version: "v1.8", tags: ["security", "it"] },
  { id: 12, name: "Onboarding Checklist", category: "forms", type: "doc", size: "60 KB", updatedAt: "Mar 5, 2026", updatedBy: "Alex Kumar", version: "v4.2", tags: ["onboarding", "hr"] },
];

const typeConfig = {
  pdf: { icon: "📕", color: "rgb(220,38,38)", bg: "bg-red-50" },
  doc: { icon: "📘", color: "rgb(59,130,246)", bg: "bg-blue-50" },
  xlsx: { icon: "📗", color: "rgb(34,197,94)", bg: "bg-green-50" },
  ppt: { icon: "📙", color: "rgb(249,115,22)", bg: "bg-orange-50" },
};

const categories: { key: DocCategory; label: string; icon: string }[] = [
  { key: "all", label: "All Documents", icon: "📂" },
  { key: "policies", label: "Policies", icon: "📋" },
  { key: "contracts", label: "Contracts", icon: "📝" },
  { key: "handbooks", label: "Handbooks", icon: "📚" },
  { key: "forms", label: "Forms", icon: "📄" },
  { key: "reports", label: "Reports", icon: "📊" },
];

export default function DocumentsPage() {
  const [category, setCategory] = useState<DocCategory>("all");
  const [search, setSearch] = useState("");
  const [view, setView] = useState<"grid" | "list">("grid");
  const [uploading, setUploading] = useState(false);
  const [selected, setSelected] = useState<Doc | null>(null);

  const filtered = docs.filter(d =>
    (category === "all" || d.category === category) &&
    d.name.toLowerCase().includes(search.toLowerCase())
  );

  const pinned = filtered.filter(d => d.pinned);
  const rest = filtered.filter(d => !d.pinned);

  const handleUpload = () => {
    setUploading(true);
    setTimeout(() => setUploading(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Header + upload */}
      <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Organization Documents</h2>
          <p className="text-sm text-gray-500">{docs.length} documents · Always version-controlled</p>
        </div>
        <div className="flex gap-3">
          <button onClick={handleUpload} disabled={uploading}
            className="text-white text-sm font-bold px-5 py-2.5 rounded-xl flex items-center gap-2 disabled:opacity-70" style={{ background: "linear-gradient(90deg, rgb(220,38,38), rgb(249,115,22))" }}>
            {uploading ? <><span className="w-4 h-4 rounded-full border-2 border-white/40 border-t-white animate-spin" />Uploading...</> : <>⬆ Upload Document</>}
          </button>
        </div>
      </div>

      <div className="flex gap-6">
        {/* Sidebar categories */}
        <div className="hidden md:flex flex-col gap-1 w-48 shrink-0">
          {categories.map((c) => {
            const count = c.key === "all" ? docs.length : docs.filter(d => d.category === c.key).length;
            return (
              <button key={c.key} onClick={() => setCategory(c.key)}
                className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-all text-left ${category === c.key ? "text-white" : "text-gray-600 hover:bg-gray-50"}`}
                style={category === c.key ? { background: "linear-gradient(90deg, rgb(220,38,38), rgb(249,115,22))" } : {}}>
                <span>{c.icon}</span>
                <span className="flex-1">{c.label}</span>
                <span className={`text-xs px-1.5 py-0.5 rounded-full ${category === c.key ? "bg-white/20 text-white" : "bg-slate-100 text-gray-500"}`}>{count}</span>
              </button>
            );
          })}
        </div>

        {/* Main content */}
        <div className="flex-1 min-w-0 space-y-5">
          {/* Search + view toggle */}
          <div className="flex gap-3 items-center">
            <div className="flex items-center gap-2 bg-white rounded-xl px-4 py-2.5 border border-slate-200 flex-1">
              <span className="text-slate-400">🔍</span>
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search documents..." className="bg-transparent text-sm text-gray-700 placeholder-gray-400 focus:outline-none flex-1" />
            </div>
            <div className="flex gap-1 p-1 bg-slate-100 rounded-xl">
              {(["grid", "list"] as const).map((v) => (
                <button key={v} onClick={() => setView(v)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${view === v ? "text-white shadow-sm" : "text-gray-500"}`}
                  style={view === v ? { background: "linear-gradient(90deg, rgb(220,38,38), rgb(249,115,22))" } : {}}>
                  {v === "grid" ? "⊞" : "☰"}
                </button>
              ))}
            </div>
          </div>

          {/* Pinned */}
          {pinned.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-sm font-bold text-gray-700">📌 Pinned</span>
                <div className="h-0.5 flex-1 bg-slate-100 rounded" />
              </div>
              <div className={view === "grid" ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4" : "space-y-2"}>
                {pinned.map(d => <DocCard key={d.id} doc={d} view={view} onClick={() => setSelected(d)} />)}
              </div>
            </div>
          )}

          {/* Rest */}
          {rest.length > 0 && (
            <div>
              {pinned.length > 0 && (
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-sm font-bold text-gray-700">All</span>
                  <div className="h-0.5 flex-1 bg-slate-100 rounded" />
                </div>
              )}
              <div className={view === "grid" ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4" : "space-y-2"}>
                {rest.map(d => <DocCard key={d.id} doc={d} view={view} onClick={() => setSelected(d)} />)}
              </div>
            </div>
          )}

          {filtered.length === 0 && (
            <div className="text-center py-16">
              <div className="text-5xl mb-4">📂</div>
              <h3 className="font-bold text-gray-700 text-lg mb-1">No documents found</h3>
              <p className="text-slate-400 text-sm">Try a different search or upload a new document.</p>
            </div>
          )}
        </div>
      </div>

      {/* Document detail */}
      {selected && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex justify-end">
          <div className="w-full max-w-md bg-white h-full overflow-y-auto shadow-2xl">
            <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between z-10">
              <h3 className="font-bold text-slate-900">Document Details</h3>
              <button onClick={() => setSelected(null)} className="text-slate-400 hover:text-gray-600 text-xl w-8 h-8 flex items-center justify-center">×</button>
            </div>
            <div className="p-6">
              {/* Preview area */}
              <div className="rounded-2xl flex items-center justify-center h-40 mb-5" style={{ background: "linear-gradient(135deg, rgba(220,38,38,0.06), rgba(249,115,22,0.06))" }}>
                <div className="text-center">
                  <div className="text-6xl mb-2">{typeConfig[selected.type].icon}</div>
                  <span className={`text-xs font-bold px-2.5 py-1 rounded-full uppercase ${typeConfig[selected.type].bg}`} style={{ color: typeConfig[selected.type].color }}>{selected.type}</span>
                </div>
              </div>

              <h2 className="text-lg font-bold text-slate-900 mb-1">{selected.name}</h2>

              <div className="flex flex-wrap gap-1.5 mb-5">
                {selected.tags.map(t => (
                  <span key={t} className="text-xs font-medium px-2.5 py-0.5 rounded-full" style={{ background: "rgba(220,38,38,0.07)", color: "rgb(220,38,38)" }}>#{t}</span>
                ))}
              </div>

              <div className="space-y-3 mb-6">
                {[
                  { label: "Category", value: selected.category.charAt(0).toUpperCase() + selected.category.slice(1) },
                  { label: "File size", value: selected.size },
                  { label: "Version", value: selected.version },
                  { label: "Last updated", value: selected.updatedAt },
                  { label: "Updated by", value: selected.updatedBy },
                ].map(d => (
                  <div key={d.label} className="flex justify-between items-center py-2 border-b border-gray-50">
                    <span className="text-xs text-slate-400 font-medium">{d.label}</span>
                    <span className="text-sm font-semibold text-gray-700">{d.value}</span>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <button className="py-3 text-white font-bold rounded-xl text-sm flex items-center justify-center gap-1.5" style={{ background: "linear-gradient(90deg, rgb(220,38,38), rgb(249,115,22))" }}>
                  ⬇ Download
                </button>
                <button className="py-3 font-semibold rounded-xl border border-slate-200 text-gray-600 hover:bg-gray-50 transition-colors text-sm">
                  Share
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function DocCard({ doc, view, onClick }: { doc: Doc; view: "grid" | "list"; onClick: () => void }) {
  const tc = typeConfig[doc.type];

  if (view === "list") {
    return (
      <div onClick={onClick} className="bg-white border border-slate-200 rounded-xl px-5 py-3.5 flex items-center gap-4 hover:shadow-md transition-all cursor-pointer group border border-slate-200 hover:-translate-y-0.5">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0 ${tc.bg}`}>{tc.icon}</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h4 className="font-semibold text-slate-900 text-sm truncate">{doc.name}</h4>
            {doc.pinned && <span className="text-xs">📌</span>}
          </div>
          <div className="text-xs text-slate-400 mt-0.5">{doc.updatedAt} · {doc.size} · {doc.version}</div>
        </div>
        <span className={`text-xs font-bold px-2 py-0.5 rounded-full uppercase ${tc.bg}`} style={{ color: tc.color }}>{doc.type}</span>
        <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <button className="text-xs font-semibold px-3 py-1.5 rounded-lg text-white" style={{ background: "linear-gradient(90deg, rgb(220,38,38), rgb(249,115,22))" }}>⬇</button>
        </div>
      </div>
    );
  }

  return (
    <div onClick={onClick} className="bg-white border border-slate-200 rounded-2xl p-5 hover:shadow-xl transition-all duration-200 hover:-translate-y-1 cursor-pointer group border border-slate-200">
      <div className="flex items-start justify-between mb-4">
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl ${tc.bg}`}>{tc.icon}</div>
        <div className="flex items-center gap-1.5">
          {doc.pinned && <span className="text-xs">📌</span>}
          <span className={`text-xs font-bold px-2 py-0.5 rounded-full uppercase ${tc.bg}`} style={{ color: tc.color }}>{doc.type}</span>
        </div>
      </div>
      <h4 className="font-bold text-slate-900 text-sm mb-1 group-hover:gradient-text transition-all line-clamp-2">{doc.name}</h4>
      <div className="flex flex-wrap gap-1 mb-3">
        {doc.tags.slice(0, 2).map(t => (
          <span key={t} className="text-xs px-1.5 py-0.5 rounded" style={{ background: "rgba(220,38,38,0.06)", color: "rgb(220,38,38)" }}>#{t}</span>
        ))}
      </div>
      <div className="text-xs text-slate-400 flex justify-between items-center pt-3 border-t border-slate-200">
        <span>{doc.size} · {doc.version}</span>
        <span>{doc.updatedAt}</span>
      </div>
    </div>
  );
}
