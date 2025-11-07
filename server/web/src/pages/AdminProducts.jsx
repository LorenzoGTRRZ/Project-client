import { useEffect, useState } from 'react';
import { api, setAuth, API_URL } from '../api';

function useAuthSetup() {
  useEffect(() => {
    const tok = localStorage.getItem('token');
    if (tok) setAuth(tok);
  }, []);
}

export default function AdminProducts() {
  useAuthSetup();
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [catName, setCatName] = useState('');
  const [form, setForm] = useState({ name: '', description: '', price: '', categoryId: '', active: true, image: null });

  const load = async () => {
    const [c, p] = await Promise.all([api.get('/categories'), api.get('/products')]);
    setCategories(c.data);
    setProducts(p.data);
  };

  useEffect(() => { load(); }, []);

  const addCategory = async () => {
    await api.post('/categories', { name: catName });
    setCatName('');
    load();
  };

  const addProduct = async () => {
    const fd = new FormData();
    fd.append('name', form.name);
    fd.append('description', form.description);
    fd.append('price', form.price);
    fd.append('categoryId', form.categoryId);
    fd.append('active', form.active ? 'true' : 'false');
    if (form.image) fd.append('image', form.image);
    await api.post('/products', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
    setForm({ name: '', description: '', price: '', categoryId: '', active: true, image: null });
    load();
  };

  const delProduct = async (id) => {
    await api.delete(`/products/${id}`);
    load();
  };

  return (
    <div className="admin-page">
      <h2>Produtos</h2>

      <section>
        <h3>Categorias</h3>
        <div className="row">
          <input value={catName} onChange={e => setCatName(e.target.value)} placeholder="Nova categoria" />
          <button onClick={addCategory}>Adicionar</button>
        </div>
        <ul>
          {categories.map(c => <li key={c.id}>{c.name}</li>)}
        </ul>
      </section>

      <section>
        <h3>Novo produto</h3>
        <div className="form-grid">
          <input placeholder="Nome" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
          <input placeholder="Preço" value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} />
          <select value={form.categoryId} onChange={e => setForm({ ...form, categoryId: e.target.value })}>
            <option value="">Sem categoria</option>
            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <label className="row">
            <input type="checkbox" checked={form.active} onChange={e => setForm({ ...form, active: e.target.checked })} />
            Ativo
          </label>
          <textarea placeholder="Descrição" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
          <input type="file" onChange={e => setForm({ ...form, image: e.target.files?.[0] })} />
        </div>
        <button onClick={addProduct}>Salvar produto</button>
      </section>

      <section>
        <h3>Lista</h3>
        <div className="grid">
          {products.map(p => (
            <div className="card" key={p.id}>
              {p.imageUrl && <img src={p.imageUrl} alt="" />}
              <h4>{p.name}</h4>
              <p>R$ {p.price?.toFixed ? p.price.toFixed(2) : p.price}</p>
              <p>{p.description}</p>
              <small>{p.active ? 'Ativo' : 'Inativo'}</small>
              <button onClick={() => delProduct(p.id)}>Excluir</button>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}