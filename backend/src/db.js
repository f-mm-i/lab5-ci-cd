const { Pool } = require("pg");

const pool = new Pool({
  host: process.env.DB_HOST || "db",
  port: parseInt(process.env.DB_PORT || "5432", 10),
  user: process.env.DB_USER || "postgres",
  password: process.env.DB_PASSWORD || "postgres",
  database: process.env.DB_NAME || "mental_maps",
  max: 10,
  idleTimeoutMillis: 30000
});

async function query(text, params) {
  return pool.query(text, params);
}

module.exports = { pool, query };
