// src/pages/user/SkillDetail.jsx
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import { Stars, Spinner, Modal } from '../../components/common';

// ── Trust bar ─────────────────────────────────────────────
function TrustBar({ score }) {
  const s = score ?? 100;
  const color = s >= 70 ? '#16a34a' : s >= 40 ? '#ca8a04' : '#be123c';
  const label = s >= 70 ? 'Good standing' : s >= 40 ? 'Moderate' : 'Low trust';
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 h-2 bg-white/10 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-500"
          style={{ width: `${s}%`, background: color }} />
      </div>
      <span className="text-sm font-semibold w-8 text-right" style={{ color }}>{s}</span>
      <span className="text-xs text-white/30">{label}</span>
    </div>
  );
}

// ── Provider Profile Modal ────────────────────────────────
function ProfileModal({ open, onClose, providerId }) {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !providerId) {
      console.log('ProfileModal: skipping — open:', open, 'providerId:', providerId);
      return;
    }
    setLoading(true);
    console.log('ProfileModal: fetching /users/' + providerId + '/profile');
    api.get(`/users/${providerId}/profile`)
      .then(r => { console.log('Profile loaded:', r.data); setProfile(r.data); })
      .catch(err => {
        console.error('Profile fetch error:', err.response?.status, err.response?.data);
        toast.error(err.response?.data?.error || 'Could not load profile');
      })
      .finally(() => setLoading(false));
  }, [open, providerId]);

  return (
    <Modal open={open} onClose={onClose} title="Provider Profile">
      {loading ? (
        <div className="flex justify-center py-8"><Spinner size="lg" /></div>
      ) : profile ? (
        <div className="space-y-5">

          {/* Avatar + name */}
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-maroon-950/60 border-2 border-maroon-800/40
                            flex items-center justify-center text-2xl font-bold shrink-0 overflow-hidden">
              {profile.avatar_url
                ? <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
                : profile.name?.[0]?.toUpperCase()
              }
            </div>
            <div>
              <h3 className="text-xl font-display font-bold">{profile.name}</h3>
              {/* Ratings */}
              <div className="flex items-center gap-1.5 mt-1">
                <Stars rating={parseFloat(profile.avg_rating)} />
                <span className="text-white/40 text-xs">
                  {parseFloat(profile.avg_rating).toFixed(1)} · {profile.total_ratings} review{profile.total_ratings !== 1 ? 's' : ''}
                </span>
              </div>
            </div>
          </div>

          <div className="border-t border-white/5" />

          {/* Info rows */}
          <div className="space-y-3">

            {profile.location && (
              <div className="flex items-start gap-3">
                <span className="text-lg shrink-0 mt-0.5">📍</span>
                <div>
                  <p className="text-xs text-white/30 uppercase tracking-widest font-semibold mb-0.5">Location</p>
                  <p className="text-white/80 text-sm">{profile.location}</p>
                </div>
              </div>
            )}

            {profile.mobile && (
              <div className="flex items-start gap-3">
                <span className="text-lg shrink-0 mt-0.5">📱</span>
                <div>
                  <p className="text-xs text-white/30 uppercase tracking-widest font-semibold mb-0.5">Mobile</p>
                  <p className="text-white/80 text-sm">{profile.mobile}</p>
                </div>
              </div>
            )}

            {profile.bio && (
              <div className="flex items-start gap-3">
                <span className="text-lg shrink-0 mt-0.5">◉</span>
                <div>
                  <p className="text-xs text-white/30 uppercase tracking-widest font-semibold mb-0.5">About</p>
                  <p className="text-white/70 text-sm leading-relaxed">{profile.bio}</p>
                </div>
              </div>
            )}

            {!profile.location && !profile.mobile && !profile.bio && (
              <p className="text-white/20 text-sm text-center py-2">No additional details provided.</p>
            )}
          </div>

          <div className="border-t border-white/5" />

          {/* Trust + strikes */}
          <div className="space-y-2">
            <p className="text-xs text-white/30 uppercase tracking-widest font-semibold">Reputation</p>
            <TrustBar score={profile.trust_score} />
            <div className="flex items-center justify-between text-sm">
              <span className="text-white/40 text-xs">Strikes</span>
              {(profile.strike_count ?? 0) === 0 ? (
                <span className="text-green-400 text-xs">✓ No strikes</span>
              ) : (
                <span className="text-red-400 text-xs font-semibold">
                  {profile.strike_count} strike{profile.strike_count > 1 ? 's' : ''}
                </span>
              )}
            </div>
          </div>

          <div className="border-t border-white/5" />

          {/* Member since */}
          <div className="flex justify-between text-sm text-white/30">
            <span>Member since</span>
            <span className="text-white/50">
              {new Date(profile.created_at).toLocaleDateString('en-IN', {
                year: 'numeric', month: 'long', day: 'numeric'
              })}
            </span>
          </div>

          {/* Their active skills */}
          {profile.skills?.length > 0 && (
            <div>
              <p className="text-xs text-white/30 uppercase tracking-widest font-semibold mb-2">
                Other Skills ({profile.skills.length})
              </p>
              <div className="flex flex-wrap gap-2">
                {profile.skills.map(s => (
                  <span key={s.id}
                    className="badge bg-maroon-950/40 text-maroon-300 border border-maroon-800/30 text-xs">
                    {s.skill_name} · {s.credits_per_hour} cr/hr
                  </span>
                ))}
              </div>
            </div>
          )}

        </div>
      ) : null}
    </Modal>
  );
}

