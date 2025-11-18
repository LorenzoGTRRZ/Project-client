import { useState } from 'react';
import { api, setAuth } from '../api';
import { useNavigate } from 'react-router-dom';

export default function AdminLogin() {
  const nav = useNavigate();
  const [email, setEmail] = useState('admin@local');
  const [password, setPassword] = useState('admin123');
  const [error, setError] = useState('');

  const login = async (e) => {
    e.preventDefault(); // Impede o refresh da página
    setError('');
    try {
      const { data } = await api.post('/auth/login', { email, password });
      localStorage.setItem('token', data.token);
      setAuth(data.token);
      nav('/admin/products');
    } catch (e) {
      setError('Falha no login. Verifique as credenciais.');
    }
  };

  return (
    <div className="login-page">
      <form className="login-card" onSubmit={login}>
        <h2>Painel Admin</h2>
        <div className="form-group">
          <label htmlFor="email">Email</label>
          <input
            id="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="admin@local"
          />
        </div>
        <div className="form-group">
          <label htmlFor="password">Senha</label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="admin123"
          />
        </div>
        <button type="submit">Entrar</button>
        {error && <p className="error">{error}</p>}
      </form>
    </div>
  );
}