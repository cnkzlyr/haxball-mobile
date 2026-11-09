#!/usr/bin/env python3
"""
PASLA - arkadaşlarla online oynanan 2D fizik futbolu (sunucu)

  * Sadece Python standart kütüphanesi: pip kurulumu GEREKMEZ
    (Termux / Android, Windows, macOS, Linux, Raspberry Pi ... hepsinde çalışır)
  * Otoriter fizik: 60 tick/sn, sunucu her tick durumu yayınlar
  * Aynı porttan hem oyun sayfasını (HTTP) hem oyunu (WebSocket) sunar
  * TCP_NODELAY + küçük ikili paketler + yavaş istemciye paket biriktirmeme = düşük ping

Kullanım:
  python3 server.py                     # 0.0.0.0:8080
  python3 server.py --port 9000 --score 5 --time 5 --name "Halı Saha"
Sonra telefonlarda tarayıcıdan ekrana yazılan adresi açın (ör. http://192.168.1.20:8080).
"""

import argparse
import asyncio
import base64
import hashlib
import json
import math
import os
import random
import socket
import struct
import sys
import time

WEB_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "web")

TICK_RATE = 60
DT = 1.0 / TICK_RATE

# ---------------------------------------------------------------- sabitler --
FIELD = {
    "W": 370.0,         # saha yarı genişliği (kale çizgisi x = ±W)
    "H": 170.0,         # saha yarı yüksekliği
    "goalY": 64.0,      # kale ağzı yarı genişliği
    "goalDepth": 30.0,  # file derinliği
    "postR": 8.0,       # direk yarıçapı
    "centerR": 75.0,    # orta yuvarlak
    "boundW": 420.0,    # oyuncuların gidebileceği dış sınır
    "boundH": 200.0,
}
PLAYER = {
    "r": 15.0, "invMass": 0.5, "damping": 0.96, "bCoef": 0.5,
    "accel": 0.1, "kickAccel": 0.07, "kickStrength": 5.0, "kickRange": 4.0,
}
BALL = {"r": 10.0, "invMass": 1.0, "damping": 0.99, "bCoef": 0.5}
WALL_B = 1.0          # saha kenarı sekme katsayısı (top ile çarpılır)
BOUND_B = 0.1         # oyuncu dış sınırı
GOAL_PAUSE = int(2.5 * TICK_RATE)
MAX_PLAYERS = 20
TEAM_SPEC, TEAM_RED, TEAM_BLUE = 0, 1, 2

# ikili protokol
C2S_INPUT = 1
S2C_STATE = 1
HDR = struct.Struct("<BIBffffB")      # tip, tick, bayrak, top x y vx vy, oyuncu sayısı
PREC = struct.Struct("<BBffffI")      # id, bayrak, x y vx vy, son girdi no
INP = struct.Struct("<BIbbB")         # tip, girdi no, dx, dy, tuşlar


class Disc:
    __slots__ = ("x", "y", "vx", "vy", "r", "inv", "damp", "b")

    def __init__(self, x, y, r, inv, damp, b):
        self.x, self.y, self.vx, self.vy = x, y, 0.0, 0.0
        self.r, self.inv, self.damp, self.b = r, inv, damp, b


def collide(a, b):
    """İki diski çarpıştır. Çarpışma olduysa True."""
    dx, dy = a.x - b.x, a.y - b.y
    rr = a.r + b.r
    d2 = dx * dx + dy * dy
    if d2 >= rr * rr or d2 == 0.0:
        return False
    tot = a.inv + b.inv
    if tot == 0.0:
        return False
    d = math.sqrt(d2)
    nx, ny = dx / d, dy / d
    fa = a.inv / tot
    fb = 1.0 - fa
    ov = rr - d
    a.x += nx * ov * fa
    a.y += ny * ov * fa
    b.x -= nx * ov * fb
    b.y -= ny * ov * fb
    rv = (a.vx - b.vx) * nx + (a.vy - b.vy) * ny
    if rv < 0.0:
        imp = rv * (1.0 + a.b * b.b)
        a.vx -= nx * imp * fa
        a.vy -= ny * imp * fa
        b.vx += nx * imp * fb
        b.vy += ny * imp * fb
    return True


