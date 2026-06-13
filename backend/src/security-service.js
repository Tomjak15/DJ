"use strict";

const crypto = require("crypto");
const { pool } = require("./db");

function clientIp(req) {
  const forwarded = String(req.get("x-forwarded-for") || "").split(",")[0].trim();
  return forwarded || req.ip || req.socket?.remoteAddress || "";
}

function sessionExpiry() {
  const match = String(process.env.JWT_EXPIRES_IN || "8h").match(/^(\d+)([mhd])$/i);
  if (!match) return new Date(Date.now() + 8 * 60 * 60_000);
  const amount = Number(match[1]);
  const multiplier = { m: 60_000, h: 60 * 60_000, d: 24 * 60 * 60_000 }[match[2].toLowerCase()];
  return new Date(Date.now() + amount * multiplier);
}

async function recordLoginDevice(userId, metadata, req) {
  const deviceId = String(metadata?.deviceId || "").trim().slice(0, 160)
    || crypto.createHash("sha256")
      .update(`${req.get("user-agent") || ""}:${clientIp(req)}`)
      .digest("hex");
  const deviceName = String(metadata?.deviceName || "Nieznane urzadzenie").trim().slice(0, 160);
  const existing = await pool.query(
    "SELECT id FROM login_devices WHERE user_id = $1 AND device_id = $2",
    [userId, deviceId],
  );
  const isNew = !existing.rows[0];
  await pool.query(
    `INSERT INTO login_devices (
       id, user_id, device_id, device_name, ip_address, user_agent
     ) VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT (user_id, device_id) DO UPDATE
       SET device_name = EXCLUDED.device_name,
           ip_address = EXCLUDED.ip_address,
           user_agent = EXCLUDED.user_agent,
           last_seen_at = NOW(),
           login_count = login_devices.login_count + 1`,
    [
      crypto.randomUUID(),
      userId,
      deviceId,
      deviceName || "Nieznane urzadzenie",
      clientIp(req),
      String(req.get("user-agent") || "").slice(0, 1000),
    ],
  );
  return { deviceId, deviceName, isNew };
}

async function listDevices(userId) {
  const result = await pool.query(
    `SELECT id, device_id, device_name, ip_address, first_seen_at, last_seen_at, login_count
       FROM login_devices
      WHERE user_id = $1
      ORDER BY last_seen_at DESC
      LIMIT 40`,
    [userId],
  );
  return result.rows.map((row) => ({
    id: row.id,
    deviceId: row.device_id,
    deviceName: row.device_name,
    ipAddress: row.ip_address || "-",
    firstSeenAt: new Date(row.first_seen_at).toISOString(),
    lastSeenAt: new Date(row.last_seen_at).toISOString(),
    loginCount: Number(row.login_count || 0),
  }));
}

async function createSession(userId, device, req) {
  const id = crypto.randomUUID();
  await pool.query(
    `INSERT INTO user_sessions (
       id, user_id, device_id, device_name, ip_address, user_agent, expires_at
     ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [
      id,
      userId,
      device.deviceId,
      device.deviceName || "Nieznane urzadzenie",
      clientIp(req),
      String(req.get("user-agent") || "").slice(0, 1000),
      sessionExpiry(),
    ],
  );
  return id;
}

async function isSessionActive(sessionId, userId) {
  if (!sessionId) return false;
  const result = await pool.query(
    `UPDATE user_sessions
        SET last_seen_at = NOW()
      WHERE id = $1
        AND user_id = $2
        AND revoked_at IS NULL
        AND expires_at > NOW()
      RETURNING id`,
    [sessionId, userId],
  );
  return Boolean(result.rows[0]);
}

async function listSessions() {
  const result = await pool.query(
    `SELECT s.id, s.user_id, u.username, s.device_id, s.device_name,
            s.ip_address, s.created_at, s.last_seen_at, s.expires_at,
            s.revoked_at, s.revoke_reason
       FROM user_sessions s
       JOIN users u ON u.id = s.user_id
      ORDER BY s.last_seen_at DESC
      LIMIT 250`,
  );
  return result.rows.map((row) => ({
    id: row.id,
    userId: row.user_id,
    nick: row.username,
    deviceId: row.device_id,
    deviceName: row.device_name,
    ipAddress: row.ip_address || "-",
    createdAt: new Date(row.created_at).toISOString(),
    lastSeenAt: new Date(row.last_seen_at).toISOString(),
    expiresAt: new Date(row.expires_at).toISOString(),
    revokedAt: row.revoked_at ? new Date(row.revoked_at).toISOString() : null,
    revokeReason: row.revoke_reason || "",
    active: !row.revoked_at && new Date(row.expires_at).getTime() > Date.now(),
  }));
}

async function revokeSession(sessionId, revokedBy, reason = "Zdalne wylogowanie administratora") {
  const result = await pool.query(
    `UPDATE user_sessions
        SET revoked_at = COALESCE(revoked_at, NOW()),
            revoked_by = COALESCE(revoked_by, $2),
            revoke_reason = COALESCE(revoke_reason, $3)
      WHERE id = $1
      RETURNING id`,
    [sessionId, revokedBy || null, String(reason).slice(0, 240)],
  );
  return Boolean(result.rows[0]);
}

async function getMaintenanceState(queryable = pool) {
  const result = await queryable.query(
    `SELECT data
       FROM sync_records
      WHERE scope = 'shared' AND record_key = 'systemConfig'
      LIMIT 1`,
  );
  const maintenance = result.rows[0]?.data?.maintenance || {};
  return {
    enabled: Boolean(maintenance.enabled),
    message: String(maintenance.message || "Trwaja prace serwisowe ABW."),
    updatedAt: Number(maintenance.updatedAt || 0),
    updatedBy: String(maintenance.updatedBy || ""),
  };
}

async function touchPresence(userId, data = {}) {
  const allowedStatuses = new Set(["online", "misja", "alarm", "poza sluzba"]);
  const status = allowedStatuses.has(data.status) ? data.status : "online";
  const conversationId = data.conversationId || null;
  await pool.query(
    `INSERT INTO user_presence (
       user_id, status, active_conversation_id, typing, updated_at
     ) VALUES ($1, $2, $3, $4, NOW())
     ON CONFLICT (user_id) DO UPDATE
       SET status = EXCLUDED.status,
           active_conversation_id = EXCLUDED.active_conversation_id,
           typing = EXCLUDED.typing,
           updated_at = NOW()`,
    [userId, status, conversationId, Boolean(data.typing)],
  );
}

async function listPresence() {
  const result = await pool.query(
    `SELECT u.id, u.username, u.rank, p.status, p.active_conversation_id,
            p.typing, p.updated_at,
            p.updated_at > NOW() - INTERVAL '35 seconds' AS online
       FROM users u
       LEFT JOIN user_presence p ON p.user_id = u.id
      WHERE u.disabled = FALSE
      ORDER BY LOWER(u.username)`,
  );
  return result.rows.map((row) => ({
    id: row.id,
    nick: row.username,
    rank: row.rank,
    status: row.status || "offline",
    conversationId: row.active_conversation_id,
    typing: Boolean(row.typing && row.online),
    online: Boolean(row.online),
    updatedAt: row.updated_at ? new Date(row.updated_at).toISOString() : null,
  }));
}

module.exports = {
  createSession,
  getMaintenanceState,
  isSessionActive,
  listDevices,
  listPresence,
  listSessions,
  recordLoginDevice,
  revokeSession,
  touchPresence,
};
