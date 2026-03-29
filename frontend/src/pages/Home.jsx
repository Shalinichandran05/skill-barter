// src/pages/Home.jsx

import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useState, useEffect, useRef } from 'react';
import api from '../services/api';

const FEATURES = [
  { icon: '◎', title: 'Time Credits',      desc: 'Earn credits by teaching. Spend them to learn. No money involved.' },
  { icon: '✦', title: 'Any Skill',          desc: 'Coding, cooking, music, yoga, languages – every skill has value.' },
  { icon: '⇄', title: 'Dual Confirmation',  desc: 'Credits transfer only when both parties confirm the session.' },
  { icon: '★', title: 'Community Ratings',  desc: 'Build reputation through honest peer reviews after each session.' },
  { icon: '⚑', title: 'Dispute Resolution', desc: 'Fair admin-mediated resolution for any conflicts.' },
  { icon: '◈', title: 'No Middleman',       desc: 'Connect directly with skilled people in your community.' },
];

// ── Cursor glow ───────────────────────────────────────────
function CursorGlow() {
  const glowRef = useRef(null);

  useEffect(() => {
    const move = (e) => {
      if (glowRef.current) {
        glowRef.current.style.left = e.clientX + 'px';
        glowRef.current.style.top  = e.clientY + 'px';
      }
    };
    window.addEventListener('mousemove', move);
    return () => window.removeEventListener('mousemove', move);
  }, []);

  return (
    <div
      ref={glowRef}
      className="pointer-events-none fixed z-50"
      style={{
        width: '280px',
        height: '280px',
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(255,255,255,0.06) 0%, transparent 70%)',
        transform: 'translate(-50%, -50%)',
        transition: 'left 0.08s ease, top 0.08s ease',
      }}
    />
  );
}

// ── Count-up hook ─────────────────────────────────────────
function useCountUp(target, duration = 1500, active = false) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (!active || !target) return;
    const start  = Date.now();
    const endVal = parseInt(target) || 0;
    const tick   = () => {
      const progress = Math.min((Date.now() - start) / duration, 1);
      const eased    = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(endVal * eased));
      if (progress < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [target, duration, active]);
  return value;
}

// ── Stats box ─────────────────────────────────────────────
function StatsBox({ stats }) {
  const boxRef         = useRef(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setVisible(true); }, { threshold: 0.5 });
    if (boxRef.current) obs.observe(boxRef.current);
    return () => obs.disconnect();
  }, []);

  const skills   = useCountUp(stats?.skills,   1500, visible);
  const sessions = useCountUp(stats?.sessions, 1800, visible);

  return (
    <div ref={boxRef} className="mt-16 inline-flex items-center gap-6 px-8 py-4 rounded-2xl glass border-glow">
      {[
        { label: 'Starting Credits', val: '5',                       raw: false },
        { label: 'Active Skills',    val: visible ? skills   : 0,    raw: true  },
        { label: 'Sessions Done',    val: visible ? sessions : 0,    raw: true  },
      ].map(({ label, val, raw }) => (
        <div key={label} className="text-center px-4 first:pl-0 last:pr-0 border-r border-white/10 last:border-0">
          <p className="text-2xl font-bold font-display text-gradient">
            {raw ? val.toLocaleString() : val}
          </p>
          <p className="text-xs text-white/40 mt-0.5">{label}</p>
        </div>
      ))}
    </div>
  );
}

