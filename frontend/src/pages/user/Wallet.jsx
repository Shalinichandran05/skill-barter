// src/pages/user/Wallet.jsx
// Displays credit balance and full transaction history

import { useState, useEffect } from 'react';
import api from '../../services/api';
import { PageHeader, Spinner, StatCard } from '../../components/common';

const TYPE_STYLES = {
  earn:     'text-green-400',
  bonus:    'text-green-400',
  transfer: 'text-maroon-400',
  spend:    'text-red-400',
  lock:     'text-yellow-400',
  unlock:   'text-blue-400',
  refund:   'text-blue-400',
};

const TYPE_SIGNS = {
  earn: '+', bonus: '+', unlock: '+', refund: '+',
  spend: '-', lock: '−', transfer: '↔',
};

export default function Wallet() {
  const [wallet,  setWallet]  = useState(null);
  const [txns,    setTxns]    = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/credits/wallet'),
      api.get('/credits/transactions'),
    ]).then(([w, t]) => {
      setWallet(w.data);
      setTxns(t.data);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex justify-center py-20"><Spinner size="lg" /></div>;

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader title="Credit Wallet" subtitle="Your time credit balance and history" />

      {/* Balance cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard label="Available Credits" value={wallet?.available?.toFixed(2)} icon="◎" accent />
        <StatCard label="Locked (in escrow)" value={wallet?.locked?.toFixed(2)}    icon="⚷" />
        <StatCard label="Total Earned"       value={wallet?.total?.toFixed(2)}      icon="✦" />
      </div>

      {/* Visual bar */}
      {wallet?.total > 0 && (
        <div className="card">
          <div className="flex justify-between text-xs text-white/40 mb-2">
            <span>Available: {wallet.available?.toFixed(2)} cr</span>
            <span>Locked: {wallet.locked?.toFixed(2)} cr</span>
          </div>
          <div className="h-3 bg-surface-100 rounded-full overflow-hidden flex">
            <div
              className="h-full bg-gradient-to-r from-maroon-950 to-maroon-700 transition-all duration-700"
              style={{ width: `${(wallet.available / wallet.total) * 100}%` }}
            />
            <div
              className="h-full bg-yellow-800/60"
              style={{ width: `${(wallet.locked / wallet.total) * 100}%` }}
            />
          </div>
          <p className="text-xs text-white/20 mt-2 text-center">
            Total balance: {wallet.total?.toFixed(2)} credits
          </p>
        </div>
      )}

      {/* Transaction history */}
      <div className="card">
        <h2 className="font-display font-bold text-lg mb-4">Transaction History</h2>
        {txns.length === 0 ? (
          <p className="text-white/30 text-sm text-center py-8">No transactions yet.</p>
        ) : (
          <div className="space-y-1">
            {txns.map(t => (
              <div
                key={t.id}
                className="flex items-center justify-between py-3 px-3 rounded-lg hover:bg-surface-100 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`w-8 h-8 rounded-full bg-surface-100 flex items-center justify-center text-sm font-bold shrink-0 ${TYPE_STYLES[t.transaction_type] || 'text-white/40'}`}>
                    {TYPE_SIGNS[t.transaction_type] || '·'}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium capitalize">
                      {t.transaction_type.replace('_', ' ')}
                    </p>
                    <p className="text-xs text-white/30 truncate">
                      {t.note || (t.from_name ? `From ${t.from_name}` : t.to_name ? `To ${t.to_name}` : '—')}
                    </p>
                  </div>
                </div>
                <div className="text-right shrink-0 ml-4">
                  <p className={`font-semibold font-mono ${TYPE_STYLES[t.transaction_type] || 'text-white/60'}`}>
                    {TYPE_SIGNS[t.transaction_type] || ''}{parseFloat(t.credits).toFixed(2)}
                  </p>
                  <p className="text-xs text-white/20">
                    {new Date(t.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
