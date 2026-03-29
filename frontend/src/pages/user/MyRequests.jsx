// src/pages/user/MyRequests.jsx
// Manages both sent requests (as requester) and incoming (as provider)

import { useState, useEffect, useCallback } from 'react';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { PageHeader, StatusBadge, EmptyState, Spinner, Modal } from '../../components/common';

const TABS = ['Sent', 'Incoming'];

export default function MyRequests() {
  const [tab,      setTab]      = useState(0);
  const [sent,     setSent]     = useState([]);
  const [incoming, setIncoming] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [rateModal, setRateModal] = useState(null);  // request to rate
  const [rateForm,  setRateForm]  = useState({ rating: 5, review: '' });
  const [acting,   setActing]   = useState(null);    // id being actioned

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [s, i] = await Promise.all([
        api.get('/requests/mine'),
        api.get('/requests/incoming'),
      ]);
      setSent(s.data);
      setIncoming(i.data);
    } catch (_) { toast.error('Failed to load requests'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Provider: approve or reject
  const respond = async (id, action) => {
    setActing(id);
    try {
      await api.put(`/requests/${id}/respond`, { action });
      toast.success(`Request ${action}d`);
      load();
    } catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
    finally { setActing(null); }
  };

  // Both parties: confirm session
  const confirm = async (id, confirmed) => {
    setActing(id);
    try {
      await api.put(`/requests/${id}/confirm`, { confirmed });
      toast.success(confirmed ? 'Session confirmed!' : 'Session rejected');
      load();
    } catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
    finally { setActing(null); }
  };

  // Submit rating
  const submitRating = async () => {
    try {
      await api.post('/ratings', { request_id: rateModal.id, ...rateForm });
      toast.success('Rating submitted!');
      setRateModal(null);
    } catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
  };

  const currentList = tab === 0 ? sent : incoming;

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader title="My Requests" subtitle="Track and manage your skill exchange sessions" />

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-surface-100 rounded-xl w-fit">
        {TABS.map((t, i) => (
          <button
            key={t}
            onClick={() => setTab(i)}
            className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all duration-150
              ${tab === i ? 'bg-maroon-950 text-white shadow-glow-maroon' : 'text-white/40 hover:text-white'}`}
          >
            {t}
            <span className={`ml-1.5 text-xs ${tab === i ? 'text-maroon-300' : 'text-white/20'}`}>
              {i === 0 ? sent.length : incoming.length}
            </span>
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Spinner size="lg" /></div>
      ) : currentList.length === 0 ? (
        <EmptyState icon="⇄" title={`No ${TABS[tab].toLowerCase()} requests`} />
      ) : (
        <div className="space-y-4">
          {currentList.map(r => (
            <RequestCard
              key={r.id}
              request={r}
              isIncoming={tab === 1}
              onRespond={respond}
              onConfirm={confirm}
              onRate={() => setRateModal(r)}
              acting={acting === r.id}
            />
          ))}
        </div>
      )}

      {/* Rating Modal */}
      <Modal open={!!rateModal} onClose={() => setRateModal(null)} title="Rate this session">
        <div className="space-y-4">
          <div>
            <label className="label">Rating</label>
            <div className="flex gap-2">
              {[1,2,3,4,5].map(n => (
                <button
                  key={n}
                  onClick={() => setRateForm(f => ({ ...f, rating: n }))}
                  className={`text-2xl transition-colors ${n <= rateForm.rating ? 'text-maroon-500' : 'text-white/20'}`}
                >★</button>
              ))}
            </div>
          </div>
          <div>
            <label className="label">Review (optional)</label>
            <textarea
              className="input resize-none h-20"
              placeholder="Share your experience…"
              value={rateForm.review}
              onChange={e => setRateForm(f => ({ ...f, review: e.target.value }))}
            />
          </div>
          <div className="flex gap-3">
            <button onClick={() => setRateModal(null)} className="btn-secondary flex-1">Cancel</button>
            <button onClick={submitRating} className="btn-primary flex-1">Submit Rating</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

// ── Request Card ──────────────────────────────────────────
function RequestCard({ request: r, isIncoming, onRespond, onConfirm, onRate, acting }) {
  return (
    <div className="card space-y-3">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="font-semibold">{r.skill_name}</h3>
          <p className="text-xs text-white/40 mt-0.5">
            {isIncoming
              ? `From: ${r.requester_name}`
              : `Provider: ${r.provider_name}`}
            {' · '}{r.hours_requested}h · {(r.hours_requested * r.credits_per_hour).toFixed(1)} credits
          </p>
        </div>
        <StatusBadge status={r.status} />
      </div>

      {r.message && (
        <p className="text-white/40 text-xs bg-surface-100 rounded-lg px-3 py-2 border border-white/5">
          "{r.message}"
        </p>
      )}

      {/* Actions */}
      <div className="flex flex-wrap gap-2 pt-1">
        {/* Provider actions on pending */}
        {isIncoming && r.status === 'pending' && (
          <>
            <button onClick={() => onRespond(r.id, 'approve')} className="btn-primary py-1.5 text-xs" disabled={acting}>
              {acting ? '…' : '✓ Approve'}
            </button>
            <button onClick={() => onRespond(r.id, 'reject')} className="btn-danger py-1.5 text-xs" disabled={acting}>
              {acting ? '…' : '✗ Reject'}
            </button>
          </>
        )}

        {/* Confirmation after session */}
{(r.status === 'approved' || r.status === 'waiting_confirmation') && (() => {
  // Figure out if THIS user already confirmed
  const alreadyConfirmed = isIncoming
    ? r.provider_confirmed !== null    // provider already responded
    : r.requester_confirmed !== null;  // requester already responded

  if (alreadyConfirmed) {
    return (
      <div className="text-xs text-white/40 px-3 py-2 rounded-lg bg-surface-100 border border-white/5">
        ⏳ Your confirmation is recorded. Waiting for the other party…
      </div>
    );
  }

  return (
    <>
      <button onClick={() => onConfirm(r.id, true)} className="btn-primary py-1.5 text-xs" disabled={acting}>
        {acting ? '…' : '✓ Confirm Session'}
      </button>
      <button onClick={() => onConfirm(r.id, false)} className="btn-danger py-1.5 text-xs" disabled={acting}>
        {acting ? '…' : '✗ Session Didn\'t Happen'}
      </button>
    </>
  );
})()}

        {/* Rate completed session */}
        {r.status === 'completed' && (
          <button onClick={onRate} className="btn-secondary py-1.5 text-xs">★ Leave Rating</button>
        )}
      </div>
    </div>
  );
}
