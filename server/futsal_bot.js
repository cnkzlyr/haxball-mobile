// =============================================================================
// ⚡ PRO FUTSAL — HaxBall Headless Oda Botu (v4.0)
// -----------------------------------------------------------------------------
// Kullanım (elle):
//   1) https://www.haxball.com/headlesstoken adresinden token alın.
//   2) https://www.haxball.com/headless sayfasını açın, F12 > Console.
//   3) Aşağıdaki CONFIG.token alanına token'ı yazın, tüm dosyayı yapıştırıp Enter.
// Kullanım (otomatik):
//   python3 start_server.py   (token alma + oda açma + harita yükleme otomatik)
//
// Özellikler:
//   • 1v1 → 5v5 otomatik ölçeklenen futsal haritaları (oyuncu sayısına göre)
//   • Sıra (kuyruk) sistemi: kazanan kalır, kaybeden sıranın sonuna geçer
//   • Gol / asist / kendi kalesine / şut hızı / direk algılama
//   • Hat-trick, gol yemeden bitirme (clean sheet) ve maçın oyuncusu (MVP)
//   • Kalıcı istatistikler (localStorage) + !top liderlik tablosu
//   • AFK algılama, sohbet spam koruması, kalıcı ban listesi
//   • Admin devri: admin çıkarsa odadaki en eski oyuncuya geçer
// =============================================================================
(function () {
  "use strict";

  // ---------------------------------------------------------------------------
  // 0) AYARLAR  (start_server.py bu alanları window.__FUTSAL_CONFIG ile ezer)
  // ---------------------------------------------------------------------------
  var CONFIG = Object.assign({
    roomName: "⚡ Pro Futsal 1v1-5v5 | Sıra Sistemi",
    botName: "⚽ Hakem",
    maxPlayers: 16,
    public: true,
    password: null,               // Odaya şifre koymak için: "sifre"
    token: "BURAYA_TOKEN_YAPISTIRIN",
    geo: null,                    // Örn: { code: "TR", lat: 41.01, lon: 28.97 }
    adminPassword: "",            // Boş bırakılırsa her açılışta rastgele üretilir (konsola yazılır)
    scoreLimit: 3,
    timeLimit: 3,                 // dakika
    maxPerTeam: 5,
    afkWarnSeconds: 10,
    afkKickSeconds: 16,
    spamMessages: 5,              // spamWindowMs içinde bu kadar mesaj = susturma
    spamWindowMs: 4000,
    spamMuteSeconds: 20,
    welcomeExtra: ""              // Hoş geldin mesajına eklenecek satır (ör. Discord linki)
  }, (typeof window !== "undefined" && window.__FUTSAL_CONFIG) || {});

  // ---------------------------------------------------------------------------
  // 1) HBInit BULMA
  // ---------------------------------------------------------------------------
  var HB = (typeof HBInit !== "undefined") ? HBInit : (function () {
    var frames = document.querySelectorAll("iframe");
    for (var i = 0; i < frames.length; i++) {
      try { if (frames[i].contentWindow && frames[i].contentWindow.HBInit) return frames[i].contentWindow.HBInit; } catch (e) {}
    }
    return null;
  })();
  if (!HB) {
    console.error("❌ HBInit bulunamadı! Konsolun sol üstündeki 'top' menüsünden headless iframe'ini seçip tekrar deneyin.");
    return;
  }

  if (!CONFIG.adminPassword) {
    CONFIG.adminPassword = Math.random().toString(36).slice(2, 8);
  }

  // ---------------------------------------------------------------------------
  // 2) HARİTALAR
  // ---------------------------------------------------------------------------
  function buildFallbackStadium(n, w, h, gh, depth) {
    // Basit ama oynanabilir futsal sahası (scaled_maps.json yoksa kullanılır)
    var v = [], s = [];
    function V(x, y, t) { v.push({ x: x, y: y, trait: t }); return v.length - 1; }
    function S(a, b, t, c) { var o = { v0: a, v1: b, trait: t }; if (c) o.curve = c; s.push(o); }
    var c0 = V(-w, -h, "wall"), c1 = V(-w, -gh, "wall"), c2 = V(-w, gh, "wall"), c3 = V(-w, h, "wall");
    var c4 = V(w, -h, "wall"), c5 = V(w, -gh, "wall"), c6 = V(w, gh, "wall"), c7 = V(w, h, "wall");
    S(c0, c4, "wall"); S(c3, c7, "wall"); S(c0, c1, "wall"); S(c2, c3, "wall"); S(c4, c5, "wall"); S(c6, c7, "wall");
    var lt = V(-(w + depth), -gh, "net"), lb = V(-(w + depth), gh, "net");
    var rt = V(w + depth, -gh, "net"), rb = V(w + depth, gh, "net");
    S(c1, lt, "net"); S(lt, lb, "net"); S(lb, c2, "net");
    S(c5, rt, "net"); S(rt, rb, "net"); S(rb, c6, "net");
    var mt = V(0, -h, "line"), mb = V(0, h, "line"); S(mt, mb, "line");
    return {
      name: "⚡ Pro Futsal " + n + "v" + n,
      width: w + depth + 30, height: h + 30, spawnDistance: Math.round(w * 0.45),
      bg: { type: "hockey", width: w, height: h, kickOffRadius: Math.round(h * 0.33), cornerRadius: 0 },
      playerPhysics: { bCoef: 0, acceleration: 0.11, kickingAcceleration: 0.083 },
      ballPhysics: "disc0",
      vertexes: v, segments: s,
      goals: [{ p0: [-w, -gh], p1: [-w, gh], team: "red" }, { p0: [w, -gh], p1: [w, gh], team: "blue" }],
      discs: [
        { pos: [0, 0], cGroup: ["ball", "kick", "score"], radius: 6.4, color: "FFEA00", bCoef: 0.4, invMass: 1.5 },
        { pos: [-w, -gh], trait: "post" }, { pos: [-w, gh], trait: "post" },
        { pos: [w, -gh], trait: "post" }, { pos: [w, gh], trait: "post" }
      ],
      planes: [
        { normal: [0, 1], dist: -h, cMask: ["ball"] }, { normal: [0, -1], dist: -h, cMask: ["ball"] },
        { normal: [0, 1], dist: -(h + 30), bCoef: 0.1 }, { normal: [0, -1], dist: -(h + 30), bCoef: 0.1 },
        { normal: [1, 0], dist: -(w + depth + 30), bCoef: 0.1 }, { normal: [-1, 0], dist: -(w + depth + 30), bCoef: 0.1 }
      ],
      traits: {
        wall: { vis: true, bCoef: 1, cMask: ["ball"], color: "FFFFFF" },
        net: { vis: true, bCoef: 0.1, cMask: ["ball"], color: "DA4D4B" },
        line: { vis: true, cMask: [], color: "C7E6BD" },
        post: { radius: 5, invMass: 0, bCoef: 0.5, color: "FFFFFF" }
      }
    };
  }

  var MAPS = {};
  (function loadMaps() {
    var ext = (typeof window !== "undefined" && window.__FUTSAL_MAPS) || null;
    var dims = { 1: [340, 160, 40, 20], 2: [450, 210, 54, 26], 3: [555, 260, 67, 30], 4: [660, 310, 79, 34], 5: [750, 350, 90, 38] };
    for (var n = 1; n <= 5; n++) {
      var obj = null;
      if (ext && ext[n]) {
        try { obj = typeof ext[n] === "string" ? JSON.parse(ext[n]) : ext[n]; } catch (e) { obj = null; }
      }
      if (!obj) obj = buildFallbackStadium(n, dims[n][0], dims[n][1], dims[n][2], dims[n][3]);
      var posts = [];
      (obj.goals || []).forEach(function (g) { posts.push({ x: g.p0[0], y: g.p0[1] }, { x: g.p1[0], y: g.p1[1] }); });
      MAPS[n] = { json: JSON.stringify(obj), name: obj.name, posts: posts };
    }
  })();

  // ---------------------------------------------------------------------------
  // 3) ODA
  // ---------------------------------------------------------------------------
  var roomOpts = {
    roomName: CONFIG.roomName,
    playerName: CONFIG.botName,
    maxPlayers: CONFIG.maxPlayers,
    public: CONFIG.public,
    noPlayer: true,
    token: CONFIG.token
  };
  if (CONFIG.password) roomOpts.password = CONFIG.password;
  if (CONFIG.geo) roomOpts.geo = CONFIG.geo;
  var room = HB(roomOpts);

  room.setScoreLimit(CONFIG.scoreLimit);
  room.setTimeLimit(CONFIG.timeLimit);
  room.setTeamsLock(true);
  try {
    room.setTeamColors(1, 60, 0xFFFFFF, [0xE53935, 0xC62828, 0xB71C1C]);
    room.setTeamColors(2, 60, 0xFFFFFF, [0x1E88E5, 0x1565C0, 0x0D47A1]);
  } catch (e) {}

  // ---------------------------------------------------------------------------
  // 4) DURUM
  // ---------------------------------------------------------------------------
  var RED = 1, BLUE = 2, SPEC = 0;
  var COLORS = { info: 0x7DD3FC, ok: 0x4ADE80, err: 0xF87171, gold: 0xFACC15, red: 0xEF5350, blue: 0x42A5F5, mute: 0x94A3B8 };

  var info = {};          // id -> { auth, conn, name, joinedAt, lastActive, afkWarned, msgTimes[], mutedUntil, afk }
  var queue = [];         // spectator ids waiting to play (FIFO)
  var currentTier = 0;
  var gameRunning = false;
  var gamePaused = false;
  var touches = [];       // last ball touches: { id, team, t }
  var matchGoals = {};    // id -> goals this match (hat-trick)
  var matchAssists = {};
  var lastBall = null;    // { x, y, xs, ys }
  var lastPostAt = 0;
  var lastGoalAt = 0;
  var goalKickSpeed = 0;
  var tickCount = 0;
  var pendingLoserTeam = 0;   // set on victory, consumed when the game stops

  var STATS_KEY = "profutsal_stats_v1";
  var BANS_KEY = "profutsal_bans_v1";
  var stats = loadJSON(STATS_KEY, {});
  var bans = loadJSON(BANS_KEY, { auth: {}, conn: {}, name: {} });

  function loadJSON(key, def) {
    try { var raw = localStorage.getItem(key); if (raw) return JSON.parse(raw); } catch (e) {}
    return def;
  }
  var saveTimer = null;
  function saveStatsSoon() {
    if (saveTimer) return;
    saveTimer = setTimeout(function () {
      saveTimer = null;
      try { localStorage.setItem(STATS_KEY, JSON.stringify(stats)); } catch (e) {}
    }, 2000);
  }
  function saveBans() { try { localStorage.setItem(BANS_KEY, JSON.stringify(bans)); } catch (e) {} }

  // ---------------------------------------------------------------------------
  // 5) YARDIMCILAR
  // ---------------------------------------------------------------------------
  function say(msg, target, color, style, sound) {
    room.sendAnnouncement(msg, target == null ? null : target, color == null ? 0xFFFFFF : color, style || "normal", sound == null ? 1 : sound);
  }
  function sayInfo(m, t) { say("ℹ️ " + m, t, COLORS.info); }
  function sayOk(m, t) { say("✅ " + m, t, COLORS.ok, "bold"); }
  function sayErr(m, t) { say("❌ " + m, t, COLORS.err, "italic"); }
  function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
  function teamName(t) { return t === RED ? "🔴 Kırmızı" : (t === BLUE ? "🔵 Mavi" : "⚪ İzleyici"); }
  function humans() { return room.getPlayerList().filter(function (p) { return p.id !== 0; }); }
  function teamOf(t) { return humans().filter(function (p) { return p.team === t; }); }
  function isAdmin(p) { return !!(p && p.admin); }

  function statKey(id) {
    var i = info[id];
    return i ? (i.auth || ("name:" + i.name.toLowerCase())) : null;
  }
  function getStats(id) {
    var k = statKey(id);
    if (!k) return null;
    if (!stats[k]) stats[k] = { name: "", goals: 0, assists: 0, ownGoals: 0, wins: 0, losses: 0, matches: 0, mvps: 0, cleanSheets: 0 };
    stats[k].name = info[id].name;
    return stats[k];
  }

  function findPlayer(arg) {
    if (!arg) return null;
    var s = String(arg).replace(/^[#@]/, "").trim();
    var byId = /^\d+$/.test(s) ? room.getPlayer(parseInt(s, 10)) : null;
    if (byId) return byId;
    var low = s.toLowerCase();
    var list = humans();
    var exact = list.filter(function (p) { return p.name.toLowerCase() === low; });
    if (exact.length) return exact[0];
    var part = list.filter(function (p) { return p.name.toLowerCase().indexOf(low) !== -1; });
    return part.length === 1 ? part[0] : null;
  }

  // ---------------------------------------------------------------------------
  // 6) TAKIM / SIRA YÖNETİMİ
  // ---------------------------------------------------------------------------
  function activeIds() {
    return humans().filter(function (p) { return info[p.id] && !info[p.id].afk; }).map(function (p) { return p.id; });
  }
  function removeFromQueue(id) {
    var i = queue.indexOf(id);
    if (i !== -1) queue.splice(i, 1);
  }
  function enqueue(id) {
    if (queue.indexOf(id) === -1) queue.push(id);
  }
  function syncQueue() {
    // queue = spectators that are not AFK, preserving order
    var specs = humans().filter(function (p) { return p.team === SPEC && info[p.id] && !info[p.id].afk; }).map(function (p) { return p.id; });
    queue = queue.filter(function (id) { return specs.indexOf(id) !== -1; });
    specs.forEach(enqueue);
  }
  function tierFor(count) {
    return Math.max(1, Math.min(CONFIG.maxPerTeam, Math.floor(count / 2)));
  }

  function setTier(tier) {
    if (tier === currentTier) return false;
    currentTier = tier;
    room.setCustomStadium(MAPS[tier].json);
    say("🏟️ Saha: " + MAPS[tier].name, null, COLORS.gold, "bold", 0);
    return true;
  }

  function fillTeams(perTeam) {
    syncQueue();
    var red = teamOf(RED), blue = teamOf(BLUE);
    // Too many players on a team (tier shrank): send the latest additions back to the queue front
    while (red.length > perTeam) { var r = red.pop(); room.setPlayerTeam(r.id, SPEC); queue.unshift(r.id); }
    while (blue.length > perTeam) { var b = blue.pop(); room.setPlayerTeam(b.id, SPEC); queue.unshift(b.id); }
    while ((red.length < perTeam || blue.length < perTeam) && queue.length) {
      var id = queue.shift();
      var target = red.length <= blue.length ? RED : BLUE;
      if (target === RED && red.length >= perTeam) target = BLUE;
      if (target === BLUE && blue.length >= perTeam) target = RED;
      room.setPlayerTeam(id, target);
      (target === RED ? red : blue).push({ id: id });
    }
    return { red: red.length, blue: blue.length };
  }

  var balanceTimer = null;
  function scheduleBalance(delay) {
    clearTimeout(balanceTimer);
    balanceTimer = setTimeout(balance, delay == null ? 600 : delay);
  }

  function balance() {
    var ids = activeIds();
    var scores = room.getScores();

    if (ids.length === 0) { if (scores) room.stopGame(); return; }

    if (ids.length === 1) {
      if (scores) room.stopGame();
      setTier(1);
      var only = room.getPlayer(ids[0]);
      if (only && only.team === SPEC) room.setPlayerTeam(only.id, RED);
      sayInfo("Rakip bekleniyor... Bir oyuncu daha gelince maç başlayacak.");
      return;
    }

    var tier = tierFor(ids.length);

    if (scores) {
      // Game running: only patch holes; resize only right at the start of a goalless match
      var early = scores.red === 0 && scores.blue === 0 && scores.time < 15;
      if (tier !== currentTier && early) {
        room.stopGame();
        setTier(tier);
        fillTeams(tier);
        room.startGame();
        return;
      }
      var res = fillTeams(currentTier);
      if (res.red === 0 || res.blue === 0) {
        room.stopGame();
        setTier(tier);
        fillTeams(tier);
        room.startGame();
      }
      return;
    }

    setTier(tier);
    var r = fillTeams(tier);
    if (r.red > 0 && r.blue > 0) {
      room.startGame();
    }
  }

  function announceQueue(target) {
    syncQueue();
    if (!queue.length) { sayInfo("Sırada bekleyen yok.", target); return; }
    var names = queue.slice(0, 8).map(function (id, i) { var p = room.getPlayer(id); return (i + 1) + ". " + (p ? p.name : "?"); });
    sayInfo("📋 Sıra: " + names.join("  ") + (queue.length > 8 ? "  (+" + (queue.length - 8) + ")" : ""), target);
  }

  // ---------------------------------------------------------------------------
  // 7) ADMIN DEVRİ
  // ---------------------------------------------------------------------------
  function ensureAdmin() {
    var list = humans();
    if (!list.length) return;
    if (list.some(function (p) { return p.admin; })) return;
    list.sort(function (a, b) { return (info[a.id] ? info[a.id].joinedAt : 0) - (info[b.id] ? info[b.id].joinedAt : 0); });
    room.setPlayerAdmin(list[0].id, true);
    sayOk(list[0].name + " odadaki en eski oyuncu olarak admin oldu.", null);
  }

  // ---------------------------------------------------------------------------
  // 8) YORUMLAR (temiz, eğlenceli)
  // ---------------------------------------------------------------------------
  var GOAL_LINES = [
    "Ağlar havalandı! 🎯", "Kaleci sadece izledi! 👀", "Tam doksana! 💥",
    "Füze gibi şut! 🚀", "Bu golü tekrar tekrar izlemek lazım! 🔁",
    "Kaleci yanlış köşeye uçtu! 🧤", "Sahne onun! 🌟", "Klas bir bitiriş! 🎩",
    "Defans nerede?! 🙈", "Tribünler ayakta! 📣"
  ];
  var OWN_GOAL_LINES = [
    "Ters yöne koştu! 🙃", "Pusula bozuldu! 🧭", "Rakibe hediye paketi! 🎁",
    "Bunu kimse görmesin... 🫣", "Kale yanlış tarafta mıydı? 🤔"
  ];
  var POST_LINES = [
    "DİREK! 😱 Kıl payı!", "Direkten döndü! 🥅", "Direk 'hayır' dedi! 🚫",
    "Tahta kurtardı! 🪵", "Santim santim! 📏"
  ];
  var WIN_LINES = ["Şampiyon edası! 🏆", "Rakibe şans tanımadılar! 💪", "Takım oyunu kazandı! 🤝", "Gecenin galibi! 🌙"];

  // ---------------------------------------------------------------------------
  // 9) OLAYLAR
  // ---------------------------------------------------------------------------
  room.onRoomLink = function (url) {
    console.log("%c==========================================", "color:#4ADE80;font-weight:bold");
    console.log("%c⚡ PRO FUTSAL ODASI AÇILDI ⚡", "color:#7DD3FC;font-size:16px;font-weight:bold");
    console.log("%cOda Linki: " + url, "color:#FACC15;font-size:15px;font-weight:bold");
    console.log("%cAdmin Şifresi: " + CONFIG.adminPassword + "  (oyunda: !admin " + CONFIG.adminPassword + ")", "color:#F87171;font-weight:bold");
    console.log("%c==========================================", "color:#4ADE80;font-weight:bold");
    setTier(1);
  };

  room.onPlayerJoin = function (p) {
    var lowName = p.name.toLowerCase();
    if (bans.auth[p.auth] || bans.conn[p.conn] || bans.name[lowName]) {
      room.kickPlayer(p.id, "🚫 Bu odadan yasaklandınız.", false);
      return;
    }
    // Same account twice
    for (var id in info) {
      if (p.auth && info[id].auth === p.auth) {
        room.kickPlayer(p.id, "Bu hesap zaten odada.", false);
        return;
      }
    }
    var now = Date.now();
    info[p.id] = { auth: p.auth, conn: p.conn, name: p.name, joinedAt: now, lastActive: now, afkWarned: false, msgTimes: [], mutedUntil: 0, afk: false };
    enqueue(p.id);

    var st = getStats(p.id);
    var hello = st && st.matches > 0
      ? "Tekrar hoş geldin " + p.name + "! ⚽ " + st.goals + " gol, " + st.wins + " galibiyet."
      : "Hoş geldin " + p.name + "! Komutlar için !yardim yaz.";
    say("👋 " + hello, p.id, COLORS.ok, "bold");
    if (CONFIG.welcomeExtra) say(CONFIG.welcomeExtra, p.id, COLORS.info);

    ensureAdmin();
    scheduleBalance(800);
  };

  room.onPlayerLeave = function (p) {
    delete info[p.id];
    removeFromQueue(p.id);
    ensureAdmin();
    scheduleBalance(500);
  };

  room.onPlayerAdminChange = function () { setTimeout(ensureAdmin, 100); };

  room.onPlayerTeamChange = function (p) {
    if (!p || p.id === 0) return;
    if (p.team !== SPEC) removeFromQueue(p.id);
    else if (info[p.id] && !info[p.id].afk) enqueue(p.id);
    if (info[p.id]) { info[p.id].lastActive = Date.now(); info[p.id].afkWarned = false; }
  };

  room.onPlayerActivity = function (p) {
    var i = info[p.id];
    if (i) { i.lastActive = Date.now(); i.afkWarned = false; }
  };

  room.onPlayerBallKick = function (p) { registerTouch(p); };

  function registerTouch(p) {
    var now = Date.now();
    var last = touches[0];
    if (last && last.id === p.id) { last.t = now; return; }
    touches.unshift({ id: p.id, team: p.team, name: p.name, t: now });
    if (touches.length > 4) touches.pop();
  }

  room.onGameStart = function () {
    gameRunning = true; gamePaused = false;
    touches = []; matchGoals = {}; matchAssists = {}; lastBall = null;
    var now = Date.now();
    for (var id in info) { info[id].lastActive = now; info[id].afkWarned = false; }
    var r = teamOf(RED).length, b = teamOf(BLUE).length;
    say("🏁 Maç başladı! " + r + "v" + b + " • " + CONFIG.scoreLimit + " gol / " + CONFIG.timeLimit + " dk", null, COLORS.gold, "bold", 1);
  };
  room.onGameStop = function () {
    gameRunning = false; gamePaused = false;
    if (pendingLoserTeam) {
      rotateLosers(pendingLoserTeam);
      pendingLoserTeam = 0;
      scheduleBalance(1500);
    } else {
      scheduleBalance(1200);
    }
  };
  room.onGamePause = function () { gamePaused = true; };
  room.onGameUnpause = function () {
    gamePaused = false;
    var now = Date.now();
    for (var id in info) { info[id].lastActive = now; info[id].afkWarned = false; }
  };
  room.onPositionsReset = function () { touches = []; };

  // Physics tick: touch detection (dribbles too, not only kicks), post hits, AFK
  room.onGameTick = function () {
    tickCount++;
    var ball = room.getDiscProperties(0);
    if (!ball) return;
    var players = room.getPlayerList();
    var ballR = ball.radius || 6.4;

    // Touch detection by distance (every 2 ticks)
    if (tickCount % 2 === 0) {
      for (var i = 0; i < players.length; i++) {
        var p = players[i];
        if (p.team === SPEC || !p.position) continue;
        var dx = p.position.x - ball.x, dy = p.position.y - ball.y;
        if (dx * dx + dy * dy < Math.pow(ballR + 15 + 2, 2)) registerTouch(p);
      }
    }

    // Post detection: ball near a post and its velocity turns away from it
    var map = MAPS[currentTier];
    if (lastBall && map) {
      var now = Date.now();
      for (var k = 0; k < map.posts.length; k++) {
        var post = map.posts[k];
        var px = ball.x - post.x, py = ball.y - post.y;
        if (px * px + py * py > Math.pow(ballR + 5 + 4, 2)) continue;
        var before = lastBall.xs * px + lastBall.ys * py;
        var after = ball.xspeed * px + ball.yspeed * py;
        var speed = Math.sqrt(lastBall.xs * lastBall.xs + lastBall.ys * lastBall.ys);
        if (before < 0 && after > 0 && speed > 2.2 && now - lastPostAt > 2500) {
          lastPostAt = now;
          var postTarget = touches[0] ? touches[0].name + " • " : "";
          setTimeout(function (msg) {
            if (Date.now() - lastGoalAt > 600) say("🥅 " + msg, null, COLORS.gold, "bold", 1);
          }, 400, postTarget + pick(POST_LINES));
        }
      }
    }
    lastBall = { x: ball.x, y: ball.y, xs: ball.xspeed, ys: ball.yspeed };

    // AFK check once per second
    if (tickCount % 60 === 0 && !gamePaused) {
      var t = Date.now();
      for (var j = 0; j < players.length; j++) {
        var pl = players[j];
        if (pl.id === 0 || pl.team === SPEC || !info[pl.id]) continue;
        var idle = (t - info[pl.id].lastActive) / 1000;
        if (idle >= CONFIG.afkKickSeconds) {
          info[pl.id].afk = true;
          room.setPlayerTeam(pl.id, SPEC);
          removeFromQueue(pl.id);
          say("💤 " + pl.name + " hareketsiz kaldığı için izleyiciye alındı. Dönmek için !geri yaz.", null, COLORS.mute);
          scheduleBalance(300);
        } else if (idle >= CONFIG.afkWarnSeconds && !info[pl.id].afkWarned) {
          info[pl.id].afkWarned = true;
          say("⏰ " + pl.name + ", hareket et yoksa " + Math.round(CONFIG.afkKickSeconds - idle) + " sn içinde izleyiciye alınacaksın!", pl.id, COLORS.err, "bold", 2);
        }
      }
    }
  };

  room.onTeamGoal = function (team) {
    lastGoalAt = Date.now();
    var speed = lastBall ? Math.sqrt(lastBall.xs * lastBall.xs + lastBall.ys * lastBall.ys) : 0;
    var kmh = Math.round(speed * 9.2);
    var scorer = touches[0];
    var assist = touches[1] || null; // the previous distinct toucher (touches never repeat consecutively)

    if (!scorer) {
      say("⚽ GOL! " + teamName(team), null, team === RED ? COLORS.red : COLORS.blue, "bold", 2);
      touches = [];
      return;
    }

    var st = getStats(scorer.id);
    if (scorer.team === team) {
      if (st) st.goals++;
      matchGoals[scorer.id] = (matchGoals[scorer.id] || 0) + 1;
      var msg = "⚽ GOOOL! " + scorer.name + " (" + teamName(team) + ")";
      if (assist && assist.team === team) {
        var ast = getStats(assist.id);
        if (ast) ast.assists++;
        matchAssists[assist.id] = (matchAssists[assist.id] || 0) + 1;
        msg += "  🅰️ " + assist.name;
      }
      if (kmh > 0) msg += "  💨 " + kmh + " km/s";
      say(msg, null, team === RED ? COLORS.red : COLORS.blue, "bold", 2);
      say("🎙️ " + pick(GOAL_LINES), null, COLORS.gold, "normal", 0);
      if (matchGoals[scorer.id] === 3) say("🎩 HAT-TRICK! " + scorer.name + " bu maç 3. golünü attı!", null, COLORS.gold, "bold", 2);
      celebrate(scorer.id, matchGoals[scorer.id] >= 3 ? "🎩" : "⚽");
    } else {
      if (st) st.ownGoals++;
      say("🙃 Kendi kalesine! " + scorer.name + " → " + teamName(team) + " hanesine gol", null, COLORS.err, "bold", 2);
      say("🎙️ " + pick(OWN_GOAL_LINES), null, COLORS.mute, "normal", 0);
      celebrate(scorer.id, "🙈");
    }
    saveStatsSoon();
    touches = [];
  };

  function celebrate(id, avatar) {
    try {
      room.setPlayerAvatar(id, avatar);
      setTimeout(function () { try { room.setPlayerAvatar(id, null); } catch (e) {} }, 3000);
    } catch (e) {}
  }

  room.onTeamVictory = function (scores) {
    var win = scores.red > scores.blue ? RED : BLUE;
    var lose = win === RED ? BLUE : RED;
    say("🏆 MAÇ BİTTİ! " + teamName(win) + " kazandı  (" + scores.red + " - " + scores.blue + ")", null, COLORS.gold, "bold", 2);
    say("🎙️ " + pick(WIN_LINES), null, COLORS.gold, "normal", 0);

    var playersNow = humans();
    var mvp = null, mvpScore = -1;
    playersNow.forEach(function (p) {
      if (p.team !== RED && p.team !== BLUE) return;
      var st = getStats(p.id);
      if (!st) return;
      st.matches++;
      if (p.team === win) st.wins++; else st.losses++;
      var conceded = p.team === RED ? scores.blue : scores.red;
      if (conceded === 0) st.cleanSheets++;
      var sc = (matchGoals[p.id] || 0) * 3 + (matchAssists[p.id] || 0) * 2 + (p.team === win ? 1 : 0);
      if (sc > mvpScore) { mvpScore = sc; mvp = p; }
    });
    if (mvp && mvpScore > 1) {
      var ms = getStats(mvp.id); if (ms) ms.mvps++;
      say("⭐ Maçın Oyuncusu: " + mvp.name + "  (" + (matchGoals[mvp.id] || 0) + " gol, " + (matchAssists[mvp.id] || 0) + " asist)", null, COLORS.gold, "bold", 1);
    }
    saveStatsSoon();

    // Winners stay, losers go to the END of the queue (done in onGameStop)
    pendingLoserTeam = lose;
    setTimeout(function () { if (room.getScores()) room.stopGame(); }, 3000);
  };

  function rotateLosers(lose) {
    // Only rotate when someone is actually waiting; otherwise keep teams for a rematch
    syncQueue();
    if (!queue.length) return;
    var losers = teamOf(lose);
    losers.forEach(function (p) { room.setPlayerTeam(p.id, SPEC); });
    // onPlayerTeamChange enqueued them at the end already; make sure they are behind earlier waiters
    losers.forEach(function (p) { removeFromQueue(p.id); });
    losers.forEach(function (p) { if (info[p.id] && !info[p.id].afk) enqueue(p.id); });
  }

  // ---------------------------------------------------------------------------
  // 10) SOHBET & KOMUTLAR
  // ---------------------------------------------------------------------------
  function isSpamming(p) {
    var i = info[p.id];
    if (!i) return false;
    var now = Date.now();
    if (i.mutedUntil > now) return true;
    i.msgTimes.push(now);
    i.msgTimes = i.msgTimes.filter(function (t) { return now - t < CONFIG.spamWindowMs; });
    if (i.msgTimes.length > CONFIG.spamMessages) {
      i.mutedUntil = now + CONFIG.spamMuteSeconds * 1000;
      i.msgTimes = [];
      say("🔇 Çok hızlı yazıyorsun, " + CONFIG.spamMuteSeconds + " sn susturuldun.", p.id, COLORS.err, "bold", 2);
      return true;
    }
    return false;
  }

  var COMMANDS = {
    yardim: { help: "Komut listesi", run: function (p) {
      sayInfo("Oyuncu: !stats [isim]  !top  !sira  !afk  !geri  !admin <şifre>  !bb", p.id);
      if (isAdmin(p)) sayInfo("Admin: !start !stop !rr !pause !swap !harita <1-5> !skor <n> !sure <dk> !kick <isim/#id> !ban <isim/#id> !unban <isim> !mute <isim> !unmute <isim> !lock !unlock !duyuru <mesaj>", p.id);
    } },
    stats: { run: function (p, args) {
      var target = args[0] ? findPlayer(args.join(" ")) : p;
      if (!target) { sayErr("Oyuncu bulunamadı.", p.id); return; }
      var s = getStats(target.id);
      if (!s) return;
      var ratio = s.matches ? Math.round(100 * s.wins / s.matches) : 0;
      sayInfo("📊 " + target.name + " • Maç " + s.matches + " • G/M " + s.wins + "/" + s.losses + " (%" + ratio + ") • ⚽ " + s.goals + " • 🅰️ " + s.assists + " • ⭐ " + s.mvps + " • 🧤 " + s.cleanSheets + " • 🙃 " + s.ownGoals, p.id);
    } },
    top: { run: function (p, args) {
      var field = ({ asist: "assists", galibiyet: "wins", mvp: "mvps" })[(args[0] || "").toLowerCase()] || "goals";
      var list = Object.keys(stats).map(function (k) { return stats[k]; }).filter(function (s) { return s.matches > 0; });
      list.sort(function (a, b) { return b[field] - a[field]; });
      var label = { goals: "⚽ Gol", assists: "🅰️ Asist", wins: "🏆 Galibiyet", mvps: "⭐ MVP" }[field];
      if (!list.length) { sayInfo("Henüz istatistik yok.", p.id); return; }
      sayInfo("🏅 Top 5 (" + label + "): " + list.slice(0, 5).map(function (s, i) { return (i + 1) + ". " + s.name + " " + s[field]; }).join("  "), p.id);
      sayInfo("Diğer sıralamalar: !top asist  !top galibiyet  !top mvp", p.id);
    } },
    sira: { run: function (p) { announceQueue(p.id); } },
    afk: { run: function (p) {
      var i = info[p.id]; if (!i) return;
      i.afk = true;
      removeFromQueue(p.id);
      if (p.team !== SPEC) room.setPlayerTeam(p.id, SPEC);
      say("💤 " + p.name + " AFK oldu.", null, COLORS.mute);
      scheduleBalance(300);
    } },
    geri: { run: function (p) {
      var i = info[p.id]; if (!i) return;
      if (!i.afk) { sayInfo("Zaten oyundasın / sıradasın.", p.id); return; }
      i.afk = false; i.lastActive = Date.now(); i.afkWarned = false;
      enqueue(p.id);
      sayOk("Tekrar sıradasın (#" + (queue.indexOf(p.id) + 1) + ").", p.id);
      scheduleBalance(300);
    } },
    bb: { run: function (p) { room.kickPlayer(p.id, "Görüşmek üzere! 👋", false); } },
    admin: { run: function (p, args) {
      if (args[0] && args[0] === CONFIG.adminPassword) { room.setPlayerAdmin(p.id, true); sayOk("Admin yetkisi verildi.", p.id); }
      else sayErr("Yanlış şifre.", p.id);
    } },

    // --- admin ---
    start: { admin: true, run: function () { if (!room.getScores()) balance(); } },
    stop: { admin: true, run: function () { room.stopGame(); } },
    rr: { admin: true, run: function () { room.stopGame(); setTimeout(function () { room.startGame(); }, 300); } },
    pause: { admin: true, run: function () { room.pauseGame(!gamePaused); } },
    swap: { admin: true, run: function () {
      if (room.getScores()) { sayErr("Önce maçı durdurun (!stop).", null); return; }
      humans().forEach(function (p) { if (p.team === RED) room.setPlayerTeam(p.id, BLUE); else if (p.team === BLUE) room.setPlayerTeam(p.id, RED); });
      sayOk("Takımlar yer değiştirdi.");
    } },
    harita: { admin: true, run: function (p, args) {
      var t = parseInt(args[0], 10);
      if (!(t >= 1 && t <= 5)) { sayErr("Kullanım: !harita 1-5", p.id); return; }
      room.stopGame(); currentTier = 0; setTier(t); fillTeams(t); room.startGame();
    } },
    skor: { admin: true, run: function (p, args) {
      var n = parseInt(args[0], 10);
      if (!(n >= 0 && n <= 14)) { sayErr("Kullanım: !skor 0-14", p.id); return; }
      if (room.getScores()) { sayErr("Maç sırasında değiştirilemez.", p.id); return; }
      CONFIG.scoreLimit = n; room.setScoreLimit(n); sayOk("Gol limiti: " + n);
    } },
    sure: { admin: true, run: function (p, args) {
      var n = parseInt(args[0], 10);
      if (!(n >= 0 && n <= 14)) { sayErr("Kullanım: !sure 0-14", p.id); return; }
      if (room.getScores()) { sayErr("Maç sırasında değiştirilemez.", p.id); return; }
      CONFIG.timeLimit = n; room.setTimeLimit(n); sayOk("Süre limiti: " + n + " dk");
    } },
    kick: { admin: true, run: function (p, args) {
      var t = findPlayer(args[0]); if (!t) { sayErr("Oyuncu bulunamadı.", p.id); return; }
      room.kickPlayer(t.id, args.slice(1).join(" ") || "Odadan atıldınız.", false);
    } },
    ban: { admin: true, run: function (p, args) {
      var t = findPlayer(args[0]); if (!t) { sayErr("Oyuncu bulunamadı.", p.id); return; }
      var i = info[t.id];
      if (i) { if (i.auth) bans.auth[i.auth] = t.name; if (i.conn) bans.conn[i.conn] = t.name; }
      bans.name[t.name.toLowerCase()] = t.name;
      saveBans();
      room.kickPlayer(t.id, args.slice(1).join(" ") || "Yasaklandınız.", true);
    } },
    unban: { admin: true, run: function (p, args) {
      var q = args.join(" ").toLowerCase(); if (!q) { sayErr("Kullanım: !unban <isim>", p.id); return; }
      var n = 0;
      ["auth", "conn", "name"].forEach(function (k) {
        Object.keys(bans[k]).forEach(function (key) { if (String(bans[k][key]).toLowerCase() === q) { delete bans[k][key]; n++; } });
      });
      saveBans(); room.clearBans();
      sayOk(n ? q + " yasağı kaldırıldı." : "Bu isimde yasak bulunamadı.", p.id);
    } },
    mute: { admin: true, run: function (p, args) {
      var t = findPlayer(args[0]); if (!t || !info[t.id]) { sayErr("Oyuncu bulunamadı.", p.id); return; }
      var min = parseInt(args[1], 10) || 5;
      info[t.id].mutedUntil = Date.now() + min * 60000;
      sayOk(t.name + " " + min + " dk susturuldu.");
    } },
    unmute: { admin: true, run: function (p, args) {
      var t = findPlayer(args[0]); if (!t || !info[t.id]) { sayErr("Oyuncu bulunamadı.", p.id); return; }
      info[t.id].mutedUntil = 0; sayOk(t.name + " artık konuşabilir.");
    } },
    lock: { admin: true, run: function () { room.setTeamsLock(true); sayOk("Takımlar kilitlendi (sıra sistemi aktif)."); } },
    unlock: { admin: true, run: function () { room.setTeamsLock(false); sayOk("Takım kilidi açıldı."); } },
    duyuru: { admin: true, run: function (p, args) { if (args.length) say("📢 " + args.join(" "), null, COLORS.gold, "bold", 2); } }
  };
  var ALIASES = { help: "yardim", komutlar: "yardim", istatistik: "stats", s: "stats", queue: "sira", back: "geri", restart: "rr", r: "rr", p: "pause" };

  room.onPlayerChat = function (p, message) {
    var text = (message || "").trim();
    if (!text) return false;

    if (text.charAt(0) === "!") {
      var parts = text.slice(1).split(/\s+/);
      var name = parts[0].toLowerCase();
      name = ALIASES[name] || name;
      var cmd = COMMANDS[name];
      if (!cmd) { sayErr("Bilinmeyen komut. !yardim yaz.", p.id); return false; }
      if (cmd.admin && !isAdmin(p)) { sayErr("Bu komut için admin olmalısın.", p.id); return false; }
      try { cmd.run(p, parts.slice(1)); } catch (e) { console.error(e); }
      return false;
    }

    if (isSpamming(p)) return false;
    if (info[p.id]) { info[p.id].lastActive = Date.now(); }
    return true;
  };

  // Periodic tips
  var TIPS = [
    "💡 !stats ile istatistiklerine, !top ile liderlik tablosuna bakabilirsin.",
    "💡 Sıra sistemi: kazanan sahada kalır, kaybeden sıranın sonuna geçer. !sira",
    "💡 Mola mı? !afk yaz, dönünce !geri yaz.",
    "💡 Telefonda oynuyorsan mobil istemcideki joystick 'Akıllı 8 Yön' modunda tam hız koşar."
  ];
  var tipIdx = 0;
  setInterval(function () {
    if (humans().length) say(TIPS[tipIdx++ % TIPS.length], null, COLORS.mute, "small", 0);
  }, 4 * 60 * 1000);

  // Expose for debugging from the console
  window.__futsalRoom = room;
  console.log("[ProFutsal] Bot yüklendi. Oda açılıyor...");
})();
