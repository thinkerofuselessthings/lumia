/**
 * DB Connection — database initialization
 */

const { initSqlite, Database } = require("../lib/sqlite-wrapper");
const fs = require("fs");
const path = require("path");
const { DB_PATH, _setDb } = require("./instance");
const { createTables } = require("./schema");

async function initDatabase() {
  const dir = path.dirname(DB_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  await initSqlite();

  const db = new Database(DB_PATH);
  db.pragma("foreign_keys = ON");
  _setDb(db);

  db.beginBatch();
  createTables();
  db.endBatch();

  console.log("  [DB] Database ready:", DB_PATH);
  return db;
}

module.exports = { initDatabase };
