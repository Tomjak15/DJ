"use strict";

const { createApp } = require("./app");
const { assertRuntimeConfig, config } = require("./config");
const { pool } = require("./db");
const { ensureAutomaticBackup } = require("./backup-service");

assertRuntimeConfig();

const app = createApp();
const server = app.listen(config.port, "0.0.0.0", () => {
  console.log(`ABW Online OS dziala na porcie ${config.port}`);
  windowlessBackup();
});

async function windowlessBackup() {
  try {
    await ensureAutomaticBackup();
  } catch (error) {
    console.error("Automatyczna kopia ABW nie powiodla sie:", error);
  }
}

const backupInterval = setInterval(windowlessBackup, 6 * 60 * 60 * 1000);
backupInterval.unref();

// Render wysyla SIGTERM przed ponownym wdrozeniem. Zamykamy serwer i pule
// PostgreSQL spokojnie, aby nie urwac zapisu w trakcie synchronizacji.
async function shutdown(signal) {
  console.log(`${signal}: zamykanie serwera ABW...`);
  server.close(async () => {
    await pool.end();
    process.exit(0);
  });
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
