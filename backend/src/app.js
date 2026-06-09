"use strict";

const crypto = require("crypto");
const path = require("path");
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const { config } = require("./config");
const { pool, withTransaction } = require("./db");
const {
  authenticate,
  createToken,
  hashPassword,
  publicUser,
  requireAdmin,
  verifyPassword,
} = require("./auth");
const { getSyncRecords, saveSyncRecords } = require("./sync-service");

const FRONTEND_DIR = path.resolve(__dirname, "../../frontend");
const USERNAME_PATTERN = /^[\p{L}\p{N}_.-]{3,48}$/u;
const RANKS = [
  "Rekrut",
  "Szeregowy",
  "Kadet",
  "Kadet II stopnia",
  "Młodszy sierżant",
  "Starszy sierżant",
  "Podchorąży",
  "Chorąży",
  "Chorążypodmajster",
  "Majster klepka",
  "Majster sztabowy",
  "Majster bagieta",
  "Podoficer",
  "Oficer",
  "Oficer pułkownik",
  "Generał brygad",
  "Generał dywizyjny",
  "Generał generalny",
];

function validateCredentials(body) {
  const username = String(body.nick || body.username || "").trim();
  const fullName = String(body.fullName || body.full_name || username).trim();
  const password = String(body.password || "");
  if (!USERNAME_PATTERN.test(username)) {
    throw new Error("Nick musi miec 3-48 znakow i moze zawierac litery, cyfry, kropke, _ lub -");
  }
  if (fullName.length < 2 || fullName.length > 120) {
    throw new Error("Imie i nazwisko musi miec 2-120 znakow");
  }
  if (password.length < 8 || password.length > 200) {
    throw new Error("Haslo musi miec co najmniej 8 znakow");
  }
  return { username, fullName, password };
}

function makeBadge() {
  return `ABW-${crypto.randomInt(100000, 999999)}`;
}

function databaseError(res, error) {
  if (error.code === "23505") {
    return res.status(409).json({ error: "Nick lub numer odznaki jest juz zajety" });
  }
  console.error(error);
  return res.status(500).json({ error: "Wewnetrzny blad serwera ABW" });
}

