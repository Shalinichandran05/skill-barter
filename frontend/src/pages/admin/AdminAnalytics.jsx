// src/pages/admin/AdminAnalytics.jsx
import { useState, useEffect } from 'react';
import api from '../../services/api';
import { Spinner } from '../../components/common';

// ── Bar chart (pure CSS, no library) ─────────────────────
const BarChart = ({ data, color, valueKey = 'count', label, suffix = '' }) => {
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

  const localDateKey = (date) => {
    const d = new Date(date);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  const normalizeSeries = (rows) => {
    const values = new Map(rows.map(row => [String(row.date).slice(0, 10), parseFloat(row[valueKey]) || 0]));
    const today = new Date();

    return Array.from({ length: 14 }, (_, index) => {
      const d = new Date(today);
      d.setDate(today.getDate() - (13 - index));
      const key = localDateKey(d);
      return { date: key, [valueKey]: values.get(key) || 0 };
    });
  };

  const series = normalizeSeries(data);
  const max = Math.max(...series.map(d => parseFloat(d[valueKey]) || 0), 1);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-xs text-white/40 uppercase tracking-widest font-semibold">{label}</p>
        <p className="text-xs text-white/25">Last 14 days</p>
      </div>
      <div className="relative h-40 border-l border-b border-white/10 pl-3 pb-2">
        <div className="absolute inset-x-3 top-1/3 border-t border-white/5" />
        <div className="absolute inset-x-3 top-2/3 border-t border-white/5" />
        <div className="relative flex items-end gap-2 h-full">
        {series.map((d, i) => {
          const val = parseFloat(d[valueKey]) || 0;
          const pct = (val / max) * 100;
          return (
            <div key={d.date} className="flex-1 flex flex-col items-center group relative h-full justify-end">
              <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-surface-50 border border-white/10
                              text-xs text-white px-2 py-1 rounded whitespace-nowrap opacity-0
                              group-hover:opacity-100 transition-opacity z-10 pointer-events-none">
                {val}{suffix}
              </div>
              <div
                className="w-full max-w-8 rounded-t border border-white/10 transition-all duration-500 shadow-lg"
                style={{
                  height: val > 0 ? `${Math.max(pct, 14)}%` : '4px',
                  background: val > 0 ? color : 'rgba(255,255,255,0.08)',
                  boxShadow: val > 0 ? `0 0 18px ${color}` : 'none',
                }}
              />
            </div>
          );
        })}
        </div>
      </div>
      <div className="flex gap-1 mt-2">
        {series.map((d, i) => (
          <div key={d.date} className="flex-1 text-center">
            {(i === 0 || i === series.length - 1 || i % 3 === 0) && (
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

const STATUS_COLORS = {
  completed: '#16a34a',
  pending: '#ca8a04',
  approved: '#2563eb',
  waiting_confirmation: '#7c3aed',
  disputed: '#be123c',
  rejected: '#64748b',
  cancelled: '#94a3b8',
};

const StatusBreakdown = ({ rows = [], total = 0 }) => {
  const sorted = rows
    .map(row => ({ status: row.status, count: Number(row.count) || 0 }))
    .filter(row => row.count > 0)
    .sort((a, b) => b.count - a.count);

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <p className="text-xs text-white/40 uppercase tracking-widest font-semibold">Session status mix</p>
        <p className="text-xs text-white/25">{total} total</p>
      </div>
      {sorted.length === 0 ? (
        <p className="text-white/25 text-sm py-10 text-center">No sessions recorded yet.</p>
      ) : (
        <div className="space-y-3">
          {sorted.map(({ status, count }) => {
            const pct = total > 0 ? (count / total) * 100 : 0;
            const label = status.replace('_', ' ');
            return (
              <div key={status}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-white/50 capitalize">{label}</span>
                  <span className="font-mono text-white/70">{count} · {pct.toFixed(1)}%</span>
                </div>
                <div className="h-2.5 bg-surface-100 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{ width: `${Math.max(pct, 2)}%`, background: STATUS_COLORS[status] || '#6b7280' }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
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
  const pendingRate     = data?.pending_rate          ?? '0.0';
  const pendingSess     = data?.pending_sessions      ?? 0;
  const sessionsPerDay  = data?.sessions_per_day      ?? [];
  const creditsPerDay   = data?.credits_per_day       ?? [];
  const statusCounts    = data?.status_counts         ?? [];

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
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="card">
          <BarChart
            data={sessionsPerDay}
            color="rgba(225,29,72,0.85)"
            valueKey="count"
            label="Sessions per day (last 14 days)"
          />
        </div>
        <div className="card">
          <BarChart
            data={creditsPerDay}
            color="rgba(22,163,74,0.8)"
            valueKey="total"
            label="Credits exchanged per day (last 14 days)"
            suffix=" cr"
          />
        </div>
        <div className="card">
          <StatusBreakdown rows={statusCounts} total={totalSessions} />
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
            { label: 'Pending requests',           value: pendingSess                 },
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
