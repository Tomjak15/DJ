"use strict";

const MANAGEMENT_CATEGORIES = [
  "announcements",
  "info",
  "shop",
  "notes",
  "map",
  "missions",
  "events",
  "messenger",
  "calendar",
  "personnel",
  "logistics",
];

function rankManagementPermissions(rankConfig, rankName) {
  const rank = Array.isArray(rankConfig)
    ? rankConfig
      .flatMap((group) => group.ranks || [])
      .find((entry) => entry.name === rankName)
    : null;
  return Object.fromEntries(
    MANAGEMENT_CATEGORIES.map((category) => [
      category,
      rank?.managePermissions?.[category] === true,
    ]),
  );
}

function canReadSharedRecord(authUser, recordKey) {
  return recordKey !== "documents" || authUser?.role === "admin";
}

function isAllowedMissionProgressUpdate(existingMissions, incomingMissions, userId) {
  if (!Array.isArray(existingMissions) || !Array.isArray(incomingMissions)) return false;
  if (existingMissions.length !== incomingMissions.length) return false;
  const incomingById = new Map(incomingMissions.map((mission) => [mission.id, mission]));
  if (incomingById.size !== incomingMissions.length) return false;
  const validStatuses = new Set(["aktywna", "w trakcie", "wykonana", "nieudana"]);

  return existingMissions.every((current) => {
    const incoming = incomingById.get(current.id);
    if (!incoming) return false;
    const assigned = Array.isArray(current.assignedTo) && current.assignedTo.includes(userId);
    if (!assigned) return JSON.stringify(incoming) === JSON.stringify(current);

    const currentStable = { ...current };
    const incomingStable = { ...incoming };
    delete currentStable.status;
    delete currentStable.rewardedUsers;
    delete currentStable.reports;
    delete currentStable.completedAt;
    delete currentStable.timeline;
    delete incomingStable.status;
    delete incomingStable.rewardedUsers;
    delete incomingStable.reports;
    delete incomingStable.completedAt;
    delete incomingStable.timeline;
    if (JSON.stringify(incomingStable) !== JSON.stringify(currentStable)) return false;
    if (!validStatuses.has(incoming.status)) return false;

    const previousRewards = new Set(current.rewardedUsers || []);
    const incomingRewards = new Set(incoming.rewardedUsers || []);
    if ([...previousRewards].some((id) => !incomingRewards.has(id))) return false;
    if (![...incomingRewards].every((id) => previousRewards.has(id) || id === userId)) return false;

    const previousTimeline = Array.isArray(current.timeline) ? current.timeline : [];
    const incomingTimeline = Array.isArray(incoming.timeline) ? incoming.timeline : [];
    if (incomingTimeline.length < previousTimeline.length) return false;
    if (!previousTimeline.every((entry, index) => (
      JSON.stringify(entry) === JSON.stringify(incomingTimeline[index])
    ))) return false;

    const previousReports = Array.isArray(current.reports) ? current.reports : [];
    const incomingReports = Array.isArray(incoming.reports) ? incoming.reports : [];
    const previousById = new Map(previousReports.map((report) => [report.id, report]));
    for (const report of incomingReports) {
      const previous = previousById.get(report.id);
      if (previous && JSON.stringify(previous) !== JSON.stringify(report)) return false;
      if (!previous && report.userId !== userId) return false;
    }
    return previousReports.every((report) => (
      incomingReports.some((incomingReport) => (
        incomingReport.id === report.id
        && JSON.stringify(incomingReport) === JSON.stringify(report)
      ))
    ));
  });
}

async function getUserManagementPermissions(queryable, authUser) {
  if (authUser.role === "admin") {
    return Object.fromEntries(MANAGEMENT_CATEGORIES.map((category) => [category, true]));
  }
  const result = await queryable.query(
    `SELECT data
       FROM sync_records
      WHERE scope = 'shared' AND record_key = 'rankConfig'
      LIMIT 1`,
  );
  return rankManagementPermissions(result.rows[0]?.data, authUser.rank);
}

module.exports = {
  MANAGEMENT_CATEGORIES,
  canReadSharedRecord,
  getUserManagementPermissions,
  isAllowedMissionProgressUpdate,
  rankManagementPermissions,
};