async function createAccount({ username, fullName, password, role = "agent", rank = "Rekrut", badge }) {
  const passwordHash = await hashPassword(password);
  return withTransaction(async (client) => {
    // Blokada tabeli zapewnia, ze tylko pierwsze publicznie zarejestrowane
    // konto otrzyma role administratora.
    await client.query("LOCK TABLE users IN EXCLUSIVE MODE");
    const countResult = await client.query("SELECT COUNT(*)::INTEGER AS count FROM users");
    const firstAccount = countResult.rows[0].count === 0;
    const finalRole = firstAccount ? "admin" : role;
    const finalRank = firstAccount ? "Generał generalny" : rank;
    const result = await client.query(
      `INSERT INTO users (
         id, username, full_name, password_hash, role, rank, badge
       ) VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        crypto.randomUUID(),
        username,
        fullName,
        passwordHash,
        finalRole,
        RANKS.includes(finalRank) ? finalRank : "Rekrut",
        badge || makeBadge(),
      ],
    );
    return result.rows[0];
  });
}

function createApp() {
  const app = express();
  const allowedOrigins = String(process.env.CORS_ORIGIN || "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

  app.set("trust proxy", 1);
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:", "blob:"],
        connectSrc: ["'self'", "https:"],
        fontSrc: ["'self'", "data:"],
      },
    },
  }));
  app.use(cors({
    origin(origin, callback) {
      if (!origin || !allowedOrigins.length || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error("Origin niedozwolony przez CORS"));
    },
  }));
  app.use(express.json({ limit: "25mb" }));

  app.get("/health", async (req, res) => {
    await pool.query("SELECT 1");
    res.json({ ok: true, service: "abw-online-os", time: new Date().toISOString() });
  });

  app.post("/register", async (req, res) => {
    try {
      const credentials = validateCredentials(req.body || {});
      const row = await createAccount(credentials);
      const user = publicUser(row, true);
      res.status(201).json({ token: createToken(row), user });
    } catch (error) {
      if (error.code) return databaseError(res, error);
      res.status(400).json({ error: error.message });
    }
  });

  app.post("/login", async (req, res) => {
    const identifier = String(req.body?.nick || req.body?.username || "").trim();
    const password = String(req.body?.password || "");
    const result = await pool.query(
      `SELECT * FROM users
        WHERE LOWER(username) = LOWER($1)
           OR LOWER(badge) = LOWER($1)
        LIMIT 1`,
      [identifier],
    );
    const user = result.rows[0];

    // Taki sam komunikat dla braku konta i zlego hasla ogranicza ujawnianie
    // informacji o zarejestrowanych nickach.
    if (!user) return res.status(401).json({ error: "Nieprawidlowy identyfikator lub haslo" });
    if (user.disabled) return res.status(403).json({ error: "Konto zostalo zablokowane przez administratora" });

    const lockedUntil = user.locked_until ? new Date(user.locked_until) : null;
    if (lockedUntil && lockedUntil.getTime() > Date.now()) {
      return res.status(423).json({
        error: "Konto jest czasowo zablokowane",
        locked_until: lockedUntil.toISOString(),
      });
    }

    if (!(await verifyPassword(password, user.password_hash))) {
      const attempts = Number(user.failed_attempts || 0) + 1;
      const shouldLock = attempts >= config.maxLoginAttempts;
      const nextLock = shouldLock
        ? new Date(Date.now() + config.lockMinutes * 60_000)
        : null;
      await pool.query(
        `UPDATE users
            SET failed_attempts = $1,
                locked_until = $2,
                updated_at = NOW()
          WHERE id = $3`,
        [shouldLock ? 0 : attempts, nextLock, user.id],
      );
      return res.status(401).json({
        error: shouldLock
          ? `Konto zablokowane na ${config.lockMinutes} minut`
          : `Nieprawidlowe haslo. Pozostalo prob: ${config.maxLoginAttempts - attempts}`,
        locked_until: nextLock?.toISOString() || null,
      });
    }

    const refreshed = await pool.query(
      `UPDATE users
          SET failed_attempts = 0, locked_until = NULL, updated_at = NOW()
        WHERE id = $1
      RETURNING *`,
      [user.id],
    );
    const current = refreshed.rows[0];
    res.json({ token: createToken(current), user: publicUser(current, true) });
  });

  app.get("/sync", authenticate, async (req, res) => {
    const records = await getSyncRecords(pool, req.auth.user);
    res.json({ records, server_time: new Date().toISOString() });
  });

  app.post("/sync", authenticate, async (req, res) => {
    try {
      const result = await saveSyncRecords(req.body?.records, req.auth.user);
      res.json({ ...result, server_time: new Date().toISOString() });
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  });

  app.get("/users", authenticate, async (req, res) => {
    const result = await pool.query("SELECT * FROM users ORDER BY created_at ASC");
    const includeSecurity = req.auth.user.role === "admin";
    res.json({ users: result.rows.map((row) => publicUser(row, includeSecurity)) });
  });

  // Dodatkowe endpointy utrzymuja istniejacy panel administracyjny ABW.
  app.post("/users", authenticate, requireAdmin, async (req, res) => {
    try {
      const credentials = validateCredentials(req.body || {});
      const row = await createAccount({
        ...credentials,
        role: req.body.role === "admin" ? "admin" : "agent",
        rank: req.body.rank,
        badge: String(req.body.badge || "").trim() || undefined,
      });
      res.status(201).json({ user: publicUser(row, true) });
    } catch (error) {
      if (error.code) return databaseError(res, error);
      res.status(400).json({ error: error.message });
    }
  });

  app.patch("/users/:id", authenticate, requireAdmin, async (req, res) => {
    const currentResult = await pool.query("SELECT * FROM users WHERE id = $1", [req.params.id]);
    const current = currentResult.rows[0];
    if (!current) return res.status(404).json({ error: "Nie znaleziono konta" });

    const username = String(req.body.nick ?? current.username).trim();
    const fullName = String(req.body.fullName ?? current.full_name).trim();
    const badge = String(req.body.badge ?? current.badge).trim();
    const rank = RANKS.includes(req.body.rank) ? req.body.rank : current.rank;
    const role = req.body.role === "admin" ? "admin" : req.body.role === "agent" ? "agent" : current.role;
    const password = String(req.body.password || "");
    if (!USERNAME_PATTERN.test(username) || fullName.length < 2 || !badge) {
      return res.status(400).json({ error: "Nieprawidlowe dane konta" });
    }
    if (password && password.length < 8) {
      return res.status(400).json({ error: "Nowe haslo musi miec co najmniej 8 znakow" });
    }

    try {
      const passwordHash = password ? await hashPassword(password) : current.password_hash;
      const result = await pool.query(
        `UPDATE users
            SET username = $1,
                full_name = $2,
                badge = $3,
                rank = $4,
                role = $5,
                password_hash = $6,
                disabled = COALESCE($7, disabled),
                failed_attempts = CASE WHEN $8::BOOLEAN THEN 0 ELSE failed_attempts END,
                locked_until = CASE WHEN $8::BOOLEAN THEN NULL ELSE locked_until END,
                updated_at = NOW()
          WHERE id = $9
        RETURNING *`,
        [
          username,
          fullName,
          badge,
          rank,
          role,
          passwordHash,
          typeof req.body.disabled === "boolean" ? req.body.disabled : null,
          Boolean(req.body.unlock),
          current.id,
        ],
      );
      res.json({ user: publicUser(result.rows[0], true) });
    } catch (error) {
      return databaseError(res, error);
    }
  });

  app.delete("/users/:id", authenticate, requireAdmin, async (req, res) => {
    if (req.params.id === req.auth.user.id) {
      return res.status(400).json({ error: "Nie mozna usunac aktywnego konta" });
    }
    const target = await pool.query("SELECT role FROM users WHERE id = $1", [req.params.id]);
    if (!target.rows[0]) return res.status(404).json({ error: "Nie znaleziono konta" });
    if (target.rows[0].role === "admin") {
      const admins = await pool.query("SELECT COUNT(*)::INTEGER AS count FROM users WHERE role = 'admin'");
      if (admins.rows[0].count <= 1) {
        return res.status(400).json({ error: "System musi miec co najmniej jednego administratora" });
      }
    }
    await pool.query("DELETE FROM users WHERE id = $1", [req.params.id]);
    res.status(204).end();
  });

  // Frontend dostaje URL API bez wpisywania adresu Render na stale w kodzie.
  app.get("/config.js", (req, res) => {
    res.type("application/javascript").send(
      `window.ABW_CONFIG = ${JSON.stringify({ API_URL: config.apiUrl })};`,
    );
  });

  app.use(express.static(FRONTEND_DIR, {
    extensions: ["html"],
    maxAge: config.nodeEnv === "production" ? "1h" : 0,
  }));
  app.get("/{*path}", (req, res) => res.sendFile(path.join(FRONTEND_DIR, "index.html")));

  app.use((error, req, res, next) => {
    console.error(error);
    if (res.headersSent) return next(error);
    res.status(500).json({ error: "Wewnetrzny blad serwera ABW" });
  });

  return app;
}

module.exports = { createApp };
