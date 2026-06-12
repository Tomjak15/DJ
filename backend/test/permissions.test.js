"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const {
  canReadSharedRecord,
  isAllowedMissionProgressUpdate,
  rankManagementPermissions,
} = require("../src/permissions");

test("uprawnienia zarzadzania sa domyslnie wylaczone", () => {
  const permissions = rankManagementPermissions([], "Rekrut");
  assert.equal(permissions.announcements, false);
  assert.equal(permissions.messenger, false);
});

test("ranga otrzymuje tylko jawnie wlaczone uprawnienia", () => {
  const rankConfig = [{
    name: "Korpus",
    ranks: [{
      name: "Kadet",
      managePermissions: {
        announcements: true,
        events: false,
      },
    }],
  }];
  const permissions = rankManagementPermissions(rankConfig, "Kadet");
  assert.equal(permissions.announcements, true);
  assert.equal(permissions.events, false);
  assert.equal(permissions.shop, false);
});

test("drukowanie dokumentow nie jest uprawnieniem rangi", () => {
  const permissions = rankManagementPermissions([{
    name: "Korpus",
    ranks: [{
      name: "Oficer",
      managePermissions: { documents: true },
    }],
  }], "Oficer");
  assert.equal(permissions.documents, undefined);
});

test("rekord dokumentow jest widoczny tylko dla administratora", () => {
  assert.equal(canReadSharedRecord({ role: "agent" }, "documents"), false);
  assert.equal(canReadSharedRecord({ role: "admin" }, "documents"), true);
  assert.equal(canReadSharedRecord({ role: "agent" }, "products"), true);
});

test("agent moze zmienic status przypisanej misji", () => {
  const existing = [{
    id: "mission-1",
    title: "Test",
    assignedTo: ["user-1"],
    status: "aktywna",
    rewardedUsers: [],
  }];
  const incoming = [{
    ...existing[0],
    status: "w trakcie",
  }];
  assert.equal(isAllowedMissionProgressUpdate(existing, incoming, "user-1"), true);
});

test("agent moze dopisac wpis do osi czasu przypisanej misji", () => {
  const existing = [{
    id: "mission-1",
    title: "Test",
    assignedTo: ["user-1"],
    status: "aktywna",
    rewardedUsers: [],
    timeline: [{ action: "Utworzono", time: 1, by: "admin" }],
  }];
  const incoming = [{
    ...existing[0],
    status: "w trakcie",
    timeline: [
      ...existing[0].timeline,
      { action: "Rozpoczęto", time: 2, by: "agent" },
    ],
  }];
  assert.equal(isAllowedMissionProgressUpdate(existing, incoming, "user-1"), true);
});

test("agent nie moze zmienic starego wpisu osi czasu", () => {
  const existing = [{
    id: "mission-1",
    title: "Test",
    assignedTo: ["user-1"],
    status: "aktywna",
    rewardedUsers: [],
    timeline: [{ action: "Utworzono", time: 1, by: "admin" }],
  }];
  const incoming = [{
    ...existing[0],
    timeline: [{ action: "Podmieniono", time: 1, by: "agent" }],
  }];
  assert.equal(isAllowedMissionProgressUpdate(existing, incoming, "user-1"), false);
});

test("agent bez uprawnienia nie moze tworzyc misji", () => {
  assert.equal(
    isAllowedMissionProgressUpdate([], [{ id: "mission-new" }], "user-1"),
    false,
  );
});

test("przypisany agent moze dodac wlasny raport koncowy", () => {
  const existing = [{
    id: "mission-1",
    title: "Test",
    assignedTo: ["user-1"],
    status: "w trakcie",
    rewardedUsers: [],
    reports: [],
  }];
  const incoming = [{
    ...existing[0],
    status: "wykonana",
    rewardedUsers: ["user-1"],
    completedAt: 123,
    reports: [{
      id: "report-1",
      userId: "user-1",
      result: "Cel wykonany",
    }],
  }];
  assert.equal(isAllowedMissionProgressUpdate(existing, incoming, "user-1"), true);
});

test("agent nie moze dodac raportu w imieniu innej osoby", () => {
  const existing = [{
    id: "mission-1",
    title: "Test",
    assignedTo: ["user-1"],
    status: "w trakcie",
    rewardedUsers: [],
    reports: [],
  }];
  const incoming = [{
    ...existing[0],
    reports: [{ id: "report-2", userId: "user-2" }],
  }];
  assert.equal(isAllowedMissionProgressUpdate(existing, incoming, "user-1"), false);
});
