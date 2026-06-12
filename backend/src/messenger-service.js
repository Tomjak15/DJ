"use strict";

const crypto = require("crypto");
const { pool, withTransaction } = require("./db");

const REACTIONS = new Set(["potwierdzam", "ważne", "gotowe", "uwaga"]);
const CLASSIFICATIONS = new Set(["jawne", "poufne", "tajne", "scisle_tajne"]);

async function assertMembership(conversationId, userId) {
  const result = await pool.query(
    `SELECT c.id, c.conversation_type, c.is_active, c.created_by
       FROM conversation_members cm
       JOIN conversations c ON c.id = cm.conversation_id
      WHERE cm.conversation_id = $1 AND cm.user_id = $2`,
    [conversationId, userId],
  );
  if (!result.rows[0]) {
    const error = new Error("Brak dostepu do tej rozmowy");
    error.status = 403;
    throw error;
  }
  return result.rows[0];
}

function channelSlug(value) {
  return String(value || "abw")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 90) || "abw";
}

async function ensureChannel(userId, type, channelKey, name, active = true) {
  return withTransaction(async (client) => {
    const result = await client.query(
      `INSERT INTO conversations (
         id, conversation_type, name, channel_key, is_active, created_by
       ) VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (channel_key) WHERE channel_key IS NOT NULL DO UPDATE
         SET name = EXCLUDED.name,
             is_active = EXCLUDED.is_active,
             updated_at = CASE
               WHEN conversations.is_active IS DISTINCT FROM EXCLUDED.is_active THEN NOW()
               ELSE conversations.updated_at
             END
       RETURNING id`,
      [crypto.randomUUID(), type, name, channelKey, active, userId],
    );
    await client.query(
      `INSERT INTO conversation_members (conversation_id, user_id)
       VALUES ($1, $2)
       ON CONFLICT (conversation_id, user_id) DO NOTHING`,
      [result.rows[0].id, userId],
    );
    return result.rows[0].id;
  });
}

async function ensureSystemChannels(userId) {
  const [userResult, rankResult, eventResult] = await Promise.all([
    pool.query("SELECT rank FROM users WHERE id = $1", [userId]),
    pool.query(
      `SELECT data FROM sync_records
        WHERE scope = 'shared' AND record_key = 'rankConfig'
        LIMIT 1`,
    ),
    pool.query(
      `SELECT data FROM sync_records
        WHERE scope = 'shared' AND record_key = 'events'
        LIMIT 1`,
    ),
  ]);
  const rank = userResult.rows[0]?.rank;
  const rankConfig = rankResult.rows[0]?.data;
  const corps = Array.isArray(rankConfig)
    ? rankConfig.find((group) => (
      Array.isArray(group.ranks) && group.ranks.some((entry) => entry.name === rank)
    ))?.name
    : null;
  const activeEvents = Array.isArray(eventResult.rows[0]?.data) ? eventResult.rows[0].data : [];

  await ensureChannel(userId, "channel", "unit:abw", "Jednostka ABW", true);
  if (corps) {
    const corpsKey = `corps:${channelSlug(corps)}`;
    await pool.query(
      `DELETE FROM conversation_members cm
        USING conversations c
        WHERE cm.conversation_id = c.id
          AND cm.user_id = $1
          AND c.channel_key LIKE 'corps:%'
          AND c.channel_key <> $2`,
      [userId, corpsKey],
    );
    await ensureChannel(userId, "channel", corpsKey, corps, true);
  }
  await ensureChannel(
    userId,
    "alarm",
    "alarm:global",
    "Kanał alarmowy ABW",
    activeEvents.length > 0,
  );
}

