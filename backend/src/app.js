"use strict";

const crypto = require("crypto");
const path = require("path");
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const { config } = require("./config");
const QRCode = require("qrcode");
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
const {
  acknowledgeMessage,
  createDirectConversation,
  createGroupConversation,
  deleteMessage,
  getMessages,
  listConversations,
  markConversationRead,
  reactToMessage,
  searchMessages,
  sendMessage,
  setMessagePinned,
} = require("./messenger-service");
const { getUserManagementPermissions } = require("./permissions");
const {
  listDevices,
  listPresence,
  recordLoginDevice,
  touchPresence,
} = require("./security-service");
const {
  createBackup,
  listBackups,
  restoreBackup,
  systemStatus,
} = require("./backup-service");

const FRONTEND_DIR = path.resolve(__dirname, "../../frontend");
const USERNAME_PATTERN = /^[\p{L}\p{N}_.-]{3,48}$/u;
function normalizeRank(rank) {
  return String(rank || "Rekrut").trim().slice(0, 80) || "Rekrut";
}

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
  if (!password || password.length > 200) {
    throw new Error("Haslo nie moze byc puste");
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

function requireCategoryManagement(category) {
  return async (req, res, next) => {
    if (req.auth.user.role === "admin") return next();
    const permissions = await getUserManagementPermissions(pool, req.auth.user);
    if (permissions[category] !== true) {
      return res.status(403).json({ error: "Ta ranga nie ma uprawnienia do tej operacji" });
    }
    next();
  };
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
        normalizeRank(finalRank),
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
      if (!origin || origin === "null" || !allowedOrigins.length || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      const error = new Error("Origin niedozwolony przez CORS");
      error.status = 403;
      return callback(error);
    },
  }));
  app.use(express.json({ limit: "25mb" }));

  app.get("/health", async (req, res) => {
    await pool.query("SELECT 1");
    res.json({ ok: true, service: "abw-online-os", time: new Date().toISOString() });
  });

  // Konta tworzy wylacznie zalogowany administrator przez POST /users.
  // Jawna odpowiedz 403 blokuje rowniez stare wersje klienta i reczne wywolania.
  app.post("/register", (req, res) => {
    res.status(403).json({ error: "Konta ABW moze tworzyc tylko administrator" });
  });

  app.post("/account-status", async (req, res) => {
    const identifier = String(req.body?.nick || req.body?.username || "").trim();
    if (!identifier) {
      return res.status(400).json({ error: "Podaj nick lub ID agenta" });
    }
    const result = await pool.query(
      `SELECT disabled, failed_attempts, locked_until
         FROM users
        WHERE LOWER(username) = LOWER($1)
           OR LOWER(badge) = LOWER($1)
        LIMIT 1`,
      [identifier],
    );
    const user = result.rows[0];
    if (!user) {
      return res.json({
        status: "unknown",
        max_attempts: config.maxLoginAttempts,
        remaining_attempts: config.maxLoginAttempts,
        locked_until: null,
      });
    }
    const lockedUntil = user.locked_until ? new Date(user.locked_until) : null;
    const temporarilyLocked = Boolean(lockedUntil && lockedUntil.getTime() > Date.now());
    const failedAttempts = Number(user.failed_attempts || 0);
    res.json({
      status: user.disabled ? "disabled" : temporarilyLocked ? "locked" : "active",
      disabled: Boolean(user.disabled),
      max_attempts: config.maxLoginAttempts,
      failed_attempts: failedAttempts,
      remaining_attempts: user.disabled || temporarilyLocked
        ? 0
        : Math.max(0, config.maxLoginAttempts - failedAttempts),
      locked_until: temporarilyLocked ? lockedUntil.toISOString() : null,
    });
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

    if (!user) {
      return res.status(401).json({
        error: "Nieprawidlowy identyfikator lub haslo",
        status: "unknown",
        max_attempts: config.maxLoginAttempts,
        remaining_attempts: config.maxLoginAttempts,
      });
    }
    if (user.disabled) {
      return res.status(403).json({
        error: "Konto zostalo zablokowane przez administratora",
        status: "disabled",
        disabled: true,
        max_attempts: config.maxLoginAttempts,
        remaining_attempts: 0,
      });
    }

    const lockedUntil = user.locked_until ? new Date(user.locked_until) : null;
    if (lockedUntil && lockedUntil.getTime() > Date.now()) {
      return res.status(423).json({
        error: "Konto jest czasowo zablokowane",
        status: "locked",
        max_attempts: config.maxLoginAttempts,
        remaining_attempts: 0,
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
        status: shouldLock ? "locked" : "active",
        max_attempts: config.maxLoginAttempts,
        failed_attempts: shouldLock ? config.maxLoginAttempts : attempts,
        remaining_attempts: shouldLock ? 0 : config.maxLoginAttempts - attempts,
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
    const device = await recordLoginDevice(current.id, req.body, req);
    await touchPresence(current.id, { status: "online" });
    res.json({
      token: createToken(current),
      user: publicUser(current, true),
      security: {
        newDevice: device.isNew,
        deviceId: device.deviceId,
        deviceName: device.deviceName,
      },
    });
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

  app.get("/users/:id/identity-qr", authenticate, async (req, res) => {
    if (req.params.id !== req.auth.user.id && req.auth.user.role !== "admin") {
      return res.status(403).json({ error: "Brak dostepu do legitymacji" });
    }
    const result = await pool.query(
      "SELECT id, username, full_name, rank, badge FROM users WHERE id = $1",
      [req.params.id],
    );
    const user = result.rows[0];
    if (!user) return res.status(404).json({ error: "Nie znaleziono konta" });
    const payload = [
      "ABW-ID",
      user.id,
      user.username,
      user.badge,
      user.rank,
    ].join("|");
    const dataUrl = await QRCode.toDataURL(payload, {
      errorCorrectionLevel: "H",
      margin: 1,
      width: 260,
      color: { dark: "#04131f", light: "#ffffff" },
    });
    return res.json({ dataUrl, qrDataUrl: dataUrl, payload });
  });

  app.get("/messages", authenticate, async (req, res) => {
    res.json({ conversations: await listConversations(req.auth.user.id) });
  });

  app.get("/messages/search", authenticate, async (req, res) => {
    res.json({ results: await searchMessages(req.auth.user.id, req.query.q) });
  });

  app.post("/messages/direct", authenticate, async (req, res) => {
    try {
      const conversationId = await createDirectConversation(req.auth.user.id, req.body?.userId);
      res.status(201).json({ conversationId });
    } catch (error) {
      res.status(error.status || 400).json({ error: error.message });
    }
  });

  app.post("/messages/groups", authenticate, requireCategoryManagement("messenger"), async (req, res) => {
    try {
      const conversationId = await createGroupConversation(
        req.auth.user.id,
        req.body?.name,
        req.body?.memberIds,
      );
      res.status(201).json({ conversationId });
    } catch (error) {
      res.status(error.status || 400).json({ error: error.message });
    }
  });

  app.get("/messages/:conversationId", authenticate, async (req, res) => {
    try {
      res.json({ messages: await getMessages(req.params.conversationId, req.auth.user.id) });
    } catch (error) {
      res.status(error.status || 400).json({ error: error.message });
    }
  });

  app.post("/messages/:conversationId", authenticate, async (req, res) => {
    try {
      const message = await sendMessage(
        req.params.conversationId,
        req.auth.user.id,
        req.body,
      );
      res.status(201).json({ message });
    } catch (error) {
      res.status(error.status || 400).json({ error: error.message });
    }
  });

  app.post("/messages/:conversationId/read", authenticate, async (req, res) => {
    try {
      await markConversationRead(req.params.conversationId, req.auth.user.id);
      res.status(204).end();
    } catch (error) {
      res.status(error.status || 400).json({ error: error.message });
    }
  });

  app.post("/messages/:conversationId/:messageId/react", authenticate, async (req, res) => {
    try {
      await reactToMessage(
        req.params.conversationId,
        req.params.messageId,
        req.auth.user.id,
        req.body?.reaction,
      );
      res.status(204).end();
    } catch (error) {
      res.status(error.status || 400).json({ error: error.message });
    }
  });

  app.post("/messages/:conversationId/:messageId/ack", authenticate, async (req, res) => {
    try {
      await acknowledgeMessage(
        req.params.conversationId,
        req.params.messageId,
        req.auth.user.id,
      );
      res.status(204).end();
    } catch (error) {
      res.status(error.status || 400).json({ error: error.message });
    }
  });

  app.patch("/messages/:conversationId/:messageId/pin", authenticate, async (req, res) => {
    try {
      await setMessagePinned(
        req.params.conversationId,
        req.params.messageId,
        req.auth.user.id,
        req.body?.pinned,
      );
      res.status(204).end();
    } catch (error) {
      res.status(error.status || 400).json({ error: error.message });
    }
  });

  app.delete("/messages/:conversationId/:messageId", authenticate, async (req, res) => {
    try {
      await deleteMessage(
        req.params.conversationId,
        req.params.messageId,
        req.auth.user,
      );
      res.status(204).end();
    } catch (error) {
      res.status(error.status || 400).json({ error: error.message });
    }
  });

  app.post("/presence", authenticate, async (req, res) => {
    await touchPresence(req.auth.user.id, req.body || {});
    res.status(204).end();
  });

  app.get("/presence", authenticate, async (req, res) => {
    res.json({ users: await listPresence() });
  });

  app.get("/security/devices", authenticate, async (req, res) => {
    res.json({ devices: await listDevices(req.auth.user.id) });
  });

  app.post("/emergency/evacuate", authenticate, async (req, res) => {
    const reason = String(req.body?.reason || "Procedura ewakuacji uruchomiona").trim().slice(0, 400);
    const event = {
      id: `evt-${crypto.randomUUID()}`,
      type: "misja awaryjna",
      severity: "red",
      title: `EWAKUACJA // ${req.auth.user.username}`,
      body: reason,
      createdAt: Date.now(),
      createdBy: req.auth.user.id,
      classification: "tajne",
    };
    await withTransaction(async (client) => {
      await client.query("SELECT pg_advisory_xact_lock(hashtext('shared:shared:events'))");
      const current = await client.query(
        `SELECT id, data FROM sync_records
          WHERE scope = 'shared' AND record_key = 'events'
          FOR UPDATE`,
      );
      const events = Array.isArray(current.rows[0]?.data) ? current.rows[0].data : [];
      const nextEvents = [event, ...events].slice(0, 100);
      if (current.rows[0]) {
        await client.query(
          "UPDATE sync_records SET data = $1::JSONB, updated_at = NOW() WHERE id = $2",
          [JSON.stringify(nextEvents), current.rows[0].id],
        );
      } else {
        await client.query(
          `INSERT INTO sync_records (scope, record_key, owner_user_id, data)
           VALUES ('shared', 'events', NULL, $1::JSONB)`,
          [JSON.stringify(nextEvents)],
        );
      }
      await client.query("SELECT pg_advisory_xact_lock(hashtext('shared:shared:categoryActivity'))");
      const activityResult = await client.query(
        `SELECT id, data FROM sync_records
          WHERE scope = 'shared' AND record_key = 'categoryActivity'
          FOR UPDATE`,
      );
      const activity = activityResult.rows[0]?.data || {};
      activity.events = {
        sequence: Number(activity.events?.sequence || 0) + 1,
        updatedAt: Date.now(),
      };
      if (activityResult.rows[0]) {
        await client.query(
          "UPDATE sync_records SET data = $1::JSONB, updated_at = NOW() WHERE id = $2",
          [JSON.stringify(activity), activityResult.rows[0].id],
        );
      } else {
        await client.query(
          `INSERT INTO sync_records (scope, record_key, owner_user_id, data)
           VALUES ('shared', 'categoryActivity', NULL, $1::JSONB)`,
          [JSON.stringify(activity)],
        );
      }
    });
    res.status(201).json({ event });
  });

  app.get("/admin/status", authenticate, requireAdmin, async (req, res) => {
    res.json(await systemStatus());
  });

  app.get("/admin/backups", authenticate, requireAdmin, async (req, res) => {
    res.json({ backups: await listBackups() });
  });

  app.post("/admin/backups", authenticate, requireAdmin, async (req, res) => {
    const id = await createBackup(req.auth.user.id, "manual", req.body?.label);
    res.status(201).json({ id, backups: await listBackups() });
  });

  app.post("/admin/backups/:id/restore", authenticate, requireAdmin, async (req, res) => {
    try {
      await createBackup(req.auth.user.id, "manual", "Kopia przed przywróceniem");
      await restoreBackup(req.params.id);
      res.json({ restored: true });
    } catch (error) {
      res.status(error.status || 400).json({ error: error.message });
    }
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
    const rank = req.body.rank === undefined ? current.rank : normalizeRank(req.body.rank);
    const role = req.body.role === "admin" ? "admin" : req.body.role === "agent" ? "agent" : current.role;
    const password = String(req.body.password || "");
    if (!USERNAME_PATTERN.test(username) || fullName.length < 2 || !badge) {
      return res.status(400).json({ error: "Nieprawidlowe dane konta" });
    }
    if (password.length > 200) {
      return res.status(400).json({ error: "Nowe haslo jest zbyt dlugie" });
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
    res.status(error.status || 500).json({
      error: error.status === 403 ? error.message : "Wewnetrzny blad serwera ABW",
    });
  });

  return app;
}

module.exports = { createApp };