def plane(d, nx, ny, dist, bounce):
    """Disk, n·p <= dist yarı düzleminin içinde kalsın (n birim normal, içe bakmıyor)."""
    pen = d.x * nx + d.y * ny + d.r - dist
    if pen > 0.0:
        d.x -= nx * pen
        d.y -= ny * pen
        vn = d.vx * nx + d.vy * ny
        if vn > 0.0:
            d.vx -= nx * vn * (1.0 + bounce)
            d.vy -= ny * vn * (1.0 + bounce)


def unmask(data, mask):
    n = len(data)
    if n == 0:
        return data
    m = (mask * (n // 4 + 1))[:n]
    return (int.from_bytes(data, "little") ^ int.from_bytes(m, "little")).to_bytes(n, "little")


# ------------------------------------------------------------ WebSocket ----
class WS:
    MAX_FRAME = 8192

    def __init__(self, reader, writer):
        self.r, self.w = reader, writer
        self.closed = False

    async def recv(self):
        """(opcode, payload) döndürür; bağlantı kapanırsa None."""
        buf = b""
        first_op = None
        while True:
            h = await self.r.readexactly(2)
            fin = h[0] & 0x80
            op = h[0] & 0x0F
            masked = h[1] & 0x80
            n = h[1] & 0x7F
            if n == 126:
                n = struct.unpack("!H", await self.r.readexactly(2))[0]
            elif n == 127:
                n = struct.unpack("!Q", await self.r.readexactly(8))[0]
            if n > self.MAX_FRAME or not masked:
                return None
            mask = await self.r.readexactly(4)
            data = unmask(await self.r.readexactly(n), mask)
            if op >= 8:                       # kontrol çerçeveleri
                if op == 8:
                    return None
                if op == 9:
                    self._send(0xA, data)
                continue
            if first_op is None:
                first_op = op
            buf += data
            if len(buf) > self.MAX_FRAME:
                return None
            if fin:
                return first_op, buf

    def _send(self, op, payload):
        if self.closed:
            return
        n = len(payload)
        if n < 126:
            hdr = struct.pack("!BB", 0x80 | op, n)
        elif n < 65536:
            hdr = struct.pack("!BBH", 0x80 | op, 126, n)
        else:
            hdr = struct.pack("!BBQ", 0x80 | op, 127, n)
        try:
            self.w.write(hdr + payload)
        except Exception:
            self.closed = True

    def send_text(self, s):
        self._send(1, s.encode("utf-8"))

    def send_bin(self, b):
        self._send(2, b)

    def backlog(self):
        try:
            return self.w.transport.get_write_buffer_size()
        except Exception:
            return 0


# --------------------------------------------------------------- oyuncu ----
class Client:
    def __init__(self, cid, ws):
        self.id = cid
        self.ws = ws
        self.name = None
        self.team = TEAM_SPEC
        self.order = 0
        self.disc = None
        self.inputs = []          # (seq, dx, dy, btn) kuyruğu
        self.seq = 0              # en son uygulanan girdi no
        self.mx = self.my = 0.0
        self.kick_held = False
        self.kick_armed = False
        self.kicked = False       # bu tick şut çekti
        self.ping = 0
        self.last_chat = 0.0
        self.goals = 0


# ----------------------------------------------------------------- oyun ----
class Game:
    def __init__(self, name, score_limit, time_limit):
        self.name = name
        self.cfg = {"score": score_limit, "time": time_limit}
        self.clients = {}
        self.next_order = 0
        self.admin = None
        self.state = "lobby"
        self.tick = 0
        self.ball = Disc(0.0, 0.0, BALL["r"], BALL["invMass"], BALL["damping"], BALL["bCoef"])
        W, gy = FIELD["W"], FIELD["goalY"]
        self.posts = [Disc(sx * W, sy * gy, FIELD["postR"], 0.0, 1.0, 0.5)
                      for sx in (-1, 1) for sy in (-1, 1)]
        self.reset_match()

    # ---- yardımcılar
    def reset_match(self):
        self.score = [0, 0]
        self.game_ticks = 0
        self.overtime = False
        self.kickoff = True
        self.kickoff_team = TEAM_RED
        self.goal_pause = 0
        self.ending = None
        self.last_touch = None
        self.prev_touch = None
        self.last_sec = -1

    def players(self):
        return [c for c in self.clients.values() if c.disc is not None]

    def joined(self):
        return [c for c in self.clients.values() if c.name is not None]

    def free_id(self):
        for i in range(1, 256):
            if i not in self.clients:
                return i
        return None

    def spawn(self, c, index=None):
        side = -1.0 if c.team == TEAM_RED else 1.0
        if index is None:
            index = sum(1 for p in self.players() if p.team == c.team and p is not c)
        offsets = [0, -1, 1, -2, 2, -3, 3, -4, 4, -5, 5]
        k = offsets[index % len(offsets)]
        col = index // len(offsets)
        if c.disc is None:
            c.disc = Disc(0, 0, PLAYER["r"], PLAYER["invMass"], PLAYER["damping"], PLAYER["bCoef"])
        c.disc.x = side * (FIELD["W"] * 0.5 + col * 40)
        c.disc.y = k * 55.0
        c.disc.vx = c.disc.vy = 0.0

    def reset_positions(self):
        self.ball.x = self.ball.y = self.ball.vx = self.ball.vy = 0.0
        for team in (TEAM_RED, TEAM_BLUE):
            ps = sorted((p for p in self.players() if p.team == team), key=lambda p: p.order)
            for i, p in enumerate(ps):
                self.spawn(p, i)
        self.kickoff = True
        self.last_touch = self.prev_touch = None

    # ---- mesajlaşma
    def send(self, c, obj):
        c.ws.send_text(json.dumps(obj, separators=(",", ":"), ensure_ascii=False))

    def broadcast(self, obj):
        s = json.dumps(obj, separators=(",", ":"), ensure_ascii=False)
        for c in self.joined():
            c.ws.send_text(s)

    def room_info(self):
        return {
            "t": "room", "name": self.name, "state": self.state, "admin": self.admin,
            "score": self.score, "cfg": self.cfg,
            "players": [{"id": c.id, "name": c.name, "team": c.team, "ping": c.ping}
                        for c in sorted(self.joined(), key=lambda c: c.order)],
        }

    def broadcast_room(self):
        self.broadcast(self.room_info())

    def hud(self):
        return {"t": "hud", "score": self.score, "time": self.game_ticks // TICK_RATE,
                "limit": self.cfg["time"] * 60, "ot": self.overtime}

    def chat(self, text, frm=None, team=0):
        self.broadcast({"t": "chat", "from": frm, "team": team, "msg": text})

    # ---- oyuncu yönetimi
    def pick_admin(self):
        js = sorted(self.joined(), key=lambda c: c.order)
        self.admin = js[0].id if js else None

    def set_team(self, c, team):
        if team not in (0, 1, 2) or team == c.team:
            return
        c.team = team
        if self.state == "playing":
            if team == TEAM_SPEC:
                c.disc = None
            else:
                self.spawn(c)
        c.inputs.clear()
        self.broadcast_room()

    def start(self):
        if self.state == "playing":
            return
        if not any(c.team != TEAM_SPEC for c in self.joined()):
            return
        self.state = "playing"
        self.reset_match()
        for c in self.joined():
            c.goals = 0
            c.disc = None
            if c.team != TEAM_SPEC:
                c.disc = Disc(0, 0, PLAYER["r"], PLAYER["invMass"], PLAYER["damping"], PLAYER["bCoef"])
        self.kickoff_team = TEAM_RED
        self.reset_positions()
        self.broadcast_room()
        self.broadcast(self.hud())
        self.chat("Maç başladı! İyi oyunlar ⚽")

    def stop(self, winner=None, reason=None):
        if self.state != "playing":
            return
        self.state = "lobby"
        for c in self.clients.values():
            c.disc = None
        self.broadcast({"t": "over", "winner": winner, "score": self.score, "reason": reason})
        self.broadcast_room()

    def shuffle(self):
        js = self.joined()
        random.shuffle(js)
        for i, c in enumerate(js):
            self.set_team(c, TEAM_RED if i % 2 == 0 else TEAM_BLUE)
        self.broadcast_room()

    # ---- girdiler
    def press(self, c, btn):
        held = bool(btn & 1)
        if held and not c.kick_held:
            c.kick_armed = True
        if not held:
            c.kick_armed = False
        c.kick_held = held

    def consume_input(self, c):
        q = c.inputs
        if not q:
            return                                  # son girdi tekrar kullanılır
        while len(q) > 3:                           # gecikme birikmesin
            seq, dx, dy, btn = q.pop(0)
            self.press(c, btn)
            c.seq = seq
        seq, dx, dy, btn = q.pop(0)
        mx, my = dx / 127.0, dy / 127.0
        l = math.hypot(mx, my)
        if l > 1.0:
            mx, my = mx / l, my / l
        c.mx, c.my = mx, my
        self.press(c, btn)
        c.seq = seq

    def touch(self, c):
        if self.last_touch is None or self.last_touch[0] != c.id:
            self.prev_touch = self.last_touch
        self.last_touch = (c.id, c.team, c.name)

    # ---- fizik adımı
    def step(self):
        if self.state != "playing":
            return
        self.tick += 1
        ball = self.ball
        ps = self.players()
        P = PLAYER

        for c in ps:
            self.consume_input(c)
            d = c.disc
            a = P["kickAccel"] if c.kick_held else P["accel"]
            d.vx += c.mx * a
            d.vy += c.my * a
            c.kicked = False
            if c.kick_armed:
                dx, dy = ball.x - d.x, ball.y - d.y
                dist = math.hypot(dx, dy)
                if dist > 0.0 and dist - d.r - ball.r < P["kickRange"]:
                    nx, ny = dx / dist, dy / dist
                    ball.vx += nx * P["kickStrength"] * ball.inv
                    ball.vy += ny * P["kickStrength"] * ball.inv
                    c.kick_armed = False
                    c.kicked = True
                    self.touch(c)

        discs = [ball] + [c.disc for c in ps]
        for d in discs:
            d.x += d.vx
            d.y += d.vy
            d.vx *= d.damp
            d.vy *= d.damp

        n = len(discs)
        for i in range(n):
            a = discs[i]
            for j in range(i + 1, n):
                if collide(a, discs[j]) and i == 0:
                    self.touch(ps[j - 1])
        for d in discs:
            for p in self.posts:
                collide(d, p)

        self.ball_walls()
        BW, BH = FIELD["boundW"], FIELD["boundH"]
        for c in ps:
            d = c.disc
            plane(d, 1, 0, BW, BOUND_B)
            plane(d, -1, 0, BW, BOUND_B)
            plane(d, 0, 1, BH, BOUND_B)
            plane(d, 0, -1, BH, BOUND_B)
            if self.kickoff and self.goal_pause == 0:
                kickoff_constrain(d, c.team, self.kickoff_team)

        if self.kickoff and self.goal_pause == 0 and (ball.vx != 0.0 or ball.vy != 0.0):
            self.kickoff = False

        if self.goal_pause > 0:
            self.goal_pause -= 1
            if self.goal_pause == 0:
                if self.ending is not None:
                    w = self.ending
                    self.ending = None
                    self.stop(w, "score")
                    return
                self.reset_positions()
        else:
            self.check_goal()
            if not self.kickoff and self.state == "playing":
                self.game_ticks += 1
                self.check_time()

        sec = self.game_ticks // TICK_RATE
        if sec != self.last_sec:
            self.last_sec = sec
            self.broadcast(self.hud())

    def ball_walls(self):
        b = self.ball
        W, H, gy, depth = FIELD["W"], FIELD["H"], FIELD["goalY"], FIELD["goalDepth"]
        bounce = b.b * WALL_B
        plane(b, 0, 1, H, bounce)
        plane(b, 0, -1, H, bounce)
        if abs(b.x) > W:                  # filenin içinde
            s = 1.0 if b.x > 0 else -1.0
            plane(b, s, 0, W + depth, bounce * 0.3)
            plane(b, 0, 1, gy, bounce * 0.3)
            plane(b, 0, -1, gy, bounce * 0.3)
        elif abs(b.y) > gy:               # kale ağzı dışında: kenar çizgisi duvar
            plane(b, 1, 0, W, bounce)
            plane(b, -1, 0, W, bounce)

    def check_goal(self):
        b = self.ball
        if abs(b.x) <= FIELD["W"] or abs(b.y) >= FIELD["goalY"]:
            return
        team = TEAM_RED if b.x > 0 else TEAM_BLUE      # sağ kale mavinin
        self.score[team - 1] += 1
        scorer, own, assist = None, False, None
        if self.last_touch:
            cid, tteam, name = self.last_touch
            scorer = name
            own = tteam != team
            sc = self.clients.get(cid)
            if sc and not own:
                sc.goals += 1
            if not own and self.prev_touch and self.prev_touch[1] == team:
                assist = self.prev_touch[2]
        self.broadcast({"t": "goal", "team": team, "scorer": scorer, "own": own,
                        "assist": assist, "score": self.score})
        self.kickoff_team = TEAM_BLUE if team == TEAM_RED else TEAM_RED
        self.goal_pause = GOAL_PAUSE
        lim = self.cfg["score"]
        if (lim > 0 and self.score[team - 1] >= lim) or self.overtime:
            self.ending = team
        self.broadcast(self.hud())

    def check_time(self):
        lim = self.cfg["time"] * 60 * TICK_RATE
        if lim <= 0 or self.overtime or self.game_ticks < lim:
            return
        r, bl = self.score
        if r != bl:
            self.stop(TEAM_RED if r > bl else TEAM_BLUE, "time")
        else:
            self.overtime = True
            self.chat("Süre bitti, berabere! Altın gol uzatması ⚡")
            self.broadcast(self.hud())

    # ---- yayın
    def state_packet(self):
        b = self.ball
        flags = (1 if self.kickoff else 0) | (2 if self.kickoff_team == TEAM_BLUE else 0) | \
                (4 if self.goal_pause > 0 else 0)
        ps = self.players()
        parts = [HDR.pack(S2C_STATE, self.tick & 0xFFFFFFFF, flags, b.x, b.y, b.vx, b.vy, len(ps))]
        for c in ps:
            d = c.disc
            f = c.team | (4 if c.kick_held else 0) | (8 if c.kicked else 0)
            parts.append(PREC.pack(c.id, f, d.x, d.y, d.vx, d.vy, c.seq & 0xFFFFFFFF))
        return b"".join(parts)

    def broadcast_state(self):
        pkt = self.state_packet()
        for c in self.joined():
            if c.ws.backlog() < 32768:        # yavaş istemcide eski kare biriktirme
                c.ws.send_bin(pkt)

    async def loop(self):
        nxt = time.perf_counter()
        while True:
            now = time.perf_counter()
            steps = 0
            while now >= nxt and steps < 6:
                self.step()
                nxt += DT
                steps += 1
            if now - nxt > 0.25:
                nxt = now
            if steps and self.state == "playing":
                self.broadcast_state()
            await asyncio.sleep(max(0.0, nxt - time.perf_counter()))

    # ---- istemci mesajları
    def on_json(self, c, m):
        t = m.get("t")
        if t == "ping":
            try:
                c.ping = max(0, min(9999, int(m.get("p", 0))))
            except (TypeError, ValueError):
                pass
            self.send(c, {"t": "pong", "c": m.get("c")})
            return
        if t == "join":
            if c.name is not None:
                return
            name = str(m.get("name") or "").strip()[:16] or "Oyuncu%d" % c.id
            existing = {x.name for x in self.joined()}
            base, k = name, 2
            while name in existing:
                name = "%s%d" % (base[:14], k)
                k += 1
            c.name = name
            c.order = self.next_order
            self.next_order += 1
            if self.admin is None:
                self.admin = c.id
            self.send(c, {"t": "welcome", "id": c.id, "tick": TICK_RATE,
                          "field": FIELD, "player": PLAYER, "ball": BALL,
                          "bounds": {"boundB": BOUND_B}})
            self.broadcast_room()
            self.send(c, self.hud())
            self.chat("%s katıldı" % name)
            return
        if c.name is None:
            return
        if t == "team":
            try:
                self.set_team(c, int(m.get("team")))
            except (TypeError, ValueError):
                pass
        elif t == "chat":
            msg = str(m.get("msg") or "").strip()[:140]
            now = time.monotonic()
            if msg and now - c.last_chat > 0.4:
                c.last_chat = now
                self.chat(msg, c.name, c.team)
        elif c.id == self.admin:
            if t == "start":
                self.start()
            elif t == "stop":
                self.stop(None, "admin")
            elif t == "shuffle":
                self.shuffle()
            elif t == "cfg":
                try:
                    self.cfg["score"] = max(0, min(20, int(m.get("score", self.cfg["score"]))))
                    self.cfg["time"] = max(0, min(30, int(m.get("time", self.cfg["time"]))))
                except (TypeError, ValueError):
                    pass
                self.broadcast_room()
                self.broadcast(self.hud())
            elif t == "move":
                tgt = self.clients.get(m.get("id"))
                if tgt and tgt.name is not None:
                    try:
                        self.set_team(tgt, int(m.get("team")))
                    except (TypeError, ValueError):
                        pass

    def on_bin(self, c, data):
        if len(data) == INP.size and data[0] == C2S_INPUT and c.name is not None:
            _, seq, dx, dy, btn = INP.unpack(data)
            if c.disc is not None:
                c.inputs.append((seq, dx, dy, btn))
                if len(c.inputs) > 30:
                    del c.inputs[:-3]
            else:
                c.seq = seq

    def remove(self, c):
        if self.clients.pop(c.id, None) is None:
            return
        if c.name is not None:
            self.chat("%s ayrıldı" % c.name)
        if self.admin == c.id:
            self.pick_admin()
        if self.state == "playing" and not self.players():
            self.stop(None, "empty")
        self.broadcast_room()


def kickoff_constrain(d, team, ko_team):
    own = -1.0 if team == TEAM_RED else 1.0      # kendi yarı sahasının işareti
    r, cr = d.r, FIELD["centerR"]
    ox, oy = d.x, d.y
    dist = math.hypot(d.x, d.y)
    if team == ko_team:
        if own * d.x < r and dist > cr - r:
            ax, ay = own * r, d.y                     # orta çizgiye it
            if dist > 0:
                bx, by = d.x / dist * (cr - r), d.y / dist * (cr - r)   # ya da yuvarlağa
            else:
                bx, by = ax, ay
            if (ax - ox) ** 2 + (ay - oy) ** 2 <= (bx - ox) ** 2 + (by - oy) ** 2:
                d.x, d.y = ax, ay
            else:
                d.x, d.y = bx, by
    else:
        if own * d.x < r:
            d.x = own * r
        dist = math.hypot(d.x, d.y)
        lim = cr + r
        if dist < lim:
            if dist == 0:
                d.x, d.y = own * lim, 0.0
            else:
                d.x, d.y = d.x / dist * lim, d.y / dist * lim
    cx, cy = d.x - ox, d.y - oy
    cl = math.hypot(cx, cy)
    if cl > 0:
        nx, ny = cx / cl, cy / cl
        vn = d.vx * nx + d.vy * ny
        if vn < 0:
            d.vx -= nx * vn
            d.vy -= ny * vn


# ----------------------------------------------------------------- HTTP ----
MIME = {
    ".html": "text/html; charset=utf-8", ".js": "application/javascript; charset=utf-8",
    ".css": "text/css; charset=utf-8", ".json": "application/json",
    ".webmanifest": "application/manifest+json", ".svg": "image/svg+xml",
    ".png": "image/png", ".ico": "image/x-icon",
}
WS_GUID = "258EAFA5-E914-47DA-95CA-C5AB0DC85B11"


async def http_response(writer, code, reason, body, ctype="text/plain; charset=utf-8"):
    head = ("HTTP/1.1 %d %s\r\nContent-Type: %s\r\nContent-Length: %d\r\n"
            "Cache-Control: no-cache\r\nConnection: close\r\n\r\n" % (code, reason, ctype, len(body)))
    writer.write(head.encode() + body)
    try:
        await writer.drain()
    except Exception:
        pass
    writer.close()


def make_handler(game):
    async def handle(reader, writer):
        sock = writer.get_extra_info("socket")
        if sock is not None:
            try:
                sock.setsockopt(socket.IPPROTO_TCP, socket.TCP_NODELAY, 1)
            except OSError:
                pass
        try:
            raw = await asyncio.wait_for(reader.readuntil(b"\r\n\r\n"), 10)
        except Exception:
            writer.close()
            return
        lines = raw.decode("latin-1").split("\r\n")
        try:
            method, path, _ = lines[0].split(" ", 2)
        except ValueError:
            writer.close()
            return
        headers = {}
        for ln in lines[1:]:
            if ":" in ln:
                k, v = ln.split(":", 1)
                headers[k.strip().lower()] = v.strip()

        if headers.get("upgrade", "").lower() == "websocket":
            await ws_session(game, reader, writer, headers)
            return

        if method != "GET":
            await http_response(writer, 405, "Method Not Allowed", b"405")
            return
        p = path.split("?", 1)[0]
        if p == "/":
            p = "/index.html"
        full = os.path.normpath(os.path.join(WEB_DIR, p.lstrip("/")))
        if not full.startswith(WEB_DIR + os.sep) or not os.path.isfile(full):
            await http_response(writer, 404, "Not Found", b"404")
            return
        with open(full, "rb") as f:
            body = f.read()
        ctype = MIME.get(os.path.splitext(full)[1], "application/octet-stream")
        await http_response(writer, 200, "OK", body, ctype)

    return handle


async def ws_session(game, reader, writer, headers):
    key = headers.get("sec-websocket-key")
    if not key:
        writer.close()
        return
    accept = base64.b64encode(hashlib.sha1((key + WS_GUID).encode()).digest()).decode()
    writer.write(("HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\n"
                  "Connection: Upgrade\r\nSec-WebSocket-Accept: %s\r\n\r\n" % accept).encode())
    ws = WS(reader, writer)
    cid = game.free_id()
    if cid is None or len(game.clients) >= MAX_PLAYERS:
        ws.send_text(json.dumps({"t": "error", "msg": "Oda dolu"}))
        await asyncio.sleep(0.2)
        writer.close()
        return
    c = Client(cid, ws)
    game.clients[cid] = c
    try:
        while True:
            msg = await ws.recv()
            if msg is None:
                break
            op, data = msg
            if op == 2:
                game.on_bin(c, data)
            elif op == 1:
                try:
                    m = json.loads(data.decode("utf-8"))
                except Exception:
                    continue
                if isinstance(m, dict):
                    game.on_json(c, m)
    except (asyncio.IncompleteReadError, ConnectionError, OSError):
        pass
    finally:
        ws.closed = True
        game.remove(c)
        try:
            writer.close()
        except Exception:
            pass


def local_ips():
    ips = []
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("10.255.255.255", 1))
        ips.append(s.getsockname()[0])
        s.close()
    except OSError:
        pass
    try:
        for info in socket.getaddrinfo(socket.gethostname(), None, socket.AF_INET):
            ip = info[4][0]
            if ip not in ips and not ip.startswith("127."):
                ips.append(ip)
    except OSError:
        pass
    return ips or ["127.0.0.1"]


async def main():
    ap = argparse.ArgumentParser(description="PASLA oyun sunucusu")
    ap.add_argument("--host", default="0.0.0.0")
    ap.add_argument("--port", type=int, default=int(os.environ.get("PORT", 8080)))
    ap.add_argument("--name", default="PASLA Odası")
    ap.add_argument("--score", type=int, default=3, help="gol limiti (0 = sınırsız)")
    ap.add_argument("--time", type=int, default=3, help="süre limiti dakika (0 = sınırsız)")
    args = ap.parse_args()

    game = Game(args.name, args.score, args.time)
    server = await asyncio.start_server(make_handler(game), args.host, args.port)
    print("=" * 52)
    print(" ⚽  PASLA sunucusu çalışıyor  (60 tick/sn)")
    print("=" * 52)
    print(" Aynı Wi-Fi'deki telefonlardan tarayıcıda açın:")
    for ip in local_ips():
        print("    http://%s:%d" % (ip, args.port))
    print(" Bu cihazdan: http://127.0.0.1:%d" % args.port)
    print(" Durdurmak için Ctrl+C")
    print("=" * 52)
    sys.stdout.flush()
    async with server:
        await asyncio.gather(server.serve_forever(), game.loop())


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\nSunucu kapatıldı.")
