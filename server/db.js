const { Low } = require('lowdb');
const { JSONFile } = require('lowdb/node');
const fs = require('fs');

const defaultData = {
  users: [],
  categories: [],
  products: [],
  orders: []
};

if (!fs.existsSync('./db.json')) {
  fs.writeFileSync('./db.json', JSON.stringify(defaultData, null, 2));
}

const adapter = new JSONFile('./db.json');
const db = new Low(adapter, defaultData);

async function initDB() {
  await db.read();
  db.data ||= defaultData;

  if (db.data.users.length === 0) {
    const bcrypt = require('bcryptjs');
    const hash = bcrypt.hashSync('admin123', 10);
    db.data.users.push({ id: 'u1', email: 'admin@local', passwordHash: hash });
    await db.write();
  }
}

module.exports = { db, initDB };