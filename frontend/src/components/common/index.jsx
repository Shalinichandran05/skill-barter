// src/components/common/index.jsx
// Barrel file of shared UI primitives

// ── Status Badge ──────────────────────────────────────────
const STATUS_STYLES = {
  pending:               'bg-yellow-900/40 text-yellow-300 border border-yellow-700/40',
  approved:              'bg-blue-900/40   text-blue-300   border border-blue-700/40',
  waiting_confirmation:  'bg-purple-900/40 text-purple-300 border border-purple-700/40',
  completed:             'bg-green-900/40  text-green-300  border border-green-700/40',
  disputed:              'bg-red-900/40    text-red-300    border border-red-700/40',
  rejected:              'bg-gray-800/60   text-gray-400   border border-gray-700/40',
  cancelled:             'bg-gray-800/60   text-gray-400   border border-gray-700/40',
  open:                  'bg-red-900/40    text-red-300    border border-red-700/40',
  resolved:              'bg-green-900/40  text-green-300  border border-green-700/40',
  dismissed:             'bg-gray-800/60   text-gray-400   border border-gray-700/40',
};

export const StatusBadge = ({ status }) => (
  <span className={`badge ${STATUS_STYLES[status] || 'bg-gray-800 text-gray-400'}`}>
    {status?.replace('_', ' ')}
  </span>
);

// ── Star Rating Display ───────────────────────────────────
export const Stars = ({ rating, size = 'sm' }) => {
  const sz = size === 'sm' ? 'text-sm' : 'text-lg';
  return (
    <span className={sz}>
      {[1,2,3,4,5].map(i => (
        <span key={i} className={i <= Math.round(rating) ? 'text-maroon-500' : 'text-white/20'}>★</span>
      ))}
    </span>
  );
};

// ── Loading Spinner ───────────────────────────────────────
export const Spinner = ({ size = 'md' }) => {
  const s = size === 'sm' ? 'w-4 h-4' : size === 'lg' ? 'w-10 h-10' : 'w-6 h-6';
  return (
    <div className={`${s} border-2 border-maroon-950 border-t-transparent rounded-full animate-spin`} />
  );
};

// ── Empty State ───────────────────────────────────────────
export const EmptyState = ({ icon = '◎', title, description, action }) => (
  <div className="flex flex-col items-center justify-center py-16 text-center">
    <div className="text-5xl text-white/10 mb-4">{icon}</div>
    <h3 className="text-lg font-semibold text-white/60 mb-1">{title}</h3>
    {description && <p className="text-sm text-white/30 mb-4 max-w-xs">{description}</p>}
    {action}
  </div>
);

// ── Page Header ───────────────────────────────────────────
export const PageHeader = ({ title, subtitle, action }) => (
  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-8">
    <div>
      <h1 className="text-2xl lg:text-3xl font-display font-bold text-white">{title}</h1>
      {subtitle && <p className="text-white/40 text-sm mt-1">{subtitle}</p>}
    </div>
    {action && <div className="shrink-0">{action}</div>}
  </div>
);

// ── Stat Card ─────────────────────────────────────────────
export const StatCard = ({ label, value, icon, accent = false }) => (
  <div className={`card ${accent ? 'border-maroon-800/40 bg-maroon-950/20' : ''}`}>
    <div className="flex items-start justify-between">
      <div>
        <p className="text-xs text-white/40 uppercase tracking-widest font-semibold">{label}</p>
        <p className="text-3xl font-bold mt-1 font-display">{value}</p>
      </div>
      <span className="text-2xl text-white/20">{icon}</span>
    </div>
  </div>
);

// ── Modal ─────────────────────────────────────────────────
export const Modal = ({ open, onClose, title, children }) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative glass rounded-2xl w-full max-w-md p-6 animate-slide-up">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-display font-bold">{title}</h2>
          <button onClick={onClose} className="text-white/40 hover:text-white transition-colors text-xl leading-none">×</button>
        </div>
        {children}
      </div>
    </div>
  );
};

// ── Confirm Dialog ────────────────────────────────────────
export const ConfirmDialog = ({ open, onClose, onConfirm, title, message, confirmLabel = 'Confirm', danger = false }) => (
  <Modal open={open} onClose={onClose} title={title}>
    <p className="text-white/60 text-sm mb-6">{message}</p>
    <div className="flex gap-3 justify-end">
      <button onClick={onClose} className="btn-secondary">Cancel</button>
      <button onClick={onConfirm} className={danger ? 'btn-danger' : 'btn-primary'}>{confirmLabel}</button>
    </div>
  </Modal>
);
