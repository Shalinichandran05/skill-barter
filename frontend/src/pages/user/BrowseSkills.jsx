// src/pages/user/BrowseSkills.jsx
import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import { Spinner, EmptyState, Stars } from '../../components/common';

// ── Trust Score bar ───────────────────────────────────────
function TrustBar({ score }) {
  const s = score ?? 100;
  const color = s >= 70 ? '#16a34a' : s >= 40 ? '#ca8a04' : '#be123c';
  return (
    <div className="flex items-center gap-1.5">
      <div className="w-14 h-1 bg-white/10 rounded-full overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${s}%`, background: color }} />
      </div>
      <span className="text-xs" style={{ color }}>{s}</span>
    </div>
  );
}

// ── Strike dots ───────────────────────────────────────────
function StrikeDots({ count }) {
  const c = count ?? 0;
  if (c === 0) return null;
  return (
    <div className="flex items-center gap-1">
      {[...Array(Math.min(c, 5))].map((_, i) => (
        <div key={i} className="w-1.5 h-1.5 rounded-full bg-red-500" />
      ))}
      {c > 5 && <span className="text-red-400 text-xs">+{c - 5}</span>}
    </div>
  );
}

export default function BrowseSkills() {
  const [skills,     setSkills]     = useState([]);
  const [categories, setCategories] = useState([]);
  const [total,      setTotal]      = useState(0);
  const [loading,    setLoading]    = useState(true);
  const [search,     setSearch]     = useState('');
  const [category,   setCategory]   = useState('');
  const [page,       setPage]       = useState(1);

  const LIMIT = 12;

  const fetchSkills = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: LIMIT };
      if (search)   params.search   = search;
      if (category) params.category = category;
      const { data } = await api.get('/skills', { params });
      setSkills(data.skills);
      setTotal(data.total);
    } catch (_) {}
    finally { setLoading(false); }
  }, [search, category, page]);

  useEffect(() => { fetchSkills(); }, [fetchSkills]);
  useEffect(() => {
    api.get('/skills/categories').then(r => setCategories(r.data)).catch(() => {});
  }, []);
  useEffect(() => { setPage(1); }, [search, category]);

  const totalPages = Math.ceil(total / LIMIT);

  return (
    <div className="space-y-6 animate-fade-in">

      <div>
        <h1 className="text-3xl font-display font-bold">Browse Skills</h1>
        <p className="text-white/40 text-sm mt-1">{total} skills available from the community</p>
      </div>

      {/* Search + Filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30">⌕</span>
          <input className="input pl-8" placeholder="Search skills…"
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="input sm:w-48" value={category} onChange={e => setCategory(e.target.value)}>
          <option value="">All categories</option>
          {categories.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="flex justify-center py-16"><Spinner size="lg" /></div>
      ) : skills.length === 0 ? (
        <EmptyState
          icon="◈" title="No skills found" description="Try a different search or category."
          action={<button onClick={() => { setSearch(''); setCategory(''); }} className="btn-secondary">Clear filters</button>}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
          {skills.map(skill => <SkillCard key={skill.id} skill={skill} />)}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-4">
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
            className="btn-secondary px-3 py-1.5 text-xs disabled:opacity-30">← Prev</button>
          <span className="text-white/40 text-sm">{page} / {totalPages}</span>
          <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
            className="btn-secondary px-3 py-1.5 text-xs disabled:opacity-30">Next →</button>
        </div>
      )}
    </div>
  );
}

// ── Skill Card ────────────────────────────────────────────
function SkillCard({ skill }) {
  const trustScore  = skill.trust_score  ?? 100;
  const strikeCount = skill.strike_count ?? 0;
  const isLowTrust  = trustScore < 60;
  const hasStrikes  = strikeCount > 0;

  return (
    <Link
      to={`/dashboard/browse/${skill.id}`}
      className={`card group flex flex-col gap-3 hover:border-maroon-800/40 transition-all duration-200
        ${isLowTrust ? 'border-red-800/30' : ''}`}
    >
      {/* Provider row */}
      <div className="flex items-center gap-3">
        {/* Avatar */}
        <div className="w-9 h-9 rounded-full bg-maroon-950/60 flex items-center justify-center text-sm font-bold shrink-0 border border-maroon-800/30 overflow-hidden">
          {skill.avatar_url
            ? <img src={skill.avatar_url} alt="" className="w-full h-full object-cover" />
            : skill.provider_name?.[0]?.toUpperCase()
          }
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs text-white/50 truncate">{skill.provider_name}</p>
          <div className="flex items-center gap-1.5">
            <Stars rating={skill.avg_rating} />
            <span className="text-white/30 text-xs">({skill.rating_count})</span>
          </div>
        </div>
        <span className="ml-auto text-xs text-maroon-400 font-semibold shrink-0">{skill.category}</span>
      </div>

      {/* Trust + strikes row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs text-white/30">Trust</span>
          <TrustBar score={trustScore} />
        </div>
        {hasStrikes && (
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-red-400/70">Strikes</span>
            <StrikeDots count={strikeCount} />
          </div>
        )}
      </div>

      {/* Low trust warning */}
      {isLowTrust && (
        <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-red-900/20 border border-red-800/30">
          <span className="text-xs">⚠️</span>
          <span className="text-xs text-red-300">Low trust score — proceed with caution</span>
        </div>
      )}

      {/* Skill info */}
      <div>
        <h3 className="font-semibold group-hover:text-maroon-300 transition-colors">{skill.skill_name}</h3>
        {skill.description && (
          <p className="text-white/40 text-xs mt-1 line-clamp-2">{skill.description}</p>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between text-xs text-white/30 pt-2 border-t border-white/5 mt-auto">
        <span>{skill.availability || 'Flexible'}</span>
        <span className="text-maroon-400 font-semibold">{skill.credits_per_hour} cr/hr</span>
      </div>
    </Link>
  );
}
