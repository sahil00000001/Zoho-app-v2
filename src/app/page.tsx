"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

const features = [
  {
    icon: "🕐",
    title: "Attendance & Leave",
    desc: "One-click check-in, smart leave requests, real-time balance — zero spreadsheets.",
    href: "/dashboard/attendance",
  },
  {
    icon: "👥",
    title: "Employee Directory",
    desc: "Live org chart, rich profiles, instant search across your whole company.",
    href: "/dashboard/directory",
  },
  {
    icon: "✅",
    title: "Approval Workflows",
    desc: "Configurable multi-step approvals for leave, expenses, and anything custom.",
    href: "/dashboard/approvals",
  },
  {
    icon: "📁",
    title: "Org Documents",
    desc: "Centralized policies, contracts, and handbooks — always version-controlled.",
    href: "/dashboard/documents",
  },
];

const stats = [
  { value: "200+", label: "Companies" },
  { value: "12k+", label: "Employees" },
  { value: "98%", label: "Satisfaction" },
  { value: "3min", label: "Setup time" },
];

const testimonials = [
  {
    name: "Sarah Chen",
    role: "Head of People, Nexus Labs",
    avatar: "SC",
    quote: "ATLAS replaced three separate tools. Our team adopted it in a week — no training needed.",
  },
  {
    name: "Marcus Webb",
    role: "COO, Drift Studio",
    avatar: "MW",
    quote: "The approval workflow alone saved us 6 hours a week. Dead simple, exactly what we needed.",
  },
  {
    name: "Priya Nair",
    role: "HR Manager, Volta Fintech",
    avatar: "PN",
    quote: "Finally an HR tool that doesn't feel like it was built in 2005. Beautiful and fast.",
  },
];

