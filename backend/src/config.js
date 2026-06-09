"use strict";

const path = require("path");
const dotenv = require("dotenv");

// Przy pracy lokalnej czytamy wspolny plik .env z katalogu glownego.
// Zmienne ustawione przez Render maja pierwszenstwo i nie sa nadpisywane.
dotenv.config({ path: path.resolve(__dirname, "../../.env") });
dotenv.config({ path: path.resolve(__dirname, "../.env"), override: false });

const config = {
  port: Number(process.env.PORT || 8080),
  databaseUrl: process.env.DATABASE_URL || "",
  jwtSecret: process.env.JWT_SECRET || "",
  apiUrl: process.env.API_URL || "",
  nodeEnv: process.env.NODE_ENV || "development",
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "8h",
  lockMinutes: Number(process.env.LOCK_MINUTES || 5),
  maxLoginAttempts: Number(process.env.MAX_LOGIN_ATTEMPTS || 3),
};

function assertRuntimeConfig() {
  const missing = [];
  if (!config.databaseUrl) missing.push("DATABASE_URL");
  if (!config.jwtSecret || config.jwtSecret.length < 24) missing.push("JWT_SECRET (minimum 24 znaki)");
  if (missing.length) {
    throw new Error(`Brak wymaganej konfiguracji: ${missing.join(", ")}`);
  }
}

module.exports = { config, assertRuntimeConfig };
