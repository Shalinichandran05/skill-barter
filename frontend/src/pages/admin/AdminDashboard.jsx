// src/pages/admin/AdminDashboard.jsx
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import { Spinner, StatusBadge } from '../../components/common';

const StatCard = ({ label, value, icon, sub, accent }) => (
  <div className={`card flex flex-col gap-2 ${accent ? 'border-maroon-800/40 bg-maroon-950/10' : ''}`}>
    <div className="flex items-start justify-between">
      <p className="text-xs text-white/40 uppercase tracking-widest font-semibold">{label}</p>
      <span className="text-xl text-white/15">{icon}</span>
    </div>
    <p className="text-3xl font-display font-bold">{value ?? '—'}</p>
    {sub && <p className="text-xs text-white/30">{sub}</p>}
  </div>
);

export default function AdminDashboard() {
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/admin/stats')
      .then(r => setData(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex justify-center py-20"><Spinner size="lg" /></div>;

  return (
    <div className="space-y-8 animate-fade-in">

      {/* Header */}
      <div>
        <h1 className="text-3xl font-display font-bold">Dashboard <span className="text-gradient">Overview</span></h1>
        <p className="text-white/40 text-sm mt-1">Platform health at a glance</p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <StatCard label="Total Users"       value={data?.total_users}      icon="◉" />
        <StatCard label="Total Skills"      value={data?.total_skills}     icon="✦" />
        <StatCard label="Total Requests"    value={data?.total_requests}   icon="⇄" />
        <StatCard label="Completed"         value={data?.completed}        icon="✓" />
        <StatCard label="Open Disputes"     value={data?.open_disputes}    icon="⚑" accent />
        <StatCard label="Credits Exchanged" value={data?.credits_exchanged} icon="◎"
          sub="total transferred" />
      </div>

      {/* Alert for open disputes */}
      {data?.open_disputes > 0 && (
        <div className="card border-red-800/30 bg-red-900/10 flex items-center gap-4 py-4">
          <span className="text-2xl text-red-400 shrink-0">⚑</span>
          <div className="flex-1">
            <p className="font-semibold text-red-300">{data.open_disputes} open dispute{data.open_disputes !== 1 ? 's' : ''} need your attention</p>
            <p className="text-xs text-white/30 mt-0.5">Credits are locked until resolved</p>
          </div>
          <Link to="/admin/disputes" className="btn-danger shrink-0 text-xs py-1.5 px-4">Resolve →</Link>
        </div>
      )}

      {/* Two column tables */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">

        {/* Recent Requests */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display font-bold text-lg">Recent Requests</h2>
          </div>
          {!data?.recent_requests?.length ? (
            <p className="text-white/30 text-sm text-center py-6">No requests yet</p>
          ) : (
            <div className="space-y-1">
              {data.recent_requests.map(r => (
                <div key={r.id} className="flex items-center justify-between py-2.5 px-3 rounded-lg hover:bg-surface-100 transition-colors">
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{r.skill_name}</p>
                    <p className="text-xs text-white/30 truncate">{r.requester_name} → {r.provider_name}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 ml-3">
                    <span className="text-xs text-white/30">{r.hours_requested}h</span>
                    <StatusBadge status={r.status} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Disputes */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display font-bold text-lg">Recent Disputes</h2>
            <Link to="/admin/disputes" className="text-xs text-maroon-400 hover:text-maroon-300 transition-colors">View all →</Link>
          </div>
          {!data?.recent_disputes?.length ? (
            <p className="text-white/30 text-sm text-center py-6">No disputes — great!</p>
          ) : (
            <div className="space-y-1">
              {data.recent_disputes.map(d => (
                <div key={d.id} className="flex items-center justify-between py-2.5 px-3 rounded-lg hover:bg-surface-100 transition-colors">
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{d.skill_name}</p>
                    <p className="text-xs text-white/30 truncate">By {d.raised_by_name} · {new Date(d.created_at).toLocaleDateString()}</p>
                  </div>
                  <StatusBadge status={d.status} />
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
