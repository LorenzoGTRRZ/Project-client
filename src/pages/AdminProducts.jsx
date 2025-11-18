import { useEffect, useState } from 'react';
import { api, setAuth, API_URL } from '../api';
import { useNavigate } from 'react-router-dom';

function useAuthSetup() {
  const nav = useNavigate();
  useEffect(() => {
    const tok = localStorage.getItem('token');
    if (tok) {
      setAuth(tok);
    } else {
      nav('/admin/login'); // Se não tem token, chuta pra tela de login
    }
  }, [nav]);
}

export default function AdminProducts() {
  useAuthSetup();
  const [view, setView] = useState('products'); // 'products' ou 'categories'
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [catName, setCatName] = useState('');
  const [form, setForm] = useState({ name: '', description: '', price: '', categoryId: '', active: true, image: null });
  const [imagePreview, setImagePreview] = useState(null);

  const load = async () => {
    try {
      // Usamos a nova rota /all para pegar produtos ativos e inativos
      const [c, p] = await Promise.all([api.get('/categories'), api.get('/products/all')]);
      setCategories(c.data);
      setProducts(p.data);
    } catch (e) {
      console.error("Falha ao carregar dados", e);
    }
  };

  useEffect(() => { load(); }, []);

  const addCategory = async (e) => {
    e.preventDefault();
    await api.post('/categories', { name: catName });
    setCatName('');
    load();
  };

  const handleFormChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleImageChange = (e) => {
    const file = e.target.files?.[0] || null;
    setForm(prev => ({ ...prev, image: file }));
    if (file) {
      setImagePreview(URL.createObjectURL(file));
    } else {
      setImagePreview(null);
    }
  };

  const addProduct = async (e) => {
    e.preventDefault();
    const fd = new FormData();
    fd.append('name', form.name);
    fd.append('description', form.description);
    fd.append('price', form.price);
    fd.append('categoryId', form.categoryId);
    fd.append('active', form.active ? 'true' : 'false');
    if (form.image) fd.append('image', form.image);
    
    await api.post('/products', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
    
    setForm({ name: '', description: '', price: '', categoryId: '', active: true, image: null });
    setImagePreview(null);
    e.target.reset(); // Limpa o input de file
    load();
  };

  const delProduct = async (id) => {
    if (window.confirm("Tem certeza que quer excluir este produto?")) {
      await api.delete(`/products/${id}`);
      load();
    }
  };

  return (
    <div className="admin-layout">
      <nav className="admin-nav">
        <h2>Admin</h2>
        <button onClick={() => setView('products')} className={view === 'products' ? 'active' : ''}>Produtos</button>
        <button onClick={() => setView('categories')} className={view === 'categories' ? 'active' : ''}>Categorias</button>
      </nav>

      <main className="admin-content">
        {view === 'products' && (
          <>
            <form className="form-card" onSubmit={addProduct}>
              <h3>Novo Produto</h3>
              <div className="form-grid">
                <div className="form-group">
                  <label>Nome</label>
                  <input name="name" value={form.name} onChange={handleFormChange} />
                </div>
                <div className="form-group">
                  <label>Preço (ex: 10.99)</label>
                  <input name="price" value={form.price} onChange={handleFormChange} />
                </div>
                <div className="form-group">
                  <label>Categoria</label>
                  <select name="categoryId" value={form.categoryId} onChange={handleFormChange}>
                    <option value="">Sem categoria</option>
                    {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>Descrição</label>
                  <textarea name="description" value={form.description} onChange={handleFormChange} />
                </div>
                <div className="form-group">
                  <label>Imagem</label>
                  <input type="file" onChange={handleImageChange} />
                  {imagePreview && <img src={imagePreview} alt="Preview" className="img-preview" />}
                </div>
                <div className="form-group">
                  <label className="checkbox-label">
                    <input type="checkbox" name="active" checked={form.active} onChange={handleFormChange} />
                    Produto Ativo (visível na loja)
                  </label>
                </div>
              </div>
              <button type="submit">Salvar Produto</button>
            </form>

            <div className="product-list-admin">
              <h3>Lista de Produtos</h3>
              {products.map(p => (
                <div className="product-item-admin" key={p.id}>
                  <img src={p.imageUrl} alt={p.name} />
                  <div className="info">
                    <h4>{p.name}</h4>
                    <p>R$ {p.price?.toFixed(2)}</p>
                    <span className={`status ${p.active ? 'active' : 'inactive'}`}>
                      {p.active ? 'Ativo' : 'Inativo'}
                    </span>
                  </div>
                  <button className="delete-btn" onClick={() => delProduct(p.id)}>Excluir</button>
                </div>
              ))}
            </div>
          </>
        )}

        {view === 'categories' && (
          <form className="form-card" onSubmit={addCategory}>
            <h3>Categorias</h3>
            <div className="form-group">
              <label>Nova Categoria</label>
              <input value={catName} onChange={e => setCatName(e.target.value)} />
            </div>
            <button type="submit">Adicionar Categoria</button>
            <ul className="category-list">
              {categories.map(c => <li key={c.id}>{c.name}</li>)}
            </ul>
          </form>
        )}
      </main>
    </div>
  );
}