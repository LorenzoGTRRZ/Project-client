import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { CartProvider } from './CartContext.jsx'; // 1. Importar
import App from './App.jsx';
import AdminLogin from './pages/AdminLogin.jsx';
import AdminProducts from './pages/AdminProducts.jsx';
import CartPage from './pages/CartPage.jsx'; // 2. Importar
import './styles.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <CartProvider> {/* 3. Envolver tudo com o Provider */}
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<App />} />
          <Route path="/cart" element={<CartPage />} /> {/* 4. Nova rota do carrinho */}
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route path="/admin/products" element={<AdminProducts />} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </BrowserRouter>
    </CartProvider>
  </React.StrictMode>
);