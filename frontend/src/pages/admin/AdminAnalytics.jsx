// src/pages/admin/AdminAnalytics.jsx
import { useState, useEffect } from 'react';
import api from '../../services/api';
import { Spinner } from '../../components/common';

// ── Bar chart (pure CSS, no library) ─────────────────────
const BarChart = ({ data, color, valueKey = 'count', label }) => {
  if (!data?.length) {
    return (
      <div>
        <p className="text-xs text-white/30 uppercase tracking-widest font-semibold mb-4">{label}</p>
        <div className="flex items-end gap-1 h-32 opacity-20">
          {[3,5,2,7,4,6,8,3,5,9,4,6,7,5].map((h, i) => (
            <div key={i} className="flex-1 rounded-t" style={{ height: h*10+'%', background: color }} />
          ))}
        </div>
        <p className="text-white/20 text-xs text-center mt-3">No activity yet in the last 14 days</p>
      </div>
    );
  }

  const max = Math.max(...data.map(d => parseFloat(d[valueKey]) || 0), 1);

  return (
    <div>
      <p className="text-xs text-white/30 uppercase tracking-widest font-semibold mb-4">{label}</p>
      <div className="flex items-end gap-1 h-32 mt-6">
        {data.map((d, i) => {
          const val = parseFloat(d[valueKey]) || 0;
          const pct = (val / max) * 100;
          return (
            <div key={i} className="flex-1 flex flex-col items-center group relative">
              <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-surface-50 border border-white/10
                              text-xs text-white px-1.5 py-0.5 rounded whitespace-nowrap opacity-0
                              group-hover:opacity-100 transition-opacity z-10 pointer-events-none">
                {val}
              </div>
              <div className="w-full rounded-t transition-all duration-500"
                style={{ height: `${Math.max(pct, 3)}%`, background: color }} />
            </div>
          );
        })}
      </div>
      <div className="flex gap-1 mt-2">
        {data.map((d, i) => (
          <div key={i} className="flex-1 text-center">
            {i % 2 === 0 && (
              <p className="text-white/20 text-[9px] truncate">
                {new Date(d.date).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

// ── Circular rate indicator ───────────────────────────────
const RateCircle = ({ value, label, color }) => {
  const r      = 28;
  const circ   = 2 * Math.PI * r;
  const pct    = parseFloat(value) || 0;
  const offset = circ - (pct / 100) * circ;

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative w-20 h-20">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 72 72">
          <circle cx="36" cy="36" r={r} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="8" />
          <circle cx="36" cy="36" r={r} fill="none" stroke={color} strokeWidth="8"
            strokeDasharray={circ} strokeDashoffset={offset}
            strokeLinecap="round" className="transition-all duration-700" />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-sm font-bold font-display">{pct}%</span>
        </div>
      </div>
      <p className="text-xs text-white/40 text-center">{label}</p>
    </div>
  );
};

export default function AdminAnalytics() {
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  useEffect(() => {
    api.get('/admin/analytics')
      .then(r => { setData(r.data); })
      .catch(err => {
        console.error('Analytics error:', err.response?.data || err.message);
        setError(err.response?.data?.error || 'Failed to load analytics');
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex justify-center py-20"><Spinner size="lg" /></div>;

  if (error) return (
    <div className="card border-red-800/30 bg-red-900/10 text-center py-12">
      <p className="text-red-300 font-semibold">Failed to load analytics</p>
      <p className="text-red-300/50 text-sm mt-1">{error}</p>
    </div>
  );

  // Safe value extraction with fallbacks
  const totalUsers      = data?.total_users          ?? 0;
  const totalSessions   = data?.total_sessions        ?? 0;
  const completedSess   = data?.completed_sessions    ?? 0;
  const totalCredits    = data?.total_credits         ?? '0.00';
  const newUsersWeek    = data?.new_users_week        ?? 0;
  const successRate     = data?.success_rate          ?? '0.0';
  const disputeRate     = data?.dispute_rate          ?? '0.0';
  const sessionsPerDay  = data?.sessions_per_day      ?? [];
  const creditsPerDay   = data?.credits_per_day       ?? [];

  // Pending = sessions still in progress (not completed, not disputed, not cancelled)
  // We get this from backend: total - completed - disputed
  const disputedSess = data?.disputed_sessions ?? 0;
  const activeSess   = totalSessions - completedSess - disputedSess;
  const pendingRate  = totalSessions > 0
    ? ((activeSess / totalSessions) * 100).toFixed(1)
    : '0.0';

  return (
    <div className="space-y-8 animate-fade-in">

      {/* Header */}
      <div>
        <h1 className="text-3xl font-display font-bold">Platform <span className="text-gradient">Analytics</span></h1>
        <p className="text-white/40 text-sm mt-1">14-day activity overview</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Users',       value: totalUsers,    icon: '◉', sub: `+${newUsersWeek} this week` },
          { label: 'Total Sessions',    value: totalSessions, icon: '⇄', sub: `${completedSess} completed` },
          { label: 'Credits Exchanged', value: totalCredits,  icon: '◎', sub: 'total transferred'          },
          { label: 'New Users',         value: newUsersWeek,  icon: '✦', sub: 'last 7 days'                },
        ].map(({ label, value, icon, sub }) => (
          <div key={label} className="card">
            <div className="flex items-start justify-between mb-1">
              <p className="text-xs text-white/40 uppercase tracking-widest font-semibold">{label}</p>
              <span className="text-xl text-white/15">{icon}</span>
            </div>
            <p className="text-3xl font-display font-bold">{value}</p>
            {sub && <p className="text-xs text-white/30 mt-1">{sub}</p>}
          </div>
        ))}
      </div>

      {/* Rate circles */}
      <div className="card">
        <h2 className="font-display font-bold text-lg mb-6">Session Rates</h2>
        <div className="flex gap-8 justify-center flex-wrap">
          <RateCircle value={successRate} label="Success Rate"  color="#16a34a" />
          <RateCircle value={disputeRate} label="Dispute Rate"  color="#be123c" />
          <RateCircle value={pendingRate} label="Pending Rate"  color="#ca8a04" />
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <BarChart
            data={sessionsPerDay}
            color="rgba(107,15,26,0.85)"
            valueKey="count"
            label="Sessions per day (last 14 days)"
          />
        </div>
        <div className="card">
          <BarChart
            data={creditsPerDay}
            color="rgba(22,163,74,0.7)"
            valueKey="total"
            label="Credits exchanged per day (last 14 days)"
          />
        </div>
      </div>

      {/* Summary table */}
      <div className="card">
        <h2 className="font-display font-bold text-lg mb-4">Summary</h2>
        <div className="space-y-1">
          {[
            { label: 'Total registered users',    value: totalUsers                  },
            { label: 'Total skill sessions',       value: totalSessions               },
            { label: 'Completed sessions',         value: completedSess               },
            { label: 'Session success rate',       value: `${successRate}%`          },
            { label: 'Dispute rate',               value: `${disputeRate}%`          },
            { label: 'Total credits exchanged',    value: `${totalCredits} cr`       },
            { label: 'New users this week',        value: newUsersWeek               },
          ].map(({ label, value }) => (
            <div key={label} className="flex items-center justify-between py-2.5
                                        border-b border-white/5 last:border-0">
              <span className="text-sm text-white/50">{label}</span>
              <span className="font-semibold font-mono text-white">{value}</span>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
