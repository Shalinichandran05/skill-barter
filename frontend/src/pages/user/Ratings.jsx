// src/pages/user/Ratings.jsx
import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import { PageHeader, Stars, Spinner, EmptyState } from '../../components/common';

export default function Ratings() {
  const { user }   = useAuth();
  const [ratings,  setRatings]  = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [avgRating, setAvg]     = useState(0);

  useEffect(() => {
    api.get(`/ratings/user/${user.id}`)
      .then(({ data }) => {
        setRatings(data);
        if (data.length > 0) {
          setAvg((data.reduce((s, r) => s + r.rating, 0) / data.length).toFixed(1));
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user.id]);

  if (loading) return <div className="flex justify-center py-20"><Spinner size="lg" /></div>;

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader title="My Ratings" subtitle="Feedback from people you've taught" />

      {ratings.length > 0 && (
        <div className="card border-maroon-800/30 bg-maroon-950/10 flex items-center gap-5">
          <div className="text-5xl font-display font-bold text-gradient">{avgRating}</div>
          <div>
            <Stars rating={parseFloat(avgRating)} size="lg" />
            <p className="text-white/40 text-sm mt-1">{ratings.length} review{ratings.length !== 1 ? 's' : ''}</p>
          </div>
        </div>
      )}

      {ratings.length === 0 ? (
        <EmptyState icon="★" title="No ratings yet" description="Complete sessions to receive ratings from learners." />
      ) : (
        <div className="space-y-4">
          {ratings.map(r => (
            <div key={r.id} className="card">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-8 h-8 rounded-full bg-maroon-950/60 flex items-center justify-center text-xs font-bold">
                  {r.from_name?.[0]?.toUpperCase()}
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-sm">{r.from_name}</p>
                  <Stars rating={r.rating} />
                </div>
                <span className="text-xs text-white/20">{new Date(r.created_at).toLocaleDateString()}</span>
              </div>
              {r.review && <p className="text-white/50 text-sm ml-11">{r.review}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
