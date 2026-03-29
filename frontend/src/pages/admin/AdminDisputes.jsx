// src/pages/admin/AdminDisputes.jsx
import { useState, useEffect, useCallback } from 'react';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { Spinner, StatusBadge, Modal } from '../../components/common';

const FILTERS = ['', 'open', 'resolved', 'dismissed'];

const ConfirmBadge = ({ val }) => {
  if (val === null || val === undefined) return <span className="badge bg-yellow-900/40 text-yellow-300 text-xs">Pending</span>;
  return val
    ? <span className="badge bg-green-900/40 text-green-300 text-xs">Confirmed ✓</span>
    : <span className="badge bg-red-900/40 text-red-300 text-xs">Rejected ✗</span>;
};

export default function AdminDisputes() {
  const [disputes, setDisputes] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [filter,   setFilter]   = useState('open');
  const [detail,   setDetail]   = useState(null);
  const [form,     setForm]     = useState({ winner: 'provider', resolution: '', strike_provider: false, strike_requester: false });
  const [saving,   setSaving]   = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/admin/disputes', { params: { status: filter } });
      setDisputes(data);
    } catch (_) { toast.error('Failed to load disputes'); }
    finally { setLoading(false); }
  }, [filter]);

  useEffect(() => { load(); }, [load]);

  const openDetail = (d) => {
    setDetail(d);
    setForm({ winner: 'provider', resolution: '', strike_provider: false, strike_requester: false });
  };

  const resolve = async () => {
    setSaving(true);
    try {
      await api.put(`/admin/disputes/${detail.id}/resolve`, form);
      toast.success('Dispute resolved!');
      setDetail(null);
      load();
    } catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
    finally { setSaving(false); }
  };

  const cost = detail ? (parseFloat(detail.hours_requested) * parseFloat(detail.credits_per_hour)).toFixed(2) : 0;

  return (
    <div className="space-y-6 animate-fade-in">

      {/* Header */}
      <div>
        <h1 className="text-3xl font-display font-bold">Dispute <span className="text-gradient">Management</span></h1>
        <p className="text-white/40 text-sm mt-1">Review and resolve session disputes</p>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 p-1 bg-surface-100 rounded-xl w-fit">
        {FILTERS.map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all capitalize
              ${filter === f ? 'bg-maroon-950 text-white shadow-glow-maroon' : 'text-white/40 hover:text-white'}`}>
            {f || 'All'}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Spinner size="lg" /></div>
      ) : disputes.length === 0 ? (
        <div className="card text-center py-16 text-white/30">
          <p className="text-4xl mb-3">⚑</p>
          <p className="font-semibold">No {filter} disputes</p>
        </div>
      ) : (
        <div className="card overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/5 text-white/30 text-xs uppercase tracking-widest">
                  {['#','Skill','Requester','Provider','Hours','Reason','Status','Action'].map(h => (
                    <th key={h} className="px-4 py-3 text-left font-semibold whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {disputes.map(d => (
                  <tr key={d.id} className="border-b border-white/5 last:border-0 hover:bg-white/2 transition-colors">
                    <td className="px-4 py-3 text-white/30 font-mono">#{d.id}</td>
                    <td className="px-4 py-3 font-medium max-w-[120px] truncate">{d.skill_name}</td>
                    <td className="px-4 py-3 text-white/60">{d.requester_name}</td>
                    <td className="px-4 py-3 text-white/60">{d.provider_name}</td>
                    <td className="px-4 py-3 text-white/60">{d.hours_requested}h</td>
                    <td className="px-4 py-3 text-white/50 max-w-[140px] truncate" title={d.reason}>{d.reason}</td>
                    <td className="px-4 py-3"><StatusBadge status={d.status} /></td>
                    <td className="px-4 py-3">
                      <button onClick={() => openDetail(d)}
                        className="px-3 py-1.5 rounded-lg text-xs border border-maroon-700/40 text-maroon-400 hover:bg-maroon-900/20 transition-colors whitespace-nowrap">
                        {d.status === 'open' ? 'Resolve →' : 'View →'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Detail / Resolve Modal */}
      <Modal open={!!detail} onClose={() => setDetail(null)} title={`Dispute #${detail?.id} — ${detail?.skill_name}`}>
        {detail && (
          <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">

            {/* Request details */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-surface-100 rounded-xl p-3 border border-white/5">
                <p className="text-xs text-white/30 mb-1">Provider</p>
                <p className="font-semibold">{detail.provider_name}</p>
                <div className="mt-1.5"><ConfirmBadge val={detail.provider_confirmed} /></div>
                <p className="text-xs text-white/30 mt-1">Trust: {detail.provider_trust ?? 100} · Strikes: {detail.provider_strikes ?? 0}</p>
              </div>
              <div className="bg-surface-100 rounded-xl p-3 border border-white/5">
                <p className="text-xs text-white/30 mb-1">Requester</p>
                <p className="font-semibold">{detail.requester_name}</p>
                <div className="mt-1.5"><ConfirmBadge val={detail.requester_confirmed} /></div>
                <p className="text-xs text-white/30 mt-1">Trust: {detail.requester_trust ?? 100} · Strikes: {detail.requester_strikes ?? 0}</p>
              </div>
            </div>

            <div className="bg-surface-100 rounded-xl p-3 border border-white/5 text-sm space-y-1">
              <div className="flex justify-between text-white/50"><span>Hours</span><span>{detail.hours_requested}h</span></div>
              <div className="flex justify-between text-white/50"><span>Credits at stake</span><span className="text-maroon-400 font-semibold">{cost} cr</span></div>
              <div className="flex justify-between text-white/50"><span>Request status</span><StatusBadge status={detail.request_status} /></div>
            </div>

            <div className="bg-red-900/10 border border-red-800/30 rounded-xl p-3 text-sm">
              <p className="text-xs text-white/30 uppercase tracking-widest font-semibold mb-1">Dispute reason</p>
              <p className="text-white/70">{detail.reason}</p>
            </div>

            {detail.status === 'open' && (
              <>
                {/* Winner */}
                <div>
                  <label className="label">Award {cost} credits to</label>
                  <select className="input" value={form.winner} onChange={e => setForm(f => ({ ...f, winner: e.target.value }))}>
                    <option value="provider">Provider — session happened as expected</option>
                    <option value="requester">Requester — session did not happen, refund</option>
                    <option value="split">Split 50/50 — partial fault on both sides</option>
                  </select>
                </div>

                {/* Resolution note */}
                <div>
                  <label className="label">Resolution Note</label>
                  <textarea className="input resize-none h-16" placeholder="Explain your decision…"
                    value={form.resolution} onChange={e => setForm(f => ({ ...f, resolution: e.target.value }))} />
                </div>

                {/* Optional strikes */}
                <div className="space-y-2">
                  <p className="text-xs text-white/30 uppercase tracking-widest font-semibold">Optional strikes</p>
                  <label className="flex items-center gap-3 text-sm text-white/60 cursor-pointer hover:text-white transition-colors">
                    <input type="checkbox" className="accent-maroon-600 w-4 h-4"
                      checked={form.strike_provider} onChange={e => setForm(f => ({ ...f, strike_provider: e.target.checked }))} />
                    Add strike to provider ({detail.provider_name})
                  </label>
                  <label className="flex items-center gap-3 text-sm text-white/60 cursor-pointer hover:text-white transition-colors">
                    <input type="checkbox" className="accent-maroon-600 w-4 h-4"
                      checked={form.strike_requester} onChange={e => setForm(f => ({ ...f, strike_requester: e.target.checked }))} />
                    Add strike to requester ({detail.requester_name})
                  </label>
                </div>

                <div className="flex gap-3 pt-1">
                  <button onClick={() => setDetail(null)} className="btn-secondary flex-1">Cancel</button>
                  <button onClick={resolve} className="btn-primary flex-1" disabled={saving}>
                    {saving ? 'Resolving…' : 'Resolve Dispute'}
                  </button>
                </div>
              </>
            )}

            {detail.status !== 'open' && detail.resolution && (
              <div className="bg-green-900/10 border border-green-800/30 rounded-xl p-3 text-sm">
                <p className="text-xs text-white/30 uppercase tracking-widest font-semibold mb-1">Resolution</p>
                <p className="text-white/70">{detail.resolution}</p>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
