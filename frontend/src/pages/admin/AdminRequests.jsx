// src/pages/admin/AdminRequests.jsx
import { useState, useEffect } from 'react';
import api from '../../services/api';
import { PageHeader, StatusBadge, Spinner, EmptyState } from '../../components/common';

export default function AdminRequests() {
  const [requests, setRequests] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [filter,   setFilter]   = useState('');

  useEffect(() => {
    api.get('/admin/requests')
      .then(({ data }) => setRequests(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const STATUSES = ['', 'pending', 'approved', 'completed', 'disputed', 'rejected', 'cancelled'];
  const filtered = filter ? requests.filter(r => r.status === filter) : requests;

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader title="All Requests" subtitle={`${requests.length} total skill sessions`} />

      {/* Status filter */}
      <div className="flex flex-wrap gap-2">
        {STATUSES.map(s => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
              filter === s
                ? 'bg-maroon-950 border-maroon-700 text-white'
                : 'border-white/10 text-white/40 hover:text-white hover:border-white/20'
            }`}
          >
            {s || 'All'}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Spinner size="lg" /></div>
      ) : filtered.length === 0 ? (
        <EmptyState icon="⇄" title="No requests found" />
      ) : (
        <div className="card overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/5 text-white/30 text-xs uppercase tracking-widest">
                  <th className="px-5 py-3 text-left font-semibold">Skill</th>
                  <th className="px-5 py-3 text-left font-semibold">Requester</th>
                  <th className="px-5 py-3 text-left font-semibold">Provider</th>
                  <th className="px-5 py-3 text-right font-semibold">Hours</th>
                  <th className="px-5 py-3 text-left font-semibold">Status</th>
                  <th className="px-5 py-3 text-left font-semibold">Date</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(r => (
                  <tr key={r.id} className="border-b border-white/5 last:border-0 hover:bg-white/2 transition-colors">
                    <td className="px-5 py-3 font-medium">{r.skill_name}</td>
                    <td className="px-5 py-3 text-white/60">{r.requester_name}</td>
                    <td className="px-5 py-3 text-white/60">{r.provider_name}</td>
                    <td className="px-5 py-3 text-right font-mono text-white/60">{r.hours_requested}h</td>
                    <td className="px-5 py-3"><StatusBadge status={r.status} /></td>
                    <td className="px-5 py-3 text-white/30 text-xs">{new Date(r.created_at).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