// ── Scroll arrow ──────────────────────────────────────────
function ScrollArrow() {
  const [progress, setProgress] = useState(0);
  useEffect(() => {
    const onScroll = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      setProgress(max > 0 ? Math.min(window.scrollY / max, 1) : 0);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const r    = 18;
  const circ = 2 * Math.PI * r;

  return (
    <div className="fixed bottom-6 left-6 z-50 transition-opacity duration-300"
      style={{ opacity: progress > 0.95 ? 0 : 1 }}>
      <div className="relative w-10 h-10 cursor-pointer"
        onClick={() => window.scrollBy({ top: window.innerHeight * 0.8, behavior: 'smooth' })}>
        <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 40 40">
          <circle cx="20" cy="20" r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="2" />
          <circle cx="20" cy="20" r={r} fill="none" stroke="#6b0f1a" strokeWidth="2"
            strokeDasharray={circ} strokeDashoffset={circ - progress * circ}
            strokeLinecap="round" style={{ transition: 'stroke-dashoffset 0.1s linear' }} />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M6 2v8M2.5 6.5L6 10l3.5-3.5"
              stroke="rgba(255,255,255,0.5)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      </div>
    </div>
  );
}

// ── Skill Exchange Hero Illustration ─────────────────────
// Two minimalist white silhouettes with animated brain-to-brain arrows
// Positioned absolutely inside the hero section, behind the text


// ── Main page ─────────────────────────────────────────────
export default function HomePage() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);

  useEffect(() => {
    api.get('/public/stats')
      .then(r => setStats({ skills: r.data.skills, sessions: r.data.sessions }))
      .catch(() => setStats({ skills: 0, sessions: 0 }));
  }, []);

  return (
    <div className="min-h-screen bg-surface-400 bg-radial-maroon text-white overflow-x-hidden">

      <CursorGlow />
      <ScrollArrow />

      {/* ── Navbar ── */}
      <nav className="flex items-center justify-between px-6 md:px-12 py-5 border-b border-white/5 glass sticky top-0 z-20">
        <span className="font-display text-xl font-bold text-gradient">SkillBarter</span>
        <div className="flex items-center gap-3">
          {user ? (
            <Link to={user.role === 'admin' ? '/admin' : '/dashboard'} className="btn-primary text-sm">
              Dashboard
            </Link>
          ) : (
            <>
              <Link to="/login"    className="btn-ghost text-sm">Sign in</Link>
              <Link to="/register" className="btn-primary text-sm">Get Started</Link>
            </>
          )}
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="relative max-w-5xl mx-auto px-6 py-24 md:py-36 text-center min-h-[600px] flex flex-col items-center justify-center">

        {/* Illustration — behind text, stays in hero section only */}
        

        {/* Content — above illustration */}
        <div className="relative z-10 flex flex-col items-center animate-fade-in">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-maroon-800/50
                          bg-maroon-950/20 text-maroon-300 text-xs font-semibold uppercase tracking-widest mb-8">
            <span className="w-1.5 h-1.5 rounded-full bg-maroon-500 animate-pulse" />
            Time Credit Economy
          </div>
          <h1 className="font-display text-5xl md:text-7xl font-bold leading-tight mb-6">
            Exchange Skills.<br />
            <span className="text-gradient">Not Money.</span>
          </h1>
          <p className="text-lg text-white/50 max-w-2xl mx-auto mb-10 leading-relaxed">
            SkillBarter is a community platform where your expertise is the currency.
            Teach what you know, learn what you want — one credit at a time.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/register" className="btn-primary text-base px-8 py-3 shadow-glow-maroon">
              Start Exchanging
            </Link>
            <Link to="/dashboard/browse" className="btn-secondary text-base px-8 py-3">
              Browse Skills
            </Link>
          </div>

          <StatsBox stats={stats} />
        </div>
      </section>

      {/* ── Features ── */}
      <section className="max-w-6xl mx-auto px-6 py-20">
        <h2 className="font-display text-3xl font-bold text-center mb-12">
          How it <span className="text-gradient">Works</span>
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {FEATURES.map(({ icon, title, desc }) => (
            <div key={title} className="card group hover:border-maroon-800/40 transition-all duration-300">
              <span className="text-3xl text-maroon-700 group-hover:text-maroon-500 transition-colors">{icon}</span>
              <h3 className="text-base font-bold mt-3 mb-1.5">{title}</h3>
              <p className="text-white/40 text-sm leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="max-w-3xl mx-auto px-6 py-20 text-center">
        <div className="card border-maroon-800/30 bg-maroon-950/10 py-12">
          <h2 className="font-display text-3xl font-bold mb-3">Ready to start?</h2>
          <p className="text-white/40 mb-8">Join thousands of people exchanging skills every day.</p>
          <Link to="/register" className="btn-primary px-10 py-3 text-base shadow-glow-maroon">
            Create Free Account
          </Link>
          <p className="text-white/20 text-xs mt-4">No credit card. No subscription. Ever.</p>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-white/5 px-6 py-6 text-center text-white/20 text-xs">
        © {new Date().getFullYear()} SkillBarter · Built with time credits and good vibes.
      </footer>
    </div>
  );
}
