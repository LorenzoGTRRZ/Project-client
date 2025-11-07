import { useEffect, useMemo, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { API_URL } from '../api';

export default function ChatWidget() {
  const [open, setOpen] = useState(true);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const sid = useMemo(() => {
    const k = 'chat_sid';
    let v = localStorage.getItem(k);
    if (!v) { v = crypto.randomUUID(); localStorage.setItem(k, v); }
    return v;
  }, []);
  const socketRef = useRef(null);
  const endRef = useRef(null);

  useEffect(() => {
    const s = io(API_URL, { query: { sid } });
    socketRef.current = s;

    s.on('server:messages', (msgs) => {
      setMessages(prev => [...prev, ...msgs]);
    });

    return () => s.disconnect();
  }, [sid]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendText = () => {
    const txt = input.trim();
    if (!txt) return;
    setMessages(prev => [...prev, { type: 'you', text: txt }]);
    socketRef.current.emit('client:text', txt);
    setInput('');
  };

  const clickOption = (id, title) => {
    setMessages(prev => [...prev, { type: 'you', text: title }]);
    socketRef.current.emit('client:select', id);
  };

  return (
    <div className={`chat ${open ? 'open' : ''}`}>
      <div className="chat-header" onClick={() => setOpen(!open)}>
        <strong>Chat de Pedidos</strong>
        <span>{open ? '−' : '+'}</span>
      </div>
      {open && (
        <div className="chat-body">
          <div className="msgs">
            {messages.map((m, i) => (
              <div key={i} className={`msg ${m.type === 'you' ? 'you' : 'bot'}`}>
                {m.text && <p>{m.text}</p>}

                {m.type === 'products' && m.products?.length > 0 && (
                  <div className="products-list">
                    {m.products.map(p => (
                      <div key={p.id} className="product-card">
                        {p.imageUrl && <img src={`${API_URL}${p.imageUrl}`} alt={p.name} />}
                        <strong>{p.name}</strong>
                        <span>R$ {p.price.toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                )}

                {m.options?.length > 0 && (
                  <div className="options">
                    {m.options.map(o => (
                      <button key={o.id} onClick={() => clickOption(o.id, o.title)}>{o.title}</button>
                    ))}
                  </div>
                )}
              </div>
            ))}
            <div ref={endRef} />
          </div>
          <div className="composer">
            <input
              value={input}
              placeholder="Digite aqui..."
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && sendText()}
            />
            <button onClick={sendText}>Enviar</button>
          </div>
        </div>
      )}
    </div>
  );
}