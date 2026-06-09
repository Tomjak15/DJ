"use strict";

const fs = require("fs");
const path = require("path");
const { assertRuntimeConfig } = require("./config");
const { pool } = require("./db");

async function migrate() {
  assertRuntimeConfig();
  const schemaPath = path.resolve(__dirname, "../../database/schema.sql");
  const sql = fs.readFileSync(schemaPath, "utf8");
  await pool.query(sql);
  console.log("Migracja PostgreSQL zakonczona pomyslnie.");
}

migrate()
  .catch((error) => {
    console.error("Migracja nie powiodla sie:", error);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
