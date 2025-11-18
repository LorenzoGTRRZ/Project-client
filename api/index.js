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

// Middlewares
app.use(cors()); // Permite todas as origens
app.use(express.json());
const storage = multer.memoryStorage();
const upload = multer({ storage });

// Roteador da API
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

// --- Rotas da API ---

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

// ... (as outras rotas PUT e DELETE de /categories estão corretas no seu arquivo) ...

// Produtos
apiRouter.get('/products', async (req, res) => {
  await db.read();
  res.json(db.data.products.filter(p => p.active)); // Mostra só ativos na loja
});

apiRouter.get('/products/all', auth, async (req, res) => {
  await db.read();
  res.json(db.data.products); // Rota de admin para ver TODOS
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

// ... (as outras rotas PUT e DELETE de /products estão corretas no seu arquivo) ...

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
    id: nanoid(10), items, total,
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
// A Vercel vai chamar /api/products
// O seu dev local (com o proxy) vai chamar /products
app.use('/api', apiRouter);
app.use('/', apiRouter); 

// Inicia o servidor local (A Vercel ignora isto)
if (!process.env.VERCEL_ENV) {
  initDB().then(() => {
    app.listen(PORT, () => console.log(`API local rodando em http://localhost:${PORT}`));
  });
}

// Exporta o app para a Vercel
module.exports = app;