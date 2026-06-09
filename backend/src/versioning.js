"use strict";

// Porownanie jest wydzielone, aby regula konfliktu byla jednoznaczna i latwa
// do przetestowania niezaleznie od PostgreSQL.
function hasVersionConflict(clientUpdatedAt, serverUpdatedAt) {
  if (!serverUpdatedAt) return false;
  const clientVersion = clientUpdatedAt ? new Date(clientUpdatedAt).getTime() : 0;
  const serverVersion = new Date(serverUpdatedAt).getTime();
  return !clientVersion || clientVersion !== serverVersion;
}

module.exports = { hasVersionConflict };
