// src/components/layout/AdminLayout.jsx
import { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const NAV = [
  { to: '/admin',            icon: '⬡', label: 'Dashboard',  end: true },
  { to: '/admin/users',      icon: '◉', label: 'Users'               },
  { to: '/admin/sessions',   icon: '⇄', label: 'Sessions'            },
  { to: '/admin/disputes',   icon: '⚑', label: 'Disputes'            },
  { to: '/admin/analytics',  icon: '◈', label: 'Analytics'           },
];

export default function AdminLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  return (
    <div className="min-h-screen bg-surface-400 flex">
      {open && <div className="fixed inset-0 bg-black/60 z-20 lg:hidden" onClick={() => setOpen(false)} />}

      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-30 w-64 flex flex-col bg-surface-300 border-r border-white/5
        transform transition-transform duration-300 ${open ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 lg:static lg:flex`}>

        {/* Brand */}
        <div className="px-6 py-5 border-b border-white/5">
          <h1 className="font-display text-xl font-bold text-gradient">SkillBarter</h1>
          <span className="inline-block mt-1.5 px-2.5 py-0.5 rounded-md text-xs font-bold bg-maroon-950/60 text-maroon-300 border border-maroon-800/40 uppercase tracking-wider">
            Admin Panel
          </span>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-0.5">
          {NAV.map(({ to, icon, label, end }) => (
            <NavLink key={to} to={to} end={end}
              className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
              onClick={() => setOpen(false)}
            >
              <span className="text-lg">{icon}</span>
              <span className="flex-1">{label}</span>
            </NavLink>
          ))}
        </nav>

        {/* Bottom */}
        <div className="px-4 py-4 border-t border-white/5 space-y-1">
          
          <button onClick={() => { logout(); navigate('/'); }} className="btn-ghost w-full text-red-400 hover:text-red-300">
            <span>⎋</span> Sign out
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="flex items-center justify-between px-4 lg:px-8 py-4 bg-surface-300 border-b border-white/5 sticky top-0 z-10">
          <button className="lg:hidden p-2 rounded-lg hover:bg-white/5 text-white/60" onClick={() => setOpen(true)}>☰</button>
          <div className="hidden lg:block">
            <p className="text-white/30 text-sm">Welcome back, <span className="text-white font-semibold">{user?.name}</span></p>
          </div>
          <div className="flex items-center gap-3 ml-auto">
            <div className="w-8 h-8 rounded-full bg-maroon-950 border border-maroon-800/40 flex items-center justify-center text-xs font-bold overflow-hidden">
              {user?.avatar_url
                ? <img src={user.avatar_url} alt="" className="w-full h-full object-cover" />
                : user?.name?.[0]?.toUpperCase()
              }
            </div>
            <div className="hidden sm:block">
              <p className="text-sm font-semibold leading-tight">{user?.name}</p>
              <p className="text-xs text-maroon-400 font-medium">Administrator</p>
            </div>
          </div>
        </header>

        <main className="flex-1 p-4 md:p-6 lg:p-8 overflow-y-auto animate-fade-in">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
