"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { hasVersionConflict } = require("../src/versioning");

test("nowy rekord bez wersji nie tworzy konfliktu", () => {
  assert.equal(hasVersionConflict(null, null), false);
});

test("brak wersji klienta jest konfliktem dla istniejacego rekordu", () => {
  assert.equal(hasVersionConflict(null, "2026-06-09T20:00:00.000Z"), true);
});

test("zgodne updated_at pozwala zapisac zmiane", () => {
  const timestamp = "2026-06-09T20:00:00.000Z";
  assert.equal(hasVersionConflict(timestamp, timestamp), false);
});

test("starsze updated_at nie nadpisuje nowszej wersji", () => {
  assert.equal(
    hasVersionConflict("2026-06-09T19:59:59.000Z", "2026-06-09T20:00:00.000Z"),
    true,
  );
});
