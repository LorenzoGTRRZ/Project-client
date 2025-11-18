const { createClient } = require('@vercel/kv');
const bcrypt = require('bcryptjs');

// As variáveis de ambiente são injetadas pela Vercel
const kv = createClient({
  url: process.env.KV_REST_API_URL,
  token: process.env.KV_REST_API_TOKEN,
});

const DB_KEY = 'minha-loja-db'; // Chave principal no KV
const defaultData = { users: [], categories: [], products: [], orders: [] };

const db = {
  data: null, // Será preenchido pelo read()
  
  async read() {
    let data = await kv.get(DB_KEY);
    if (!data) {
      console.log('Nenhum DB encontrado, criando um novo com admin...');
      data = defaultData;
      // Seed do usuário admin, já que o DB é novo
      const hash = bcrypt.hashSync('admin123', 10);
      data.users.push({ id: 'u1', email: 'admin@local', passwordHash: hash });
      await kv.set(DB_KEY, data); // Salva o admin inicial
    }
    this.data = data;
  },
  
  async write() {
    if (this.data) {
      await kv.set(DB_KEY, this.data);
    }
  }
};

// A função initDB agora só precisa chamar o read.
async function initDB() {
  await db.read();
}

module.exports = { db, initDB };