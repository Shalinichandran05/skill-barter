// src/pages/auth/Login.jsx
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import toast from 'react-hot-toast';
import AuthShell from './AuthShell';

export default function LoginPage() {
  const { login }  = useAuth();
  const navigate   = useNavigate();
  const [form, setForm]       = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);

  const handleChange = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const handleSubmit = async e => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await api.post('/auth/login', form);
      login(data.token, data.user);
      toast.success(`Welcome back, ${data.user.name}!`);
      navigate(data.user.role === 'admin' ? '/admin' : '/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell title="Welcome back" subtitle="Sign in to your account">
      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="label">Email</label>
          <input className="input" type="email" name="email" placeholder="you@example.com"
            value={form.email} onChange={handleChange} required />
        </div>
        <div>
          <label className="label">Password</label>
          <input className="input" type="password" name="password" placeholder="••••••••"
            value={form.password} onChange={handleChange} required />
        </div>
        <button type="submit" className="btn-primary w-full py-3 mt-2" disabled={loading}>
          {loading ? 'Signing in…' : 'Sign In'}
        </button>
      </form>
      <p className="text-center text-white/40 text-sm mt-6">
        No account?{' '}
        <Link to="/register" className="text-maroon-400 hover:text-maroon-300 font-semibold transition-colors">
          Create one
        </Link>
      </p>
    </AuthShell>
  );
}
