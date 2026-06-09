"use strict";

const { Pool } = require("pg");
const { config } = require("./config");

// Render udostepnia DATABASE_URL. Dla polaczen zdalnych wlaczamy TLS,
// a dla lokalnego PostgreSQL pozostawiamy zwykle polaczenie.
const isLocalDatabase = /localhost|127\.0\.0\.1/.test(config.databaseUrl);
const pool = new Pool({
  connectionString: config.databaseUrl,
  ssl: config.databaseUrl && !isLocalDatabase ? { rejectUnauthorized: false } : false,
  max: Number(process.env.PG_POOL_MAX || 10),
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 10_000,
});

pool.on("error", (error) => {
  console.error("Nieoczekiwany blad polaczenia PostgreSQL:", error);
});

async function withTransaction(callback) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await callback(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

module.exports = { pool, withTransaction };