async function listConversations(userId) {
  await ensureSystemChannels(userId);
  const conversations = await pool.query(
    `SELECT c.id, c.conversation_type, c.name, c.channel_key, c.is_active,
            c.created_by, c.created_at, c.updated_at, cm.last_read_at
       FROM conversations c
       JOIN conversation_members cm ON cm.conversation_id = c.id
      WHERE cm.user_id = $1
      ORDER BY c.is_active DESC, c.updated_at DESC`,
    [userId],
  );
  if (!conversations.rows.length) return [];

  const ids = conversations.rows.map((row) => row.id);
  const [members, lastMessages, unread] = await Promise.all([
    pool.query(
      `SELECT cm.conversation_id, u.id, u.username, u.rank
         FROM conversation_members cm
         JOIN users u ON u.id = cm.user_id
        WHERE cm.conversation_id = ANY($1::UUID[])
        ORDER BY LOWER(u.username)`,
      [ids],
    ),
    pool.query(
      `SELECT DISTINCT ON (m.conversation_id)
              m.conversation_id, m.id, m.sender_id, u.username AS sender_nick,
              m.body, m.urgent, m.requires_ack, m.attachment_name, m.created_at
         FROM messages m
         JOIN users u ON u.id = m.sender_id
        WHERE m.conversation_id = ANY($1::UUID[])
        ORDER BY m.conversation_id, m.created_at DESC`,
      [ids],
    ),
    pool.query(
      `SELECT cm.conversation_id, COUNT(m.id)::INTEGER AS unread_count
         FROM conversation_members cm
         LEFT JOIN messages m
           ON m.conversation_id = cm.conversation_id
          AND m.sender_id <> cm.user_id
          AND m.created_at > cm.last_read_at
        WHERE cm.user_id = $1
          AND cm.conversation_id = ANY($2::UUID[])
        GROUP BY cm.conversation_id`,
      [userId, ids],
    ),
  ]);

  const memberMap = new Map();
  members.rows.forEach((row) => {
    const list = memberMap.get(row.conversation_id) || [];
    list.push({ id: row.id, nick: row.username, rank: row.rank });
    memberMap.set(row.conversation_id, list);
  });
  const messageMap = new Map(lastMessages.rows.map((row) => [
    row.conversation_id,
    {
      id: row.id,
      senderId: row.sender_id,
      senderNick: row.sender_nick,
      body: row.body,
      urgent: Boolean(row.urgent),
      requiresAck: Boolean(row.requires_ack),
      attachmentName: row.attachment_name,
      createdAt: new Date(row.created_at).toISOString(),
    },
  ]));
  const unreadMap = new Map(unread.rows.map((row) => [row.conversation_id, row.unread_count]));

  return conversations.rows.map((row) => ({
    id: row.id,
    type: row.conversation_type,
    name: row.name,
    channelKey: row.channel_key,
    active: Boolean(row.is_active),
    createdBy: row.created_by,
    createdAt: new Date(row.created_at).toISOString(),
    updatedAt: new Date(row.updated_at).toISOString(),
    members: memberMap.get(row.id) || [],
    lastMessage: messageMap.get(row.id) || null,
    unreadCount: unreadMap.get(row.id) || 0,
  }));
}

async function createDirectConversation(userId, targetUserId) {
  if (!targetUserId || targetUserId === userId) throw new Error("Wybierz innego adresata");
  const target = await pool.query("SELECT id FROM users WHERE id = $1 AND disabled = FALSE", [targetUserId]);
  if (!target.rows[0]) throw new Error("Adresat nie istnieje lub jest zablokowany");

  const existing = await pool.query(
    `SELECT c.id
       FROM conversations c
       JOIN conversation_members mine
         ON mine.conversation_id = c.id AND mine.user_id = $1
       JOIN conversation_members theirs
         ON theirs.conversation_id = c.id AND theirs.user_id = $2
      WHERE c.conversation_type = 'direct'
        AND (SELECT COUNT(*) FROM conversation_members all_members
              WHERE all_members.conversation_id = c.id) = 2
      LIMIT 1`,
    [userId, targetUserId],
  );
  if (existing.rows[0]) return existing.rows[0].id;

  return withTransaction(async (client) => {
    const id = crypto.randomUUID();
    await client.query(
      `INSERT INTO conversations (id, conversation_type, created_by)
       VALUES ($1, 'direct', $2)`,
      [id, userId],
    );
    await client.query(
      `INSERT INTO conversation_members (conversation_id, user_id)
       VALUES ($1, $2), ($1, $3)`,
      [id, userId, targetUserId],
    );
    return id;
  });
}

