// src/pages/admin/AdminUsers.jsx
import { useState, useEffect, useCallback } from 'react';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { Spinner, Modal } from '../../components/common';

// ── Tiny components ───────────────────────────────────────
const TrustBar = ({ score }) => (
  <div className="flex items-center gap-2">
    <div className="w-16 h-1.5 bg-surface-100 rounded-full overflow-hidden">
      <div className="h-full bg-gradient-to-r from-maroon-950 to-green-600 rounded-full"
        style={{ width: `${score}%`, background: score > 70 ? '#16a34a' : score > 40 ? '#ca8a04' : '#be123c' }} />
    </div>
    <span className="text-xs text-white/50">{score}</span>
  </div>
);

const Confirm = ({ open, title, message, onConfirm, onClose, danger }) => (
  <Modal open={open} onClose={onClose} title={title}>
    <p className="text-white/50 text-sm mb-6">{message}</p>
    <div className="flex gap-3 justify-end">
      <button onClick={onClose} className="btn-secondary">Cancel</button>
      <button onClick={onConfirm} className={danger ? 'btn-danger' : 'btn-primary'}>{danger ? 'Confirm' : 'Yes'}</button>
    </div>
  </Modal>
);

export default function AdminUsers() {
  const [users,   setUsers]   = useState([]);
  const [total,   setTotal]   = useState(0);
  const [loading, setLoading] = useState(true);
  const [search,  setSearch]  = useState('');
  const [page,    setPage]    = useState(1);

  // Modals
  const [detailUser,  setDetailUser]  = useState(null);
  const [confirmData, setConfirmData] = useState(null);
  const [creditModal, setCreditModal] = useState(null);
  const [creditForm,  setCreditForm]  = useState({ amount: '', reason: '' });
  const [acting,      setActing]      = useState(false);

  const LIMIT = 15;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/admin/users', { params: { search, page, limit: LIMIT } });
      setUsers(data.users);
      setTotal(data.total);
    } catch (_) { toast.error('Failed to load users'); }
    finally { setLoading(false); }
  }, [search, page]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setPage(1); }, [search]);

  // Open user detail modal
  const openDetail = async (id) => {
    try {
      const { data } = await api.get(`/admin/users/${id}`);
      setDetailUser(data);
    } catch (_) { toast.error('Failed to load user'); }
  };

  // Generic confirmed action
  const doAction = async (fn) => {
    setActing(true);
    try { await fn(); await load(); setConfirmData(null); }
    catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
    finally { setActing(false); }
  };

  const handleBlock  = (u) => setConfirmData({
    title:   u.is_blocked ? 'Unblock User' : 'Block User',
    message: `Are you sure you want to ${u.is_blocked ? 'unblock' : 'block'} ${u.name}?`,
    danger:  !u.is_blocked,
    fn:      async () => { const r = await api.put(`/admin/users/${u.id}/toggle-block`); toast.success(r.data.message); },
  });

  const handleStrike = (u, action) => setConfirmData({
    title:   action === 'add' ? 'Add Strike' : 'Remove Strike',
    message: `${action === 'add' ? 'Add a strike to' : 'Remove a strike from'} ${u.name}? Trust score will ${action === 'add' ? 'decrease' : 'increase'} by 10.`,
    danger:  action === 'add',
    fn:      async () => { const r = await api.put(`/admin/users/${u.id}/strike`, { action }); toast.success(r.data.message); },
  });

  const handleCreditSubmit = async () => {
    if (!creditForm.amount) { toast.error('Enter an amount'); return; }
    setActing(true);
    try {
      const r = await api.put(`/admin/users/${creditModal.id}/adjust-credits`, creditForm);
      toast.success(r.data.message);
      setCreditModal(null);
      setCreditForm({ amount: '', reason: '' });
      load();
    } catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
    finally { setActing(false); }
  };

  const totalPages = Math.ceil(total / LIMIT);

  return (
    <div className="space-y-6 animate-fade-in">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold">User <span className="text-gradient">Management</span></h1>
          <p className="text-white/40 text-sm mt-1">{total} registered users</p>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30">⌕</span>
        <input className="input pl-8" placeholder="Search by name or email…"
          value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex justify-center py-16"><Spinner size="lg" /></div>
      ) : (
        <div className="card overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/5 text-white/30 text-xs uppercase tracking-widest">
                  {['User','Credits','Locked','Trust','Strikes','Status','Actions'].map(h => (
                    <th key={h} className="px-4 py-3 text-left font-semibold whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {users.length === 0 ? (
                  <tr><td colSpan={7} className="text-center py-10 text-white/30">No users found</td></tr>
                ) : users.map(u => (
                  <tr key={u.id} className="border-b border-white/5 last:border-0 hover:bg-white/2 transition-colors">
                    {/* User */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-maroon-950/60 flex items-center justify-center text-xs font-bold shrink-0 overflow-hidden">
                          {u.avatar_url ? <img src={u.avatar_url} className="w-full h-full object-cover" alt="" /> : u.name[0].toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium truncate max-w-[120px]">{u.name}</p>
                          <p className="text-white/30 text-xs truncate max-w-[120px]">{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 font-mono text-white/70">{parseFloat(u.credits).toFixed(1)}</td>
                    <td className="px-4 py-3 font-mono text-yellow-400/70">{parseFloat(u.locked_credits).toFixed(1)}</td>
                    <td className="px-4 py-3"><TrustBar score={u.trust_score ?? 100} /></td>
                    <td className="px-4 py-3">
                      <span className={`font-bold ${u.strike_count > 0 ? 'text-red-400' : 'text-white/30'}`}>
                        {u.strike_count ?? 0}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`badge text-xs ${u.is_blocked ? 'bg-red-900/40 text-red-300' : 'bg-green-900/40 text-green-300'}`}>
                        {u.is_blocked ? 'Blocked' : 'Active'}
                      </span>
                    </td>
                    {/* Actions */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <button onClick={() => openDetail(u.id)}
                          className="px-2.5 py-1 rounded-lg text-xs border border-white/10 text-white/50 hover:text-white hover:border-white/20 transition-colors">
                          View
                        </button>
                        <button onClick={() => handleBlock(u)}
                          className={`px-2.5 py-1 rounded-lg text-xs border transition-colors ${u.is_blocked ? 'border-green-700/40 text-green-400 hover:bg-green-900/20' : 'border-red-700/40 text-red-400 hover:bg-red-900/20'}`}>
                          {u.is_blocked ? 'Unblock' : 'Block'}
                        </button>
                        <button onClick={() => handleStrike(u, 'add')}
                          className="px-2.5 py-1 rounded-lg text-xs border border-orange-700/40 text-orange-400 hover:bg-orange-900/20 transition-colors">
                          +Strike
                        </button>
                        {u.strike_count > 0 && (
                          <button onClick={() => handleStrike(u, 'remove')}
                            className="px-2.5 py-1 rounded-lg text-xs border border-blue-700/40 text-blue-400 hover:bg-blue-900/20 transition-colors">
                            -Strike
                          </button>
                        )}
                        <button onClick={() => { setCreditModal(u); setCreditForm({ amount: '', reason: '' }); }}
                          className="px-2.5 py-1 rounded-lg text-xs border border-maroon-700/40 text-maroon-400 hover:bg-maroon-900/20 transition-colors">
                          Credits
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-white/5">
              <p className="text-xs text-white/30">Page {page} of {totalPages}</p>
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

      {/* User Detail Modal */}
      <Modal open={!!detailUser} onClose={() => setDetailUser(null)} title="User Details">
        {detailUser && (
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-maroon-950/60 flex items-center justify-center text-2xl font-bold overflow-hidden border-2 border-maroon-800/40">
                {detailUser.avatar_url ? <img src={detailUser.avatar_url} className="w-full h-full object-cover" alt="" /> : detailUser.name[0].toUpperCase()}
              </div>
              <div>
                <h3 className="font-bold text-lg">{detailUser.name}</h3>
                <p className="text-white/40 text-sm">{detailUser.email}</p>
                {detailUser.location && <p className="text-white/30 text-xs">📍 {detailUser.location}</p>}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              {[
                { label: 'Credits',    value: parseFloat(detailUser.credits).toFixed(1) },
                { label: 'Trust Score', value: detailUser.trust_score ?? 100 },
                { label: 'Strikes',    value: detailUser.strike_count ?? 0 },
              ].map(({ label, value }) => (
                <div key={label} className="bg-surface-100 rounded-xl p-3 text-center border border-white/5">
                  <p className="text-xl font-display font-bold">{value}</p>
                  <p className="text-xs text-white/30 mt-0.5">{label}</p>
                </div>
              ))}
            </div>

            {detailUser.bio && <p className="text-white/50 text-sm bg-surface-100 rounded-lg px-3 py-2 border border-white/5">{detailUser.bio}</p>}

            <div className="grid grid-cols-3 gap-3 text-center text-sm border border-white/5 rounded-xl overflow-hidden">
              {[
                { label: 'Sessions', value: detailUser.request_counts?.total ?? 0 },
                { label: 'Completed', value: detailUser.request_counts?.completed ?? 0 },
                { label: 'Disputed', value: detailUser.request_counts?.disputed ?? 0 },
              ].map(({ label, value }) => (
                <div key={label} className="py-3 border-r border-white/5 last:border-0">
                  <p className="font-bold text-lg font-display">{value}</p>
                  <p className="text-xs text-white/30">{label}</p>
                </div>
              ))}
            </div>

            {detailUser.skills?.length > 0 && (
              <div>
                <p className="text-xs text-white/30 uppercase tracking-widest font-semibold mb-2">Skills</p>
                <div className="flex flex-wrap gap-2">
                  {detailUser.skills.map(s => (
                    <span key={s.id} className={`badge text-xs ${s.is_active ? 'bg-maroon-950/40 text-maroon-300 border border-maroon-800/30' : 'bg-surface-100 text-white/30'}`}>
                      {s.skill_name}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className="text-xs text-white/20 text-right">
              Member since {new Date(detailUser.created_at).toLocaleDateString()}
            </div>
          </div>
        )}
      </Modal>

      {/* Adjust Credits Modal */}
      <Modal open={!!creditModal} onClose={() => setCreditModal(null)} title={`Adjust Credits — ${creditModal?.name}`}>
        <div className="space-y-4">
          <p className="text-xs text-white/40 bg-surface-100 rounded-lg px-3 py-2 border border-white/5">
            Current balance: <strong className="text-white">{parseFloat(creditModal?.credits || 0).toFixed(2)} credits</strong>
            <br />Use a positive number to add, negative to deduct (e.g. -2)
          </p>
          <div>
            <label className="label">Amount</label>
            <input className="input" type="number" step="0.5" placeholder="e.g. 5 or -2"
              value={creditForm.amount} onChange={e => setCreditForm(f => ({ ...f, amount: e.target.value }))} />
          </div>
          <div>
            <label className="label">Reason</label>
            <input className="input" placeholder="Reason for adjustment…"
              value={creditForm.reason} onChange={e => setCreditForm(f => ({ ...f, reason: e.target.value }))} />
          </div>
          <div className="flex gap-3">
            <button onClick={() => setCreditModal(null)} className="btn-secondary flex-1">Cancel</button>
            <button onClick={handleCreditSubmit} className="btn-primary flex-1" disabled={acting}>
              {acting ? 'Saving…' : 'Apply Adjustment'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Confirm Dialog */}
      <Confirm
        open={!!confirmData}
        title={confirmData?.title}
        message={confirmData?.message}
        danger={confirmData?.danger}
        onClose={() => setConfirmData(null)}
        onConfirm={() => doAction(confirmData.fn)}
      />
    </div>
  );
}
