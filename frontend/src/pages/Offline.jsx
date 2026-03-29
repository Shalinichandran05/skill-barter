// src/pages/Offline.jsx
// Shown by the service worker when the user is offline

export default function OfflinePage() {
  return (
    <div className="min-h-screen bg-surface-400 bg-radial-maroon flex items-center justify-center p-4">
      <div className="text-center max-w-sm animate-fade-in">
        <div className="text-7xl mb-6 text-white/10">◎</div>
        <h1 className="font-display text-3xl font-bold mb-3">You're Offline</h1>
        <p className="text-white/40 text-sm mb-8 leading-relaxed">
          SkillBarter needs an internet connection to exchange skills and manage your credits.
          Please reconnect and try again.
        </p>
        <button
          onClick={() => window.location.reload()}
          className="btn-primary px-8 py-3"
        >
          Try Again
        </button>
      </div>
    </div>
  );
}