async function createGroupConversation(userId, name, memberIds) {
  const groupName = String(name || "").trim();
  if (!groupName || groupName.length > 80) throw new Error("Podaj nazwe grupy");
  const uniqueIds = [...new Set([userId, ...(Array.isArray(memberIds) ? memberIds : [])])];
  if (uniqueIds.length < 2) throw new Error("Grupa musi miec co najmniej dwoch czlonkow");

  const users = await pool.query(
    "SELECT id FROM users WHERE id = ANY($1::UUID[]) AND disabled = FALSE",
    [uniqueIds],
  );
  if (users.rows.length !== uniqueIds.length) throw new Error("Jeden z wybranych uzytkownikow jest niedostepny");

  return withTransaction(async (client) => {
    const id = crypto.randomUUID();
    await client.query(
      `INSERT INTO conversations (id, conversation_type, name, created_by)
       VALUES ($1, 'group', $2, $3)`,
      [id, groupName, userId],
    );
    for (const memberId of uniqueIds) {
      await client.query(
        `INSERT INTO conversation_members (conversation_id, user_id)
         VALUES ($1, $2)`,
        [id, memberId],
      );
    }
    return id;
  });
}

function serializeMessage(row) {
  const reactionCounts = row.reactions && typeof row.reactions === "object" ? row.reactions : {};
  return {
    id: row.id,
    conversationId: row.conversation_id,
    senderId: row.sender_id,
    senderNick: row.sender_nick,
    body: row.body,
    replyTo: row.reply_to,
    replyBody: row.reply_body,
    replySenderNick: row.reply_sender_nick,
    urgent: Boolean(row.urgent),
    requiresAck: Boolean(row.requires_ack),
    acknowledged: Boolean(row.acknowledged),
    acknowledgementCount: Number(row.acknowledgement_count || 0),
    acknowledgedBy: Array.isArray(row.acknowledged_by) ? row.acknowledged_by : [],
    pinned: Boolean(row.pinned),
    classification: row.classification || "jawne",
    attachmentName: row.attachment_name,
    attachmentData: row.attachment_data,
    reactions: reactionCounts,
    myReaction: row.my_reaction || "",
    createdAt: new Date(row.created_at).toISOString(),
  };
}

async function getMessages(conversationId, userId) {
  await assertMembership(conversationId, userId);
  const result = await pool.query(
    `SELECT m.id, m.conversation_id, m.sender_id, u.username AS sender_nick,
            m.body, m.reply_to, m.urgent, m.requires_ack, m.pinned,
            m.classification, m.attachment_name, m.attachment_data, m.created_at,
            reply.body AS reply_body, reply_user.username AS reply_sender_nick,
            COALESCE((
              SELECT jsonb_object_agg(grouped.reaction, grouped.count)
                FROM (
                  SELECT reaction, COUNT(*)::INTEGER AS count
                    FROM message_reactions
                   WHERE message_id = m.id
                   GROUP BY reaction
                ) grouped
            ), '{}'::JSONB) AS reactions,
            (SELECT reaction FROM message_reactions
              WHERE message_id = m.id AND user_id = $2) AS my_reaction,
            EXISTS(
              SELECT 1 FROM message_acknowledgements
               WHERE message_id = m.id AND user_id = $2
            ) AS acknowledged,
            (SELECT COUNT(*)::INTEGER FROM message_acknowledgements
              WHERE message_id = m.id) AS acknowledgement_count,
            COALESCE((
              SELECT jsonb_agg(ack_user.username ORDER BY LOWER(ack_user.username))
                FROM message_acknowledgements ack
                JOIN users ack_user ON ack_user.id = ack.user_id
               WHERE ack.message_id = m.id
            ), '[]'::JSONB) AS acknowledged_by
       FROM messages m
       JOIN users u ON u.id = m.sender_id
       LEFT JOIN messages reply ON reply.id = m.reply_to
       LEFT JOIN users reply_user ON reply_user.id = reply.sender_id
      WHERE m.conversation_id = $1
      ORDER BY m.pinned DESC, m.created_at ASC
      LIMIT 300`,
    [conversationId, userId],
  );
  return result.rows.map(serializeMessage);
}

