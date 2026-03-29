// src/pages/admin/AdminSessions.jsx
// Shows all skill sessions with filtering by status

import { useState, useEffect, useCallback } from 'react';
import { formatDateTime, formatDate } from '../../utils/time';
import api from '../../services/api';
import { Spinner, StatusBadge, EmptyState } from '../../components/common';

const STATUSES = ['', 'pending', 'approved', 'waiting_confirmation', 'completed', 'disputed', 'rejected', 'cancelled'];

const ConfirmBadge = ({ val }) => {
  if (val === null || val === undefined)
    return <span className="text-white/20 text-xs">—</span>;
  return val
    ? <span className="text-green-400 text-xs font-semibold">✓ Yes</span>
    : <span className="text-red-400 text-xs font-semibold">✗ No</span>;
};

export default function AdminSessions() {
  const [sessions, setSessions] = useState([]);
  const [total,    setTotal]    = useState(0);
  const [loading,  setLoading]  = useState(true);
  const [filter,   setFilter]   = useState('');
  const [page,     setPage]     = useState(1);
  const [expanded, setExpanded] = useState(null); // expanded row id

  const LIMIT = 25;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/admin/sessions', {
        params: { status: filter, page, limit: LIMIT }
      });
      setSessions(data.sessions);
      setTotal(data.total);
    } catch (_) {}
    finally { setLoading(false); }
  }, [filter, page]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setPage(1); }, [filter]);

  const totalPages = Math.ceil(total / LIMIT);

  return (
    <div className="space-y-6 animate-fade-in">

      {/* Header */}
      <div>
        <h1 className="text-3xl font-display font-bold">
          Sessions <span className="text-gradient">History</span>
        </h1>
        <p className="text-white/40 text-sm mt-1">{total} total sessions on the platform</p>
      </div>

      {/* Status filter */}
      <div className="flex flex-wrap gap-2">
        {STATUSES.map(s => (
          <button key={s} onClick={() => setFilter(s)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border capitalize transition-colors
              ${filter === s
                ? 'bg-maroon-950 border-maroon-700 text-white'
                : 'border-white/10 text-white/40 hover:text-white hover:border-white/20'
              }`}>
            {s || 'All'}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Spinner size="lg" /></div>
      ) : sessions.length === 0 ? (
        <EmptyState icon="⇄" title="No sessions found" description="Try a different filter." />
      ) : (
        <div className="card overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/5 text-white/30 text-xs uppercase tracking-widest">
                  {['#', 'Skill', 'Requester', 'Provider', 'Hours', 'Credits', 'Status', 'Date', 'Details'].map(h => (
                    <th key={h} className="px-4 py-3 text-left font-semibold whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sessions.map(s => (
                  <>
                    <tr key={s.id}
                      className="border-b border-white/5 last:border-0 hover:bg-white/2 transition-colors cursor-pointer"
                      onClick={() => setExpanded(expanded === s.id ? null : s.id)}
                    >
                      <td className="px-4 py-3 text-white/30 font-mono text-xs">#{s.id}</td>
                      <td className="px-4 py-3 font-medium max-w-[120px] truncate">{s.skill_name}</td>
                      <td className="px-4 py-3 text-white/60">{s.requester_name}</td>
                      <td className="px-4 py-3 text-white/60">{s.provider_name}</td>
                      <td className="px-4 py-3 text-white/60 font-mono">{s.hours_requested}h</td>
                      <td className="px-4 py-3 text-maroon-400 font-semibold font-mono">
                        {parseFloat(s.total_credits).toFixed(1)} cr
                      </td>
                      <td className="px-4 py-3"><StatusBadge status={s.status} /></td>
                      <td className="px-4 py-3 text-white/30 text-xs whitespace-nowrap">
                        {formatDate(s.created_at)}
                      </td>
                      <td className="px-4 py-3 text-white/30 text-xs">
                        {expanded === s.id ? '▲' : '▼'}
                      </td>
                    </tr>

                    {/* Expanded detail row */}
                    {expanded === s.id && (
                      <tr key={`${s.id}-detail`} className="bg-surface-100/50">
                        <td colSpan={9} className="px-6 py-4">
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                            <div>
                              <p className="text-white/30 uppercase tracking-widest font-semibold mb-1">Provider confirmed</p>
                              <ConfirmBadge val={s.provider_confirmed} />
                            </div>
                            <div>
                              <p className="text-white/30 uppercase tracking-widest font-semibold mb-1">Requester confirmed</p>
                              <ConfirmBadge val={s.requester_confirmed} />
                            </div>
                            <div>
                              <p className="text-white/30 uppercase tracking-widest font-semibold mb-1">Credits/hour</p>
                              <p className="text-white/70">{s.credits_per_hour} cr/hr</p>
                            </div>
                            <div>
                              <p className="text-white/30 uppercase tracking-widest font-semibold mb-1">Deadline</p>
                              <p className="text-white/70">
                                {s.confirmation_deadline
                                  ? new Date(s.confirmation_deadline).toLocaleString('en-IN')
                                  : '—'
                                }
                              </p>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-white/5">
              <p className="text-xs text-white/30">Page {page} of {totalPages} · {total} sessions</p>
              <div className="flex gap-2">
                <button disabled={page === 1} onClick={() => setPage(p => p - 1)}
                  className="btn-secondary text-xs py-1.5 px-3 disabled:opacity-30">← Prev</button>
                <button disabled={page === totalPages} onClick={() => setPage(p => p + 1)}
                  className="btn-secondary text-xs py-1.5 px-3 disabled:opacity-30">Next →</button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
