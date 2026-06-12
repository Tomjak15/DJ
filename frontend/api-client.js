(() => {
  "use strict";

  const TOKEN_KEY = "abw-server-token";
  const DEVICE_KEY = "abw-device-id";
  const configuredUrl = String(window.ABW_CONFIG?.API_URL || "").replace(/\/+$/, "");
  const fallbackUrl = location.protocol === "file:" ? "http://localhost:8080" : location.origin;
  const baseUrl = configuredUrl || fallbackUrl;

  function getDeviceId() {
    let id = localStorage.getItem(DEVICE_KEY) || "";
    if (!id) {
      id = globalThis.crypto?.randomUUID?.()
        || `abw-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
      localStorage.setItem(DEVICE_KEY, id);
    }
    return id;
  }

  function getDeviceName() {
    const mobile = /Android|iPhone|iPad|Mobile/i.test(navigator.userAgent);
    const platform = navigator.userAgentData?.platform || navigator.platform || "Urządzenie";
    return `${mobile ? "Mobilne" : "Komputer"} // ${platform}`.slice(0, 160);
  }

  function getToken() {
    return sessionStorage.getItem(TOKEN_KEY) || "";
  }

  function setToken(token) {
    if (token) sessionStorage.setItem(TOKEN_KEY, token);
    else sessionStorage.removeItem(TOKEN_KEY);
  }

  function getSession() {
    const token = getToken();
    if (!token) return null;
    try {
      const payload = JSON.parse(atob(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")));
      return payload.exp * 1000 > Date.now() ? payload : null;
    } catch (error) {
      return null;
    }
  }

  async function request(path, options = {}) {
    const headers = new Headers(options.headers || {});
    const token = getToken();
    if (options.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");
    if (token) headers.set("Authorization", `Bearer ${token}`);

    let response;
    try {
      response = await fetch(`${baseUrl}${path}`, { ...options, headers });
    } catch (error) {
      const connectionError = new Error("Brak polaczenia z serwerem ABW");
      connectionError.cause = error;
      throw connectionError;
    }

    const data = response.status === 204 ? null : await response.json().catch(() => ({}));
    if (!response.ok) {
      const error = new Error(data?.error || `Blad serwera (${response.status})`);
      error.status = response.status;
      error.data = data;
      if (response.status === 401 && path !== "/login") setToken("");
      throw error;
    }
    return data;
  }

  async function login(nick, password) {
    let lastError;
    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        const data = await request("/login", {
          method: "POST",
          body: JSON.stringify({
            nick,
            password,
            deviceId: getDeviceId(),
            deviceName: getDeviceName(),
          }),
        });
        setToken(data.token);
        return data;
      } catch (error) {
        lastError = error;
        const temporaryFailure = !error.status || [502, 503, 504].includes(error.status);
        if (!temporaryFailure || attempt === 2) throw error;
        await new Promise((resolve) => window.setTimeout(resolve, 2500));
      }
    }
    throw lastError;
  }

  function getSyncData() {
    return request("/sync", { cache: "no-store" });
  }

  function saveSyncData(records) {
    return request("/sync", {
      method: "POST",
      body: JSON.stringify({ records }),
    });
  }

  function health() {
    const options = { cache: "no-store" };
    if (globalThis.AbortSignal?.timeout) options.signal = AbortSignal.timeout(90000);
    return request("/health", options);
  }

  // Metody administracyjne sa dodatkiem do czterech podstawowych metod
  // klienta. Dzieki nim istniejacy panel kont nie omija zabezpieczen backendu.
  const api = {
    acknowledgeMessage: (conversationId, messageId) => request(
      `/messages/${encodeURIComponent(conversationId)}/${encodeURIComponent(messageId)}/ack`,
      { method: "POST" },
    ),
    baseUrl,
    clearToken: () => setToken(""),
    createDirectConversation: (userId) => request("/messages/direct", {
      method: "POST",
      body: JSON.stringify({ userId }),
    }),
    createGroupConversation: (name, memberIds) => request("/messages/groups", {
      method: "POST",
      body: JSON.stringify({ name, memberIds }),
    }),
    createUser: (user) => request("/users", { method: "POST", body: JSON.stringify(user) }),
    deleteMessage: (conversationId, messageId) => request(
      `/messages/${encodeURIComponent(conversationId)}/${encodeURIComponent(messageId)}`,
      { method: "DELETE" },
    ),
    deleteUser: (id) => request(`/users/${encodeURIComponent(id)}`, { method: "DELETE" }),
    getConversations: () => request("/messages", { cache: "no-store" }),
    getDevices: () => request("/security/devices", { cache: "no-store" }),
    getMessages: (conversationId) => request(`/messages/${encodeURIComponent(conversationId)}`, {
      cache: "no-store",
    }),
    getIdentityQr: (id) => request(`/users/${encodeURIComponent(id)}/identity-qr`, {
      cache: "no-store",
    }),
    getAccountStatus: (nick) => request("/account-status", {
      method: "POST",
      body: JSON.stringify({ nick }),
    }),
    getSession,
    getPresence: () => request("/presence", { cache: "no-store" }),
    getServerStatus: () => request("/admin/status", { cache: "no-store" }),
    getBackups: () => request("/admin/backups", { cache: "no-store" }),
    getSyncData,
    getToken,
    getUsers: () => request("/users", { cache: "no-store" }),
    health,
    login,
    markConversationRead: (conversationId) => request(
      `/messages/${encodeURIComponent(conversationId)}/read`,
      { method: "POST" },
    ),
    saveSyncData,
    searchMessages: (query) => request(`/messages/search?q=${encodeURIComponent(query)}`, {
      cache: "no-store",
    }),
    sendMessage: (conversationId, message) => request(`/messages/${encodeURIComponent(conversationId)}`, {
      method: "POST",
      body: JSON.stringify(typeof message === "string" ? { body: message } : message),
    }),
    setMessagePinned: (conversationId, messageId, pinned) => request(
      `/messages/${encodeURIComponent(conversationId)}/${encodeURIComponent(messageId)}/pin`,
      { method: "PATCH", body: JSON.stringify({ pinned }) },
    ),
    reactToMessage: (conversationId, messageId, reaction) => request(
      `/messages/${encodeURIComponent(conversationId)}/${encodeURIComponent(messageId)}/react`,
      { method: "POST", body: JSON.stringify({ reaction }) },
    ),
    updatePresence: (data) => request("/presence", {
      method: "POST",
      body: JSON.stringify(data),
    }),
    triggerEvacuation: (reason) => request("/emergency/evacuate", {
      method: "POST",
      body: JSON.stringify({ reason }),
    }),
    createBackup: (label) => request("/admin/backups", {
      method: "POST",
      body: JSON.stringify({ label }),
    }),
    restoreBackup: (id) => request(`/admin/backups/${encodeURIComponent(id)}/restore`, {
      method: "POST",
    }),
    updateUser: (id, changes) => request(`/users/${encodeURIComponent(id)}`, {
      method: "PATCH",
      body: JSON.stringify(changes),
    }),
  };

  window.ABWApi = Object.freeze(api);
})();
