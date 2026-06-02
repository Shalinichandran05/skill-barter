// src/components/layout/DashboardLayout.jsx
import { useState, useEffect } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import api from '../../services/api';

export default function DashboardLayout() {
  const { user, logout } = useAuth();
  const socket           = useSocket();
  const navigate         = useNavigate();
  const [open, setOpen]  = useState(false);

  // Notification badges
  const [requestBadge, setRequestBadge] = useState(0);
  const [messageBadge, setMessageBadge] = useState(0);

  // ── Fetch badges ──────────────────────────────────────
  const fetchBadges = async () => {
    try {
      const [sent, incoming, unread] = await Promise.all([
        api.get('/requests/mine'),
        api.get('/requests/incoming'),
        api.get('/messages/unread'),
      ]);
      const pendingIncoming = incoming.data.filter(r => r.status === 'pending').length;
      const newStatusSent   = sent.data.filter(r =>
        r.status === 'approved' || r.status === 'rejected' || r.status === 'waiting_confirmation'
      ).length;
      setRequestBadge(pendingIncoming + newStatusSent);
      setMessageBadge(unread.data.count || 0);
    } catch (_) {}
  };

  useEffect(() => {
    fetchBadges();
    const interval = setInterval(fetchBadges, 30000);
    return () => clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Real-time message badge via socket ────────────────
  useEffect(() => {
    if (!socket) return;
    const handleNew = () => setMessageBadge(prev => prev + 1);
    socket.on('new_message', handleNew);
    return () => socket.off('new_message', handleNew);
  }, [socket]);

  const handleLogout = () => { logout(); navigate('/'); };

  // ── Avatar ────────────────────────────────────────────
  const UserAvatar = ({ size = 'sm' }) => {
    const s = size === 'sm' ? 'w-8 h-8 text-xs' : 'w-9 h-9 text-sm';
    return (
      <div className={`${s} rounded-full bg-maroon-950 flex items-center justify-center font-bold shrink-0 overflow-hidden border border-maroon-800/40`}>
        {user?.avatar_url
          ? <img src={user.avatar_url} alt="" className="w-full h-full object-cover" />
          : user?.name?.[0]?.toUpperCase()
        }
      </div>
    );
  };

  // ── Badge pill ────────────────────────────────────────
  const Badge = ({ count }) => {
    if (!count) return null;
    return (
      <span className="ml-auto min-w-5 h-5 px-1.5 rounded-full bg-maroon-700 text-white text-xs font-bold flex items-center justify-center">
        {count > 9 ? '9+' : count}
      </span>
    );
  };

  const NAV_ITEMS = [
    { to: '/dashboard',          icon: '⬡', label: 'Overview'       },
    { to: '/dashboard/browse',   icon: '◈', label: 'Browse Skills'  },
    { to: '/dashboard/skills',   icon: '✦', label: 'My Skills'      },
    { to: '/dashboard/requests', icon: '⇄', label: 'Requests',   badge: requestBadge },
    { to: '/dashboard/messages', icon: '💬', label: 'Messages',   badge: messageBadge },
    { to: '/dashboard/wallet',   icon: '◎', label: 'Wallet'         },
    { to: '/dashboard/ratings',  icon: '★', label: 'Ratings'        },
    { to: '/dashboard/profile',  icon: '◉', label: 'Profile'        },
  ];

  return (
    <div className="min-h-screen bg-surface-400 bg-mesh-dark flex">

      {open && <div className="fixed inset-0 bg-black/60 z-20 lg:hidden" onClick={() => setOpen(false)} />}

      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 z-30 w-64 flex flex-col
        bg-surface-300 border-r border-white/5
        transform transition-transform duration-300
        ${open ? 'translate-x-0' : '-translate-x-full'}
        lg:translate-x-0 lg:static lg:flex
      `}>
        {/* Logo */}
        <div className="px-6 py-6 border-b border-white/5">
          <h1 className="font-display text-xl font-bold text-gradient tracking-tight">SkillBarter</h1>
          <p className="text-white/30 text-xs mt-0.5">Time Credit Exchange</p>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {NAV_ITEMS.map(({ to, icon, label, badge }) => (
            <NavLink key={to} to={to} end={to === '/dashboard'}
              className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
              onClick={() => setOpen(false)}
            >
              <span className="text-lg leading-none">{icon}</span>
              <span className="flex-1">{label}</span>
              <Badge count={badge} />
            </NavLink>
          ))}
        </nav>

        {/* User card */}
        <div className="px-4 py-4 border-t border-white/5">
          <div className="flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-white/5 transition-colors">
            <UserAvatar />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold truncate">{user?.name}</p>
              <p className="text-xs text-white/40 truncate">{user?.email}</p>
            </div>
          </div>
          <button onClick={handleLogout} className="btn-ghost w-full mt-2 text-red-400 hover:text-red-300">
            <span>⎋</span> Sign out
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0 lg:ml-0">
        {/* Mobile topbar */}
        <header className="lg:hidden flex items-center justify-between px-4 py-3 bg-surface-300 border-b border-white/5 sticky top-0 z-10">
          <button onClick={() => setOpen(true)} className="p-2 rounded-lg hover:bg-white/5 text-white/60 hover:text-white">☰</button>
          <span className="font-display font-bold text-gradient">SkillBarter</span>
          <div className="relative">
            <UserAvatar />
            {messageBadge > 0 && (
              <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-maroon-600 flex items-center justify-center text-[9px] font-bold text-white">
                {messageBadge > 9 ? '9+' : messageBadge}
              </div>
            )}
          </div>
        </header>

        <main className="flex-1 p-4 md:p-6 lg:p-8 overflow-y-auto animate-fade-in">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