function AnimatedCounter({ target }: { target: string }) {
  const [visible, setVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const observer = new IntersectionObserver(([e]) => { if (e.isIntersecting) setVisible(true); }, { threshold: 0.5 });
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);
  return <div ref={ref} className={`text-4xl font-black text-white transition-all duration-700 ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}>{target}</div>;
}

export default function LandingPage() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div className="min-h-screen bg-white overflow-x-hidden">
      {/* Navbar */}
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? "bg-white/90 backdrop-blur-md shadow-sm border-b border-gray-100" : "bg-transparent"}`}>
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "linear-gradient(135deg, rgb(220,38,38), rgb(249,115,22))" }}>
              <span className="text-white font-black text-sm">A</span>
            </div>
            <span className="font-bold text-xl text-gray-900"><span className="gradient-text">ATLAS</span></span>
          </div>
          <div className="hidden md:flex items-center gap-8">
            {["Features", "Testimonials", "Pricing"].map((item) => (
              <a key={item} href={`#${item.toLowerCase()}`} className="text-gray-600 hover:text-gray-900 text-sm font-medium transition-colors">{item}</a>
            ))}
          </div>
          <div className="hidden md:flex items-center gap-3">
            <Link href="/login" className="text-sm font-medium text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 transition-all">Sign in</Link>
            <Link href="/signup" className="text-white text-sm font-semibold px-5 py-2 rounded-lg shadow-md" style={{ background: "linear-gradient(90deg, rgb(220,38,38), rgb(249,115,22))" }}>Get started free</Link>
          </div>
          <button className="md:hidden p-2 flex flex-col gap-1" onClick={() => setMenuOpen(!menuOpen)}>
            <span className="w-5 h-0.5 bg-gray-700 block" />
            <span className="w-5 h-0.5 bg-gray-700 block" />
            <span className="w-5 h-0.5 bg-gray-700 block" />
          </button>
        </div>
        {menuOpen && (
          <div className="md:hidden bg-white border-t border-gray-100 px-6 py-4 flex flex-col gap-3">
            <a href="#features" className="text-gray-700 font-medium py-1" onClick={() => setMenuOpen(false)}>Features</a>
            <a href="#testimonials" className="text-gray-700 font-medium py-1" onClick={() => setMenuOpen(false)}>Testimonials</a>
            <Link href="/login" className="text-gray-700 font-medium py-1" onClick={() => setMenuOpen(false)}>Sign in</Link>
            <Link href="/signup" className="text-white font-semibold py-2 rounded-lg text-center" style={{ background: "linear-gradient(90deg, rgb(220,38,38), rgb(249,115,22))" }} onClick={() => setMenuOpen(false)}>Get started free</Link>
          </div>
        )}
      </nav>

      {/* Hero */}
      <section className="relative pt-32 pb-24 px-6 overflow-hidden">
        {/* Animated blobs */}
        <div className="absolute top-10 left-1/4 w-96 h-96 rounded-full animate-blob" style={{ background: "radial-gradient(circle, rgba(220,38,38,0.12) 0%, transparent 70%)", filter: "blur(40px)" }} />
        <div className="absolute top-32 right-1/4 w-80 h-80 rounded-full animate-blob animation-delay-2000" style={{ background: "radial-gradient(circle, rgba(249,115,22,0.10) 0%, transparent 70%)", filter: "blur(50px)" }} />

        <div className="relative max-w-5xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-medium mb-8 border" style={{ background: "rgba(220,38,38,0.04)", borderColor: "rgba(220,38,38,0.18)", color: "rgb(220,38,38)" }}>
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse inline-block" />
            Built for 50–200 person teams
          </div>

          <h1 className="text-5xl md:text-7xl font-black text-gray-900 leading-[1.05] mb-6 tracking-tight">
            HR that works as fast
            <br />
            <span className="gradient-text">as your team does.</span>
          </h1>

          <p className="text-lg md:text-xl text-gray-500 max-w-2xl mx-auto mb-10 leading-relaxed">
            Attendance tracking, leave management, org directory, approval workflows, and document storage — all in one lightweight platform.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link href="/signup" className="text-white font-bold px-9 py-4 rounded-xl text-base shadow-xl transition-all hover:-translate-y-0.5" style={{ background: "linear-gradient(90deg, rgb(220,38,38), rgb(249,115,22))", boxShadow: "0 10px 40px rgba(220,38,38,0.25)" }}>
              Start free — no credit card
            </Link>
            <Link href="/login" className="flex items-center gap-2 text-gray-700 font-semibold px-9 py-4 rounded-xl border border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-all text-base">
              Sign in <span>→</span>
            </Link>
          </div>
          <p className="text-sm text-gray-400 mt-4">Free for teams up to 20 · No setup fees</p>
        </div>

        {/* Dashboard preview mockup */}
        <div className="relative max-w-5xl mx-auto mt-20">
          <div className="rounded-2xl overflow-hidden border border-gray-100" style={{ boxShadow: "0 30px 80px rgba(220,38,38,0.10), 0 8px 24px rgba(0,0,0,0.06)" }}>
            <div className="bg-gray-50 border-b border-gray-200 px-4 py-3 flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-red-400" />
              <div className="w-3 h-3 rounded-full bg-yellow-400" />
              <div className="w-3 h-3 rounded-full bg-green-400" />
              <div className="flex-1 mx-4 bg-white rounded-md px-3 py-1 text-xs text-gray-400 border border-gray-200">app.atlaspeople.io/dashboard</div>
            </div>
            <div className="bg-white p-6">
              <div className="flex gap-6">
                <div className="w-44 hidden md:block shrink-0">
                  <div className="flex items-center gap-2 mb-5">
                    <div className="w-6 h-6 rounded-md" style={{ background: "linear-gradient(135deg, rgb(220,38,38), rgb(249,115,22))" }} />
                    <span className="font-black text-sm gradient-text">ATLAS</span>
                  </div>
                  {["Dashboard", "Attendance", "Directory", "Approvals", "Documents"].map((item, i) => (
                    <div key={item} className={`flex items-center gap-2 px-3 py-2 rounded-lg mb-1 text-xs font-medium ${i === 0 ? "text-white" : "text-gray-500"}`} style={i === 0 ? { background: "linear-gradient(90deg, rgb(220,38,38), rgb(249,115,22))" } : {}}>
                      <span className={`w-3 h-3 rounded ${i === 0 ? "bg-white/30" : "bg-gray-200"}`} />
                      {item}
                    </div>
                  ))}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                    {[["142", "Present today"], ["8", "On leave"], ["3", "Pending approvals"], ["2", "New hires"]].map(([v, l]) => (
                      <div key={l} className="glass-card rounded-xl p-3">
                        <div className="text-2xl font-black gradient-text">{v}</div>
                        <div className="text-xs text-gray-400 mt-0.5">{l}</div>
                      </div>
                    ))}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="glass-card rounded-xl p-4">
                      <div className="text-xs font-bold text-gray-500 mb-3 uppercase tracking-wide">Recent Activity</div>
                      {["Alice marked attendance", "Bob requested 2 days leave", "Carol uploaded contract"].map((a) => (
                        <div key={a} className="flex items-center gap-2 mb-2">
                          <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: "linear-gradient(90deg, rgb(220,38,38), rgb(249,115,22))" }} />
                          <span className="text-xs text-gray-600">{a}</span>
                        </div>
                      ))}
                    </div>
                    <div className="glass-card rounded-xl p-4">
                      <div className="text-xs font-bold text-gray-500 mb-3 uppercase tracking-wide">Leave Balance</div>
                      {[["Casual", 8, 10], ["Sick", 4, 6], ["Annual", 12, 20]].map(([l, u, t]) => (
                        <div key={String(l)} className="mb-2">
                          <div className="flex justify-between text-xs text-gray-500 mb-1"><span>{l}</span><span>{u}/{t}</span></div>
                          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <div className="h-full rounded-full" style={{ width: `${(Number(u) / Number(t)) * 100}%`, background: "linear-gradient(90deg, rgb(220,38,38), rgb(249,115,22))" }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats bar */}
      <section className="py-14 px-6" style={{ background: "linear-gradient(90deg, rgb(220,38,38), rgb(249,115,22))" }}>
        <div className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8">
          {stats.map((s) => (
            <div key={s.label} className="text-center">
              <AnimatedCounter target={s.value} />
              <div className="text-sm text-white/70 font-medium mt-1">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-24 px-6 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-black text-gray-900 mb-4">Everything you need,<br /><span className="gradient-text">nothing you don&apos;t.</span></h2>
            <p className="text-gray-500 text-lg max-w-xl mx-auto">Four focused modules that eliminate daily HR friction.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {features.map((f) => (
              <Link href={f.href} key={f.title} className="group glass-card rounded-2xl p-8 hover:shadow-xl transition-all duration-300 hover:-translate-y-1 block border border-gray-100">
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl mb-5 group-hover:scale-110 transition-transform duration-300" style={{ background: "linear-gradient(135deg, rgba(220,38,38,0.06), rgba(249,115,22,0.06))" }}>
                  {f.icon}
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">{f.title}</h3>
                <p className="text-gray-500 leading-relaxed text-sm">{f.desc}</p>
                <div className="mt-5 text-sm font-bold flex items-center gap-1 group-hover:gap-2 transition-all duration-200" style={{ color: "rgb(220,38,38)" }}>
                  Explore <span>→</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section id="testimonials" className="py-24 px-6" style={{ background: "linear-gradient(135deg, #fff5f5 0%, #fff7ed 100%)" }}>
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-black text-gray-900 mb-3">Loved by <span className="gradient-text">HR teams</span></h2>
            <p className="text-gray-500 text-lg">Real teams, real results.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {testimonials.map((t) => (
              <div key={t.name} className="glass-card rounded-2xl p-7 hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0" style={{ background: "linear-gradient(135deg, rgb(220,38,38), rgb(249,115,22))" }}>{t.avatar}</div>
                  <div>
                    <div className="font-semibold text-gray-900 text-sm">{t.name}</div>
                    <div className="text-xs text-gray-400">{t.role}</div>
                  </div>
                </div>
                <p className="text-gray-600 text-sm leading-relaxed">&ldquo;{t.quote}&rdquo;</p>
                <div className="flex gap-0.5 mt-4">{[...Array(5)].map((_, i) => <span key={i} className="text-orange-400 text-sm">★</span>)}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section id="pricing" className="py-24 px-6 bg-white">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-4xl md:text-5xl font-black text-gray-900 mb-4">Ready to simplify <span className="gradient-text">HR?</span></h2>
          <p className="text-gray-500 text-lg mb-8 max-w-xl mx-auto">Join 200+ companies that ditched the spreadsheets. Free for your first 20 employees.</p>
          <Link href="/signup" className="inline-block text-white font-bold px-10 py-5 rounded-2xl text-lg" style={{ background: "linear-gradient(90deg, rgb(220,38,38), rgb(249,115,22))", boxShadow: "0 20px 60px rgba(220,38,38,0.28)" }}>
            Create your free account →
          </Link>
          <p className="text-sm text-gray-400 mt-4">No credit card · 2-minute setup · Cancel anytime</p>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-6 border-t border-gray-100">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "linear-gradient(135deg, rgb(220,38,38), rgb(249,115,22))" }}>
              <span className="text-white font-black text-xs">A</span>
            </div>
            <span className="font-bold text-gray-700"><span className="gradient-text">ATLAS</span></span>
          </div>
          <div className="flex gap-6 text-sm text-gray-400">
            {["Privacy", "Terms", "Support"].map((l) => <a key={l} href="#" className="hover:text-gray-600 transition-colors">{l}</a>)}
          </div>
          <p className="text-sm text-gray-400">© 2026 ATLAS. Built for humans.</p>
        </div>
      </footer>
    </div>
  );
}
