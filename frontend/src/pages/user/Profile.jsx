// src/pages/user/Profile.jsx
// VIEW mode by default — shows all profile info.
// "Edit Profile" button in top-right switches to EDIT mode.

import { useState, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import toast from 'react-hot-toast';

export default function ProfilePage() {
  const { user, refreshUser } = useAuth();
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const fileRef = useRef(null);

  const [form, setForm] = useState({
    name:       user?.name       || '',
    bio:        user?.bio        || '',
    mobile:     user?.mobile     || '',
    location:   user?.location   || '',
    avatar_url: user?.avatar_url || '',
  });
  const [preview, setPreview] = useState(user?.avatar_url || null);

  const handleChange = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const handleFile = e => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { toast.error('Image must be under 2 MB'); return; }
    const reader = new FileReader();
    reader.onload = ev => {
      setPreview(ev.target.result);
      setForm(f => ({ ...f, avatar_url: ev.target.result }));
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async e => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.put('/auth/profile', form);
      await refreshUser();
      toast.success('Profile updated!');
      setEditing(false);
    } catch (_) {
      toast.error('Update failed');
    } finally {
      setLoading(false);
    }
  };

  const cancelEdit = () => {
    setForm({
      name:       user?.name       || '',
      bio:        user?.bio        || '',
      mobile:     user?.mobile     || '',
      location:   user?.location   || '',
      avatar_url: user?.avatar_url || '',
    });
    setPreview(user?.avatar_url || null);
    setEditing(false);
  };

  // ── Avatar component ──────────────────────────────────────
  const Avatar = ({ src, size = 'lg' }) => {
    const s = size === 'lg' ? 'w-24 h-24 text-3xl' : 'w-16 h-16 text-xl';
    return (
      <div className={`${s} rounded-full bg-maroon-950/60 border-2 border-maroon-800/40
                       flex items-center justify-center font-bold shrink-0 overflow-hidden`}>
        {src
          ? <img src={src} alt="avatar" className="w-full h-full object-cover" />
          : <span>{user?.name?.[0]?.toUpperCase()}</span>
        }
      </div>
    );
  };

  // ════════════════════════════════════════════════════════
  // VIEW MODE
  // ════════════════════════════════════════════════════════
  if (!editing) {
    return (
      <div className="max-w-xl space-y-5 animate-fade-in">

        {/* Page header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-display font-bold">My Profile</h1>
            <p className="text-white/40 text-sm mt-1">Your public profile information</p>
          </div>
          <button onClick={() => setEditing(true)} className="btn-secondary flex items-center gap-2">
            <span>✎</span> Edit Profile
          </button>
        </div>

        {/* Profile card */}
        <div className="card space-y-6">

          {/* Avatar + name + role */}
          <div className="flex items-center gap-5">
            <Avatar src={user?.avatar_url} size="lg" />
            <div>
              <h2 className="text-xl font-display font-bold">{user?.name}</h2>
              <p className="text-white/40 text-sm mt-0.5">{user?.email}</p>
              <span className={`badge mt-2 ${
                user?.role === 'admin'
                  ? 'bg-maroon-950/60 text-maroon-300 border border-maroon-800/40'
                  : 'bg-surface-100 text-white/40 border border-white/10'
              }`}>
                {user?.role}
              </span>
            </div>
          </div>

          <div className="border-t border-white/5" />

          {/* Location */}
          {user?.location ? (
            <div className="flex items-start gap-3">
              <span className="text-lg mt-0.5">📍</span>
              <div>
                <p className="text-xs text-white/30 uppercase tracking-widest font-semibold mb-0.5">Location</p>
                <p className="text-white/80">{user.location}</p>
              </div>
            </div>
          ) : null}

          {/* Mobile */}
          {user?.mobile ? (
            <div className="flex items-start gap-3">
              <span className="text-lg mt-0.5">📱</span>
              <div>
                <p className="text-xs text-white/30 uppercase tracking-widest font-semibold mb-0.5">Mobile</p>
                <p className="text-white/80">{user.mobile}</p>
              </div>
            </div>
          ) : null}

          {/* Bio */}
          {user?.bio ? (
            <div className="flex items-start gap-3">
              <span className="text-lg mt-0.5">◉</span>
              <div>
                <p className="text-xs text-white/30 uppercase tracking-widest font-semibold mb-0.5">About</p>
                <p className="text-white/70 leading-relaxed">{user.bio}</p>
              </div>
            </div>
          ) : null}

          {/* If none of the optional fields are filled */}
          {!user?.location && !user?.mobile && !user?.bio && (
            <p className="text-white/20 text-sm text-center py-2">
              No extra details added yet. Click <strong className="text-white/40">Edit Profile</strong> to add them.
            </p>
          )}

          <div className="border-t border-white/5" />

          {/* Member since */}
          <div className="flex justify-between text-sm text-white/30">
            <span>Member since</span>
            <span className="text-white/50">
              {user?.created_at
                ? new Date(user.created_at).toLocaleDateString('en-IN', {
                    year: 'numeric', month: 'long', day: 'numeric'
                  })
                : '—'
              }
            </span>
          </div>

        </div>
      </div>
    );
  }

  // ════════════════════════════════════════════════════════
  // EDIT MODE
  // ════════════════════════════════════════════════════════
  return (
    <div className="max-w-xl space-y-5 animate-fade-in">

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold">Edit Profile</h1>
          <p className="text-white/40 text-sm mt-1">Update your personal information</p>
        </div>
      </div>

      <div className="card">
        <form onSubmit={handleSubmit} className="space-y-5">

          {/* Avatar upload */}
          <div className="flex flex-col items-center gap-3 pb-5 border-b border-white/5">
            <div
              onClick={() => fileRef.current.click()}
              className="w-24 h-24 rounded-full bg-maroon-950/60 border-2 border-dashed border-maroon-700/50
                         flex items-center justify-center cursor-pointer hover:border-maroon-500
                         transition-colors overflow-hidden relative group"
            >
              {preview
                ? <img src={preview} alt="avatar" className="w-full h-full object-cover" />
                : <span className="text-3xl font-bold text-white/20 group-hover:text-white/40 transition-colors">
                    {user?.name?.[0]?.toUpperCase()}
                  </span>
              }
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100
                              transition-opacity flex items-center justify-center text-xs text-white font-semibold">
                Change Photo
              </div>
            </div>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
            <p className="text-xs text-white/30">Click to change photo · Max 2 MB</p>
          </div>

          {/* Name */}
          <div>
            <label className="label">Full Name *</label>
            <input className="input" name="name" value={form.name} onChange={handleChange} required />
          </div>

          {/* Location */}
          <div>
            <label className="label">Location</label>
            <input className="input" name="location"
              placeholder="e.g. Chennai, Tamil Nadu"
              value={form.location} onChange={handleChange} />
          </div>

          {/* Mobile */}
          <div>
            <label className="label">Mobile Number</label>
            <input className="input" type="tel" name="mobile"
              placeholder="e.g. +91 98765 43210"
              value={form.mobile} onChange={handleChange} />
          </div>

          {/* Bio */}
          <div>
            <label className="label">About You</label>
            <textarea
              className="input resize-none h-24" name="bio"
              placeholder="Tell the community about yourself…"
              value={form.bio} onChange={handleChange}
            />
          </div>

          {/* Read-only */}
          <div className="p-4 rounded-lg bg-surface-100 border border-white/5 space-y-2 text-sm">
            <div className="flex justify-between text-white/40">
              <span>Email</span>
              <span className="text-white/60">{user?.email}</span>
            </div>
            <div className="flex justify-between text-white/40">
              <span>Member since</span>
              <span className="text-white/60">
                {user?.created_at
                  ? new Date(user.created_at).toLocaleDateString('en-IN', {
                      year: 'numeric', month: 'long', day: 'numeric'
                    })
                  : '—'
                }
              </span>
            </div>
          </div>

          {/* Buttons */}
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={cancelEdit} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" className="btn-primary flex-1 py-3" disabled={loading}>
              {loading ? 'Saving…' : 'Save Changes'}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}
