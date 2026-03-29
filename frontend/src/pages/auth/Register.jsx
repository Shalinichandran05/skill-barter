// src/pages/auth/Register.jsx
// Two-step registration:
//   Step 1 — account credentials (name, email, password)
//   Step 2 — profile details (location, mobile, bio, avatar)

import { useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import toast from 'react-hot-toast';
import AuthShell from './AuthShell';

const EMPTY_FORM = {
  name: '', email: '', password: '',
  location: '', mobile: '', bio: '', avatar_url: '',
};

export default function RegisterPage() {
  const { login }    = useAuth();
  const navigate     = useNavigate();
  const fileRef      = useRef(null);

  const [step,    setStep]    = useState(1);          // 1 or 2
  const [form,    setForm]    = useState(EMPTY_FORM);
  const [preview, setPreview] = useState(null);       // local image preview
  const [loading, setLoading] = useState(false);

  const handleChange = e =>
    setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  // ── Avatar file → base64 preview (display only, URL stored as data URI) ──
  const handleFile = e => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Image must be under 2 MB');
      return;
    }
    const reader = new FileReader();
    reader.onload = ev => {
      setPreview(ev.target.result);
      setForm(f => ({ ...f, avatar_url: ev.target.result }));
    };
    reader.readAsDataURL(file);
  };

  // ── Step 1 validation ─────────────────────────────────────
  const goToStep2 = e => {
    e.preventDefault();
    if (!form.name.trim())          { toast.error('Name is required');                  return; }
    if (!form.email.trim())         { toast.error('Email is required');                 return; }
    if (form.password.length < 6)   { toast.error('Password must be at least 6 chars'); return; }
    setStep(2);
  };

  // ── Final submit ──────────────────────────────────────────
  const handleSubmit = async e => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await api.post('/auth/register', form);
      login(data.token, data.user);
      toast.success(`🎉 Welcome, ${data.user.name}! You received 5 free credits.`);
      navigate('/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  // ── Step indicator ────────────────────────────────────────
  const StepDots = () => (
    <div className="flex items-center justify-center gap-2 mb-6">
      {[1, 2].map(n => (
        <div key={n} className={`h-1.5 rounded-full transition-all duration-300
          ${n === step ? 'w-8 bg-maroon-600' : 'w-3 bg-white/15'}`}
        />
      ))}
    </div>
  );

  // ── STEP 1 ────────────────────────────────────────────────
  if (step === 1) {
    return (
      <AuthShell title="Create your account" subtitle="Step 1 of 2 — Account details">
        <StepDots />
        <form onSubmit={goToStep2} className="space-y-5">
          <div>
            <label className="label">Full Name *</label>
            <input className="input" type="text" name="name"
              placeholder="Jane Doe"
              value={form.name} onChange={handleChange} required />
          </div>
          <div>
            <label className="label">Email *</label>
            <input className="input" type="email" name="email"
              placeholder="you@example.com"
              value={form.email} onChange={handleChange} required />
          </div>
          <div>
            <label className="label">Password *</label>
            <input className="input" type="password" name="password"
              placeholder="Min. 6 characters"
              value={form.password} onChange={handleChange} required minLength={6} />
          </div>
          <button type="submit" className="btn-primary w-full py-3 mt-2">
            Continue →
          </button>
        </form>
        <p className="text-center text-white/40 text-sm mt-6">
          Already have an account?{' '}
          <Link to="/login" className="text-maroon-400 hover:text-maroon-300 font-semibold transition-colors">
            Sign in
          </Link>
        </p>
      </AuthShell>
    );
  }

  // ── STEP 2 ────────────────────────────────────────────────
  return (
    <AuthShell title="Complete your profile" subtitle="Step 2 of 2 — Tell the community about you">
      <StepDots />
      <form onSubmit={handleSubmit} className="space-y-5">

        {/* Avatar upload */}
        <div className="flex flex-col items-center gap-3">
          <div
            onClick={() => fileRef.current.click()}
            className="w-20 h-20 rounded-full bg-maroon-950/60 border-2 border-dashed border-maroon-700/50
                       flex items-center justify-center cursor-pointer hover:border-maroon-500
                       transition-colors overflow-hidden relative group"
          >
            {preview
              ? <img src={preview} alt="avatar" className="w-full h-full object-cover" />
              : <span className="text-3xl text-white/20 group-hover:text-white/40 transition-colors">+</span>
            }
            {preview && (
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100
                              transition-opacity flex items-center justify-center text-xs text-white">
                Change
              </div>
            )}
          </div>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
          <p className="text-xs text-white/30">
            {preview ? 'Click to change photo' : 'Click to upload profile photo (optional)'}
          </p>
        </div>

        {/* Location */}
        <div>
          <label className="label">Location *</label>
          <input className="input" type="text" name="location"
            placeholder="e.g. Chennai, Tamil Nadu"
            value={form.location} onChange={handleChange} required />
        </div>

        {/* Mobile */}
        <div>
          <label className="label">Mobile Number *</label>
          <input className="input" type="tel" name="mobile"
            placeholder="e.g. +91 98765 43210"
            value={form.mobile} onChange={handleChange} required />
        </div>

        {/* Bio */}
        <div>
          <label className="label">About You <span className="text-white/20 normal-case font-normal">(optional)</span></label>
          <textarea
            className="input resize-none h-20"
            name="bio"
            placeholder="Tell the community a little about yourself…"
            value={form.bio}
            onChange={handleChange}
          />
        </div>

        <div className="flex gap-3 pt-1">
          <button
            type="button"
            onClick={() => setStep(1)}
            className="btn-secondary flex-1"
          >
            ← Back
          </button>
          <button type="submit" className="btn-primary flex-1 py-3" disabled={loading}>
            {loading ? 'Creating account…' : 'Create Account 🎉'}
          </button>
        </div>
      </form>
    </AuthShell>
  );
}
