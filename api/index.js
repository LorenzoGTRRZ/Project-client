const express = require('express');
const cors = require('cors');
const multer = require('multer');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { nanoid } = require('nanoid');
const { db, initDB } = require('./db'); // <-- Usa o novo db.js
const { put } = require('@vercel/blob'); // <-- Usa o Vercel Blob

const JWT_SECRET = 'troque-este-segredo';
const PORT = process.env.PORT || 4000;
const app = express();

app.use(cors());
app.use(express.json());
const storage = multer.memoryStorage();
const upload = multer({ storage });

const apiRouter = express.Router();

// Middleware de autenticação
function auth(req, res, next) {
  const token = (req.headers.authorization || '').replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'Unauthenticated' });
  try {
    jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
}

// --- Rotas da API (idênticas às que você já tem) ---

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
  // Mostra apenas produtos ativos na loja
  const prods = db.data.products.filter(p => p.active === true);
  res.json(prods);
});

// Rota de admin para ver TODOS os produtos
apiRouter.get('/products/all', auth, async (req, res) => {
  await db.read();
  res.json(db.data.products);
});

apiRouter.post('/products', auth, upload.single('image'), async (req, res) => {
  await db.read();
  const { name, description, price, categoryId, active } = req.body;
  let imageUrl = null;
  if (req.file) {
    // Salva no Vercel Blob
    const { url } = await put(req.file.originalname, req.file.buffer, { access: 'public', addRandomSuffix: true });
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
    // Salva no Vercel Blob
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

// --- Fim das Rotas ---

// Diz ao Express para usar o roteador
app.use('/api', apiRouter); // Para a Vercel (ex: /api/products)
app.use('/', apiRouter);    // Para o 'dev' local (ex: /products)

// **A MUDANÇA IMPORTANTE:**
// Chama o initDB() (que chama o db.read()) ANTES de qualquer coisa.
// Isso garante que o admin user seja criado no Vercel KV na primeira inicialização.
initDB().then(() => {
  // Se NÃO estiver na Vercel, inicia o servidor local
  if (!process.env.VERCEL_ENV) {
    app.listen(PORT, () => console.log(`API local rodando em http://localhost:${PORT}`));
  }
});

// Exporta a app para a Vercel
module.exports = app;