// src/pages/user/Dashboard.jsx
// Main dashboard home: stats, recent requests, quick actions

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import { StatCard, StatusBadge, Spinner } from '../../components/common';

export default function DashboardHome() {
  const { user, refreshUser } = useAuth();
  const [wallet,   setWallet]   = useState(null);
  const [requests, setRequests] = useState([]);
  const [skills,   setSkills]   = useState([]);
  const [loading,  setLoading]  = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [w, req, sk] = await Promise.all([
          api.get('/credits/wallet'),
          api.get('/requests/mine'),
          api.get('/skills/mine'),
        ]);
        setWallet(w.data);
        setRequests(req.data.slice(0, 5));
        setSkills(sk.data);
        refreshUser();
      } catch (_) {}
      finally { setLoading(false); }
    };
    load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) return (
    <div className="flex justify-center py-20"><Spinner size="lg" /></div>
  );

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Greeting */}
      <div>
        <h1 className="text-3xl font-display font-bold">
          Good day, <span className="text-gradient">{user?.name?.split(' ')[0]}</span> 👋
        </h1>
        <p className="text-white/40 text-sm mt-1">Here's what's happening with your skill exchange.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Available Credits"
          value={wallet?.available?.toFixed(1) ?? '—'}
          icon="◎"
          accent
        />
        <StatCard label="Locked Credits"  value={wallet?.locked?.toFixed(1)    ?? '—'} icon="⚷" />
        <StatCard label="My Skills"       value={skills.length}                         icon="✦" />
        <StatCard label="Total Requests"  value={requests.length}                       icon="⇄" />
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { to: '/dashboard/browse',   icon: '◈', label: 'Browse Skills',    desc: 'Find a skill to learn' },
          { to: '/dashboard/skills',   icon: '✦', label: 'Add a Skill',      desc: 'Share what you know'   },
          { to: '/dashboard/requests', icon: '⇄', label: 'View Requests',    desc: 'Manage your sessions'  },
        ].map(({ to, icon, label, desc }) => (
          <Link key={to} to={to}
            className="card flex items-center gap-4 hover:border-maroon-800/40 group transition-all duration-200"
          >
            <div className="w-10 h-10 rounded-xl bg-maroon-950/40 flex items-center justify-center text-xl text-maroon-500 group-hover:bg-maroon-950/70 transition-colors shrink-0">
              {icon}
            </div>
            <div>
              <p className="font-semibold text-sm">{label}</p>
              <p className="text-white/30 text-xs">{desc}</p>
            </div>
            <span className="ml-auto text-white/20 group-hover:text-white/50 transition-colors">→</span>
          </Link>
        ))}
      </div>

      {/* Recent requests */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display font-bold text-lg">Recent Requests</h2>
          <Link to="/dashboard/requests" className="text-maroon-400 text-xs hover:text-maroon-300 transition-colors">
            View all →
          </Link>
        </div>
        {requests.length === 0 ? (
          <p className="text-white/30 text-sm py-4 text-center">No requests yet. Browse skills to get started!</p>
        ) : (
          <div className="space-y-3">
            {requests.map(r => (
              <div key={r.id} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                <div className="min-w-0">
                  <p className="text-sm font-semibold truncate">{r.skill_name}</p>
                  <p className="text-xs text-white/30">Provider: {r.provider_name} · {r.hours_requested}h</p>
                </div>
                <StatusBadge status={r.status} />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Credit bar */}
      {wallet && (
        <div className="card">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-display font-bold text-lg">Credit Wallet</h2>
            <Link to="/dashboard/wallet" className="text-maroon-400 text-xs hover:text-maroon-300 transition-colors">
              Details →
            </Link>
          </div>
          <div className="flex items-center gap-4 mb-3">
            <div className="text-3xl font-display font-bold text-gradient">{wallet.available?.toFixed(2)}</div>
            <div className="text-xs text-white/30">available<br/>of {wallet.total?.toFixed(2)} total</div>
          </div>
          <div className="h-2 bg-surface-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-maroon-950 to-maroon-700 rounded-full transition-all duration-500"
              style={{ width: `${wallet.total > 0 ? (wallet.available / wallet.total) * 100 : 0}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-white/30 mt-1.5">
            <span>Available: {wallet.available?.toFixed(2)}</span>
            <span>Locked: {wallet.locked?.toFixed(2)}</span>
          </div>
        </div>
      )}
    </div>
  );
}
