import ChatWidget from './components/ChatWidget.jsx';

export default function App() {
  return (
    <div className="page">
      <header>
        <h1>Meu Delivery</h1>
        <p>Faça seu pedido pelo chat.</p>
      </header>
      <main>
        <div className="hero">
          <img src="/hero.jpg" alt="" />
        </div>
      </main>
      <ChatWidget />
    </div>
  );
}