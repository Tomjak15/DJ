"use strict";

const { withTransaction } = require("./db");
const { hasVersionConflict } = require("./versioning");

// Te obszary sa wspolne dla calej jednostki ABW. Interfejs pozwala je
// edytowac administratorowi, a serwer dodatkowo egzekwuje to uprawnienie.
const ADMIN_ONLY_SHARED_KEYS = new Set([
  "announcements",
  "info",
  "products",
  "mapObjects",
  "events",
]);

const ALLOWED_SHARED_KEYS = new Set([
  ...ADMIN_ONLY_SHARED_KEYS,
  "missions",
  "logs",
]);

const ALLOWED_PRIVATE_KEYS = new Set([
  "notes",
  "cart",
  "orders",
  "settings",
  "files",
  "configuration",
  "profile",
]);

function serializeRecord(row) {
  return {
    key: row.record_key,
    scope: row.scope,
    owner_user_id: row.owner_user_id,
    data: row.data,
    updated_at: new Date(row.updated_at).toISOString(),
  };
}

function normalizeIncomingRecord(record, authUser) {
  const scope = record.scope === "shared" ? "shared" : "private";
  const key = String(record.key || "").trim();
  if (!key) throw new Error("Rekord synchronizacji nie ma klucza");

  if (scope === "shared") {
    if (!ALLOWED_SHARED_KEYS.has(key)) throw new Error(`Niedozwolony klucz wspolny: ${key}`);
    if (ADMIN_ONLY_SHARED_KEYS.has(key) && authUser.role !== "admin") {
      throw new Error(`Brak uprawnien do zapisu: ${key}`);
    }
    return { scope, key, ownerUserId: null, data: record.data, updatedAt: record.updated_at || null };
  }

  if (!ALLOWED_PRIVATE_KEYS.has(key)) throw new Error(`Niedozwolony klucz prywatny: ${key}`);
  const requestedOwner = record.owner_user_id || authUser.id;
  if (requestedOwner !== authUser.id && authUser.role !== "admin") {
    throw new Error("Nie mozna zapisac danych innego uzytkownika");
  }
  return {
    scope,
    key,
    ownerUserId: requestedOwner,
    data: record.data,
    updatedAt: record.updated_at || null,
  };
}

async function getSyncRecords(queryable, authUser) {
  const result = await queryable.query(
    `SELECT scope, record_key, owner_user_id, data, updated_at
       FROM sync_records
      WHERE scope = 'shared'
         OR owner_user_id = $1
         OR $2 = 'admin'
      ORDER BY updated_at ASC`,
    [authUser.id, authUser.role],
  );
  return result.rows.map(serializeRecord);
}

async function saveSyncRecords(records, authUser) {
  if (!Array.isArray(records)) throw new Error("Pole records musi byc tablica");
  if (records.length > 50) throw new Error("Jedna paczka moze zawierac maksymalnie 50 rekordow");

  return withTransaction(async (client) => {
    const accepted = [];
    const conflicts = [];

    for (const rawRecord of records) {
      const record = normalizeIncomingRecord(rawRecord, authUser);
      const lockIdentity = `${record.scope}:${record.ownerUserId || "shared"}:${record.key}`;

      // Blokada doradcza obejmuje takze pierwszy INSERT, kiedy rekord jeszcze
      // nie istnieje i SELECT ... FOR UPDATE nie mialby czego zablokowac.
      await client.query("SELECT pg_advisory_xact_lock(hashtext($1))", [lockIdentity]);
      const existingResult = await client.query(
        `SELECT id, scope, record_key, owner_user_id, data, updated_at
           FROM sync_records
          WHERE scope = $1
            AND record_key = $2
            AND COALESCE(owner_user_id, '00000000-0000-0000-0000-000000000000'::UUID)
              = COALESCE($3::UUID, '00000000-0000-0000-0000-000000000000'::UUID)
          FOR UPDATE`,
        [record.scope, record.key, record.ownerUserId],
      );
      const existing = existingResult.rows[0];

      // updated_at otrzymany od klienta oznacza wersje, na ktorej bazowala
      // zmiana. Jesli serwer ma juz nowsza wersje, zwracamy konflikt i niczego
      // nie nadpisujemy.
      if (existing) {
        if (hasVersionConflict(record.updatedAt, existing.updated_at)) {
          conflicts.push(serializeRecord(existing));
          continue;
        }

        const updated = await client.query(
          `UPDATE sync_records
              SET data = $1::JSONB, updated_at = NOW()
            WHERE id = $2
          RETURNING scope, record_key, owner_user_id, data, updated_at`,
          [JSON.stringify(record.data ?? null), existing.id],
        );
        accepted.push(serializeRecord(updated.rows[0]));
        continue;
      }

      const inserted = await client.query(
        `INSERT INTO sync_records (scope, record_key, owner_user_id, data)
         VALUES ($1, $2, $3, $4::JSONB)
         RETURNING scope, record_key, owner_user_id, data, updated_at`,
        [record.scope, record.key, record.ownerUserId, JSON.stringify(record.data ?? null)],
      );
      accepted.push(serializeRecord(inserted.rows[0]));
    }

    return { accepted, conflicts };
  });
}

module.exports = {
  getSyncRecords,
  saveSyncRecords,
  serializeRecord,
};
