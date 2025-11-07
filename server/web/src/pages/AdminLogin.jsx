import { useState } from 'react';
import { api, setAuth } from '../api';
import { useNavigate } from 'react-router-dom';

export default function AdminLogin() {
  const nav = useNavigate();
  const [email, setEmail] = useState('admin@local');
  const [password, setPassword] = useState('admin123');
  const [error, setError] = useState('');

  const login = async () => {
    try {
      const { data } = await api.post('/auth/login', { email, password });
      localStorage.setItem('token', data.token);
      setAuth(data.token);
      nav('/admin/products');
    } catch (e) {
      setError('Falha no login');
    }
  };

  return (
    <div className="admin-page">
      <h2>Login Admin</h2>
      <input value={email} onChange={e => setEmail(e.target.value)} placeholder="email" />
      <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="senha" />
      <button onClick={login}>Entrar</button>
      {error && <p className="error">{error}</p>}
    </div>
  );
}