import { useState } from 'react';
import { useCart } from '../CartContext';
import { api } from '../api';
import { Link } from 'react-router-dom';

export default function CartPage() {
  const { cart, removeFromCart, clearCart } = useCart();
  const [customer, setCustomer] = useState({ name: '', address: '' });

  const total = cart.reduce((sum, item) => sum + item.price * item.qty, 0);

  const handleCheckout = async () => {
    if (!customer.name || !customer.address) {
      alert('Por favor, preencha seu nome e endereço.');
      return;
    }
    try {
      // Reusa a rota de pedidos que o chat usava
      const orderData = {
        items: cart.map(item => ({
          productId: item.id,
          name: item.name,
          price: item.price,
          qty: item.qty,
        })),
        customer,
      };
      await api.post('/orders', orderData);
      alert('Pedido realizado com sucesso!');
      clearCart();
    } catch (err) {
      alert('Erro ao finalizar pedido.');
      console.error(err);
    }
  };

  return (
    <div className="page cart-page">
      <header>
        <h1>Meu Carrinho</h1>
        <Link to="/">Voltar para a loja</Link>
      </header>

      {cart.length === 0 ? (
        <p>Seu carrinho está vazio.</p>
      ) : (
        <>
          <div className="cart-items">
            {cart.map(item => (
              <div key={item.id} className="cart-item">
                <span>{item.name} (x{item.qty})</span>
                <span>R$ {(item.price * item.qty).toFixed(2)}</span>
                <button onClick={() => removeFromCart(item.id)}>Remover</button>
              </div>
            ))}
          </div>

          <div className="cart-total">
            <strong>Total: R$ {total.toFixed(2)}</strong>
          </div>

          <div className="checkout-form">
            <h3>Seus Dados</h3>
            <input
              placeholder="Seu nome"
              value={customer.name}
              onChange={e => setCustomer({ ...customer, name: e.target.value })}
            />
            <input
              placeholder="Endereço de entrega"
              value={customer.address}
              onChange={e => setCustomer({ ...customer, address: e.target.value })}
            />
            <button onClick={handleCheckout}>Finalizar Pedido</button>
          </div>
        </>
      )}
    </div>
  );
}