async function sendMessage(conversationId, userId, payload) {
  const data = typeof payload === "object" && payload ? payload : { body: payload };
  const attachmentName = String(data.attachmentName || "").trim().slice(0, 180) || null;
  const attachmentData = String(data.attachmentData || "");
  if (attachmentData.length > 1_400_000) throw new Error("Zalacznik moze miec maksymalnie 1 MB");
  const message = String(data.body || "").trim() || (attachmentName ? `[ZAŁĄCZNIK] ${attachmentName}` : "");
  if (!message || message.length > 4000) throw new Error("Wiadomosc musi miec od 1 do 4000 znakow");
  const conversation = await assertMembership(conversationId, userId);
  if (!conversation.is_active && conversation.conversation_type === "alarm") {
    throw new Error("Kanal alarmowy jest dostepny tylko podczas aktywnego zdarzenia");
  }
  const classification = CLASSIFICATIONS.has(data.classification)
    ? data.classification
    : "jawne";
  if (data.replyTo) {
    const reply = await pool.query(
      "SELECT id FROM messages WHERE id = $1 AND conversation_id = $2",
      [data.replyTo, conversationId],
    );
    if (!reply.rows[0]) throw new Error("Oryginalna wiadomosc nie istnieje");
  }

  const result = await withTransaction(async (client) => {
    const inserted = await client.query(
      `INSERT INTO messages (
         id, conversation_id, sender_id, body, reply_to, urgent, requires_ack,
         classification, attachment_name, attachment_data
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
       RETURNING *`,
      [
        crypto.randomUUID(),
        conversationId,
        userId,
        message,
        data.replyTo || null,
        Boolean(data.urgent),
        Boolean(data.requiresAck),
        classification,
        attachmentName,
        attachmentData || null,
      ],
    );
    await client.query("UPDATE conversations SET updated_at = NOW() WHERE id = $1", [conversationId]);
    await client.query(
      `UPDATE conversation_members SET last_read_at = NOW()
        WHERE conversation_id = $1 AND user_id = $2`,
      [conversationId, userId],
    );
    return inserted.rows[0];
  });
  return {
    id: result.id,
    conversationId: result.conversation_id,
    senderId: result.sender_id,
    body: result.body,
    createdAt: new Date(result.created_at).toISOString(),
  };
}

async function markConversationRead(conversationId, userId) {
  await assertMembership(conversationId, userId);
  await pool.query(
    `UPDATE conversation_members SET last_read_at = NOW()
      WHERE conversation_id = $1 AND user_id = $2`,
    [conversationId, userId],
  );
}

async function reactToMessage(conversationId, messageId, userId, reaction) {
  await assertMembership(conversationId, userId);
  if (!REACTIONS.has(reaction)) throw new Error("Nieobslugiwana reakcja");
  const message = await pool.query(
    "SELECT id FROM messages WHERE id = $1 AND conversation_id = $2",
    [messageId, conversationId],
  );
  if (!message.rows[0]) throw new Error("Nie znaleziono wiadomosci");
  const current = await pool.query(
    "SELECT reaction FROM message_reactions WHERE message_id = $1 AND user_id = $2",
    [messageId, userId],
  );
  if (current.rows[0]?.reaction === reaction) {
    await pool.query(
      "DELETE FROM message_reactions WHERE message_id = $1 AND user_id = $2",
      [messageId, userId],
    );
    return;
  }
  await pool.query(
    `INSERT INTO message_reactions (message_id, user_id, reaction)
     VALUES ($1, $2, $3)
     ON CONFLICT (message_id, user_id) DO UPDATE
       SET reaction = EXCLUDED.reaction, created_at = NOW()`,
    [messageId, userId, reaction],
  );
}

