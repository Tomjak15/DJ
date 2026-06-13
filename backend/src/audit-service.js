"use strict";

const crypto = require("crypto");
const { config } = require("./config");
const { pool } = require("./db");

const MUTABLE_ADMIN_FIELDS = [
  "printExcluded",
  "printedAt",
  "printBatchId",
  "printedBy",
  "archivedAt",
  "archivedBy",
];

function stableValue(value) {
  if (Array.isArray(value)) return value.map(stableValue);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(
    Object.keys(value)
      .sort()
      .map((key) => [key, stableValue(value[key])]),
  );
}

function coreLog(log) {
  const copy = { ...log };
  MUTABLE_ADMIN_FIELDS.forEach((field) => delete copy[field]);
  delete copy.integrity;
  return stableValue(copy);
}

function logDigest(previousHash, log) {
  return crypto
    .createHmac("sha256", config.jwtSecret)
    .update(`${previousHash}|${JSON.stringify(coreLog(log))}`)
    .digest("hex");
}

function sealLogs(logs) {
  let previousHash = "ABW-AUDIT-GENESIS";
  return (Array.isArray(logs) ? logs : []).map((entry, index) => {
    const log = { ...entry };
    const hash = logDigest(previousHash, log);
    log.integrity = {
      sequence: index + 1,
      previousHash,
      hash,
      algorithm: "HMAC-SHA256",
    };
    previousHash = hash;
    return log;
  });
}

function mergeProtectedLogs(existingLogs, incomingLogs, authUser) {
  const existing = Array.isArray(existingLogs) ? existingLogs : [];
  const incoming = Array.isArray(incomingLogs) ? incomingLogs : [];
  const incomingById = new Map(incoming.filter((log) => log?.id).map((log) => [log.id, log]));
  const existingIds = new Set(existing.map((log) => log?.id));

  const merged = existing.map((stored) => {
    const submitted = incomingById.get(stored.id);
    if (!submitted || authUser.role !== "admin") return { ...stored };
    const next = { ...stored };
    MUTABLE_ADMIN_FIELDS.forEach((field) => {
      if (Object.prototype.hasOwnProperty.call(submitted, field)) next[field] = submitted[field];
    });
    return next;
  });

  incoming.forEach((log) => {
    if (!log?.id || existingIds.has(log.id)) return;
    merged.push({ ...log });
  });

  merged.sort((left, right) => (
    Number(right.time || 0) - Number(left.time || 0)
    || String(right.id).localeCompare(String(left.id))
  ));
  return sealLogs(merged);
}

function verifyLogs(logs) {
  const entries = Array.isArray(logs) ? logs : [];
  let previousHash = "ABW-AUDIT-GENESIS";
  for (let index = 0; index < entries.length; index += 1) {
    const log = entries[index];
    const expected = logDigest(previousHash, log);
    if (
      log.integrity?.sequence !== index + 1
      || log.integrity?.previousHash !== previousHash
      || log.integrity?.hash !== expected
    ) {
      return {
        valid: false,
        count: entries.length,
        brokenAt: index + 1,
        lastHash: previousHash,
      };
    }
    previousHash = expected;
  }
  return {
    valid: true,
    count: entries.length,
    brokenAt: null,
    lastHash: previousHash,
  };
}

async function getAuditIntegrity() {
  const result = await pool.query(
    `SELECT id, data
       FROM sync_records
      WHERE scope = 'shared' AND record_key = 'logs'
      LIMIT 1`,
  );
  const row = result.rows[0];
  const logs = Array.isArray(row?.data) ? row.data : [];
  const legacyChain = logs.length > 0 && logs.every((log) => !log.integrity?.hash);
  if (row && legacyChain) {
    const sealed = sealLogs(logs);
    await pool.query(
      "UPDATE sync_records SET data = $1::JSONB, updated_at = NOW() WHERE id = $2",
      [JSON.stringify(sealed), row.id],
    );
    return verifyLogs(sealed);
  }
  return verifyLogs(logs);
}

module.exports = {
  getAuditIntegrity,
  mergeProtectedLogs,
  sealLogs,
  verifyLogs,
};
