import React, { useState } from 'react';

export default function Login({ onLogin }) {
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    const res = await fetch(`/api/auth/${mode}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return setError(data.message || 'Request failed');
    localStorage.setItem('itsm_token', data.token);
    localStorage.setItem('itsm_user', JSON.stringify(data.user));
    onLogin(data.user);
  };

  return (
    <form onSubmit={submit} style={{ fontFamily: 'system-ui, sans-serif', display: 'grid', gap: 8, maxWidth: 320, margin: '80px auto' }}>
      <h2>ITSM Platform – {mode === 'login' ? 'Sign in' : 'Register'}</h2>
      {mode === 'register' && (
        <input required placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
      )}
      <input required type="email" placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
      <input required type="password" minLength={8} placeholder="Password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
      {error && <span style={{ color: 'crimson' }}>{error}</span>}
      <button type="submit">{mode === 'login' ? 'Sign in' : 'Create account'}</button>
      <button type="button" onClick={() => setMode(mode === 'login' ? 'register' : 'login')}>
        {mode === 'login' ? 'Need an account?' : 'Have an account?'}
      </button>
    </form>
  );
}
