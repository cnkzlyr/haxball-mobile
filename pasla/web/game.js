'use strict';
/* PASLA istemcisi: sunucu otoriter, diğer oyuncular/top interpolasyonla,
   kendi oyuncun girdi tahmini (client-side prediction) + uzlaştırma ile çizilir. */

const $ = (id) => document.getElementById(id);
const cv = $('c'), ctx = cv.getContext('2d');

// ------------------------------------------------------------ ayarlar ----
const store = {
  get(k, d) { try { const v = localStorage.getItem('pasla.' + k); return v === null ? d : v; } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem('pasla.' + k, v); } catch (e) {} },
};
const opt = { pred: store.get('pred', '1') === '1', vib: store.get('vib', '1') === '1', snd: store.get('snd', '1') === '1' };
$('optPred').checked = opt.pred; $('optVib').checked = opt.vib; $('optSnd').checked = opt.snd;
for (const k of ['pred', 'vib', 'snd']) {
  const el = $('opt' + k[0].toUpperCase() + k.slice(1));
  el.onchange = () => { opt[k] = el.checked; store.set(k, el.checked ? '1' : '0'); };
}

// ------------------------------------------------------------- durum -----
let ws = null, myId = -1, C = null, tickMs = 1000 / 60;
let room = null, hud = { score: [0, 0], time: 0, limit: 0, ot: false };
let ping = 0, lobbyOpen = true, joined = false;

// anlık görüntüler
let snaps = [];
let clockOff = null, jitter = 4, delayS = 2, lastRecv = 0, lastTick = 0;

// tahmin
let seq = 0, pending = [], pred = null, predPrev = null, err = { x: 0, y: 0 };
let tickAcc = 0, lastFrame = performance.now();

// girdi
const input = { mx: 0, my: 0, kick: false, latch: false };
const keys = new Set();
let joy = { id: null, ox: 0, oy: 0, mx: 0, my: 0 };
const kickIds = new Set();

// ------------------------------------------------------------ giriş ------
$('name').value = store.get('name', '');
$('server').value = store.get('server', location.protocol.startsWith('http') ? location.host : '');
if (location.protocol.startsWith('http') && !store.get('server', '')) $('server').value = location.host;
$('joinBtn').onclick = doJoin;
$('name').addEventListener('keydown', (e) => { if (e.key === 'Enter') doJoin(); });

