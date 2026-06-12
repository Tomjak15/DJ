"use strict";

const { withTransaction } = require("./db");
const { hasVersionConflict } = require("./versioning");
const {
  canReadSharedRecord,
  getUserManagementPermissions,
  isAllowedMissionProgressUpdate,
} = require("./permissions");

const STRICT_ADMIN_SHARED_KEYS = new Set([
  "rankConfig",
  "categoryActivity",
  "trash",
  "documents",
]);

const MANAGED_SHARED_KEY_CATEGORIES = {
  announcements: "announcements",
  info: "info",
  products: "shop",
  mapObjects: "map",
  events: "events",
  calendarEvents: "calendar",
  leaveRequests: "calendar",
  temporaryPasses: "personnel",
  equipmentAssets: "logistics",
  vehicles: "logistics",
};

const ALLOWED_SHARED_KEYS = new Set([
  ...STRICT_ADMIN_SHARED_KEYS,
  ...Object.keys(MANAGED_SHARED_KEY_CATEGORIES),
  "missions",
  "logs",
  "trash",
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

const SHARED_KEY_CATEGORIES = {
  announcements: "announcements",
  info: "info",
  products: "shop",
  mapObjects: "map",
  missions: "missions",
  events: "events",
  calendarEvents: "calendar",
  leaveRequests: "calendar",
  temporaryPasses: "personnel",
  equipmentAssets: "logistics",
  vehicles: "logistics",
};

function serializeRecord(row) {
  return {
    key: row.record_key,
    scope: row.scope,
    owner_user_id: row.owner_user_id,
    data: row.data,
    updated_at: new Date(row.updated_at).toISOString(),
  };
}

function normalizeIncomingRecord(record, authUser, managementPermissions) {
  const scope = record.scope === "shared" ? "shared" : "private";
  const key = String(record.key || "").trim();
  if (!key) throw new Error("Rekord synchronizacji nie ma klucza");

  if (scope === "shared") {
    if (!ALLOWED_SHARED_KEYS.has(key)) throw new Error(`Niedozwolony klucz wspolny: ${key}`);
    if (STRICT_ADMIN_SHARED_KEYS.has(key) && authUser.role !== "admin") {
      throw new Error(`Brak uprawnien do zapisu: ${key}`);
    }
    const category = MANAGED_SHARED_KEY_CATEGORIES[key];
    if (category && authUser.role !== "admin" && managementPermissions[category] !== true) {
      throw new Error(`Brak uprawnien do zarzadzania: ${category}`);
    }
    return { scope, key, ownerUserId: null, data: record.data, updatedAt: record.updated_at || null };
  }

  if (!ALLOWED_PRIVATE_KEYS.has(key)) throw new Error(`Niedozwolony klucz prywatny: ${key}`);
  const requestedOwner = record.owner_user_id || authUser.id;
  const canManageNotes = key === "notes" && managementPermissions.notes === true;
  if (requestedOwner !== authUser.id && authUser.role !== "admin" && !canManageNotes) {
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
  const managementPermissions = await getUserManagementPermissions(queryable, authUser);
  const result = await queryable.query(
    `SELECT scope, record_key, owner_user_id, data, updated_at
       FROM sync_records
      WHERE (scope = 'shared' AND ($2 = 'admin' OR record_key <> 'documents'))
         OR owner_user_id = $1
         OR $2 = 'admin'
         OR ($3::BOOLEAN AND scope = 'private' AND record_key = 'notes')
      ORDER BY updated_at ASC`,
    [authUser.id, authUser.role, managementPermissions.notes === true],
  );
  return result.rows
    .filter((row) => canReadSharedRecord(authUser, row.record_key))
    .map(serializeRecord);
}

async function saveSyncRecords(records, authUser) {
  if (!Array.isArray(records)) throw new Error("Pole records musi byc tablica");
  if (records.length > 50) throw new Error("Jedna paczka moze zawierac maksymalnie 50 rekordow");

  return withTransaction(async (client) => {
    const managementPermissions = await getUserManagementPermissions(client, authUser);
    const accepted = [];
    const conflicts = [];

    for (const rawRecord of records) {
      const record = normalizeIncomingRecord(rawRecord, authUser, managementPermissions);
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
      if (
        record.key === "missions"
        && authUser.role !== "admin"
        && managementPermissions.missions !== true
        && !isAllowedMissionProgressUpdate(existing?.data, record.data, authUser.id)
      ) {
        throw new Error("Brak uprawnien do tworzenia lub edycji misji");
      }

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
        await updateCategoryActivity(client, record, authUser);
        continue;
      }

      const inserted = await client.query(
        `INSERT INTO sync_records (scope, record_key, owner_user_id, data)
         VALUES ($1, $2, $3, $4::JSONB)
         RETURNING scope, record_key, owner_user_id, data, updated_at`,
        [record.scope, record.key, record.ownerUserId, JSON.stringify(record.data ?? null)],
      );
      accepted.push(serializeRecord(inserted.rows[0]));
      await updateCategoryActivity(client, record, authUser);
    }

    return { accepted, conflicts };
  });
}

async function updateCategoryActivity(client, record, authUser) {
  if (authUser.role === "admin" || record.scope !== "shared") return;
  const category = SHARED_KEY_CATEGORIES[record.key];
  if (!category) return;
  await client.query(
    "SELECT pg_advisory_xact_lock(hashtext('shared:shared:categoryActivity'))",
  );
  const result = await client.query(
    `SELECT id, data
       FROM sync_records
      WHERE scope = 'shared' AND record_key = 'categoryActivity'
      FOR UPDATE`,
  );
  const activity = result.rows[0]?.data && typeof result.rows[0].data === "object"
    ? result.rows[0].data
    : {};
  const current = activity[category] || {};
  activity[category] = {
    sequence: Number(current.sequence || 0) + 1,
    updatedAt: Date.now(),
  };
  if (result.rows[0]) {
    await client.query(
      "UPDATE sync_records SET data = $1::JSONB, updated_at = NOW() WHERE id = $2",
      [JSON.stringify(activity), result.rows[0].id],
    );
  } else {
    await client.query(
      `INSERT INTO sync_records (scope, record_key, owner_user_id, data)
       VALUES ('shared', 'categoryActivity', NULL, $1::JSONB)`,
      [JSON.stringify(activity)],
    );
  }
}

module.exports = {
  getSyncRecords,
  saveSyncRecords,
  serializeRecord,
};
