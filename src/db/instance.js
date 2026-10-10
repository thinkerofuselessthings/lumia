/**
 * DB Instance — database path constant and singleton management
 */

const path = require("path");
const { env } = require("../config/env");

const DB_PATH = path.resolve(__dirname, "..", "..", env("DB_PATH", "data/lumia.db"));

let db;

function _setDb(instance) { db = instance; }
function getDb() {
  if (!db) throw new Error("Database not initialized — call initDatabase() first");
  return db;
}

module.exports = { DB_PATH, _setDb, getDb };
