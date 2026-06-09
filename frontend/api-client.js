(() => {
  "use strict";

  const TOKEN_KEY = "abw-server-token";
  const configuredUrl = String(window.ABW_CONFIG?.API_URL || "").replace(/\/+$/, "");
  const fallbackUrl = location.protocol === "file:" ? "http://localhost:8080" : location.origin;
  const baseUrl = configuredUrl || fallbackUrl;

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
    const data = await request("/login", {
      method: "POST",
      body: JSON.stringify({ nick, password }),
    });
    setToken(data.token);
    return data;
  }

  async function register({ fullName, nick, password }) {
    const data = await request("/register", {
      method: "POST",
      body: JSON.stringify({ fullName, nick, password }),
    });
    setToken(data.token);
    return data;
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

  // Metody administracyjne sa dodatkiem do czterech podstawowych metod
  // klienta. Dzieki nim istniejacy panel kont nie omija zabezpieczen backendu.
  const api = {
    baseUrl,
    clearToken: () => setToken(""),
    createUser: (user) => request("/users", { method: "POST", body: JSON.stringify(user) }),
    deleteUser: (id) => request(`/users/${encodeURIComponent(id)}`, { method: "DELETE" }),
    getSession,
    getSyncData,
    getToken,
    getUsers: () => request("/users", { cache: "no-store" }),
    health: () => request("/health", { cache: "no-store" }),
    login,
    register,
    saveSyncData,
    updateUser: (id, changes) => request(`/users/${encodeURIComponent(id)}`, {
      method: "PATCH",
      body: JSON.stringify(changes),
    }),
  };

  window.ABWApi = Object.freeze(api);
})();
