import React, { useCallback, useEffect, useState } from 'react';
import { api } from './api.js';

const TYPES = ['access', 'software', 'hardware', 'certificate_renewal', 'other'];

export default function App() {
  const [items, setItems] = useState([]);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ title: '', description: '', type: 'access' });

  const load = useCallback(() => api('/requests').then(setItems).catch((e) => setError(e.message)), []);
  useEffect(() => { load(); }, [load]);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await api('/requests', { method: 'POST', body: form });
      setForm({ ...form, title: '', description: '' });
      load();
    } catch (err) { setError(err.message); }
  };

  const act = (id, action, body) =>
    api(`/requests/${id}/${action}`, { method: 'POST', body }).then(load).catch((e) => setError(e.message));

  return (
    <section>
      <h2>Service Requests</h2>
      {error && <p style={{ color: 'crimson' }}>{error}</p>}
      <form onSubmit={submit} style={{ display: 'grid', gap: 8, maxWidth: 480, marginBottom: 24 }}>
        <input required placeholder="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
        <textarea placeholder="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
          {TYPES.map((t) => <option key={t}>{t}</option>)}
        </select>
        <button type="submit">Submit request</button>
      </form>
      <table width="100%" cellPadding={6}>
        <thead><tr align="left"><th>#</th><th>Title</th><th>Type</th><th>Status</th><th>Actions</th></tr></thead>
        <tbody>
          {items.map((r) => (
            <tr key={r._id}>
              <td>{r.number}</td>
              <td>{r.title}</td>
              <td>{r.type}</td>
              <td>{r.status}</td>
              <td>
                {r.status === 'pending_approval' && (
                  <>
                    <button onClick={() => act(r._id, 'decision', { decision: 'approved' })}>Approve</button>{' '}
                    <button onClick={() => act(r._id, 'decision', { decision: 'rejected' })}>Reject</button>
                  </>
                )}
                {r.status === 'approved' && <button onClick={() => act(r._id, 'fulfill')}>Fulfill</button>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