function doJoin() {
  const name = $('name').value.trim();
  let srv = $('server').value.trim();
  if (!srv) { $('err').textContent = 'Sunucu adresini yaz.'; return; }
  store.set('name', name); store.set('server', srv);
  let secure = location.protocol === 'https:';
  if (/^https:\/\//i.test(srv) || /^wss:\/\//i.test(srv)) secure = true;
  if (/^(http|ws):\/\//i.test(srv)) secure = false;
  srv = srv.replace(/^(https?|wss?):\/\//i, '').replace(/\/+$/, '');
  $('err').textContent = 'Bağlanıyor...';
  goFullscreen();
  initAudio();
  connect((secure ? 'wss://' : 'ws://') + srv + '/ws', name);
}

function goFullscreen() {
  const d = document.documentElement;
  try { const p = d.requestFullscreen && d.requestFullscreen({ navigationUI: 'hide' }); if (p && p.catch) p.catch(() => {}); } catch (e) {}
  try { const p = screen.orientation && screen.orientation.lock && screen.orientation.lock('landscape'); if (p && p.catch) p.catch(() => {}); } catch (e) {}
  try { if (navigator.wakeLock) navigator.wakeLock.request('screen').catch(() => {}); } catch (e) {}
}

// --------------------------------------------------------- bağlantı ------
function connect(url, name) {
  try { ws = new WebSocket(url); } catch (e) { $('err').textContent = 'Geçersiz adres.'; return; }
  ws.binaryType = 'arraybuffer';
  ws.onopen = () => { ws.send(JSON.stringify({ t: 'join', name })); };
  ws.onmessage = (ev) => {
    if (typeof ev.data === 'string') onJson(JSON.parse(ev.data));
    else onState(ev.data);
  };
  ws.onclose = () => {
    const was = joined;
    ws = null; joined = false; myId = -1; snaps = []; pred = null; room = null;
    $('join').classList.remove('hide'); $('lobby').classList.add('hide');
    $('hud').classList.add('hide'); $('menuBtn').classList.add('hide');
    document.body.classList.remove('ingame', 'me-play', 'paneled');
    $('err').textContent = was ? 'Bağlantı koptu. Tekrar dene.' : 'Sunucuya bağlanılamadı.';
  };
}

function send(o) { if (ws && ws.readyState === 1) ws.send(JSON.stringify(o)); }

setInterval(() => { if (joined) send({ t: 'ping', c: performance.now(), p: ping }); }, 1000);

function onJson(m) {
  switch (m.t) {
    case 'welcome':
      myId = m.id; C = { field: m.field, player: m.player, ball: m.ball, boundB: m.bounds.boundB };
      tickMs = 1000 / m.tick; joined = true;
      $('join').classList.add('hide'); $('err').textContent = '';
      buildPosts();
      showLobby(true);
      break;
    case 'room': room = m; renderRoom(); break;
    case 'hud': hud = m; renderHud(); break;
    case 'pong': ping = Math.round(performance.now() - m.c); $('ping').textContent = ping + ' ms'; break;
    case 'chat': addChat(m); break;
    case 'goal': onGoal(m); break;
    case 'over': onOver(m); break;
    case 'error': $('err').textContent = m.msg; break;
  }
}

// ------------------------------------------------------- anlık görüntü --
function onState(buf) {
  const dv = new DataView(buf);
  if (dv.getUint8(0) !== 1) return;
  let o = 1;
  const tick = dv.getUint32(o, true); o += 4;
  const flags = dv.getUint8(o); o += 1;
  const ball = { x: dv.getFloat32(o, true), y: dv.getFloat32(o + 4, true), vx: dv.getFloat32(o + 8, true), vy: dv.getFloat32(o + 12, true) }; o += 16;
  const n = dv.getUint8(o); o += 1;
  const pl = new Map();
  for (let i = 0; i < n; i++) {
    const id = dv.getUint8(o), f = dv.getUint8(o + 1);
    pl.set(id, {
      x: dv.getFloat32(o + 2, true), y: dv.getFloat32(o + 6, true),
      vx: dv.getFloat32(o + 10, true), vy: dv.getFloat32(o + 14, true),
      seq: dv.getUint32(o + 18, true), team: f & 3, kick: !!(f & 4), kicked: !!(f & 8),
    });
    o += 22;
  }
  const now = performance.now();
  const s = { tick, flags, ball, pl };

  // saat senkronu: en az gecikmeli paketleri izle, yavaşça kaydır
  const sample = tick * tickMs - now;
  if (clockOff === null || now - lastRecv > 500 || tick < lastTick) {
    clockOff = sample; snaps = []; delayS = 2;
  } else {
    const dev = Math.min(200, Math.abs((now - lastRecv) - (tick - lastTick) * tickMs));
    jitter += (dev - jitter) * 0.08;
    if (sample > clockOff) clockOff += (sample - clockOff) * 0.5;
    else clockOff += (sample - clockOff) * 0.01;
  }
  lastRecv = now; lastTick = tick;
  snaps.push(s);
  if (snaps.length > 90) snaps.splice(0, snaps.length - 90);

  for (const p of pl.values()) if (p.kicked) sndKick();

  const me = pl.get(myId);
  if (me) reconcile(me, s); else { pred = null; pending.length = 0; }
}

function koState(s) { return { on: !!(s.flags & 1) && !(s.flags & 4), team: (s.flags & 2) ? 2 : 1 }; }

function obstaclesFrom(s) {
  const obs = [{ x: s.ball.x, y: s.ball.y, vx: s.ball.vx, vy: s.ball.vy, r: C.ball.r, inv: C.ball.invMass, b: C.ball.bCoef }];
  for (const [id, p] of s.pl) if (id !== myId) obs.push({ x: p.x, y: p.y, vx: p.vx, vy: p.vy, r: C.player.r, inv: C.player.invMass, b: C.player.bCoef });
  return obs;
}

function reconcile(me, s) {
  while (pending.length && pending[0].seq <= me.seq) pending.shift();
  if (pending.length > 120) pending.splice(0, pending.length - 120);
  const st = { x: me.x, y: me.y, vx: me.vx, vy: me.vy, team: me.team };
  const obs = obstaclesFrom(s), ko = koState(s);
  for (const inp of pending) predictStep(st, inp, obs, ko);
  if (pred) {
    const dx = pred.x - st.x, dy = pred.y - st.y;
    if (dx * dx + dy * dy > 60 * 60) { err.x = err.y = 0; predPrev = { ...st }; }
    else { err.x += dx; err.y += dy; predPrev.x -= dx; predPrev.y -= dy; }
  } else predPrev = { ...st };
  pred = st;
}

// -------------------------------------------------------------- fizik ----
let posts = [];
function buildPosts() {
  const F = C.field;
  posts = [];
  for (const sx of [-1, 1]) for (const sy of [-1, 1]) posts.push({ x: sx * F.W, y: sy * F.goalY, vx: 0, vy: 0, r: F.postR, inv: 0, b: 0.5 });
}

function collideSelf(s, r, inv, b, o) {
  const dx = s.x - o.x, dy = s.y - o.y, rr = r + o.r, d2 = dx * dx + dy * dy;
  if (d2 >= rr * rr || d2 === 0) return;
  const tot = inv + o.inv; if (tot === 0) return;
  const d = Math.sqrt(d2), nx = dx / d, ny = dy / d, fa = inv / tot;
  s.x += nx * (rr - d) * fa; s.y += ny * (rr - d) * fa;
  const rv = (s.vx - o.vx) * nx + (s.vy - o.vy) * ny;
  if (rv < 0) { const imp = rv * (1 + b * o.b); s.vx -= nx * imp * fa; s.vy -= ny * imp * fa; }
}

function plane(s, r, nx, ny, dist, bounce) {
  const pen = s.x * nx + s.y * ny + r - dist;
  if (pen > 0) {
    s.x -= nx * pen; s.y -= ny * pen;
    const vn = s.vx * nx + s.vy * ny;
    if (vn > 0) { s.vx -= nx * vn * (1 + bounce); s.vy -= ny * vn * (1 + bounce); }
  }
}

function kickoffConstrain(d, r, team, koTeam) {
  const own = team === 1 ? -1 : 1, cr = C.field.centerR, ox = d.x, oy = d.y;
  let dist = Math.hypot(d.x, d.y);
  if (team === koTeam) {
    if (own * d.x < r && dist > cr - r) {
      const ax = own * r, ay = d.y;
      let bx = ax, by = ay;
      if (dist > 0) { bx = d.x / dist * (cr - r); by = d.y / dist * (cr - r); }
      if ((ax - ox) ** 2 + (ay - oy) ** 2 <= (bx - ox) ** 2 + (by - oy) ** 2) { d.x = ax; d.y = ay; } else { d.x = bx; d.y = by; }
    }
  } else {
    if (own * d.x < r) d.x = own * r;
    dist = Math.hypot(d.x, d.y);
    const lim = cr + r;
    if (dist < lim) { if (dist === 0) { d.x = own * lim; d.y = 0; } else { d.x = d.x / dist * lim; d.y = d.y / dist * lim; } }
  }
  const cx = d.x - ox, cy = d.y - oy, cl = Math.hypot(cx, cy);
  if (cl > 0) { const nx = cx / cl, ny = cy / cl, vn = d.vx * nx + d.vy * ny; if (vn < 0) { d.vx -= nx * vn; d.vy -= ny * vn; } }
}

function predictStep(s, inp, obs, ko) {
  const P = C.player, F = C.field;
  let mx = inp.dx / 127, my = inp.dy / 127;
  const l = Math.hypot(mx, my); if (l > 1) { mx /= l; my /= l; }
  const a = (inp.btn & 1) ? P.kickAccel : P.accel;
  s.vx += mx * a; s.vy += my * a;
  s.x += s.vx; s.y += s.vy; s.vx *= P.damping; s.vy *= P.damping;
  for (const o of obs) collideSelf(s, P.r, P.invMass, P.bCoef, o);
  for (const o of posts) collideSelf(s, P.r, P.invMass, P.bCoef, o);
  const bb = C.boundB;
  plane(s, P.r, 1, 0, F.boundW, bb); plane(s, P.r, -1, 0, F.boundW, bb);
  plane(s, P.r, 0, 1, F.boundH, bb); plane(s, P.r, 0, -1, F.boundH, bb);
  if (ko.on) kickoffConstrain(s, P.r, s.team, ko.team);
}

// ------------------------------------------------------- sabit adım -----
function clientTick() {
  pollGamepad();
  let mx = input.mx, my = input.my;
  let kx = 0, ky = 0;
  if (keys.has('ArrowLeft') || keys.has('KeyA')) kx -= 1;
  if (keys.has('ArrowRight') || keys.has('KeyD')) kx += 1;
  if (keys.has('ArrowUp') || keys.has('KeyW')) ky -= 1;
  if (keys.has('ArrowDown') || keys.has('KeyS')) ky += 1;
  if (kx || ky) { const l = Math.hypot(kx, ky); mx = kx / l; my = ky / l; }
  if (joy.id !== null) { mx = joy.mx; my = joy.my; }
  const kickNow = input.kick || kickIds.size > 0 || keys.has('KeyX') || keys.has('Space') || keys.has('KeyK') || gp.kick;
  const btn = (kickNow || input.latch) ? 1 : 0;
  input.latch = false;

  const last = snaps[snaps.length - 1];
  if (!ws || ws.readyState !== 1 || !last || !last.pl.has(myId)) return;
  seq = (seq + 1) >>> 0;
  const inp = { seq, dx: Math.round(mx * 127), dy: Math.round(my * 127), btn };
  const b = new ArrayBuffer(8), dv = new DataView(b);
  dv.setUint8(0, 1); dv.setUint32(1, seq, true); dv.setInt8(5, inp.dx); dv.setInt8(6, inp.dy); dv.setUint8(7, btn);
  ws.send(b);
  pending.push(inp);
  if (pred) {
    predPrev = { ...pred };
    predictStep(pred, inp, obstaclesFrom(last), koState(last));
  }
  meKick = !!btn;
}
let meKick = false;

document.addEventListener('visibilitychange', () => {
  if (document.hidden) { keys.clear(); kickIds.clear(); joy.id = null; input.mx = input.my = 0; clientTick(); }
});

// -------------------------------------------------------------- girdi ----
const touchEl = $('touch'), joyEl = $('joy'), knobEl = $('knob'), kickEl = $('kick');
const JR = 62;
if (!('ontouchstart' in window) && matchMedia('(pointer:fine)').matches) document.body.classList.add('desk');

touchEl.addEventListener('pointerdown', (e) => {
  e.preventDefault();
  if (e.pointerType === 'touch') document.body.classList.remove('desk');
  if (e.pointerType === 'mouse') return;
  if (e.clientX < innerWidth * 0.5) {
    if (joy.id !== null) return;
    joy = { id: e.pointerId, ox: e.clientX, oy: e.clientY, mx: 0, my: 0 };
    joyEl.style.display = 'block'; joyEl.style.left = e.clientX + 'px'; joyEl.style.top = e.clientY + 'px';
    knobEl.style.transform = '';
  } else {
    kickIds.add(e.pointerId); input.latch = true; kickEl.classList.add('on');
    vib(12);
  }
}, { passive: false });

touchEl.addEventListener('pointermove', (e) => {
  if (e.pointerId !== joy.id) return;
  e.preventDefault();
  let dx = e.clientX - joy.ox, dy = e.clientY - joy.oy, len = Math.hypot(dx, dy);
  if (len > JR) {                                      // joystick parmağı takip eder
    joy.ox += dx * (len - JR) / len; joy.oy += dy * (len - JR) / len;
    dx = e.clientX - joy.ox; dy = e.clientY - joy.oy; len = JR;
    joyEl.style.left = joy.ox + 'px'; joyEl.style.top = joy.oy + 'px';
  }
  const dead = JR * 0.12, full = JR * 0.6;
  const m = len < dead ? 0 : Math.min(1, (len - dead) / (full - dead));
  joy.mx = len > 0 ? dx / len * m : 0; joy.my = len > 0 ? dy / len * m : 0;
  knobEl.style.transform = `translate(${dx}px,${dy}px)`;
}, { passive: false });

function endPointer(e) {
  if (e.pointerId === joy.id) { joy.id = null; joy.mx = joy.my = 0; joyEl.style.display = 'none'; }
  if (kickIds.delete(e.pointerId) && kickIds.size === 0) kickEl.classList.remove('on');
}
touchEl.addEventListener('pointerup', endPointer);
touchEl.addEventListener('pointercancel', endPointer);
touchEl.addEventListener('contextmenu', (e) => e.preventDefault());

const GAME_KEYS = new Set(['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'KeyA', 'KeyD', 'KeyW', 'KeyS', 'KeyX', 'Space', 'KeyK']);
addEventListener('keydown', (e) => {
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;
  if (e.code === 'Escape' || e.code === 'Enter' || e.code === 'KeyT') {
    if (joined && room && room.state === 'playing') { showLobby(!lobbyOpen); if (lobbyOpen) $('chatIn').focus(); e.preventDefault(); }
    return;
  }
  if (GAME_KEYS.has(e.code)) {
    if ((e.code === 'KeyX' || e.code === 'Space' || e.code === 'KeyK') && !keys.has(e.code)) input.latch = true;
    keys.add(e.code); e.preventDefault();
  }
});
addEventListener('keyup', (e) => keys.delete(e.code));
addEventListener('blur', () => { keys.clear(); });

const gp = { kick: false };
function pollGamepad() {
  gp.kick = false;
  const pads = navigator.getGamepads ? navigator.getGamepads() : [];
  for (const p of pads) {
    if (!p || !p.connected) continue;
    let x = p.axes[0] || 0, y = p.axes[1] || 0;
    const b = p.buttons;
    if (b[14] && b[14].pressed) x = -1; if (b[15] && b[15].pressed) x = 1;
    if (b[12] && b[12].pressed) y = -1; if (b[13] && b[13].pressed) y = 1;
    const l = Math.hypot(x, y);
    if (l > 0.2 && joy.id === null) { const m = Math.min(1, (l - 0.2) / 0.6); input.mx = x / l * m; input.my = y / l * m; gp.active = true; }
    else if (gp.active) { input.mx = input.my = 0; gp.active = false; }
    const k = [0, 1, 2, 5, 7].some((i) => b[i] && b[i].pressed);
    if (k && !gp.prev) input.latch = true;
    gp.prev = k; gp.kick = k;
    break;
  }
}

function vib(ms) { if (!opt.vib) return; try { if (window.Android && Android.vibrate) Android.vibrate(ms); else if (navigator.vibrate) navigator.vibrate(ms); } catch (e) {} }

// -------------------------------------------------------------- ses ------
let actx = null;
function initAudio() { try { if (!actx) actx = new (window.AudioContext || window.webkitAudioContext)(); if (actx.state === 'suspended') actx.resume(); } catch (e) {} }
function tone(freq, dur, type, vol, slide) {
  if (!opt.snd || !actx) return;
  const t = actx.currentTime, o = actx.createOscillator(), g = actx.createGain();
  o.type = type; o.frequency.setValueAtTime(freq, t);
  if (slide) o.frequency.exponentialRampToValueAtTime(slide, t + dur);
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g); g.connect(actx.destination); o.start(t); o.stop(t + dur + 0.02);
}
let lastKickSnd = 0;
function sndKick() { const n = performance.now(); if (n - lastKickSnd < 40) return; lastKickSnd = n; tone(180, 0.09, 'triangle', 0.35, 60); }
function sndGoal() { [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => tone(f, 0.22, 'square', 0.08), i * 110)); }

// ------------------------------------------------------------- arayüz ----
const TEAM_NAME = ['İzleyici', 'Kırmızı', 'Mavi'];
for (const [id, vals] of [['cfgScore', [0, 1, 2, 3, 4, 5, 7, 10]], ['cfgTime', [0, 1, 2, 3, 4, 5, 7, 10, 15]]]) {
  const sel = $(id);
  for (const v of vals) { const o = document.createElement('option'); o.value = v; o.textContent = v === 0 ? '∞' : (id === 'cfgTime' ? v + ' dk' : v); sel.appendChild(o); }
  sel.onchange = () => send({ t: 'cfg', score: +$('cfgScore').value, time: +$('cfgTime').value });
}
document.querySelectorAll('button.j').forEach((b) => { b.onclick = () => send({ t: 'team', team: +b.dataset.team }); });
$('startBtn').onclick = () => send({ t: 'start' });
$('stopBtn').onclick = () => send({ t: 'stop' });
$('shufBtn').onclick = () => send({ t: 'shuffle' });
$('menuBtn').onclick = () => showLobby(true);
$('closeLobby').onclick = () => showLobby(false);
$('chatSend').onclick = sendChat;
$('chatIn').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') { sendChat(); if (room && room.state === 'playing') { $('chatIn').blur(); showLobby(false); } }
  if (e.key === 'Escape') { $('chatIn').blur(); if (room && room.state === 'playing') showLobby(false); }
});
function sendChat() { const v = $('chatIn').value.trim(); if (v) send({ t: 'chat', msg: v }); $('chatIn').value = ''; }

function showLobby(v) {
  lobbyOpen = v || !room || room.state !== 'playing';
  $('lobby').classList.toggle('hide', !lobbyOpen);
  document.body.classList.toggle('paneled', lobbyOpen);
  if (!lobbyOpen) { joy.id = null; joyEl.style.display = 'none'; }
}

function renderRoom() {
  if (!room) return;
  const playing = room.state === 'playing';
  const meP = room.players.find((p) => p.id === myId);
  const isAdm = room.admin === myId;
  $('rname').textContent = room.name;
  $('rstate').textContent = playing ? 'Maç oynanıyor' : 'Lobi';
  for (const t of [0, 1, 2]) {
    const ul = $('t' + t); ul.innerHTML = '';
    for (const p of room.players.filter((x) => x.team === t)) {
      const li = document.createElement('li');
      if (p.id === myId) li.className = 'me';
      const n = document.createElement('span'); n.className = 'n'; n.textContent = (p.id === room.admin ? '★ ' : '') + p.name;
      const pg = document.createElement('span'); pg.className = 'p'; pg.textContent = p.ping ? p.ping + 'ms' : '';
      li.append(n, pg);
      if (isAdm) for (const to of [1, 0, 2]) {
        if (to === t) continue;
        const b = document.createElement('button'); b.textContent = ['İ', 'K', 'M'][to];
        b.className = to === 1 ? 'red' : to === 2 ? 'blue' : '';
        b.title = TEAM_NAME[to] + "'ya taşı";
        b.onclick = () => send({ t: 'move', id: p.id, team: to });
        li.appendChild(b);
      }
      ul.appendChild(li);
    }
  }
  $('adm').classList.toggle('hide', !isAdm);
  $('startBtn').classList.toggle('hide', playing);
  $('stopBtn').classList.toggle('hide', !playing);
  $('cfgScore').value = room.cfg.score; $('cfgTime').value = room.cfg.time;
  const adm = room.players.find((p) => p.id === room.admin);
  $('notAdm').textContent = isAdm ? '' : (adm ? `Oda yöneticisi: ${adm.name} (maçı o başlatır)` : '');
  $('closeLobby').classList.toggle('hide', !playing);
  $('hud').classList.toggle('hide', !playing);
  $('menuBtn').classList.toggle('hide', !playing);
  document.body.classList.toggle('ingame', playing);
  document.body.classList.toggle('me-play', playing && !!meP && meP.team !== 0);
  const wasPlaying = renderRoom.playing;
  renderRoom.playing = playing;
  if (playing && !wasPlaying) showLobby(false);
  if (!playing) showLobby(true);
  $('kick').style.display = $('joyHint').style.display = (playing && meP && meP.team !== 0) ? '' : 'none';
}

function fmt(s) { s = Math.max(0, s | 0); return String(s / 60 | 0).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0'); }
function renderHud() {
  $('sr').textContent = hud.score[0]; $('sb').textContent = hud.score[1];
  $('clock').textContent = hud.ot ? '+' + fmt(hud.time - hud.limit) : fmt(hud.time);
  $('clock').classList.toggle('ot', hud.ot);
}

function addChat(m) {
  const line = document.createElement('div');
  if (m.from) {
    const b = document.createElement('b'); b.textContent = m.from + ': ';
    b.style.color = m.team === 1 ? '#ff8a7e' : m.team === 2 ? '#8ab8ff' : '#cfe0d2';
    line.append(b, document.createTextNode(m.msg));
  } else { line.className = 's'; line.textContent = m.msg; }
  const lc = $('lchat'); lc.appendChild(line.cloneNode(true));
  while (lc.children.length > 80) lc.firstChild.remove();
  lc.scrollTop = lc.scrollHeight;
  const cl = $('chatlog'); cl.appendChild(line);
  while (cl.children.length > 5) cl.firstChild.remove();
  setTimeout(() => { line.style.opacity = '0'; setTimeout(() => line.remove(), 700); }, 6000);
}

let bannerT = 0;
function banner(html, color, ms) {
  const b = $('banner'); b.innerHTML = html; b.style.color = color; b.classList.add('show');
  clearTimeout(bannerT); bannerT = setTimeout(() => b.classList.remove('show'), ms);
}
function esc(s) { return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
function onGoal(m) {
  hud.score = m.score; renderHud();
  const col = m.team === 1 ? '#ff6f61' : '#5aa0ff';
  let sub = '';
  if (m.scorer) sub = m.own ? `${esc(m.scorer)} (kendi kalesine)` : esc(m.scorer) + (m.assist ? ` · asist ${esc(m.assist)}` : '');
  banner(`GOOOL!<small>${sub}</small>`, col, 2400);
  sndGoal(); vib(80);
}
function onOver(m) {
  snaps = []; pred = null; pending.length = 0;
  if (m.winner) banner(`${TEAM_NAME[m.winner].toUpperCase()} KAZANDI<small>${m.score[0]} - ${m.score[1]}</small>`, m.winner === 1 ? '#ff6f61' : '#5aa0ff', 4000);
  else if (m.reason === 'admin') banner('Maç durduruldu', '#fff', 2000);
}

// ------------------------------------------------------------- çizim -----
let dpr = 1, VW = 0, VH = 0;
function resize() {
  dpr = Math.min(window.devicePixelRatio || 1, 2.5);
  VW = innerWidth; VH = innerHeight;
  cv.width = Math.round(VW * dpr); cv.height = Math.round(VH * dpr);
}
addEventListener('resize', resize); resize();

function lerp(a, b, t) { return a + (b - a) * t; }

function sample(rt) {
  if (!snaps.length) return null;
  while (snaps.length > 2 && snaps[1].tick <= rt - 2) snaps.shift();
  let a = snaps[0], b = null;
  for (let i = 0; i < snaps.length; i++) {
    if (snaps[i].tick <= rt) a = snaps[i]; else { b = snaps[i]; break; }
  }
  const out = { flags: a.flags, ball: null, pl: new Map() };
  if (b && a.tick <= rt) {
    const t = (rt - a.tick) / (b.tick - a.tick);
    out.flags = b.flags;
    const bounce = Math.hypot(b.ball.x - a.ball.x, b.ball.y - a.ball.y) > 60;
    out.ball = bounce ? { ...b.ball } : { x: lerp(a.ball.x, b.ball.x, t), y: lerp(a.ball.y, b.ball.y, t) };
    for (const [id, pb] of b.pl) {
      const pa = a.pl.get(id);
      if (pa && Math.hypot(pb.x - pa.x, pb.y - pa.y) < 60) out.pl.set(id, { ...pb, x: lerp(pa.x, pb.x, t), y: lerp(pa.y, pb.y, t) });
      else out.pl.set(id, { ...pb });
    }
  } else {
    const k = Math.max(0, Math.min(4, rt - a.tick));           // kısa dış değerleme
    out.ball = { x: a.ball.x + a.ball.vx * k, y: a.ball.y + a.ball.vy * k };
    for (const [id, p] of a.pl) out.pl.set(id, { ...p, x: p.x + p.vx * k, y: p.y + p.vy * k });
  }
  return out;
}

function nameOf(id) { if (!room) return ''; const p = room.players.find((x) => x.id === id); return p ? p.name : ''; }

const COL = { 1: '#ef5a4c', 2: '#3d8bff' };
function drawField(F) {
  // dış alan
  ctx.fillStyle = '#2f5a35'; ctx.fillRect(-F.boundW - 40, -F.boundH - 40, 2 * F.boundW + 80, 2 * F.boundH + 80);
  // çim şeritleri
  const n = 14, sw = 2 * F.W / n;
  for (let i = 0; i < n; i++) { ctx.fillStyle = i % 2 ? '#3f7a44' : '#448249'; ctx.fillRect(-F.W + i * sw, -F.H, sw + 0.5, 2 * F.H); }
  ctx.strokeStyle = 'rgba(255,255,255,.75)'; ctx.lineWidth = 2.5;
  ctx.strokeRect(-F.W, -F.H, 2 * F.W, 2 * F.H);
  ctx.beginPath(); ctx.moveTo(0, -F.H); ctx.lineTo(0, F.H); ctx.stroke();
  ctx.beginPath(); ctx.arc(0, 0, F.centerR, 0, Math.PI * 2); ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,.75)'; ctx.beginPath(); ctx.arc(0, 0, 3, 0, Math.PI * 2); ctx.fill();
  for (const s of [-1, 1]) {
    ctx.strokeRect(s > 0 ? F.W - 80 : -F.W, -110, 80, 220);
    ctx.beginPath(); ctx.arc(s * (F.W - 80), 0, 40, s > 0 ? Math.PI / 2 : -Math.PI / 2, s > 0 ? Math.PI * 1.5 : Math.PI / 2); ctx.stroke();
    // file
    const x0 = s > 0 ? F.W : -F.W - F.goalDepth;
    ctx.fillStyle = 'rgba(255,255,255,.10)'; ctx.fillRect(x0, -F.goalY, F.goalDepth, 2 * F.goalY);
    ctx.save(); ctx.strokeStyle = 'rgba(255,255,255,.22)'; ctx.lineWidth = 1; ctx.beginPath();
    for (let y = -F.goalY; y <= F.goalY; y += 10) { ctx.moveTo(x0, y); ctx.lineTo(x0 + F.goalDepth, y); }
    for (let x = 0; x <= F.goalDepth; x += 10) { ctx.moveTo(x0 + x, -F.goalY); ctx.lineTo(x0 + x, F.goalY); }
    ctx.stroke(); ctx.restore();
    ctx.strokeStyle = s < 0 ? COL[1] : COL[2]; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(s * F.W, -F.goalY); ctx.lineTo(s * (F.W + F.goalDepth), -F.goalY);
    ctx.lineTo(s * (F.W + F.goalDepth), F.goalY); ctx.lineTo(s * F.W, F.goalY); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,.75)'; ctx.lineWidth = 2.5;
  }
  for (const p of posts) {
    ctx.fillStyle = '#f4f4f4'; ctx.strokeStyle = '#1b1b1b'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  }
}

function drawPlayer(x, y, team, kick, name, me) {
  const r = C.player.r;
  if (me) { ctx.strokeStyle = 'rgba(255,255,255,.45)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x, y, r + 6, 0, Math.PI * 2); ctx.stroke(); }
  ctx.fillStyle = COL[team] || '#999';
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
  ctx.lineWidth = 2.5; ctx.strokeStyle = kick ? '#ffffff' : '#101010'; ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,.95)'; ctx.font = 'bold 11px system-ui,sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText((name || '?').slice(0, 2).toUpperCase(), x, y + 0.5);
  ctx.font = '600 10px system-ui,sans-serif'; ctx.fillStyle = 'rgba(255,255,255,.85)';
  ctx.fillText(name || '', x, y + r + 10);
}

function frame(now) {
  requestAnimationFrame(frame);
  let dt = now - lastFrame; lastFrame = now;
  if (dt > 250) { dt = 0; tickAcc = 0; }
  tickAcc += dt;
  let n = 0;
  while (tickAcc >= tickMs && n < 5) { clientTick(); tickAcc -= tickMs; n++; }
  if (n === 5) tickAcc = 0;

  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = '#14241a'; ctx.fillRect(0, 0, cv.width, cv.height);
  if (!C) { drawIdle(); return; }
  const F = C.field;
  const s = Math.min(VW / (2 * (F.W + F.goalDepth + 14)), VH / (2 * (F.boundH + 12)));
  ctx.setTransform(dpr * s, 0, 0, dpr * s, dpr * VW / 2, dpr * (VH / 2 + 6));
  drawField(F);

  const target = clockOff === null ? 0 : (now + clockOff) / tickMs;
  const want = Math.max(1.5, Math.min(10, 1.2 + 2.5 * jitter / tickMs));
  delayS += (want - delayS) * 0.02;
  const st = sample(target - delayS);
  if (!st) return;

  const ko = !!(st.flags & 1) && !(st.flags & 4);
  if (ko) {
    ctx.fillStyle = (st.flags & 2) ? 'rgba(61,139,255,.16)' : 'rgba(239,90,76,.16)';
    ctx.beginPath(); ctx.arc(0, 0, F.centerR, 0, Math.PI * 2); ctx.fill();
  }

  const decay = Math.exp(-dt / 70);
  err.x *= decay; err.y *= decay;
  const alpha = Math.min(1, tickAcc / tickMs);
  for (const [id, p] of st.pl) {
    let x = p.x, y = p.y, kick = p.kick;
    if (id === myId && opt.pred && pred && predPrev) {
      x = lerp(predPrev.x, pred.x, alpha) + err.x; y = lerp(predPrev.y, pred.y, alpha) + err.y; kick = meKick;
    }
    drawPlayer(x, y, p.team, kick, nameOf(id), id === myId);
  }
  const b = st.ball, br = C.ball.r;
  ctx.fillStyle = '#ffffff'; ctx.strokeStyle = '#101010'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(b.x, b.y, br, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
}

function drawIdle() {
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const g = ctx.createRadialGradient(VW / 2, VH / 2, 10, VW / 2, VH / 2, Math.max(VW, VH) * 0.7);
  g.addColorStop(0, '#2c5a33'); g.addColorStop(1, '#14241a');
  ctx.fillStyle = g; ctx.fillRect(0, 0, VW, VH);
}

requestAnimationFrame(frame);
