// src/pages/user/MySkills.jsx
// Lists user's own skills; lets them add, edit, delete

import { useState, useEffect, useCallback } from 'react';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { PageHeader, EmptyState, Spinner, Modal } from '../../components/common';

const CATEGORIES = [
  'Technology','Design','Music','Languages','Cooking','Fitness',
  'Business','Arts & Crafts','Education','Photography','Writing','Other',
];

const EMPTY_FORM = {
  skill_name: '', category: '', description: '',
  availability: '', credits_per_hour: 1, is_active: true,
};

export default function MySkills() {
  const [skills,  setSkills]  = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal,   setModal]   = useState(false);
  const [editing, setEditing] = useState(null);   // skill id being edited
  const [form,    setForm]    = useState(EMPTY_FORM);
  const [saving,  setSaving]  = useState(false);

  const loadSkills = useCallback(async () => {
    try {
      const { data } = await api.get('/skills/mine');
      setSkills(data);
    } catch (_) {
      toast.error('Failed to load skills');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadSkills(); }, [loadSkills]);

  const openAdd = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setModal(true);
  };

  const openEdit = (skill) => {
    setEditing(skill.id);
    setForm({
      skill_name:       skill.skill_name,
      category:         skill.category,
      description:      skill.description || '',
      availability:     skill.availability || '',
      credits_per_hour: skill.credits_per_hour,
      is_active:        skill.is_active,
    });
    setModal(true);
  };

  const handleChange = e => {
    const { name, value, type, checked } = e.target;
    setForm(f => ({ ...f, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleSubmit = async e => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editing) {
        await api.put(`/skills/${editing}`, form);
        toast.success('Skill updated');
      } else {
        await api.post('/skills', form);
        toast.success('Skill added!');
      }
      setModal(false);
      loadSkills();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this skill?')) return;
    try {
      await api.delete(`/skills/${id}`);
      toast.success('Skill deleted');
      setSkills(s => s.filter(sk => sk.id !== id));
    } catch (_) {
      toast.error('Delete failed');
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="My Skills"
        subtitle="Skills you offer to the community"
        action={
          <button onClick={openAdd} className="btn-primary">
            <span>+</span> Add Skill
          </button>
        }
      />

      {loading ? (
        <div className="flex justify-center py-16"><Spinner size="lg" /></div>
      ) : skills.length === 0 ? (
        <EmptyState
          icon="✦"
          title="No skills yet"
          description="Share your expertise and start earning time credits."
          action={<button onClick={openAdd} className="btn-primary">Add your first skill</button>}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {skills.map(skill => (
            <div key={skill.id} className="card group flex flex-col gap-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h3 className="font-semibold truncate">{skill.skill_name}</h3>
                  <span className="text-xs text-maroon-400 font-medium">{skill.category}</span>
                </div>
                <span className={`badge shrink-0 ${skill.is_active ? 'bg-green-900/40 text-green-300' : 'bg-gray-800 text-gray-400'}`}>
                  {skill.is_active ? 'Active' : 'Paused'}
                </span>
              </div>
              {skill.description && (
                <p className="text-white/40 text-sm line-clamp-2">{skill.description}</p>
              )}
              <div className="flex items-center justify-between text-xs text-white/30 pt-1 border-t border-white/5">
                <span>⏱ {skill.credits_per_hour} cr/hr</span>
                {skill.availability && <span>📅 {skill.availability}</span>}
              </div>
              <div className="flex gap-2 mt-auto">
                <button onClick={() => openEdit(skill)} className="btn-secondary flex-1 py-1.5 text-xs">Edit</button>
                <button onClick={() => handleDelete(skill.id)} className="btn-danger flex-1 py-1.5 text-xs">Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add / Edit Modal */}
      <Modal open={modal} onClose={() => setModal(false)} title={editing ? 'Edit Skill' : 'Add New Skill'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">Skill Name</label>
            <input className="input" name="skill_name" placeholder="e.g. Python Programming"
              value={form.skill_name} onChange={handleChange} required />
          </div>
          <div>
            <label className="label">Category</label>
            <select className="input" name="category" value={form.category} onChange={handleChange} required>
              <option value="">Select category…</option>
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Description</label>
            <textarea className="input resize-none h-20" name="description" placeholder="What will you teach?"
              value={form.description} onChange={handleChange} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Availability</label>
              <input className="input" name="availability" placeholder="e.g. Weekends"
                value={form.availability} onChange={handleChange} />
            </div>
            <div>
              <label className="label">Credits / Hour</label>
              <input className="input" type="number" name="credits_per_hour" min="0.5" step="0.5"
                value={form.credits_per_hour} onChange={handleChange} required />
            </div>
          </div>
          {editing && (
            <label className="flex items-center gap-2 text-sm text-white/60 cursor-pointer">
              <input type="checkbox" name="is_active" checked={form.is_active} onChange={handleChange}
                className="accent-maroon-600" />
              Active (visible to others)
            </label>
          )}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => setModal(false)} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" className="btn-primary flex-1" disabled={saving}>
              {saving ? 'Saving…' : editing ? 'Save Changes' : 'Add Skill'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
