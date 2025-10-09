// Optional SQLite adapter showing how you'd replace readDB/writeDB with SQLite.
// This file is informational and not wired in; it's a starting point if you migrate later.

const Database = require('better-sqlite3');
const path = require('path');

function open(dbPath) {
  const db = new Database(dbPath);
  return db;
}

function exampleUsage() {
  const db = open(path.join(__dirname, '..', 'data', 'agribro.sqlite'));
  const rows = db.prepare('SELECT id, name FROM users LIMIT 10').all();
  console.log(rows);
  db.close();
}

module.exports = { open, exampleUsage };
