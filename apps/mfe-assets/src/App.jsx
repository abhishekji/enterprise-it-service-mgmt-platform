import React, { useCallback, useEffect, useState } from 'react';
import { api } from './api.js';

const TYPES = ['server', 'database', 'application', 'laptop', 'network_device', 'ssl_certificate'];

export default function App() {
  const [items, setItems] = useState([]);
  const [expiring, setExpiring] = useState([]);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ name: '', type: 'server', expiresAt: '' });

  const load = useCallback(() => {
    api('/assets').then(setItems).catch((e) => setError(e.message));
    api('/assets/expiring').then(setExpiring).catch(() => {});
  }, []);
  useEffect(() => { load(); }, [load]);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const body = { ...form, expiresAt: form.expiresAt || undefined };
      await api('/assets', { method: 'POST', body });
      setForm({ ...form, name: '', expiresAt: '' });
      load();
    } catch (err) { setError(err.message); }
  };

  return (
    <section>
      <h2>Assets</h2>
      {error && <p style={{ color: 'crimson' }}>{error}</p>}
      {expiring.length > 0 && (
        <p style={{ background: '#fff3cd', padding: 8 }}>
          Expiring soon: {expiring.map((a) => `${a.name} (${new Date(a.expiresAt).toLocaleDateString()})`).join(', ')}
        </p>
      )}
      <form onSubmit={submit} style={{ display: 'grid', gap: 8, maxWidth: 480, marginBottom: 24 }}>
        <input required placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
          {TYPES.map((t) => <option key={t}>{t}</option>)}
        </select>
        <input type="date" value={form.expiresAt} onChange={(e) => setForm({ ...form, expiresAt: e.target.value })} />
        <button type="submit">Add asset</button>
      </form>
      <table width="100%" cellPadding={6}>
        <thead><tr align="left"><th>Name</th><th>Type</th><th>Environment</th><th>Status</th><th>Expires</th></tr></thead>
        <tbody>
          {items.map((a) => (
            <tr key={a._id}>
              <td>{a.name}</td><td>{a.type}</td><td>{a.environment}</td><td>{a.status}</td>
              <td>{a.expiresAt ? new Date(a.expiresAt).toLocaleDateString() : '-'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
