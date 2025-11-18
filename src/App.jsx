import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useCart } from './CartContext';
import { api, API_URL } from './api';

export default function App() {
  const { cart, addToCart } = useCart();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [filterCat, setFilterCat] = useState(''); // Estado para o filtro

  // Busca produtos e categorias da API
  useEffect(() => {
    const loadData = async () => {
      try {
        const [prodsRes, catsRes] = await Promise.all([
          api.get('/products'),
          api.get('/categories')
        ]);
        // Filtra produtos para mostrar apenas os ativos
        setProducts(prodsRes.data.filter(p => p.active === true));
        setCategories(catsRes.data);
      } catch (err) {
        console.error("Erro ao carregar dados", err);
      }
    };
    loadData();
  }, []);

  const cartTotalItems = cart.reduce((sum, item) => sum + item.qty, 0);

  // Filtra os produtos baseado na categoria selecionada
  const filteredProducts = filterCat
    ? products.filter(p => p.categoryId === filterCat)
    : products;

  return (
    <div className="page">
      <header className="store-header">
        <div>
          <h1>Meu Delivery</h1>
          <p>Escolha seus produtos.</p>
        </div>
        <Link to="/cart" className="cart-link">
          🛒 Carrinho ({cartTotalItems})
        </Link>
      </header>
      
      <main>
        <div className="filters">
          <button onClick={() => setFilterCat('')} className={filterCat === '' ? 'active' : ''}>
            Todos
          </button>
          {categories.map(cat => (
            <button
              key={cat.id}
              onClick={() => setFilterCat(cat.id)}
              className={filterCat === cat.id ? 'active' : ''}
            >
              {cat.name}
            </button>
          ))}
        </div>

        <div className="product-grid">
          {filteredProducts.map(product => (
            <div className="product-card-store" key={product.id}>
              {product.imageUrl && (
                <img src={product.imageUrl} alt={product.name} />
              )}
              <h3>{product.name}</h3>
              <p>{product.description}</p>
              <div className="product-card-footer">
                <span className="price">R$ {product.price?.toFixed(2)}</span>
                <button onClick={() => addToCart(product)}>Adicionar</button>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}