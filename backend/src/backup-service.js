"use strict";

const crypto = require("crypto");
const { pool, withTransaction } = require("./db");

async function buildSnapshot(queryable = pool) {
  const [records, conversations, members, messages, reactions, acknowledgements] = await Promise.all([
    queryable.query("SELECT scope, record_key, owner_user_id, data, created_at, updated_at FROM sync_records"),
    queryable.query("SELECT * FROM conversations"),
    queryable.query("SELECT * FROM conversation_members"),
    queryable.query("SELECT * FROM messages"),
    queryable.query("SELECT * FROM message_reactions"),
    queryable.query("SELECT * FROM message_acknowledgements"),
  ]);
  return {
    version: 1,
    createdAt: new Date().toISOString(),
    syncRecords: records.rows,
    conversations: conversations.rows,
    conversationMembers: members.rows,
    messages: messages.rows,
    messageReactions: reactions.rows,
    messageAcknowledgements: acknowledgements.rows,
  };
}

async function createBackup(createdBy, type = "manual", label = "") {
  const snapshot = await buildSnapshot();
  const id = crypto.randomUUID();
  const safeType = type === "auto" ? "auto" : "manual";
  const safeLabel = String(label || (safeType === "auto" ? "Automatyczna kopia ABW" : "Ręczna kopia ABW"))
    .trim()
    .slice(0, 160);
  await pool.query(
    `INSERT INTO database_backups (id, created_by, backup_type, label, snapshot)
     VALUES ($1, $2, $3, $4, $5::JSONB)`,
    [id, createdBy || null, safeType, safeLabel, JSON.stringify(snapshot)],
  );
  await pool.query(
    `DELETE FROM database_backups
      WHERE id IN (
        SELECT id FROM database_backups
         ORDER BY created_at DESC
         OFFSET 20
      )`,
  );
  return id;
}

async function ensureAutomaticBackup() {
  const latest = await pool.query(
    `SELECT created_at FROM database_backups
      WHERE backup_type = 'auto'
      ORDER BY created_at DESC
      LIMIT 1`,
  );
  if (
    latest.rows[0]
    && new Date(latest.rows[0].created_at).getTime() > Date.now() - 24 * 60 * 60 * 1000
  ) return null;
  return createBackup(null, "auto");
}

async function listBackups() {
  const result = await pool.query(
    `SELECT b.id, b.backup_type, b.label, b.created_at, u.username AS created_by_nick,
            pg_column_size(b.snapshot)::INTEGER AS size_bytes
       FROM database_backups b
       LEFT JOIN users u ON u.id = b.created_by
      ORDER BY b.created_at DESC
      LIMIT 20`,
  );
  return result.rows.map((row) => ({
    id: row.id,
    type: row.backup_type,
    label: row.label,
    createdBy: row.created_by_nick || "system",
    createdAt: new Date(row.created_at).toISOString(),
    sizeBytes: Number(row.size_bytes || 0),
  }));
}

async function restoreBackup(id) {
  return withTransaction(async (client) => {
    const result = await client.query(
      "SELECT snapshot FROM database_backups WHERE id = $1 FOR UPDATE",
      [id],
    );
    const snapshot = result.rows[0]?.snapshot;
    if (!snapshot) {
      const error = new Error("Nie znaleziono kopii zapasowej");
      error.status = 404;
      throw error;
    }

    await client.query("DELETE FROM message_acknowledgements");
    await client.query("DELETE FROM message_reactions");
    await client.query("DELETE FROM messages");
    await client.query("DELETE FROM conversation_members");
    await client.query("DELETE FROM conversations");
    await client.query("DELETE FROM sync_records");

    for (const row of snapshot.syncRecords || []) {
      await client.query(
        `INSERT INTO sync_records (
           scope, record_key, owner_user_id, data, created_at, updated_at
         ) VALUES ($1, $2, $3, $4::JSONB, $5, $6)`,
        [row.scope, row.record_key, row.owner_user_id, JSON.stringify(row.data), row.created_at, row.updated_at],
      );
    }
    for (const row of snapshot.conversations || []) {
      await client.query(
        `INSERT INTO conversations (
           id, conversation_type, name, channel_key, is_active, created_by, created_at, updated_at
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          row.id,
          row.conversation_type,
          row.name,
          row.channel_key,
          row.is_active !== false,
          row.created_by,
          row.created_at,
          row.updated_at,
        ],
      );
    }
    for (const row of snapshot.conversationMembers || []) {
      await client.query(
        `INSERT INTO conversation_members (
           conversation_id, user_id, joined_at, last_read_at
         ) VALUES ($1, $2, $3, $4)`,
        [row.conversation_id, row.user_id, row.joined_at, row.last_read_at],
      );
    }
    for (const row of snapshot.messages || []) {
      await client.query(
        `INSERT INTO messages (
           id, conversation_id, sender_id, body, reply_to, urgent, requires_ack,
           pinned, classification, attachment_name, attachment_data, created_at
         ) VALUES ($1,$2,$3,$4,NULL,$5,$6,$7,$8,$9,$10,$11)`,
        [
          row.id,
          row.conversation_id,
          row.sender_id,
          row.body,
          Boolean(row.urgent),
          Boolean(row.requires_ack),
          Boolean(row.pinned),
          row.classification || "jawne",
          row.attachment_name,
          row.attachment_data,
          row.created_at,
        ],
      );
    }
    for (const row of snapshot.messages || []) {
      if (row.reply_to) {
        await client.query(
          "UPDATE messages SET reply_to = $1 WHERE id = $2",
          [row.reply_to, row.id],
        );
      }
    }
    for (const row of snapshot.messageReactions || []) {
      await client.query(
        `INSERT INTO message_reactions (message_id, user_id, reaction, created_at)
         VALUES ($1, $2, $3, $4)`,
        [row.message_id, row.user_id, row.reaction, row.created_at],
      );
    }
    for (const row of snapshot.messageAcknowledgements || []) {
      await client.query(
        `INSERT INTO message_acknowledgements (message_id, user_id, acknowledged_at)
         VALUES ($1, $2, $3)`,
        [row.message_id, row.user_id, row.acknowledged_at],
      );
    }
    return true;
  });
}

async function systemStatus() {
  const started = Date.now();
  const [users, records, messages, conversations, presence, backup] = await Promise.all([
    pool.query("SELECT COUNT(*)::INTEGER AS count FROM users"),
    pool.query("SELECT COUNT(*)::INTEGER AS count FROM sync_records"),
    pool.query("SELECT COUNT(*)::INTEGER AS count FROM messages"),
    pool.query("SELECT COUNT(*)::INTEGER AS count FROM conversations"),
    pool.query("SELECT COUNT(*)::INTEGER AS count FROM user_presence WHERE updated_at > NOW() - INTERVAL '35 seconds'"),
    pool.query("SELECT created_at FROM database_backups ORDER BY created_at DESC LIMIT 1"),
  ]);
  return {
    ok: true,
    database: "online",
    latencyMs: Date.now() - started,
    uptimeSeconds: Math.round(process.uptime()),
    users: users.rows[0].count,
    syncRecords: records.rows[0].count,
    messages: messages.rows[0].count,
    conversations: conversations.rows[0].count,
    onlineUsers: presence.rows[0].count,
    lastBackupAt: backup.rows[0]?.created_at
      ? new Date(backup.rows[0].created_at).toISOString()
      : null,
    serverTime: new Date().toISOString(),
  };
}

module.exports = {
  createBackup,
  ensureAutomaticBackup,
  listBackups,
  restoreBackup,
  systemStatus,
};
