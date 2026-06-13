"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const {
  mergeProtectedLogs,
  sealLogs,
  verifyLogs,
} = require("../src/audit-service");

const admin = { id: "admin", role: "admin" };
const agent = { id: "agent", role: "agent" };

function sampleLog(id, action, time) {
  return {
    id,
    action,
    detail: "szczegoly",
    nick: "Tomek",
    time,
    category: "system",
  };
}

test("poprawnie podpisany lancuch logow przechodzi weryfikacje", () => {
  const logs = sealLogs([
    sampleLog("one", "logowanie", 1),
    sampleLog("two", "synchronizacja", 2),
  ]);
  assert.equal(verifyLogs(logs).valid, true);
});

test("zmiana tresci starego logu jest wykrywana", () => {
  const logs = sealLogs([sampleLog("one", "logowanie", 1)]);
  logs[0].detail = "podmieniona tresc";
  assert.equal(verifyLogs(logs).valid, false);
});

test("agent nie moze zmienic ani usunac starego logu", () => {
  const existing = sealLogs([sampleLog("one", "logowanie", 1)]);
  const merged = mergeProtectedLogs(existing, [{
    ...existing[0],
    action: "podmieniono",
    printExcluded: true,
  }], agent);
  assert.equal(merged.length, 1);
  assert.equal(merged[0].action, "logowanie");
  assert.equal(merged[0].printExcluded, undefined);
  assert.equal(verifyLogs(merged).valid, true);
});

test("administrator moze zmienic tylko pola wydruku i archiwizacji", () => {
  const existing = sealLogs([sampleLog("one", "logowanie", 1)]);
  const merged = mergeProtectedLogs(existing, [{
    ...existing[0],
    action: "podmieniono",
    printedAt: 123,
    archivedAt: 456,
  }], admin);
  assert.equal(merged[0].action, "logowanie");
  assert.equal(merged[0].printedAt, 123);
  assert.equal(merged[0].archivedAt, 456);
  assert.equal(verifyLogs(merged).valid, true);
});
