const express = require('express');
const cors = require('cors');
const multer = require('multer');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { nanoid } = require('nanoid');
const { db, initDB } = require('./db');
const { put } = require('@vercel/blob');

const JWT_SECRET = 'troque-este-segredo';
const PORT = process.env.PORT || 4000;

const app = express();
const apiRouter = express.Router(); // <--- 1. CRIA UM "ROUTER"

// A Vercel vai definir a origem, mas para local, permite tudo
app.use(cors({ origin: process.env.VERCEL_ENV ? undefined : '*' }));
app.use(express.json());

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

// --- 2. MUDA TODAS AS ROTAS DE "app.get" PARA "apiRouter.get" ---

// Auth
apiRouter.post('/auth/login', async (req, res) => {
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
apiRouter.get('/categories', async (req, res) => {
  await db.read();
  res.json(db.data.categories);
});

apiRouter.post('/categories', auth, async (req, res) => {
  await db.read();
  const { name } = req.body;
  const cat = { id: nanoid(8), name };
  db.data.categories.push(cat);
  await db.write();
  res.json(cat);
});

apiRouter.put('/categories/:id', auth, async (req, res) => {
  await db.read();
  const cat = db.data.categories.find(c => c.id === req.params.id);
  if (!cat) return res.status(404).json({ error: 'Not found' });
  cat.name = req.body.name ?? cat.name;
  await db.write();
  res.json(cat);
});

apiRouter.delete('/categories/:id', auth, async (req, res) => {
  await db.read();
  db.data.categories = db.data.categories.filter(c => c.id !== req.params.id);
  await db.write();
  res.json({ ok: true });
});

// Produtos
apiRouter.get('/products', async (req, res) => {
  await db.read();
  const { categoryId } = req.query;
  let prods = db.data.products;
  if (categoryId) prods = prods.filter(p => p.categoryId === categoryId);
  res.json(prods);
});

apiRouter.post('/products', auth, upload.single('image'), async (req, res) => {
  await db.read();
  const { name, description, price, categoryId, active } = req.body;
  let imageUrl = null;
  if (req.file) {
    const { url } = await put(req.file.originalname, req.file.buffer, { access: 'public' });
    imageUrl = url;
  }
  const prod = {
    id: nanoid(10), name, description,
    price: Number(price || 0),
    categoryId: categoryId || null,
    imageUrl,
    active: active === 'true' || active === true
  };
  db.data.products.push(prod);
  await db.write();
  res.json(prod);
});

apiRouter.put('/products/:id', auth, upload.single('image'), async (req, res) => {
  await db.read();
  const p = db.data.products.find(x => x.id === req.params.id);
  if (!p) return res.status(404).json({ error: 'Not found' });
  const { name, description, price, categoryId, active } = req.body;
  if (req.file) {
    const { url } = await put(req.file.originalname, req.file.buffer, { access: 'public' });
    p.imageUrl = url;
  }
  if (name) p.name = name;
  if (description) p.description = description;
  if (price != null) p.price = Number(price);
  if (categoryId !== undefined) p.categoryId = categoryId || null;
  if (active !== undefined) p.active = active === 'true' || active === true;
  await db.write();
  res.json(p);
});

apiRouter.delete('/products/:id', auth, async (req, res) => {
  await db.read();
  db.data.products = db.data.products.filter(p => p.id !== req.params.id);
  await db.write();
  res.json({ ok: true });
});

// Pedidos
apiRouter.get('/orders', auth, async (req, res) => {
  await db.read();
  res.json(db.data.orders.slice().reverse());
});

apiRouter.post('/orders', async (req, res) => {
  await db.read();
  const { items, customer } = req.body;
  const total = items.reduce((s, it) => s + it.price * it.qty, 0);
  const order = {
    id: nanoid(10),
    items, total,
    customer: customer || {},
    status: 'received',
    createdAt: new Date().toISOString()
  };
  db.data.orders.push(order);
  await db.write();
  res.json(order);
});


// --- 3. AQUI ESTÁ A MAGIA ---
// Usa o router em AMBOS os caminhos
app.use('/api', apiRouter); // Para a Vercel (ex: /api/products)
app.use('/', apiRouter);    // Para o 'dev' local (ex: /products)


// Se NÃO estiver na Vercel, inicia o servidor local
if (!process.env.VERCEL_ENV) {
  initDB().then(() => {
    app.listen(PORT, () => console.log(`API local a rodar em http://localhost:${PORT}`));
  });
}

// Exporta a app para a Vercel
module.exports = app;