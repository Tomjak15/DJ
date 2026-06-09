(() => {
  "use strict";

  const DB_KEY = "abw-os-db-v1";
  const IDLE_MS = 5 * 60 * 1000;
  const AUTOSAVE_MS = 3000;
  const SERVER_MODE = true;
  const SHARED_SYNC_KEYS = ["announcements", "info", "products", "mapObjects", "missions", "events", "logs"];

  const RANKS = [
    "Rekrut",
    "Szeregowy",
    "Kadet",
    "Kadet II stopnia",
    "Młodszy sierżant",
    "Starszy sierżant",
    "Podchorąży",
    "Chorąży",
    "Chorążypodmajster",
    "Majster klepka",
    "Majster sztabowy",
    "Majster bagieta",
    "Podoficer",
    "Oficer",
    "Oficer pułkownik",
    "Generał brygad",
    "Generał dywizyjny",
    "Generał generalny",
  ];

  const CATEGORY_LABELS = {
    all: "Wszystkie zasoby",
    mecha: "Jednostki mecha",
    aircraft: "Lotnictwo",
    drone: "Drony",
    spy: "Szpiegostwo",
    ops: "Operacyjne",
  };

  const LAYER_LABELS = {
    intelligence: "Wywiad",
    operations: "Operacje",
    infrastructure: "Infrastruktura",
  };

  const OBJECT_TYPES = {
    base: "Baza",
    route: "Trasa",
    meeting: "Spotkanie",
    unit: "Jednostka",
  };

  const OPS_FEED_LIBRARY = [
    ["Sektor Rafowy-4 potwierdził czysty korytarz akustyczny", "SONAR"],
    ["Bluecore przesuwa się po trasie Koral - Echo", "UNIT"],
    ["AI Watch wykrył krótką zmianę ciśnienia przy boi Echo", "AI"],
    ["Dron Narval wrócił z pasywnego zwiadu", "DRONE"],
    ["Warstwa wywiadu zsynchronizowała punkty spotkań", "INTEL"],
    ["Kanał ciszy radiowej utrzymany bez przerw", "COMMS"],
    ["Mecha Wieloryb przeszedł test maskowania dźwiękowego", "MECHA"],
    ["Stacja Koral wysłała pakiet meteorologiczny", "BASE"],
    ["Wykryto dryf cywilnej jednostki poza strefą operacji", "WATCH"],
    ["System porównał sygnatury 17 Hz z archiwum ABW", "CORE"],
    ["Trasa awaryjna została przeliczona przez mapę 3D", "MAP"],
    ["Zasoby operacyjne gotowe do przydziału", "QTR"],
  ];

  const state = {
    db: loadDb(),
    user: null,
    token: window.ABWApi?.getToken() || "",
    saveQueue: Promise.resolve(),
    syncInterval: null,
    serverOnline: false,
    syncVersions: new Map(),
    syncFingerprints: new Map(),
    activeTab: "dashboard",
    activeAdminTab: "users",
    activeCategory: "all",
    lastActivity: Date.now(),
    idleInterval: null,
    loginInterval: null,
    announcementInterval: null,
    noteDirty: false,
    noteSaveTimer: null,
    soundEnabled: false,
    audio: null,
    alarmSoundTimer: null,
    alarmSoundNodes: [],
    animationId: null,
    sonarCanvas: null,
    ambientCanvas: null,
    globe: {
      canvas: null,
      ctx: null,
      rotX: -0.18,
      rotY: -2.45,
      scaleMod: 1,
      dragging: false,
      lastX: 0,
      lastY: 0,
      layers: {
        intelligence: true,
        operations: true,
        infrastructure: true,
      },
    },
    logFilters: {
      user: "",
      action: "",
      date: "",
    },
  };

  const $ = (id) => document.getElementById(id);

  document.addEventListener("DOMContentLoaded", init);

  async function init() {
    bindGlobalEvents();
    updateLoginStatus();
    renderLoginClock();
    startAnimationLoop();
    await initializeServerConnection();
    state.loginInterval = window.setInterval(updateLoginStatus, 1000);
    state.announcementInterval = window.setInterval(() => {
      cleanupExpiredAnnouncements();
      if (state.user && ["dashboard", "announcements"].includes(state.activeTab)) {
        renderTab(state.activeTab);
      }
    }, 10000);
  }

  async function initializeServerConnection() {
    try {
      await window.ABWApi.health();
      state.serverOnline = true;
      if (state.token) await restoreServerSession();
      else setLoginStatus("Serwer ABW online", "ok");
    } catch (error) {
      state.serverOnline = false;
      state.token = "";
      window.ABWApi.clearToken();
      setLoginStatus("Brak połączenia z serwerem ABW", "danger");
    }
  }

  async function restoreServerSession() {
    const session = window.ABWApi.getSession();
    if (!session?.sub) {
      state.token = "";
      window.ABWApi.clearToken();
      return;
    }
    try {
      await loadOnlineState(session.sub);
      showOs();
    } catch (error) {
      state.token = "";
      window.ABWApi.clearToken();
      setLoginStatus("Sesja wygasła. Zaloguj się ponownie", "warn");
    }
  }

  function bindGlobalEvents() {
    $("loginForm").addEventListener("submit", handleLogin);
    $("registerForm").addEventListener("submit", handleRegister);
    $("loginNick").addEventListener("input", updateLoginStatus);
    $("passwordToggle").addEventListener("click", togglePasswordVisibility);
    $("registerPasswordToggle").addEventListener("click", () => togglePasswordInput("registerPassword", "registerPasswordToggle"));
    $("showRegisterButton").addEventListener("click", () => setAuthMode("register"));
    $("showLoginButton").addEventListener("click", () => setAuthMode("login"));
    $("logoutButton").addEventListener("click", () => logout("manual"));
    $("fullscreenButton").addEventListener("click", toggleFullscreen);
    $("soundToggle").addEventListener("click", toggleSound);

    document.querySelectorAll(".dock-item").forEach((button) => {
      button.addEventListener("click", () => switchTab(button.dataset.tab));
    });

    document.addEventListener("click", handleActionClick);
    document.addEventListener("submit", handleFormSubmit);
    document.addEventListener("input", handleDocumentInput);

    ["mousemove", "mousedown", "keydown", "scroll", "touchstart"].forEach((eventName) => {
      window.addEventListener(eventName, markActivity, { passive: true });
    });
  }

  function setAuthMode(mode) {
    const registration = mode === "register";
    $("loginForm").classList.toggle("hidden", registration);
    $("registerForm").classList.toggle("hidden", !registration);
    setLoginStatus(registration ? "Rejestracja nowego konta ABW" : "Serwer ABW online", "ok");
    (registration ? $("registerFullName") : $("loginNick")).focus();
  }

  function defaultDb() {
    return {
      schema: 2,
      seedContentCleared: true,
      users: [],
      announcements: [],
      info: [
        {
          id: "info-1",
          title: "Protokół ABW-ORCA",
          body: "Identyfikacja jednostki odbywa się przez nick lub numer odznaki. Każde wejście zapisuje System Core.",
          severity: "ok",
        },
        {
          id: "info-2",
          title: "Zasada braku śladu",
          body: "Po zakończeniu operacji notatnik zostaje zaszyfrowany, zapisany na serwerze i przypisany do konta agenta.",
          severity: "warn",
        },
        {
          id: "info-3",
          title: "Priorytet czerwony",
          body: "Alarm oceaniczny lub nieznana jednostka uruchamia tryb czerwony, popup alert, glitch HUD i rejestr logów.",
          severity: "danger",
        },
      ],
      products: [
        {
          id: "prd-1",
          name: "MECHA SŁOŃ MK-IV",
          description: "Ciężka jednostka lądowo-portowa do forsowania nabrzeży i przenoszenia modułów sonarowych.",
          category: "mecha",
          status: "Gotowy do wdrożenia",
          visual: "MS-IV",
          imageData: "",
        },
        {
          id: "prd-2",
          name: "MECHA WIELORYB BLUECORE",
          description: "Autonomiczna platforma głębinowa z komorą dronów, maskowaniem akustycznym i rdzeniem AI.",
          category: "mecha",
          status: "Gotowy do zamówienia",
          visual: "MW-B",
          imageData: "",
        },
        {
          id: "prd-3",
          name: "F-35 Raptor ABW",
          description: "Fikcyjna konfiguracja oceaniczna ze skanerem atmosferyczno-sonarowym i powłoką nocną.",
          category: "aircraft",
          status: "Hangar alfa",
          visual: "F35",
          imageData: "",
        },
        {
          id: "prd-4",
          name: "F-16 Deepwatch",
          description: "Lekka eskadra patrolowa do przechwytywania sygnałów i eskorty tras nadbrzeżnych.",
          category: "aircraft",
          status: "Dostępny",
          visual: "F16",
          imageData: "",
        },
        {
          id: "prd-5",
          name: "Dron głębinowy NARVAL",
          description: "Cichy dron zwiadowczy z węzłem mapowania 3D i boją przekaźnikową.",
          category: "drone",
          status: "Magazyn beta",
          visual: "DRV",
          imageData: "",
        },
        {
          id: "prd-6",
          name: "Zestaw szpiegowski SQUID",
          description: "Mikrofony kontaktowe, igły światłowodowe, maskownica termiczna i fałszywy transponder.",
          category: "spy",
          status: "Dostępny",
          visual: "SQD",
          imageData: "",
        },
        {
          id: "prd-7",
          name: "Wyposażenie operacyjne ABW",
          description: "Skafander ciśnieniowy, terminal szyfrujący, latarnia widmowa i moduł medyczny.",
          category: "ops",
          status: "Pakiet standard",
          visual: "OPS",
          imageData: "",
        },
      ],
      notes: {},
      carts: {},
      orders: [],
      settings: {},
      files: {},
      configuration: {},
      mapObjects: [
        {
          id: "map-1",
          name: "Baza Głębinowa Koral",
          type: "base",
          layer: "infrastructure",
          lat: -33.86,
          lon: 151.21,
        },
        {
          id: "map-2",
          name: "Węzeł wywiadu Tasman-7",
          type: "base",
          layer: "intelligence",
          lat: -42.88,
          lon: 147.32,
        },
        {
          id: "map-3",
          name: "Spotkanie Echo",
          type: "meeting",
          layer: "operations",
          lat: -23.7,
          lon: 159.9,
        },
        {
          id: "map-4",
          name: "Jednostka Bluecore-2",
          type: "unit",
          layer: "operations",
          lat: -18.4,
          lon: 146.1,
        },
        {
          id: "map-5",
          name: "Trasa Koral - Echo",
          type: "route",
          layer: "operations",
          lat: -33.86,
          lon: 151.21,
          lat2: -23.7,
          lon2: 159.9,
        },
      ],
      missions: [],
      events: [],
      logs: [],
    };
  }

  function loadDb() {
    try {
      const parsed = JSON.parse(localStorage.getItem(DB_KEY) || "null");
      if (!parsed || !Array.isArray(parsed.users)) {
        const fresh = defaultDb();
        localStorage.setItem(DB_KEY, JSON.stringify(fresh));
        return fresh;
      }
      const normalized = normalizeDb(parsed);
      localStorage.setItem(DB_KEY, JSON.stringify(normalized));
      return normalized;
    } catch (error) {
      const fresh = defaultDb();
      localStorage.setItem(DB_KEY, JSON.stringify(fresh));
      return fresh;
    }
  }

  function normalizeDb(db) {
    const fresh = defaultDb();
    const shouldClearSeedContent = !db.seedContentCleared || Number(db.schema || 1) < 2;
    const normalized = {
      ...fresh,
      ...db,
      users: Array.isArray(db.users) ? db.users : fresh.users,
      announcements: Array.isArray(db.announcements) ? db.announcements : fresh.announcements,
      info: Array.isArray(db.info) ? db.info : fresh.info,
      products: Array.isArray(db.products) ? db.products : fresh.products,
      notes: db.notes && typeof db.notes === "object" ? db.notes : fresh.notes,
      carts: db.carts && typeof db.carts === "object" ? db.carts : fresh.carts,
      orders: Array.isArray(db.orders) ? db.orders : fresh.orders,
      settings: db.settings && typeof db.settings === "object" ? db.settings : fresh.settings,
      files: db.files && typeof db.files === "object" ? db.files : fresh.files,
      configuration: db.configuration && typeof db.configuration === "object" ? db.configuration : fresh.configuration,
      mapObjects: Array.isArray(db.mapObjects) ? db.mapObjects : fresh.mapObjects,
      missions: Array.isArray(db.missions) ? db.missions : fresh.missions,
      events: Array.isArray(db.events) ? db.events : fresh.events,
      logs: Array.isArray(db.logs) ? db.logs : fresh.logs,
    };
    return migrateDb(normalized, shouldClearSeedContent);
  }

  function migrateDb(db) {
    db.users.forEach((user) => delete user.points);
    db.products.forEach((product) => {
      delete product.price;
      if (product.status === "Wymaga autoryzacji generała") product.status = "Gotowy do zamówienia";
    });
    db.missions.forEach((mission) => delete mission.pointReward);
    return db;
  }

  function recordIdentity(record) {
    return `${record.scope}:${record.owner_user_id || "shared"}:${record.key}`;
  }

  function recordFingerprint(data) {
    return JSON.stringify(data ?? null);
  }

  function buildSyncRecords() {
    const user = currentUser();
    if (!user) return [];

    const writableSharedKeys = isAdmin() ? SHARED_SYNC_KEYS : ["missions", "logs"];
    const records = writableSharedKeys.map((key) => ({
      key,
      scope: "shared",
      owner_user_id: null,
      data: state.db[key],
    }));
    const owners = isAdmin() ? state.db.users : [user];

    owners.forEach((owner) => {
      const privateRecords = [
        ["notes", state.db.notes[owner.id] || { text: "", updatedAt: 0 }],
        ["cart", state.db.carts[owner.id] || []],
        ["orders", state.db.orders.filter((order) => order.userId === owner.id)],
        ["settings", state.db.settings[owner.id] || {}],
        ["files", state.db.files[owner.id] || []],
        ["configuration", state.db.configuration[owner.id] || {}],
        ["profile", { rank: owner.rank, exp: Number(owner.exp || 0) }],
      ];
      privateRecords.forEach(([key, data]) => records.push({
        key,
        scope: "private",
        owner_user_id: owner.id,
        data,
      }));
    });

    return records;
  }

  function applySyncRecord(record) {
    const data = JSON.parse(JSON.stringify(record.data ?? null));
    const ownerId = record.owner_user_id;
    if (record.scope === "shared" && SHARED_SYNC_KEYS.includes(record.key)) {
      state.db[record.key] = data;
    } else if (record.scope === "private" && ownerId) {
      if (record.key === "notes") state.db.notes[ownerId] = data;
      if (record.key === "cart") state.db.carts[ownerId] = Array.isArray(data) ? data : [];
      if (record.key === "orders") {
        state.db.orders = state.db.orders
          .filter((order) => order.userId !== ownerId)
          .concat((Array.isArray(data) ? data : []).map((order) => ({ ...order, userId: ownerId })));
      }
      if (record.key === "settings") state.db.settings[ownerId] = data || {};
      if (record.key === "files") state.db.files[ownerId] = Array.isArray(data) ? data : [];
      if (record.key === "configuration") state.db.configuration[ownerId] = data || {};
      if (record.key === "profile") {
        const owner = findUser(ownerId);
        if (owner && data) Object.assign(owner, { rank: data.rank || owner.rank, exp: Number(data.exp || 0) });
      }
    }
    const identity = recordIdentity(record);
    state.syncVersions.set(identity, record.updated_at || null);
    state.syncFingerprints.set(identity, recordFingerprint(record.data));
  }

  async function loadOnlineState(activeUserId) {
    const [syncData, usersData] = await Promise.all([
      window.ABWApi.getSyncData(),
      window.ABWApi.getUsers(),
    ]);
    state.db = normalizeDb(state.db);
    state.db.users = usersData.users || [];
    state.user = { id: activeUserId };
    state.syncVersions.clear();
    state.syncFingerprints.clear();
    (syncData.records || []).forEach(applySyncRecord);
    applyUserPreferences();
    cacheDb(state.db);

    // Pierwsze konto inicjalizuje brakujace rekordy wspolne i prywatne.
    await saveDb();
  }

  function applyUserPreferences() {
    const user = currentUser();
    if (!user) return;
    const settings = state.db.settings[user.id] || {};
    const configuration = state.db.configuration[user.id] || {};
    state.soundEnabled = Boolean(settings.soundEnabled);
    state.globe.layers = {
      ...state.globe.layers,
      ...(settings.mapLayers || {}),
    };
    state.activeCategory = configuration.shopCategory || "all";
    $("soundToggle").textContent = state.soundEnabled ? "SND ON" : "SND";
  }

  function saveDb() {
    cacheDb(state.db);
    if (!state.token || !currentUser()) return Promise.resolve();

    state.saveQueue = state.saveQueue
      .catch(() => {})
      .then(async () => {
        const dirtyRecords = buildSyncRecords()
          .filter((record) => state.syncFingerprints.get(recordIdentity(record)) !== recordFingerprint(record.data))
          .map((record) => ({
            ...record,
            updated_at: state.syncVersions.get(recordIdentity(record)) || null,
          }));
        if (!dirtyRecords.length) return null;

        const result = await window.ABWApi.saveSyncData(dirtyRecords);
        (result.accepted || []).forEach(applySyncRecord);
        if (result.conflicts?.length) {
          result.conflicts.forEach(applySyncRecord);
          renderIdentity();
          renderTab(state.activeTab);
          showToast("Wykryto nowsze dane na serwerze. Zachowano wersję serwerową.");
        }
        cacheDb(state.db);
        return result;
      })
      .catch((error) => {
        if (error.status === 401) logout("expired");
        else showToast(error.message || "Błąd synchronizacji z serwerem");
      });
    return state.saveQueue;
  }

  function cacheDb(db) {
    const safe = JSON.parse(JSON.stringify(db));
    safe.users?.forEach((user) => delete user.password);
    localStorage.setItem(DB_KEY, JSON.stringify(safe));
  }

  function uid(prefix) {
    return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
  }

  function esc(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function formatTime(value) {
    if (!value) return "-";
    return new Date(value).toLocaleString("pl-PL", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  }

  function compactTime(value) {
    if (!value) return "-";
    return new Date(value).toLocaleTimeString("pl-PL", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  }

  function timeLeft(target) {
    const left = Math.max(0, target - Date.now());
    const minutes = Math.floor(left / 60000);
    const seconds = Math.floor((left % 60000) / 1000);
    return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }

  function rankIndex(rank) {
    const index = RANKS.indexOf(rank);
    return index < 0 ? 0 : index;
  }

  function findUser(id) {
    return state.db.users.find((user) => user.id === id);
  }

  function currentUser() {
    return state.user ? findUser(state.user.id) : null;
  }

  function isAdmin() {
    const user = currentUser();
    return Boolean(user && user.role === "admin");
  }

  function activeAnnouncements() {
    cleanupExpiredAnnouncements(false);
    return state.db.announcements
      .filter((announcement) => announcement.expiresAt > Date.now())
      .sort((a, b) => a.expiresAt - b.expiresAt);
  }

  function cleanupExpiredAnnouncements(shouldSave = true) {
    const before = state.db.announcements.length;
    state.db.announcements = state.db.announcements.filter((announcement) => announcement.expiresAt > Date.now());
    if (shouldSave && before !== state.db.announcements.length) saveDb();
  }

  function logAction(action, detail, userOverride = null) {
    const user = userOverride || currentUser();
    state.db.logs.unshift({
      id: uid("log"),
      time: Date.now(),
      userId: user?.id || "",
      nick: user?.nick || "system",
      action,
      detail,
    });
    state.db.logs = state.db.logs.slice(0, 500);
    saveDb();
  }

  async function handleLogin(event) {
    event.preventDefault();
    const nick = $("loginNick").value.trim();
    const password = $("loginPassword").value.trim();
    await handleServerLogin(nick, password);
  }

  async function handleServerLogin(nick, password) {
    if (!state.serverOnline) {
      setLoginStatus("Brak połączenia z serwerem ABW", "danger");
      return;
    }
    const button = $("loginForm").querySelector('button[type="submit"]');
    button.disabled = true;
    button.textContent = "Łączenie z serwerem...";
    try {
      const data = await window.ABWApi.login(nick, password);
      state.token = data.token;
      await loadOnlineState(data.user.id);
      setLoginStatus("ACCESS GRANTED", "ok");
      playSound("success");
      $("accessGranted").classList.add("visible");
      window.setTimeout(() => {
        $("accessGranted").classList.remove("visible");
        showOs();
      }, 720);
    } catch (error) {
      const lockTime = error.data?.locked_until
        ? timeLeft(new Date(error.data.locked_until).getTime())
        : "";
      setLoginStatus(lockTime ? `${error.message}: ${lockTime}` : error.message, "danger");
      playSound("error");
    } finally {
      button.disabled = false;
      button.textContent = "Autoryzuj dostęp";
    }
  }

  async function handleRegister(event) {
    event.preventDefault();
    if (!state.serverOnline) {
      setLoginStatus("Brak połączenia z serwerem ABW", "danger");
      return;
    }
    const button = $("registerForm").querySelector('button[type="submit"]');
    button.disabled = true;
    button.textContent = "Tworzenie konta...";
    try {
      const data = await window.ABWApi.register({
        fullName: $("registerFullName").value.trim(),
        nick: $("registerNick").value.trim(),
        password: $("registerPassword").value,
      });
      state.token = data.token;
      await loadOnlineState(data.user.id);
      setLoginStatus("ACCESS GRANTED", "ok");
      playSound("success");
      $("accessGranted").classList.add("visible");
      window.setTimeout(() => {
        $("accessGranted").classList.remove("visible");
        showOs();
      }, 720);
    } catch (error) {
      setLoginStatus(error.message || "Nie udało się utworzyć konta", "danger");
      playSound("error");
    } finally {
      button.disabled = false;
      button.textContent = "Zarejestruj konto";
    }
  }

  function togglePasswordVisibility() {
    togglePasswordInput("loginPassword", "passwordToggle");
  }

  function togglePasswordInput(inputId, buttonId) {
    const input = $(inputId);
    const button = $(buttonId);
    const visible = input.type === "password";
    input.type = visible ? "text" : "password";
    button.setAttribute("aria-pressed", String(visible));
    button.setAttribute("aria-label", visible ? "Ukryj hasło" : "Pokaż hasło");
    input.focus();
  }

  function setLoginStatus(text, kind) {
    const node = $("loginStatus");
    node.textContent = text;
    node.className = `status-pill ${kind}`;
  }

  function updateLoginStatus() {
    const nick = $("loginNick")?.value.trim();
    if (SERVER_MODE) {
      if (!state.serverOnline) {
        setLoginStatus("Brak połączenia z serwerem ABW", "danger");
      } else if (!nick) {
        setLoginStatus("Serwer ABW online", "ok");
      } else {
        setLoginStatus("Identyfikator gotowy do autoryzacji", "ok");
      }
      return;
    }
    if (!nick) {
      setLoginStatus("Konto aktywne", "ok");
      return;
    }
    const user = state.db.users.find(
      (candidate) =>
        candidate.nick.toLowerCase() === nick.toLowerCase() ||
        candidate.badge.toLowerCase() === nick.toLowerCase(),
    );
    if (!user) {
      setLoginStatus("Identyfikator nieznany", "warn");
      return;
    }
    if (user.disabled) {
      setLoginStatus("Konto zablokowane przez admina", "danger");
      return;
    }
    if (user.lockedUntil && user.lockedUntil > Date.now()) {
      setLoginStatus(`Konto zablokowane: ${timeLeft(user.lockedUntil)}`, "danger");
      return;
    }
    setLoginStatus(`Konto aktywne // ${user.rank}`, "ok");
  }

  function renderLoginClock() {
    window.setInterval(() => {
      if (!$("loginScreen").classList.contains("hidden")) updateLoginStatus();
    }, 1000);
  }

  function showOs() {
    const user = currentUser();
    if (!user) return;
    $("loginScreen").classList.add("hidden");
    $("osScreen").classList.remove("hidden");
    $("app").classList.toggle("admin-session", user.role === "admin");
    $("systemStatus").textContent = SERVER_MODE ? "SERWER ONLINE" : "STABILNY";
    state.lastActivity = Date.now();
    renderIdentity();
    const lastTab = state.db.configuration[user.id]?.lastTab;
    switchTab(lastTab === "admin" && !isAdmin() ? "dashboard" : lastTab || "dashboard", false);
    startIdleTimer();
    startServerSync();
    window.setTimeout(() => triggerResize(), 80);
  }

  async function logout(reason) {
    if (reason !== "expired") {
      autosaveNote(true);
      await state.saveQueue.catch(() => {});
    } else {
      state.noteDirty = false;
    }
    stopAlarmSound();
    state.token = "";
    window.ABWApi.clearToken();
    state.user = null;
    state.syncVersions.clear();
    state.syncFingerprints.clear();
    $("osScreen").classList.add("hidden");
    $("osScreen").classList.remove("alarm-mode");
    $("loginScreen").classList.remove("hidden");
    $("loginPassword").value = "";
    setLoginStatus(reason === "auto" ? "Sesja wygasła po 5 minutach bez aktywności" : "Konto aktywne", reason === "auto" ? "warn" : "ok");
    if (state.idleInterval) window.clearInterval(state.idleInterval);
    state.idleInterval = null;
    if (state.syncInterval) window.clearInterval(state.syncInterval);
    state.syncInterval = null;
  }

  function startServerSync() {
    if (!SERVER_MODE || !state.token) return;
    if (state.syncInterval) window.clearInterval(state.syncInterval);
    state.syncInterval = window.setInterval(syncFromServer, 10000);
  }

  async function syncFromServer() {
    if (!state.token || state.noteDirty) return;
    if (["INPUT", "TEXTAREA", "SELECT"].includes(document.activeElement?.tagName)) return;
    try {
      await state.saveQueue.catch(() => {});
      const activeUserId = state.user?.id;
      const knownEventIds = new Set(state.db.events.map((event) => event.id));
      const [syncData, usersData] = await Promise.all([
        window.ABWApi.getSyncData(),
        window.ABWApi.getUsers(),
      ]);
      state.db.users = usersData.users || state.db.users;
      (syncData.records || []).forEach(applySyncRecord);
      const newEvent = state.db.events.find((event) => !knownEventIds.has(event.id));
      state.user = activeUserId && findUser(activeUserId) ? { id: activeUserId } : null;
      if (!state.user) {
        logout("expired");
        return;
      }
      cacheDb(state.db);
      renderIdentity();
      renderTab(state.activeTab);
      if (newEvent) {
        showEventPopup(newEvent);
        if (newEvent.severity === "red") activateAlarmMode();
      }
    } catch (error) {
      if (error.status === 401) logout("expired");
      // Pozostale bledy sieci sa ponawiane w nastepnym cyklu.
    }
  }

  function renderIdentity() {
    const user = currentUser();
    if (!user) return;
    $("agentName").textContent = user.fullName;
    $("agentMeta").textContent = `${user.badge} // ${user.rank} // ${user.role === "admin" ? "ADMIN CORE" : "AGENT CORE"}`;
  }

  function markActivity() {
    if (!$("osScreen").classList.contains("hidden")) {
      state.lastActivity = Date.now();
    }
  }

  function startIdleTimer() {
    if (state.idleInterval) window.clearInterval(state.idleInterval);
    updateIdleDisplay();
    state.idleInterval = window.setInterval(() => {
      updateIdleDisplay();
    }, 1000);
  }

  function updateIdleDisplay() {
      const left = IDLE_MS - (Date.now() - state.lastActivity);
      if (left <= 0) {
        logout("auto");
        return;
      }
      $("idleTimer").textContent = `${String(Math.floor(left / 60000)).padStart(2, "0")}:${String(Math.floor((left % 60000) / 1000)).padStart(2, "0")}`;
      $("systemClock").textContent = new Date().toLocaleTimeString("pl-PL");
  }

  function switchTab(tab, shouldPersist = true) {
    if (tab === "admin" && !isAdmin()) return;
    state.activeTab = tab;
    document.querySelectorAll(".dock-item").forEach((button) => {
      button.classList.toggle("active", button.dataset.tab === tab);
    });
    document.querySelectorAll(".tab-panel").forEach((panel) => {
      panel.classList.toggle("active", panel.id === `tab-${tab}`);
    });
    renderTab(tab);
    playSound("beep");
    if (tab === "map") window.setTimeout(initGlobe, 30);
    if (shouldPersist && currentUser()) {
      state.db.configuration[currentUser().id] = {
        ...(state.db.configuration[currentUser().id] || {}),
        lastTab: tab,
        shopCategory: state.activeCategory,
      };
      saveDb();
    }
  }

  function renderTab(tab) {
    const renderers = {
      dashboard: renderDashboard,
      announcements: renderAnnouncements,
      info: renderInfo,
      shop: renderShop,
      notes: renderNotes,
      map: renderMap,
      missions: renderMissions,
      events: renderEvents,
      admin: renderAdmin,
    };
    renderers[tab]?.();
  }

  function header(kicker, title, body, actions = "") {
    return `
      <div class="module-header">
        <div>
          <span class="module-kicker">${esc(kicker)}</span>
          <h2>${esc(title)}</h2>
          <p>${esc(body)}</p>
        </div>
        ${actions ? `<div class="inline-actions">${actions}</div>` : ""}
      </div>
    `;
  }

  function renderDashboard() {
    const user = currentUser();
    const missions = visibleMissions();
    const activeMission = missions.find((mission) => ["aktywna", "w trakcie"].includes(mission.status));
    const opsFeed = randomOperationalFeed();
    const events = state.db.events.slice(0, 4);
    const announcements = activeAnnouncements();
    const orderCount = state.db.orders.filter((order) => order.userId === user.id).length;
    $("tab-dashboard").innerHTML = `
      ${header("COMMAND DESKTOP", "Pulpit operacyjny ABW", "Pełnoekranowy rdzeń dowodzenia: sonar, aktywność konta, misje, alerty i szybki podgląd zasobów.")}
      <div class="stat-grid">
        <div class="stat-tile"><span>Ranga</span><strong>${esc(user.rank)}</strong><em>${esc(user.badge)}</em></div>
        <div class="stat-tile"><span>EXP</span><strong>${Number(user.exp).toLocaleString("pl-PL")}</strong><em>Postęp awansowy aktywny</em></div>
        <div class="stat-tile"><span>Zamówienia</span><strong>${orderCount}</strong><em>Bez limitów zaopatrzenia</em></div>
        <div class="stat-tile"><span>Ogłoszenia</span><strong>${announcements.length}</strong><em>Automatycznie wygasają</em></div>
      </div>
      <div class="command-grid">
        <div class="module-panel sonar-panel">
          <div class="module-header">
            <div>
              <span class="module-kicker">SONAR CORE</span>
              <h2>Oceaniczna siatka wykrywania</h2>
              <p>Animowany ping sonaru i zakłócenia tła działają stale jako warstwa HUD.</p>
            </div>
          </div>
          <div class="sonar-canvas-wrap"><canvas id="sonarCanvas"></canvas></div>
          <div class="status-row">
            <span class="mini-pill ok">SONAR ONLINE</span>
            <span class="mini-pill">AI WATCH</span>
            <span class="mini-pill warn">CISZA RADIOWA</span>
          </div>
        </div>
        <div class="module-panel">
          <div class="module-header">
            <div>
              <span class="module-kicker">MISSION CORE</span>
              <h2>${activeMission ? esc(activeMission.title) : "Brak aktywnej misji"}</h2>
              <p>${activeMission ? esc(activeMission.description) : "Dowództwo nie przydzieliło teraz operacji dla tego konta."}</p>
            </div>
          </div>
          <div class="status-row">
            ${activeMission ? `<span class="mini-pill ${activeMission.status === "w trakcie" ? "warn" : "ok"}">${esc(activeMission.status)}</span>` : `<span class="mini-pill">STANDBY</span>`}
            <span class="mini-pill">Dostęp: ${esc(user.role === "admin" ? "pełny" : "rangowy")}</span>
          </div>
          <h3>Losowy feed operacyjny</h3>
          <div class="feed-list">
            ${opsFeed.map(renderFeedItem).join("")}
          </div>
        </div>
      </div>
      <div class="command-grid" style="margin-top:14px">
        <div class="module-panel">
          <div class="module-header">
            <div>
              <span class="module-kicker">GLOBAL EVENTS CORE</span>
              <h2>Aktywne zdarzenia</h2>
              <p>Najświeższe alarmy oceaniczne, incydenty jednostek i misje awaryjne.</p>
            </div>
          </div>
          <div class="event-list">
            ${events.length ? events.map(renderEventCard).join("") : `<div class="empty-state">Brak aktywnych zdarzeń.</div>`}
          </div>
        </div>
        <div class="module-panel">
          <div class="module-header">
            <div>
              <span class="module-kicker">ANNOUNCEMENT BUS</span>
              <h2>Ogłoszenia z timerem</h2>
              <p>Po wygaśnięciu wpisy znikają ze wspólnego systemu.</p>
            </div>
          </div>
          <div class="announcement-list">
            ${announcements.slice(0, 4).map(renderAnnouncementCard).join("") || `<div class="empty-state">Brak ogłoszeń do wyświetlenia.</div>`}
          </div>
        </div>
      </div>
    `;
    initSonar();
  }

  function randomOperationalFeed() {
    const now = Date.now();
    return OPS_FEED_LIBRARY
      .map((item) => ({ item, weight: Math.random() }))
      .sort((a, b) => a.weight - b.weight)
      .slice(0, 7)
      .map(({ item }, index) => ({
        time: now - index * (7000 + Math.floor(Math.random() * 19000)),
        action: item[0],
        nick: item[1],
      }));
  }

  function renderFeedItem(log) {
    return `
      <div class="feed-item">
        <time>${esc(compactTime(log.time))}</time>
        <strong>${esc(log.action)}</strong>
        <span class="muted">${esc(log.nick)}</span>
      </div>
    `;
  }

  function renderAnnouncements() {
    const announcements = activeAnnouncements();
    $("tab-announcements").innerHTML = `
      ${header("ANNOUNCEMENT CORE", "Ogłoszenia dowództwa", "Lista komunikatów dodanych przez administratora. Każde ogłoszenie ma licznik i znika automatycznie po wygaśnięciu.")}
      <div class="announcement-list">
        ${announcements.length ? announcements.map(renderAnnouncementCard).join("") : `<div class="empty-state">Nie ma aktywnych ogłoszeń.</div>`}
      </div>
    `;
  }

  function renderAnnouncementCard(announcement) {
    return `
      <article class="announcement-card">
        <h3>${esc(announcement.title)}</h3>
        <p>${esc(announcement.body)}</p>
        <div class="card-footer">
          <span class="mini-pill warn">Wygasa za ${esc(timeLeft(announcement.expiresAt))}</span>
          <span class="mini-pill">Utworzono ${esc(formatTime(announcement.createdAt))}</span>
        </div>
      </article>
    `;
  }

  function renderInfo() {
    $("tab-info").innerHTML = `
      ${header("INFORMATION CORE", "Stałe komunikaty ABW", "Komunikaty systemowe, instrukcje i alerty edytowane wyłącznie w panelu administratora.")}
      <div class="info-list">
        ${state.db.info.map((item) => `
          <article class="info-line">
            <div>
              <h3>${esc(item.title)}</h3>
              <p>${esc(item.body)}</p>
              <div class="card-footer"><span class="mini-pill ${item.severity === "danger" ? "danger" : item.severity === "warn" ? "warn" : "ok"}">${esc(item.severity.toUpperCase())}</span></div>
            </div>
          </article>
        `).join("")}
      </div>
    `;
  }

  function renderShop() {
    const categories = ["all", ...Object.keys(CATEGORY_LABELS).filter((key) => key !== "all")];
    const products = state.db.products.filter(
      (product) => state.activeCategory === "all" || product.category === state.activeCategory,
    );
    const cart = currentCart();
    const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);
    $("tab-shop").innerHTML = `
      ${header("QUARTERMASTER CORE", "Magazyn zasobów ABW", "Dodawaj dowolne zasoby do koszyka i składaj zamówienia bez cen, salda oraz ograniczeń ilości.")}
      <div class="shop-layout">
        <aside class="module-panel filter-stack">
          <span class="module-kicker">KATEGORIE</span>
          ${categories.map((category) => `
            <button class="filter-button ${state.activeCategory === category ? "active" : ""}" data-action="filter-shop" data-category="${esc(category)}">${esc(CATEGORY_LABELS[category])}</button>
          `).join("")}
        </aside>
        <div class="product-grid">
          ${products.map(renderProductCard).join("") || `<div class="empty-state">Brak zasobów w tej kategorii.</div>`}
        </div>
        <aside class="module-panel cart-panel">
          <div class="module-header">
            <div>
              <span class="module-kicker">KOSZYK AGENTA</span>
              <h2>Zamówienie</h2>
              <p>${cartCount ? `${cartCount} szt. zasobów gotowych do zamówienia.` : "Koszyk jest pusty."}</p>
            </div>
          </div>
          <div class="cart-list">
            ${cart.length ? cart.map(renderCartItem).join("") : `<div class="empty-state">Dodaj wyposażenie z listy zasobów.</div>`}
          </div>
          <button class="primary-action cart-order-button" data-action="place-order" ${cart.length ? "" : "disabled"}>Złóż zamówienie</button>
          <p class="cart-note">Brak cen i limitów. Zamówienie zostanie zapisane ${SERVER_MODE ? "na serwerze ABW" : "lokalnie"}.</p>
        </aside>
      </div>
    `;
  }

  function renderProductCard(product) {
    const quantity = currentCart().find((item) => item.productId === product.id)?.quantity || 0;
    return `
      <article class="product-card">
        ${renderProductVisual(product)}
        <h3>${esc(product.name)}</h3>
        <p>${esc(product.description)}</p>
        <div class="card-footer">
          <span class="mini-pill">${esc(product.status)}</span>
          ${quantity ? `<span class="mini-pill ok">W koszyku: ${quantity}</span>` : ""}
        </div>
        <button class="primary-action" data-action="add-to-cart" data-id="${esc(product.id)}">Dodaj do koszyka</button>
      </article>
    `;
  }

  function renderCartItem(item) {
    const product = state.db.products.find((entry) => entry.id === item.productId);
    if (!product) return "";
    return `
      <div class="cart-item">
        <div>
          <strong>${esc(product.name)}</strong>
          <span>${esc(product.status)}</span>
        </div>
        <div class="cart-quantity">
          <button data-action="cart-decrease" data-id="${esc(product.id)}" aria-label="Zmniejsz ilość">−</button>
          <strong>${item.quantity}</strong>
          <button data-action="cart-increase" data-id="${esc(product.id)}" aria-label="Zwiększ ilość">+</button>
          <button class="cart-remove" data-action="cart-remove" data-id="${esc(product.id)}" aria-label="Usuń z koszyka">×</button>
        </div>
      </div>
    `;
  }

  function currentCart() {
    const user = currentUser();
    if (!user) return [];
    state.db.carts[user.id] ||= [];
    return state.db.carts[user.id];
  }

  function changeCartQuantity(productId, delta) {
    if (!state.db.products.some((product) => product.id === productId)) return;
    const cart = currentCart();
    let item = cart.find((entry) => entry.productId === productId);
    if (!item && delta > 0) {
      item = { productId, quantity: 0 };
      cart.push(item);
    }
    if (!item) return;
    item.quantity = Math.max(0, item.quantity + delta);
    if (item.quantity === 0) removeFromCart(productId, false);
    saveDb();
    renderShop();
    playSound("beep");
  }

  function removeFromCart(productId, rerender = true) {
    const user = currentUser();
    if (!user) return;
    state.db.carts[user.id] = currentCart().filter((item) => item.productId !== productId);
    saveDb();
    if (rerender) renderShop();
  }

  function placeOrder() {
    const user = currentUser();
    const cart = currentCart();
    if (!user || !cart.length) return;
    const items = cart
      .map((item) => {
        const product = state.db.products.find((entry) => entry.id === item.productId);
        return product ? { productId: product.id, name: product.name, quantity: item.quantity } : null;
      })
      .filter(Boolean);
    if (!items.length) return;
    state.db.orders.unshift({
      id: uid("ord"),
      userId: user.id,
      nick: user.nick,
      createdAt: Date.now(),
      status: "Złożone",
      items,
    });
    state.db.carts[user.id] = [];
    logAction("zamówienie zasobów", `${items.reduce((sum, item) => sum + item.quantity, 0)} szt. wyposażenia`);
    saveDb();
    renderShop();
    playSound("success");
    showToast(SERVER_MODE ? "Zamówienie zapisano na serwerze" : "Zamówienie zostało złożone");
  }

  function renderProductVisual(product) {
    if (product.imageData) {
      return `<div class="product-visual" style="background-image:url('${esc(product.imageData)}');background-size:cover;background-position:center"><span class="visual-token">${esc(product.visual || "ABW")}</span></div>`;
    }
    return `<div class="product-visual"><span class="visual-token">${esc(product.visual || "ABW")}</span></div>`;
  }

  function renderNotes() {
    const user = currentUser();
    const note = state.db.notes[user.id] || { text: "", updatedAt: 0 };
    $("tab-notes").innerHTML = `
      ${header("SYNC NOTE CORE", "Prywatny notatnik", `Notatki są przypisane do konta i automatycznie zapisywane ${SERVER_MODE ? "we wspólnej bazie serwera" : "w lokalnej bazie przeglądarki"} co kilka sekund.`)}
      <div class="notes-layout">
        <div class="module-panel note-editor">
          <div class="module-header">
            <div>
              <span class="module-kicker">AUTO-SAVE</span>
              <h2>Notatki agenta</h2>
              <p>Zmiany synchronizują się automatycznie z serwerem i są widoczne po zalogowaniu na innych urządzeniach.</p>
            </div>
          </div>
          <textarea id="privateNote" spellcheck="false">${esc(note.text)}</textarea>
          <div class="card-footer">
            <button class="primary-action" data-action="save-note" type="button">Zapisz teraz</button>
            <span id="noteStatus" class="mini-pill ok">Zapisano: ${esc(formatTime(note.updatedAt))}</span>
          </div>
        </div>
        <aside class="module-panel">
          <span class="module-kicker">SYNC STATUS</span>
          <h2>${SERVER_MODE ? "Serwerowa chmura ABW" : "Lokalna chmura ABW"}</h2>
          <p class="muted">${SERVER_MODE ? "Dane są synchronizowane przez serwer i dostępne po zalogowaniu na innych urządzeniach." : "Dane zostają w lokalnej bazie tej przeglądarki."}</p>
          <div class="status-row">
            <span class="mini-pill ok">${SERVER_MODE ? "SERVER SYNC" : "JSON STORE"}</span>
            <span class="mini-pill">Użytkownik: ${esc(user.nick)}</span>
            <span class="mini-pill">Auto-save: ${AUTOSAVE_MS / 1000}s</span>
          </div>
        </aside>
      </div>
    `;
    state.noteDirty = false;
  }

  function renderMap() {
    const visibleObjects = state.db.mapObjects.filter((object) => state.globe.layers[object.layer]);
    $("tab-map").innerHTML = `
      ${header("3D GLOBE CORE", "Mapa operacji oceanicznych", "Interaktywny globus 3D do planowania baz, tras, spotkań i jednostek. Przeciągnij globus, użyj rolki do przybliżenia.")}
      <div class="map-layout">
        <div class="globe-shell">
          <canvas id="globeCanvas" aria-label="Interaktywny globus 3D ABW"></canvas>
          <div class="globe-hint">Warstwy: wywiad, operacje, infrastruktura. Jednostki animują się po trasach operacyjnych.</div>
        </div>
        <aside class="module-panel">
          <div class="module-header">
            <div>
              <span class="module-kicker">LAYERS</span>
              <h2>Warstwy mapy</h2>
              <p>Włączaj i wyłączaj obiekty operacyjne.</p>
            </div>
          </div>
          <div class="layer-controls">
            ${Object.entries(LAYER_LABELS).map(([key, label]) => `
              <label class="layer-toggle">
                <input type="checkbox" data-action="toggle-layer" data-layer="${esc(key)}" ${state.globe.layers[key] ? "checked" : ""} />
                ${esc(label)}
              </label>
            `).join("")}
          </div>
          <h3>Obiekty</h3>
          <div class="object-list">
            ${visibleObjects.map(renderObjectRow).join("") || `<div class="empty-state">Włącz warstwę, aby zobaczyć obiekty.</div>`}
          </div>
        </aside>
      </div>
    `;
    initGlobe();
  }

  function renderObjectRow(object) {
    return `
      <div class="object-row">
        <span class="mini-pill">${esc(OBJECT_TYPES[object.type] || object.type)}</span>
        <strong>${esc(object.name)}</strong>
        <small>${esc(LAYER_LABELS[object.layer] || object.layer)}</small>
      </div>
    `;
  }

  function visibleMissions() {
    const user = currentUser();
    if (!user) return [];
    return state.db.missions.filter((mission) => isAdmin() || mission.assignedTo.includes(user.id));
  }

  function hasMissionAccess(mission) {
    const user = currentUser();
    return Boolean(user && rankIndex(user.rank) >= rankIndex(mission.minRank));
  }

  function renderMissions() {
    const missions = visibleMissions();
    $("tab-missions").innerHTML = `
      ${header("MISSION CORE", "System misji", "Misje są przydzielane przez administratora, mają cele operacyjne, status, próg rangi i nagrody za wykonanie.")}
      <div class="mission-list">
        ${missions.map(renderMissionCard).join("") || `<div class="empty-state">Brak misji przypisanych do tego konta.</div>`}
      </div>
    `;
  }

  function renderMissionCard(mission) {
    const allowed = hasMissionAccess(mission);
    const locked = allowed ? "" : "locked";
    const buttons = allowed
      ? `
        <button class="ghost-action" data-action="mission-start" data-id="${esc(mission.id)}" ${mission.status !== "aktywna" ? "disabled" : ""}>Rozpocznij operację</button>
        <button class="primary-action" data-action="mission-complete" data-id="${esc(mission.id)}" ${mission.status !== "w trakcie" ? "disabled" : ""}>Zakończ misję</button>
        <button class="danger-action" data-action="mission-fail" data-id="${esc(mission.id)}" ${["wykonana", "nieudana"].includes(mission.status) ? "disabled" : ""}>Oznacz jako nieudaną</button>
      `
      : `<span class="mini-pill danger">Wymagana ranga: ${esc(mission.minRank)}</span>`;
    return `
      <article class="mission-card ${locked}">
        <div class="card-footer">
          <span class="mini-pill ${mission.status === "wykonana" ? "ok" : mission.status === "nieudana" ? "danger" : mission.status === "w trakcie" ? "warn" : ""}">${esc(mission.status)}</span>
          <span class="mini-pill">Dostęp od: ${esc(mission.minRank)}</span>
        </div>
        <h3>${esc(mission.title)}</h3>
        <p>${esc(mission.description)}</p>
        <ul class="objectives">
          ${mission.objectives.map((objective) => `<li>${esc(objective)}</li>`).join("")}
        </ul>
        <div class="card-footer">
          <span class="mini-pill ok">+${Number(mission.expReward)} EXP</span>
        </div>
        <div class="inline-actions">${buttons}</div>
      </article>
    `;
  }

  function renderEvents() {
    $("tab-events").innerHTML = `
      ${header("GLOBAL EVENTS CORE", "Dynamiczne zdarzenia systemowe", "Alarmy oceaniczne, incydenty nieznanych jednostek i misje awaryjne uruchamia administrator.")}
      <div class="event-list">
        ${state.db.events.map(renderEventCard).join("") || `<div class="empty-state">Brak zdarzeń w Global Events Core.</div>`}
      </div>
    `;
  }

  function renderEventCard(event) {
    return `
      <article class="event-card ${event.severity === "red" ? "critical" : ""}">
        <div class="card-footer">
          <span class="mini-pill ${event.severity === "red" ? "danger" : "warn"}">${esc(event.severity === "red" ? "KOD CZERWONY" : "KOD ŻÓŁTY")}</span>
          <span class="mini-pill">${esc(event.type)}</span>
          <span class="mini-pill">${esc(formatTime(event.createdAt))}</span>
        </div>
        <h3>${esc(event.title)}</h3>
        <p>${esc(event.body)}</p>
      </article>
    `;
  }

  function renderAdmin() {
    if (!isAdmin()) {
      $("tab-admin").innerHTML = `<div class="empty-state">Dostęp do Admin Core wymaga roli administratora.</div>`;
      return;
    }

    const nav = [
      ["users", "Użytkownicy"],
      ["ranks", "Rangi"],
      ["shop", "Sklep"],
      ["announcements", "Ogłoszenia"],
      ["info", "Informacje"],
      ["map", "Mapa"],
      ["missions", "Misje"],
      ["events", "Zdarzenia"],
      ["notes", "Notatnik"],
      ["logs", "Logi"],
    ];

    $("tab-admin").innerHTML = `
      ${header("ADMIN CORE", "Panel administratora", "Osobny, czerwono-złoty rdzeń do kontroli kont, zasobów, ogłoszeń, mapy, notatek, misji i logów.", `<button class="danger-action" data-action="admin-logout">Wyloguj</button>`)}
      <div class="admin-layout">
        <aside class="admin-nav">
          ${nav.map(([key, label]) => `<button class="${state.activeAdminTab === key ? "active" : ""}" data-action="admin-tab" data-tab="${esc(key)}">${esc(label)}</button>`).join("")}
        </aside>
        <div id="adminContent">${renderAdminContent()}</div>
      </div>
    `;
  }

  function renderAdminContent() {
    const renderers = {
      users: renderAdminUsers,
      ranks: renderAdminRanks,
      shop: renderAdminShop,
      announcements: renderAdminAnnouncements,
      info: renderAdminInfo,
      map: renderAdminMap,
      missions: renderAdminMissions,
      events: renderAdminEvents,
      notes: renderAdminNotes,
      logs: renderAdminLogs,
    };
    return renderers[state.activeAdminTab]?.() || "";
  }

  function renderAdminUsers() {
    return `
      <div class="admin-block">
        <h3 id="adminUserFormTitle">Dodawanie konta</h3>
        <form id="adminUserForm" class="form-grid">
          <label>Imię i nazwisko<input name="fullName" required placeholder="Antoni Koral" /></label>
          <label>Nick<input name="nick" required placeholder="koral" /></label>
          <label>Hasło<input name="password" placeholder="hasło konta online" /></label>
          <label>Numer odznaki<input name="badge" required placeholder="ABW-0000" /></label>
          <label>Ranga<select name="rank">${RANKS.map((rank) => `<option>${esc(rank)}</option>`).join("")}</select></label>
          <label>Rola<select name="role"><option value="agent">Agent</option><option value="admin">Admin</option></select></label>
          <div class="full inline-actions">
            <button id="adminUserSubmit" class="primary-action" type="submit">Dodaj konto</button>
            <button id="adminUserCancel" class="ghost-action hidden" type="button" data-action="admin-cancel-edit-user">Anuluj edycję</button>
          </div>
        </form>
      </div>
      <div class="admin-block" style="margin-top:14px">
        <h3>Rejestr użytkowników</h3>
        <div class="table-wrap">
          <table class="data-table">
            <thead><tr><th>Agent</th><th>Nick</th><th>Ranga</th><th>Status</th><th>Akcje</th></tr></thead>
            <tbody>
              ${state.db.users.map((user) => `
                <tr>
                  <td>${esc(user.fullName)}<br><span class="muted">${esc(user.badge)}</span></td>
                  <td>${esc(user.nick)}<br><span class="muted">${esc(user.role)}</span></td>
                  <td>${esc(user.rank)}</td>
                  <td>${renderUserStatus(user)}</td>
                  <td><div class="row-actions">
                    <button data-action="admin-edit-user" data-id="${esc(user.id)}">Edytuj</button>
                    <button data-action="${user.disabled ? "admin-unblock-user" : "admin-block-user"}" data-id="${esc(user.id)}">${user.disabled ? "Odblokuj" : "Zablokuj"}</button>
                    <button data-action="admin-unlock-user" data-id="${esc(user.id)}">Reset blokady</button>
                    <button data-action="admin-delete-user" data-id="${esc(user.id)}">Usuń</button>
                  </div></td>
                </tr>
              `).join("")}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  function renderUserStatus(user) {
    if (user.disabled) return `<span class="mini-pill danger">Zablokowane przez admina</span>`;
    if (user.lockedUntil && user.lockedUntil > Date.now()) return `<span class="mini-pill danger">Blokada ${esc(timeLeft(user.lockedUntil))}</span>`;
    return `<span class="mini-pill ok">Aktywne</span>`;
  }

  function renderAdminRanks() {
    return `
      <div class="admin-block">
        <h3>Hierarchia rang ABW</h3>
        <div class="rank-ladder">${RANKS.map((rank) => `<div>${esc(rank)}</div>`).join("")}</div>
      </div>
    `;
  }

  function renderAdminShop() {
    return `
      <div class="admin-block">
        <h3>Sklep - dodawanie i edycja produktów</h3>
        <form id="adminProductForm" class="form-grid">
          <label>Nazwa<input name="name" required /></label>
          <label>Kategoria<select name="category">${Object.entries(CATEGORY_LABELS).filter(([key]) => key !== "all").map(([key, label]) => `<option value="${esc(key)}">${esc(label)}</option>`).join("")}</select></label>
          <label>Status<input name="status" required /></label>
          <label>Token obrazu<input name="visual" maxlength="8" placeholder="np. MW-B" /></label>
          <label>Upload zdjęcia<input name="image" type="file" accept="image/*" /></label>
          <label class="full">Opis<textarea name="description" required></textarea></label>
          <div class="full inline-actions">
            <button class="primary-action" type="submit">Zapisz produkt</button>
            <button class="ghost-action" type="reset" data-action="reset-product-form">Wyczyść formularz</button>
          </div>
        </form>
      </div>
      <div class="product-grid" style="margin-top:14px">
        ${state.db.products.map((product) => `
          <article class="product-card">
            ${renderProductVisual(product)}
            <h3>${esc(product.name)}</h3>
            <p>${esc(product.description)}</p>
            <div class="card-footer">
              <span class="mini-pill">${esc(product.status)}</span>
            </div>
            <div class="row-actions">
              <button data-action="admin-edit-product" data-id="${esc(product.id)}">Edytuj</button>
              <button data-action="admin-delete-product" data-id="${esc(product.id)}">Usuń</button>
            </div>
          </article>
        `).join("")}
      </div>
    `;
  }

  function renderAdminAnnouncements() {
    return `
      <div class="admin-block">
        <h3>Ogłoszenia z czasem wygaśnięcia</h3>
        <form id="adminAnnouncementForm" class="form-grid">
          <label>Tytuł<input name="title" required /></label>
          <label>Wygasa za minut<input name="minutes" type="number" min="1" value="30" required /></label>
          <label class="full">Treść<textarea name="body" required></textarea></label>
          <div class="full"><button class="primary-action" type="submit">Publikuj ogłoszenie</button></div>
        </form>
      </div>
      <div class="announcement-list" style="margin-top:14px">
        ${state.db.announcements.map((announcement) => `
          <article class="announcement-card">
            <h3>${esc(announcement.title)}</h3>
            <p>${esc(announcement.body)}</p>
            <div class="card-footer">
              <span class="mini-pill warn">Wygasa za ${esc(timeLeft(announcement.expiresAt))}</span>
              <button class="danger-action" data-action="admin-delete-announcement" data-id="${esc(announcement.id)}">Usuń</button>
            </div>
          </article>
        `).join("") || `<div class="empty-state">Brak ogłoszeń.</div>`}
      </div>
    `;
  }

  function renderAdminInfo() {
    return `
      <div class="admin-block">
        <h3>Informacje systemowe</h3>
        <form id="adminInfoForm" class="form-grid">
          <label>Tytuł<input name="title" required /></label>
          <label>Waga<select name="severity"><option value="ok">OK</option><option value="warn">Ostrzeżenie</option><option value="danger">Alarm</option></select></label>
          <label class="full">Treść<textarea name="body" required></textarea></label>
          <div class="full inline-actions">
            <button class="primary-action" type="submit">Zapisz komunikat</button>
            <button class="ghost-action" type="reset" data-action="reset-info-form">Wyczyść formularz</button>
          </div>
        </form>
      </div>
      <div class="info-list" style="margin-top:14px">
        ${state.db.info.map((item) => `
          <article class="info-line">
            <div>
              <h3>${esc(item.title)}</h3>
              <p>${esc(item.body)}</p>
              <div class="card-footer">
                <span class="mini-pill ${item.severity === "danger" ? "danger" : item.severity === "warn" ? "warn" : "ok"}">${esc(item.severity)}</span>
                <button class="ghost-action" data-action="admin-edit-info" data-id="${esc(item.id)}">Edytuj</button>
                <button class="danger-action" data-action="admin-delete-info" data-id="${esc(item.id)}">Usuń</button>
              </div>
            </div>
          </article>
        `).join("")}
      </div>
    `;
  }

  function renderAdminMap() {
    return `
      <div class="admin-block">
        <h3>Mapa - pełna kontrola obiektów</h3>
        <form id="adminMapForm" class="form-grid">
          <label>Nazwa<input name="name" required /></label>
          <label>Typ<select name="type">${Object.entries(OBJECT_TYPES).map(([key, label]) => `<option value="${esc(key)}">${esc(label)}</option>`).join("")}</select></label>
          <label>Warstwa<select name="layer">${Object.entries(LAYER_LABELS).map(([key, label]) => `<option value="${esc(key)}">${esc(label)}</option>`).join("")}</select></label>
          <label>Szerokość geogr.<input name="lat" required type="number" step="0.01" /></label>
          <label>Długość geogr.<input name="lon" required type="number" step="0.01" /></label>
          <label>Lat 2 dla trasy<input name="lat2" type="number" step="0.01" /></label>
          <label>Lon 2 dla trasy<input name="lon2" type="number" step="0.01" /></label>
          <div class="full inline-actions">
            <button class="primary-action" type="submit">Zapisz obiekt</button>
            <button class="ghost-action" type="reset" data-action="reset-map-form">Wyczyść formularz</button>
          </div>
        </form>
      </div>
      <div class="admin-block" style="margin-top:14px">
        <h3>Obiekty mapy</h3>
        <div class="object-list">
          ${state.db.mapObjects.map((object) => `
            <div class="object-row">
              <span class="mini-pill">${esc(OBJECT_TYPES[object.type] || object.type)}</span>
              <strong>${esc(object.name)}</strong>
              <div class="row-actions">
                <button data-action="admin-edit-map" data-id="${esc(object.id)}">Edytuj</button>
                <button data-action="admin-delete-map" data-id="${esc(object.id)}">Usuń</button>
              </div>
            </div>
          `).join("")}
        </div>
      </div>
    `;
  }

  function renderAdminMissions() {
    return `
      <div class="admin-block">
        <h3>Misje - przydziały i nagrody</h3>
        <form id="adminMissionForm" class="form-grid">
          <label>Tytuł<input name="title" required /></label>
          <label>Minimalna ranga<select name="minRank">${RANKS.map((rank) => `<option>${esc(rank)}</option>`).join("")}</select></label>
          <label>Status<select name="status"><option>aktywna</option><option>w trakcie</option><option>wykonana</option><option>nieudana</option></select></label>
          <label>Przypisz do<select name="assignedTo" multiple size="4">${state.db.users.map((user) => `<option value="${esc(user.id)}">${esc(user.fullName)} (${esc(user.nick)})</option>`).join("")}</select></label>
          <label>EXP<input name="expReward" required type="number" min="0" /></label>
          <label class="full">Opis<textarea name="description" required></textarea></label>
          <label class="full">Cele operacyjne<textarea name="objectives" placeholder="Jeden cel w jednej linii" required></textarea></label>
          <div class="full inline-actions">
            <button class="primary-action" type="submit">Zapisz misję</button>
            <button class="ghost-action" type="reset" data-action="reset-mission-form">Wyczyść formularz</button>
          </div>
        </form>
      </div>
      <div class="mission-list" style="margin-top:14px">
        ${state.db.missions.map((mission) => `
          <article class="mission-card">
            <div class="card-footer">
              <span class="mini-pill">${esc(mission.status)}</span>
              <span class="mini-pill">Od: ${esc(mission.minRank)}</span>
            </div>
            <h3>${esc(mission.title)}</h3>
            <p>${esc(mission.description)}</p>
            <div class="row-actions">
              <button data-action="admin-edit-mission" data-id="${esc(mission.id)}">Edytuj</button>
              <button data-action="admin-delete-mission" data-id="${esc(mission.id)}">Usuń</button>
            </div>
          </article>
        `).join("")}
      </div>
    `;
  }

  function renderAdminEvents() {
    return `
      <div class="admin-block">
        <h3 id="adminEventFormTitle">Utwórz zdarzenie</h3>
        <form id="adminEventForm" class="form-grid">
          <label>Typ zdarzenia
            <select name="type">
              <option value="alarm oceaniczny">Alarm oceaniczny</option>
              <option value="incydent nieznanej jednostki">Incydent nieznanej jednostki</option>
              <option value="misja awaryjna">Misja awaryjna</option>
              <option value="event admina">Event admina</option>
            </select>
          </label>
          <label>Kod
            <select name="severity">
              <option value="yellow">KOD ŻÓŁTY</option>
              <option value="red">KOD CZERWONY</option>
            </select>
          </label>
          <label class="full">Tytuł<input name="title" required /></label>
          <label class="full">Treść<textarea name="body" required></textarea></label>
          <div class="full inline-actions">
            <button id="adminEventSubmit" class="primary-action" type="submit">Utwórz i uruchom</button>
            <button id="adminEventCancel" class="ghost-action hidden" type="button" data-action="admin-cancel-edit-event">Anuluj edycję</button>
          </div>
        </form>
      </div>
      <div class="event-list" style="margin-top:14px">
        ${state.db.events.map((event) => `
          <article class="event-card ${event.severity === "red" ? "critical" : ""}">
            <div class="card-footer">
              <span class="mini-pill ${event.severity === "red" ? "danger" : "warn"}">${event.severity === "red" ? "KOD CZERWONY" : "KOD ŻÓŁTY"}</span>
              <span class="mini-pill">${esc(event.type)}</span>
              <span class="mini-pill">${esc(formatTime(event.createdAt))}</span>
            </div>
            <h3>${esc(event.title)}</h3>
            <p>${esc(event.body)}</p>
            <div class="row-actions">
              <button data-action="admin-edit-event" data-id="${esc(event.id)}">Edytuj</button>
              <button data-action="admin-delete-event" data-id="${esc(event.id)}">Usuń</button>
            </div>
          </article>
        `).join("") || `<div class="empty-state">Brak zdarzeń. Administrator może utworzyć pierwsze powyżej.</div>`}
      </div>
    `;
  }

  function renderAdminNotes() {
    return `
      <div class="admin-block">
        <h3>Notatnik - widok administratora</h3>
        <div class="admin-list">
          ${state.db.users.map((user) => {
            const note = state.db.notes[user.id] || { text: "", updatedAt: 0 };
            return `
              <div class="module-panel">
                <div class="module-header">
                  <div>
                    <span class="module-kicker">${esc(user.nick)} // ${esc(user.badge)}</span>
                    <h2>${esc(user.fullName)}</h2>
                    <p>Ostatni zapis: ${esc(formatTime(note.updatedAt))}</p>
                  </div>
                </div>
                <textarea data-note-user="${esc(user.id)}">${esc(note.text)}</textarea>
                <div class="card-footer">
                  <button class="primary-action" data-action="admin-save-note" data-id="${esc(user.id)}">Zapisz</button>
                  <button class="danger-action" data-action="admin-delete-note" data-id="${esc(user.id)}">Usuń treść</button>
                </div>
              </div>
            `;
          }).join("")}
        </div>
      </div>
    `;
  }

  function renderAdminLogs() {
    const logs = filteredLogs();
    return `
      <div class="admin-block">
        <h3>System Core - pełna historia działań</h3>
        <div class="form-grid">
          <label>Filtr użytkownika<input id="logFilterUser" value="${esc(state.logFilters.user)}" placeholder="nick lub system" /></label>
          <label>Filtr akcji<input id="logFilterAction" value="${esc(state.logFilters.action)}" placeholder="np. logowanie" /></label>
          <label>Data<input id="logFilterDate" value="${esc(state.logFilters.date)}" type="date" /></label>
          <div class="inline-actions">
            <button class="ghost-action" data-action="export-db">Eksport JSON</button>
            <button class="danger-action" data-action="clear-logs">Wyczyść logi</button>
          </div>
        </div>
      </div>
      <div class="admin-block" style="margin-top:14px">
        <div class="table-wrap">
          <table class="data-table">
            <thead><tr><th>Czas</th><th>Użytkownik</th><th>Akcja</th><th>Szczegóły</th></tr></thead>
            <tbody>
              ${logs.map((log) => `
                <tr>
                  <td>${esc(formatTime(log.time))}</td>
                  <td>${esc(log.nick)}</td>
                  <td>${esc(log.action)}</td>
                  <td>${esc(log.detail)}</td>
                </tr>
              `).join("") || `<tr><td colspan="4">Brak logów dla filtrów.</td></tr>`}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  function filteredLogs() {
    return state.db.logs.filter((log) => {
      const userMatch = !state.logFilters.user || log.nick.toLowerCase().includes(state.logFilters.user.toLowerCase());
      const actionMatch = !state.logFilters.action || log.action.toLowerCase().includes(state.logFilters.action.toLowerCase());
      const dateMatch =
        !state.logFilters.date ||
        new Date(log.time).toISOString().slice(0, 10) === state.logFilters.date;
      return userMatch && actionMatch && dateMatch;
    });
  }

  async function handleFormSubmit(event) {
    if (!event.target.id) return;
    const id = event.target.id;
    if (!id.startsWith("admin")) return;
    event.preventDefault();
    if (!isAdmin()) return;

    if (id === "adminUserForm") await handleAdminUserForm(event.target);
    if (id === "adminProductForm") await handleAdminProductForm(event.target);
    if (id === "adminAnnouncementForm") handleAdminAnnouncementForm(event.target);
    if (id === "adminInfoForm") handleAdminInfoForm(event.target);
    if (id === "adminMapForm") handleAdminMapForm(event.target);
    if (id === "adminMissionForm") handleAdminMissionForm(event.target);
    if (id === "adminEventForm") handleAdminEventForm(event.target);
  }

  function handleActionClick(event) {
    const target = event.target.closest("[data-action]");
    if (!target) return;
    const action = target.dataset.action;
    const id = target.dataset.id;

    if (action === "filter-shop") {
      state.activeCategory = target.dataset.category;
      const user = currentUser();
      state.db.configuration[user.id] = {
        ...(state.db.configuration[user.id] || {}),
        shopCategory: state.activeCategory,
      };
      saveDb();
      renderShop();
    }
    if (action === "add-to-cart") changeCartQuantity(id, 1);
    if (action === "cart-increase") changeCartQuantity(id, 1);
    if (action === "cart-decrease") changeCartQuantity(id, -1);
    if (action === "cart-remove") removeFromCart(id);
    if (action === "place-order") placeOrder();
    if (action === "save-note") autosaveNote(true);
    if (action === "toggle-layer") {
      state.globe.layers[target.dataset.layer] = target.checked;
      const user = currentUser();
      state.db.settings[user.id] = {
        ...(state.db.settings[user.id] || {}),
        mapLayers: { ...state.globe.layers },
      };
      saveDb();
      renderMap();
    }
    if (action === "mission-start") updateMission(id, "w trakcie");
    if (action === "mission-complete") completeMission(id);
    if (action === "mission-fail") updateMission(id, "nieudana");
    if (action === "admin-logout") logout("manual");
    if (action === "admin-tab") {
      state.activeAdminTab = target.dataset.tab;
      renderAdmin();
    }
    if (action === "admin-block-user") setUserDisabled(id, true);
    if (action === "admin-unblock-user") setUserDisabled(id, false);
    if (action === "admin-unlock-user") unlockUser(id);
    if (action === "admin-edit-user") editUser(id);
    if (action === "admin-cancel-edit-user") cancelUserEdit();
    if (action === "admin-delete-user") deleteUser(id);
    if (action === "admin-edit-product") editProduct(id);
    if (action === "admin-delete-product") deleteById("products", id, "produkt");
    if (action === "admin-delete-announcement") deleteById("announcements", id, "ogłoszenie");
    if (action === "admin-edit-info") editInfo(id);
    if (action === "admin-delete-info") deleteById("info", id, "komunikat");
    if (action === "admin-edit-map") editMapObject(id);
    if (action === "admin-delete-map") deleteById("mapObjects", id, "obiekt mapy");
    if (action === "admin-save-note") saveAdminNote(id);
    if (action === "admin-delete-note") deleteAdminNote(id);
    if (action === "admin-edit-mission") editMission(id);
    if (action === "admin-delete-mission") deleteById("missions", id, "misję");
    if (action === "admin-edit-event") editAdminEvent(id);
    if (action === "admin-delete-event") deleteById("events", id, "zdarzenie");
    if (action === "admin-cancel-edit-event") cancelEventEdit();
    if (action === "export-db") exportDb();
    if (action === "clear-logs") clearLogs();
    if (action?.startsWith("reset-")) {
      window.setTimeout(() => {
        target.closest("form")?.removeAttribute("data-edit-id");
      }, 0);
    }
  }

  function handleDocumentInput(event) {
    if (event.target.id === "privateNote") {
      state.noteDirty = true;
      const status = $("noteStatus");
      if (status) {
        status.textContent = "Zmiany oczekują na synchronizację";
        status.className = "mini-pill warn";
      }
      if (state.noteSaveTimer) window.clearTimeout(state.noteSaveTimer);
      state.noteSaveTimer = window.setTimeout(() => autosaveNote(false), AUTOSAVE_MS);
    }
    if (event.target.id === "logFilterUser") {
      state.logFilters.user = event.target.value;
      renderAdmin();
    }
    if (event.target.id === "logFilterAction") {
      state.logFilters.action = event.target.value;
      renderAdmin();
    }
    if (event.target.id === "logFilterDate") {
      state.logFilters.date = event.target.value;
      renderAdmin();
    }
  }

  function autosaveNote(force) {
    const textarea = $("privateNote");
    const user = currentUser();
    if (!textarea || !user || (!force && !state.noteDirty)) return;
    state.db.notes[user.id] = {
      text: textarea.value,
      updatedAt: Date.now(),
    };
    state.noteDirty = false;
    saveDb();
    const status = $("noteStatus");
    if (status) {
      status.textContent = `Zapisano: ${formatTime(state.db.notes[user.id].updatedAt)}`;
      status.className = "mini-pill ok";
    }
    if (force) showToast("Notatnik zsynchronizowany z serwerem");
  }

  async function handleAdminUserForm(form) {
    const data = Object.fromEntries(new FormData(form));
    const editId = form.dataset.editId;
    const existingUser = editId ? findUser(editId) : null;
    if (state.db.users.some((user) => user.id !== editId && user.nick.toLowerCase() === data.nick.toLowerCase())) {
      showToast("Nick jest już zajęty");
      return;
    }

    const payload = {
      fullName: data.fullName.trim(),
      nick: data.nick.trim(),
      password: data.password.trim(),
      rank: data.rank,
      badge: data.badge.trim(),
      role: data.role,
    };
    if (!existingUser && !payload.password) {
      showToast("Podaj hasło dla nowego konta");
      return;
    }

    try {
      const result = existingUser
        ? await window.ABWApi.updateUser(existingUser.id, payload)
        : await window.ABWApi.createUser(payload);
      const index = state.db.users.findIndex((user) => user.id === result.user.id);
      if (index >= 0) state.db.users[index] = result.user;
      else state.db.users.push(result.user);
      logAction(existingUser ? "admin: edycja konta" : "admin: dodano konto", result.user.nick);
      showToast(existingUser ? "Zmiany konta zapisane" : "Konto dodane");
      renderIdentity();
      renderAdmin();
    } catch (error) {
      showToast(error.message || "Nie udało się zapisać konta");
    }
  }

  async function handleAdminProductForm(form) {
    const data = Object.fromEntries(new FormData(form));
    const editId = form.dataset.editId;
    const file = form.elements.image.files[0];
    const imageData = file ? await readFileAsDataUrl(file) : "";
    const payload = {
      name: data.name.trim(),
      description: data.description.trim(),
      category: data.category,
      status: data.status.trim(),
      visual: data.visual.trim() || "ABW",
    };
    if (editId) {
      const product = state.db.products.find((item) => item.id === editId);
      if (product) Object.assign(product, payload, imageData ? { imageData } : {});
      logAction("admin: edycja produktu", payload.name);
    } else {
      state.db.products.push({ id: uid("prd"), ...payload, imageData });
      logAction("admin: dodano produkt", payload.name);
    }
    saveDb();
    showToast("Produkt zapisany");
    renderAdmin();
  }

  function handleAdminAnnouncementForm(form) {
    const data = Object.fromEntries(new FormData(form));
    state.db.announcements.unshift({
      id: uid("ann"),
      title: data.title.trim(),
      body: data.body.trim(),
      createdAt: Date.now(),
      expiresAt: Date.now() + Number(data.minutes || 30) * 60000,
    });
    logAction("admin: ogłoszenie", data.title);
    saveDb();
    showToast("Ogłoszenie opublikowane");
    renderAdmin();
  }

  function handleAdminInfoForm(form) {
    const data = Object.fromEntries(new FormData(form));
    const editId = form.dataset.editId;
    if (editId) {
      const item = state.db.info.find((entry) => entry.id === editId);
      if (item) Object.assign(item, { title: data.title.trim(), body: data.body.trim(), severity: data.severity });
      logAction("admin: edycja informacji", data.title);
    } else {
      state.db.info.push({ id: uid("info"), title: data.title.trim(), body: data.body.trim(), severity: data.severity });
      logAction("admin: dodano informację", data.title);
    }
    saveDb();
    showToast("Komunikat zapisany");
    renderAdmin();
  }

  function handleAdminMapForm(form) {
    const data = Object.fromEntries(new FormData(form));
    const editId = form.dataset.editId;
    const payload = {
      name: data.name.trim(),
      type: data.type,
      layer: data.layer,
      lat: Number(data.lat),
      lon: Number(data.lon),
      lat2: data.lat2 === "" ? undefined : Number(data.lat2),
      lon2: data.lon2 === "" ? undefined : Number(data.lon2),
    };
    if (editId) {
      const object = state.db.mapObjects.find((item) => item.id === editId);
      if (object) Object.assign(object, payload);
      logAction("admin: edycja mapy", payload.name);
    } else {
      state.db.mapObjects.push({ id: uid("map"), ...payload });
      logAction("admin: dodano obiekt mapy", payload.name);
    }
    saveDb();
    showToast("Obiekt mapy zapisany");
    renderAdmin();
  }

  function handleAdminMissionForm(form) {
    const data = Object.fromEntries(new FormData(form));
    const editId = form.dataset.editId;
    const assignedTo = Array.from(form.elements.assignedTo.selectedOptions).map((option) => option.value);
    const payload = {
      title: data.title.trim(),
      description: data.description.trim(),
      assignedTo,
      minRank: data.minRank,
      status: data.status,
      objectives: data.objectives
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean),
      expReward: Number(data.expReward || 0),
    };
    if (editId) {
      const mission = state.db.missions.find((item) => item.id === editId);
      if (mission) Object.assign(mission, payload);
      logAction("admin: edycja misji", payload.title);
    } else {
      state.db.missions.push({ id: uid("msn"), ...payload, rewardedUsers: [] });
      logAction("admin: dodano misję", payload.title);
    }
    saveDb();
    showToast("Misja zapisana");
    renderAdmin();
  }

  function handleAdminEventForm(form) {
    const data = Object.fromEntries(new FormData(form));
    const editId = form.dataset.editId;
    const payload = {
      type: data.type,
      severity: data.severity === "red" ? "red" : "yellow",
      title: data.title.trim(),
      body: data.body.trim(),
    };
    if (editId) {
      const event = state.db.events.find((item) => item.id === editId);
      if (event) Object.assign(event, payload);
      logAction("admin: edycja zdarzenia", payload.title);
      showToast("Zdarzenie zapisane");
    } else {
      const event = {
        id: uid("evt"),
        ...payload,
        createdAt: Date.now(),
      };
      state.db.events.unshift(event);
      state.db.events = state.db.events.slice(0, 100);
      logAction("admin: utworzono zdarzenie", `${event.title} (${event.severity})`);
      showEventPopup(event);
      if (event.severity === "red") activateAlarmMode();
      showToast("Zdarzenie utworzone i uruchomione");
    }
    saveDb();
    renderAdmin();
  }

  function editUser(id) {
    const user = findUser(id);
    const form = $("adminUserForm");
    if (!user || !form) return;
    form.dataset.editId = user.id;
    form.elements.fullName.value = user.fullName;
    form.elements.nick.value = user.nick;
    form.elements.password.value = "";
    form.elements.password.placeholder = "pozostaw puste, aby zachować";
    form.elements.badge.value = user.badge;
    form.elements.rank.value = user.rank;
    form.elements.role.value = user.role;
    $("adminUserFormTitle").textContent = `Edycja konta: ${user.nick}`;
    $("adminUserSubmit").textContent = "Zapisz zmiany";
    $("adminUserCancel").classList.remove("hidden");
    form.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function cancelUserEdit() {
    const form = $("adminUserForm");
    if (!form) return;
    form.reset();
    form.removeAttribute("data-edit-id");
    form.elements.password.placeholder = "hasło konta online";
    $("adminUserFormTitle").textContent = "Dodawanie konta";
    $("adminUserSubmit").textContent = "Dodaj konto";
    $("adminUserCancel").classList.add("hidden");
  }

  async function setUserDisabled(id, disabled) {
    if (id === currentUser()?.id && disabled) {
      showToast("Nie blokuj aktywnego konta administratora");
      return;
    }
    const user = findUser(id);
    if (!user) return;
    try {
      const result = await window.ABWApi.updateUser(id, { disabled });
      Object.assign(user, result.user);
      logAction(disabled ? "admin: blokada konta" : "admin: odblokowanie konta", user.nick);
      renderAdmin();
    } catch (error) {
      showToast(error.message);
    }
  }

  async function unlockUser(id) {
    const user = findUser(id);
    if (!user) return;
    try {
      const result = await window.ABWApi.updateUser(id, { unlock: true });
      Object.assign(user, result.user);
      logAction("admin: reset blokady", user.nick);
      renderAdmin();
    } catch (error) {
      showToast(error.message);
    }
  }

  async function deleteUser(id) {
    if (id === currentUser()?.id) {
      showToast("Nie można usunąć aktywnego konta");
      return;
    }
    const user = findUser(id);
    if (!user) return;
    try {
      await window.ABWApi.deleteUser(id);
      state.db.users = state.db.users.filter((item) => item.id !== id);
      delete state.db.notes[id];
      delete state.db.carts[id];
      delete state.db.settings[id];
      delete state.db.files[id];
      delete state.db.configuration[id];
      state.db.orders = state.db.orders.filter((order) => order.userId !== id);
      state.db.missions.forEach((mission) => {
        mission.assignedTo = mission.assignedTo.filter((userId) => userId !== id);
      });
      logAction("admin: usunięto konto", user.nick);
      saveDb();
      renderAdmin();
    } catch (error) {
      showToast(error.message);
    }
  }

  function editProduct(id) {
    const product = state.db.products.find((item) => item.id === id);
    const form = $("adminProductForm");
    if (!product || !form) return;
    form.dataset.editId = product.id;
    form.elements.name.value = product.name;
    form.elements.description.value = product.description;
    form.elements.category.value = product.category;
    form.elements.status.value = product.status;
    form.elements.visual.value = product.visual;
    showToast("Produkt załadowany do formularza");
  }

  function editInfo(id) {
    const item = state.db.info.find((entry) => entry.id === id);
    const form = $("adminInfoForm");
    if (!item || !form) return;
    form.dataset.editId = item.id;
    form.elements.title.value = item.title;
    form.elements.body.value = item.body;
    form.elements.severity.value = item.severity;
    showToast("Komunikat załadowany do formularza");
  }

  function editMapObject(id) {
    const object = state.db.mapObjects.find((entry) => entry.id === id);
    const form = $("adminMapForm");
    if (!object || !form) return;
    form.dataset.editId = object.id;
    form.elements.name.value = object.name;
    form.elements.type.value = object.type;
    form.elements.layer.value = object.layer;
    form.elements.lat.value = object.lat;
    form.elements.lon.value = object.lon;
    form.elements.lat2.value = object.lat2 ?? "";
    form.elements.lon2.value = object.lon2 ?? "";
    showToast("Obiekt mapy załadowany do formularza");
  }

  function editMission(id) {
    const mission = state.db.missions.find((entry) => entry.id === id);
    const form = $("adminMissionForm");
    if (!mission || !form) return;
    form.dataset.editId = mission.id;
    form.elements.title.value = mission.title;
    form.elements.description.value = mission.description;
    form.elements.minRank.value = mission.minRank;
    form.elements.status.value = mission.status;
    form.elements.expReward.value = mission.expReward;
    form.elements.objectives.value = mission.objectives.join("\n");
    Array.from(form.elements.assignedTo.options).forEach((option) => {
      option.selected = mission.assignedTo.includes(option.value);
    });
    showToast("Misja załadowana do formularza");
  }

  function editAdminEvent(id) {
    const event = state.db.events.find((item) => item.id === id);
    const form = $("adminEventForm");
    if (!event || !form) return;
    form.dataset.editId = event.id;
    form.elements.type.value = event.type;
    form.elements.severity.value = event.severity;
    form.elements.title.value = event.title;
    form.elements.body.value = event.body;
    $("adminEventFormTitle").textContent = `Edycja zdarzenia: ${event.title}`;
    $("adminEventSubmit").textContent = "Zapisz zmiany";
    $("adminEventCancel").classList.remove("hidden");
    form.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function cancelEventEdit() {
    const form = $("adminEventForm");
    if (!form) return;
    form.reset();
    form.removeAttribute("data-edit-id");
    $("adminEventFormTitle").textContent = "Utwórz zdarzenie";
    $("adminEventSubmit").textContent = "Utwórz i uruchom";
    $("adminEventCancel").classList.add("hidden");
  }

  function deleteById(collection, id, label) {
    const list = state.db[collection];
    if (!Array.isArray(list)) return;
    state.db[collection] = list.filter((item) => item.id !== id);
    logAction(`admin: usunięto ${label}`, id);
    saveDb();
    if (state.activeTab === "admin") renderAdmin();
  }

  function saveAdminNote(id) {
    const textarea = document.querySelector(`[data-note-user="${CSS.escape(id)}"]`);
    if (!textarea) return;
    state.db.notes[id] = { text: textarea.value, updatedAt: Date.now() };
    logAction("admin: edycja notatki", findUser(id)?.nick || id);
    saveDb();
    showToast("Notatka użytkownika zapisana");
    renderAdmin();
  }

  function deleteAdminNote(id) {
    state.db.notes[id] = { text: "", updatedAt: Date.now() };
    logAction("admin: usunięto notatkę", findUser(id)?.nick || id);
    saveDb();
    renderAdmin();
  }

  function clearLogs() {
    state.db.logs = [];
    saveDb();
    showToast("Logi wyczyszczone");
    renderAdmin();
  }

  function exportDb() {
    const blob = new Blob([JSON.stringify(state.db, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `abw-local-db-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
    logAction("admin: eksport JSON", "Lokalna baza ABW");
    saveDb();
  }

  function readFileAsDataUrl(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  function updateMission(id, status) {
    const mission = state.db.missions.find((item) => item.id === id);
    if (!mission || !hasMissionAccess(mission)) return;
    mission.status = status;
    logAction(status === "w trakcie" ? "misja start" : "misja nieudana", mission.title);
    saveDb();
    showToast(status === "w trakcie" ? "Operacja rozpoczęta" : "Misja oznaczona jako nieudana");
    renderMissions();
    renderIdentity();
  }

  function completeMission(id) {
    const mission = state.db.missions.find((item) => item.id === id);
    const user = currentUser();
    if (!mission || !user || !hasMissionAccess(mission)) return;
    mission.status = "wykonana";
    mission.rewardedUsers ||= [];
    if (!mission.rewardedUsers.includes(user.id)) {
      user.exp += Number(mission.expReward || 0);
      mission.rewardedUsers.push(user.id);
      maybePromote(user);
    }
    logAction("misja wykonana", mission.title);
    saveDb();
    showToast("Misja wykonana, nagrody dodane");
    renderMissions();
    renderIdentity();
  }

  function maybePromote(user) {
    const currentIndex = rankIndex(user.rank);
    const nextThreshold = (currentIndex + 1) * 650;
    if (user.exp >= nextThreshold && currentIndex < RANKS.length - 1) {
      user.rank = RANKS[currentIndex + 1];
      logAction("awans rangowy", user.rank, user);
      showToast(`Awans: ${user.rank}`);
    }
  }

  function showEventPopup(event) {
    const popup = $("eventPopup");
    popup.classList.remove("hidden");
    popup.innerHTML = `<strong>${esc(event.title)}</strong><p>${esc(event.body)}</p>`;
    if (event.severity !== "red") playSound("beep");
    window.setTimeout(() => popup.classList.add("hidden"), 7200);
  }

  function activateAlarmMode() {
    $("osScreen").classList.add("alarm-mode");
    $("systemStatus").textContent = "ALARM";
    playAlarmSound(5000, true);
    window.setTimeout(() => {
      $("osScreen").classList.remove("alarm-mode");
      $("systemStatus").textContent = SERVER_MODE ? "SERWER ONLINE" : "STABILNY";
    }, 12000);
  }

  function showToast(message) {
    document.querySelector(".system-toast")?.remove();
    const toast = document.createElement("div");
    toast.className = "system-toast";
    toast.textContent = message;
    document.body.appendChild(toast);
    window.setTimeout(() => toast.remove(), 2600);
  }

  function toggleFullscreen() {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.();
    } else {
      document.exitFullscreen?.();
    }
  }

  function toggleSound() {
    state.soundEnabled = !state.soundEnabled;
    const user = currentUser();
    state.db.settings[user.id] = {
      ...(state.db.settings[user.id] || {}),
      soundEnabled: state.soundEnabled,
    };
    saveDb();
    $("soundToggle").textContent = state.soundEnabled ? "SND ON" : "SND";
    if (state.soundEnabled) {
      ensureAudio();
      playSound("success");
      showToast("Dźwięki ABW włączone");
    } else {
      stopAlarmSound();
      showToast("Dźwięki ABW wyłączone");
    }
  }

  function ensureAudio() {
    if (!state.audio) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (AudioContext) state.audio = new AudioContext();
    }
    state.audio?.resume?.();
  }

  function playSound(type) {
    if (!state.soundEnabled) return;
    ensureAudio();
    const ctx = state.audio;
    if (!ctx) return;
    if (type === "success") {
      playTone(ctx, { frequency: 540, endFrequency: 610, duration: 0.11, volume: 0.035 });
      playTone(ctx, { frequency: 760, endFrequency: 820, duration: 0.14, volume: 0.04, delay: 0.1 });
      return;
    }
    if (type === "error") {
      playTone(ctx, { frequency: 210, endFrequency: 180, duration: 0.14, volume: 0.045, type: "triangle" });
      playTone(ctx, { frequency: 165, endFrequency: 145, duration: 0.16, volume: 0.04, type: "triangle", delay: 0.12 });
      return;
    }
    playTone(ctx, { frequency: 680, endFrequency: 620, duration: 0.1, volume: 0.026 });
  }

  function playTone(ctx, options) {
    const start = ctx.currentTime + (options.delay || 0);
    const duration = options.duration || 0.12;
    const gain = ctx.createGain();
    const osc = ctx.createOscillator();
    osc.type = options.type || "sine";
    osc.frequency.setValueAtTime(options.frequency, start);
    osc.frequency.linearRampToValueAtTime(options.endFrequency || options.frequency, start + duration);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(options.volume || 0.03, start + 0.018);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(start);
    osc.stop(start + duration + 0.02);
  }

  function playAlarmSound(durationMs = 5000, force = false) {
    if (!state.soundEnabled && !force) return;
    ensureAudio();
    const ctx = state.audio;
    if (!ctx) return;
    stopAlarmSound();

    const master = ctx.createGain();
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 1500;
    master.gain.value = 0.78;
    filter.connect(master);
    master.connect(ctx.destination);
    state.alarmSoundNodes.push(master, filter);

    const start = ctx.currentTime + 0.03;
    const duration = durationMs / 1000;
    const pulseStep = 0.5;
    const pulseDuration = 0.32;

    for (let offset = 0; offset < duration; offset += pulseStep) {
      const pulseStart = start + offset;
      const pulseEnd = Math.min(start + duration, pulseStart + pulseDuration);
      const gain = ctx.createGain();
      const osc = ctx.createOscillator();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(offset % 1 === 0 ? 520 : 390, pulseStart);
      osc.frequency.linearRampToValueAtTime(offset % 1 === 0 ? 450 : 340, pulseEnd);
      gain.gain.setValueAtTime(0.0001, pulseStart);
      gain.gain.exponentialRampToValueAtTime(0.075, pulseStart + 0.025);
      gain.gain.setValueAtTime(0.075, Math.max(pulseStart + 0.026, pulseEnd - 0.06));
      gain.gain.exponentialRampToValueAtTime(0.0001, pulseEnd);
      osc.connect(gain);
      gain.connect(filter);
      osc.start(pulseStart);
      osc.stop(pulseEnd + 0.02);
      state.alarmSoundNodes.push(osc, gain);
    }

    state.alarmSoundTimer = window.setTimeout(stopAlarmSound, durationMs + 100);
  }

  function stopAlarmSound() {
    if (state.alarmSoundTimer) {
      window.clearTimeout(state.alarmSoundTimer);
      state.alarmSoundTimer = null;
    }
    state.alarmSoundNodes.forEach((node) => {
      try {
        node.stop?.();
        node.disconnect?.();
      } catch (error) {
        // Node may already be stopped by its scheduled end.
      }
    });
    state.alarmSoundNodes = [];
  }

  function startAnimationLoop() {
    state.ambientCanvas = $("ambientCanvas");
    const loop = (time) => {
      drawAmbient(time);
      drawSonar(time);
      drawGlobe(time);
      state.animationId = requestAnimationFrame(loop);
    };
    state.animationId = requestAnimationFrame(loop);
  }

  function triggerResize() {
    [state.ambientCanvas, state.sonarCanvas, state.globe.canvas].forEach((canvas) => {
      if (canvas) resizeCanvas(canvas);
    });
  }

  function resizeCanvas(canvas) {
    const rect = canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return false;
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    const width = Math.floor(rect.width * ratio);
    const height = Math.floor(rect.height * ratio);
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }
    return true;
  }

  function drawAmbient(time) {
    const canvas = state.ambientCanvas;
    if (!canvas || $("osScreen").classList.contains("hidden")) return;
    if (!resizeCanvas(canvas)) return;
    const ctx = canvas.getContext("2d");
    const width = canvas.width;
    const height = canvas.height;
    ctx.clearRect(0, 0, width, height);
    ctx.save();
    ctx.globalAlpha = 0.5;
    ctx.strokeStyle = "rgba(69,220,255,0.08)";
    ctx.lineWidth = 1;
    const step = 70 * Math.min(window.devicePixelRatio || 1, 2);
    const offset = ((time / 45) % step);
    for (let x = -step + offset; x < width + step; x += step) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x - width * 0.16, height);
      ctx.stroke();
    }
    for (let y = offset; y < height + step; y += step) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }
    ctx.globalAlpha = 0.34;
    for (let i = 0; i < 28; i += 1) {
      const x = ((i * 311 + time * 0.015) % width);
      const y = (Math.sin(time * 0.0008 + i) * 0.5 + 0.5) * height;
      ctx.fillStyle = i % 5 === 0 ? "rgba(255,63,73,0.45)" : "rgba(69,220,255,0.42)";
      ctx.fillRect(x, y, 2, 2);
    }
    ctx.restore();
  }

  function initSonar() {
    state.sonarCanvas = $("sonarCanvas");
  }

  function drawSonar(time) {
    const canvas = state.sonarCanvas;
    if (!canvas || !canvas.isConnected) return;
    if (!resizeCanvas(canvas)) return;
    const ctx = canvas.getContext("2d");
    const width = canvas.width;
    const height = canvas.height;
    const cx = width / 2;
    const cy = height / 2;
    const radius = Math.min(width, height) * 0.42;
    ctx.clearRect(0, 0, width, height);

    const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
    gradient.addColorStop(0, "rgba(69,220,255,0.18)");
    gradient.addColorStop(0.7, "rgba(69,220,255,0.05)");
    gradient.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = "rgba(69,220,255,0.26)";
    ctx.lineWidth = 1.4;
    for (let i = 1; i <= 5; i += 1) {
      ctx.beginPath();
      ctx.arc(cx, cy, (radius / 5) * i, 0, Math.PI * 2);
      ctx.stroke();
    }
    for (let i = 0; i < 12; i += 1) {
      const angle = (Math.PI * 2 * i) / 12;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + Math.cos(angle) * radius, cy + Math.sin(angle) * radius);
      ctx.stroke();
    }

    const sweep = (time * 0.0016) % (Math.PI * 2);
    const sweepGradient = ctx.createConicGradient(sweep, cx, cy);
    sweepGradient.addColorStop(0, "rgba(69,220,255,0)");
    sweepGradient.addColorStop(0.08, "rgba(69,220,255,0.42)");
    sweepGradient.addColorStop(0.14, "rgba(115,255,176,0.08)");
    sweepGradient.addColorStop(1, "rgba(69,220,255,0)");
    ctx.fillStyle = sweepGradient;
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.fill();

    const contacts = [
      [0.22, 0.7, 0],
      [0.56, 1.8, 1],
      [0.74, 3.12, 2],
      [0.42, 4.4, 3],
      [0.86, 5.4, 4],
    ];
    contacts.forEach(([dist, angle, index]) => {
      const blink = Math.sin(time * 0.006 + index) > -0.4;
      if (!blink) return;
      const x = cx + Math.cos(angle + time * 0.00015 * (index + 1)) * radius * dist;
      const y = cy + Math.sin(angle + time * 0.00015 * (index + 1)) * radius * dist;
      ctx.fillStyle = index === 2 ? "rgba(255,63,73,0.95)" : "rgba(115,255,176,0.88)";
      ctx.shadowColor = ctx.fillStyle;
      ctx.shadowBlur = 18;
      ctx.beginPath();
      ctx.arc(x, y, index === 2 ? 5 : 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    });
  }

  function initGlobe() {
    const canvas = $("globeCanvas");
    if (!canvas) return;
    state.globe.canvas = canvas;
    state.globe.ctx = canvas.getContext("2d");
    if (canvas.dataset.bound) return;
    canvas.dataset.bound = "true";
    canvas.addEventListener("pointerdown", (event) => {
      state.globe.dragging = true;
      state.globe.lastX = event.clientX;
      state.globe.lastY = event.clientY;
      canvas.setPointerCapture(event.pointerId);
    });
    canvas.addEventListener("pointermove", (event) => {
      if (!state.globe.dragging) return;
      const dx = event.clientX - state.globe.lastX;
      const dy = event.clientY - state.globe.lastY;
      state.globe.rotY += dx * 0.006;
      state.globe.rotX = Math.max(-1.1, Math.min(1.1, state.globe.rotX + dy * 0.004));
      state.globe.lastX = event.clientX;
      state.globe.lastY = event.clientY;
    });
    canvas.addEventListener("pointerup", () => {
      state.globe.dragging = false;
    });
    canvas.addEventListener("wheel", (event) => {
      event.preventDefault();
      state.globe.scaleMod = Math.max(0.75, Math.min(1.45, state.globe.scaleMod + (event.deltaY > 0 ? -0.06 : 0.06)));
    }, { passive: false });
  }

  function drawGlobe(time) {
    const { canvas, ctx } = state.globe;
    if (!canvas || !ctx || !canvas.isConnected) return;
    if (!resizeCanvas(canvas)) return;
    const width = canvas.width;
    const height = canvas.height;
    const cx = width / 2;
    const cy = height / 2;
    const radius = Math.min(width, height) * 0.36 * state.globe.scaleMod;
    if (!state.globe.dragging) state.globe.rotY += 0.0006;
    ctx.clearRect(0, 0, width, height);

    const glow = ctx.createRadialGradient(cx, cy, radius * 0.25, cx, cy, radius * 1.18);
    glow.addColorStop(0, "rgba(69,220,255,0.20)");
    glow.addColorStop(0.72, "rgba(20,136,255,0.08)");
    glow.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(cx, cy, radius * 1.18, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = "rgba(69,220,255,0.42)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.stroke();

    drawGlobeGrid(ctx, cx, cy, radius);
    drawMapObjects(ctx, cx, cy, radius, time);
  }

  function project(lat, lon, cx, cy, radius) {
    const phi = (lat * Math.PI) / 180;
    const lambda = (lon * Math.PI) / 180 + state.globe.rotY;
    const x = Math.cos(phi) * Math.sin(lambda);
    const y = Math.sin(phi);
    const z = Math.cos(phi) * Math.cos(lambda);
    const cosX = Math.cos(state.globe.rotX);
    const sinX = Math.sin(state.globe.rotX);
    const y2 = y * cosX - z * sinX;
    const z2 = y * sinX + z * cosX;
    return {
      x: cx + x * radius,
      y: cy - y2 * radius,
      z: z2,
      visible: z2 > -0.16,
    };
  }

  function drawGlobeGrid(ctx, cx, cy, radius) {
    ctx.lineWidth = 1;
    ctx.strokeStyle = "rgba(69,220,255,0.18)";
    for (let lat = -60; lat <= 60; lat += 30) {
      drawGeoLine(ctx, cx, cy, radius, Array.from({ length: 121 }, (_, i) => [lat, -180 + i * 3]));
    }
    for (let lon = -180; lon < 180; lon += 30) {
      drawGeoLine(ctx, cx, cy, radius, Array.from({ length: 61 }, (_, i) => [-90 + i * 3, lon]));
    }
  }

  function drawGeoLine(ctx, cx, cy, radius, points) {
    let drawing = false;
    ctx.beginPath();
    points.forEach(([lat, lon]) => {
      const p = project(lat, lon, cx, cy, radius);
      if (!p.visible) {
        drawing = false;
        return;
      }
      if (!drawing) {
        ctx.moveTo(p.x, p.y);
        drawing = true;
      } else {
        ctx.lineTo(p.x, p.y);
      }
    });
    ctx.stroke();
  }

  function drawMapObjects(ctx, cx, cy, radius, time) {
    const colors = {
      intelligence: "rgba(255,206,107,0.95)",
      operations: "rgba(115,255,176,0.95)",
      infrastructure: "rgba(69,220,255,0.95)",
    };
    const objects = state.db.mapObjects.filter((object) => state.globe.layers[object.layer]);
    objects
      .filter((object) => object.type === "route" && typeof object.lat2 === "number" && typeof object.lon2 === "number")
      .forEach((route) => {
        const start = project(route.lat, route.lon, cx, cy, radius);
        const end = project(route.lat2, route.lon2, cx, cy, radius);
        if (!start.visible || !end.visible) return;
        ctx.strokeStyle = colors[route.layer] || "rgba(69,220,255,0.9)";
        ctx.lineWidth = 2;
        ctx.setLineDash([8, 8]);
        ctx.beginPath();
        const midX = (start.x + end.x) / 2;
        const midY = (start.y + end.y) / 2 - radius * 0.16;
        ctx.moveTo(start.x, start.y);
        ctx.quadraticCurveTo(midX, midY, end.x, end.y);
        ctx.stroke();
        ctx.setLineDash([]);

        const phase = (Math.sin(time * 0.0012) + 1) / 2;
        const lat = route.lat + (route.lat2 - route.lat) * phase;
        const lon = route.lon + (route.lon2 - route.lon) * phase;
        const unit = project(lat, lon, cx, cy, radius);
        if (unit.visible) drawPoint(ctx, unit, "rgba(255,255,255,0.95)", "UNIT");
      });

    objects
      .filter((object) => object.type !== "route")
      .sort((a, b) => project(a.lat, a.lon, cx, cy, radius).z - project(b.lat, b.lon, cx, cy, radius).z)
      .forEach((object) => {
        const p = project(object.lat, object.lon, cx, cy, radius);
        if (!p.visible) return;
        drawPoint(ctx, p, colors[object.layer] || "rgba(69,220,255,0.95)", object.type.toUpperCase().slice(0, 4));
        ctx.fillStyle = "rgba(232,247,255,0.82)";
        ctx.font = `${Math.max(11, radius * 0.035)}px system-ui`;
        ctx.fillText(object.name, p.x + 10, p.y - 8);
      });
  }

  function drawPoint(ctx, point, color, label) {
    const size = 4 + Math.max(0, point.z) * 3;
    ctx.save();
    ctx.fillStyle = color;
    ctx.shadowColor = color;
    ctx.shadowBlur = 16;
    ctx.beginPath();
    ctx.arc(point.x, point.y, size, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = "rgba(2,8,14,0.86)";
    ctx.fillRect(point.x + 8, point.y - 17, 42, 16);
    ctx.fillStyle = color;
    ctx.font = "10px system-ui";
    ctx.fillText(label, point.x + 12, point.y - 5);
    ctx.restore();
  }

  window.addEventListener("resize", triggerResize);
})();