async function acknowledgeMessage(conversationId, messageId, userId) {
  await assertMembership(conversationId, userId);
  const message = await pool.query(
    "SELECT id FROM messages WHERE id = $1 AND conversation_id = $2 AND requires_ack = TRUE",
    [messageId, conversationId],
  );
  if (!message.rows[0]) throw new Error("Ta wiadomosc nie wymaga potwierdzenia");
  await pool.query(
    `INSERT INTO message_acknowledgements (message_id, user_id)
     VALUES ($1, $2)
     ON CONFLICT (message_id, user_id) DO NOTHING`,
    [messageId, userId],
  );
}

async function setMessagePinned(conversationId, messageId, userId, pinned) {
  await assertMembership(conversationId, userId);
  const result = await pool.query(
    `UPDATE messages SET pinned = $1
      WHERE id = $2 AND conversation_id = $3
      RETURNING id`,
    [Boolean(pinned), messageId, conversationId],
  );
  if (!result.rows[0]) throw new Error("Nie znaleziono wiadomosci");
}

async function deleteMessage(conversationId, messageId, user) {
  await assertMembership(conversationId, user.id);
  const message = await pool.query(
    `SELECT id, sender_id
       FROM messages
      WHERE id = $1 AND conversation_id = $2`,
    [messageId, conversationId],
  );
  const row = message.rows[0];
  if (!row) throw new Error("Nie znaleziono wiadomosci");
  if (row.sender_id !== user.id && user.role !== "admin") {
    const error = new Error("Mozesz usunac tylko wlasna wiadomosc");
    error.status = 403;
    throw error;
  }
  await withTransaction(async (client) => {
    await client.query(
      "UPDATE messages SET reply_to = NULL WHERE reply_to = $1",
      [messageId],
    );
    await client.query(
      "DELETE FROM messages WHERE id = $1 AND conversation_id = $2",
      [messageId, conversationId],
    );
    await client.query(
      "UPDATE conversations SET updated_at = NOW() WHERE id = $1",
      [conversationId],
    );
  });
}

async function searchMessages(userId, query) {
  const phrase = String(query || "").trim();
  if (phrase.length < 2) return [];
  const result = await pool.query(
    `SELECT m.id, m.conversation_id, m.sender_id, u.username AS sender_nick,
            m.body, m.attachment_name, m.urgent, m.created_at,
            c.conversation_type, c.name
       FROM messages m
       JOIN conversations c ON c.id = m.conversation_id
       JOIN conversation_members cm
         ON cm.conversation_id = c.id AND cm.user_id = $1
       JOIN users u ON u.id = m.sender_id
      WHERE m.body ILIKE $2
         OR COALESCE(m.attachment_name, '') ILIKE $2
         OR COALESCE(c.name, '') ILIKE $2
      ORDER BY m.created_at DESC
      LIMIT 100`,
    [userId, `%${phrase}%`],
  );
  return result.rows.map((row) => ({
    id: row.id,
    conversationId: row.conversation_id,
    senderId: row.sender_id,
    senderNick: row.sender_nick,
    body: row.body,
    attachmentName: row.attachment_name,
    urgent: Boolean(row.urgent),
    conversationType: row.conversation_type,
    conversationName: row.name,
    createdAt: new Date(row.created_at).toISOString(),
  }));
}

module.exports = {
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
};
