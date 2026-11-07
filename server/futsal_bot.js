// =============================================================================
// ⚡ PRO FUTSAL — HaxBall Headless Oda Botu (v5.0 "Spiker")
// -----------------------------------------------------------------------------
// Otomatik:  python3 start_server.py
// Elle:      https://www.haxball.com/headless → F12 → Console → CONFIG.token'ı
//            doldurup bu dosyanın tamamını yapıştır.
//
//  • Bot odada İZLEYİCİ olarak durur; tüm mesajlar bot konuşuyormuş gibi renkli
//  • Maç hiç beklemez: 1 kişi bile olsa başlar, bitince anında yenisi başlar
//  • Oyuncu sayısına göre 1v1 → 5v5 saha
//  • Gerçek fizik tabanlı olay algılama: şut, isabetli şut, kurtarış, direk,
//    az farkla dışarı, pas, uzun pas, top kapma, gol, asist, kendi kalesine
//  • Canlı spiker anlatımı (argo modu açık/kapalı), topa sahip olma yüzdesi,
//    maç sonu istatistikleri, MVP, kalıcı istatistik ve liderlik tablosu
//  • Saha üstünde canlı gösterge: oyuncu avatarları (gol sayısı, 🧤, 😱 ...)
// =============================================================================
(function () {
  "use strict";

  // ---------------------------------------------------------------------------
  // 0) AYARLAR  (start_server.py → window.__FUTSAL_CONFIG ile ezilir)
  // ---------------------------------------------------------------------------
  var CONFIG = Object.assign({
    roomName: "⚡ Pro Futsal 1v1-5v5 | Canlı Spiker",
    botName: "🎙️ Spiker",
    maxPlayers: 16,
    public: true,
    password: null,
    token: "BURAYA_TOKEN_YAPISTIRIN",
    geo: null,
    adminPassword: "",       // boş = her açılışta rastgele
    scoreLimit: 3,
    timeLimit: 3,
    maxPerTeam: 5,
    argo: true,              // false = temiz anlatım
    afkWarnSeconds: 12,
    afkKickSeconds: 20,
    spamMessages: 5,
    spamWindowMs: 4000,
    spamMuteSeconds: 20,
    welcomeExtra: ""
  }, (typeof window !== "undefined" && window.__FUTSAL_CONFIG) || {});

  var HB = (typeof HBInit !== "undefined") ? HBInit : (function () {
    var frames = document.querySelectorAll("iframe");
    for (var i = 0; i < frames.length; i++) {
      try { if (frames[i].contentWindow && frames[i].contentWindow.HBInit) return frames[i].contentWindow.HBInit; } catch (e) {}
    }
    return null;
  })();
  if (!HB) { console.error("❌ HBInit bulunamadı! Konsolda 'top' yerine headless iframe'ini seçin."); return; }
  if (!CONFIG.adminPassword) CONFIG.adminPassword = Math.random().toString(36).slice(2, 8);

  // ---------------------------------------------------------------------------
  // 1) HARİTALAR + GEOMETRİ (kale çizgisi, direkler)
  // ---------------------------------------------------------------------------
  function buildFallbackStadium(n, w, h, gh, depth) {
    var v = [], s = [];
    function V(x, y, t) { v.push({ x: x, y: y, trait: t }); return v.length - 1; }
    function S(a, b, t) { s.push({ v0: a, v1: b, trait: t }); }
    var c0 = V(-w, -h, "wall"), c1 = V(-w, -gh, "wall"), c2 = V(-w, gh, "wall"), c3 = V(-w, h, "wall");
    var c4 = V(w, -h, "wall"), c5 = V(w, -gh, "wall"), c6 = V(w, gh, "wall"), c7 = V(w, h, "wall");
    S(c0, c4, "wall"); S(c3, c7, "wall"); S(c0, c1, "wall"); S(c2, c3, "wall"); S(c4, c5, "wall"); S(c6, c7, "wall");
    var lt = V(-(w + depth), -gh, "net"), lb = V(-(w + depth), gh, "net"), rt = V(w + depth, -gh, "net"), rb = V(w + depth, gh, "net");
    S(c1, lt, "net"); S(lt, lb, "net"); S(lb, c2, "net"); S(c5, rt, "net"); S(rt, rb, "net"); S(rb, c6, "net");
    var mt = V(0, -h, "line"), mb = V(0, h, "line"); S(mt, mb, "line");
    return {
      name: "⚡ Pro Futsal " + n + "v" + n, width: w + depth + 30, height: h + 30, spawnDistance: Math.round(w * 0.45),
      bg: { type: "hockey", width: w, height: h, kickOffRadius: Math.round(h * 0.33), cornerRadius: 0 },
      playerPhysics: { bCoef: 0, acceleration: 0.11, kickingAcceleration: 0.083 }, ballPhysics: "disc0",
      vertexes: v, segments: s,
      goals: [{ p0: [-w, -gh], p1: [-w, gh], team: "red" }, { p0: [w, -gh], p1: [w, gh], team: "blue" }],
      discs: [{ pos: [0, 0], cGroup: ["ball", "kick", "score"], radius: 6.4, color: "FFEA00", bCoef: 0.4, invMass: 1.5 },
        { pos: [-w, -gh], trait: "post" }, { pos: [-w, gh], trait: "post" }, { pos: [w, -gh], trait: "post" }, { pos: [w, gh], trait: "post" }],
      planes: [{ normal: [0, 1], dist: -h, cMask: ["ball"] }, { normal: [0, -1], dist: -h, cMask: ["ball"] },
        { normal: [0, 1], dist: -(h + 30), bCoef: 0.1 }, { normal: [0, -1], dist: -(h + 30), bCoef: 0.1 },
        { normal: [1, 0], dist: -(w + depth + 30), bCoef: 0.1 }, { normal: [-1, 0], dist: -(w + depth + 30), bCoef: 0.1 }],
      traits: { wall: { vis: true, bCoef: 1, cMask: ["ball"], color: "FFFFFF" }, net: { vis: true, bCoef: 0.1, cMask: ["ball"], color: "DA4D4B" },
        line: { vis: true, cMask: [], color: "C7E6BD" }, post: { radius: 5, invMass: 0, bCoef: 0.5, color: "FFFFFF" } }
    };
  }

  function analyzeStadium(obj) {
    // Goal geometry: red goal is on the left (x<0), blue on the right
    var geo = { goalX: 340, goalHalf: 40, posts: [] };
    (obj.goals || []).forEach(function (g) {
      if (g.team === "blue") {
        geo.goalX = Math.abs(g.p0[0]);
        geo.goalHalf = Math.abs(g.p0[1] - g.p1[1]) / 2;
      }
    });
    var traits = obj.traits || {};
    (obj.discs || []).forEach(function (d, idx) {
      if (idx === 0) return; // ball
      var t = d.trait ? (traits[d.trait] || {}) : {};
      var invMass = d.invMass != null ? d.invMass : t.invMass;
      var radius = d.radius != null ? d.radius : (t.radius != null ? t.radius : 10);
      if (invMass === 0 && d.pos && Math.abs(Math.abs(d.pos[0]) - geo.goalX) < 25) {
        geo.posts.push({ x: d.pos[0], y: d.pos[1], r: radius });
      }
    });
    if (!geo.posts.length) {
      [-1, 1].forEach(function (sx) { [-1, 1].forEach(function (sy) { geo.posts.push({ x: sx * geo.goalX, y: sy * geo.goalHalf, r: 5 }); }); });
    }
    return geo;
  }

  var MAPS = {};
  (function loadMaps() {
    var ext = (typeof window !== "undefined" && window.__FUTSAL_MAPS) || null;
    var dims = { 1: [340, 160, 40, 20], 2: [450, 210, 54, 26], 3: [555, 260, 67, 30], 4: [660, 310, 79, 34], 5: [750, 350, 90, 38] };
    for (var n = 1; n <= 5; n++) {
      var obj = null;
      if (ext && ext[n]) { try { obj = typeof ext[n] === "string" ? JSON.parse(ext[n]) : ext[n]; } catch (e) { obj = null; } }
      if (!obj) obj = buildFallbackStadium(n, dims[n][0], dims[n][1], dims[n][2], dims[n][3]);
      MAPS[n] = { json: JSON.stringify(obj), name: obj.name, geo: analyzeStadium(obj) };
    }
  })();

  // ---------------------------------------------------------------------------
  // 2) ODA
  // ---------------------------------------------------------------------------
  var roomOpts = { roomName: CONFIG.roomName, playerName: CONFIG.botName, maxPlayers: CONFIG.maxPlayers, public: CONFIG.public, noPlayer: false, token: CONFIG.token };
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

  var RED = 1, BLUE = 2, SPEC = 0, BOT_ID = 0;
  var C = {
    info: 0x7DD3FC, ok: 0x4ADE80, err: 0xF87171, gold: 0xFACC15, red: 0xFF5A52, blue: 0x4FA8FF,
    mute: 0x94A3B8, post: 0xFB923C, save: 0x34D399, shot: 0xE879F9, pass: 0xA5B4FC, big: 0xFDE047
  };

  // ---------------------------------------------------------------------------
  // 3) SPİKER — bütün mesajlar botun ağzından, renkli
  // ---------------------------------------------------------------------------
  function say(msg, target, color, style, sound) {
    room.sendAnnouncement(CONFIG.botName + ": " + msg, target == null ? null : target, color == null ? 0xFFFFFF : color, style || "normal", sound == null ? 1 : sound);
  }
  function sayInfo(m, t) { say(m, t, C.info); }
  function sayOk(m, t) { say("✅ " + m, t, C.ok, "bold"); }
  function sayErr(m, t) { say("❌ " + m, t, C.err, "italic", t == null ? 1 : 2); }
  function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
  function fill(tpl, vars) { return tpl.replace(/\{(\w+)\}/g, function (_, k) { return vars[k] != null ? vars[k] : ""; }); }
  function line(key, vars) {
    var pool = (CONFIG.argo && LINES_ARGO[key] && Math.random() < 0.75) ? LINES_ARGO[key] : (LINES[key] || []);
    return pool.length ? fill(pick(pool), vars || {}) : "";
  }

  // Minor commentary is rate limited so chat never floods; big events always pass
  var lastMinorAt = 0;
  function comment(msg, color, minor) {
    var now = Date.now();
    if (minor && now - lastMinorAt < 2800) return;
    if (minor) lastMinorAt = now;
    say(msg, null, color, minor ? "normal" : "bold", minor ? 0 : 1);
  }

  var LINES = {
    goal: ["{p} ağları havalandırdı! ⚽", "{p} affetmedi! 🎯", "Ve gol! {p} sahneye çıktı! 🌟", "{p} topu filelerle buluşturdu! 🥅", "Klas bitiriş, imza {p}! ✍️"],
    goalLong: ["{p} uzaktan füzeyi çaktı! 🚀 {d} metreden!", "Bu mesafeden mi?! {p} kaleciyi seyirci yaptı! 🔭"],
    goalPower: ["{kmh} km/s! {p} topu patlattı! 💥", "{p} öyle bir vurdu ki ağlar hâlâ sallanıyor! {kmh} km/s 🔥"],
    goalTeam: ["{n} paslık harika bir organizasyon! 🤝", "Pas pas pas... ve gol! {n} pas üst üste! 🎼"],
    ownGoal: ["{p} kendi kalesine attı! 🙃", "{p} pusulayı kaybetti, kendi ağlarına! 🧭", "{p} rakibe hediye paketi yolladı! 🎁"],
    post: ["DİREK! {p} direğe nişan aldı! 😱", "{p} vurdu, direk dedi ki 'geçemezsin'! 🥅", "Tahta kurtardı! {p} santim farkla! 📏"],
    save: ["{k} çıkardı! Harika kurtarış! 🧤", "{k} kalede duvar gibi! {p}'in şutu boşa gitti 🧱", "Ne kurtarış! {k} uçtu! 🦅"],
    miss: ["{p} az farkla auta! 😬", "{p} çok yakındı, yandan dışarı! 🙈", "{p}'in şutu direği yalayarak çıktı! 💨"],
    shot: ["{p} vurdu... 🎯", "{p} şansını denedi! ⚡", "{p} kaleyi yokladı! 🔫"],
    longPass: ["{a} → {b}, ölçülü uzun pas! 🎯", "{a}'dan {b}'ye harika bir uzun top! 📐"],
    steal: ["{b}, {a}'nın ayağından topu aldı! 🦊", "{b} araya girdi! {a} kaptırdı 🧲"],
    kickoff: ["Hakem düdüğü çaldı, maç başladı! 🏁", "Top ortada, start verildi! ⏱️"],
    last30: ["Son 30 saniye! ⏳ Skor {r} - {b}", "Zaman daralıyor, son yarım dakika! ⌛"],
    win: ["{t} kazandı! 🏆", "Maç bitti, gülen taraf {t}! 🎉"],
    hattrick: ["HAT-TRICK! {p} bu maç 3. golü attı! 🎩🎩🎩"],
    lose: ["{t} bu maçı unutsun. 😔"]
  };
  // Kaba argo, cinsellik/anne-bacı küfürleri yok
  var LINES_ARGO = {
    goal: ["OHAAA {p} SOKTU LAN! ⚽", "{p} AFFETMEDİ AMK! 🎯", "{p} topu ağlara gömdü, defans uyuyor mu lan?! 😤", "GOOOL! {p} kaleciyi yerden yere vurdu amk! 💥", "{p} attı, defans kafayı yedi! 🤯"],
    goalLong: ["{d} METREDEN AMK! {p} füzeyi yolladı! 🚀", "{p} oradan mı attı lan?! Kaleci uyuyor herhalde! 😴"],
    goalPower: ["{kmh} km/s AMK! {p} topu patlattı! 💥", "{p} öyle bir vurdu ki ağ yırtıldı lan! {kmh} km/s 🔥"],
    goalTeam: ["{n} paslık şov, rakip defans resmen seyirci amk! 🍿", "Pas pas gol! {n} pas, rakipler top görmedi lan! 🎼"],
    ownGoal: ["{p} KENDİ KALESİNE ATTI AMK! 🤦", "{p} hangi takımdasın lan sen?! 🙃", "Helal olsun {p}, rakibe gol yazdırdın amk! 🎁", "{p} ayağın ters mi takılı lan?! 🦶"],
    post: ["DİREK AMK! {p} direği titretti! 😱", "{p} direğe çaktı lan, ses buraya geldi! 🔔", "Hassiktir direk! {p} şanssız! 🥅"],
    save: ["{k} ÇIKARDI AMK! Adam kale değil duvar! 🧱", "{k} uçtu lan! {p} kafayı yiyecek! 🧤", "Oha {k}, bu topu nasıl çıkardın lan?! 🦅"],
    miss: ["{p} kör müsün lan, kale orada! 🙈", "{p} az farkla dışarı, yazık amk! 😬", "{p} topu seyirciye yolladı lan! 🏟️"],
    shot: ["{p} vurdu amk! 🎯", "{p} sıktı! ⚡", "{p} kaleyi yokladı lan! 🔫"],
    longPass: ["{a} → {b}, cetvelle çizilmiş pas amk! 📐", "{a}'dan {b}'ye uzun top, maşallah lan! 🎯"],
    steal: ["{b} topu {a}'nın ayağından söktü aldı amk! 🦊", "{a} uyudu, {b} kaptı lan! 🧲", "{a} topu kaptırdı, ayı mısın lan! 🐻"],
    kickoff: ["Düdük çaldı, hadi bakalım kim rezil olacak amk! 🏁", "Başladık lan! Kimse odun gibi durmasın! ⏱️"],
    last30: ["SON 30 SANİYE LAN! ⏳ {r} - {b}, koşun amk!", "Zaman bitiyor, uyanın lan! ⌛ {r} - {b}"],
    win: ["{t} rakibini ezdi geçti amk! 🏆", "{t} kazandı, kaybedenler ağlamasın lan! 🎉"],
    hattrick: ["HAT-TRICK AMK! {p} bu maç 3 tane soktu! 🎩🎩🎩", "{p} doymuyor lan, 3. gol! 🎩"],
    lose: ["{t} rezil oldu amk, gidin antrenman yapın! 😂", "{t}, bu ne biçim oyun lan! 🤦"]
  };

  // ---------------------------------------------------------------------------
  // 4) DURUM
  // ---------------------------------------------------------------------------
  var info = {};        // id -> { auth, conn, name, joinedAt, lastActive, afkWarned, msgTimes, mutedUntil, afk }
  var queue = [];
  var currentTier = 0;
  var gamePaused = false;
  var pendingLoserTeam = 0;
  var lastGoalAt = 0;

  // Match analytics (reset each game)
  var M = null;
  function newMatch() {
    M = {
      touches: [],            // newest first: { id, team, name, tick, x, y, kick }
      passChain: 0, passChainTeam: 0,
      shot: null,             // pending shot { id, team, name, tick, x, y, targetY, speed, onTarget }
      possession: { 1: 0, 2: 0 },
      goals: {}, assists: {}, shots: {}, onTarget: {}, saves: {}, passes: {},
      tick: 0, last30Said: false, prevBall: null, lastPostTick: -999, soloStart: false
    };
  }
  newMatch();

  var STATS_KEY = "profutsal_stats_v2", BANS_KEY = "profutsal_bans_v1";
  var stats = loadJSON(STATS_KEY, {});
  var bans = loadJSON(BANS_KEY, { auth: {}, conn: {}, name: {} });
  function loadJSON(k, d) { try { var r = localStorage.getItem(k); if (r) return JSON.parse(r); } catch (e) {} return d; }
  var saveTimer = null;
  function saveStatsSoon() {
    if (saveTimer) return;
    saveTimer = setTimeout(function () { saveTimer = null; try { localStorage.setItem(STATS_KEY, JSON.stringify(stats)); } catch (e) {} }, 2000);
  }
  function saveBans() { try { localStorage.setItem(BANS_KEY, JSON.stringify(bans)); } catch (e) {} }

  function humans() { return room.getPlayerList().filter(function (p) { return p.id !== BOT_ID; }); }
  function teamOf(t) { return humans().filter(function (p) { return p.team === t; }); }
  function teamName(t) { return t === RED ? "🔴 Kırmızı" : (t === BLUE ? "🔵 Mavi" : "⚪ İzleyici"); }
  function teamColor(t) { return t === RED ? C.red : C.blue; }
  function geo() { return (MAPS[currentTier] || MAPS[1]).geo; }

  function getStats(id) {
    var i = info[id];
    if (!i) return null;
    var k = i.auth || ("name:" + i.name.toLowerCase());
    if (!stats[k]) stats[k] = { name: "", goals: 0, assists: 0, ownGoals: 0, wins: 0, losses: 0, matches: 0, mvps: 0, cleanSheets: 0, shots: 0, saves: 0, posts: 0 };
    var s = stats[k];
    ["shots", "saves", "posts"].forEach(function (f) { if (s[f] == null) s[f] = 0; });
    s.name = i.name;
    return s;
  }
  function bump(obj, id) { obj[id] = (obj[id] || 0) + 1; return obj[id]; }

  function findPlayer(arg) {
    if (!arg) return null;
    var s = String(arg).replace(/^[#@]/, "").trim();
    if (/^\d+$/.test(s)) { var byId = room.getPlayer(parseInt(s, 10)); if (byId && byId.id !== BOT_ID) return byId; }
    var low = s.toLowerCase(), list = humans();
    var exact = list.filter(function (p) { return p.name.toLowerCase() === low; });
    if (exact.length) return exact[0];
    var part = list.filter(function (p) { return p.name.toLowerCase().indexOf(low) !== -1; });
    return part.length === 1 ? part[0] : null;
  }

  // ---------------------------------------------------------------------------
  // 5) TAKIM / SIRA / OTOMATİK BAŞLATMA (oyun hiç beklemez)
  // ---------------------------------------------------------------------------
  function activeIds() { return humans().filter(function (p) { return info[p.id] && !info[p.id].afk; }).map(function (p) { return p.id; }); }
  function removeFromQueue(id) { var i = queue.indexOf(id); if (i !== -1) queue.splice(i, 1); }
  function enqueue(id) { if (id !== BOT_ID && queue.indexOf(id) === -1) queue.push(id); }
  function syncQueue() {
    var specs = humans().filter(function (p) { return p.team === SPEC && info[p.id] && !info[p.id].afk; }).map(function (p) { return p.id; });
    queue = queue.filter(function (id) { return specs.indexOf(id) !== -1; });
    specs.forEach(enqueue);
  }
  function tierFor(count) { return Math.max(1, Math.min(CONFIG.maxPerTeam, Math.floor(count / 2))); }

  function setTier(tier) {
    if (tier === currentTier) return false;
    if (room.getScores()) room.stopGame();
    currentTier = tier;
    room.setCustomStadium(MAPS[tier].json);
    say("🏟️ Saha değişti: " + MAPS[tier].name, null, C.gold, "bold", 0);
    return true;
  }

  function fillTeams(perTeam) {
    syncQueue();
    var red = teamOf(RED), blue = teamOf(BLUE);
    while (red.length > perTeam) { var r = red.pop(); room.setPlayerTeam(r.id, SPEC); removeFromQueue(r.id); queue.unshift(r.id); }
    while (blue.length > perTeam) { var b = blue.pop(); room.setPlayerTeam(b.id, SPEC); removeFromQueue(b.id); queue.unshift(b.id); }
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
  function scheduleBalance(delay) { clearTimeout(balanceTimer); balanceTimer = setTimeout(balance, delay == null ? 500 : delay); }

  function startNow() {
    if (room.getScores()) return;
    room.startGame();
  }

  function balance() {
    var ids = activeIds();
    var scores = room.getScores();
    if (ids.length === 0) { if (scores) room.stopGame(); return; }

    var tier = tierFor(ids.length);

    if (scores) {
      var res = fillTeams(currentTier);
      var someoneEmpty = res.red === 0 || res.blue === 0;
      var early = scores.red === 0 && scores.blue === 0 && scores.time < 25;
      // Restart when: practice game got an opponent, tier should change early in the
      // match, or teams became lopsided by 2+ after leaves.
      if ((M.soloStart && !someoneEmpty) || (tier !== currentTier && early) || Math.abs(res.red - res.blue) >= 2 || (someoneEmpty && ids.length >= 2)) {
        room.stopGame();
        setTier(tier);
        fillTeams(tier);
        startNow();
      }
      return;
    }

    setTier(tier);
    var r = fillTeams(tier);
    if (r.red + r.blue > 0) startNow();   // 1 kişi bile olsa başlar
  }

  function announceQueue(target) {
    syncQueue();
    if (!queue.length) { sayInfo("Sırada bekleyen yok.", target); return; }
    var names = queue.slice(0, 8).map(function (id, i) { var p = room.getPlayer(id); return (i + 1) + ". " + (p ? p.name : "?"); });
    sayInfo("📋 Sıra: " + names.join("  ") + (queue.length > 8 ? "  (+" + (queue.length - 8) + ")" : ""), target);
  }

  function ensureAdmin() {
    var list = humans();
    if (!list.length || list.some(function (p) { return p.admin; })) return;
    list.sort(function (a, b) { return (info[a.id] ? info[a.id].joinedAt : 0) - (info[b.id] ? info[b.id].joinedAt : 0); });
    room.setPlayerAdmin(list[0].id, true);
    sayOk(list[0].name + " odadaki en eski oyuncu, admin oldu.");
  }

  // ---------------------------------------------------------------------------
  // 6) SAHA ÜSTÜ CANLI GÖSTERGE (avatarlar)
  // ---------------------------------------------------------------------------
  var avatarTimers = {};
  function flashAvatar(id, text, ms) {
    try {
      room.setPlayerAvatar(id, text);
      clearTimeout(avatarTimers[id]);
      avatarTimers[id] = setTimeout(function () { try { room.setPlayerAvatar(id, null); } catch (e) {} }, ms || 3000);
    } catch (e) {}
  }

  // ---------------------------------------------------------------------------
  // 7) FİZİK TABANLI OLAY ALGILAMA
  // ---------------------------------------------------------------------------
  var PLAYER_R = 15, BALL_DAMPING = 0.99, SHOT_MIN_SPEED = 3.4;

  function attackDir(team) { return team === RED ? 1 : -1; } // red attacks +x (blue goal), blue attacks -x

  function registerTouch(p, isKick, ball) {
    var t = M.touches[0];
    var bx = ball ? ball.x : (p.position ? p.position.x : 0), by = ball ? ball.y : (p.position ? p.position.y : 0);
    if (t && t.id === p.id) { t.tick = M.tick; t.kick = t.kick || isKick; t.x = bx; t.y = by; return; }

    var prev = t;
    M.touches.unshift({ id: p.id, team: p.team, name: p.name, tick: M.tick, x: bx, y: by, kick: !!isKick });
    if (M.touches.length > 6) M.touches.pop();

    // Resolve a pending shot by the new touch
    if (M.shot && p.team !== M.shot.team && p.id !== M.shot.id) {
      var g = geo();
      var ownGoalX = -attackDir(p.team) * g.goalX;
      if (M.shot.onTarget && Math.abs(bx - ownGoalX) < g.goalX * 0.45) {
        bump(M.saves, p.id);
        var ks = getStats(p.id); if (ks) ks.saves++;
        comment("🧤 " + line("save", { k: p.name, p: M.shot.name }), C.save, false);
        flashAvatar(p.id, "🧤", 2500);
      }
      M.shot = null;
    } else if (M.shot && p.team === M.shot.team && p.id !== M.shot.id) {
      M.shot = null; // teammate redirected it; the new kick may create a new shot
    }

    if (prev && M.tick - prev.tick < 60 * 8) {
      if (prev.team === p.team) {
        bump(M.passes, prev.id);
        M.passChain = M.passChainTeam === p.team ? M.passChain + 1 : 1;
        M.passChainTeam = p.team;
        var dist = Math.hypot(bx - prev.x, by - prev.y);
        if (dist > geo().goalX * 0.9) comment("📐 " + line("longPass", { a: prev.name, b: p.name }), C.pass, true);
      } else {
        M.passChain = 0; M.passChainTeam = p.team;
        if (prev.kick === false && M.tick - prev.tick < 30) comment("🦊 " + line("steal", { a: prev.name, b: p.name }), C.pass, true);
      }
    }
  }

  function evaluateShot(kicker, ball) {
    // Called a couple of ticks after a kick, when the ball has its new velocity
    var g = geo();
    var dir = attackDir(kicker.team);
    var vx = ball.xspeed, vy = ball.yspeed, speed = Math.hypot(vx, vy);
    if (speed < SHOT_MIN_SPEED || vx * dir <= 0.5) return;
    var targetX = dir * g.goalX;
    var dx = targetX - ball.x;
    if (Math.abs(dx) > g.goalX * 1.6) return;            // from own half deep: not a shot
    var t = dx / vx;                                      // ticks until reaching goal line (no damping)
    var travel = speed / (1 - BALL_DAMPING);             // max distance with damping
    if (Math.hypot(dx, vy * t) > travel * 0.95) return;   // too weak to reach
    var yAt = ball.y + vy * t;
    var onTarget = Math.abs(yAt) <= g.goalHalf + 2;
    var nearMiss = !onTarget && Math.abs(yAt) <= g.goalHalf + 45;
    if (!onTarget && !nearMiss) return;
    M.shot = { id: kicker.id, team: kicker.team, name: kicker.name, tick: M.tick, x: ball.x, y: ball.y, speed: speed, onTarget: onTarget, yAt: yAt };
    bump(M.shots, kicker.id);
    if (onTarget) bump(M.onTarget, kicker.id);
    var ks = getStats(kicker.id); if (ks) ks.shots++;
    if (onTarget && speed > 7.5) comment("⚡ " + line("shot", { p: kicker.name }), C.shot, true);
  }

  function checkPost(ball) {
    var g = geo();
    var prev = M.prevBall;
    if (!prev || M.tick - M.lastPostTick < 90) return;
    var ballR = ball.radius || 6.4;
    for (var i = 0; i < g.posts.length; i++) {
      var post = g.posts[i];
      var nx = ball.x - post.x, ny = ball.y - post.y;
      var d = Math.hypot(nx, ny);
      if (d > ballR + post.r + 2.5 || d === 0) continue;
      nx /= d; ny /= d;
      var vnBefore = prev.xs * nx + prev.ys * ny;          // < 0 : approaching the post
      var vnAfter = ball.xspeed * nx + ball.yspeed * ny;    // > 0 : moving away
      if (vnBefore < -1.4 && vnAfter > 0.3) {
        M.lastPostTick = M.tick;
        var shooter = (M.shot && M.tick - M.shot.tick < 180) ? M.shot : (M.touches[0] || null);
        if (!shooter) return;
        var postTeamGoal = post.x < 0 ? RED : BLUE;      // whose goal this post belongs to
        if (shooter.team === postTeamGoal) return;       // defender clearing off own post: not news
        var shooterId = shooter.id;
        var shooterName = shooter.name;
        M.shot = null;
        setTimeout(function () {
          if (Date.now() - lastGoalAt < 1500) return;      // it went in after all
          var st = getStats(shooterId); if (st) st.posts++;
          comment("🥅 " + line("post", { p: shooterName }), C.post, false);
          flashAvatar(shooterId, "😱", 2500);
        }, 350);
        return;
      }
    }
  }

  function checkMiss(ball) {
    if (!M.shot || M.shot.onTarget) return;
    var g = geo();
    var dir = attackDir(M.shot.team);
    var ballR = ball.radius || 6.4;
    // The end line outside the goal mouth is a wall in these maps: a miss is the ball
    // reaching the end line beside the goal (or past it on maps without that wall).
    if (ball.x * dir >= g.goalX - ballR - 3 && Math.abs(ball.y) > g.goalHalf + 6) {
      var s = M.shot; M.shot = null;
      comment("💨 " + line("miss", { p: s.name }), C.mute, true);
    }
  }

  room.onGameTick = function () {
    M.tick++;
    var ball = room.getDiscProperties(0);
    if (!ball) return;
    var ballR = ball.radius || 6.4;
    var players = room.getPlayerList();

    // Touch detection by contact (dribbles) — kicks come via onPlayerBallKick
    for (var i = 0; i < players.length; i++) {
      var p = players[i];
      if (p.team === SPEC || !p.position) continue;
      var dx = p.position.x - ball.x, dy = p.position.y - ball.y;
      if (dx * dx + dy * dy <= Math.pow(ballR + PLAYER_R + 0.8, 2)) registerTouch(p, false, ball);
    }

    // Pending kick → shot evaluation 2 ticks later
    if (M.pendingKick && M.tick - M.pendingKick.tick >= 2) {
      var k = M.pendingKick; M.pendingKick = null;
      var kp = room.getPlayer(k.id);
      if (kp && kp.team !== SPEC) evaluateShot(kp, ball);
    }

    checkPost(ball);
    checkMiss(ball);
    if (M.shot && M.tick - M.shot.tick > 240) M.shot = null;

    // Possession
    if (M.touches[0]) M.possession[M.touches[0].team] = (M.possession[M.touches[0].team] || 0) + 1;

    M.prevBall = { x: ball.x, y: ball.y, xs: ball.xspeed, ys: ball.yspeed };

    if (M.tick % 60 === 0) everySecond();
  };

  function everySecond() {
    var scores = room.getScores();
    if (scores && CONFIG.timeLimit > 0 && !M.last30Said && scores.timeLimit - scores.time <= 30 && scores.timeLimit - scores.time > 25) {
      M.last30Said = true;
      comment("⏳ " + line("last30", { r: scores.red, b: scores.blue }), C.gold, false);
    }
    if (gamePaused) return;
    var t = Date.now();
    var activeTeamCount = teamOf(RED).length + teamOf(BLUE).length;
    humans().forEach(function (pl) {
      if (pl.team === SPEC || !info[pl.id] || activeTeamCount < 2) return;
      var idle = (t - info[pl.id].lastActive) / 1000;
      if (idle >= CONFIG.afkKickSeconds) {
        info[pl.id].afk = true;
        room.setPlayerTeam(pl.id, SPEC);
        removeFromQueue(pl.id);
        say("💤 " + pl.name + (CONFIG.argo ? " uyudu lan, kenara alındı. Uyanınca !geri yaz." : " hareketsiz kaldı, izleyiciye alındı. Dönmek için !geri yaz."), null, C.mute);
        scheduleBalance(300);
      } else if (idle >= CONFIG.afkWarnSeconds && !info[pl.id].afkWarned) {
        info[pl.id].afkWarned = true;
        say("⏰ " + pl.name + ", hareket et! " + Math.round(CONFIG.afkKickSeconds - idle) + " sn sonra izleyiciye alınacaksın.", pl.id, C.err, "bold", 2);
      }
    });
  }

  // ---------------------------------------------------------------------------
  // 8) ODA OLAYLARI
  // ---------------------------------------------------------------------------
  room.onRoomLink = function (url) {
    console.log("%c==========================================", "color:#4ADE80;font-weight:bold");
    console.log("%c⚡ PRO FUTSAL ODASI AÇILDI ⚡", "color:#7DD3FC;font-size:16px;font-weight:bold");
    console.log("%cOda Linki: " + url, "color:#FACC15;font-size:15px;font-weight:bold");
    console.log("%cAdmin Şifresi: " + CONFIG.adminPassword + "  (oyunda: !admin " + CONFIG.adminPassword + ")", "color:#F87171;font-weight:bold");
    console.log("%c==========================================", "color:#4ADE80;font-weight:bold");
    try { room.setPlayerAvatar(BOT_ID, "🎙️"); room.setPlayerTeam(BOT_ID, SPEC); } catch (e) {}
    setTier(1);
  };

  room.onPlayerJoin = function (p) {
    var low = p.name.toLowerCase();
    if (bans.auth[p.auth] || bans.conn[p.conn] || bans.name[low]) { room.kickPlayer(p.id, "🚫 Bu odadan yasaklandınız.", false); return; }
    for (var id in info) { if (p.auth && info[id].auth === p.auth) { room.kickPlayer(p.id, "Bu hesap zaten odada.", false); return; } }
    var now = Date.now();
    info[p.id] = { auth: p.auth, conn: p.conn, name: p.name, joinedAt: now, lastActive: now, afkWarned: false, msgTimes: [], mutedUntil: 0, afk: false };
    enqueue(p.id);
    var st = getStats(p.id);
    say(st && st.matches > 0
      ? "👋 Tekrar hoş geldin " + p.name + "! ⚽ " + st.goals + " gol • 🏆 " + st.wins + " galibiyet"
      : "👋 Hoş geldin " + p.name + "! Komutlar: !yardim", p.id, C.ok, "bold");
    if (CONFIG.welcomeExtra) say(CONFIG.welcomeExtra, p.id, C.info);
    say("➕ " + p.name + " odaya katıldı.", null, C.mute, "small", 0);
    ensureAdmin();
    scheduleBalance(400);
  };

  room.onPlayerLeave = function (p) {
    delete info[p.id];
    removeFromQueue(p.id);
    ensureAdmin();
    scheduleBalance(300);
  };

  room.onPlayerAdminChange = function () { setTimeout(ensureAdmin, 100); };

  room.onPlayerTeamChange = function (p) {
    if (!p) return;
    if (p.id === BOT_ID) { if (p.team !== SPEC) room.setPlayerTeam(BOT_ID, SPEC); return; }
    if (p.team !== SPEC) removeFromQueue(p.id);
    else if (info[p.id] && !info[p.id].afk) enqueue(p.id);
    if (info[p.id]) { info[p.id].lastActive = Date.now(); info[p.id].afkWarned = false; }
  };

  room.onPlayerActivity = function (p) { var i = info[p.id]; if (i) { i.lastActive = Date.now(); i.afkWarned = false; } };

  room.onPlayerBallKick = function (p) {
    var ball = room.getDiscProperties(0);
    registerTouch(p, true, ball);
    M.pendingKick = { id: p.id, tick: M.tick };
  };

  room.onGameStart = function () {
    gamePaused = false;
    newMatch();
    var now = Date.now();
    for (var id in info) { info[id].lastActive = now; info[id].afkWarned = false; }
    var red = teamOf(RED), blue = teamOf(BLUE);
    M.soloStart = red.length === 0 || blue.length === 0;
    if (M.soloStart) {
      say("🎯 Rakip bekleniyor, bu arada ısın! Biri gelince maç yeniden başlayacak.", null, C.info, "bold", 0);
      return;
    }
    var names = function (arr) { return arr.map(function (p) { return p.name; }).join(", "); };
    say("🏁 " + line("kickoff"), null, C.gold, "bold", 1);
    say("🔴 " + names(red) + "   vs   🔵 " + names(blue), null, 0xFFFFFF, "bold", 0);
  };

  room.onGameStop = function () {
    gamePaused = false;
    if (pendingLoserTeam) { rotateLosers(pendingLoserTeam); pendingLoserTeam = 0; }
    scheduleBalance(900);
  };
  room.onGamePause = function () { gamePaused = true; };
  room.onGameUnpause = function () { gamePaused = false; var now = Date.now(); for (var id in info) { info[id].lastActive = now; info[id].afkWarned = false; } };
  room.onPositionsReset = function () { M.touches = []; M.shot = null; M.pendingKick = null; M.passChain = 0; };

  room.onTeamGoal = function (team) {
    lastGoalAt = Date.now();
    var g = geo();
    var prev = M.prevBall;
    var speed = prev ? Math.hypot(prev.xs, prev.ys) : 0;
    var kmh = Math.round(speed * 12);
    var scorer = M.touches[0];
    var scores = room.getScores() || { red: 0, blue: 0 };
    var scoreLine = "   [" + scores.red + " - " + scores.blue + "]";

    if (!scorer) { comment("⚽ GOL! " + teamName(team) + scoreLine, teamColor(team), false); return; }

    if (scorer.team !== team) {
      var os = getStats(scorer.id); if (os) os.ownGoals++;
      comment("🙃 " + line("ownGoal", { p: scorer.name }) + scoreLine, C.err, false);
      flashAvatar(scorer.id, "🤦", 3500);
      saveStatsSoon();
      return;
    }

    var n = bump(M.goals, scorer.id);
    var st = getStats(scorer.id); if (st) st.goals++;

    // Assist: previous distinct toucher, same team, within 6 seconds
    var assist = M.touches[1];
    var hasAssist = assist && assist.team === team && assist.id !== scorer.id && (M.tick - assist.tick) < 360;
    if (hasAssist) { bump(M.assists, assist.id); var as = getStats(assist.id); if (as) as.assists++; }

    var goalX = attackDir(team) * g.goalX;
    var meters = Math.round(Math.abs(goalX - scorer.x) / (g.goalX * 2) * 40); // futsal pitch ≈ 40 m
    var key = meters >= 14 ? "goalLong" : (kmh >= 95 ? "goalPower" : (M.passChain >= 3 ? "goalTeam" : "goal"));
    var msg = line(key, { p: scorer.name, d: meters, kmh: kmh, n: M.passChain + 1 });
    var extra = (hasAssist ? "  🅰️ " + assist.name : "") + (kmh > 0 ? "  💨 " + kmh + " km/s" : "") + (meters > 0 ? "  📏 " + meters + " m" : "");
    comment("⚽ " + msg + scoreLine, teamColor(team), false);
    say("⚽ " + scorer.name + extra, null, teamColor(team), "normal", 0);
    if (n === 3) comment(line("hattrick", { p: scorer.name }), C.big, false);

    flashAvatar(scorer.id, n >= 3 ? "🎩" : String(n), 4000);
    if (hasAssist) flashAvatar(assist.id, "🅰️", 3000);
    M.shot = null;
    saveStatsSoon();
  };

  room.onTeamVictory = function (scores) {
    var win = scores.red > scores.blue ? RED : BLUE;
    var lose = win === RED ? BLUE : RED;
    if (M.soloStart) { pendingLoserTeam = 0; setTimeout(function () { room.stopGame(); }, 1500); return; }

    comment("🏆 " + line("win", { t: teamName(win) }) + "   [" + scores.red + " - " + scores.blue + "]", C.gold, false);
    if (Math.abs(scores.red - scores.blue) >= 3) say("😂 " + line("lose", { t: teamName(lose) }), null, C.mute, "normal", 0);

    var totalPos = (M.possession[1] || 0) + (M.possession[2] || 0);
    if (totalPos > 0) {
      var rp = Math.round(100 * (M.possession[1] || 0) / totalPos);
      var sum = function (obj, team) { return humans().filter(function (p) { return p.team === team; }).reduce(function (a, p) { return a + (obj[p.id] || 0); }, 0); };
      say("📊 Topla oynama: 🔴 %" + rp + " - %" + (100 - rp) + " 🔵   •   Şut: " + sum(M.shots, RED) + " - " + sum(M.shots, BLUE) + "   •   İsabetli: " + sum(M.onTarget, RED) + " - " + sum(M.onTarget, BLUE), null, C.info, "normal", 0);
    }

    var mvp = null, best = -1;
    humans().forEach(function (p) {
      if (p.team !== RED && p.team !== BLUE) return;
      var s = getStats(p.id); if (!s) return;
      s.matches++;
      if (p.team === win) s.wins++; else s.losses++;
      if ((p.team === RED ? scores.blue : scores.red) === 0) s.cleanSheets++;
      var sc = (M.goals[p.id] || 0) * 3 + (M.assists[p.id] || 0) * 2 + (M.saves[p.id] || 0) * 1.5 + (M.onTarget[p.id] || 0) * 0.5 + (p.team === win ? 1 : 0);
      if (sc > best) { best = sc; mvp = p; }
    });
    if (mvp && best > 1) {
      var ms = getStats(mvp.id); if (ms) ms.mvps++;
      say("⭐ Maçın oyuncusu: " + mvp.name + "  (⚽ " + (M.goals[mvp.id] || 0) + "  🅰️ " + (M.assists[mvp.id] || 0) + "  🧤 " + (M.saves[mvp.id] || 0) + ")", null, C.big, "bold", 1);
      flashAvatar(mvp.id, "⭐", 4000);
    }
    saveStatsSoon();

    pendingLoserTeam = lose;
    setTimeout(function () { if (room.getScores()) room.stopGame(); }, 2500);
  };

  function rotateLosers(lose) {
    syncQueue();
    if (!queue.length) return;          // nobody waiting → rematch with same teams
    var losers = teamOf(lose);
    losers.forEach(function (p) { room.setPlayerTeam(p.id, SPEC); });
    losers.forEach(function (p) { removeFromQueue(p.id); });
    losers.forEach(function (p) { if (info[p.id] && !info[p.id].afk) enqueue(p.id); });
  }

  // ---------------------------------------------------------------------------
  // 9) SOHBET & KOMUTLAR
  // ---------------------------------------------------------------------------
  function isSpamming(p) {
    var i = info[p.id]; if (!i) return false;
    var now = Date.now();
    if (i.mutedUntil > now) return true;
    i.msgTimes.push(now);
    i.msgTimes = i.msgTimes.filter(function (t) { return now - t < CONFIG.spamWindowMs; });
    if (i.msgTimes.length > CONFIG.spamMessages) {
      i.mutedUntil = now + CONFIG.spamMuteSeconds * 1000; i.msgTimes = [];
      say("🔇 " + (CONFIG.argo ? "Yavaş lan! " : "") + CONFIG.spamMuteSeconds + " sn susturuldun.", p.id, C.err, "bold", 2);
      return true;
    }
    return false;
  }

  var COMMANDS = {
    yardim: { run: function (p) {
      sayInfo("Oyuncu: !stats [isim]  !top [asist|galibiyet|mvp|kurtaris]  !sira  !afk  !geri  !admin <şifre>  !bb", p.id);
      if (p.admin) sayInfo("Admin: !start !stop !rr !pause !swap !harita <1-5> !skor <n> !sure <dk> !argo !kick !ban !unban !mute !unmute !duyuru", p.id);
    } },
    stats: { run: function (p, args) {
      var t = args[0] ? findPlayer(args.join(" ")) : p;
      if (!t) { sayErr("Oyuncu bulunamadı.", p.id); return; }
      var s = getStats(t.id); if (!s) return;
      var ratio = s.matches ? Math.round(100 * s.wins / s.matches) : 0;
      sayInfo("📊 " + t.name + " • Maç " + s.matches + " • G/M " + s.wins + "/" + s.losses + " (%" + ratio + ") • ⚽ " + s.goals + " • 🅰️ " + s.assists + " • 🎯 Şut " + s.shots + " • 🧤 " + s.saves + " • 🥅 Direk " + s.posts + " • ⭐ " + s.mvps + " • 🙃 " + s.ownGoals, p.id);
    } },
    top: { run: function (p, args) {
      var map = { asist: "assists", galibiyet: "wins", mvp: "mvps", kurtaris: "saves", "kurtarış": "saves" };
      var field = map[(args[0] || "").toLowerCase()] || "goals";
      var label = { goals: "⚽ Gol", assists: "🅰️ Asist", wins: "🏆 Galibiyet", mvps: "⭐ MVP", saves: "🧤 Kurtarış" }[field];
      var list = Object.keys(stats).map(function (k) { return stats[k]; }).filter(function (s) { return s.matches > 0; });
      list.sort(function (a, b) { return (b[field] || 0) - (a[field] || 0); });
      if (!list.length) { sayInfo("Henüz istatistik yok.", p.id); return; }
      sayInfo("🏅 Top 5 " + label + ": " + list.slice(0, 5).map(function (s, i) { return (i + 1) + ". " + s.name + " " + (s[field] || 0); }).join("  "), p.id);
    } },
    sira: { run: function (p) { announceQueue(p.id); } },
    afk: { run: function (p) {
      var i = info[p.id]; if (!i) return;
      i.afk = true; removeFromQueue(p.id);
      if (p.team !== SPEC) room.setPlayerTeam(p.id, SPEC);
      say("💤 " + p.name + " AFK.", null, C.mute);
      scheduleBalance(300);
    } },
    geri: { run: function (p) {
      var i = info[p.id]; if (!i) return;
      if (!i.afk) { sayInfo("Zaten sıradasın.", p.id); return; }
      i.afk = false; i.lastActive = Date.now(); i.afkWarned = false;
      enqueue(p.id);
      sayOk("Sıradasın (#" + (queue.indexOf(p.id) + 1) + ").", p.id);
      scheduleBalance(300);
    } },
    bb: { run: function (p) { room.kickPlayer(p.id, "Görüşürüz! 👋", false); } },
    admin: { run: function (p, args) {
      if (args[0] && args[0] === CONFIG.adminPassword) { room.setPlayerAdmin(p.id, true); sayOk("Admin oldun.", p.id); }
      else sayErr("Yanlış şifre.", p.id);
    } },
    start: { admin: true, run: function () { balance(); } },
    stop: { admin: true, run: function () { room.stopGame(); } },
    rr: { admin: true, run: function () { room.stopGame(); } },   // onGameStop → auto restart
    pause: { admin: true, run: function () { room.pauseGame(!gamePaused); } },
    swap: { admin: true, run: function () {
      var wasRunning = !!room.getScores();
      if (wasRunning) room.stopGame();
      humans().forEach(function (p) { if (p.team === RED) room.setPlayerTeam(p.id, BLUE); else if (p.team === BLUE) room.setPlayerTeam(p.id, RED); });
      sayOk("Takımlar yer değiştirdi.");
    } },
    harita: { admin: true, run: function (p, args) {
      var t = parseInt(args[0], 10);
      if (!(t >= 1 && t <= 5)) { sayErr("Kullanım: !harita 1-5", p.id); return; }
      room.stopGame(); currentTier = 0; setTier(t); fillTeams(t); startNow();
    } },
    skor: { admin: true, run: function (p, args) {
      var n = parseInt(args[0], 10); if (!(n >= 0 && n <= 14)) { sayErr("Kullanım: !skor 0-14", p.id); return; }
      CONFIG.scoreLimit = n; room.stopGame(); room.setScoreLimit(n); sayOk("Gol limiti: " + n);
    } },
    sure: { admin: true, run: function (p, args) {
      var n = parseInt(args[0], 10); if (!(n >= 0 && n <= 14)) { sayErr("Kullanım: !sure 0-14", p.id); return; }
      CONFIG.timeLimit = n; room.stopGame(); room.setTimeLimit(n); sayOk("Süre: " + n + " dk");
    } },
    argo: { admin: true, run: function () { CONFIG.argo = !CONFIG.argo; sayOk("Argo anlatım " + (CONFIG.argo ? "AÇIK 🤬" : "KAPALI 😇")); } },
    kick: { admin: true, run: function (p, args) {
      var t = findPlayer(args[0]); if (!t) { sayErr("Oyuncu bulunamadı.", p.id); return; }
      room.kickPlayer(t.id, args.slice(1).join(" ") || "Odadan atıldın.", false);
    } },
    ban: { admin: true, run: function (p, args) {
      var t = findPlayer(args[0]); if (!t) { sayErr("Oyuncu bulunamadı.", p.id); return; }
      var i = info[t.id];
      if (i) { if (i.auth) bans.auth[i.auth] = t.name; if (i.conn) bans.conn[i.conn] = t.name; }
      bans.name[t.name.toLowerCase()] = t.name; saveBans();
      room.kickPlayer(t.id, args.slice(1).join(" ") || "Yasaklandın.", true);
    } },
    unban: { admin: true, run: function (p, args) {
      var q = args.join(" ").toLowerCase(); if (!q) { sayErr("Kullanım: !unban <isim>", p.id); return; }
      var n = 0;
      ["auth", "conn", "name"].forEach(function (k) { Object.keys(bans[k]).forEach(function (key) { if (String(bans[k][key]).toLowerCase() === q) { delete bans[k][key]; n++; } }); });
      saveBans(); room.clearBans();
      sayOk(n ? q + " yasağı kaldırıldı." : "Bu isimde yasak yok.", p.id);
    } },
    mute: { admin: true, run: function (p, args) {
      var t = findPlayer(args[0]); if (!t || !info[t.id]) { sayErr("Oyuncu bulunamadı.", p.id); return; }
      var min = parseInt(args[1], 10) || 5; info[t.id].mutedUntil = Date.now() + min * 60000;
      sayOk(t.name + " " + min + " dk susturuldu.");
    } },
    unmute: { admin: true, run: function (p, args) {
      var t = findPlayer(args[0]); if (!t || !info[t.id]) { sayErr("Oyuncu bulunamadı.", p.id); return; }
      info[t.id].mutedUntil = 0; sayOk(t.name + " konuşabilir.");
    } },
    lock: { admin: true, run: function () { room.setTeamsLock(true); sayOk("Takımlar kilitli (sıra sistemi)."); } },
    unlock: { admin: true, run: function () { room.setTeamsLock(false); sayOk("Takım kilidi açık."); } },
    duyuru: { admin: true, run: function (p, args) { if (args.length) say("📢 " + args.join(" "), null, C.gold, "bold", 2); } }
  };
  var ALIASES = { help: "yardim", komutlar: "yardim", istatistik: "stats", s: "stats", queue: "sira", back: "geri", restart: "rr", r: "rr", p: "pause" };

  room.onPlayerChat = function (p, message) {
    var text = (message || "").trim();
    if (!text) return false;
    if (text.charAt(0) === "!") {
      var parts = text.slice(1).split(/\s+/);
      var name = ALIASES[parts[0].toLowerCase()] || parts[0].toLowerCase();
      var cmd = COMMANDS[name];
      if (!cmd) { sayErr("Bilinmeyen komut. !yardim yaz.", p.id); return false; }
      if (cmd.admin && !p.admin) { sayErr("Bu komut admin için.", p.id); return false; }
      try { cmd.run(p, parts.slice(1)); } catch (e) { console.error(e); }
      return false;
    }
    if (isSpamming(p)) return false;
    if (info[p.id]) info[p.id].lastActive = Date.now();
    return true;
  };

  var TIPS = [
    "💡 !stats ile kendi istatistiğine, !top ile liderlik tablosuna bak.",
    "💡 Kazanan sahada kalır, kaybeden sıranın sonuna geçer. Sıran için !sira",
    "💡 Mola mı lazım? !afk yaz, dönünce !geri.",
    "💡 Mobil istemcide joystick 'Akıllı 8 Yön' modunda tam hız koşar."
  ];
  var tipIdx = 0;
  setInterval(function () { if (humans().length) say(TIPS[tipIdx++ % TIPS.length], null, C.mute, "small", 0); }, 4 * 60 * 1000);

  // Safety net: if nothing is running but players are here, start (game never waits)
  setInterval(function () { if (!room.getScores() && activeIds().length > 0 && !pendingLoserTeam) balance(); }, 3000);

  window.__futsalRoom = room;
  console.log("[ProFutsal] Bot yüklendi. Oda açılıyor...");
})();
