const express = require('express');
const http = require('http');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { nanoid } = require('nanoid');
const { db, initDB } = require('./db');
const { put } = require('@vercel/blob');

const JWT_SECRET = 'troque-este-segredo';
const PORT = process.env.PORT || 4000;
const FRONT_ORIGIN = process.env.FRONT_ORIGIN || ['https://project-client-ashen.vercel.app'];

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: FRONT_ORIGIN, methods: ['GET','POST'] }});

app.use(cors({ origin: FRONT_ORIGIN, credentials: true }));
app.use(express.json());

// Pasta de uploads
//const uploadDir = path.join(__dirname, 'uploads');
//if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);

// Servir imagens
//app.use('/uploads', express.static(uploadDir));

// Multer (upload de imagens)
const storage = multer.memoryStorage();
const upload = multer({ storage });

// Middleware auth admin
function auth(req, res, next) {
  const hdr = req.headers.authorization || '';
  const token = hdr.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'Unauthenticated' });
  try {
    jwt.verify(token, JWT_SECRET);
    return next();
  } catch {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

// Auth
app.post('/auth/login', async (req, res) => {
  await db.read();
  const { email, password } = req.body || {};
  const user = db.data.users.find(u => u.email === email);
  if (!user) return res.status(401).json({ error: 'Credenciais inválidas' });
  const ok = bcrypt.compareSync(password, user.passwordHash);
  if (!ok) return res.status(401).json({ error: 'Credenciais inválidas' });
  const token = jwt.sign({ sub: user.id, email }, JWT_SECRET, { expiresIn: '12h' });
  res.json({ token });
});

// Categorias
app.get('/categories', async (req, res) => {
  await db.read();
  res.json(db.data.categories);
});

app.post('/categories', auth, async (req, res) => {
  await db.read();
  const { name } = req.body;
  const cat = { id: nanoid(8), name };
  db.data.categories.push(cat);
  await db.write();
  res.json(cat);
});

app.put('/categories/:id', auth, async (req, res) => {
  await db.read();
  const cat = db.data.categories.find(c => c.id === req.params.id);
  if (!cat) return res.status(404).json({ error: 'Not found' });
  cat.name = req.body.name ?? cat.name;
  await db.write();
  res.json(cat);
});

app.delete('/categories/:id', auth, async (req, res) => {
  await db.read();
  db.data.categories = db.data.categories.filter(c => c.id !== req.params.id);
  await db.write();
  res.json({ ok: true });
});

// Produtos
app.get('/products', async (req, res) => {
  await db.read();
  const { categoryId } = req.query;
  let prods = db.data.products;
  if (categoryId) prods = prods.filter(p => p.categoryId === categoryId);
  res.json(prods);
});

app.post('/products', auth, upload.single('image'), async (req, res) => { // ADICIONE ASYNC
  // ... (db.read() ...)
  const { name, description, price, categoryId, active } = req.body;

  let imageUrl = null;
  if (req.file) {
    // Faz o upload para o Vercel Blob
    const { url } = await put(req.file.originalname, req.file.buffer, {
      access: 'public',
    });
    imageUrl = url; // Salva a URL completa do blob
  }

  const prod = {
    id: nanoid(10),
    name,
    description,
    price: Number(price || 0),
    categoryId: categoryId || null,
    imageUrl,
    active: active === 'true' || active === true
  };
  db.data.products.push(prod);
  await db.write();
  res.json(prod);
});

app.put('/products/:id', auth, upload.single('image'), async (req, res) => {
  await db.read();
  const p = db.data.products.find(x => x.id === req.params.id);
  if (!p) return res.status(404).json({ error: 'Not found' });

  const { name, description, price, categoryId, active } = req.body;
  if (req.file) {
  // Faz o upload para o Vercel Blob
  const { url } = await put(req.file.originalname, req.file.buffer, {
    access: 'public',
  });
  p.imageUrl = url; // Salva a URL completa
}
  if (name) p.name = name;
  if (description) p.description = description;
  if (price != null) p.price = Number(price);
  if (categoryId !== undefined) p.categoryId = categoryId || null;
  if (active !== undefined) p.active = active === 'true' || active === true;

  await db.write();
  res.json(p);
});

app.delete('/products/:id', auth, async (req, res) => {
  await db.read();
  db.data.products = db.data.products.filter(p => p.id !== req.params.id);
  await db.write();
  res.json({ ok: true });
});

// Pedidos (lista para admin)
app.get('/orders', auth, async (req, res) => {
  await db.read();
  res.json(db.data.orders.slice().reverse());
});

// Criar pedido (usado pelo chat)
app.post('/orders', async (req, res) => {
  await db.read();
  const { items, customer } = req.body;
  const total = items.reduce((s, it) => s + it.price * it.qty, 0);
  const order = {
    id: nanoid(10),
    items,
    total,
    customer: customer || {},
    status: 'received',
    createdAt: new Date().toISOString()
  };
  db.data.orders.push(order);
  await db.write();
  res.json(order);
});

// Estado de sessão do chat em memória
const sessions = new Map();

// Helpers de mensagens
function msgText(text, options = []) {
  return { type: 'text', text, options };
}

function listCategories() {
  const opts = db.data.categories.map(c => ({ id: `cat:${c.id}`, title: c.name }));
  return msgText('Escolha uma categoria:', opts);
}

function listProducts(categoryId) {
  const prods = db.data.products.filter(p => p.active !== false && (!categoryId || p.categoryId === categoryId));
  if (prods.length === 0) return msgText('Não há produtos nessa categoria no momento.', [
    { id: 'home', title: 'Voltar' }
  ]);
  const options = prods.map(p => ({ id: `prod:${p.id}`, title: `${p.name} - R$ ${p.price.toFixed(2)}` }));
  return { type: 'products', products: prods, options };
}

function cartSummary(cart) {
  if (!cart.length) return 'Seu carrinho está vazio.';
  const lines = cart.map(i => `• ${i.name} x${i.qty} — R$ ${(i.price * i.qty).toFixed(2)}`);
  const total = cart.reduce((s, i) => s + i.price * i.qty, 0);
  return `${lines.join('\n')}\nTotal: R$ ${total.toFixed(2)}`;
}

io.on('connection', async (socket) => {
  await db.read();
  const sid = socket.handshake.query.sid || socket.id;
  const s = sessions.get(sid) || { step: 'welcome', cart: [], customer: {} };
  sessions.set(sid, s);

  socket.emit('server:messages', [
    msgText('Olá! Sou o assistente de pedidos. Como posso ajudar?', [
      { id: 'menu', title: 'Ver cardápio' },
      { id: 'cart', title: 'Ver carrinho' },
      { id: 'checkout', title: 'Finalizar pedido' }
    ])
  ]);

  socket.on('client:select', async (payload) => {
    await db.read();
    const state = sessions.get(sid);
    const send = (msgs) => socket.emit('server:messages', Array.isArray(msgs) ? msgs : [msgs]);

    if (payload === 'menu' || payload === 'home') {
      state.step = 'choose_category';
      return send(listCategories());
    }

    if (payload.startsWith('cat:')) {
      const catId = payload.split(':')[1];
      state.currentCategoryId = catId;
      state.step = 'choose_product';
      const lp = listProducts(catId);
      if (lp.type === 'products') {
        // CORREÇÃO: Envia o texto e o objeto de produtos em msgs separadas
        return send([
          msgText('Escolha um produto:'),
          lp
        ]);
      } else {
        return send(lp); // Isso já está certo (envia "Não há produtos")
      }
    }

    if (payload.startsWith('prod:')) {
      const pid = payload.split(':')[1];
      const p = db.data.products.find(x => x.id === pid);
      if (!p) return send(msgText('Produto não encontrado.', [{ id: 'menu', title: 'Voltar ao cardápio' }]));
      state.lastProduct = p;
      state.step = 'set_qty';
      return send(msgText(`"${p.name}" — R$ ${p.price.toFixed(2)}\n${p.description || ''}\nQuantas unidades?`, [
        { id: 'qty:1', title: '1' },
        { id: 'qty:2', title: '2' },
        { id: 'qty:3', title: '3' },
        { id: 'cancel', title: 'Cancelar' }
      ]));
    }

    if (payload.startsWith('qty:')) {
      const qty = Number(payload.split(':')[1] || 1);
      const p = state.lastProduct;
      if (p) {
        const existing = state.cart.find(i => i.productId === p.id);
        if (existing) existing.qty += qty;
        else state.cart.push({ productId: p.id, name: p.name, price: p.price, qty });
      }
      state.lastProduct = null;
      state.step = 'post_add';
      const summary = cartSummary(state.cart);
      return send(msgText(`Adicionado! Seu carrinho:\n${summary}`, [
        { id: 'menu', title: 'Adicionar mais' },
        { id: 'checkout', title: 'Finalizar' },
        { id: 'cart', title: 'Ver carrinho' }
      ]));
    }

    if (payload === 'cart') {
      const summary = cartSummary(state.cart);
      return send(msgText(summary, [
        { id: 'menu', title: 'Adicionar mais' },
        { id: 'checkout', title: 'Finalizar' },
        { id: 'clear_cart', title: 'Esvaziar' }
      ]));
    }

    if (payload === 'clear_cart') {
      state.cart = [];
      return send(msgText('Carrinho esvaziado.', [
        { id: 'menu', title: 'Ver cardápio' }
      ]));
    }

    if (payload === 'checkout') {
      if (!state.cart.length) {
        return send(msgText('Seu carrinho está vazio. Primeiro adicione itens.', [
          { id: 'menu', title: 'Ver cardápio' }
        ]));
      }
      state.step = 'ask_name';
      return send(msgText('Perfeito! Qual é o seu nome?'));
    }

    if (payload === 'place_order') {
      await db.read();
      const orderItems = state.cart.map(i => ({ productId: i.productId, name: i.name, price: i.price, qty: i.qty }));
      const total = orderItems.reduce((s, i) => s + i.price * i.qty, 0);
      const order = {
        id: nanoid(10),
        items: orderItems,
        total,
        customer: state.customer,
        status: 'received',
        createdAt: new Date().toISOString()
      };
      db.data.orders.push(order);
      await db.write();
      state.cart = [];
      state.step = 'welcome';
      io.to(socket.id).emit('server:messages', [
        msgText(`Pedido confirmado! Nº ${order.id}\nTotal: R$ ${total.toFixed(2)}\nVocê receberá atualizações aqui.`),
        msgText('Posso ajudar em algo mais?', [
          { id: 'menu', title: 'Ver cardápio' },
          { id: 'cart', title: 'Ver carrinho' }
        ])
      ]);
    }
  });

  socket.on('client:text', async (text) => {
    await db.read();
    const state = sessions.get(sid);
    const send = (msgs) => socket.emit('server:messages', Array.isArray(msgs) ? msgs : [msgs]);

    if (state.step === 'ask_name') {
      state.customer.name = text.trim();
      state.step = 'ask_address';
      return send(msgText(`Obrigado, ${state.customer.name}! Qual é o endereço de entrega?`));
    }

    if (state.step === 'ask_address') {
      state.customer.address = text.trim();
      state.step = 'confirm_order';
      const summary = cartSummary(state.cart);
      const total = state.cart.reduce((s, i) => s + i.price * i.qty, 0);
      return send(msgText(
        `Revise seu pedido:\n${summary}\n\nNome: ${state.customer.name}\nEndereço: ${state.customer.address}\n\nConfirmar?`,
        [
          { id: 'place_order', title: `Confirmar (R$ ${total.toFixed(2)})` },
          { id: 'cart', title: 'Voltar ao carrinho' }
        ]
      ));
    }

    send(msgText('Não entendi. Use os botões ou digite seu nome/endereço quando solicitado.'));
  });
});

initDB().then(() => {
  server.listen(PORT, () => console.log(`API/Socket rodando em http://localhost:${PORT}`));
});