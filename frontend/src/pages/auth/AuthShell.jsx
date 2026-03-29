// src/pages/auth/AuthShell.jsx
// Shared layout wrapper for Login and Register pages

import { Link } from 'react-router-dom';

export default function AuthShell({ title, subtitle, children }) {
  return (
    <div className="min-h-screen bg-surface-400 bg-radial-maroon flex items-center justify-center p-4">
      <div className="w-full max-w-md animate-slide-up">
        <div className="text-center mb-8">
          <Link to="/" className="font-display text-2xl font-bold text-gradient inline-block">
            SkillBarter
          </Link>
          <h2 className="text-xl font-bold mt-4 mb-1">{title}</h2>
          <p className="text-white/40 text-sm">{subtitle}</p>
        </div>
        <div className="card p-8 border-white/10">
          {children}
        </div>
      </div>
    </div>
  );
}
