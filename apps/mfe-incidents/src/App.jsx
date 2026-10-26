import React, { useCallback, useEffect, useState } from 'react';
import { api } from './api.js';

const PRIORITIES = ['P1', 'P2', 'P3', 'P4'];
const STATUSES = ['new', 'in_progress', 'on_hold', 'resolved', 'closed'];
const CATEGORIES = ['api_outage', 'access', 'database', 'certificate', 'network', 'other'];

export default function App() {
  const [items, setItems] = useState([]);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ title: '', description: '', category: 'other', priority: 'P3' });

  const load = useCallback(() => api('/incidents').then(setItems).catch((e) => setError(e.message)), []);
  useEffect(() => { load(); }, [load]);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await api('/incidents', { method: 'POST', body: form });
      setForm({ ...form, title: '', description: '' });
      load();
    } catch (err) { setError(err.message); }
  };

  const setStatus = (id, status) =>
    api(`/incidents/${id}`, { method: 'PATCH', body: { status } }).then(load).catch((e) => setError(e.message));

  return (
    <section>
      <h2>Incidents</h2>
      {error && <p style={{ color: 'crimson' }}>{error}</p>}
      <form onSubmit={submit} style={{ display: 'grid', gap: 8, maxWidth: 480, marginBottom: 24 }}>
        <input required placeholder="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
        <textarea placeholder="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
          {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
        </select>
        <select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}>
          {PRIORITIES.map((p) => <option key={p}>{p}</option>)}
        </select>
        <button type="submit">Report incident</button>
      </form>
      <table width="100%" cellPadding={6}>
        <thead><tr align="left"><th>#</th><th>Title</th><th>Priority</th><th>Status</th><th>SLA</th></tr></thead>
        <tbody>
          {items.map((i) => (
            <tr key={i._id}>
              <td>{i.number}</td>
              <td>{i.title}</td>
              <td>{i.priority}</td>
              <td>
                <select value={i.status} onChange={(e) => setStatus(i._id, e.target.value)}>
                  {STATUSES.map((s) => <option key={s}>{s}</option>)}
                </select>
              </td>
              <td>{i.slaBreached ? '⚠ breached' : 'ok'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
