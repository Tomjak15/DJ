(() => {
  "use strict";

  const DB_KEY = "abw-os-db-v1";
  const IDLE_MS = 5 * 60 * 1000;
  const AUTOSAVE_MS = 3000;
  const CONNECTION_RETRY_MS = 10000;
  const SERVER_MODE = true;
  const SHARED_SYNC_KEYS = [
    "announcements",
    "info",
    "products",
    "mapObjects",
    "missions",
    "events",
    "logs",
    "rankConfig",
    "categoryActivity",
    "trash",
    "documents",
    "calendarEvents",
    "leaveRequests",
    "temporaryPasses",
    "equipmentAssets",
    "vehicles",
  ];

  const RANKS = [
    "Szeregowy",
    "Rekrut",
    "Kadet",
    "Młodszy sierżant",
    "Starszy sierżant",
    "Podchorąży",
    "Chorąży",
    "Chorążypodmajster",
    "Majster",
    "Majster sztabowy",
    "Podoficer",
    "Oficer",
    "Oficer Półkownik",
    "Generał dywizyjny",
    "Generał generalny",
  ];

  const DEFAULT_RANK_GROUPS = [
    ["Korpus szeregowych", ["Szeregowy", "Rekrut", "Kadet"]],
    ["Korpus sierżantów", ["Młodszy sierżant", "Starszy sierżant"]],
    ["Korpus chorążych", ["Podchorąży", "Chorąży", "Chorążypodmajster"]],
    ["Korpus Majstrów", ["Majster", "Majster sztabowy"]],
    ["Korpus oficerów", ["Podoficer", "Oficer", "Oficer Półkownik"]],
    ["Korpus generałów", ["Generał dywizyjny", "Generał generalny"]],
  ];

  const ACCESS_CATEGORIES = [
    ["profile", "Agent"],
    ["announcements", "Ogłoszenia"],
    ["info", "Informacje"],
    ["shop", "Sklep"],
    ["notes", "Notatnik"],
    ["map", "Mapa"],
    ["clocks", "Zegary"],
    ["documents", "Dokumenty"],
    ["calendar", "Kalendarz"],
    ["contacts", "Kontakty"],
    ["logistics", "Logistyka"],
    ["missions", "Misje"],
    ["events", "Zdarzenia"],
    ["messenger", "Komunikator"],
  ];

  const MANAGEMENT_PERMISSIONS = [
    ["announcements", "Tworzenie i usuwanie ogłoszeń"],
    ["info", "Tworzenie i edycja informacji"],
    ["shop", "Zarządzanie sklepem"],
    ["notes", "Edycja notatek użytkowników"],
    ["map", "Zarządzanie mapą"],
    ["missions", "Tworzenie i edycja misji"],
    ["events", "Tworzenie i edycja zdarzeń"],
    ["messenger", "Tworzenie grup"],
    ["calendar", "Kalendarz i urlopy"],
    ["personnel", "Przepustki i personel"],
    ["logistics", "Sprzęt, magazyn i pojazdy"],
  ];

  const MANAGED_SHARED_KEYS = {
    announcements: "announcements",
    info: "info",
    shop: "products",
    map: "mapObjects",
    missions: "missions",
    events: "events",
    calendar: "calendarEvents",
    personnel: "temporaryPasses",
    logistics: "equipmentAssets",
  };

  const MANAGEMENT_PANEL_CATEGORIES = [
    "shop",
    "announcements",
    "info",
    "map",
    "missions",
    "events",
    "notes",
    "calendar",
    "personnel",
    "logistics",
  ];

  const DOCUMENT_TYPES = {
    instruction: "Instrukcja",
    order: "Rozkaz",
    report: "Raport",
    protocol: "Protokół",
  };

  const LEAVE_STATUSES = {
    pending: "Oczekuje",
    approved: "Zatwierdzony",
    rejected: "Odrzucony",
  };

  const ORDER_STATUSES = {
    placed: "Złożone",
    approved: "Zatwierdzone",
    issued: "Wydane",
    returned: "Zwrócone",
  };

  const LEGACY_RANK_NAMES = {
    "Kadet II stopnia": "Kadet",
    "Majster klepka": "Majster",
    "Majster bagieta": "Majster sztabowy",
    "Oficer pułkownik": "Oficer Półkownik",
    "Generał brygad": "Generał dywizyjny",
  };

  const CATEGORY_LABELS = {
    all: "Wszystkie zasoby",
    mecha: "Jednostki mecha",
    aircraft: "Lotnictwo",
    drone: "Drony",
    marine: "Jednostki morskie",
    rifles: "Karabiny",
    pistols: "Pistolety",
    grenades: "Granaty",
    equipment: "Wyposażenie",
    spy: "Szpiegostwo",
    ops: "Operacyjne",
  };

  const PRODUCT_STATUSES = {
    available: "Dostępny",
    unavailable: "Niedostępny",
  };

  const LOG_CATEGORIES = {
    auth: "Dostęp i konta",
    mission: "Operacje i misje",
    admin: "Administracja",
    order: "Zaopatrzenie",
    communication: "Łączność",
    finding: "Znaleziska",
    system: "System",
  };

  const WORLD_CLOCKS = [
    ["Canberra", "Australia", "Australia/Sydney", "ABW HQ", "friendly"],
    ["Warszawa", "Polska", "Europe/Warsaw", "CENTRUM EUROPA", "friendly"],
    ["Waszyngton", "Stany Zjednoczone", "America/New_York", "MONITOROWANE", "watch"],
    ["Moskwa", "Rosja", "Europe/Moscow", "PODWYŻSZONA UWAGA", "danger"],
    ["Pekin", "Chiny", "Asia/Shanghai", "PODWYŻSZONA UWAGA", "danger"],
    ["Tokio", "Japonia", "Asia/Tokyo", "MONITOROWANE", "watch"],
    ["Londyn", "Wielka Brytania", "Europe/London", "MONITOROWANE", "watch"],
    ["Nowe Delhi", "Indie", "Asia/Kolkata", "MONITOROWANE", "watch"],
  ];

  const CATALOG_V2_PRODUCTS = [
    {
      id: "prd-v2-marine-1",
      name: "Okręt podwodny ABW MANTA",
      description: "Cicha jednostka oceaniczna do transportu agentów, obserwacji i operacji głębinowych.",
      category: "marine",
      status: "available",
      visual: "MANTA",
      imageData: "",
    },
    {
      id: "prd-v2-rifle-1",
      name: "Karabin operacyjny ARCTIC-11",
      description: "Modułowy karabin treningowo-operacyjny z optyką nocną i identyfikatorem wyposażenia ABW.",
      category: "rifles",
      status: "available",
      visual: "AR-11",
      imageData: "",
    },
    {
      id: "prd-v2-pistol-1",
      name: "Pistolet służbowy TIDE-9",
      description: "Kompaktowe wyposażenie służbowe zabezpieczone biometrycznie i rejestrowane w magazynie.",
      category: "pistols",
      status: "available",
      visual: "TIDE9",
      imageData: "",
    },
    {
      id: "prd-v2-grenade-1",
      name: "Granat sygnałowy DEEP-FLARE",
      description: "Podwodny znacznik świetlny i dymny do oznaczania stref ewakuacji oraz punktów odbioru.",
      category: "grenades",
      status: "available",
      visual: "FLARE",
      imageData: "",
    },
    {
      id: "prd-v2-equipment-1",
      name: "Zestaw operatora OCEAN-RIG",
      description: "Kamizelka, radiostacja szyfrowana, apteczka, noktowizja i zestaw narzędzi terenowych.",
      category: "equipment",
      status: "available",
      visual: "RIG",
      imageData: "",
    },
  ];

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
    zone: "Strefa zagrożenia",
  };

  const CLASSIFICATIONS = {
    jawne: "JAWNE",
    poufne: "POUFNE",
    tajne: "TAJNE",
    scisle_tajne: "ŚCIŚLE TAJNE",
  };

  const CLASSIFICATION_RANK_INDEX = {
    jawne: 0,
    poufne: 2,
    tajne: 5,
    scisle_tajne: 11,
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

  const SYSTEM_FINDINGS = [
    ["SONAR", "Wykryto krótką sygnaturę 17 Hz na skraju sektora pelagicznego. Automatyczna korelacja: 31%."],
    ["WYWIAD", "Niezidentyfikowany transponder pojawił się na 46 sekund i zniknął przed pełnym odczytem."],
    ["HYDROFON", "Sieć hydrofonów zarejestrowała serię trzech impulsów o nieregularnym odstępie."],
    ["SATCOM", "Pakiet telemetryczny bez nagłówka odebrano przez zapasowy przekaźnik orbitalny."],
    ["DRON", "Dron patrolowy oznaczył dryfujący kontener poza zgłoszoną trasą handlową."],
    ["AI WATCH", "Model anomalii wskazał nietypową zmianę temperatury w warstwie głębinowej."],
    ["RADIO", "Odebrano zaszumioną transmisję na nieaktywnej częstotliwości operacyjnej."],
    ["PORT", "System portowy wykrył rozbieżność między manifestem a masą jednej jednostki transportowej."],
  ];

  const state = {
    db: loadDb(),
    user: null,
    token: window.ABWApi?.getToken() || "",
    saveQueue: Promise.resolve(),
    syncInterval: null,
    serverOnline: false,
    serverConnecting: false,
    connectionPromise: null,
    connectionRetryTimer: null,
    accountStatusTimer: null,
    accountStatusRequest: 0,
    accountLockedUntil: 0,
    syncVersions: new Map(),
    syncFingerprints: new Map(),
    activeTab: "dashboard",
    activeAdminTab: "users",
    activeCategory: "all",
    uiRevision: 0,
    syncRequestId: 0,
    searchQuery: "",
    commandCenter: false,
    offlineMode: !navigator.onLine,
    lastActivity: Date.now(),
    idleInterval: null,
    loginInterval: null,
    announcementInterval: null,
    messageInterval: null,
    presenceInterval: null,
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
      worldData: null,
      labelFeatures: [],
      loading: false,
      loadFailed: false,
      zoom: 1,
      offsetX: 0,
      offsetY: 0,
      dragging: false,
      dragMoved: false,
      lastX: 0,
      lastY: 0,
      pointerStartX: 0,
      pointerStartY: 0,
      longPressTimer: null,
      mode: "pan",
      style: "tactical",
      timeFilter: "all",
      measurePoints: [],
      routePoints: [],
      previewPoint: null,
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
      category: "",
    },
    messenger: {
      conversations: [],
      activeConversationId: "",
      messages: [],
      loaded: false,
      lastUnreadCount: 0,
      searchQuery: "",
      searchResults: [],
      replyTo: null,
      presence: [],
      typingTimer: null,
      attachment: null,
      refreshRequestId: 0,
      conversationRequestId: 0,
    },
    security: {
      devices: [],
      serverStatus: null,
      backups: [],
      loaded: false,
    },
    identityQrs: {},
    identityQrLoading: new Set(),
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

  function initializeServerConnection({ restoreSession = true } = {}) {
    if (state.connectionPromise) return state.connectionPromise;
    state.serverConnecting = true;
    window.clearTimeout(state.connectionRetryTimer);
    setLoginStatus("Uruchamianie serwera ABW...", "warn");

    state.connectionPromise = (async () => {
      try {
        await window.ABWApi.health();
        state.serverOnline = true;
        if (restoreSession && state.token && !state.user) await restoreServerSession();
        else {
          setLoginStatus("Serwer ABW online", "ok");
          if ($("loginNick")?.value.trim()) refreshLoginAccountStatus();
        }
        return true;
      } catch (error) {
        state.serverOnline = false;
        setLoginStatus("Serwer ABW uruchamia się — ponawiam połączenie...", "warn");
        state.connectionRetryTimer = window.setTimeout(
          () => initializeServerConnection(),
          CONNECTION_RETRY_MS,
        );
        return false;
      } finally {
        state.serverConnecting = false;
        state.connectionPromise = null;
      }
    })();

    return state.connectionPromise;
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
      if (error.status !== 401) throw error;
      state.token = "";
      window.ABWApi.clearToken();
      setLoginStatus("Sesja wygasła. Zaloguj się ponownie", "warn");
    }
  }

  function bindGlobalEvents() {
    $("loginForm").addEventListener("submit", handleLogin);
    $("loginNick").addEventListener("input", handleLoginIdentifierInput);
    $("passwordToggle").addEventListener("click", togglePasswordVisibility);
    $("logoutButton").addEventListener("click", () => logout("manual"));
    $("fullscreenButton").addEventListener("click", toggleFullscreen);
    $("soundToggle").addEventListener("click", toggleSound);
    $("commandCenterButton").addEventListener("click", toggleCommandCenter);
    $("globalSearchForm").addEventListener("submit", handleGlobalSearch);

    document.querySelectorAll(".dock-item").forEach((button) => {
      button.addEventListener("click", () => switchTab(button.dataset.tab));
    });

    document.addEventListener("click", handleActionClick);
    document.addEventListener("submit", handleFormSubmit);
    document.addEventListener("input", handleDocumentInput);

    ["mousemove", "mousedown", "keydown", "scroll", "touchstart"].forEach((eventName) => {
      window.addEventListener(eventName, markActivity, { passive: true });
    });
    window.addEventListener("online", handleNetworkOnline);
    window.addEventListener("offline", handleNetworkOffline);
  }

  function defaultDb() {
    return {
      schema: 6,
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
      identityCards: {},
      documents: [],
      calendarEvents: [],
      leaveRequests: [],
      temporaryPasses: [],
      equipmentAssets: [],
      vehicles: [],
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
      rankConfig: defaultRankConfig(),
      categoryActivity: {},
      trash: [],
    };
  }

  function defaultRankConfig() {
    const managePermissions = Object.fromEntries(MANAGEMENT_PERMISSIONS.map(([key]) => [key, false]));
    return DEFAULT_RANK_GROUPS.map(([corps, ranks], groupIndex) => ({
      id: `corps-${groupIndex + 1}`,
      name: corps,
      ranks: ranks.map((name, rankIndexValue) => ({
        id: `rank-${groupIndex + 1}-${rankIndexValue + 1}`,
        name,
        managePermissions: { ...managePermissions },
      })),
    }));
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
      identityCards: db.identityCards && typeof db.identityCards === "object" ? db.identityCards : fresh.identityCards,
      documents: Array.isArray(db.documents) ? db.documents : fresh.documents,
      calendarEvents: Array.isArray(db.calendarEvents) ? db.calendarEvents : fresh.calendarEvents,
      leaveRequests: Array.isArray(db.leaveRequests) ? db.leaveRequests : fresh.leaveRequests,
      temporaryPasses: Array.isArray(db.temporaryPasses) ? db.temporaryPasses : fresh.temporaryPasses,
      equipmentAssets: Array.isArray(db.equipmentAssets) ? db.equipmentAssets : fresh.equipmentAssets,
      vehicles: Array.isArray(db.vehicles) ? db.vehicles : fresh.vehicles,
      settings: db.settings && typeof db.settings === "object" ? db.settings : fresh.settings,
      files: db.files && typeof db.files === "object" ? db.files : fresh.files,
      configuration: db.configuration && typeof db.configuration === "object" ? db.configuration : fresh.configuration,
      mapObjects: Array.isArray(db.mapObjects) ? db.mapObjects : fresh.mapObjects,
      missions: Array.isArray(db.missions) ? db.missions : fresh.missions,
      events: Array.isArray(db.events) ? db.events : fresh.events,
      logs: Array.isArray(db.logs) ? db.logs : fresh.logs,
      rankConfig: Array.isArray(db.rankConfig) && db.rankConfig.length ? db.rankConfig : fresh.rankConfig,
      categoryActivity: db.categoryActivity && typeof db.categoryActivity === "object"
        ? db.categoryActivity
        : fresh.categoryActivity,
      trash: Array.isArray(db.trash) ? db.trash : fresh.trash,
    };
    return migrateDb(normalized, shouldClearSeedContent);
  }

  function migrateDb(db) {
    db.users.forEach((user) => {
      delete user.points;
      user.rank = normalizeLegacyRank(user.rank);
    });
    db.products.forEach((product) => {
      delete product.price;
      product.status = normalizeProductStatus(product.status);
    });
    db.missions.forEach((mission) => {
      delete mission.pointReward;
      mission.minRank = normalizeLegacyRank(mission.minRank);
      mission.assignedTo ||= [];
      mission.objectives ||= [];
      mission.reports ||= [];
      mission.classification ||= "jawne";
      mission.attachments ||= [];
      mission.timeline ||= [];
      mission.contingencyPlan ||= "";
      mission.evacuationPoint ||= "";
      mission.alternativeRoute ||= "";
    });
    db.mapObjects.forEach((object) => {
      object.classification ||= "jawne";
      object.createdAt ||= Date.now();
      object.updatedAt ||= object.createdAt;
      object.history ||= [];
    });
    db.info.forEach((item) => { item.classification ||= "jawne"; });
    db.announcements.forEach((item) => { item.classification ||= "jawne"; });
    db.logs.forEach((log) => {
      log.repeatCount = Math.max(1, Number(log.repeatCount || 1));
      log.printExcluded = Boolean(log.printExcluded);
      log.printedAt = Number(log.printedAt || 0);
      log.printBatchId ||= "";
      log.printedBy ||= "";
      log.category ||= inferLogCategory(log.action);
      log.severity ||= "info";
      log.source ||= log.nick === "system" ? "ABW CORE" : "PANEL AGENTA";
      log.device ||= "";
    });
    Object.keys(db.identityCards).forEach((userId) => {
      db.identityCards[userId] = normalizeIdentityCard(db.identityCards[userId]);
    });
    db.orders.forEach((order) => {
      order.status = Object.keys(ORDER_STATUSES).includes(order.status)
        ? order.status
        : "placed";
      order.history ||= [{ status: order.status, time: Number(order.createdAt || Date.now()), by: order.nick || "system" }];
    });
    db.documents.forEach((document) => {
      document.version = Math.max(1, Number(document.version || 1));
      document.history ||= [];
      document.classification ||= "jawne";
    });
    db.leaveRequests.forEach((request) => { request.status ||= "pending"; });
    db.temporaryPasses.forEach((pass) => { pass.active = pass.active !== false; });
    db.equipmentAssets.forEach((asset) => {
      asset.status ||= "magazyn";
      asset.serial ||= `ABW-${String(asset.id || "").slice(-8).toUpperCase()}`;
      asset.history ||= [];
    });
    db.vehicles.forEach((vehicle) => {
      vehicle.status ||= "gotowy";
      vehicle.crew ||= [];
      vehicle.fuel = Math.max(0, Math.min(100, Number(vehicle.fuel ?? 100)));
    });
    db.rankConfig = normalizeRankConfig(db.rankConfig);
    db.schema = 6;
    return db;
  }

  function normalizeProductStatus(status) {
    const value = String(status || "").toLowerCase();
    if (
      value === "unavailable"
      || value.includes("niedost")
      || value.includes("brak")
      || value.includes("wycof")
      || value.includes("serwis")
    ) return "unavailable";
    return "available";
  }

  function normalizeIdentityCard(card = {}) {
    return {
      callsign: String(card.callsign || ""),
      specialization: String(card.specialization || ""),
      unit: String(card.unit || "ABW Oceanic Command"),
      bloodType: String(card.bloodType || ""),
      clearance: CLASSIFICATIONS[card.clearance] ? card.clearance : "",
      validUntil: String(card.validUntil || ""),
      status: ["active", "suspended", "expired"].includes(card.status) ? card.status : "active",
      photoData: String(card.photoData || ""),
      history: Array.isArray(card.history) ? card.history.slice(0, 100) : [],
    };
  }

  function normalizeLegacyRank(rank) {
    return LEGACY_RANK_NAMES[rank] || rank || "Rekrut";
  }

  function normalizeRankConfig(config) {
    const fallback = defaultRankConfig();
    if (!Array.isArray(config) || !config.length) return fallback;
    return config.map((group, groupIndex) => ({
      id: String(group.id || `corps-${groupIndex + 1}`),
      name: normalizeKnownText(group.name || `Korpus ${groupIndex + 1}`),
      ranks: (Array.isArray(group.ranks) ? group.ranks : []).map((rank, rankIndexValue) => ({
        id: String(rank.id || `rank-${groupIndex + 1}-${rankIndexValue + 1}`),
        name: normalizeKnownText(rank.name || "Ranga"),
        managePermissions: Object.fromEntries(MANAGEMENT_PERMISSIONS.map(([key]) => [
          key,
          rank.managePermissions?.[key] === true,
        ])),
      })),
    })).filter((group) => group.ranks.length);
  }

  function normalizeKnownText(value) {
    return String(value || "")
      .trim()
      .replaceAll("Korpus Majstr?w", "Korpus Majstrów")
      .replaceAll("P??kownik", "Półkownik")
      .replaceAll("P?kownik", "Półkownik")
      .replaceAll("Chor??ypodmajster", "Chorążypodmajster");
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

    const managedSharedKeys = Object.entries(MANAGED_SHARED_KEYS)
      .filter(([category]) => canManageCategory(category, user))
      .map(([, key]) => key);
    if (canManageCategory("logistics", user)) managedSharedKeys.push("vehicles");
    const writableSharedKeys = isAdmin()
      ? SHARED_SYNC_KEYS
      : [...new Set(["missions", "logs", ...managedSharedKeys])];
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
        ["profile", {
          rank: owner.rank,
          exp: Number(owner.exp || 0),
          identityCard: normalizeIdentityCard(state.db.identityCards[owner.id]),
        }],
      ];
      privateRecords.forEach(([key, data]) => records.push({
        key,
        scope: "private",
        owner_user_id: owner.id,
        data,
      }));
    });

    if (!isAdmin() && canManageCategory("notes", user)) {
      state.db.users
        .filter((owner) => owner.id !== user.id)
        .forEach((owner) => records.push({
          key: "notes",
          scope: "private",
          owner_user_id: owner.id,
          data: state.db.notes[owner.id] || { text: "", updatedAt: 0 },
        }));
    }

    return records;
  }

  function applySyncRecord(record) {
    const data = JSON.parse(JSON.stringify(record.data ?? null));
    const ownerId = record.owner_user_id;
    if (record.scope === "shared" && SHARED_SYNC_KEYS.includes(record.key)) {
      state.db[record.key] = record.key === "rankConfig" ? normalizeRankConfig(data) : data;
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
        if (owner && data) Object.assign(owner, {
          rank: normalizeLegacyRank(data.rank || owner.rank),
          exp: Number(data.exp || 0),
        });
        if (data?.identityCard) {
          state.db.identityCards[ownerId] = normalizeIdentityCard(data.identityCard);
        }
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
    state.db.users = (usersData.users || []).map((user) => ({
      ...user,
      rank: normalizeLegacyRank(user.rank),
    }));
    state.user = { id: activeUserId };
    state.syncVersions.clear();
    state.syncFingerprints.clear();
    (syncData.records || []).forEach(applySyncRecord);
    applyCatalogV2Upgrade();
    applyUserPreferences();
    cacheDb(state.db);

    // Pierwsze konto inicjalizuje brakujace rekordy wspolne i prywatne.
    await saveDb();
  }

  function applyCatalogV2Upgrade() {
    if (!isAdmin() || state.db.categoryActivity.catalogV2Applied) return;
    const existingIds = new Set(state.db.products.map((product) => product.id));
    CATALOG_V2_PRODUCTS.forEach((product) => {
      if (!existingIds.has(product.id)) state.db.products.push({ ...product });
    });
    state.db.categoryActivity.catalogV2Applied = {
      sequence: 1,
      updatedAt: Date.now(),
    };
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
    state.globe.style = settings.mapStyle || state.globe.style;
    state.globe.timeFilter = settings.mapTimeFilter || state.globe.timeFilter;
    state.activeCategory = configuration.shopCategory || "all";
    state.activeAdminTab = configuration.adminTab || state.activeAdminTab;
    $("soundToggle").textContent = state.soundEnabled ? "SND ON" : "SND";
  }

  function saveDb() {
    cacheDb(state.db);
    if (!state.token || !currentUser()) return Promise.resolve();

    state.saveQueue = state.saveQueue
      .catch(() => {})
      .then(async () => {
        const uiRevision = state.uiRevision;
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
          if (
            uiRevision === state.uiRevision
            && !["INPUT", "TEXTAREA", "SELECT"].includes(document.activeElement?.tagName)
          ) {
            renderTab(state.activeTab);
          }
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
    const index = rankNames().indexOf(rank);
    return index < 0 ? 0 : index;
  }

  function canViewClassified(classification, user = currentUser()) {
    if (!user || user.role === "admin") return Boolean(user);
    const required = Number(CLASSIFICATION_RANK_INDEX[classification || "jawne"] || 0);
    return rankIndex(user.rank) >= required;
  }

  function classificationBadge(classification) {
    const key = CLASSIFICATIONS[classification] ? classification : "jawne";
    const tone = key === "scisle_tajne" || key === "tajne"
      ? "danger"
      : key === "poufne" ? "warn" : "ok";
    return `<span class="mini-pill ${tone}">${esc(CLASSIFICATIONS[key])}</span>`;
  }

  function rankEntries() {
    return state.db.rankConfig.flatMap((group) => group.ranks.map((rank) => ({
      ...rank,
      corpsId: group.id,
      corpsName: group.name,
    })));
  }

  function rankNames() {
    const names = rankEntries().map((rank) => rank.name).filter(Boolean);
    return names.length ? names : RANKS;
  }

  function canAccessCategory(tab, user = currentUser()) {
    if (!user) return false;
    if (tab === "admin") return hasManagementAccess(user);
    if (tab === "documents") return user.role === "admin";
    return true;
  }

  function canManageCategory(category, user = currentUser()) {
    if (!user) return false;
    if (user.role === "admin") return true;
    if (category === "documents") return false;
    const rank = rankEntries().find((entry) => entry.name === user.rank);
    return rank?.managePermissions?.[category] === true;
  }

  function hasManagementAccess(user = currentUser()) {
    return Boolean(
      user
      && (
        user.role === "admin"
        || MANAGEMENT_PANEL_CATEGORIES.some((key) => canManageCategory(key, user))
      ),
    );
  }

  function managementAction(category, label = "Zarządzaj") {
    if (!canManageCategory(category)) return "";
    return `<button class="ghost-action" data-action="open-category-management" data-tab="${esc(category)}">${esc(label)}</button>`;
  }

  function categoryUnreadCount(tab) {
    if (tab === "messenger") {
      return state.messenger.conversations.reduce(
        (total, conversation) => total + Number(conversation.unreadCount || 0),
        0,
      );
    }
    const user = currentUser();
    if (!user) return 0;
    if (tab === "notes") {
      const updatedAt = Number(state.db.notes[user.id]?.updatedAt || 0);
      const seenAt = Number(state.db.configuration[user.id]?.noteSeenAt || 0);
      return updatedAt > seenAt ? 1 : 0;
    }
    const sequence = Number(state.db.categoryActivity[tab]?.sequence || 0);
    const seen = Number(state.db.configuration[user.id]?.seenActivity?.[tab] || 0);
    return Math.max(0, sequence - seen);
  }

  function markCategorySeen(tab) {
    const user = currentUser();
    if (!user || tab === "messenger") return;
    const sequence = Number(state.db.categoryActivity[tab]?.sequence || 0);
    const configuration = state.db.configuration[user.id] || {};
    if (tab === "notes") {
      configuration.noteSeenAt = Number(state.db.notes[user.id]?.updatedAt || Date.now());
    }
    configuration.seenActivity = { ...(configuration.seenActivity || {}), [tab]: sequence };
    state.db.configuration[user.id] = configuration;
  }

  function markCategoryActivity(tab) {
    const current = state.db.categoryActivity[tab] || { sequence: 0 };
    state.db.categoryActivity[tab] = {
      sequence: Number(current.sequence || 0) + 1,
      updatedAt: Date.now(),
    };
  }

  function updateDockState() {
    const user = currentUser();
    if (!user) return;
    document.querySelectorAll(".dock-item[data-tab]").forEach((button) => {
      const tab = button.dataset.tab;
      const allowed = tab === "admin" ? hasManagementAccess(user) : canAccessCategory(tab, user);
      button.classList.toggle("permission-hidden", !allowed);
      const badge = button.querySelector(".dock-badge");
      if (!badge) return;
      const count = allowed ? categoryUnreadCount(tab) : 0;
      badge.textContent = count > 99 ? "99+" : String(count);
      badge.classList.toggle("hidden", count <= 0);
    });
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
      .filter((announcement) => (
        announcement.expiresAt > Date.now()
        && canViewClassified(announcement.classification)
      ))
      .sort((a, b) => a.expiresAt - b.expiresAt);
  }

  function cleanupExpiredAnnouncements(shouldSave = true) {
    const before = state.db.announcements.length;
    state.db.announcements = state.db.announcements.filter((announcement) => announcement.expiresAt > Date.now());
    if (shouldSave && before !== state.db.announcements.length) saveDb();
  }

  function logAction(action, detail, userOverride = null, options = {}) {
    const user = userOverride || currentUser();
    const now = Date.now();
    const nick = user?.nick || "system";
    const category = options.category || inferLogCategory(action);
    const severity = options.severity || "info";
    const source = options.source || (nick === "system" ? "ABW CORE" : "PANEL AGENTA");
    const device = options.device || state.security?.devices?.[0]?.deviceName || navigator.platform || "";
    const latest = state.db.logs[0];
    if (
      latest
      && !latest.printedAt
      && !latest.printExcluded
      && latest.nick === nick
      && latest.action === action
      && latest.detail === detail
      && latest.category === category
      && now - Number(latest.time || 0) <= 60_000
    ) {
      latest.repeatCount = Number(latest.repeatCount || 1) + 1;
      latest.time = now;
      saveDb();
      return;
    }
    state.db.logs.unshift({
      id: uid("log"),
      time: now,
      userId: user?.id || "",
      nick,
      action,
      detail,
      category,
      severity,
      source,
      device,
      repeatCount: 1,
      printExcluded: false,
      printedAt: 0,
      printBatchId: "",
      printedBy: "",
    });
    state.db.logs = state.db.logs.slice(0, 500);
    saveDb();
  }

  function inferLogCategory(action) {
    const value = String(action || "").toLowerCase();
    if (value.includes("logow") || value.includes("konto") || value.includes("blokad") || value.includes("hasł")) return "auth";
    if (value.includes("misj") || value.includes("operac") || value.includes("raport")) return "mission";
    if (value.includes("admin") || value.includes("edycja") || value.includes("usunięto") || value.includes("dodano")) return "admin";
    if (value.includes("zamów") || value.includes("produkt") || value.includes("zasob")) return "order";
    if (value.includes("wiadomo") || value.includes("rozmow") || value.includes("kanał")) return "communication";
    if (value.includes("znalez") || value.includes("anomali")) return "finding";
    return "system";
  }

  function recordOperationalFinding() {
    if (!currentUser()) return;
    const latestFinding = state.db.logs.find((log) => log.category === "finding");
    if (latestFinding && Date.now() - Number(latestFinding.time || 0) < 10 * 60 * 1000) return;
    const [source, detail] = SYSTEM_FINDINGS[Math.floor(Math.random() * SYSTEM_FINDINGS.length)];
    const sector = `SEKTOR ${String.fromCharCode(65 + Math.floor(Math.random() * 8))}-${10 + Math.floor(Math.random() * 80)}`;
    logAction(
      "znalezisko operacyjne",
      `${sector} // ${detail}`,
      { id: "", nick: "system" },
      { category: "finding", severity: "watch", source },
    );
  }

  async function handleLogin(event) {
    event.preventDefault();
    const nick = $("loginNick").value.trim();
    const password = $("loginPassword").value.trim();
    await handleServerLogin(nick, password);
  }

  async function handleServerLogin(nick, password) {
    const button = $("loginForm").querySelector('button[type="submit"]');
    button.disabled = true;
    button.textContent = "Łączenie z serwerem...";
    setLoginStatus("Łączenie z serwerem ABW...", "warn");
    setAccountStatus("Weryfikacja danych konta...", "warn", "-- / 3", "Sprawdzanie");
    try {
      const data = await window.ABWApi.login(nick, password);
      state.serverOnline = true;
      state.token = data.token;
      setAccountStatus("Konto aktywne", "ok", "3 / 3", "Brak");
      await loadOnlineState(data.user.id);
      setLoginStatus("ACCESS GRANTED", "ok");
      playSound("success");
      $("accessGranted").classList.add("visible");
      window.setTimeout(() => {
        $("accessGranted").classList.remove("visible");
        showOs();
      }, 720);
      if (data.security?.newDevice) {
        window.setTimeout(() => {
          showNotification("Nowe urządzenie", `Pierwsze logowanie: ${data.security.deviceName}`);
        }, 1400);
      }
    } catch (error) {
      if (!error.status) {
        state.serverOnline = false;
        initializeServerConnection({ restoreSession: false });
      }
      if (error.status) {
        state.serverOnline = true;
        setLoginStatus("Serwer ABW online", "ok");
        renderAccountStatusFromResponse(error.data, error.message);
      } else {
        setAccountStatus("Nie można sprawdzić konta", "warn", "-- / 3", "Brak połączenia");
      }
      playSound("error");
    } finally {
      button.disabled = false;
      button.textContent = "Autoryzuj dostęp";
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

  function setAccountStatus(text, kind, attempts, lockStatus) {
    const node = $("accountStatus");
    if (!node) return;
    node.textContent = text;
    node.className = `account-status ${kind}`;
    $("accountAttempts").textContent = `Próby hasła: ${attempts}`;
    $("accountLockStatus").textContent = `Blokada: ${lockStatus}`;
  }

  function renderAccountStatusFromResponse(data = {}, fallback = "") {
    const maxAttempts = Number(data.max_attempts || 3);
    const remainingAttempts = Number.isFinite(Number(data.remaining_attempts))
      ? Number(data.remaining_attempts)
      : null;
    const attemptsText = remainingAttempts === null ? `-- / ${maxAttempts}` : `${remainingAttempts} / ${maxAttempts}`;
    const lockedUntil = data.locked_until ? new Date(data.locked_until).getTime() : 0;
    state.accountLockedUntil = lockedUntil;
    if (data.status === "disabled" || data.disabled) {
      setAccountStatus("Konto zablokowane przez administratora", "danger", attemptsText, "Bezterminowa");
      return;
    }
    if (data.status === "locked" || lockedUntil > Date.now()) {
      setAccountStatus(
        "Konto czasowo zablokowane",
        "danger",
        attemptsText,
        lockedUntil ? timeLeft(lockedUntil) : "Aktywna",
      );
      return;
    }
    if (data.status === "unknown") {
      setAccountStatus("Nie znaleziono konta", "warn", attemptsText, "Brak");
      return;
    }
    if (data.status === "active") {
      setAccountStatus(
        remainingAttempts !== null && remainingAttempts < maxAttempts
          ? "Konto aktywne — błędne próby zapisane"
          : "Konto aktywne",
        remainingAttempts !== null && remainingAttempts < maxAttempts ? "warn" : "ok",
        attemptsText,
        "Brak",
      );
      return;
    }
    setAccountStatus(fallback || "Nie udało się określić stanu konta", "warn", attemptsText, "Brak danych");
  }

  function handleLoginIdentifierInput() {
    updateLoginStatus();
    window.clearTimeout(state.accountStatusTimer);
    state.accountStatusTimer = window.setTimeout(refreshLoginAccountStatus, 320);
  }

  async function refreshLoginAccountStatus() {
    const nick = $("loginNick")?.value.trim();
    const requestId = ++state.accountStatusRequest;
    if (!nick) {
      setAccountStatus("Wpisz nick lub ID agenta", "neutral", "-- / 3", "Brak danych");
      return;
    }
    if (!state.serverOnline) {
      setAccountStatus("Oczekiwanie na serwer ABW", "warn", "-- / 3", "Brak danych");
      return;
    }
    setAccountStatus("Sprawdzanie konta...", "warn", "-- / 3", "Sprawdzanie");
    try {
      const data = await window.ABWApi.getAccountStatus(nick);
      if (requestId !== state.accountStatusRequest || $("loginNick").value.trim() !== nick) return;
      renderAccountStatusFromResponse(data);
    } catch (error) {
      if (requestId !== state.accountStatusRequest) return;
      setAccountStatus("Nie udało się sprawdzić konta", "warn", "-- / 3", "Brak danych");
    }
  }

  function updateLoginStatus() {
    const nick = $("loginNick")?.value.trim();
    if (SERVER_MODE) {
      if (state.serverConnecting) {
        setLoginStatus("Uruchamianie serwera ABW...", "warn");
      } else if (!state.serverOnline) {
        setLoginStatus("Ponawianie połączenia z serwerem ABW...", "warn");
      } else if (!nick) {
        setLoginStatus("Serwer ABW online", "ok");
      } else {
        setLoginStatus("Serwer ABW online", "ok");
      }
      updateAccountLockCountdown();
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

  function updateAccountLockCountdown() {
    if (!state.accountLockedUntil) return;
    if (state.accountLockedUntil > Date.now()) {
      $("accountLockStatus").textContent = `Blokada: ${timeLeft(state.accountLockedUntil)}`;
      return;
    }
    state.accountLockedUntil = 0;
    if ($("loginNick")?.value.trim()) refreshLoginAccountStatus();
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
    $("app").classList.toggle("management-session", hasManagementAccess(user));
    $("systemStatus").textContent = SERVER_MODE ? "SERWER ONLINE" : "STABILNY";
    state.lastActivity = Date.now();
    renderIdentity();
    const lastTab = state.db.configuration[user.id]?.lastTab;
    const preferredTab = lastTab === "admin" && !hasManagementAccess(user) ? "dashboard" : lastTab || "dashboard";
    switchTab(canAccessCategory(preferredTab, user) ? preferredTab : "dashboard", false);
    startIdleTimer();
    startServerSync();
    refreshMessenger({ notify: false });
    refreshOperationalStatus();
    window.setTimeout(recordOperationalFinding, 2500);
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
    if (state.messageInterval) window.clearInterval(state.messageInterval);
    state.messageInterval = null;
    if (state.presenceInterval) window.clearInterval(state.presenceInterval);
    state.presenceInterval = null;
    state.messenger = {
      conversations: [],
      activeConversationId: "",
      messages: [],
      loaded: false,
      lastUnreadCount: 0,
      searchQuery: "",
      searchResults: [],
      replyTo: null,
      presence: [],
      typingTimer: null,
      attachment: null,
      refreshRequestId: 0,
      conversationRequestId: 0,
    };
    state.security = {
      devices: [],
      serverStatus: null,
      backups: [],
      loaded: false,
    };
  }

  function startServerSync() {
    if (!SERVER_MODE || !state.token) return;
    if (state.syncInterval) window.clearInterval(state.syncInterval);
    state.syncInterval = window.setInterval(syncFromServer, 10000);
    if (state.messageInterval) window.clearInterval(state.messageInterval);
    state.messageInterval = window.setInterval(() => refreshMessenger({ notify: true }), 10000);
    if (state.presenceInterval) window.clearInterval(state.presenceInterval);
    state.presenceInterval = window.setInterval(refreshOperationalStatus, 10000);
  }

  async function refreshOperationalStatus() {
    if (!state.token || !currentUser()) return;
    const activeMission = visibleMissions().find((mission) => mission.status === "w trakcie");
    try {
      await window.ABWApi.updatePresence({
        status: state.db.events.some((event) => event.severity === "red")
          ? "alarm"
          : activeMission ? "misja" : "online",
        conversationId: state.activeTab === "messenger"
          ? state.messenger.activeConversationId || null
          : null,
        typing: false,
      });
      const tasks = [
        window.ABWApi.getPresence(),
        window.ABWApi.getDevices(),
      ];
      if (isAdmin()) {
        tasks.push(window.ABWApi.getServerStatus(), window.ABWApi.getBackups());
      }
      const [presenceData, devicesData, statusData, backupsData] = await Promise.all(tasks);
      state.messenger.presence = presenceData?.users || [];
      state.security.devices = devicesData?.devices || [];
      if (statusData) state.security.serverStatus = statusData;
      if (backupsData) state.security.backups = backupsData.backups || [];
      state.security.loaded = true;
      if (state.activeTab === "profile") renderProfile();
      if (state.activeTab === "messenger") renderMessenger();
      if (state.activeTab === "admin" && ["status", "backups"].includes(state.activeAdminTab)) {
        renderAdmin();
      }
    } catch (error) {
      if (error.status === 401) logout("expired");
    }
  }

  async function syncFromServer() {
    if (!state.token || state.noteDirty) return;
    if (["INPUT", "TEXTAREA", "SELECT"].includes(document.activeElement?.tagName)) return;
    try {
      const requestId = ++state.syncRequestId;
      const uiRevision = state.uiRevision;
      const activeTab = state.activeTab;
      const activeAdminTab = state.activeAdminTab;
      const activeConversationId = state.messenger.activeConversationId;
      await state.saveQueue.catch(() => {});
      const activeUserId = state.user?.id;
      const knownEventIds = new Set(state.db.events.map((event) => event.id));
      const previousActivity = JSON.parse(JSON.stringify(state.db.categoryActivity || {}));
      const [syncData, usersData] = await Promise.all([
        window.ABWApi.getSyncData(),
        window.ABWApi.getUsers(),
      ]);
      if (requestId !== state.syncRequestId) return;
      state.db.users = (usersData.users || state.db.users).map((user) => ({
        ...user,
        rank: normalizeLegacyRank(user.rank),
      }));
      (syncData.records || []).forEach(applySyncRecord);
      const newEvent = state.db.events.find((event) => !knownEventIds.has(event.id));
      state.user = activeUserId && findUser(activeUserId) ? { id: activeUserId } : null;
      if (!state.user) {
        logout("expired");
        return;
      }
      cacheDb(state.db);
      renderIdentity();
      const viewUnchanged = uiRevision === state.uiRevision
        && activeTab === state.activeTab
        && activeAdminTab === state.activeAdminTab
        && activeConversationId === state.messenger.activeConversationId;
      if (
        (state.activeTab === "admin" && !hasManagementAccess())
        || (state.activeTab !== "admin" && !canAccessCategory(state.activeTab))
      ) {
        switchTab("dashboard", false);
      } else if (viewUnchanged) {
        renderTab(state.activeTab);
      }
      updateDockState();
      const changedCategory = ACCESS_CATEGORIES.find(([key]) => (
        key !== state.activeTab
        && canAccessCategory(key)
        && Number(state.db.categoryActivity[key]?.sequence || 0)
          > Number(previousActivity[key]?.sequence || 0)
      ));
      if (changedCategory) {
        showNotification(`Nowość: ${changedCategory[1]}`, "W systemie pojawiła się nowa treść.");
      }
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
    $("managementDockLabel").textContent = user.role === "admin" ? "Admin" : "Zarządzanie";
    $("app").classList.toggle("admin-session", user.role === "admin");
    $("app").classList.toggle("management-session", hasManagementAccess(user));
    updateDockState();
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
      updateWorldClocks();
  }

  function switchTab(tab, shouldPersist = true) {
    if (tab === "admin" && !hasManagementAccess()) return;
    if (tab !== "admin" && !canAccessCategory(tab)) {
      showToast("Brak uprawnień do tej kategorii");
      return;
    }
    state.activeTab = tab;
    state.uiRevision += 1;
    document.querySelectorAll(".dock-item").forEach((button) => {
      button.classList.toggle("active", button.dataset.tab === tab);
    });
    document.querySelectorAll(".tab-panel").forEach((panel) => {
      panel.classList.toggle("active", panel.id === `tab-${tab}`);
    });
    renderTab(tab);
    markCategorySeen(tab);
    updateDockState();
    playSound("beep");
    if (tab === "map") window.setTimeout(initWorldMap, 30);
    if (shouldPersist && currentUser()) {
      state.db.configuration[currentUser().id] = {
        ...(state.db.configuration[currentUser().id] || {}),
        lastTab: tab,
        shopCategory: state.activeCategory,
        adminTab: state.activeAdminTab,
      };
      saveDb();
    }
  }

  function renderTab(tab) {
    const renderers = {
      dashboard: renderDashboard,
      profile: renderProfile,
      announcements: renderAnnouncements,
      info: renderInfo,
      shop: renderShop,
      notes: renderNotes,
      map: renderMap,
      clocks: renderClocks,
      documents: renderDocuments,
      calendar: renderCalendar,
      contacts: renderContacts,
      logistics: renderLogistics,
      missions: renderMissions,
      events: renderEvents,
      messenger: renderMessenger,
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
    const dashboardWidgets = {
      stats: true,
      sonar: true,
      mission: true,
      events: true,
      announcements: true,
      ...(currentConfiguration(user.id).dashboardWidgets || {}),
    };
    const missions = visibleMissions();
    const activeMission = missions.find((mission) => ["aktywna", "w trakcie"].includes(mission.status));
    const opsFeed = randomOperationalFeed();
    const events = state.db.events
      .filter((event) => canViewClassified(event.classification))
      .slice(0, 4);
    const announcements = activeAnnouncements();
    const orderCount = state.db.orders.filter((order) => order.userId === user.id).length;
    $("tab-dashboard").innerHTML = `
      ${header("COMMAND DESKTOP", "Pulpit operacyjny ABW", "Pełnoekranowy rdzeń dowodzenia: sonar, aktywność konta, misje, alerty i szybki podgląd zasobów.", `<button class="danger-action" data-action="trigger-evacuation">Procedura ewakuacji</button>`)}
      <details class="dashboard-settings">
        <summary>Widżety pulpitu</summary>
        <div class="permission-grid">
          ${Object.entries({
            stats: "Statystyki",
            sonar: "Sonar",
            mission: "Misja i feed",
            events: "Zdarzenia",
            announcements: "Ogłoszenia",
          }).map(([key, label]) => `<label><input type="checkbox" data-action="dashboard-widget" data-widget="${key}" ${dashboardWidgets[key] ? "checked" : ""} /> ${label}</label>`).join("")}
        </div>
      </details>
      <div class="stat-grid" data-dashboard-section="stats">
        <div class="stat-tile"><span>Ranga</span><strong>${esc(user.rank)}</strong><em>${esc(user.badge)}</em></div>
        <div class="stat-tile"><span>EXP</span><strong>${Number(user.exp).toLocaleString("pl-PL")}</strong><em>Postęp awansowy aktywny</em></div>
        <div class="stat-tile"><span>Zamówienia</span><strong>${orderCount}</strong><em>Bez limitów zaopatrzenia</em></div>
        <div class="stat-tile"><span>Ogłoszenia</span><strong>${announcements.length}</strong><em>Automatycznie wygasają</em></div>
      </div>
      <div class="command-grid dashboard-primary-grid">
        <div class="module-panel sonar-panel" data-dashboard-section="sonar">
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
        <div class="module-panel" data-dashboard-section="mission">
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
      <div class="command-grid dashboard-secondary-grid" style="margin-top:14px">
        <div class="module-panel" data-dashboard-section="events">
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
        <div class="module-panel" data-dashboard-section="announcements">
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
    Object.entries(dashboardWidgets).forEach(([key, visible]) => {
      document.querySelectorAll(`[data-dashboard-section="${CSS.escape(key)}"]`)
        .forEach((element) => element.classList.toggle("hidden", !visible));
    });
    initSonar();
  }

  function getIdentityCard(user) {
    if (!user) return normalizeIdentityCard();
    state.db.identityCards[user.id] = normalizeIdentityCard(state.db.identityCards[user.id]);
    return state.db.identityCards[user.id];
  }

  function identityStatusLabel(status) {
    return {
      active: "AKTYWNA",
      suspended: "ZAWIESZONA",
      expired: "WYGASŁA",
    }[status] || "AKTYWNA";
  }

  function renderIdentityPhoto(user, card) {
    if (card.photoData) {
      return `<div class="agent-id-photo has-photo"><img src="${esc(card.photoData)}" alt="Zdjęcie agenta ${esc(user.nick)}" /></div>`;
    }
    return `<div class="agent-id-photo">${esc(user.nick.slice(0, 2).toUpperCase())}</div>`;
  }

  function renderProfile() {
    const user = currentUser();
    if (!user) return;
    const identity = getIdentityCard(user);
    const rankEntry = rankEntries().find((entry) => entry.name === user.rank);
    const missions = state.db.missions.filter((mission) => mission.assignedTo?.includes(user.id));
    const completed = missions.filter((mission) => mission.status === "wykonana");
    const failed = missions.filter((mission) => mission.status === "nieudana");
    const reports = missions.flatMap((mission) => (
      (mission.reports || []).filter((report) => report.userId === user.id)
    ));
    const ratings = missions
      .map((mission) => Number(mission.evaluation?.score || 0))
      .filter(Boolean);
    const average = ratings.length
      ? (ratings.reduce((sum, value) => sum + value, 0) / ratings.length).toFixed(1)
      : "-";
    const calculatedClearance = Object.entries(CLASSIFICATION_RANK_INDEX)
      .filter(([, threshold]) => rankIndex(user.rank) >= threshold)
      .at(-1)?.[0] || "jawne";
    const highestClearance = identity.clearance || calculatedClearance;
    const expiryDays = identity.validUntil
      ? Math.ceil((new Date(`${identity.validUntil}T23:59:59`).getTime() - Date.now()) / 86400000)
      : null;
    const devices = state.security.devices || [];
    $("tab-profile").innerHTML = `
      ${header(
        "AGENT ID CORE",
        "Legitymacja i akta personalne",
        "Profil służbowy generowany z danych konta, historii operacji i zarejestrowanych urządzeń.",
        isAdmin() ? `<button class="ghost-action" data-action="word-identity" data-id="${esc(user.id)}">Drukuj</button>` : "",
      )}
      <div class="profile-layout">
        <article class="agent-id-card identity-${esc(identity.status)}">
          <div class="agent-id-top">
            <span>AUSTRALIJSKIE BIURO WIELORYBÓW</span>
            <strong>ABW</strong>
          </div>
          <div class="agent-id-main">
            ${renderIdentityPhoto(user, identity)}
            <div>
              <span class="module-kicker">CYFROWA LEGITYMACJA</span>
              <h2>${esc(user.nick)}</h2>
              <p>${esc(user.fullName)}</p>
              <dl>
                <div><dt>Odznaka</dt><dd>${esc(user.badge)}</dd></div>
                <div><dt>Ranga</dt><dd>${esc(user.rank)}</dd></div>
                <div><dt>Korpus</dt><dd>${esc(rankEntry?.corpsName || "ABW")}</dd></div>
                <div><dt>Klauzula</dt><dd>${esc(CLASSIFICATIONS[highestClearance])}</dd></div>
                <div><dt>Kryptonim</dt><dd>${esc(identity.callsign || "-")}</dd></div>
                <div><dt>Jednostka</dt><dd>${esc(identity.unit || "-")}</dd></div>
              </dl>
            </div>
          </div>
          <div class="agent-id-code">
            <span>${esc(`${user.badge}-${user.id.slice(0, 8)}`.toUpperCase())}</span>
            <strong>${esc(identityStatusLabel(identity.status))}</strong>
          </div>
          <div class="identity-qr-wrap">
            ${state.identityQrs[user.id] ? `<img src="${esc(state.identityQrs[user.id])}" alt="Kod QR legitymacji" />` : `<span>QR</span>`}
          </div>
        </article>
        <section class="module-panel personnel-file">
          <span class="module-kicker">AKTA PERSONALNE</span>
          <h2>${esc(user.fullName)}</h2>
          <div class="personnel-grid">
            <div><span>EXP</span><strong>${Number(user.exp || 0)}</strong></div>
            <div><span>Misje wykonane</span><strong>${completed.length}</strong></div>
            <div><span>Misje nieudane</span><strong>${failed.length}</strong></div>
            <div><span>Raporty</span><strong>${reports.length}</strong></div>
            <div><span>Ocena operacji</span><strong>${average}</strong></div>
            <div><span>Zamówienia</span><strong>${state.db.orders.filter((order) => order.userId === user.id).length}</strong></div>
          </div>
          <div class="identity-details">
            <div><span>Specjalizacja</span><strong>${esc(identity.specialization || "Nie przypisano")}</strong></div>
            <div><span>Grupa krwi</span><strong>${esc(identity.bloodType || "-")}</strong></div>
            <div><span>Ważna do</span><strong>${esc(identity.validUntil || "Bezterminowo")}</strong></div>
          </div>
          <div class="classification-strip">${classificationBadge(highestClearance)} <span>${identity.clearance ? "Poziom dostępu nadany przez administratora" : "Poziom dostępu wyliczony z rangi"}</span></div>
          ${expiryDays !== null && expiryDays <= 30 ? `<div class="identity-expiry-warning ${expiryDays < 0 ? "expired" : ""}">${expiryDays < 0 ? "Legitymacja wygasła" : `Legitymacja wygasa za ${expiryDays} dni`}</div>` : ""}
          ${(identity.history || []).length ? `
            <details class="identity-history">
              <summary>Historia legitymacji (${identity.history.length})</summary>
              ${identity.history.slice(0, 10).map((entry) => `<div><time>${esc(formatTime(entry.time))}</time><span>${esc(entry.by || "admin")}</span><small>${esc(entry.summary || "Zmiana danych dokumentu")}</small></div>`).join("")}
            </details>
          ` : ""}
        </section>
      </div>
      <div class="command-grid" style="margin-top:14px">
        <section class="module-panel">
          <span class="module-kicker">HISTORIA URZĄDZEŃ</span>
          <h2>Logowania agenta</h2>
          <div class="device-list">
            ${devices.map((device, index) => `
              <div class="device-row">
                <span class="mini-pill ${index === 0 ? "ok" : ""}">${index === 0 ? "BIEŻĄCE / OSTATNIE" : "ZNANE"}</span>
                <div><strong>${esc(device.deviceName)}</strong><small>${esc(device.ipAddress)} // ${esc(formatTime(device.lastSeenAt))}</small></div>
                <em>${Number(device.loginCount)} log.</em>
              </div>
            `).join("") || `<div class="empty-state">Historia urządzeń jest pobierana z serwera.</div>`}
          </div>
        </section>
        <section class="module-panel">
          <span class="module-kicker">OPERATION RECORD</span>
          <h2>Ostatnie raporty</h2>
          <div class="report-list">
            ${reports.slice(-5).reverse().map((report) => `
              <article class="report-summary">
                <strong>${esc(report.result || "Raport operacyjny")}</strong>
                <p>${esc(report.losses || "Brak zgłoszonych strat")}</p>
                <time>${esc(formatTime(report.createdAt))}</time>
              </article>
            `).join("") || `<div class="empty-state">Agent nie złożył jeszcze raportu końcowego.</div>`}
          </div>
        </section>
      </div>
    `;
    ensureIdentityQr(user.id);
  }

  async function ensureIdentityQr(userId) {
    if (!userId || state.identityQrs[userId] || state.identityQrLoading.has(userId) || !state.token) return;
    state.identityQrLoading.add(userId);
    try {
      const result = await window.ABWApi.getIdentityQr(userId);
      state.identityQrs[userId] = result.qrDataUrl;
      if (state.activeTab === "profile" && currentUser()?.id === userId) renderProfile();
      if (state.activeTab === "admin" && state.activeAdminTab === "identities") renderAdmin();
    } catch (error) {
      // The identity remains usable even if the QR service is temporarily unavailable.
    } finally {
      state.identityQrLoading.delete(userId);
    }
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
      ${header("ANNOUNCEMENT CORE", "Ogłoszenia dowództwa", "Lista komunikatów dowództwa. Każde ogłoszenie ma licznik i znika automatycznie po wygaśnięciu.", managementAction("announcements", "Publikuj"))}
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
          ${classificationBadge(announcement.classification)}
        </div>
      </article>
    `;
  }

  function renderInfo() {
    const visibleInfo = state.db.info.filter((item) => canViewClassified(item.classification));
    $("tab-info").innerHTML = `
      ${header("INFORMATION CORE", "Stałe komunikaty ABW", "Komunikaty systemowe, instrukcje i alerty jednostki.", managementAction("info"))}
      <div class="info-list">
        ${visibleInfo.map((item) => `
          <article class="info-line">
            <div>
              <h3>${esc(item.title)}</h3>
              <p>${esc(item.body)}</p>
              <div class="card-footer"><span class="mini-pill ${item.severity === "danger" ? "danger" : item.severity === "warn" ? "warn" : "ok"}">${esc(item.severity.toUpperCase())}</span>${classificationBadge(item.classification)}</div>
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
      ${header("QUARTERMASTER CORE", "Magazyn zasobów ABW", "Dodawaj dowolne zasoby do koszyka i składaj zamówienia bez cen, salda oraz ograniczeń ilości.", managementAction("shop"))}
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
      <section class="module-panel order-history-panel">
        <div class="module-header">
          <div>
            <span class="module-kicker">ORDER ARCHIVE</span>
            <h2>Historia zamówień</h2>
            <p>${isAdmin() ? "Dokument zamówienia można wydrukować w formacie Microsoft Word." : "Dokumenty zamówień drukuje administrator ABW."}</p>
          </div>
        </div>
        <div class="order-history-list">
          ${state.db.orders
            .filter((order) => order.userId === currentUser()?.id)
            .map(renderOrderRow)
            .join("") || `<div class="empty-state">Nie złożono jeszcze żadnego zamówienia.</div>`}
        </div>
      </section>
    `;
  }

  function productStatusLabel(product) {
    return PRODUCT_STATUSES[normalizeProductStatus(product.status)];
  }

  function renderProductCard(product) {
    const quantity = currentCart().find((item) => item.productId === product.id)?.quantity || 0;
    const available = normalizeProductStatus(product.status) === "available";
    return `
      <article class="product-card ${available ? "" : "product-unavailable"}">
        ${renderProductVisual(product)}
        <h3>${esc(product.name)}</h3>
        <p>${esc(product.description)}</p>
        <div class="card-footer">
          <span class="mini-pill ${available ? "ok" : "danger"}">${esc(productStatusLabel(product))}</span>
          <span class="mini-pill">${esc(CATEGORY_LABELS[product.category] || product.category)}</span>
          ${quantity ? `<span class="mini-pill ok">W koszyku: ${quantity}</span>` : ""}
        </div>
        <button class="primary-action" data-action="add-to-cart" data-id="${esc(product.id)}" ${available ? "" : "disabled"}>${available ? "Dodaj do koszyka" : "Zasób niedostępny"}</button>
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
          <span>${esc(productStatusLabel(product))}</span>
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
    const product = state.db.products.find((entry) => entry.id === productId);
    if (!product) return;
    if (delta > 0 && normalizeProductStatus(product.status) !== "available") {
      showToast("Ten zasób jest obecnie niedostępny");
      return;
    }
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
        return product && normalizeProductStatus(product.status) === "available"
          ? { productId: product.id, name: product.name, quantity: item.quantity }
          : null;
      })
      .filter(Boolean);
    if (!items.length) {
      showToast("Koszyk nie zawiera dostępnych zasobów");
      return;
    }
    const order = {
      id: uid("ord"),
      userId: user.id,
      nick: user.nick,
      createdAt: Date.now(),
      status: "placed",
      history: [{ status: "placed", time: Date.now(), by: user.nick }],
      items,
    };
    state.db.orders.unshift(order);
    state.db.carts[user.id] = [];
    logAction("zamówienie zasobów", `${items.reduce((sum, item) => sum + item.quantity, 0)} szt. wyposażenia`);
    saveDb();
    renderShop();
    playSound("success");
    showToast(SERVER_MODE ? "Zamówienie zapisano na serwerze" : "Zamówienie zostało złożone");
  }

  function renderOrderRow(order) {
    const user = findUser(order.userId);
    const total = (order.items || []).reduce((sum, item) => sum + Number(item.quantity || 0), 0);
    return `
      <article class="order-row">
        <div>
          <span class="module-kicker">${esc(order.id.toUpperCase())}</span>
          <strong>${esc(order.nick || user?.nick || "agent")}</strong>
          <small>${esc(formatTime(order.createdAt))} // ${total} szt.</small>
        </div>
        <div class="order-row-items">${(order.items || []).map((item) => `<span>${esc(item.name)} × ${Number(item.quantity || 0)}</span>`).join("")}</div>
        <span class="mini-pill ${order.status === "returned" ? "warn" : order.status === "issued" ? "ok" : ""}">${esc(ORDER_STATUSES[order.status] || order.status || "Złożone")}</span>
        ${isAdmin() ? `<button class="ghost-action" data-action="word-order" data-id="${esc(order.id)}">Drukuj</button>` : ""}
        ${isAdmin() ? `
          <select class="order-status-select" data-action="order-status" data-id="${esc(order.id)}">
            ${Object.entries(ORDER_STATUSES).map(([key, label]) => `<option value="${esc(key)}" ${order.status === key ? "selected" : ""}>${esc(label)}</option>`).join("")}
          </select>
        ` : ""}
      </article>
    `;
  }

  function updateOrderStatus(id, status) {
    if (!isAdmin() || !ORDER_STATUSES[status]) return;
    const order = state.db.orders.find((entry) => entry.id === id);
    if (!order || order.status === status) return;
    order.status = status;
    order.history ||= [];
    order.history.push({
      status,
      time: Date.now(),
      by: currentUser()?.nick || "admin",
    });
    logAction("admin: status zamówienia", `${order.id} // ${ORDER_STATUSES[status]}`);
    saveDb();
    renderAdmin();
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
      ${header("SYNC NOTE CORE", "Prywatny notatnik", `Notatki są przypisane do konta i automatycznie zapisywane ${SERVER_MODE ? "we wspólnej bazie serwera" : "w lokalnej bazie przeglądarki"} co kilka sekund.`, managementAction("notes", "Notatki zespołu"))}
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
    const visibleObjects = state.db.mapObjects.filter(isMapObjectVisible);
    const weather = oceanWeather(visibleObjects[0]?.lat || 0, visibleObjects[0]?.lon || 0);
    const planners = state.messenger.presence.filter((entry) => entry.online).length;
    $("tab-map").innerHTML = `
      ${header("WORLD MAP CORE", "Mapa operacji światowych", "Wspólne planowanie stref, tras, spotkań i ruchu jednostek z synchronizacją między agentami.", managementAction("map"))}
      <div class="map-toolbar">
        <form id="mapCountrySearchForm" class="map-country-search">
          <input name="country" list="mapCountryList" placeholder="Znajdź kraj..." required />
          <datalist id="mapCountryList">
            ${state.globe.labelFeatures.map((feature) => `<option value="${esc(feature.abwCountryLabel)}"></option>`).join("")}
          </datalist>
          <button class="ghost-action" type="submit">Pokaż</button>
        </form>
        <div class="segmented-control">
          <button data-action="map-mode" data-mode="pan" class="${state.globe.mode === "pan" ? "active" : ""}">Przesuwanie</button>
          <button data-action="map-mode" data-mode="measure" class="${state.globe.mode === "measure" ? "active" : ""}">Pomiar</button>
          <button data-action="map-mode" data-mode="route" class="${state.globe.mode === "route" ? "active" : ""}" ${canManageCategory("map") ? "" : "disabled"}>Trasa</button>
          <button data-action="map-mode" data-mode="zone" class="${state.globe.mode === "zone" ? "active" : ""}" ${canManageCategory("map") ? "" : "disabled"}>Strefa</button>
        </div>
        <div class="segmented-control">
          <button data-action="map-style" data-style="tactical" class="${state.globe.style === "tactical" ? "active" : ""}">Taktyczna</button>
          <button data-action="map-style" data-style="satellite" class="${state.globe.style === "satellite" ? "active" : ""}">Satelitarna</button>
        </div>
        <label class="map-time-filter">Aktywność
          <select data-action="map-time-filter">
            <option value="all" ${state.globe.timeFilter === "all" ? "selected" : ""}>Cała historia</option>
            <option value="1h" ${state.globe.timeFilter === "1h" ? "selected" : ""}>Ostatnia godzina</option>
            <option value="24h" ${state.globe.timeFilter === "24h" ? "selected" : ""}>24 godziny</option>
            <option value="7d" ${state.globe.timeFilter === "7d" ? "selected" : ""}>7 dni</option>
          </select>
        </label>
        <span class="mini-pill ok">${planners} agentów online</span>
      </div>
      <div class="map-layout">
        <div class="world-map-shell">
          <canvas id="worldMapCanvas" aria-label="Interaktywna mapa świata ABW"></canvas>
          <div class="map-coordinates" id="mapCoordinates">LAT --.-- / LON --.--</div>
          <div class="map-zoom-controls">
            <button type="button" data-action="map-zoom-in" title="Przybliż mapę">+</button>
            <button type="button" data-action="map-reset-view" title="Pokaż cały świat">◎</button>
            <button type="button" data-action="map-zoom-out" title="Oddal mapę">−</button>
          </div>
          <div class="map-measure-readout" id="mapMeasureReadout">${mapMeasurementLabel()}</div>
          <div class="map-hint">${mapModeHint()}</div>
          <div class="map-credit">Natural Earth · ABW Tactical Projection</div>
          <div id="mapPointDialog" class="map-point-dialog hidden">
            <form id="mapQuickPointForm">
              <div class="map-point-head">
                <strong>Nowy punkt</strong>
                <button type="button" data-action="close-map-point" aria-label="Zamknij">×</button>
              </div>
              <label>Nazwa<input name="name" maxlength="80" required /></label>
              <label>Typ
                <select name="type">
                  <option value="base">Baza</option>
                  <option value="meeting">Spotkanie</option>
                  <option value="unit">Jednostka</option>
                  <option value="route">Trasa</option>
                  <option value="zone">Strefa zagrożenia</option>
                </select>
              </label>
              <label>Warstwa
                <select name="layer">
                  ${Object.entries(LAYER_LABELS).map(([key, label]) => `<option value="${esc(key)}">${esc(label)}</option>`).join("")}
                </select>
              </label>
              <label>Klauzula<select name="classification">${classificationOptions()}</select></label>
              <label>Promień strefy (km)<input name="radiusKm" type="number" min="1" value="250" /></label>
              <label>Prędkość trasy (km/h)<input name="speedKmh" type="number" min="1" value="45" /></label>
              <input name="lat" type="hidden" />
              <input name="lon" type="hidden" />
              <input name="lat2" type="hidden" />
              <input name="lon2" type="hidden" />
              <div class="map-point-position" id="mapPointPosition"></div>
              <button class="primary-action" type="submit">Dodaj punkt</button>
            </form>
          </div>
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
          <div class="weather-panel">
            <span class="module-kicker">OCEAN WEATHER</span>
            <strong>${weather.temperature}°C // ${weather.condition}</strong>
            <div><span>Fale</span><b>${weather.waveHeight} m</b></div>
            <div><span>Wiatr</span><b>${weather.windSpeed} km/h</b></div>
            <div><span>Widzialność</span><b>${weather.visibility} km</b></div>
          </div>
          <h3>Obiekty</h3>
          <div class="object-list">
            ${visibleObjects.map(renderObjectRow).join("") || `<div class="empty-state">Włącz warstwę, aby zobaczyć obiekty.</div>`}
          </div>
        </aside>
      </div>
    `;
    initWorldMap();
  }

  function clockParts(timeZone) {
    const now = new Date();
    const time = new Intl.DateTimeFormat("pl-PL", {
      timeZone,
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    }).format(now);
    const date = new Intl.DateTimeFormat("pl-PL", {
      timeZone,
      weekday: "short",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }).format(now);
    const offset = new Intl.DateTimeFormat("pl-PL", {
      timeZone,
      timeZoneName: "shortOffset",
    }).formatToParts(now).find((part) => part.type === "timeZoneName")?.value || "";
    return { time, date, offset };
  }

  function renderClocks() {
    const bases = state.db.mapObjects
      .filter((object) => object.type === "base" && isMapObjectVisible(object))
      .sort((a, b) => a.name.localeCompare(b.name, "pl"));
    $("tab-clocks").innerHTML = `
      ${header("GLOBAL TIME CORE", "Zegary stref operacyjnych", "Czas lokalny w monitorowanych stolicach, centrach dowodzenia i bazach zaznaczonych na mapie.")}
      <div class="world-clock-grid">
        ${WORLD_CLOCKS.map(([city, country, timeZone, status, tone]) => {
          const parts = clockParts(timeZone);
          return `
            <article class="world-clock-card ${esc(tone)}" data-clock-zone="${esc(timeZone)}">
              <div class="world-clock-head">
                <div>
                  <span class="module-kicker">${esc(country)}</span>
                  <h3>${esc(city)}</h3>
                </div>
                <span class="mini-pill ${tone === "danger" ? "danger" : tone === "friendly" ? "ok" : "warn"}">${esc(status)}</span>
              </div>
              <strong class="world-clock-time">${esc(parts.time)}</strong>
              <div class="world-clock-meta">
                <span class="world-clock-date">${esc(parts.date)}</span>
                <b class="world-clock-offset">${esc(parts.offset)}</b>
              </div>
            </article>
          `;
        }).join("")}
        ${bases.map((base) => {
          const parts = coordinateClockParts(base.lon);
          return `
            <article class="world-clock-card friendly base-clock" data-base-clock="${esc(base.id)}">
              <div class="world-clock-head">
                <div>
                  <span class="module-kicker">BAZA Z MAPY // ${Number(base.lat).toFixed(2)}, ${Number(base.lon).toFixed(2)}</span>
                  <h3>${esc(base.name)}</h3>
                </div>
                <span class="mini-pill ok">BAZA ABW</span>
              </div>
              <strong class="world-clock-time">${esc(parts.time)}</strong>
              <div class="world-clock-meta">
                <span class="world-clock-date">${esc(parts.date)}</span>
                <b class="world-clock-offset">${esc(parts.offset)}</b>
              </div>
            </article>
          `;
        }).join("")}
      </div>
    `;
  }

  function coordinateClockParts(longitude) {
    const offsetHours = Math.max(-12, Math.min(14, Math.round(Number(longitude || 0) / 15)));
    const local = new Date(Date.now() + offsetHours * 60 * 60 * 1000);
    const time = new Intl.DateTimeFormat("pl-PL", {
      timeZone: "UTC",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    }).format(local);
    const date = new Intl.DateTimeFormat("pl-PL", {
      timeZone: "UTC",
      weekday: "short",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }).format(local);
    return {
      time,
      date,
      offset: `UTC${offsetHours >= 0 ? "+" : ""}${offsetHours}`,
    };
  }

  function updateWorldClocks() {
    if (state.activeTab !== "clocks") return;
    document.querySelectorAll("[data-clock-zone]").forEach((card) => {
      const parts = clockParts(card.dataset.clockZone);
      const time = card.querySelector(".world-clock-time");
      const date = card.querySelector(".world-clock-date");
      const offset = card.querySelector(".world-clock-offset");
      if (time) time.textContent = parts.time;
      if (date) date.textContent = parts.date;
      if (offset) offset.textContent = parts.offset;
    });
    document.querySelectorAll("[data-base-clock]").forEach((card) => {
      const base = state.db.mapObjects.find((object) => object.id === card.dataset.baseClock);
      if (!base) return;
      const parts = coordinateClockParts(base.lon);
      const time = card.querySelector(".world-clock-time");
      const date = card.querySelector(".world-clock-date");
      const offset = card.querySelector(".world-clock-offset");
      if (time) time.textContent = parts.time;
      if (date) date.textContent = parts.date;
      if (offset) offset.textContent = parts.offset;
    });
  }

  function currentConfiguration(userId = currentUser()?.id) {
    if (!userId) return {};
    state.db.configuration[userId] ||= {};
    return state.db.configuration[userId];
  }

  function visibleDocuments() {
    if (!isAdmin()) return [];
    return state.db.documents
      .filter((document) => canViewClassified(document.classification))
      .sort((a, b) => Number(b.updatedAt || b.createdAt) - Number(a.updatedAt || a.createdAt));
  }

  function renderDocuments() {
    if (!isAdmin()) {
      $("tab-documents").innerHTML = `<div class="empty-state">Dokumenty są dostępne wyłącznie dla administratora.</div>`;
      return;
    }
    const documents = visibleDocuments();
    $("tab-documents").innerHTML = `
      ${header("DOCUMENT CORE", "Centrum dokumentów i raportów", "Rozkazy, instrukcje, protokoły oraz gotowe raporty operacyjne przechowywane we wspólnym archiwum.", managementAction("documents", "Zarządzaj"))}
      <div class="report-generator-grid">
        ${[
          ["daily", "Raport dzienny", "Aktywność, zdarzenia, misje i zamówienia z ostatnich 24 godzin."],
          ["weekly", "Raport tygodniowy", "Zbiorcze podsumowanie siedmiu dni pracy jednostki."],
          ["monthly", "Raport miesięczny", "Pełny obraz operacyjny z ostatnich 30 dni."],
        ].map(([type, title, description]) => `
          <article class="module-panel report-generator-card">
            <span class="module-kicker">REPORT GENERATOR</span>
            <h3>${esc(title)}</h3>
            <p>${esc(description)}</p>
            <button class="ghost-action" data-action="print-system-report" data-report-type="${esc(type)}">Drukuj</button>
          </article>
        `).join("")}
      </div>
      <div class="document-grid">
        ${documents.map((document) => `
          <article class="document-card">
            <div class="card-footer">
              <span class="mini-pill">${esc(DOCUMENT_TYPES[document.type] || document.type)}</span>
              <span class="mini-pill">Wersja ${Number(document.version || 1)}</span>
              ${classificationBadge(document.classification)}
            </div>
            <h3>${esc(document.title)}</h3>
            <p>${esc(document.body)}</p>
            <div class="document-meta-line">
              <span>${esc(document.author || "ABW CORE")}</span>
              <time>${esc(formatTime(document.updatedAt || document.createdAt))}</time>
            </div>
            <button class="ghost-action" data-action="print-document" data-id="${esc(document.id)}">Drukuj</button>
          </article>
        `).join("") || `<div class="empty-state">Archiwum dokumentów jest puste.</div>`}
      </div>
    `;
  }

  function allLeaveRequests() {
    const privateRequests = state.db.users.flatMap((user) => (
      Array.isArray(state.db.configuration[user.id]?.leaveRequests)
        ? state.db.configuration[user.id].leaveRequests.map((request) => ({
          ...request,
          userId: user.id,
          nick: request.nick || user.nick,
        }))
        : []
    ));
    return [...state.db.leaveRequests, ...privateRequests]
      .filter((request, index, list) => list.findIndex((item) => item.id === request.id) === index)
      .sort((a, b) => Number(b.createdAt) - Number(a.createdAt));
  }

  function renderCalendar() {
    const user = currentUser();
    const events = state.db.calendarEvents
      .filter((event) => canViewClassified(event.classification))
      .sort((a, b) => Number(a.startsAt) - Number(b.startsAt));
    const ownRequests = allLeaveRequests().filter((request) => request.userId === user?.id);
    const passes = state.db.temporaryPasses
      .filter((pass) => pass.userId === user?.id && pass.active !== false)
      .sort((a, b) => String(a.validUntil).localeCompare(String(b.validUntil)));
    $("tab-calendar").innerHTML = `
      ${header("OPERATION CALENDAR", "Kalendarz operacyjny", "Terminy operacji, odprawy, szkolenia, urlopy i aktywne przepustki czasowe.", managementAction("calendar", "Zarządzaj"))}
      <div class="calendar-layout">
        <section class="module-panel">
          <span class="module-kicker">NADCHODZĄCE TERMINY</span>
          <div class="timeline-list">
            ${events.map((event) => `
              <article class="timeline-entry">
                <time>${esc(formatTime(event.startsAt))}</time>
                <div>
                  <strong>${esc(event.title)}</strong>
                  <p>${esc(event.description || "")}</p>
                  <span class="mini-pill">${esc(event.type || "operacja")}</span>
                  ${classificationBadge(event.classification)}
                </div>
              </article>
            `).join("") || `<div class="empty-state">Brak zaplanowanych terminów.</div>`}
          </div>
        </section>
        <aside class="module-panel">
          <span class="module-kicker">WNIOSEK URLOPOWY</span>
          <form id="leaveRequestForm" class="form-grid compact-form">
            <label>Od<input name="from" type="date" required /></label>
            <label>Do<input name="to" type="date" required /></label>
            <label class="full">Powód<textarea name="reason" maxlength="500" required></textarea></label>
            <div class="full"><button class="primary-action" type="submit">Wyślij wniosek</button></div>
          </form>
          <div class="request-list">
            ${ownRequests.map((request) => `
              <div class="request-row">
                <span class="mini-pill ${request.status === "approved" ? "ok" : request.status === "rejected" ? "danger" : "warn"}">${esc(LEAVE_STATUSES[request.status] || request.status)}</span>
                <strong>${esc(request.from)} - ${esc(request.to)}</strong>
                <small>${esc(request.reason)}</small>
              </div>
            `).join("") || `<div class="empty-state compact">Nie złożono wniosków.</div>`}
          </div>
          <h3>Przepustki czasowe</h3>
          ${passes.map((pass) => `
            <div class="request-row">
              <span class="mini-pill ok">AKTYWNA</span>
              <strong>${esc(pass.label || "Przepustka ABW")}</strong>
              <small>Ważna do ${esc(pass.validUntil || "-")}</small>
            </div>
          `).join("") || `<div class="empty-state compact">Brak aktywnych przepustek.</div>`}
        </aside>
      </div>
    `;
  }

  function renderContacts() {
    const presence = new Map(state.messenger.presence.map((entry) => [entry.id, entry]));
    $("tab-contacts").innerHTML = `
      ${header("CONTACT DIRECTORY", "Katalog kontaktów ABW", "Służbowy katalog agentów oparty na nickach, jednostkach i bieżącej obecności w systemie.")}
      <div class="contact-grid">
        ${state.db.users.filter((user) => !user.disabled).map((user) => {
          const card = getIdentityCard(user);
          const status = presence.get(user.id);
          return `
            <article class="contact-card">
              <div class="contact-avatar">${esc(user.nick.slice(0, 2).toUpperCase())}</div>
              <div>
                <span class="module-kicker">${status?.online ? "ONLINE" : "OFFLINE"}</span>
                <h3>${esc(user.nick)}</h3>
                <p>${esc(user.rank)} // ${esc(card.unit || "ABW")}</p>
                <small>${esc(card.callsign ? `Kryptonim ${card.callsign}` : user.badge)}</small>
              </div>
              ${user.id !== currentUser()?.id ? `<button class="ghost-action" data-action="contact-message" data-id="${esc(user.id)}">Napisz</button>` : `<span class="mini-pill ok">TY</span>`}
            </article>
          `;
        }).join("")}
      </div>
    `;
  }

  function renderLogistics() {
    const assets = state.db.equipmentAssets;
    const vehicles = state.db.vehicles;
    $("tab-logistics").innerHTML = `
      ${header("LOGISTICS CORE", "Logistyka i przydziały", "Stan magazynu, numery seryjne, sprzęt przydzielony agentom oraz gotowość pojazdów i jednostek.", managementAction("logistics", "Zarządzaj"))}
      <div class="logistics-summary">
        <div><span>Sprzęt w magazynie</span><strong>${assets.filter((asset) => asset.status === "magazyn").length}</strong></div>
        <div><span>Sprzęt wydany</span><strong>${assets.filter((asset) => asset.status === "wydany").length}</strong></div>
        <div><span>Pojazdy gotowe</span><strong>${vehicles.filter((vehicle) => vehicle.status === "gotowy").length}</strong></div>
        <div><span>W serwisie</span><strong>${vehicles.filter((vehicle) => vehicle.status === "serwis").length}</strong></div>
      </div>
      <div class="command-grid">
        <section class="module-panel">
          <span class="module-kicker">EQUIPMENT REGISTRY</span>
          <h2>Sprzęt i numery seryjne</h2>
          <div class="asset-list">
            ${assets.map((asset) => {
              const assigned = findUser(asset.assignedTo);
              return `
                <article class="asset-row">
                  <div><strong>${esc(asset.name)}</strong><small>${esc(asset.serial)}</small></div>
                  <span class="mini-pill ${asset.status === "wydany" ? "warn" : asset.status === "serwis" ? "danger" : "ok"}">${esc(asset.status)}</span>
                  <span>${esc(assigned?.nick || "MAGAZYN")}</span>
                </article>
              `;
            }).join("") || `<div class="empty-state">Brak sprzętu w rejestrze.</div>`}
          </div>
        </section>
        <section class="module-panel">
          <span class="module-kicker">FLEET REGISTRY</span>
          <h2>Pojazdy i jednostki</h2>
          <div class="asset-list">
            ${vehicles.map((vehicle) => `
              <article class="vehicle-row">
                <div><strong>${esc(vehicle.name)}</strong><small>${esc(vehicle.callsign || vehicle.id)}</small></div>
                <span class="mini-pill ${vehicle.status === "gotowy" ? "ok" : "warn"}">${esc(vehicle.status)}</span>
                <div class="fuel-meter"><i style="width:${Number(vehicle.fuel || 0)}%"></i></div>
                <small>Paliwo ${Number(vehicle.fuel || 0)}% // ${esc((vehicle.crew || []).map((id) => findUser(id)?.nick).filter(Boolean).join(", ") || "bez załogi")}</small>
              </article>
            `).join("") || `<div class="empty-state">Brak pojazdów w rejestrze.</div>`}
          </div>
        </section>
      </div>
    `;
  }

  function renderObjectRow(object) {
    const distance = object.type === "route" && Number.isFinite(Number(object.lat2))
      ? haversineKm(object.lat, object.lon, object.lat2, object.lon2)
      : 0;
    const eta = distance && object.speedKmh
      ? `${Math.round((distance / Number(object.speedKmh)) * 60)} min`
      : "";
    return `
      <div class="object-row">
        <span class="mini-pill">${esc(OBJECT_TYPES[object.type] || object.type)}</span>
        <strong>${esc(object.name)}</strong>
        <small>${esc(LAYER_LABELS[object.layer] || object.layer)}${eta ? ` // ETA ${esc(eta)}` : ""}</small>
        ${classificationBadge(object.classification)}
        <button class="object-focus-button" data-action="map-focus-object" data-id="${esc(object.id)}">Pokaż</button>
      </div>
    `;
  }

  function isMapObjectVisible(object) {
    if (!state.globe.layers[object.layer] || !canViewClassified(object.classification)) return false;
    if (
      Array.isArray(object.authorizedRanks)
      && object.authorizedRanks.length
      && !isAdmin()
      && !object.authorizedRanks.includes(currentUser()?.rank)
    ) return false;
    const age = Date.now() - Number(object.updatedAt || object.createdAt || 0);
    const limit = {
      "1h": 60 * 60 * 1000,
      "24h": 24 * 60 * 60 * 1000,
      "7d": 7 * 24 * 60 * 60 * 1000,
    }[state.globe.timeFilter];
    return !limit || age <= limit;
  }

  function mapModeHint() {
    if (state.globe.mode === "measure") return "Kliknij dwa miejsca, aby zmierzyć dystans.";
    if (state.globe.mode === "route") return "Kliknij początek i koniec nowej trasy.";
    if (state.globe.mode === "zone") return "Kliknij środek nowej strefy zagrożenia.";
    return canManageCategory("map")
      ? "Prawy przycisk lub dłuższe dotknięcie dodaje punkt."
      : "Przeciągnij mapę i użyj kółka, aby zmienić widok.";
  }

  function mapMeasurementLabel() {
    if (state.globe.measurePoints.length !== 2) return "POMIAR: -- km";
    const [start, end] = state.globe.measurePoints;
    return `POMIAR: ${haversineKm(start.lat, start.lon, end.lat, end.lon).toFixed(1)} km`;
  }

  function oceanWeather(lat, lon) {
    const hour = Math.floor(Date.now() / 3_600_000);
    const seed = Math.abs(Math.sin((Number(lat) + Number(lon) + hour) * 0.173));
    return {
      temperature: (8 + seed * 18).toFixed(1),
      waveHeight: (0.6 + seed * 5.2).toFixed(1),
      windSpeed: Math.round(9 + seed * 54),
      visibility: Math.round(4 + (1 - seed) * 26),
      condition: seed > 0.78 ? "SZTORM" : seed > 0.5 ? "WZBURZONE" : "STABILNE",
    };
  }

  function haversineKm(lat1, lon1, lat2, lon2) {
    const toRadians = (value) => Number(value) * Math.PI / 180;
    const first = toRadians(lat1);
    const second = toRadians(lat2);
    const deltaLat = toRadians(Number(lat2) - Number(lat1));
    const deltaLon = toRadians(Number(lon2) - Number(lon1));
    const a = Math.sin(deltaLat / 2) ** 2
      + Math.cos(first) * Math.cos(second) * Math.sin(deltaLon / 2) ** 2;
    return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  function visibleMissions() {
    const user = currentUser();
    if (!user) return [];
    return state.db.missions.filter(
      (mission) => (
        canViewClassified(mission.classification, user)
        && (isAdmin() || canManageCategory("missions", user) || mission.assignedTo.includes(user.id))
      ),
    );
  }

  function hasMissionAccess(mission) {
    const user = currentUser();
    return Boolean(user && rankIndex(user.rank) >= rankIndex(mission.minRank));
  }

  function renderMissions() {
    const missions = visibleMissions();
    const active = missions.filter((mission) => !["wykonana", "nieudana"].includes(mission.status));
    const archived = missions.filter((mission) => ["wykonana", "nieudana"].includes(mission.status));
    $("tab-missions").innerHTML = `
      ${header("MISSION CORE", "System misji", "Operacje, raporty końcowe, oceny dowództwa i archiwum zakończonych działań.", managementAction("missions", "Przydziel misję"))}
      <div class="section-label"><span>AKTYWNE OPERACJE</span><strong>${active.length}</strong></div>
      <div class="mission-list">
        ${active.map(renderMissionCard).join("") || `<div class="empty-state">Brak aktywnych misji przypisanych do tego konta.</div>`}
      </div>
      <div class="section-label archive-label"><span>ARCHIWUM OPERACJI</span><strong>${archived.length}</strong></div>
      <div class="mission-list mission-archive">
        ${archived.map(renderMissionCard).join("") || `<div class="empty-state">Archiwum jest puste.</div>`}
      </div>
    `;
  }

  function renderMissionCard(mission) {
    const allowed = hasMissionAccess(mission);
    const locked = allowed ? "" : "locked";
    const user = currentUser();
    const ownReport = (mission.reports || []).find((report) => report.userId === user?.id);
    const archived = ["wykonana", "nieudana"].includes(mission.status);
    const buttons = allowed
      ? `
        <button class="ghost-action" data-action="mission-start" data-id="${esc(mission.id)}" ${mission.status !== "aktywna" ? "disabled" : ""}>Rozpocznij operację</button>
        <button class="danger-action" data-action="mission-fail" data-id="${esc(mission.id)}" ${["wykonana", "nieudana"].includes(mission.status) ? "disabled" : ""}>Oznacz jako nieudaną</button>
      `
      : `<span class="mini-pill danger">Wymagana ranga: ${esc(mission.minRank)}</span>`;
    return `
      <article class="mission-card ${locked} ${archived ? "archived" : ""}">
        <div class="card-footer">
          <span class="mini-pill ${mission.status === "wykonana" ? "ok" : mission.status === "nieudana" ? "danger" : mission.status === "w trakcie" ? "warn" : ""}">${esc(mission.status)}</span>
          <span class="mini-pill">Dostęp od: ${esc(mission.minRank)}</span>
          ${classificationBadge(mission.classification)}
        </div>
        <h3>${esc(mission.title)}</h3>
        <p>${esc(mission.description)}</p>
        ${mission.contingencyPlan ? `
          <div class="mission-contingency">
            <strong>Plan awaryjny</strong>
            <p>${esc(mission.contingencyPlan)}</p>
            <small>Ewakuacja: ${esc(mission.evacuationPoint || "-")} // Trasa: ${esc(mission.alternativeRoute || "-")}</small>
          </div>
        ` : ""}
        ${(mission.attachments || []).map((attachment) => `<a class="message-attachment" href="${esc(attachment.data)}" download="${esc(attachment.name)}">Załącznik: ${esc(attachment.name)}</a>`).join("")}
        <ul class="objectives">
          ${mission.objectives.map((objective) => `<li>${esc(objective)}</li>`).join("")}
        </ul>
        <div class="card-footer">
          <span class="mini-pill ok">+${Number(mission.expReward)} EXP</span>
          ${mission.completedAt ? `<span class="mini-pill">Zamknięto: ${esc(formatTime(mission.completedAt))}</span>` : ""}
        </div>
        <div class="inline-actions">
          ${archived ? "" : buttons}
        </div>
        ${allowed && mission.status === "w trakcie" && !ownReport ? `
          <form class="mission-report-form" data-mission-id="${esc(mission.id)}">
            <h4>Raport końcowy</h4>
            <label>Wynik operacji<select name="result"><option>Cel wykonany</option><option>Cel częściowo wykonany</option><option>Wycofanie operacyjne</option></select></label>
            <label>Straty i uszkodzenia<textarea name="losses" required placeholder="Brak / opis strat"></textarea></label>
            <label>Zużyty sprzęt<textarea name="equipment" required placeholder="Jedna pozycja w jednej linii"></textarea></label>
            <label>Uwagi operacyjne<textarea name="notes" required></textarea></label>
            <label>Załącznik do raportu<input name="attachment" type="file" /></label>
            <button class="primary-action" type="submit">Złóż raport i zakończ</button>
          </form>
        ` : ""}
        ${ownReport ? `
          <div class="mission-report-view">
            <span class="module-kicker">RAPORT AGENTA ${esc(ownReport.nick)}</span>
            <strong>${esc(ownReport.result)}</strong>
            <p><b>Straty:</b> ${esc(ownReport.losses)}</p>
            <p><b>Sprzęt:</b> ${esc(ownReport.equipment?.join(", ") || "Brak")}</p>
            <p>${esc(ownReport.notes)}</p>
            ${ownReport.attachmentData ? `<a class="message-attachment" href="${esc(ownReport.attachmentData)}" download="${esc(ownReport.attachmentName || "raport")}">Załącznik: ${esc(ownReport.attachmentName || "raport")}</a>` : ""}
          </div>
        ` : ""}
        ${(mission.timeline || []).length ? `
          <div class="mission-timeline">
            ${mission.timeline.slice(-8).reverse().map((entry) => `<div><time>${esc(compactTime(entry.time))}</time><span>${esc(entry.action)}</span><small>${esc(entry.by || "system")}</small></div>`).join("")}
          </div>
        ` : ""}
        ${mission.evaluation ? `
          <div class="mission-evaluation">
            <span class="module-kicker">OCENA DOWÓDZTWA</span>
            <strong>${"★".repeat(Number(mission.evaluation.score || 0))}${"☆".repeat(Math.max(0, 5 - Number(mission.evaluation.score || 0)))}</strong>
            <p>${esc(mission.evaluation.comment || "")}</p>
          </div>
        ` : ""}
      </article>
    `;
  }

  function renderEvents() {
    const visibleEvents = state.db.events.filter((event) => canViewClassified(event.classification));
    $("tab-events").innerHTML = `
      ${header("GLOBAL EVENTS CORE", "Dynamiczne zdarzenia systemowe", "Alarmy oceaniczne, incydenty nieznanych jednostek i misje awaryjne.", managementAction("events", "Utwórz zdarzenie"))}
      <div class="event-list">
        ${visibleEvents.map(renderEventCard).join("") || `<div class="empty-state">Brak zdarzeń w Global Events Core.</div>`}
      </div>
    `;
  }

  function renderEventCard(event) {
    const acknowledgedAt = Number(currentConfiguration().eventAcknowledgements?.[event.id] || 0);
    return `
      <article class="event-card ${event.severity === "red" ? "critical" : ""}">
        <div class="card-footer">
          <span class="mini-pill ${event.severity === "red" ? "danger" : "warn"}">${esc(event.severity === "red" ? "KOD CZERWONY" : "KOD ŻÓŁTY")}</span>
          <span class="mini-pill">${esc(event.type)}</span>
          <span class="mini-pill">${esc(formatTime(event.createdAt))}</span>
          ${classificationBadge(event.classification)}
        </div>
        <h3>${esc(event.title)}</h3>
        <p>${esc(event.body)}</p>
        <div class="card-footer">
          ${acknowledgedAt
            ? `<span class="mini-pill ok">POTWIERDZONO ${esc(compactTime(acknowledgedAt))}</span>`
            : `<button class="ghost-action" data-action="ack-event" data-id="${esc(event.id)}">Potwierdź odbiór</button>`}
        </div>
      </article>
    `;
  }

  function conversationTitle(conversation) {
    if (["group", "channel", "alarm"].includes(conversation.type)) {
      return conversation.name || "Kanał ABW";
    }
    const other = conversation.members.find((member) => member.id !== currentUser()?.id);
    return other?.nick || "Rozmowa";
  }

  async function refreshMessenger({ notify = true } = {}) {
    if (!state.token || !currentUser()) return;
    const requestId = ++state.messenger.refreshRequestId;
    const activeConversationId = state.messenger.activeConversationId;
    try {
      const previousUnread = new Map(
        state.messenger.conversations.map((conversation) => [
          conversation.id,
          Number(conversation.unreadCount || 0),
        ]),
      );
      const data = await window.ABWApi.getConversations();
      if (requestId !== state.messenger.refreshRequestId) return;
      const conversations = data.conversations || [];
      const unreadTotal = conversations.reduce(
        (total, conversation) => total + Number(conversation.unreadCount || 0),
        0,
      );
      if (notify && state.messenger.loaded) {
        const changed = conversations.find(
          (conversation) => Number(conversation.unreadCount || 0)
            > Number(previousUnread.get(conversation.id) || 0),
        );
        if (changed && state.activeTab !== "messenger") {
          const sender = changed.lastMessage?.senderNick || conversationTitle(changed);
          showNotification(`Nowa wiadomość: ${sender}`, changed.lastMessage?.body || "");
          playSound("beep");
        }
      }
      state.messenger.conversations = conversations;
      state.messenger.loaded = true;
      state.messenger.lastUnreadCount = unreadTotal;
      updateDockState();
      if (state.activeTab === "messenger") {
        const activeExists = conversations.some(
          (conversation) => conversation.id === state.messenger.activeConversationId,
        );
        if (
          state.messenger.activeConversationId
          && activeExists
          && activeConversationId === state.messenger.activeConversationId
        ) {
          await loadConversation(state.messenger.activeConversationId, { rerender: false });
        }
        renderMessenger();
      }
    } catch (error) {
      if (error.status === 401) logout("expired");
    }
  }

  async function loadConversation(conversationId, { rerender = true } = {}) {
    const requestId = ++state.messenger.conversationRequestId;
    state.messenger.activeConversationId = conversationId;
    state.uiRevision += 1;
    try {
      const data = await window.ABWApi.getMessages(conversationId);
      if (
        requestId !== state.messenger.conversationRequestId
        || conversationId !== state.messenger.activeConversationId
      ) return;
      state.messenger.messages = data.messages || [];
      await window.ABWApi.markConversationRead(conversationId);
      if (
        requestId !== state.messenger.conversationRequestId
        || conversationId !== state.messenger.activeConversationId
      ) return;
      const conversation = state.messenger.conversations.find((item) => item.id === conversationId);
      if (conversation) conversation.unreadCount = 0;
      updateDockState();
      if (rerender) renderMessenger();
    } catch (error) {
      showToast(error.message || "Nie udało się otworzyć rozmowy");
    }
  }

  function renderMessenger() {
    const conversations = state.messenger.conversations;
    const active = conversations.find(
      (conversation) => conversation.id === state.messenger.activeConversationId,
    );
    const availableUsers = state.db.users.filter(
      (user) => user.id !== currentUser()?.id && !user.disabled,
    );
    const activePresence = active
      ? state.messenger.presence.filter((entry) => (
        active.members.some((member) => member.id === entry.id)
        && entry.online
      ))
      : [];
    const typingUsers = activePresence.filter((entry) => (
      entry.typing && entry.conversationId === active?.id && entry.id !== currentUser()?.id
    ));
    $("tab-messenger").innerHTML = `
      ${header("SECURE COMMS", "Komunikator ABW", "Rozmowy prywatne, grupy, kanały korpusów i kanał alarmowy. Użytkownicy są oznaczani wyłącznie nickami.")}
      <div class="messenger-shell">
        <aside class="conversation-sidebar">
          <div class="messenger-tools">
            <form id="messengerSearchForm">
              <label>Szukaj wiadomości i załączników<input name="query" minlength="2" value="${esc(state.messenger.searchQuery)}" placeholder="Wpisz co najmniej 2 znaki" /></label>
              <button class="ghost-action" type="submit">Szukaj</button>
            </form>
            <form id="messengerDirectForm">
              <label>Nowa rozmowa
                <select name="userId" required>
                  <option value="">Wybierz nick</option>
                  ${availableUsers.map((user) => `<option value="${esc(user.id)}">${esc(user.nick)}</option>`).join("")}
                </select>
              </label>
              <button class="primary-action" type="submit">Rozpocznij</button>
            </form>
            ${canManageCategory("messenger") ? `<form id="messengerGroupForm">
              <label>Nazwa grupy<input name="name" maxlength="80" required /></label>
              <label>Członkowie
                <select name="memberIds" multiple size="4" required>
                  ${availableUsers.map((user) => `<option value="${esc(user.id)}">${esc(user.nick)}</option>`).join("")}
                </select>
              </label>
              <button class="ghost-action" type="submit">Utwórz grupę</button>
            </form>` : ""}
          </div>
          ${state.messenger.searchQuery ? `
            <div class="message-search-results">
              <span class="module-kicker">WYNIKI // ${state.messenger.searchResults.length}</span>
              ${state.messenger.searchResults.map((result) => `
                <button data-action="open-search-result" data-id="${esc(result.conversationId)}">
                  <strong>${esc(result.senderNick)}</strong>
                  <span>${esc(result.attachmentName || result.body)}</span>
                  <small>${esc(formatTime(result.createdAt))}</small>
                </button>
              `).join("") || `<div class="empty-state compact">Brak wyników.</div>`}
            </div>
          ` : ""}
          <div class="conversation-list">
            ${conversations.map((conversation) => `
              <button class="conversation-item ${active?.id === conversation.id ? "active" : ""} ${conversation.active === false ? "locked" : ""}" data-action="open-conversation" data-id="${esc(conversation.id)}">
                <span>${conversation.type === "group" ? "GRP" : conversation.type === "channel" ? "CHN" : conversation.type === "alarm" ? "ALR" : "COM"}</span>
                <strong>${esc(conversationTitle(conversation))}</strong>
                <small>${conversation.active === false ? "Kanał oczekuje na zdarzenie" : esc(conversation.lastMessage?.body || "Brak wiadomości")}</small>
                ${conversation.unreadCount ? `<i>${Math.min(99, conversation.unreadCount)}</i>` : ""}
              </button>
            `).join("") || `<div class="empty-state compact">Brak rozmów.</div>`}
          </div>
        </aside>
        <section class="message-panel">
          ${active ? `
            <div class="message-head">
              <div>
                <span class="module-kicker">${active.type === "group" ? "GRUPA" : active.type === "channel" ? "KANAŁ SŁUŻBOWY" : active.type === "alarm" ? "KANAŁ ALARMOWY" : "KANAŁ PRYWATNY"}</span>
                <h2>${esc(conversationTitle(active))}</h2>
                <p>${activePresence.length} online // ${esc(active.members.map((member) => member.nick).join(", "))}</p>
                ${typingUsers.length ? `<div class="typing-indicator">${esc(typingUsers.map((entry) => entry.nick).join(", "))} pisze...</div>` : ""}
              </div>
              <span class="mini-pill ${active.active === false ? "danger" : "ok"}">${active.active === false ? "NIEAKTYWNY" : "SZYFROWANY"}</span>
            </div>
            <div class="message-stream" id="messageStream">
              ${state.messenger.messages.filter((message) => canViewClassified(message.classification)).map(renderMessageBubble).join("") || `<div class="empty-state">Kanał jest pusty. Wyślij pierwszą wiadomość.</div>`}
            </div>
            <form id="messengerMessageForm" class="message-compose" data-conversation-id="${esc(active.id)}">
              ${state.messenger.replyTo ? `
                <div class="reply-compose">
                  <span>Odpowiedź do ${esc(state.messenger.replyTo.senderNick)}</span>
                  <button type="button" data-action="cancel-reply">×</button>
                </div>
              ` : ""}
              <textarea name="body" maxlength="4000" placeholder="Wiadomość szyfrowana..."></textarea>
              <div class="compose-options">
                <label><input type="checkbox" name="urgent" /> Pilna</label>
                <label><input type="checkbox" name="requiresAck" /> Wymaga potwierdzenia</label>
                <label>Klauzula<select name="classification">${classificationOptions()}</select></label>
                <label class="attachment-control">Załącznik<input name="attachment" type="file" /></label>
                <button class="primary-action" type="submit" ${active.active === false ? "disabled" : ""}>Wyślij</button>
              </div>
            </form>
          ` : `<div class="empty-state">Wybierz rozmowę lub utwórz nową.</div>`}
        </section>
      </div>
    `;
    const stream = $("messageStream");
    if (stream) stream.scrollTop = stream.scrollHeight;
  }

  function renderMessageBubble(message) {
    const own = message.senderId === currentUser()?.id;
    const reactions = Object.entries(message.reactions || {});
    return `
      <article class="message-bubble ${own ? "own" : ""} ${message.urgent ? "urgent" : ""} ${message.pinned ? "pinned" : ""}">
        <div class="message-meta">
          <strong>${esc(message.senderNick || currentUser()?.nick)}</strong>
          ${message.urgent ? `<span class="mini-pill danger">PILNE</span>` : ""}
          ${message.pinned ? `<span class="mini-pill warn">PRZYPIĘTA</span>` : ""}
          ${classificationBadge(message.classification)}
        </div>
        ${message.replyTo ? `<blockquote><b>${esc(message.replySenderNick || "Agent")}</b> ${esc(message.replyBody || "Wiadomość")}</blockquote>` : ""}
        <p>${esc(message.body)}</p>
        ${message.attachmentData ? `<a class="message-attachment" href="${esc(message.attachmentData)}" download="${esc(message.attachmentName || "abw-zalacznik")}">▣ ${esc(message.attachmentName || "Załącznik")}</a>` : ""}
        <div class="message-reactions">
          ${reactions.map(([reaction, count]) => `<span>${esc(reaction)} ${Number(count)}</span>`).join("")}
        </div>
        <div class="message-actions">
          <button data-action="reply-message" data-id="${esc(message.id)}">Odpowiedz</button>
          <button data-action="react-message" data-id="${esc(message.id)}" data-reaction="potwierdzam">Potwierdzam</button>
          <button data-action="react-message" data-id="${esc(message.id)}" data-reaction="ważne">Ważne</button>
          <button data-action="pin-message" data-id="${esc(message.id)}" data-pinned="${message.pinned ? "false" : "true"}">${message.pinned ? "Odepnij" : "Przypnij"}</button>
          ${message.requiresAck && !own && !message.acknowledged ? `<button class="ack-action" data-action="ack-message" data-id="${esc(message.id)}">Potwierdź odbiór</button>` : ""}
          ${message.requiresAck ? `<span class="ack-count" title="${esc((message.acknowledgedBy || []).join(", ") || "Brak potwierdzeń")}">Odbiór: ${Number(message.acknowledgementCount || 0)}${message.acknowledgedBy?.length ? ` // ${esc(message.acknowledgedBy.join(", "))}` : ""}</span>` : ""}
          ${own || isAdmin() ? `<button class="message-delete" data-action="delete-message" data-id="${esc(message.id)}">Usuń</button>` : ""}
        </div>
        <time>${esc(formatTime(message.createdAt))}</time>
      </article>
    `;
  }

  function renderAdmin() {
    if (!hasManagementAccess()) {
      $("tab-admin").innerHTML = `<div class="empty-state">Ta ranga nie ma uprawnień do zarządzania zawartością.</div>`;
      return;
    }

    const fullNav = [
      ["status", "Stan systemu"],
      ["users", "Użytkownicy"],
      ["identities", "Legitymacje"],
      ["ranks", "Rangi"],
      ["shop", "Sklep"],
      ["announcements", "Ogłoszenia"],
      ["info", "Informacje"],
      ["documents", "Dokumenty"],
      ["calendar", "Kalendarz"],
      ["personnel", "Przepustki"],
      ["logistics", "Logistyka"],
      ["map", "Mapa"],
      ["missions", "Misje"],
      ["events", "Zdarzenia"],
      ["notes", "Notatnik"],
      ["logs", "Logi"],
      ["backups", "Kopie i kosz"],
    ];
    const nav = isAdmin()
      ? fullNav
      : fullNav.filter(([key]) => MANAGEMENT_PANEL_CATEGORIES.includes(key) && canManageCategory(key));
    if (!nav.some(([key]) => key === state.activeAdminTab)) {
      state.activeAdminTab = nav[0]?.[0] || "announcements";
    }
    const title = isAdmin() ? "Panel administratora" : "Panel uprawnień rangi";
    const description = isAdmin()
      ? "Osobny, czerwono-złoty rdzeń do kontroli kont, zasobów, ogłoszeń, mapy, notatek, misji i logów."
      : "Narzędzia zarządzania przydzielone do aktualnej rangi.";

    $("tab-admin").innerHTML = `
      ${header(isAdmin() ? "ADMIN CORE" : "RANK CONTROL", title, description, `<button class="danger-action" data-action="admin-logout">Wyloguj</button>`)}
      <div class="admin-layout">
        <aside class="admin-nav">
          ${nav.map(([key, label]) => `<button class="${state.activeAdminTab === key ? "active" : ""}" data-action="admin-tab" data-tab="${esc(key)}">${esc(label)}</button>`).join("")}
        </aside>
        <div id="adminContent">${renderAdminContent()}</div>
      </div>
    `;
    if (state.activeAdminTab === "identities") {
      state.db.users.forEach((user) => ensureIdentityQr(user.id));
    }
  }

  function renderAdminContent() {
    const renderers = {
      status: renderAdminStatus,
      users: renderAdminUsers,
      identities: renderAdminIdentities,
      ranks: renderAdminRanks,
      shop: renderAdminShop,
      announcements: renderAdminAnnouncements,
      info: renderAdminInfo,
      documents: renderAdminDocuments,
      calendar: renderAdminCalendar,
      personnel: renderAdminPersonnel,
      logistics: renderAdminLogistics,
      map: renderAdminMap,
      missions: renderAdminMissions,
      events: renderAdminEvents,
      notes: renderAdminNotes,
      logs: renderAdminLogs,
      backups: renderAdminBackups,
    };
    return renderers[state.activeAdminTab]?.() || "";
  }

  function classificationOptions(selected = "jawne") {
    return Object.entries(CLASSIFICATIONS)
      .map(([key, label]) => `<option value="${esc(key)}" ${key === selected ? "selected" : ""}>${esc(label)}</option>`)
      .join("");
  }

  function renderAdminStatus() {
    const status = state.security.serverStatus;
    if (!status) {
      return `<div class="admin-block"><div class="empty-state">Pobieranie parametrów serwera ABW...</div></div>`;
    }
    return `
      <div class="admin-block">
        <h3>Stan serwera i synchronizacji</h3>
        <div class="server-status-grid">
          <div><span>Backend</span><strong class="ok-text">ONLINE</strong></div>
          <div><span>PostgreSQL</span><strong class="ok-text">${esc(status.database.toUpperCase())}</strong></div>
          <div><span>Opóźnienie DB</span><strong>${Number(status.latencyMs)} ms</strong></div>
          <div><span>Aktywni agenci</span><strong>${Number(status.onlineUsers)}</strong></div>
          <div><span>Rekordy synchronizacji</span><strong>${Number(status.syncRecords)}</strong></div>
          <div><span>Wiadomości</span><strong>${Number(status.messages)}</strong></div>
          <div><span>Rozmowy i kanały</span><strong>${Number(status.conversations)}</strong></div>
          <div><span>Ostatnia kopia</span><strong>${esc(formatTime(status.lastBackupAt))}</strong></div>
        </div>
      </div>
      <div class="admin-block" style="margin-top:14px">
        <h3>Obecność agentów</h3>
        <div class="presence-grid">
          ${state.messenger.presence.map((entry) => `
            <div class="presence-row">
              <i class="${entry.online ? "online" : ""}"></i>
              <strong>${esc(entry.nick)}</strong>
              <span>${esc(entry.status)}</span>
              <small>${entry.typing ? "pisze..." : entry.online ? "połączony" : "offline"}</small>
            </div>
          `).join("") || `<div class="empty-state">Brak danych obecności.</div>`}
        </div>
      </div>
    `;
  }

  function renderAdminBackups() {
    return `
      <div class="admin-block">
        <h3>Kopie zapasowe bazy</h3>
        <form id="adminBackupForm" class="form-grid compact-form">
          <label>Nazwa kopii<input name="label" maxlength="160" placeholder="Przed dużą operacją" /></label>
          <div><button class="primary-action" type="submit">Utwórz kopię teraz</button></div>
        </form>
        <div class="backup-list">
          ${state.security.backups.map((backup) => `
            <div class="backup-row">
              <span class="mini-pill ${backup.type === "auto" ? "ok" : "warn"}">${backup.type === "auto" ? "AUTO" : "RĘCZNA"}</span>
              <div><strong>${esc(backup.label)}</strong><small>${esc(formatTime(backup.createdAt))} // ${esc(backup.createdBy)} // ${Math.max(1, Math.round(backup.sizeBytes / 1024))} KB</small></div>
              <button class="danger-action" data-action="restore-backup" data-id="${esc(backup.id)}">Przywróć</button>
            </div>
          `).join("") || `<div class="empty-state">Nie utworzono jeszcze kopii.</div>`}
        </div>
      </div>
      <div class="admin-block" style="margin-top:14px">
        <h3>Kosz systemowy</h3>
        <div class="trash-list">
          ${state.db.trash.map((entry) => `
            <div class="backup-row">
              <span class="mini-pill danger">${esc(entry.collection)}</span>
              <div><strong>${esc(entry.label)}</strong><small>Usunięto ${esc(formatTime(entry.deletedAt))} // ${esc(entry.deletedBy)}</small></div>
              <button class="ghost-action" data-action="restore-trash" data-id="${esc(entry.id)}">Przywróć</button>
            </div>
          `).join("") || `<div class="empty-state">Kosz jest pusty.</div>`}
        </div>
      </div>
    `;
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
          <label>Ranga<select name="rank">${rankNames().map((rank) => `<option>${esc(rank)}</option>`).join("")}</select></label>
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

  function renderAdminIdentities() {
    if (!isAdmin()) return `<div class="empty-state">Legitymacje są dostępne wyłącznie dla administratora.</div>`;
    return `
      <div id="adminIdentityEditor" class="admin-block identity-editor hidden">
        <h3 id="adminIdentityFormTitle">Edycja legitymacji</h3>
        <form id="adminIdentityForm" class="form-grid">
          <input name="userId" type="hidden" />
          <label>Imię i nazwisko<input name="fullName" required /></label>
          <label>Nick<input name="nick" required /></label>
          <label>Numer odznaki<input name="badge" required /></label>
          <label>Ranga<select name="rank">${rankNames().map((rank) => `<option>${esc(rank)}</option>`).join("")}</select></label>
          <label>Kryptonim<input name="callsign" maxlength="40" /></label>
          <label>Specjalizacja<input name="specialization" maxlength="80" /></label>
          <label>Jednostka<input name="unit" maxlength="80" /></label>
          <label>Grupa krwi<input name="bloodType" maxlength="10" placeholder="np. 0 Rh+" /></label>
          <label>Klauzula<select name="clearance"><option value="">Według rangi</option>${Object.entries(CLASSIFICATIONS).map(([key, label]) => `<option value="${esc(key)}">${esc(label)}</option>`).join("")}</select></label>
          <label>Ważna do<input name="validUntil" type="date" /></label>
          <label>Status
            <select name="status">
              <option value="active">Aktywna</option>
              <option value="suspended">Zawieszona</option>
              <option value="expired">Wygasła</option>
            </select>
          </label>
          <label>Zdjęcie<input name="photo" type="file" accept="image/*" /></label>
          <label class="identity-remove-photo"><input name="removePhoto" type="checkbox" /> Usuń obecne zdjęcie</label>
          <div class="full inline-actions">
            <button class="primary-action" type="submit">Zapisz legitymację</button>
            <button class="ghost-action" type="button" data-action="admin-cancel-edit-identity">Anuluj</button>
          </div>
        </form>
      </div>
      <div class="admin-block">
        <div class="module-header">
          <div>
            <span class="module-kicker">AGENT ID REGISTRY</span>
            <h3>Legitymacje wszystkich agentów</h3>
            <p>Administrator może zmieniać dane dokumentu, zdjęcie, klauzulę i termin ważności.</p>
          </div>
        </div>
        <div class="identity-admin-grid">
          ${state.db.users.map((user) => {
            const card = getIdentityCard(user);
            return `
              <article class="identity-admin-card identity-${esc(card.status)}">
                <div class="identity-admin-head">
                  ${renderIdentityPhoto(user, card)}
                  <div>
                    <span class="module-kicker">${esc(identityStatusLabel(card.status))}</span>
                    <h3>${esc(user.nick)}</h3>
                    <p>${esc(user.fullName)}</p>
                  </div>
                </div>
                <dl>
                  <div><dt>Odznaka</dt><dd>${esc(user.badge)}</dd></div>
                  <div><dt>Ranga</dt><dd>${esc(user.rank)}</dd></div>
                  <div><dt>Kryptonim</dt><dd>${esc(card.callsign || "-")}</dd></div>
                  <div><dt>Jednostka</dt><dd>${esc(card.unit || "-")}</dd></div>
                  <div><dt>Ważna do</dt><dd>${esc(card.validUntil || "Bezterminowo")}</dd></div>
                </dl>
                ${state.identityQrs[user.id] ? `<img class="identity-admin-qr" src="${esc(state.identityQrs[user.id])}" alt="Kod QR ${esc(user.nick)}" />` : ""}
                ${(card.history || []).length ? `<small>Zmiany dokumentu: ${card.history.length} // ostatnia ${esc(formatTime(card.history[0].time))}</small>` : ""}
                <div class="row-actions">
                  <button data-action="admin-edit-identity" data-id="${esc(user.id)}">Edytuj</button>
                  <button data-action="word-identity" data-id="${esc(user.id)}">Drukuj</button>
                </div>
              </article>
            `;
          }).join("") || `<div class="empty-state">Brak kont użytkowników.</div>`}
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
        <h3>Edycja korpusów</h3>
        <form id="adminCorpsForm" class="form-grid compact-form">
          <label>Nazwa korpusu<input name="name" required /></label>
          <div class="inline-actions">
            <button id="adminCorpsSubmit" class="primary-action" type="submit">Dodaj korpus</button>
            <button id="adminCorpsCancel" class="ghost-action hidden" type="button" data-action="admin-cancel-edit-corps">Anuluj</button>
          </div>
        </form>
      </div>
      <div class="admin-block" style="margin-top:14px">
        <h3 id="adminRankFormTitle">Dodawanie rangi</h3>
        <form id="adminRankForm" class="rank-editor-form">
          <label>Korpus
            <select name="corpsId" required>
              ${state.db.rankConfig.map((group) => `<option value="${esc(group.id)}">${esc(group.name)}</option>`).join("")}
            </select>
          </label>
          <label>Nazwa rangi<input name="name" required /></label>
          <div id="rankPermissionEditor" class="rank-permission-editor hidden">
            <h4>Uprawnienia do zarządzania</h4>
            <div class="permission-grid">
              ${MANAGEMENT_PERMISSIONS.map(([key, label]) => `
                <label><input type="checkbox" name="permission_${esc(key)}" /> ${esc(label)}</label>
              `).join("")}
            </div>
          </div>
          <div class="inline-actions">
            <button id="adminRankSubmit" class="primary-action" type="submit">Dodaj rangę</button>
            <button id="adminRankCancel" class="ghost-action hidden" type="button" data-action="admin-cancel-edit-rank">Anuluj</button>
          </div>
        </form>
      </div>
      <div class="rank-corps-list" style="margin-top:14px">
        ${state.db.rankConfig.map((group) => `
          <section class="admin-block rank-corps">
            <div class="rank-corps-head">
              <h3>${esc(group.name)}</h3>
              <div class="row-actions">
                <button data-action="admin-edit-corps" data-id="${esc(group.id)}">Edytuj</button>
                <button data-action="admin-delete-corps" data-id="${esc(group.id)}">Usuń</button>
              </div>
            </div>
            <div class="rank-ladder">
              ${group.ranks.map((rank) => `
                <div class="rank-row">
                  <strong>${esc(rank.name)}</strong>
                  <div class="row-actions">
                    <button data-action="admin-edit-rank" data-id="${esc(rank.id)}">Edytuj</button>
                    <button data-action="admin-delete-rank" data-id="${esc(rank.id)}">Usuń</button>
                  </div>
                </div>
              `).join("") || `<div class="empty-state compact">Brak rang w korpusie.</div>`}
            </div>
          </section>
        `).join("")}
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
          <label>Status
            <select name="status">
              <option value="available">Dostępny</option>
              <option value="unavailable">Niedostępny</option>
            </select>
          </label>
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
              <span class="mini-pill ${normalizeProductStatus(product.status) === "available" ? "ok" : "danger"}">${esc(productStatusLabel(product))}</span>
            </div>
            <div class="row-actions">
              <button data-action="admin-edit-product" data-id="${esc(product.id)}">Edytuj</button>
              <button data-action="admin-delete-product" data-id="${esc(product.id)}">Usuń</button>
            </div>
          </article>
        `).join("")}
      </div>
      <div class="admin-block" style="margin-top:14px">
        <div class="module-header">
          <div>
            <span class="module-kicker">ORDER REGISTRY</span>
            <h3>Rejestr zamówień</h3>
            <p>Wydruk pełnej listy zawiera wszystkie zamówienia, pozycje oraz historię statusów.</p>
          </div>
          <button class="primary-action" data-action="print-all-orders" ${state.db.orders.length ? "" : "disabled"}>Drukuj pełną listę</button>
        </div>
        <div class="order-history-list">
          ${state.db.orders.map(renderOrderRow).join("") || `<div class="empty-state">Brak zamówień.</div>`}
        </div>
      </div>
    `;
  }

  function renderAdminDocuments() {
    return `
      <div class="admin-block">
        <h3>Dokumenty, rozkazy i protokoły</h3>
        <form id="adminDocumentForm" class="form-grid">
          <label>Tytuł<input name="title" maxlength="160" required /></label>
          <label>Typ<select name="type">${Object.entries(DOCUMENT_TYPES).map(([key, label]) => `<option value="${esc(key)}">${esc(label)}</option>`).join("")}</select></label>
          <label>Klauzula<select name="classification">${classificationOptions()}</select></label>
          <label class="full">Treść<textarea name="body" required></textarea></label>
          <div class="full inline-actions">
            <button class="primary-action" type="submit">Zapisz dokument</button>
            <button class="ghost-action" type="reset" data-action="reset-document-form">Wyczyść formularz</button>
          </div>
        </form>
      </div>
      <div class="document-grid" style="margin-top:14px">
        ${state.db.documents.map((document) => `
          <article class="document-card">
            <div class="card-footer">
              <span class="mini-pill">${esc(DOCUMENT_TYPES[document.type] || document.type)}</span>
              <span class="mini-pill">Wersja ${Number(document.version || 1)}</span>
              ${classificationBadge(document.classification)}
            </div>
            <h3>${esc(document.title)}</h3>
            <p>${esc(document.body)}</p>
            <div class="row-actions">
              <button data-action="print-document" data-id="${esc(document.id)}">Drukuj</button>
              <button data-action="admin-edit-document" data-id="${esc(document.id)}">Edytuj</button>
              <button data-action="admin-delete-document" data-id="${esc(document.id)}">Usuń</button>
            </div>
          </article>
        `).join("") || `<div class="empty-state">Brak dokumentów.</div>`}
      </div>
    `;
  }

  function renderAdminCalendar() {
    const requests = allLeaveRequests();
    return `
      <div class="admin-block">
        <h3>Kalendarz operacyjny</h3>
        <form id="adminCalendarForm" class="form-grid">
          <label>Tytuł<input name="title" maxlength="160" required /></label>
          <label>Rodzaj<select name="type"><option>operacja</option><option>odprawa</option><option>szkolenie</option><option>serwis</option></select></label>
          <label>Początek<input name="startsAt" type="datetime-local" required /></label>
          <label>Koniec<input name="endsAt" type="datetime-local" /></label>
          <label>Klauzula<select name="classification">${classificationOptions()}</select></label>
          <label class="full">Opis<textarea name="description"></textarea></label>
          <div class="full inline-actions">
            <button class="primary-action" type="submit">Zapisz termin</button>
            <button class="ghost-action" type="reset" data-action="reset-calendar-form">Wyczyść formularz</button>
          </div>
        </form>
      </div>
      <div class="admin-block" style="margin-top:14px">
        <h3>Terminy</h3>
        <div class="timeline-list">
          ${state.db.calendarEvents.sort((a, b) => Number(a.startsAt) - Number(b.startsAt)).map((event) => `
            <article class="timeline-entry">
              <time>${esc(formatTime(event.startsAt))}</time>
              <div><strong>${esc(event.title)}</strong><p>${esc(event.description || "")}</p></div>
              <div class="row-actions">
                <button data-action="admin-edit-calendar" data-id="${esc(event.id)}">Edytuj</button>
                <button data-action="admin-delete-calendar" data-id="${esc(event.id)}">Usuń</button>
              </div>
            </article>
          `).join("") || `<div class="empty-state">Brak terminów.</div>`}
        </div>
      </div>
      <div class="admin-block" style="margin-top:14px">
        <h3>Wnioski urlopowe</h3>
        <div class="request-list">
          ${requests.map((request) => `
            <div class="request-row admin-request-row">
              <span class="mini-pill ${request.status === "approved" ? "ok" : request.status === "rejected" ? "danger" : "warn"}">${esc(LEAVE_STATUSES[request.status] || request.status)}</span>
              <div><strong>${esc(request.nick)} // ${esc(request.from)} - ${esc(request.to)}</strong><small>${esc(request.reason)}</small></div>
              <div class="row-actions">
                <button data-action="leave-status" data-id="${esc(request.id)}" data-user-id="${esc(request.userId)}" data-status="approved">Zatwierdź</button>
                <button data-action="leave-status" data-id="${esc(request.id)}" data-user-id="${esc(request.userId)}" data-status="rejected">Odrzuć</button>
              </div>
            </div>
          `).join("") || `<div class="empty-state">Brak wniosków.</div>`}
        </div>
      </div>
    `;
  }

  function renderAdminPersonnel() {
    return `
      <div class="admin-block">
        <h3>Przepustki czasowe</h3>
        <form id="adminPassForm" class="form-grid">
          <label>Agent<select name="userId">${state.db.users.map((user) => `<option value="${esc(user.id)}">${esc(user.nick)}</option>`).join("")}</select></label>
          <label>Nazwa przepustki<input name="label" maxlength="100" required /></label>
          <label>Ważna od<input name="validFrom" type="date" required /></label>
          <label>Ważna do<input name="validUntil" type="date" required /></label>
          <label class="full">Zakres dostępu<textarea name="scope" required></textarea></label>
          <div class="full"><button class="primary-action" type="submit">Wystaw przepustkę</button></div>
        </form>
      </div>
      <div class="admin-block" style="margin-top:14px">
        <h3>Rejestr przepustek</h3>
        <div class="request-list">
          ${state.db.temporaryPasses.map((pass) => `
            <div class="request-row admin-request-row">
              <span class="mini-pill ${pass.active !== false ? "ok" : "danger"}">${pass.active !== false ? "AKTYWNA" : "ANULOWANA"}</span>
              <div><strong>${esc(findUser(pass.userId)?.nick || "-")} // ${esc(pass.label)}</strong><small>${esc(pass.validFrom)} - ${esc(pass.validUntil)} // ${esc(pass.scope)}</small></div>
              <div class="row-actions">
                <button data-action="toggle-pass" data-id="${esc(pass.id)}">${pass.active !== false ? "Anuluj" : "Aktywuj"}</button>
                <button data-action="admin-delete-pass" data-id="${esc(pass.id)}">Usuń</button>
              </div>
            </div>
          `).join("") || `<div class="empty-state">Brak przepustek.</div>`}
        </div>
      </div>
    `;
  }

  function renderAdminLogistics() {
    return `
      <div class="admin-grid">
        <div class="admin-block">
          <h3>Sprzęt i numery seryjne</h3>
          <form id="adminAssetForm" class="form-grid compact-form">
            <label>Nazwa<input name="name" required /></label>
            <label>Numer seryjny<input name="serial" required /></label>
            <label>Status<select name="status"><option value="magazyn">Magazyn</option><option value="wydany">Wydany</option><option value="serwis">Serwis</option><option value="utracony">Utracony</option></select></label>
            <label>Przypisany agent<select name="assignedTo"><option value="">Magazyn</option>${state.db.users.map((user) => `<option value="${esc(user.id)}">${esc(user.nick)}</option>`).join("")}</select></label>
            <div class="full inline-actions"><button class="primary-action" type="submit">Zapisz sprzęt</button><button class="ghost-action" type="reset" data-action="reset-asset-form">Wyczyść</button></div>
          </form>
        </div>
        <div class="admin-block">
          <h3>Pojazdy i jednostki</h3>
          <form id="adminVehicleForm" class="form-grid compact-form">
            <label>Nazwa<input name="name" required /></label>
            <label>Kryptonim<input name="callsign" required /></label>
            <label>Status<select name="status"><option value="gotowy">Gotowy</option><option value="operacja">W operacji</option><option value="serwis">Serwis</option></select></label>
            <label>Paliwo %<input name="fuel" type="number" min="0" max="100" value="100" required /></label>
            <label class="full">Załoga<select name="crew" multiple size="5">${state.db.users.map((user) => `<option value="${esc(user.id)}">${esc(user.nick)}</option>`).join("")}</select></label>
            <div class="full inline-actions"><button class="primary-action" type="submit">Zapisz pojazd</button><button class="ghost-action" type="reset" data-action="reset-vehicle-form">Wyczyść</button></div>
          </form>
        </div>
      </div>
      <div class="admin-grid" style="margin-top:14px">
        <div class="admin-block">
          <h3>Rejestr sprzętu</h3>
          <div class="asset-list">
            ${state.db.equipmentAssets.map((asset) => `<div class="asset-row"><div><strong>${esc(asset.name)}</strong><small>${esc(asset.serial)} // ${esc(findUser(asset.assignedTo)?.nick || "MAGAZYN")}</small></div><span class="mini-pill">${esc(asset.status)}</span><div class="row-actions"><button data-action="admin-edit-asset" data-id="${esc(asset.id)}">Edytuj</button><button data-action="admin-delete-asset" data-id="${esc(asset.id)}">Usuń</button></div></div>`).join("") || `<div class="empty-state">Brak sprzętu.</div>`}
          </div>
        </div>
        <div class="admin-block">
          <h3>Rejestr pojazdów</h3>
          <div class="asset-list">
            ${state.db.vehicles.map((vehicle) => `<div class="asset-row"><div><strong>${esc(vehicle.name)}</strong><small>${esc(vehicle.callsign)} // paliwo ${Number(vehicle.fuel)}%</small></div><span class="mini-pill">${esc(vehicle.status)}</span><div class="row-actions"><button data-action="admin-edit-vehicle" data-id="${esc(vehicle.id)}">Edytuj</button><button data-action="admin-delete-vehicle" data-id="${esc(vehicle.id)}">Usuń</button></div></div>`).join("") || `<div class="empty-state">Brak pojazdów.</div>`}
          </div>
        </div>
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
          <label>Klauzula<select name="classification">${classificationOptions()}</select></label>
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
          <label>Klauzula<select name="classification">${classificationOptions()}</select></label>
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
          <label>Klauzula<select name="classification">${classificationOptions()}</select></label>
          <label>Promień strefy (km)<input name="radiusKm" type="number" min="1" step="1" /></label>
          <label>Prędkość trasy (km/h)<input name="speedKmh" type="number" min="1" step="1" /></label>
          <label>Dozwolone rangi<select name="authorizedRanks" multiple size="5">${rankNames().map((rank) => `<option value="${esc(rank)}">${esc(rank)}</option>`).join("")}</select></label>
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
          <label>Minimalna ranga<select name="minRank">${rankNames().map((rank) => `<option>${esc(rank)}</option>`).join("")}</select></label>
          <label>Status<select name="status"><option>aktywna</option><option>w trakcie</option><option>wykonana</option><option>nieudana</option></select></label>
          <label>Klauzula<select name="classification">${classificationOptions()}</select></label>
          <label>Przypisz do<select name="assignedTo" multiple size="4">${state.db.users.map((user) => `<option value="${esc(user.id)}">${esc(user.fullName)} (${esc(user.nick)})</option>`).join("")}</select></label>
          <label>EXP<input name="expReward" required type="number" min="0" /></label>
          <label class="full">Opis<textarea name="description" required></textarea></label>
          <label class="full">Cele operacyjne<textarea name="objectives" placeholder="Jeden cel w jednej linii" required></textarea></label>
          <label class="full">Plan awaryjny<textarea name="contingencyPlan"></textarea></label>
          <label>Punkt ewakuacji<input name="evacuationPoint" /></label>
          <label>Trasa alternatywna<input name="alternativeRoute" /></label>
          <label class="full">Załącznik operacyjny<input name="attachment" type="file" /></label>
          <div class="full inline-actions">
            <button class="primary-action" type="submit">Zapisz misję</button>
            <button class="ghost-action" type="reset" data-action="reset-mission-form">Wyczyść formularz</button>
          </div>
        </form>
      </div>
      <div class="admin-block" style="margin-top:14px">
        <h3>Masowy przydział istniejącej misji</h3>
        <form id="adminBulkMissionForm" class="form-grid">
          <label>Misja<select name="missionId" required>${state.db.missions.map((mission) => `<option value="${esc(mission.id)}">${esc(mission.title)}</option>`).join("")}</select></label>
          <label>Agenci<select name="assignedTo" multiple size="6" required>${state.db.users.map((user) => `<option value="${esc(user.id)}">${esc(user.nick)} // ${esc(user.rank)}</option>`).join("")}</select></label>
          <div class="full"><button class="primary-action" type="submit">Przypisz zaznaczonych</button></div>
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
            ${classificationBadge(mission.classification)}
            ${(mission.reports || []).map((report) => `
              <div class="mission-report-view">
                <span class="module-kicker">${esc(report.nick)} // ${esc(formatTime(report.createdAt))}</span>
                <strong>${esc(report.result)}</strong>
                <p><b>Straty:</b> ${esc(report.losses)}</p>
                <p><b>Sprzęt:</b> ${esc(report.equipment?.join(", ") || "Brak")}</p>
                <p>${esc(report.notes)}</p>
              </div>
            `).join("")}
            ${isAdmin() && ["wykonana", "nieudana"].includes(mission.status) ? `
              <form class="mission-evaluation-form" data-mission-id="${esc(mission.id)}">
                <label>Ocena<select name="score">${[1, 2, 3, 4, 5].map((score) => `<option value="${score}" ${Number(mission.evaluation?.score) === score ? "selected" : ""}>${score} / 5</option>`).join("")}</select></label>
                <label>Komentarz<textarea name="comment" required>${esc(mission.evaluation?.comment || "")}</textarea></label>
                <button class="primary-action" type="submit">Zapisz ocenę</button>
              </form>
            ` : ""}
            <div class="row-actions">
              ${isAdmin() ? `<button data-action="word-mission" data-id="${esc(mission.id)}">Drukuj</button>` : ""}
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
          <label>Klauzula<select name="classification">${classificationOptions("tajne")}</select></label>
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
            <div class="event-ack-list">
              <span class="module-kicker">POTWIERDZENIA // ${eventAcknowledgements(event.id).length}</span>
              <small>${esc(eventAcknowledgements(event.id).map((entry) => `${entry.user.nick} ${compactTime(entry.time)}`).join(", ") || "Brak potwierdzeń")}</small>
            </div>
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
    const printable = printableLogGroups();
    const newCount = logs.filter((log) => !log.printedAt && !log.printExcluded).length;
    const printedCount = logs.filter((log) => log.printedAt).length;
    const excludedCount = logs.filter((log) => log.printExcluded).length;
    return `
      <div class="admin-block">
        <h3>System Core - pełna historia działań</h3>
        <div class="form-grid">
          <label>Filtr użytkownika<input id="logFilterUser" value="${esc(state.logFilters.user)}" placeholder="nick lub system" /></label>
          <label>Filtr akcji<input id="logFilterAction" value="${esc(state.logFilters.action)}" placeholder="np. logowanie" /></label>
          <label>Kategoria
            <select id="logFilterCategory">
              <option value="">Wszystkie kategorie</option>
              ${Object.entries(LOG_CATEGORIES).map(([key, label]) => `<option value="${esc(key)}" ${state.logFilters.category === key ? "selected" : ""}>${esc(label)}</option>`).join("")}
            </select>
          </label>
          <label>Data<input id="logFilterDate" value="${esc(state.logFilters.date)}" type="date" /></label>
          <div class="inline-actions">
            <button class="primary-action" data-action="print-logs" ${printable.length ? "" : "disabled"}>Drukuj (${newCount})</button>
            <button class="ghost-action" data-action="export-db">Eksport JSON</button>
            <button class="danger-action" data-action="clear-logs">Wyczyść logi</button>
          </div>
        </div>
        <div class="log-print-summary">
          <span class="mini-pill ok">Do wydruku: ${newCount}</span>
          <span class="mini-pill">Po połączeniu powtórzeń: ${printable.length}</span>
          <span class="mini-pill warn">Już wydrukowane: ${printedCount}</span>
          <span class="mini-pill danger">Wykluczone: ${excludedCount}</span>
        </div>
        <div class="inline-actions log-bulk-actions">
          <button class="ghost-action" data-action="exclude-visible-logs">Nie drukuj widocznych</button>
          <button class="ghost-action" data-action="include-visible-logs">Przywróć widoczne do druku</button>
          <button class="warn-action" data-action="reset-visible-log-print">Ponów wydruk widocznych</button>
          <button class="warn-action" data-action="reset-all-log-print">Odznacz wszystkie jako wydrukowane</button>
        </div>
      </div>
      <div class="admin-block" style="margin-top:14px">
        <div class="table-wrap">
          <table class="data-table log-table">
            <thead><tr><th>Czas</th><th>Kategoria</th><th>Użytkownik</th><th>Akcja i źródło</th><th>Szczegóły</th><th>Nie drukuj</th><th>Wydrukowano</th></tr></thead>
            <tbody>
              ${logs.map((log) => `
                <tr class="${log.printExcluded ? "log-excluded" : log.printedAt ? "log-printed" : ""}">
                  <td>${esc(formatTime(log.time))}</td>
                  <td><span class="mini-pill ${log.category === "finding" ? "warn" : ""}">${esc(LOG_CATEGORIES[log.category] || log.category)}</span></td>
                  <td>${esc(log.nick)}</td>
                  <td><strong>${esc(log.action)}</strong><br><span class="muted">${esc(log.source || "ABW CORE")}${log.device ? ` // ${esc(log.device)}` : ""}</span>${Number(log.repeatCount || 1) > 1 ? `<br><span class="mini-pill">×${Number(log.repeatCount)}</span>` : ""}</td>
                  <td>${esc(log.detail)}</td>
                  <td><label class="log-checkbox"><input type="checkbox" data-action="toggle-log-excluded" data-id="${esc(log.id)}" ${log.printExcluded ? "checked" : ""} /> Pomiń</label></td>
                  <td><label class="log-checkbox"><input type="checkbox" data-action="toggle-log-printed" data-id="${esc(log.id)}" ${log.printedAt ? "checked" : ""} /> ${log.printedAt ? esc(formatTime(log.printedAt)) : "Nie"}</label></td>
                </tr>
              `).join("") || `<tr><td colspan="7">Brak logów dla filtrów.</td></tr>`}
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
      const categoryMatch = !state.logFilters.category || log.category === state.logFilters.category;
      const dateMatch =
        !state.logFilters.date ||
        new Date(log.time).toISOString().slice(0, 10) === state.logFilters.date;
      return userMatch && actionMatch && categoryMatch && dateMatch;
    });
  }

  function printableLogGroups() {
    const groups = new Map();
    filteredLogs()
      .filter((log) => !log.printedAt && !log.printExcluded)
      .sort((a, b) => Number(a.time) - Number(b.time))
      .forEach((log) => {
        const key = [log.category, log.source, log.nick, log.action, log.detail]
          .map((value) => String(value || "").trim().replace(/\s+/g, " ").toLowerCase())
          .join("|");
        const current = groups.get(key);
        const repetitions = Math.max(1, Number(log.repeatCount || 1));
        if (current) {
          current.sourceIds.push(log.id);
          current.count += repetitions;
          current.firstTime = Math.min(current.firstTime, Number(log.time));
          current.lastTime = Math.max(current.lastTime, Number(log.time));
          return;
        }
        groups.set(key, {
          nick: log.nick,
          action: log.action,
          detail: log.detail,
          category: log.category || inferLogCategory(log.action),
          severity: log.severity || "info",
          source: log.source || "ABW CORE",
          device: log.device || "",
          count: repetitions,
          firstTime: Number(log.time),
          lastTime: Number(log.time),
          sourceIds: [log.id],
        });
      });
    return [...groups.values()].sort((a, b) => a.firstTime - b.firstTime);
  }

  function managementCategoryForForm(id) {
    return {
      adminProductForm: "shop",
      adminAnnouncementForm: "announcements",
      adminInfoForm: "info",
      adminMapForm: "map",
      adminMissionForm: "missions",
      adminBulkMissionForm: "missions",
      adminEventForm: "events",
      adminDocumentForm: "documents",
      adminCalendarForm: "calendar",
      adminPassForm: "personnel",
      adminAssetForm: "logistics",
      adminVehicleForm: "logistics",
    }[id] || "";
  }

  function managementCategoryForAction(action) {
    if (["admin-edit-product", "admin-delete-product"].includes(action)) return "shop";
    if (action === "admin-delete-announcement") return "announcements";
    if (["admin-edit-info", "admin-delete-info"].includes(action)) return "info";
    if (["admin-edit-map", "admin-delete-map"].includes(action)) return "map";
    if (["admin-edit-mission", "admin-delete-mission"].includes(action)) return "missions";
    if (["admin-edit-event", "admin-delete-event", "admin-cancel-edit-event"].includes(action)) return "events";
    if (["admin-save-note", "admin-delete-note"].includes(action)) return "notes";
    if (["admin-edit-document", "admin-delete-document"].includes(action)) return "documents";
    if (["admin-edit-calendar", "admin-delete-calendar", "leave-status"].includes(action)) return "calendar";
    if (["toggle-pass", "admin-delete-pass"].includes(action)) return "personnel";
    if (["admin-edit-asset", "admin-delete-asset", "admin-edit-vehicle", "admin-delete-vehicle"].includes(action)) return "logistics";
    return "";
  }

  async function handleFormSubmit(event) {
    if (event.target.matches(".mission-report-form")) {
      event.preventDefault();
      await submitMissionReport(event.target);
      return;
    }
    if (event.target.matches(".mission-evaluation-form")) {
      event.preventDefault();
      handleMissionEvaluation(event.target);
      return;
    }
    if (!event.target.id) return;
    const id = event.target.id;
    if (id === "mapQuickPointForm") {
      event.preventDefault();
      handleQuickMapPointForm(event.target);
      return;
    }
    if (id === "mapCountrySearchForm") {
      event.preventDefault();
      focusMapCountry(event.target.elements.country.value);
      return;
    }
    if (id === "leaveRequestForm") {
      event.preventDefault();
      handleLeaveRequestForm(event.target);
      return;
    }
    if (id === "messengerDirectForm") {
      event.preventDefault();
      await handleDirectConversationForm(event.target);
      return;
    }
    if (id === "messengerSearchForm") {
      event.preventDefault();
      await handleMessengerSearch(event.target);
      return;
    }
    if (id === "messengerGroupForm") {
      event.preventDefault();
      if (!canManageCategory("messenger")) {
        showToast("Ta ranga nie może tworzyć grup");
        return;
      }
      await handleGroupConversationForm(event.target);
      return;
    }
    if (id === "messengerMessageForm") {
      event.preventDefault();
      await handleMessageForm(event.target);
      return;
    }
    if (!id.startsWith("admin")) return;
    event.preventDefault();
    const category = managementCategoryForForm(id);
    if (category ? !canManageCategory(category) : !isAdmin()) {
      showToast("Brak uprawnienia do tej operacji");
      return;
    }

    if (id === "adminUserForm") await handleAdminUserForm(event.target);
    if (id === "adminIdentityForm") await handleAdminIdentityForm(event.target);
    if (id === "adminCorpsForm") handleAdminCorpsForm(event.target);
    if (id === "adminRankForm") await handleAdminRankForm(event.target);
    if (id === "adminProductForm") await handleAdminProductForm(event.target);
    if (id === "adminAnnouncementForm") handleAdminAnnouncementForm(event.target);
    if (id === "adminInfoForm") handleAdminInfoForm(event.target);
    if (id === "adminMapForm") handleAdminMapForm(event.target);
    if (id === "adminMissionForm") await handleAdminMissionForm(event.target);
    if (id === "adminBulkMissionForm") handleAdminBulkMissionForm(event.target);
    if (id === "adminEventForm") handleAdminEventForm(event.target);
    if (id === "adminDocumentForm") handleAdminDocumentForm(event.target);
    if (id === "adminCalendarForm") handleAdminCalendarForm(event.target);
    if (id === "adminPassForm") handleAdminPassForm(event.target);
    if (id === "adminAssetForm") handleAdminAssetForm(event.target);
    if (id === "adminVehicleForm") handleAdminVehicleForm(event.target);
    if (id === "adminBackupForm") await handleAdminBackupForm(event.target);
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
    if (action === "word-order") exportOrderWord(id);
    if (action === "print-all-orders") exportAllOrdersWord();
    if (action === "print-document") exportDocumentWord(id);
    if (action === "print-system-report") exportSystemReportWord(target.dataset.reportType);
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
    if (action === "map-zoom-in") changeMapZoom(0.35);
    if (action === "map-zoom-out") changeMapZoom(-0.35);
    if (action === "map-reset-view") resetMapView();
    if (action === "map-focus-object") focusMapObject(id);
    if (action === "close-map-point") closeMapPointDialog();
    if (action === "map-mode") {
      state.globe.mode = target.dataset.mode;
      state.globe.measurePoints = [];
      state.globe.routePoints = [];
      renderMap();
    }
    if (action === "map-style") {
      state.globe.style = target.dataset.style;
      const user = currentUser();
      state.db.settings[user.id] = {
        ...(state.db.settings[user.id] || {}),
        mapStyle: state.globe.style,
      };
      saveDb();
      renderMap();
    }
    if (action === "map-time-filter") {
      state.globe.timeFilter = target.value;
      const user = currentUser();
      state.db.settings[user.id] = {
        ...(state.db.settings[user.id] || {}),
        mapTimeFilter: state.globe.timeFilter,
      };
      saveDb();
      renderMap();
    }
    if (action === "mission-start") updateMission(id, "w trakcie");
    if (action === "mission-complete") completeMission(id);
    if (action === "mission-fail") updateMission(id, "nieudana");
    if (action === "word-mission") exportMissionWord(id);
    if (action === "trigger-evacuation") triggerEvacuation();
    if (action === "open-conversation") loadConversation(id);
    if (action === "open-search-result") loadConversation(id);
    if (action === "reply-message") {
      state.messenger.replyTo = state.messenger.messages.find((message) => message.id === id) || null;
      renderMessenger();
    }
    if (action === "cancel-reply") {
      state.messenger.replyTo = null;
      renderMessenger();
    }
    if (action === "react-message") reactToMessage(id, target.dataset.reaction);
    if (action === "ack-message") acknowledgeMessage(id);
    if (action === "pin-message") pinMessage(id, target.dataset.pinned === "true");
    if (action === "delete-message") deleteMessageFromConversation(id);
    if (action === "contact-message") openContactConversation(id);
    if (action === "close-global-search") closeGlobalSearch();
    if (action === "open-global-result") openGlobalSearchResult(target);
    if (action === "ack-event") acknowledgeEvent(id);
    if (action === "dashboard-widget") updateDashboardWidget(target.dataset.widget, target.checked);
    if (action === "admin-logout") logout("manual");
    if (action === "open-category-management") {
      if (!canManageCategory(target.dataset.tab)) return;
      state.activeAdminTab = target.dataset.tab;
      switchTab("admin");
    }
    if (action === "admin-tab") {
      if (!isAdmin() && !canManageCategory(target.dataset.tab)) return;
      state.activeAdminTab = target.dataset.tab;
      state.uiRevision += 1;
      const user = currentUser();
      state.db.configuration[user.id] = {
        ...(state.db.configuration[user.id] || {}),
        adminTab: state.activeAdminTab,
      };
      saveDb();
      renderAdmin();
    }
    const managementCategory = managementCategoryForAction(action);
    if (managementCategory && !canManageCategory(managementCategory)) {
      showToast("Brak uprawnienia do tej operacji");
      return;
    }
    if (action === "admin-block-user") setUserDisabled(id, true);
    if (action === "admin-unblock-user") setUserDisabled(id, false);
    if (action === "admin-unlock-user") unlockUser(id);
    if (action === "admin-edit-user") editUser(id);
    if (action === "admin-cancel-edit-user") cancelUserEdit();
    if (action === "admin-edit-identity") editIdentity(id);
    if (action === "admin-cancel-edit-identity") cancelIdentityEdit();
    if (action === "admin-edit-corps") editCorps(id);
    if (action === "admin-delete-corps") deleteCorps(id);
    if (action === "admin-cancel-edit-corps") cancelCorpsEdit();
    if (action === "admin-edit-rank") editRank(id);
    if (action === "admin-delete-rank") deleteRank(id);
    if (action === "admin-cancel-edit-rank") cancelRankEdit();
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
    if (action === "admin-edit-document") editDocument(id);
    if (action === "admin-delete-document") deleteById("documents", id, "dokument");
    if (action === "admin-edit-calendar") editCalendarEvent(id);
    if (action === "admin-delete-calendar") deleteById("calendarEvents", id, "termin");
    if (action === "leave-status") setLeaveRequestStatus(id, target.dataset.userId, target.dataset.status);
    if (action === "toggle-pass") toggleTemporaryPass(id);
    if (action === "admin-delete-pass") deleteById("temporaryPasses", id, "przepustkę");
    if (action === "admin-edit-asset") editAsset(id);
    if (action === "admin-delete-asset") deleteById("equipmentAssets", id, "sprzęt");
    if (action === "admin-edit-vehicle") editVehicle(id);
    if (action === "admin-delete-vehicle") deleteById("vehicles", id, "pojazd");
    if (action === "restore-backup") restoreBackup(id);
    if (action === "restore-trash") restoreTrashItem(id);
    if (action === "toggle-log-excluded") updateLogPrintFlag(id, "excluded", target.checked);
    if (action === "toggle-log-printed") updateLogPrintFlag(id, "printed", target.checked);
    if (action === "exclude-visible-logs") bulkUpdateLogPrintFlags("excluded", true);
    if (action === "include-visible-logs") bulkUpdateLogPrintFlags("excluded", false);
    if (action === "reset-visible-log-print") bulkUpdateLogPrintFlags("printed", false);
    if (action === "reset-all-log-print") resetAllPrintedLogs();
    if (action === "print-logs") printNewLogs();
    if (action === "word-identity") exportIdentityWord(id);
    if (action === "export-db") exportDb();
    if (action === "clear-logs") clearLogs();
    if (action?.startsWith("reset-")) {
      window.setTimeout(() => {
        target.closest("form")?.removeAttribute("data-edit-id");
      }, 0);
    }
  }

  function handleDocumentInput(event) {
    if (event.target.dataset.action === "order-status") {
      updateOrderStatus(event.target.dataset.id, event.target.value);
      return;
    }
    if (event.target.dataset.action === "map-time-filter") {
      state.globe.timeFilter = event.target.value;
      const user = currentUser();
      state.db.settings[user.id] = {
        ...(state.db.settings[user.id] || {}),
        mapTimeFilter: state.globe.timeFilter,
      };
      saveDb();
      renderMap();
      return;
    }
    if (event.target.closest("#messengerMessageForm") && event.target.name === "body") {
      updateTypingPresence(true);
    }
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
    if (event.target.id === "logFilterCategory") {
      state.logFilters.category = event.target.value;
      renderAdmin();
    }
  }

  function updateDashboardWidget(widget, visible) {
    const user = currentUser();
    if (!user || !widget) return;
    const configuration = currentConfiguration(user.id);
    configuration.dashboardWidgets = {
      ...(configuration.dashboardWidgets || {}),
      [widget]: Boolean(visible),
    };
    saveDb();
    renderDashboard();
  }

  function toggleCommandCenter() {
    state.commandCenter = !state.commandCenter;
    document.body.classList.toggle("command-center-mode", state.commandCenter);
    $("commandCenterButton").classList.toggle("active", state.commandCenter);
    if (state.commandCenter) switchTab("map");
    else if (state.activeTab === "map") renderMap();
  }

  function handleGlobalSearch(event) {
    event.preventDefault();
    const query = $("globalSearchInput").value.trim();
    state.searchQuery = query;
    if (query.length < 2) {
      showToast("Wpisz co najmniej 2 znaki");
      return;
    }
    const term = query.toLocaleLowerCase("pl");
    const contains = (...values) => values.some((value) => String(value || "").toLocaleLowerCase("pl").includes(term));
    const results = [
      ...state.db.users.filter((user) => contains(user.nick, user.fullName, user.badge, user.rank)).map((user) => ({
        type: "Agent", title: user.nick, detail: `${user.rank} // ${user.badge}`, tab: "contacts", id: user.id,
      })),
      ...(isAdmin()
        ? state.db.documents.filter((item) => contains(item.title, item.body)).map((item) => ({
          type: "Dokument", title: item.title, detail: DOCUMENT_TYPES[item.type] || item.type, tab: "documents", id: item.id,
        }))
        : []),
      ...state.db.missions.filter((item) => contains(item.title, item.description, ...(item.objectives || []))).map((item) => ({
        type: "Misja", title: item.title, detail: item.status, tab: "missions", id: item.id,
      })),
      ...state.db.mapObjects.filter((item) => contains(item.name, OBJECT_TYPES[item.type])).map((item) => ({
        type: "Mapa", title: item.name, detail: OBJECT_TYPES[item.type] || item.type, tab: "map", id: item.id,
      })),
      ...state.db.products.filter((item) => contains(item.name, item.description, CATEGORY_LABELS[item.category])).map((item) => ({
        type: "Sklep", title: item.name, detail: CATEGORY_LABELS[item.category] || item.category, tab: "shop", id: item.id,
      })),
      ...state.db.events.filter((item) => contains(item.title, item.body, item.type)).map((item) => ({
        type: "Zdarzenie", title: item.title, detail: item.type, tab: "events", id: item.id,
      })),
      ...state.db.equipmentAssets.filter((item) => contains(item.name, item.serial, item.status)).map((item) => ({
        type: "Sprzęt", title: item.name, detail: item.serial, tab: "logistics", id: item.id,
      })),
    ].slice(0, 60);
    $("globalSearchSummary").textContent = `"${query}" // ${results.length} wyników`;
    $("globalSearchResults").innerHTML = results.map((result) => `
      <button data-action="open-global-result" data-tab="${esc(result.tab)}" data-id="${esc(result.id)}">
        <span class="mini-pill">${esc(result.type)}</span>
        <strong>${esc(result.title)}</strong>
        <small>${esc(result.detail)}</small>
      </button>
    `).join("") || `<div class="empty-state">Brak wyników.</div>`;
    $("globalSearchOverlay").classList.remove("hidden");
  }

  function closeGlobalSearch() {
    $("globalSearchOverlay")?.classList.add("hidden");
  }

  function openGlobalSearchResult(target) {
    closeGlobalSearch();
    switchTab(target.dataset.tab);
    if (target.dataset.tab === "map") {
      window.setTimeout(() => focusMapObject(target.dataset.id), 80);
    }
  }

  async function openContactConversation(userId) {
    try {
      const result = await window.ABWApi.createDirectConversation(userId);
      await refreshMessenger({ notify: false });
      await loadConversation(result.conversationId, { rerender: false });
      switchTab("messenger");
    } catch (error) {
      showToast(error.message || "Nie udało się otworzyć rozmowy");
    }
  }

  function acknowledgeEvent(eventId) {
    const user = currentUser();
    if (!user) return;
    const configuration = currentConfiguration(user.id);
    configuration.eventAcknowledgements ||= {};
    configuration.eventAcknowledgements[eventId] = Date.now();
    saveDb();
    renderEvents();
    showToast("Odbiór alertu potwierdzony");
  }

  function eventAcknowledgements(eventId) {
    return state.db.users
      .map((user) => ({
        user,
        time: Number(state.db.configuration[user.id]?.eventAcknowledgements?.[eventId] || 0),
      }))
      .filter((entry) => entry.time);
  }

  function handleNetworkOffline() {
    state.offlineMode = true;
    state.serverOnline = false;
    document.body.classList.add("offline-mode");
    $("systemStatus").textContent = "TRYB OFFLINE";
    showNotification("Tryb offline", "Zmiany zostaną wysłane po odzyskaniu połączenia.");
  }

  async function handleNetworkOnline() {
    state.offlineMode = false;
    document.body.classList.remove("offline-mode");
    showToast("Połączenie wróciło. Synchronizuję zmiany...");
    const connected = await initializeServerConnection({ restoreSession: false });
    if (connected && currentUser()) {
      await saveDb();
      await syncFromServer();
      renderIdentity();
      renderTab(state.activeTab);
    }
  }

  function handleLeaveRequestForm(form) {
    const user = currentUser();
    if (!user) return;
    const data = Object.fromEntries(new FormData(form));
    const configuration = currentConfiguration(user.id);
    configuration.leaveRequests ||= [];
    configuration.leaveRequests.unshift({
      id: uid("leave"),
      userId: user.id,
      nick: user.nick,
      from: data.from,
      to: data.to,
      reason: data.reason.trim(),
      status: "pending",
      createdAt: Date.now(),
    });
    logAction("wniosek urlopowy", `${data.from} - ${data.to}`);
    saveDb();
    form.reset();
    renderCalendar();
    showToast("Wniosek został wysłany");
  }

  async function handleDirectConversationForm(form) {
    const data = Object.fromEntries(new FormData(form));
    if (!data.userId) return;
    try {
      const result = await window.ABWApi.createDirectConversation(data.userId);
      await refreshMessenger({ notify: false });
      await loadConversation(result.conversationId);
    } catch (error) {
      showToast(error.message || "Nie udało się utworzyć rozmowy");
    }
  }

  async function handleGroupConversationForm(form) {
    const memberIds = Array.from(form.elements.memberIds.selectedOptions).map(
      (option) => option.value,
    );
    try {
      const result = await window.ABWApi.createGroupConversation(
        form.elements.name.value.trim(),
        memberIds,
      );
      form.reset();
      await refreshMessenger({ notify: false });
      await loadConversation(result.conversationId);
      showToast("Grupa została utworzona");
    } catch (error) {
      showToast(error.message || "Nie udało się utworzyć grupy");
    }
  }

  async function handleMessageForm(form) {
    const conversationId = form.dataset.conversationId;
    const body = form.elements.body.value.trim();
    const file = form.elements.attachment.files[0];
    if (!body && !file) return;
    if (file && file.size > 1024 * 1024) {
      showToast("Załącznik może mieć maksymalnie 1 MB");
      return;
    }
    const button = form.querySelector('button[type="submit"]');
    button.disabled = true;
    try {
      const attachmentData = file ? await readFileAsDataUrl(file) : "";
      await window.ABWApi.sendMessage(conversationId, {
        body,
        urgent: form.elements.urgent.checked,
        requiresAck: form.elements.requiresAck.checked,
        classification: form.elements.classification.value,
        replyTo: state.messenger.replyTo?.id || null,
        attachmentName: file?.name || "",
        attachmentData,
      });
      state.messenger.replyTo = null;
      form.reset();
      updateTypingPresence(false);
      await refreshMessenger({ notify: false });
      await loadConversation(conversationId);
    } catch (error) {
      showToast(error.message || "Nie udało się wysłać wiadomości");
    } finally {
      button.disabled = false;
    }
  }

  async function handleMessengerSearch(form) {
    const query = form.elements.query.value.trim();
    state.messenger.searchQuery = query;
    if (query.length < 2) {
      state.messenger.searchResults = [];
      renderMessenger();
      return;
    }
    try {
      const result = await window.ABWApi.searchMessages(query);
      state.messenger.searchResults = result.results || [];
      renderMessenger();
    } catch (error) {
      showToast(error.message || "Wyszukiwanie nie powiodło się");
    }
  }

  function updateTypingPresence(typing) {
    window.clearTimeout(state.messenger.typingTimer);
    window.ABWApi.updatePresence({
      status: "online",
      conversationId: state.messenger.activeConversationId || null,
      typing,
    }).catch(() => {});
    if (typing) {
      state.messenger.typingTimer = window.setTimeout(() => updateTypingPresence(false), 2200);
    }
  }

  async function reactToMessage(messageId, reaction) {
    const conversationId = state.messenger.activeConversationId;
    if (!conversationId) return;
    try {
      await window.ABWApi.reactToMessage(conversationId, messageId, reaction);
      await loadConversation(conversationId);
    } catch (error) {
      showToast(error.message || "Nie udało się dodać reakcji");
    }
  }

  async function acknowledgeMessage(messageId) {
    const conversationId = state.messenger.activeConversationId;
    if (!conversationId) return;
    try {
      await window.ABWApi.acknowledgeMessage(conversationId, messageId);
      await loadConversation(conversationId);
    } catch (error) {
      showToast(error.message || "Nie udało się potwierdzić odbioru");
    }
  }

  async function deleteMessageFromConversation(messageId) {
    const conversationId = state.messenger.activeConversationId;
    if (!conversationId) return;
    if (!window.confirm("Usunąć tę wiadomość z rozmowy?")) return;
    try {
      await window.ABWApi.deleteMessage(conversationId, messageId);
      state.messenger.messages = state.messenger.messages.filter((message) => message.id !== messageId);
      if (state.messenger.replyTo?.id === messageId) state.messenger.replyTo = null;
      await refreshMessenger({ notify: false });
      renderMessenger();
      showToast("Wiadomość została usunięta");
    } catch (error) {
      showToast(error.message || "Nie udało się usunąć wiadomości");
    }
  }

  async function pinMessage(messageId, pinned) {
    const conversationId = state.messenger.activeConversationId;
    if (!conversationId) return;
    try {
      await window.ABWApi.setMessagePinned(conversationId, messageId, pinned);
      await loadConversation(conversationId);
    } catch (error) {
      showToast(error.message || "Nie udało się zmienić przypięcia");
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
    state.db.configuration[user.id] = {
      ...(state.db.configuration[user.id] || {}),
      noteSeenAt: state.db.notes[user.id].updatedAt,
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

  async function handleAdminIdentityForm(form) {
    if (!isAdmin()) return;
    const userId = form.elements.userId.value;
    const user = findUser(userId);
    if (!user) return;
    const file = form.elements.photo.files[0];
    if (file && file.size > 2 * 1024 * 1024) {
      showToast("Zdjęcie może mieć maksymalnie 2 MB");
      return;
    }
    if (state.db.users.some((entry) => (
      entry.id !== userId
      && entry.nick.toLowerCase() === form.elements.nick.value.trim().toLowerCase()
    ))) {
      showToast("Nick jest już zajęty");
      return;
    }
    const existingCard = getIdentityCard(user);
    const previousSnapshot = {
      fullName: user.fullName,
      nick: user.nick,
      badge: user.badge,
      rank: user.rank,
      card: { ...existingCard, history: undefined },
    };
    const photoData = form.elements.removePhoto.checked
      ? ""
      : file ? await readFileAsDataUrl(file) : existingCard.photoData;
    try {
      const result = await window.ABWApi.updateUser(userId, {
        fullName: form.elements.fullName.value.trim(),
        nick: form.elements.nick.value.trim(),
        badge: form.elements.badge.value.trim(),
        rank: form.elements.rank.value,
      });
      Object.assign(user, result.user);
      state.db.identityCards[userId] = normalizeIdentityCard({
        callsign: form.elements.callsign.value.trim(),
        specialization: form.elements.specialization.value.trim(),
        unit: form.elements.unit.value.trim(),
        bloodType: form.elements.bloodType.value.trim(),
        clearance: form.elements.clearance.value,
        validUntil: form.elements.validUntil.value,
        status: form.elements.status.value,
        photoData,
        history: [{
          time: Date.now(),
          by: currentUser()?.nick || "admin",
          summary: `Zmieniono legitymację ${previousSnapshot.nick} / ${previousSnapshot.badge}`,
          snapshot: previousSnapshot,
        }, ...(existingCard.history || [])],
      });
      logAction("admin: edycja legitymacji", `${user.nick} // ${user.badge}`);
      await saveDb();
      showToast("Legitymacja została zaktualizowana");
      renderIdentity();
      renderAdmin();
    } catch (error) {
      showToast(error.message || "Nie udało się zapisać legitymacji");
    }
  }

  function handleAdminCorpsForm(form) {
    const name = form.elements.name.value.trim();
    if (!name) return;
    const editId = form.dataset.editId;
    if (editId) {
      const group = state.db.rankConfig.find((item) => item.id === editId);
      if (group) group.name = name;
    } else {
      state.db.rankConfig.push({ id: uid("corps"), name, ranks: [] });
    }
    saveDb();
    showToast(editId ? "Nazwa korpusu zmieniona" : "Korpus dodany");
    renderAdmin();
  }

  async function handleAdminRankForm(form) {
    const editId = form.dataset.editId;
    const oldRank = editId ? rankEntries().find((rank) => rank.id === editId) : null;
    const name = form.elements.name.value.trim();
    if (!name) return;
    if (rankEntries().some((rank) => rank.id !== editId && rank.name.toLowerCase() === name.toLowerCase())) {
      showToast("Taka ranga już istnieje");
      return;
    }
    const managePermissions = Object.fromEntries(MANAGEMENT_PERMISSIONS.map(([key]) => [
      key,
      Boolean(form.elements[`permission_${key}`]?.checked),
    ]));
    const targetGroup = state.db.rankConfig.find((group) => group.id === form.elements.corpsId.value);
    if (!targetGroup) return;

    if (oldRank) {
      const sourceGroup = state.db.rankConfig.find((group) => group.ranks.some((rank) => rank.id === editId));
      sourceGroup.ranks = sourceGroup.ranks.filter((rank) => rank.id !== editId);
      targetGroup.ranks.push({ id: editId, name, managePermissions });
      if (oldRank.name !== name) {
        const affectedUsers = state.db.users.filter((user) => user.rank === oldRank.name);
        for (const user of affectedUsers) {
          const result = await window.ABWApi.updateUser(user.id, { rank: name });
          Object.assign(user, result.user);
        }
        state.db.missions.forEach((mission) => {
          if (mission.minRank === oldRank.name) mission.minRank = name;
        });
      }
    } else {
      targetGroup.ranks.push({ id: uid("rank"), name, managePermissions });
    }
    saveDb();
    renderIdentity();
    showToast(oldRank ? "Ranga i uprawnienia zapisane" : "Ranga dodana");
    renderAdmin();
  }

  function editCorps(id) {
    const group = state.db.rankConfig.find((item) => item.id === id);
    const form = $("adminCorpsForm");
    if (!group || !form) return;
    form.dataset.editId = id;
    form.elements.name.value = group.name;
    $("adminCorpsSubmit").textContent = "Zapisz korpus";
    $("adminCorpsCancel").classList.remove("hidden");
  }

  function cancelCorpsEdit() {
    const form = $("adminCorpsForm");
    if (!form) return;
    form.reset();
    form.removeAttribute("data-edit-id");
    $("adminCorpsSubmit").textContent = "Dodaj korpus";
    $("adminCorpsCancel").classList.add("hidden");
  }

  function deleteCorps(id) {
    const group = state.db.rankConfig.find((item) => item.id === id);
    if (!group) return;
    if (group.ranks.length) {
      showToast("Najpierw przenieś lub usuń rangi z tego korpusu");
      return;
    }
    state.db.rankConfig = state.db.rankConfig.filter((item) => item.id !== id);
    saveDb();
    renderAdmin();
  }

  function editRank(id) {
    const rank = rankEntries().find((item) => item.id === id);
    const form = $("adminRankForm");
    if (!rank || !form) return;
    form.dataset.editId = id;
    form.elements.corpsId.value = rank.corpsId;
    form.elements.name.value = rank.name;
    MANAGEMENT_PERMISSIONS.forEach(([key]) => {
      form.elements[`permission_${key}`].checked = rank.managePermissions?.[key] === true;
    });
    $("adminRankFormTitle").textContent = `Edycja rangi: ${rank.name}`;
    $("rankPermissionEditor").classList.remove("hidden");
    $("adminRankSubmit").textContent = "Zapisz rangę";
    $("adminRankCancel").classList.remove("hidden");
    form.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function cancelRankEdit() {
    const form = $("adminRankForm");
    if (!form) return;
    form.reset();
    form.removeAttribute("data-edit-id");
    MANAGEMENT_PERMISSIONS.forEach(([key]) => {
      form.elements[`permission_${key}`].checked = false;
    });
    $("adminRankFormTitle").textContent = "Dodawanie rangi";
    $("rankPermissionEditor").classList.add("hidden");
    $("adminRankSubmit").textContent = "Dodaj rangę";
    $("adminRankCancel").classList.add("hidden");
  }

  function deleteRank(id) {
    const rank = rankEntries().find((item) => item.id === id);
    if (!rank) return;
    if (state.db.users.some((user) => user.rank === rank.name)) {
      showToast("Nie można usunąć rangi przypisanej do użytkownika");
      return;
    }
    const group = state.db.rankConfig.find((item) => item.id === rank.corpsId);
    group.ranks = group.ranks.filter((item) => item.id !== id);
    saveDb();
    renderAdmin();
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
      status: normalizeProductStatus(data.status),
      visual: data.visual.trim() || "ABW",
    };
    if (editId) {
      const product = state.db.products.find((item) => item.id === editId);
      if (!product) return;
      const before = {
        name: product.name,
        description: product.description,
        category: product.category,
        status: normalizeProductStatus(product.status),
        visual: product.visual,
        hasImage: Boolean(product.imageData),
      };
      Object.assign(product, payload, imageData ? { imageData } : {});
      const changes = [];
      if (before.name !== product.name) changes.push(`nazwa: ${before.name} -> ${product.name}`);
      if (before.description !== product.description) changes.push("zmieniono opis");
      if (before.category !== product.category) {
        changes.push(`kategoria: ${CATEGORY_LABELS[before.category] || before.category} -> ${CATEGORY_LABELS[product.category] || product.category}`);
      }
      if (before.status !== normalizeProductStatus(product.status)) {
        changes.push(`status: ${PRODUCT_STATUSES[before.status]} -> ${productStatusLabel(product)}`);
      }
      if (before.visual !== product.visual) changes.push(`token: ${before.visual || "-"} -> ${product.visual || "-"}`);
      if (imageData) changes.push(before.hasImage ? "zastąpiono zdjęcie" : "dodano zdjęcie");
      logAction(
        "admin: zmiana produktu w sklepie",
        `${product.name} // ID ${product.id} // ${changes.join("; ") || "zapis bez zmian danych"}`,
        null,
        { category: "order", source: "PANEL ADMINA" },
      );
    } else {
      const product = { id: uid("prd"), ...payload, imageData };
      state.db.products.push(product);
      logAction(
        "admin: dodano produkt do sklepu",
        `${product.name} // ID ${product.id} // ${CATEGORY_LABELS[product.category] || product.category} // ${productStatusLabel(product)}${imageData ? " // zdjęcie: tak" : ""}`,
        null,
        { category: "order", source: "PANEL ADMINA" },
      );
    }
    markCategoryActivity("shop");
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
      classification: data.classification || "jawne",
    });
    markCategoryActivity("announcements");
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
      if (item) Object.assign(item, {
        title: data.title.trim(),
        body: data.body.trim(),
        severity: data.severity,
        classification: data.classification || "jawne",
      });
      logAction("admin: edycja informacji", data.title);
    } else {
      state.db.info.push({
        id: uid("info"),
        title: data.title.trim(),
        body: data.body.trim(),
        severity: data.severity,
        classification: data.classification || "jawne",
      });
      logAction("admin: dodano informację", data.title);
    }
    markCategoryActivity("info");
    saveDb();
    showToast("Komunikat zapisany");
    renderAdmin();
  }

  function handleAdminDocumentForm(form) {
    const data = Object.fromEntries(new FormData(form));
    const editId = form.dataset.editId;
    const now = Date.now();
    if (editId) {
      const document = state.db.documents.find((item) => item.id === editId);
      if (!document) return;
      document.history ||= [];
      document.history.unshift({
        version: Number(document.version || 1),
        title: document.title,
        body: document.body,
        savedAt: now,
        savedBy: currentUser()?.nick || "admin",
      });
      Object.assign(document, {
        title: data.title.trim(),
        type: data.type,
        classification: data.classification || "jawne",
        body: data.body.trim(),
        author: currentUser()?.nick || "admin",
        version: Number(document.version || 1) + 1,
        updatedAt: now,
      });
      logAction("admin: nowa wersja dokumentu", document.title);
    } else {
      state.db.documents.unshift({
        id: uid("doc"),
        title: data.title.trim(),
        type: data.type,
        classification: data.classification || "jawne",
        body: data.body.trim(),
        author: currentUser()?.nick || "admin",
        version: 1,
        history: [],
        createdAt: now,
        updatedAt: now,
      });
      logAction("admin: dodano dokument", data.title);
    }
    markCategoryActivity("documents");
    saveDb();
    showToast("Dokument zapisany");
    renderAdmin();
  }

  function editDocument(id) {
    const document = state.db.documents.find((item) => item.id === id);
    const form = $("adminDocumentForm");
    if (!document || !form) return;
    form.dataset.editId = id;
    form.elements.title.value = document.title;
    form.elements.type.value = document.type;
    form.elements.classification.value = document.classification || "jawne";
    form.elements.body.value = document.body;
    form.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function handleAdminCalendarForm(form) {
    const data = Object.fromEntries(new FormData(form));
    const editId = form.dataset.editId;
    const payload = {
      title: data.title.trim(),
      type: data.type,
      startsAt: new Date(data.startsAt).getTime(),
      endsAt: data.endsAt ? new Date(data.endsAt).getTime() : 0,
      classification: data.classification || "jawne",
      description: data.description.trim(),
      updatedAt: Date.now(),
    };
    if (editId) {
      const calendarEvent = state.db.calendarEvents.find((item) => item.id === editId);
      if (calendarEvent) Object.assign(calendarEvent, payload);
      logAction("admin: edycja terminu", payload.title);
    } else {
      state.db.calendarEvents.push({ id: uid("cal"), ...payload, createdAt: Date.now() });
      logAction("admin: dodano termin", payload.title);
    }
    markCategoryActivity("calendar");
    saveDb();
    showToast("Termin zapisany");
    renderAdmin();
  }

  function toLocalDateTimeInput(timestamp) {
    if (!timestamp) return "";
    const date = new Date(Number(timestamp));
    const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
    return local.toISOString().slice(0, 16);
  }

  function editCalendarEvent(id) {
    const event = state.db.calendarEvents.find((item) => item.id === id);
    const form = $("adminCalendarForm");
    if (!event || !form) return;
    form.dataset.editId = id;
    form.elements.title.value = event.title;
    form.elements.type.value = event.type || "operacja";
    form.elements.startsAt.value = toLocalDateTimeInput(event.startsAt);
    form.elements.endsAt.value = toLocalDateTimeInput(event.endsAt);
    form.elements.classification.value = event.classification || "jawne";
    form.elements.description.value = event.description || "";
    form.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function setLeaveRequestStatus(id, userId, status) {
    if (!["approved", "rejected"].includes(status)) return;
    const shared = state.db.leaveRequests.find((request) => request.id === id);
    const privateRequests = state.db.configuration[userId]?.leaveRequests || [];
    const request = shared || privateRequests.find((item) => item.id === id);
    if (!request) return;
    request.status = status;
    request.reviewedAt = Date.now();
    request.reviewedBy = currentUser()?.nick || "admin";
    logAction("admin: decyzja urlopowa", `${request.nick || findUser(userId)?.nick} // ${LEAVE_STATUSES[status]}`);
    saveDb();
    renderAdmin();
  }

  function handleAdminPassForm(form) {
    const data = Object.fromEntries(new FormData(form));
    state.db.temporaryPasses.unshift({
      id: uid("pass"),
      userId: data.userId,
      label: data.label.trim(),
      validFrom: data.validFrom,
      validUntil: data.validUntil,
      scope: data.scope.trim(),
      active: true,
      issuedAt: Date.now(),
      issuedBy: currentUser()?.nick || "admin",
    });
    logAction("admin: wystawiono przepustkę", `${findUser(data.userId)?.nick || data.userId} // ${data.label}`);
    saveDb();
    form.reset();
    renderAdmin();
  }

  function toggleTemporaryPass(id) {
    const pass = state.db.temporaryPasses.find((item) => item.id === id);
    if (!pass) return;
    pass.active = pass.active === false;
    logAction("admin: status przepustki", `${findUser(pass.userId)?.nick || pass.userId} // ${pass.active ? "aktywna" : "anulowana"}`);
    saveDb();
    renderAdmin();
  }

  function handleAdminAssetForm(form) {
    const data = Object.fromEntries(new FormData(form));
    const editId = form.dataset.editId;
    const payload = {
      name: data.name.trim(),
      serial: data.serial.trim(),
      status: data.status,
      assignedTo: data.assignedTo || "",
      updatedAt: Date.now(),
    };
    if (editId) {
      const asset = state.db.equipmentAssets.find((item) => item.id === editId);
      if (!asset) return;
      asset.history ||= [];
      asset.history.unshift({
        status: asset.status,
        assignedTo: asset.assignedTo || "",
        time: Date.now(),
        by: currentUser()?.nick || "admin",
      });
      Object.assign(asset, payload);
    } else {
      state.db.equipmentAssets.push({ id: uid("asset"), ...payload, history: [], createdAt: Date.now() });
    }
    logAction("admin: rejestr sprzętu", `${payload.name} // ${payload.serial}`);
    markCategoryActivity("logistics");
    saveDb();
    renderAdmin();
  }

  function editAsset(id) {
    const asset = state.db.equipmentAssets.find((item) => item.id === id);
    const form = $("adminAssetForm");
    if (!asset || !form) return;
    form.dataset.editId = id;
    form.elements.name.value = asset.name;
    form.elements.serial.value = asset.serial;
    form.elements.status.value = asset.status;
    form.elements.assignedTo.value = asset.assignedTo || "";
    form.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function handleAdminVehicleForm(form) {
    const data = Object.fromEntries(new FormData(form));
    const editId = form.dataset.editId;
    const payload = {
      name: data.name.trim(),
      callsign: data.callsign.trim(),
      status: data.status,
      fuel: Math.max(0, Math.min(100, Number(data.fuel))),
      crew: Array.from(form.elements.crew.selectedOptions).map((option) => option.value),
      updatedAt: Date.now(),
    };
    if (editId) {
      const vehicle = state.db.vehicles.find((item) => item.id === editId);
      if (vehicle) Object.assign(vehicle, payload);
    } else {
      state.db.vehicles.push({ id: uid("vehicle"), ...payload, createdAt: Date.now() });
    }
    logAction("admin: rejestr pojazdu", `${payload.name} // ${payload.callsign}`);
    markCategoryActivity("logistics");
    saveDb();
    renderAdmin();
  }

  function editVehicle(id) {
    const vehicle = state.db.vehicles.find((item) => item.id === id);
    const form = $("adminVehicleForm");
    if (!vehicle || !form) return;
    form.dataset.editId = id;
    form.elements.name.value = vehicle.name;
    form.elements.callsign.value = vehicle.callsign;
    form.elements.status.value = vehicle.status;
    form.elements.fuel.value = Number(vehicle.fuel);
    Array.from(form.elements.crew.options).forEach((option) => {
      option.selected = (vehicle.crew || []).includes(option.value);
    });
    form.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function handleAdminMapForm(form) {
    const data = Object.fromEntries(new FormData(form));
    const editId = form.dataset.editId;
    const payload = {
      name: data.name.trim(),
      type: data.type,
      layer: data.layer,
      classification: data.classification || "jawne",
      radiusKm: data.radiusKm === "" ? undefined : Number(data.radiusKm),
      speedKmh: data.speedKmh === "" ? undefined : Number(data.speedKmh),
      authorizedRanks: Array.from(form.elements.authorizedRanks.selectedOptions).map((option) => option.value),
      lat: Number(data.lat),
      lon: Number(data.lon),
      lat2: data.lat2 === "" ? undefined : Number(data.lat2),
      lon2: data.lon2 === "" ? undefined : Number(data.lon2),
    };
    if (editId) {
      const object = state.db.mapObjects.find((item) => item.id === editId);
      if (object) {
        object.history ||= [];
        if (Number(object.lat) !== payload.lat || Number(object.lon) !== payload.lon) {
          object.history.push({
            lat: Number(object.lat),
            lon: Number(object.lon),
            time: Date.now(),
          });
          object.history = object.history.slice(-50);
        }
        Object.assign(object, payload, { updatedAt: Date.now() });
      }
      logAction("admin: edycja mapy", payload.name);
    } else {
      state.db.mapObjects.push({
        id: uid("map"),
        ...payload,
        history: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
      logAction("admin: dodano obiekt mapy", payload.name);
    }
    markCategoryActivity("map");
    saveDb();
    showToast("Obiekt mapy zapisany");
    renderAdmin();
  }

  function handleQuickMapPointForm(form) {
    if (!canManageCategory("map")) {
      showToast("Ta ranga nie może dodawać punktów na mapie");
      return;
    }
    const data = Object.fromEntries(new FormData(form));
    const lat = Number(data.lat);
    const lon = Number(data.lon);
    if (!data.name.trim() || !Number.isFinite(lat) || !Number.isFinite(lon)) return;
    state.db.mapObjects.push({
      id: uid("map"),
      name: data.name.trim(),
      type: data.type,
      layer: data.layer,
      classification: data.classification || "jawne",
      lat,
      lon,
      lat2: data.lat2 ? Number(data.lat2) : undefined,
      lon2: data.lon2 ? Number(data.lon2) : undefined,
      radiusKm: data.radiusKm ? Number(data.radiusKm) : undefined,
      speedKmh: data.speedKmh ? Number(data.speedKmh) : undefined,
      createdBy: currentUser()?.nick || "system",
      history: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
    markCategoryActivity("map");
    logAction("dodano punkt mapy", `${data.name.trim()} (${lat.toFixed(2)}, ${lon.toFixed(2)})`);
    closeMapPointDialog();
    saveDb();
    showToast("Punkt dodany do mapy świata");
    renderMap();
  }

  async function handleAdminMissionForm(form) {
    const data = Object.fromEntries(new FormData(form));
    const editId = form.dataset.editId;
    const assignedTo = Array.from(form.elements.assignedTo.selectedOptions).map((option) => option.value);
    const file = form.elements.attachment.files[0];
    if (file && file.size > 1024 * 1024) {
      showToast("Załącznik może mieć maksymalnie 1 MB");
      return;
    }
    const attachment = file ? {
      id: uid("attachment"),
      name: file.name,
      data: await readFileAsDataUrl(file),
      addedAt: Date.now(),
      addedBy: currentUser()?.nick || "admin",
    } : null;
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
      classification: data.classification || "jawne",
      contingencyPlan: data.contingencyPlan.trim(),
      evacuationPoint: data.evacuationPoint.trim(),
      alternativeRoute: data.alternativeRoute.trim(),
    };
    if (editId) {
      const mission = state.db.missions.find((item) => item.id === editId);
      if (mission) {
        Object.assign(mission, payload);
        mission.attachments ||= [];
        if (attachment) mission.attachments.push(attachment);
        mission.timeline ||= [];
        mission.timeline.push({
          action: "Zaktualizowano kartę misji",
          time: Date.now(),
          by: currentUser()?.nick || "admin",
        });
      }
      logAction("admin: edycja misji", payload.title);
    } else {
      state.db.missions.push({
        id: uid("msn"),
        ...payload,
        rewardedUsers: [],
        reports: [],
        attachments: attachment ? [attachment] : [],
        timeline: [{
          action: "Utworzono i przydzielono misję",
          time: Date.now(),
          by: currentUser()?.nick || "admin",
        }],
      });
      logAction("admin: dodano misję", payload.title);
    }
    markCategoryActivity("missions");
    saveDb();
    showToast("Misja zapisana");
    renderAdmin();
  }

  function handleAdminBulkMissionForm(form) {
    const mission = state.db.missions.find((item) => item.id === form.elements.missionId.value);
    if (!mission) return;
    const selected = Array.from(form.elements.assignedTo.selectedOptions).map((option) => option.value);
    mission.assignedTo = [...new Set([...(mission.assignedTo || []), ...selected])];
    markCategoryActivity("missions");
    logAction("admin: masowy przydział misji", `${mission.title} // ${selected.length} agentów`);
    saveDb();
    showToast(`Misję przypisano do ${selected.length} agentów`);
    renderAdmin();
  }

  function handleMissionEvaluation(form) {
    if (!isAdmin()) return;
    const mission = state.db.missions.find((item) => item.id === form.dataset.missionId);
    if (!mission) return;
    mission.evaluation = {
      score: Number(form.elements.score.value),
      comment: form.elements.comment.value.trim(),
      evaluatedBy: currentUser().nick,
      evaluatedAt: Date.now(),
    };
    logAction("admin: ocena misji", `${mission.title} // ${mission.evaluation.score}/5`);
    saveDb();
    showToast("Ocena operacji zapisana");
    renderAdmin();
  }

  async function handleAdminBackupForm(form) {
    if (!isAdmin()) return;
    const button = form.querySelector('button[type="submit"]');
    button.disabled = true;
    try {
      const result = await window.ABWApi.createBackup(form.elements.label.value.trim());
      state.security.backups = result.backups || [];
      showToast("Kopia zapasowa została utworzona");
      renderAdmin();
    } catch (error) {
      showToast(error.message || "Nie udało się utworzyć kopii");
    } finally {
      button.disabled = false;
    }
  }

  async function restoreBackup(id) {
    if (!isAdmin() || !window.confirm("Przywrócić tę kopię? Bieżący stan zostanie wcześniej zabezpieczony.")) return;
    try {
      await window.ABWApi.restoreBackup(id);
      showToast("Kopia została przywrócona");
      await loadOnlineState(currentUser().id);
      await refreshOperationalStatus();
      renderAdmin();
    } catch (error) {
      showToast(error.message || "Nie udało się przywrócić kopii");
    }
  }

  function restoreTrashItem(id) {
    if (!isAdmin()) return;
    const entry = state.db.trash.find((item) => item.id === id);
    if (!entry || !Array.isArray(state.db[entry.collection])) return;
    if (!state.db[entry.collection].some((item) => item.id === entry.item.id)) {
      state.db[entry.collection].push(entry.item);
    }
    state.db.trash = state.db.trash.filter((item) => item.id !== id);
    const tabByCollection = {
      announcements: "announcements",
      info: "info",
      products: "shop",
      mapObjects: "map",
      missions: "missions",
      events: "events",
      documents: "documents",
      calendarEvents: "calendar",
      temporaryPasses: "calendar",
      equipmentAssets: "logistics",
      vehicles: "logistics",
    };
    if (tabByCollection[entry.collection]) markCategoryActivity(tabByCollection[entry.collection]);
    if (entry.collection === "products") {
      logAction(
        "admin: przywrócono produkt do sklepu",
        `${entry.item.name} // ID ${entry.item.id} // ${CATEGORY_LABELS[entry.item.category] || entry.item.category} // ${productStatusLabel(entry.item)}`,
        null,
        { category: "order", source: "PANEL ADMINA" },
      );
    } else {
      logAction("admin: przywrócono z kosza", entry.label);
    }
    saveDb();
    showToast("Element przywrócony");
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
      classification: data.classification || "tajne",
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
    markCategoryActivity("events");
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

  function editIdentity(id) {
    if (!isAdmin()) return;
    const user = findUser(id);
    const form = $("adminIdentityForm");
    const editor = $("adminIdentityEditor");
    if (!user || !form || !editor) return;
    const card = getIdentityCard(user);
    form.elements.userId.value = user.id;
    form.elements.fullName.value = user.fullName;
    form.elements.nick.value = user.nick;
    form.elements.badge.value = user.badge;
    form.elements.rank.value = user.rank;
    form.elements.callsign.value = card.callsign;
    form.elements.specialization.value = card.specialization;
    form.elements.unit.value = card.unit;
    form.elements.bloodType.value = card.bloodType;
    form.elements.clearance.value = card.clearance;
    form.elements.validUntil.value = card.validUntil;
    form.elements.status.value = card.status;
    form.elements.photo.value = "";
    form.elements.removePhoto.checked = false;
    $("adminIdentityFormTitle").textContent = `Edycja legitymacji: ${user.nick}`;
    editor.classList.remove("hidden");
    editor.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function cancelIdentityEdit() {
    const form = $("adminIdentityForm");
    const editor = $("adminIdentityEditor");
    form?.reset();
    editor?.classList.add("hidden");
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
      delete state.db.identityCards[id];
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
    form.elements.status.value = normalizeProductStatus(product.status);
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
    form.elements.classification.value = item.classification || "jawne";
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
    form.elements.classification.value = object.classification || "jawne";
    form.elements.radiusKm.value = object.radiusKm ?? "";
    form.elements.speedKmh.value = object.speedKmh ?? "";
    Array.from(form.elements.authorizedRanks.options).forEach((option) => {
      option.selected = (object.authorizedRanks || []).includes(option.value);
    });
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
    form.elements.classification.value = mission.classification || "jawne";
    form.elements.expReward.value = mission.expReward;
    form.elements.objectives.value = mission.objectives.join("\n");
    form.elements.contingencyPlan.value = mission.contingencyPlan || "";
    form.elements.evacuationPoint.value = mission.evacuationPoint || "";
    form.elements.alternativeRoute.value = mission.alternativeRoute || "";
    form.elements.attachment.value = "";
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
    form.elements.classification.value = event.classification || "tajne";
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
    const removed = list.find((item) => item.id === id);
    if (removed && isAdmin()) {
      state.db.trash.unshift({
        id: uid("trash"),
        collection,
        item: JSON.parse(JSON.stringify(removed)),
        label: removed.title || removed.name || label,
        deletedAt: Date.now(),
        deletedBy: currentUser()?.nick || "admin",
      });
      state.db.trash = state.db.trash.slice(0, 200);
    }
    state.db[collection] = list.filter((item) => item.id !== id);
    const tabByCollection = {
      announcements: "announcements",
      info: "info",
      products: "shop",
      mapObjects: "map",
      missions: "missions",
      events: "events",
    };
    if (tabByCollection[collection]) markCategoryActivity(tabByCollection[collection]);
    if (collection === "products" && removed) {
      logAction(
        "admin: usunięto produkt ze sklepu",
        `${removed.name} // ID ${removed.id} // ${CATEGORY_LABELS[removed.category] || removed.category} // ${productStatusLabel(removed)}`,
        null,
        { category: "order", source: "PANEL ADMINA" },
      );
    } else {
      logAction(`admin: usunięto ${label}`, removed?.title || removed?.name ? `${removed.title || removed.name} // ID ${id}` : id);
    }
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

  function updateLogPrintFlag(id, flag, enabled) {
    if (!isAdmin()) return;
    const log = state.db.logs.find((entry) => entry.id === id);
    if (!log) return;
    if (flag === "excluded") {
      log.printExcluded = Boolean(enabled);
    }
    if (flag === "printed") {
      log.printedAt = enabled ? Date.now() : 0;
      log.printBatchId = enabled ? "oznaczenie-ręczne" : "";
      log.printedBy = enabled ? currentUser()?.nick || "admin" : "";
    }
    saveDb();
    renderAdmin();
  }

  function bulkUpdateLogPrintFlags(flag, enabled) {
    if (!isAdmin()) return;
    const visibleIds = new Set(filteredLogs().map((log) => log.id));
    state.db.logs.forEach((log) => {
      if (!visibleIds.has(log.id)) return;
      if (flag === "excluded") log.printExcluded = Boolean(enabled);
      if (flag === "printed") {
        log.printedAt = enabled ? Date.now() : 0;
        log.printBatchId = enabled ? "oznaczenie-zbiorcze" : "";
        log.printedBy = enabled ? currentUser()?.nick || "admin" : "";
      }
    });
    saveDb();
    showToast(flag === "excluded"
      ? enabled ? "Widoczne logi wykluczono z wydruku" : "Widoczne logi przywrócono do wydruku"
      : "Widoczne logi będą mogły zostać wydrukowane ponownie");
    renderAdmin();
  }

  function resetAllPrintedLogs() {
    if (!isAdmin()) return;
    if (!window.confirm("Odznaczyć wszystkie logi jako wydrukowane i umożliwić ponowny wydruk?")) return;
    state.db.logs.forEach((log) => {
      log.printedAt = 0;
      log.printBatchId = "";
      log.printedBy = "";
    });
    saveDb();
    showToast("Wszystkie oznaczenia wydruku zostały usunięte");
    renderAdmin();
  }

  function printNewLogs() {
    if (!isAdmin()) return;
    const groups = printableLogGroups();
    if (!groups.length) {
      showToast("Brak nowych logów do wydruku");
      return;
    }
    const batchId = `LOG-${new Date().toISOString().replace(/\D/g, "").slice(0, 14)}`;
    const printedAt = Date.now();
    const sourceIds = new Set(groups.flatMap((group) => group.sourceIds));
    const pages = [];
    const rowsPerPage = 8;
    for (let index = 0; index < groups.length; index += rowsPerPage) {
      pages.push(groups.slice(index, index + rowsPerPage));
    }
    const periodStart = Math.min(...groups.map((group) => group.firstTime));
    const periodEnd = Math.max(...groups.map((group) => group.lastTime));
    const wordPages = pages.map((page, pageIndex) => wordPage(
      "RAPORT LOGÓW SYSTEMOWYCH ABW",
      `
        <p><b>Okres:</b> ${esc(formatTime(periodStart))} - ${esc(formatTime(periodEnd))}</p>
        <p><b>Raport:</b> ${esc(batchId)} &nbsp; <b>Strona:</b> ${pageIndex + 1} / ${pages.length}</p>
        <p><b>Sporządził:</b> ${esc(currentUser()?.nick || "admin")}</p>
      `,
      `
        <table>
          <thead><tr><th>Lp.</th><th>Czas</th><th>Kategoria</th><th>Użytkownik</th><th>Akcja / źródło</th><th>Szczegóły</th><th>Ilość</th></tr></thead>
          <tbody>
            ${page.map((group, rowIndex) => `
              <tr>
                <td>${pageIndex * rowsPerPage + rowIndex + 1}</td>
                <td>${esc(formatTime(group.firstTime))}${group.lastTime !== group.firstTime ? `<br><small>do ${esc(formatTime(group.lastTime))}</small>` : ""}</td>
                <td>${esc(LOG_CATEGORIES[group.category] || group.category)}</td>
                <td>${esc(group.nick)}</td>
                <td><b>${esc(group.action)}</b><br><small>${esc(group.source)}${group.device ? ` // ${esc(group.device)}` : ""}</small></td>
                <td>${esc(String(group.detail || "").slice(0, 500))}${String(group.detail || "").length > 500 ? "…" : ""}</td>
                <td>${group.count > 1 ? `×${group.count}` : "1"}</td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      `,
      "TAJNE",
    ));
    downloadWordDocument(`ABW-logi-${batchId}.doc`, "Raport logów ABW", wordPages.join(""));
    state.db.logs.forEach((log) => {
      if (!sourceIds.has(log.id)) return;
      log.printedAt = printedAt;
      log.printBatchId = batchId;
      log.printedBy = currentUser()?.nick || "admin";
    });
    saveDb();
    if (state.activeTab === "admin" && state.activeAdminTab === "logs") renderAdmin();
    showToast(`Dokument Word ${batchId} utworzony i oznaczony jako wydrukowany`);
  }

  function wordPage(title, meta, content, classification = "TAJNE") {
    return `
      <section class="page">
        <header class="document-header">
          <div>
            <span>AUSTRALIJSKIE BIURO WIELORYBÓW</span>
            <h1>${esc(title)}</h1>
          </div>
          <strong>${esc(classification)}</strong>
        </header>
        <div class="document-meta">${meta}</div>
        <main>${content}</main>
        <footer class="document-approval">
          <div class="signature"><span>Podpis osoby sporządzającej / zatwierdzającej</span></div>
          <div class="signature"><span>Podpis osoby odbierającej</span></div>
          <div class="stamp"><span>Miejsce na pieczęć ABW</span></div>
          <p>Data: ............................................................</p>
        </footer>
      </section>
    `;
  }

  function downloadWordDocument(filename, title, pagesHtml) {
    if (!isAdmin()) {
      showToast("Drukowanie dokumentów jest dostępne wyłącznie dla administratora");
      return false;
    }
    const html = `
      <!doctype html>
      <html xmlns:o="urn:schemas-microsoft-com:office:office"
            xmlns:w="urn:schemas-microsoft-com:office:word"
            xmlns="http://www.w3.org/TR/REC-html40">
        <head>
          <meta charset="utf-8" />
          <title>${esc(title)}</title>
          <style>
            @page { size: A4 portrait; margin: 16mm; }
            body { font-family: Arial, sans-serif; color: #111; font-size: 10pt; margin: 0; }
            .page { position: relative; min-height: 252mm; page-break-after: always; }
            .page:last-child { page-break-after: auto; }
            .document-header { display: table; width: 100%; border-bottom: 3px solid #123b53; padding-bottom: 8px; }
            .document-header > div { display: table-cell; }
            .document-header > strong { display: table-cell; width: 35mm; text-align: right; color: #a30f1e; font-size: 12pt; }
            .document-header span { color: #31596d; font-size: 8pt; font-weight: bold; }
            h1 { margin: 4px 0 0; font-size: 18pt; color: #082c40; }
            h2 { margin: 14px 0 7px; font-size: 12pt; color: #123b53; }
            .document-meta { margin: 9px 0 13px; padding: 7px; border: 1px solid #9cb3bf; background: #edf4f7; }
            .document-meta p { margin: 2px 0; }
            table { width: 100%; border-collapse: collapse; table-layout: fixed; }
            th, td { border: 1px solid #6f8792; padding: 5px; vertical-align: top; overflow-wrap: anywhere; }
            th { background: #dce9ef; color: #0b3043; font-size: 8pt; }
            td { font-size: 8pt; }
            dl { display: table; width: 100%; }
            dl > div { display: table-row; }
            dt, dd { display: table-cell; padding: 5px; border-bottom: 1px solid #ccd8de; }
            dt { width: 34%; color: #456270; font-weight: bold; }
            .document-approval { position: absolute; left: 0; right: 0; bottom: 0; display: table; width: 100%; border-top: 2px solid #123b53; padding-top: 12px; }
            .signature, .stamp { display: table-cell; width: 32%; height: 28mm; padding: 6px; border: 1px solid #94a8b2; vertical-align: bottom; text-align: center; }
            .signature span, .stamp span { display: block; border-top: 1px dotted #555; padding-top: 4px; font-size: 8pt; color: #455b65; }
            .stamp { vertical-align: middle; color: #a30f1e; }
            .document-approval p { display: table-row; font-size: 8pt; }
            .identity-sheet { display: table; width: 100%; border: 2px solid #123b53; background: #edf7fb; }
            .identity-photo { display: table-cell; width: 40mm; height: 50mm; border-right: 1px solid #78909c; text-align: center; vertical-align: middle; font-size: 28pt; font-weight: bold; color: #126184; }
            .identity-photo img { max-width: 38mm; max-height: 48mm; }
            .identity-data { display: table-cell; padding: 10px; vertical-align: top; }
            .identity-data h2 { margin-top: 0; font-size: 20pt; }
            ul { margin: 5px 0 12px; }
            .notice { padding: 8px; border-left: 4px solid #a30f1e; background: #f8eeee; }
          </style>
        </head>
        <body>${pagesHtml}</body>
      </html>
    `;
    const blob = new Blob(["\ufeff", html], { type: "application/msword;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename.replace(/[\\/:*?"<>|]+/g, "-");
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1500);
    return true;
  }

  function exportMissionWord(id) {
    const mission = state.db.missions.find((entry) => entry.id === id);
    if (!mission || !isAdmin()) return;
    const assigned = (mission.assignedTo || [])
      .map((userId) => findUser(userId)?.nick)
      .filter(Boolean)
      .join(", ") || "Nie przypisano";
    const reports = (mission.reports || []).map((report) => `
      <h2>Raport agenta ${esc(report.nick)}</h2>
      <p><b>Wynik:</b> ${esc(report.result)}</p>
      <p><b>Straty:</b> ${esc(report.losses)}</p>
      <p><b>Sprzęt:</b> ${esc(report.equipment?.join(", ") || "Brak")}</p>
      <p>${esc(report.notes)}</p>
    `).join("");
    const page = wordPage(
      `KARTA MISJI: ${mission.title}`,
      `
        <p><b>Identyfikator:</b> ${esc(mission.id.toUpperCase())}</p>
        <p><b>Status:</b> ${esc(mission.status)} &nbsp; <b>Minimalna ranga:</b> ${esc(mission.minRank)}</p>
        <p><b>Przydzieleni agenci:</b> ${esc(assigned)}</p>
      `,
      `
        <h2>Opis operacji</h2>
        <p>${esc(mission.description)}</p>
        <h2>Cele operacyjne</h2>
        <ol>${(mission.objectives || []).map((objective) => `<li>${esc(objective)}</li>`).join("")}</ol>
        <h2>Plan awaryjny</h2>
        <p>${esc(mission.contingencyPlan || "Nie określono")}</p>
        <p><b>Punkt ewakuacji:</b> ${esc(mission.evacuationPoint || "-")} &nbsp; <b>Trasa alternatywna:</b> ${esc(mission.alternativeRoute || "-")}</p>
        <h2>Załączniki</h2>
        <p>${esc((mission.attachments || []).map((attachment) => attachment.name).join(", ") || "Brak")}</p>
        <h2>Historia operacji</h2>
        <table>
          <thead><tr><th>Czas</th><th>Działanie</th><th>Osoba</th></tr></thead>
          <tbody>${(mission.timeline || []).map((entry) => `<tr><td>${esc(formatTime(entry.time))}</td><td>${esc(entry.action)}</td><td>${esc(entry.by || "system")}</td></tr>`).join("") || `<tr><td colspan="3">Brak wpisów.</td></tr>`}</tbody>
        </table>
        <p><b>Nagroda:</b> ${Number(mission.expReward || 0)} EXP</p>
        ${reports || `<p class="notice">Nie złożono jeszcze raportu końcowego.</p>`}
      `,
      CLASSIFICATIONS[mission.classification] || "TAJNE",
    );
    downloadWordDocument(`ABW-misja-${mission.id}.doc`, mission.title, page);
    logAction("dokument Word: misja", mission.title);
  }

  function exportOrderWord(id) {
    const order = state.db.orders.find((entry) => entry.id === id);
    if (!order || !isAdmin()) return;
    const user = findUser(order.userId);
    const page = wordPage(
      "KARTA ZAMÓWIENIA ABW",
      `
        <p><b>Numer:</b> ${esc(order.id.toUpperCase())}</p>
        <p><b>Agent:</b> ${esc(order.nick || user?.nick || "-")} &nbsp; <b>Odznaka:</b> ${esc(user?.badge || "-")}</p>
        <p><b>Data złożenia:</b> ${esc(formatTime(order.createdAt))} &nbsp; <b>Status:</b> ${esc(ORDER_STATUSES[order.status] || order.status || "Złożone")}</p>
      `,
      `
        <h2>Zamówione zasoby</h2>
        <table>
          <thead><tr><th>Lp.</th><th>Nazwa zasobu</th><th>Ilość</th></tr></thead>
          <tbody>${(order.items || []).map((item, index) => `
            <tr><td>${index + 1}</td><td>${esc(item.name)}</td><td>${Number(item.quantity || 0)}</td></tr>
          `).join("")}</tbody>
        </table>
        <h2>Historia realizacji</h2>
        <table>
          <thead><tr><th>Czas</th><th>Status</th><th>Osoba</th></tr></thead>
          <tbody>${(order.history || []).map((entry) => `<tr><td>${esc(formatTime(entry.time))}</td><td>${esc(ORDER_STATUSES[entry.status] || entry.status)}</td><td>${esc(entry.by || "system")}</td></tr>`).join("")}</tbody>
        </table>
        <p class="notice">Wydanie zasobów wymaga podpisu odbierającego i pieczęci magazynu.</p>
      `,
      "POUFNE",
    );
    downloadWordDocument(`ABW-zamowienie-${order.id}.doc`, `Zamówienie ${order.id}`, page);
    logAction("dokument Word: zamówienie", `${order.id} // ${order.nick || user?.nick || "-"}`);
  }

  function exportAllOrdersWord() {
    if (!isAdmin() || !state.db.orders.length) return;
    const pages = state.db.orders.map((order, index) => {
      const user = findUser(order.userId);
      return wordPage(
        `REJESTR ZAMÓWIEŃ // ${index + 1} Z ${state.db.orders.length}`,
        `
          <p><b>Numer:</b> ${esc(order.id.toUpperCase())}</p>
          <p><b>Agent:</b> ${esc(order.nick || user?.nick || "-")} &nbsp; <b>Odznaka:</b> ${esc(user?.badge || "-")}</p>
          <p><b>Data:</b> ${esc(formatTime(order.createdAt))} &nbsp; <b>Status:</b> ${esc(ORDER_STATUSES[order.status] || order.status)}</p>
        `,
        `
          <h2>Pełna lista pozycji</h2>
          <table>
            <thead><tr><th>Lp.</th><th>Zasób</th><th>Ilość</th><th>Id produktu</th></tr></thead>
            <tbody>${(order.items || []).map((item, itemIndex) => `<tr><td>${itemIndex + 1}</td><td>${esc(item.name)}</td><td>${Number(item.quantity || 0)}</td><td>${esc(item.productId || "-")}</td></tr>`).join("")}</tbody>
          </table>
          <h2>Historia statusów</h2>
          <table>
            <thead><tr><th>Czas</th><th>Status</th><th>Osoba</th></tr></thead>
            <tbody>${(order.history || []).map((entry) => `<tr><td>${esc(formatTime(entry.time))}</td><td>${esc(ORDER_STATUSES[entry.status] || entry.status)}</td><td>${esc(entry.by || "system")}</td></tr>`).join("")}</tbody>
          </table>
        `,
        "POUFNE",
      );
    });
    downloadWordDocument(
      `ABW-pelny-rejestr-zamowien-${new Date().toISOString().slice(0, 10)}.doc`,
      "Pełny rejestr zamówień ABW",
      pages.join(""),
    );
    logAction("dokument Word: pełny rejestr zamówień", `${state.db.orders.length} zamówień`);
  }

  function exportDocumentWord(id) {
    const document = state.db.documents.find((item) => item.id === id);
    if (!document || !isAdmin() || !canViewClassified(document.classification)) return;
    const page = wordPage(
      document.title,
      `
        <p><b>Typ:</b> ${esc(DOCUMENT_TYPES[document.type] || document.type)} &nbsp; <b>Wersja:</b> ${Number(document.version || 1)}</p>
        <p><b>Autor:</b> ${esc(document.author || "ABW CORE")} &nbsp; <b>Aktualizacja:</b> ${esc(formatTime(document.updatedAt || document.createdAt))}</p>
      `,
      `<div class="document-body">${esc(document.body).replace(/\n/g, "<br>")}</div>`,
      CLASSIFICATIONS[document.classification] || "JAWNE",
    );
    downloadWordDocument(`ABW-dokument-${document.id}.doc`, document.title, page);
  }

  function exportSystemReportWord(type) {
    if (!isAdmin()) return;
    const days = { daily: 1, weekly: 7, monthly: 30 }[type] || 1;
    const since = Date.now() - days * 86400000;
    const missions = state.db.missions.filter((mission) => Number(mission.completedAt || 0) >= since);
    const events = state.db.events.filter((event) => Number(event.createdAt || 0) >= since);
    const orders = state.db.orders.filter((order) => Number(order.createdAt || 0) >= since);
    const logs = state.db.logs.filter((log) => Number(log.time || 0) >= since);
    const page = wordPage(
      `RAPORT ${days === 1 ? "DZIENNY" : days === 7 ? "TYGODNIOWY" : "MIESIĘCZNY"} ABW`,
      `<p><b>Okres:</b> ${esc(formatTime(since))} - ${esc(formatTime(Date.now()))}</p><p><b>Sporządził:</b> ${esc(currentUser()?.nick || "ABW CORE")}</p>`,
      `
        <h2>Podsumowanie</h2>
        <table><tbody>
          <tr><th>Zakończone misje</th><td>${missions.length}</td></tr>
          <tr><th>Zdarzenia</th><td>${events.length}</td></tr>
          <tr><th>Zamówienia</th><td>${orders.length}</td></tr>
          <tr><th>Wpisy systemowe</th><td>${logs.length}</td></tr>
        </tbody></table>
        <h2>Misje</h2><ul>${missions.map((mission) => `<li>${esc(mission.title)} - ${esc(mission.status)}</li>`).join("") || "<li>Brak</li>"}</ul>
        <h2>Zdarzenia</h2><ul>${events.map((event) => `<li>${esc(event.title)} - ${esc(event.type)}</li>`).join("") || "<li>Brak</li>"}</ul>
        <h2>Zamówienia</h2><ul>${orders.map((order) => `<li>${esc(order.id)} - ${esc(order.nick)} - ${esc(ORDER_STATUSES[order.status] || order.status)}</li>`).join("") || "<li>Brak</li>"}</ul>
      `,
      "POUFNE",
    );
    downloadWordDocument(`ABW-raport-${type}-${new Date().toISOString().slice(0, 10)}.doc`, "Raport systemowy ABW", page);
  }

  function exportIdentityWord(id) {
    const user = findUser(id);
    if (!user || !isAdmin()) return;
    const card = getIdentityCard(user);
    const rankEntry = rankEntries().find((entry) => entry.name === user.rank);
    const calculatedClearance = Object.entries(CLASSIFICATION_RANK_INDEX)
      .filter(([, threshold]) => rankIndex(user.rank) >= threshold)
      .at(-1)?.[0] || "jawne";
    const clearance = card.clearance || calculatedClearance;
    const photo = card.photoData
      ? `<img src="${esc(card.photoData)}" alt="Zdjęcie" />`
      : esc(user.nick.slice(0, 2).toUpperCase());
    const qr = state.identityQrs[user.id]
      ? `<p style="text-align:center"><img src="${esc(state.identityQrs[user.id])}" alt="Kod QR" style="width:32mm;height:32mm" /></p>`
      : "";
    const page = wordPage(
      "CYFROWA LEGITYMACJA AGENTA",
      `
        <p><b>Numer dokumentu:</b> ${esc(`${user.badge}-${user.id.slice(0, 8)}`.toUpperCase())}</p>
        <p><b>Status:</b> ${esc(identityStatusLabel(card.status))} &nbsp; <b>Ważna do:</b> ${esc(card.validUntil || "Bezterminowo")}</p>
      `,
      `
        <div class="identity-sheet">
          <div class="identity-photo">${photo}</div>
          <div class="identity-data">
            <h2>${esc(user.nick)}</h2>
            <p>${esc(user.fullName)}</p>
            <dl>
              <div><dt>Odznaka</dt><dd>${esc(user.badge)}</dd></div>
              <div><dt>Ranga</dt><dd>${esc(user.rank)}</dd></div>
              <div><dt>Korpus</dt><dd>${esc(rankEntry?.corpsName || "ABW")}</dd></div>
              <div><dt>Kryptonim</dt><dd>${esc(card.callsign || "-")}</dd></div>
              <div><dt>Jednostka</dt><dd>${esc(card.unit || "-")}</dd></div>
              <div><dt>Specjalizacja</dt><dd>${esc(card.specialization || "-")}</dd></div>
              <div><dt>Grupa krwi</dt><dd>${esc(card.bloodType || "-")}</dd></div>
              <div><dt>Klauzula</dt><dd>${esc(CLASSIFICATIONS[clearance])}</dd></div>
            </dl>
          </div>
        </div>
        ${qr}
        <p class="notice">Dokument ważny wyłącznie z podpisem upoważnionego administratora i pieczęcią ABW.</p>
      `,
      CLASSIFICATIONS[clearance],
    );
    downloadWordDocument(`ABW-legitymacja-${user.nick}.doc`, `Legitymacja ${user.nick}`, page);
    logAction("dokument Word: legitymacja", `${user.nick} // ${user.badge}`);
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
    mission.timeline ||= [];
    mission.timeline.push({
      action: status === "w trakcie" ? "Agent rozpoczął operację" : "Operację oznaczono jako nieudaną",
      time: Date.now(),
      by: currentUser()?.nick || "system",
    });
    if (status === "nieudana") mission.completedAt = Date.now();
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
    mission.timeline ||= [];
    mission.timeline.push({
      action: "Operację zakończono",
      time: Date.now(),
      by: user.nick,
    });
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

  async function submitMissionReport(form) {
    const mission = state.db.missions.find((item) => item.id === form.dataset.missionId);
    const user = currentUser();
    if (!mission || !user || mission.status !== "w trakcie" || !hasMissionAccess(mission)) return;
    const data = Object.fromEntries(new FormData(form));
    const file = form.elements.attachment.files[0];
    if (file && file.size > 1024 * 1024) {
      showToast("Załącznik może mieć maksymalnie 1 MB");
      return;
    }
    const attachmentData = file ? await readFileAsDataUrl(file) : "";
    mission.reports ||= [];
    if (mission.reports.some((report) => report.userId === user.id)) {
      showToast("Raport tego agenta został już zapisany");
      return;
    }
    mission.reports.push({
      id: uid("rpt"),
      userId: user.id,
      nick: user.nick,
      result: data.result,
      losses: data.losses.trim(),
      equipment: data.equipment.split("\n").map((line) => line.trim()).filter(Boolean),
      notes: data.notes.trim(),
      attachmentName: file?.name || "",
      attachmentData,
      createdAt: Date.now(),
    });
    mission.timeline ||= [];
    mission.timeline.push({
      action: "Złożono raport końcowy",
      time: Date.now(),
      by: user.nick,
    });
    mission.completedAt = Date.now();
    completeMission(mission.id);
    logAction("raport końcowy", mission.title);
  }

  async function triggerEvacuation() {
    if (!window.confirm("Uruchomić globalną procedurę ewakuacji ABW?")) return;
    try {
      const result = await window.ABWApi.triggerEvacuation(
        `Agent ${currentUser()?.nick || "ABW"} zgłosił konieczność natychmiastowej ewakuacji.`,
      );
      state.db.events.unshift(result.event);
      markCategoryActivity("events");
      showEventPopup(result.event);
      activateAlarmMode();
      showNotification("PROCEDURA EWAKUACJI", "Kanał alarmowy został aktywowany.");
      logAction("procedura ewakuacji", result.event.title);
      await syncFromServer();
    } catch (error) {
      showToast(error.message || "Nie udało się uruchomić ewakuacji");
    }
  }

  function maybePromote(user) {
    const currentIndex = rankIndex(user.rank);
    const nextThreshold = (currentIndex + 1) * 650;
    const availableRanks = rankNames();
    if (user.exp >= nextThreshold && currentIndex < availableRanks.length - 1) {
      user.rank = availableRanks[currentIndex + 1];
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

  function showNotification(title, body) {
    if (!currentUser()) return;
    let container = document.querySelector(".notification-stack");
    if (!container) {
      container = document.createElement("div");
      container.className = "notification-stack";
      document.body.appendChild(container);
    }
    const notification = document.createElement("article");
    notification.className = "system-notification";
    notification.innerHTML = `<strong>${esc(title)}</strong><p>${esc(body)}</p>`;
    container.appendChild(notification);
    window.setTimeout(() => notification.remove(), 6500);
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
      drawWorldMap(time);
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

  function initWorldMap() {
    const canvas = $("worldMapCanvas");
    if (!canvas) return;
    state.globe.canvas = canvas;
    state.globe.ctx = canvas.getContext("2d");
    loadWorldMapData();
    if (canvas.dataset.bound) return;
    canvas.dataset.bound = "true";
    canvas.addEventListener("contextmenu", (event) => {
      event.preventDefault();
      openMapPointDialog(event.clientX, event.clientY);
    });
    canvas.addEventListener("pointerdown", (event) => {
      state.globe.dragging = true;
      state.globe.dragMoved = false;
      state.globe.lastX = event.clientX;
      state.globe.lastY = event.clientY;
      state.globe.pointerStartX = event.clientX;
      state.globe.pointerStartY = event.clientY;
      canvas.setPointerCapture(event.pointerId);
      if (event.pointerType === "touch" && canManageCategory("map")) {
        window.clearTimeout(state.globe.longPressTimer);
        state.globe.longPressTimer = window.setTimeout(() => {
          state.globe.dragging = false;
          openMapPointDialog(event.clientX, event.clientY);
        }, 650);
      }
    });
    canvas.addEventListener("pointermove", (event) => {
      updateMapCoordinateReadout(event.clientX, event.clientY);
      if (!state.globe.dragging) return;
      const dx = event.clientX - state.globe.lastX;
      const dy = event.clientY - state.globe.lastY;
      if (
        Math.abs(event.clientX - state.globe.pointerStartX) > 7
        || Math.abs(event.clientY - state.globe.pointerStartY) > 7
      ) {
        state.globe.dragMoved = true;
        window.clearTimeout(state.globe.longPressTimer);
      }
      const rect = canvas.getBoundingClientRect();
      state.globe.offsetX += dx * (canvas.width / Math.max(1, rect.width));
      state.globe.offsetY += dy * (canvas.height / Math.max(1, rect.height));
      clampMapOffset();
      state.globe.lastX = event.clientX;
      state.globe.lastY = event.clientY;
    });
    canvas.addEventListener("pointerup", (event) => {
      const shouldHandleMode = !state.globe.dragMoved && state.globe.mode !== "pan";
      state.globe.dragging = false;
      window.clearTimeout(state.globe.longPressTimer);
      if (shouldHandleMode) handleMapModeClick(event.clientX, event.clientY);
    });
    canvas.addEventListener("pointercancel", () => {
      state.globe.dragging = false;
      window.clearTimeout(state.globe.longPressTimer);
    });
    canvas.addEventListener("wheel", (event) => {
      event.preventDefault();
      zoomMapAt(event.clientX, event.clientY, event.deltaY > 0 ? -0.25 : 0.25);
    }, { passive: false });
  }

  async function loadWorldMapData() {
    if (state.globe.worldData || state.globe.loading || state.globe.loadFailed) return;
    state.globe.loading = true;
    try {
      if (!window.ABW_WORLD_MAP?.features?.length) throw new Error("Brak lokalnych danych mapy");
      state.globe.worldData = window.ABW_WORLD_MAP;
      state.globe.labelFeatures = [...(state.globe.worldData.features || [])]
        .filter((feature) => (
          Number.isFinite(Number(feature.properties?.LABEL_X))
          && Number.isFinite(Number(feature.properties?.LABEL_Y))
        ))
        .map((feature) => ({
          ...feature,
          abwCountryLabel: countryDisplayName(feature.properties),
        }))
        .sort((a, b) => Number(b.properties?.POP_EST || 0) - Number(a.properties?.POP_EST || 0));
    } catch (error) {
      state.globe.loadFailed = true;
      showToast("Nie udało się wczytać konturów mapy świata");
    } finally {
      state.globe.loading = false;
    }
  }

  function countryDisplayName(properties = {}) {
    const specialNames = {
      KOS: "Kosowo",
      SAH: "Sahara Zachodnia",
      SOL: "Somaliland",
      SDS: "Sudan Południowy",
    };
    const code3 = properties.ADM0_A3 || properties.SOV_A3;
    if (specialNames[code3]) return specialNames[code3];
    const code2 = [properties.ISO_A2_EH, properties.ISO_A2]
      .find((code) => /^[A-Z]{2}$/.test(String(code || "")));
    if (code2 && typeof Intl.DisplayNames === "function") {
      try {
        return new Intl.DisplayNames(["pl"], { type: "region" }).of(code2);
      } catch (error) {
        // Fallback to the stable English name below.
      }
    }
    return properties.NAME_EN || properties.NAME_LONG || properties.ADMIN || properties.NAME || "Nieznany kraj";
  }

  function getMapLayout(canvas = state.globe.canvas) {
    if (!canvas) return null;
    const width = canvas.width;
    const height = canvas.height;
    const padding = Math.max(12, Math.min(width, height) * 0.025);
    let baseWidth = width - padding * 2;
    let baseHeight = baseWidth / 2;
    if (baseHeight > height - padding * 2) {
      baseHeight = height - padding * 2;
      baseWidth = baseHeight * 2;
    }
    return {
      width,
      height,
      baseWidth,
      baseHeight,
      centerX: width / 2,
      centerY: height / 2,
      mapWidth: baseWidth * state.globe.zoom,
      mapHeight: baseHeight * state.globe.zoom,
      mapX: width / 2 - (baseWidth * state.globe.zoom) / 2 + state.globe.offsetX,
      mapY: height / 2 - (baseHeight * state.globe.zoom) / 2 + state.globe.offsetY,
    };
  }

  function projectWorld(lat, lon, layout = getMapLayout()) {
    if (!layout) return { x: 0, y: 0 };
    return {
      x: layout.mapX + ((Number(lon) + 180) / 360) * layout.mapWidth,
      y: layout.mapY + ((90 - Number(lat)) / 180) * layout.mapHeight,
    };
  }

  function screenToGeo(clientX, clientY) {
    const canvas = state.globe.canvas;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const x = (clientX - rect.left) * (canvas.width / Math.max(1, rect.width));
    const y = (clientY - rect.top) * (canvas.height / Math.max(1, rect.height));
    const layout = getMapLayout(canvas);
    if (
      !layout
      || x < layout.mapX
      || x > layout.mapX + layout.mapWidth
      || y < layout.mapY
      || y > layout.mapY + layout.mapHeight
    ) return null;
    return {
      lat: Math.max(-90, Math.min(90, 90 - ((y - layout.mapY) / layout.mapHeight) * 180)),
      lon: Math.max(-180, Math.min(180, ((x - layout.mapX) / layout.mapWidth) * 360 - 180)),
      localX: clientX - rect.left,
      localY: clientY - rect.top,
    };
  }

  function clampMapOffset() {
    const layout = getMapLayout();
    if (!layout) return;
    const maxX = Math.max(0, (layout.mapWidth - layout.baseWidth) / 2);
    const maxY = Math.max(0, (layout.mapHeight - layout.baseHeight) / 2);
    state.globe.offsetX = Math.max(-maxX, Math.min(maxX, state.globe.offsetX));
    state.globe.offsetY = Math.max(-maxY, Math.min(maxY, state.globe.offsetY));
  }

  function zoomMapAt(clientX, clientY, delta) {
    const canvas = state.globe.canvas;
    if (!canvas) return;
    const geo = screenToGeo(clientX, clientY);
    const oldZoom = state.globe.zoom;
    const nextZoom = Math.max(1, Math.min(4.5, oldZoom + delta));
    if (nextZoom === oldZoom) return;
    state.globe.zoom = nextZoom;
    if (geo) {
      const rect = canvas.getBoundingClientRect();
      const cursorX = (clientX - rect.left) * (canvas.width / Math.max(1, rect.width));
      const cursorY = (clientY - rect.top) * (canvas.height / Math.max(1, rect.height));
      const layout = getMapLayout(canvas);
      const normalizedX = (geo.lon + 180) / 360;
      const normalizedY = (90 - geo.lat) / 180;
      state.globe.offsetX = cursorX - normalizedX * layout.mapWidth
        - (layout.centerX - layout.mapWidth / 2);
      state.globe.offsetY = cursorY - normalizedY * layout.mapHeight
        - (layout.centerY - layout.mapHeight / 2);
    }
    clampMapOffset();
  }

  function changeMapZoom(delta) {
    const canvas = state.globe.canvas;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    zoomMapAt(rect.left + rect.width / 2, rect.top + rect.height / 2, delta);
  }

  function resetMapView() {
    state.globe.zoom = 1;
    state.globe.offsetX = 0;
    state.globe.offsetY = 0;
    closeMapPointDialog();
  }

  function focusMapCoordinates(lat, lon, zoom = 3) {
    const canvas = state.globe.canvas;
    if (!canvas) return;
    state.globe.zoom = Math.max(1, Math.min(6, zoom));
    const layout = getMapLayout(canvas);
    if (!layout) return;
    const naturalX = layout.centerX - layout.mapWidth / 2
      + ((Number(lon) + 180) / 360) * layout.mapWidth;
    const naturalY = layout.centerY - layout.mapHeight / 2
      + ((90 - Number(lat)) / 180) * layout.mapHeight;
    state.globe.offsetX = layout.centerX - naturalX;
    state.globe.offsetY = layout.centerY - naturalY;
    clampMapOffset();
  }

  async function focusMapCountry(query) {
    const normalized = String(query || "").trim().toLocaleLowerCase("pl");
    if (!normalized) return;
    await loadWorldMapData();
    const feature = state.globe.labelFeatures.find((item) => (
      item.abwCountryLabel.toLocaleLowerCase("pl") === normalized
      || item.abwCountryLabel.toLocaleLowerCase("pl").includes(normalized)
    ));
    if (!feature) {
      showToast("Nie znaleziono kraju na mapie");
      return;
    }
    focusMapCoordinates(
      Number(feature.properties.LABEL_Y),
      Number(feature.properties.LABEL_X),
      2.8,
    );
    showToast(`Mapa ustawiona na: ${feature.abwCountryLabel}`);
  }

  function focusMapObject(id) {
    const object = state.db.mapObjects.find((item) => item.id === id);
    if (!object) return;
    focusMapCoordinates(object.lat, object.lon, object.type === "route" ? 2.2 : 3.4);
  }

  function updateMapCoordinateReadout(clientX, clientY) {
    const output = $("mapCoordinates");
    if (!output) return;
    const geo = screenToGeo(clientX, clientY);
    output.textContent = geo
      ? `LAT ${geo.lat.toFixed(2)} / LON ${geo.lon.toFixed(2)}`
      : "LAT --.-- / LON --.--";
  }

  function handleMapModeClick(clientX, clientY) {
    const geo = screenToGeo(clientX, clientY);
    if (!geo) return;
    if (state.globe.mode === "measure") {
      if (state.globe.measurePoints.length >= 2) state.globe.measurePoints = [];
      state.globe.measurePoints.push({ lat: geo.lat, lon: geo.lon });
      const output = $("mapMeasureReadout");
      if (output) output.textContent = mapMeasurementLabel();
      return;
    }
    if (state.globe.mode === "route" && canManageCategory("map")) {
      if (!state.globe.routePoints.length) {
        state.globe.routePoints = [{ lat: geo.lat, lon: geo.lon }];
        showToast("Punkt początkowy trasy zapisany");
        return;
      }
      const start = state.globe.routePoints[0];
      state.globe.routePoints = [];
      openMapPointDialog(clientX, clientY, {
        type: "route",
        lat: start.lat,
        lon: start.lon,
        lat2: geo.lat,
        lon2: geo.lon,
      });
      return;
    }
    if (state.globe.mode === "zone" && canManageCategory("map")) {
      openMapPointDialog(clientX, clientY, { type: "zone" });
    }
  }

  function openMapPointDialog(clientX, clientY, options = {}) {
    if (!canManageCategory("map")) {
      showToast("Ta ranga nie może dodawać punktów na mapie");
      return;
    }
    const geo = screenToGeo(clientX, clientY);
    const dialog = $("mapPointDialog");
    const form = $("mapQuickPointForm");
    if (!geo || !dialog || !form) return;
    form.reset();
    form.elements.type.value = options.type || "base";
    form.elements.lat.value = Number(options.lat ?? geo.lat).toFixed(5);
    form.elements.lon.value = Number(options.lon ?? geo.lon).toFixed(5);
    form.elements.lat2.value = options.lat2 === undefined ? "" : Number(options.lat2).toFixed(5);
    form.elements.lon2.value = options.lon2 === undefined ? "" : Number(options.lon2).toFixed(5);
    $("mapPointPosition").textContent = options.type === "route"
      ? `${Number(options.lat).toFixed(2)}°, ${Number(options.lon).toFixed(2)}° → ${Number(options.lat2).toFixed(2)}°, ${Number(options.lon2).toFixed(2)}°`
      : `${geo.lat.toFixed(2)}°, ${geo.lon.toFixed(2)}°`;
    dialog.classList.remove("hidden");
    const shell = dialog.parentElement;
    const maxLeft = Math.max(10, shell.clientWidth - dialog.offsetWidth - 10);
    const maxTop = Math.max(10, shell.clientHeight - dialog.offsetHeight - 10);
    dialog.style.left = `${Math.max(10, Math.min(maxLeft, geo.localX + 10))}px`;
    dialog.style.top = `${Math.max(10, Math.min(maxTop, geo.localY + 10))}px`;
    form.elements.name.focus();
  }

  function closeMapPointDialog() {
    $("mapPointDialog")?.classList.add("hidden");
  }

  function drawWorldMap(time) {
    const { canvas, ctx } = state.globe;
    if (!canvas || !ctx || !canvas.isConnected) return;
    if (!resizeCanvas(canvas)) return;
    const layout = getMapLayout(canvas);
    ctx.clearRect(0, 0, layout.width, layout.height);
    ctx.fillStyle = "rgba(0, 10, 19, 0.96)";
    ctx.fillRect(0, 0, layout.width, layout.height);
    ctx.save();
    ctx.beginPath();
    ctx.rect(layout.mapX, layout.mapY, layout.mapWidth, layout.mapHeight);
    ctx.clip();

    const ocean = ctx.createLinearGradient(layout.mapX, layout.mapY, layout.mapX, layout.mapY + layout.mapHeight);
    if (state.globe.style === "satellite") {
      ocean.addColorStop(0, "rgba(17, 55, 71, 0.98)");
      ocean.addColorStop(0.5, "rgba(8, 34, 53, 0.98)");
      ocean.addColorStop(1, "rgba(4, 22, 39, 0.98)");
    } else {
      ocean.addColorStop(0, "rgba(7, 44, 64, 0.98)");
      ocean.addColorStop(0.5, "rgba(3, 27, 45, 0.98)");
      ocean.addColorStop(1, "rgba(2, 18, 34, 0.98)");
    }
    ctx.fillStyle = ocean;
    ctx.fillRect(layout.mapX, layout.mapY, layout.mapWidth, layout.mapHeight);
    drawWorldGrid(ctx, layout);
    drawCountries(ctx, layout);
    drawWorldLabels(ctx, layout);
    drawWorldMapObjects(ctx, layout, time);
    drawMapDraftOverlay(ctx, layout);
    ctx.restore();

    ctx.strokeStyle = "rgba(69, 220, 255, 0.5)";
    ctx.lineWidth = Math.max(1, layout.width / 900);
    ctx.strokeRect(layout.mapX, layout.mapY, layout.mapWidth, layout.mapHeight);
  }

  function drawWorldGrid(ctx, layout) {
    ctx.lineWidth = Math.max(0.7, layout.width / 1500);
    ctx.strokeStyle = "rgba(113, 200, 225, 0.16)";
    ctx.fillStyle = "rgba(173, 222, 235, 0.48)";
    ctx.font = `${Math.max(9, layout.width / 120)}px system-ui`;
    for (let lon = -180; lon <= 180; lon += 30) {
      const start = projectWorld(-90, lon, layout);
      const end = projectWorld(90, lon, layout);
      ctx.beginPath();
      ctx.moveTo(start.x, start.y);
      ctx.lineTo(end.x, end.y);
      ctx.stroke();
      if (lon > -180 && lon < 180) ctx.fillText(`${Math.abs(lon)}°${lon < 0 ? "W" : "E"}`, start.x + 4, layout.mapY + 13);
    }
    for (let lat = -60; lat <= 60; lat += 30) {
      const start = projectWorld(lat, -180, layout);
      const end = projectWorld(lat, 180, layout);
      ctx.beginPath();
      ctx.moveTo(start.x, start.y);
      ctx.lineTo(end.x, end.y);
      ctx.stroke();
      ctx.fillText(lat === 0 ? "EQ" : `${Math.abs(lat)}°${lat < 0 ? "S" : "N"}`, layout.mapX + 5, start.y - 4);
    }
  }

  function drawCountries(ctx, layout) {
    const features = state.globe.worldData?.features || [];
    if (!features.length) {
      ctx.fillStyle = "rgba(194, 233, 241, 0.7)";
      ctx.font = `${Math.max(13, layout.width / 70)}px system-ui`;
      ctx.textAlign = "center";
      ctx.fillText(state.globe.loadFailed ? "BRAK DANYCH MAPY" : "ŁADOWANIE MAPY ŚWIATA", layout.centerX, layout.centerY);
      ctx.textAlign = "start";
      return;
    }
    features.forEach((feature) => {
      ctx.beginPath();
      traceWorldGeometry(ctx, feature.geometry, layout);
      const colorIndex = Number(feature.properties?.MAPCOLOR9 || 1) % 4;
      ctx.fillStyle = (state.globe.style === "satellite" ? [
        "rgba(59, 87, 68, 0.94)",
        "rgba(72, 93, 70, 0.94)",
        "rgba(48, 82, 63, 0.94)",
        "rgba(69, 88, 62, 0.94)",
      ] : [
        "rgba(30, 91, 91, 0.9)",
        "rgba(28, 82, 103, 0.9)",
        "rgba(37, 99, 89, 0.9)",
        "rgba(31, 79, 82, 0.9)",
      ])[colorIndex];
      ctx.fill("evenodd");
      ctx.strokeStyle = "rgba(153, 226, 222, 0.43)";
      ctx.lineWidth = Math.max(0.6, layout.width / 1800);
      ctx.stroke();
    });
  }

  function traceWorldGeometry(ctx, geometry, layout) {
    if (!geometry) return;
    const polygons = geometry.type === "Polygon" ? [geometry.coordinates] : geometry.coordinates;
    polygons.forEach((polygon) => {
      polygon.forEach((ring) => {
        ring.forEach(([lon, lat], index) => {
          const point = projectWorld(lat, lon, layout);
          if (index === 0) ctx.moveTo(point.x, point.y);
          else ctx.lineTo(point.x, point.y);
        });
        ctx.closePath();
      });
    });
  }

  function drawWorldLabels(ctx, layout) {
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    state.globe.labelFeatures.forEach((feature) => {
      const point = projectWorld(
        Number(feature.properties.LABEL_Y),
        Number(feature.properties.LABEL_X),
        layout,
      );
      if (
        point.x < layout.mapX
        || point.x > layout.mapX + layout.mapWidth
        || point.y < layout.mapY
        || point.y > layout.mapY + layout.mapHeight
      ) return;
      const population = Number(feature.properties.POP_EST || 0);
      const major = population > 35_000_000;
      const fontSize = Math.max(
        state.globe.zoom < 1.4 ? 6 : 7,
        Math.min(major ? 13 : 10, layout.width / (major ? 112 : 145)),
      );
      ctx.font = `${major ? 750 : 600} ${fontSize}px system-ui`;
      const label = feature.abwCountryLabel || countryDisplayName(feature.properties);
      ctx.strokeStyle = "rgba(0, 12, 20, 0.94)";
      ctx.lineWidth = major ? 3 : 2;
      ctx.strokeText(label, point.x, point.y);
      ctx.fillStyle = major ? "rgba(235, 250, 250, 0.9)" : "rgba(221, 242, 242, 0.66)";
      ctx.fillText(label, point.x, point.y);
    });
    ctx.textAlign = "start";
    ctx.textBaseline = "alphabetic";
  }

  function drawWorldMapObjects(ctx, layout, time) {
    const colors = {
      intelligence: "rgba(255,206,107,0.95)",
      operations: "rgba(115,255,176,0.95)",
      infrastructure: "rgba(69,220,255,0.95)",
    };
    const objects = state.db.mapObjects.filter(isMapObjectVisible);
    objects
      .filter((object) => Array.isArray(object.history) && object.history.length)
      .forEach((object) => {
        const trail = [...object.history, { lat: object.lat, lon: object.lon }];
        ctx.strokeStyle = "rgba(255,255,255,0.28)";
        ctx.lineWidth = Math.max(1, layout.width / 1000);
        ctx.setLineDash([3, 5]);
        ctx.beginPath();
        trail.forEach((entry, index) => {
          const point = projectWorld(entry.lat, entry.lon, layout);
          if (index === 0) ctx.moveTo(point.x, point.y);
          else ctx.lineTo(point.x, point.y);
        });
        ctx.stroke();
        ctx.setLineDash([]);
      });
    objects
      .filter((object) => object.type === "zone")
      .forEach((zone) => {
        const point = projectWorld(zone.lat, zone.lon, layout);
        const radius = Math.max(12, (Number(zone.radiusKm || 250) / 40075) * layout.mapWidth);
        ctx.fillStyle = "rgba(255,63,73,0.13)";
        ctx.strokeStyle = "rgba(255,99,109,0.72)";
        ctx.lineWidth = Math.max(1.5, layout.width / 750);
        ctx.beginPath();
        ctx.arc(point.x, point.y, radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      });
    objects
      .filter((object) => object.type === "route" && typeof object.lat2 === "number" && typeof object.lon2 === "number")
      .forEach((route) => {
        const start = projectWorld(route.lat, route.lon, layout);
        const end = projectWorld(route.lat2, route.lon2, layout);
        ctx.strokeStyle = colors[route.layer] || "rgba(69,220,255,0.9)";
        ctx.lineWidth = Math.max(1.5, layout.width / 650);
        ctx.setLineDash([8, 8]);
        ctx.beginPath();
        const midX = (start.x + end.x) / 2;
        const midY = (start.y + end.y) / 2 - layout.mapHeight * 0.06;
        ctx.moveTo(start.x, start.y);
        ctx.quadraticCurveTo(midX, midY, end.x, end.y);
        ctx.stroke();
        ctx.setLineDash([]);

        const phase = (Math.sin(time * 0.0012) + 1) / 2;
        const lat = route.lat + (route.lat2 - route.lat) * phase;
        const lon = route.lon + (route.lon2 - route.lon) * phase;
        drawMapPoint(ctx, projectWorld(lat, lon, layout), "rgba(255,255,255,0.95)", "UNIT", layout);
      });

    objects
      .filter((object) => !["route", "zone"].includes(object.type))
      .forEach((object) => {
        const p = projectWorld(object.lat, object.lon, layout);
        drawMapPoint(ctx, p, colors[object.layer] || "rgba(69,220,255,0.95)", object.type.toUpperCase().slice(0, 4), layout);
        ctx.fillStyle = "rgba(232,247,255,0.82)";
        ctx.font = `${Math.max(10, layout.width / 90)}px system-ui`;
        ctx.fillText(object.name, p.x + 10, p.y - 8);
      });
  }

  function drawMapDraftOverlay(ctx, layout) {
    const drawLine = (points, color) => {
      if (!points.length) return;
      ctx.strokeStyle = color;
      ctx.fillStyle = color;
      ctx.lineWidth = Math.max(2, layout.width / 700);
      ctx.setLineDash([7, 6]);
      ctx.beginPath();
      points.forEach((entry, index) => {
        const point = projectWorld(entry.lat, entry.lon, layout);
        if (index === 0) ctx.moveTo(point.x, point.y);
        else ctx.lineTo(point.x, point.y);
        ctx.fillRect(point.x - 3, point.y - 3, 6, 6);
      });
      ctx.stroke();
      ctx.setLineDash([]);
    };
    drawLine(state.globe.measurePoints, "rgba(255,206,107,0.95)");
    drawLine(state.globe.routePoints, "rgba(115,255,176,0.95)");
  }

  function drawMapPoint(ctx, point, color, label, layout) {
    const size = Math.max(4, Math.min(8, layout.width / 140));
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
    ctx.font = `${Math.max(9, layout.width / 125)}px system-ui`;
    ctx.fillText(label, point.x + 12, point.y - 5);
    ctx.restore();
  }

  window.addEventListener("resize", triggerResize);
})();