// ── Main Page ─────────────────────────────────────────────
export default function SkillDetail() {
  const { id }    = useParams();
  const { user }  = useAuth();
  const navigate  = useNavigate();

  const [skill,        setSkill]        = useState(null);
  const [ratings,      setRatings]      = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [hours,        setHours]        = useState(1);
  const [message,      setMessage]      = useState('');
  const [sending,      setSending]      = useState(false);
  const [profileOpen,  setProfileOpen]  = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const [s, r] = await Promise.all([
          api.get(`/skills/${id}`),
          api.get(`/ratings/user/${id}`).catch(() => ({ data: [] })),
        ]);
        setSkill(s.data);
        setRatings(r.data);
      } catch (_) {
        toast.error('Skill not found');
        navigate('/dashboard/browse');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id, navigate]);

  const totalCost = (parseFloat(hours) * parseFloat(skill?.credits_per_hour || 1)).toFixed(2);

  const handleRequest = async () => {
    setSending(true);
    try {
      await api.post('/requests', { skill_id: skill.id, hours_requested: hours, message });
      toast.success('Request sent! Waiting for provider approval.');
      navigate('/dashboard/requests');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Request failed');
    } finally {
      setSending(false);
    }
  };

  if (loading) return <div className="flex justify-center py-20"><Spinner size="lg" /></div>;
  if (!skill)  return null;

  const isOwner     = user?.id === skill.user_id || user?.id === skill.provider_user_id;
  const trustScore  = skill.trust_score  ?? 100;
  const strikeCount = skill.strike_count ?? 0;
  const isLowTrust  = trustScore < 60;

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-fade-in">

      <button onClick={() => navigate(-1)} className="btn-ghost text-sm px-0 text-white/40 hover:text-white">
        ← Back
      </button>

      {/* Low trust banner */}
      {isLowTrust && (
        <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-red-900/20 border border-red-800/40">
          <span className="text-xl shrink-0">⚠️</span>
          <div>
            <p className="text-red-300 font-semibold text-sm">Low trust provider</p>
            <p className="text-red-300/60 text-xs mt-0.5">
              Trust score: {trustScore}/100
              {strikeCount > 0 ? ` · ${strikeCount} strike${strikeCount > 1 ? 's' : ''}` : ''}.
              Consider this before requesting a session.
            </p>
          </div>
        </div>
      )}

      {/* Skill header card */}
      <div className="card space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-start gap-4">
          {/* Avatar */}
          <div className="w-14 h-14 rounded-xl bg-maroon-950/60 border border-maroon-800/30
                          flex items-center justify-center text-2xl font-bold shrink-0 overflow-hidden">
            {skill.avatar_url
              ? <img src={skill.avatar_url} alt="" className="w-full h-full object-cover" />
              : skill.provider_name?.[0]?.toUpperCase()
            }
          </div>

          <div className="flex-1 min-w-0">
            {/* Skill name + category + VIEW PROFILE button */}
            <div className="flex flex-wrap items-start justify-between gap-2 mb-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-display font-bold">{skill.skill_name}</h1>
                <span className="badge bg-maroon-950/40 text-maroon-300 border border-maroon-800/40">
                  {skill.category}
                </span>
              </div>
              {/* ── ACTION BUTTONS ── */}
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => setProfileOpen(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold
                             border border-maroon-700/50 text-maroon-400 hover:bg-maroon-950/40
                             hover:border-maroon-600 transition-all duration-200"
                >
                  <span>◉</span> View Profile
                </button>
                {!isOwner && (
                  <button
                    onClick={() => navigate(`/dashboard/messages?userId=${skill.provider_user_id || skill.user_id}&name=${encodeURIComponent(skill.provider_name)}&avatar=${encodeURIComponent(skill.avatar_url || '')}`)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold
                               border border-white/10 text-white/60 hover:bg-white/5
                               hover:border-white/20 transition-all duration-200"
                  >
                    <span>💬</span> Message
                  </button>
                )}
              </div>
            </div>

            <p className="text-white/50 text-sm mb-2">by {skill.provider_name}</p>
            <div className="flex flex-wrap items-center gap-3 text-sm text-white/40">
              <span className="flex items-center gap-1">
                <Stars rating={skill.avg_rating} />
                {parseFloat(skill.avg_rating).toFixed(1)}
                <span className="text-xs">({skill.rating_count ?? 0})</span>
              </span>
              <span>·</span>
              <span>⏱ {skill.credits_per_hour} cr/hr</span>
              {skill.availability && <><span>·</span><span>📅 {skill.availability}</span></>}
              {skill.location && <><span>·</span><span>📍 {skill.location}</span></>}
            </div>
          </div>
        </div>

        {/* Trust + strikes */}
        <div className="pt-4 border-t border-white/5 space-y-3">
          <h3 className="text-xs uppercase tracking-widest text-white/30 font-semibold">Provider Reputation</h3>
          <TrustBar score={trustScore} />
          <div className="flex items-center justify-between">
            <span className="text-xs text-white/40">Strikes received</span>
            {strikeCount === 0 ? (
              <span className="text-xs text-green-400">✓ No strikes</span>
            ) : (
              <div className="flex items-center gap-1.5">
                {[...Array(Math.min(strikeCount, 5))].map((_, i) => (
                  <div key={i} className="w-2 h-2 rounded-full bg-red-500" />
                ))}
                <span className="text-xs text-red-400 ml-1">
                  {strikeCount} strike{strikeCount > 1 ? 's' : ''}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* About skill */}
        {skill.description && (
          <div className="pt-4 border-t border-white/5">
            <h3 className="text-xs uppercase tracking-widest text-white/30 font-semibold mb-2">About this skill</h3>
            <p className="text-white/70 text-sm leading-relaxed">{skill.description}</p>
          </div>
        )}

        {/* About teacher */}
        {skill.bio && (
          <div className="pt-4 border-t border-white/5">
            <h3 className="text-xs uppercase tracking-widest text-white/30 font-semibold mb-2">About the teacher</h3>
            <p className="text-white/50 text-sm">{skill.bio}</p>
          </div>
        )}
      </div>

      {/* Request form */}
      {!isOwner && (
        <div className="card border-maroon-800/30">
          <h2 className="font-display font-bold text-lg mb-4">Request a Session</h2>
          <div className="space-y-4">
            <div>
              <label className="label">Hours requested</label>
              <input className="input" type="number" min="0.5" max="8" step="0.5"
                value={hours} onChange={e => setHours(e.target.value)} />
            </div>
            <div>
              <label className="label">Message to provider</label>
              <textarea className="input resize-none h-24"
                placeholder="Introduce yourself and explain what you'd like to learn…"
                value={message} onChange={e => setMessage(e.target.value)} />
            </div>
            <div className="flex items-center justify-between p-4 rounded-lg bg-surface-100 border border-white/5">
              <span className="text-white/50 text-sm">Total cost</span>
              <span className="text-xl font-bold font-display text-gradient">{totalCost} credits</span>
            </div>
            {isLowTrust && (
              <p className="text-xs text-yellow-400/70 text-center">
                ⚠️ You are requesting from a low-trust provider. Proceed carefully.
              </p>
            )}
            <button onClick={handleRequest} className="btn-primary w-full py-3" disabled={sending}>
              {sending ? 'Sending request…' : 'Send Request'}
            </button>
          </div>
        </div>
      )}

      {isOwner && (
        <div className="card border-yellow-800/30 bg-yellow-900/10 text-center py-6">
          <p className="text-yellow-300/70 text-sm">This is your own skill listing.</p>
        </div>
      )}

      {/* Ratings */}
      {ratings.length > 0 && (
        <div className="card">
          <h2 className="font-display font-bold text-lg mb-4">Reviews ({ratings.length})</h2>
          <div className="space-y-4">
            {ratings.map(r => (
              <div key={r.id} className="py-3 border-b border-white/5 last:border-0">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-7 h-7 rounded-full bg-maroon-950/60 flex items-center justify-center text-xs font-bold overflow-hidden">
                    {r.avatar_url
                      ? <img src={r.avatar_url} alt="" className="w-full h-full object-cover" />
                      : r.from_name?.[0]?.toUpperCase()
                    }
                  </div>
                  <span className="text-sm font-medium">{r.from_name}</span>
                  <Stars rating={r.rating} size="sm" />
                </div>
                {r.review && <p className="text-white/40 text-sm ml-9">{r.review}</p>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Provider Profile Modal */}
      <ProfileModal
        open={profileOpen}
        onClose={() => setProfileOpen(false)}
        providerId={skill.provider_user_id || skill.user_id}
      />

    </div>
  );
}
