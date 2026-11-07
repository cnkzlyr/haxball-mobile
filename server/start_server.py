#!/usr/bin/env python3
"""
⚡ PRO FUTSAL — Tam otomatik HaxBall Headless sunucu başlatıcı

  • Chrome / Chromium'u uzaktan hata ayıklama (CDP) ile başlatır
  • headlesstoken sayfasından token'ı otomatik almaya çalışır
    (olmazsa elle yapıştırmanızı ister ya da --token kullanabilirsiniz)
  • headless sayfasını açar, HBInit bulunan çerçeveyi bulur
  • futsal_bot.js + scaled_maps.json (1v1 - 5v5) yükler
  • Oda linkini ve admin şifresini ekrana yazar, konsol loglarını takip eder

Kullanım:
  python3 start_server.py
  python3 start_server.py --name "⚡ Futsal 7/24" --max-players 14 --admin-password gizli
  python3 start_server.py --token thr1.AAAA... --headless
  HAXBALL_TOKEN=thr1.AAAA... python3 start_server.py
"""

import argparse
import base64
import json
import os
import platform
import re
import shutil
import socket
import struct
import subprocess
import sys
import tempfile
import time
import urllib.request

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
BOT_FILE = os.path.join(SCRIPT_DIR, "futsal_bot.js")
MAPS_FILE = os.path.join(SCRIPT_DIR, "scaled_maps.json")
TOKEN_URL = "https://www.haxball.com/headlesstoken"
HEADLESS_URL = "https://www.haxball.com/headless"


# ---------------------------------------------------------------------------
# Minimal Chrome DevTools Protocol client (stdlib only, no pip install needed)
# ---------------------------------------------------------------------------
class CDP:
    def __init__(self, port, ws_url):
        path = "/" + ws_url.split("/", 3)[3]
        self.sock = socket.create_connection(("127.0.0.1", port), timeout=30)
        key = base64.b64encode(os.urandom(16)).decode()
        req = (
            f"GET {path} HTTP/1.1\r\nHost: 127.0.0.1:{port}\r\n"
            "Upgrade: websocket\r\nConnection: Upgrade\r\n"
            f"Sec-WebSocket-Key: {key}\r\nSec-WebSocket-Version: 13\r\n\r\n"
        )
        self.sock.sendall(req.encode())
        resp = b""
        while b"\r\n\r\n" not in resp:
            chunk = self.sock.recv(4096)
            if not chunk:
                raise ConnectionError("WebSocket el sıkışması başarısız")
            resp += chunk
        if b" 101 " not in resp.split(b"\r\n", 1)[0]:
            raise ConnectionError("WebSocket el sıkışması reddedildi: " + resp.split(b"\r\n", 1)[0].decode(errors="ignore"))
        self.buf = resp.split(b"\r\n\r\n", 1)[1]
        self.next_id = 1
        self.events = []

    def _recv_exact(self, n):
        while len(self.buf) < n:
            chunk = self.sock.recv(65536)
            if not chunk:
                raise ConnectionError("Chrome bağlantısı kapandı")
            self.buf += chunk
        out, self.buf = self.buf[:n], self.buf[n:]
        return out

    def _send_frame(self, payload, opcode=0x1):
        data = payload if isinstance(payload, bytes) else payload.encode("utf-8")
        header = bytearray([0x80 | opcode])
        n = len(data)
        if n <= 125:
            header.append(0x80 | n)
        elif n <= 65535:
            header.append(0x80 | 126)
            header += struct.pack(">H", n)
        else:
            header.append(0x80 | 127)
            header += struct.pack(">Q", n)
        mask = os.urandom(4)
        header += mask
        self.sock.sendall(bytes(header) + bytes(b ^ mask[i % 4] for i, b in enumerate(data)))

    def _read_message(self):
        message = b""
        while True:
            b1, b2 = self._recv_exact(2)
            fin, opcode = b1 & 0x80, b1 & 0x0F
            length = b2 & 0x7F
            if length == 126:
                length = struct.unpack(">H", self._recv_exact(2))[0]
            elif length == 127:
                length = struct.unpack(">Q", self._recv_exact(8))[0]
            mask = self._recv_exact(4) if b2 & 0x80 else None
            data = self._recv_exact(length)
            if mask:
                data = bytes(b ^ mask[i % 4] for i, b in enumerate(data))
            if opcode == 0x9:  # ping
                self._send_frame(data, 0xA)
                continue
            if opcode == 0x8:
                raise ConnectionError("Chrome WebSocket bağlantıyı kapattı")
            if opcode in (0x1, 0x2, 0x0):
                message += data
                if fin:
                    return json.loads(message.decode("utf-8", errors="ignore"))

    def call(self, method, params=None, timeout=60):
        mid = self.next_id
        self.next_id += 1
        self._send_frame(json.dumps({"id": mid, "method": method, "params": params or {}}))
        deadline = time.time() + timeout
        while time.time() < deadline:
            self.sock.settimeout(max(0.1, deadline - time.time()))
            try:
                msg = self._read_message()
            except socket.timeout:
                break
            if msg.get("id") == mid:
                if "error" in msg:
                    raise RuntimeError(f"{method}: {msg['error'].get('message')}")
                return msg.get("result", {})
            self.events.append(msg)
        raise TimeoutError(f"CDP zaman aşımı: {method}")

    def evaluate(self, expr, context_id=None, timeout=60):
        params = {"expression": expr, "awaitPromise": True, "returnByValue": True}
        if context_id is not None:
            params["contextId"] = context_id
        res = self.call("Runtime.evaluate", params, timeout)
        if res.get("exceptionDetails"):
            det = res["exceptionDetails"]
            text = det.get("exception", {}).get("description") or det.get("text")
            raise RuntimeError(text)
        return res.get("result", {}).get("value")

    def poll_event(self, timeout=0.5):
        if self.events:
            return self.events.pop(0)
        self.sock.settimeout(timeout)
        try:
            return self._read_message()
        except socket.timeout:
            return None


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
def find_chrome(explicit=None):
    candidates = [explicit, os.environ.get("CHROME_PATH")]
    for name in ("google-chrome", "google-chrome-stable", "chromium", "chromium-browser", "chrome", "msedge"):
        candidates.append(shutil.which(name))
    system = platform.system()
    if system == "Darwin":
        candidates += [
            "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
            "/Applications/Chromium.app/Contents/MacOS/Chromium",
        ]
    elif system == "Windows":
        for base in (os.environ.get("PROGRAMFILES"), os.environ.get("PROGRAMFILES(X86)"), os.environ.get("LOCALAPPDATA")):
            if base:
                candidates.append(os.path.join(base, "Google", "Chrome", "Application", "chrome.exe"))
                candidates.append(os.path.join(base, "Microsoft", "Edge", "Application", "msedge.exe"))
    for c in candidates:
        if c and os.path.exists(c):
            return c
    return None


def free_port(preferred):
    for port in [preferred] + list(range(preferred + 1, preferred + 50)):
        with socket.socket() as s:
            try:
                s.bind(("127.0.0.1", port))
                return port
            except OSError:
                continue
    raise RuntimeError("Boş port bulunamadı")


def list_targets(port):
    with urllib.request.urlopen(f"http://127.0.0.1:{port}/json", timeout=10) as r:
        return json.loads(r.read().decode("utf-8"))


def wait_for_devtools(port, proc, seconds=20):
    deadline = time.time() + seconds
    while time.time() < deadline:
        if proc.poll() is not None:
            raise RuntimeError("Chrome beklenmedik şekilde kapandı")
        try:
            targets = list_targets(port)
            pages = [t for t in targets if t.get("type") == "page"]
            if pages:
                return pages[0]
        except Exception:
            pass
        time.sleep(0.3)
    raise RuntimeError("Chrome DevTools'a bağlanılamadı")


def navigate(cdp, url, wait=4.0):
    cdp.call("Page.enable")
    cdp.call("Page.navigate", {"url": url})
    deadline = time.time() + 25
    while time.time() < deadline:
        ev = cdp.poll_event(0.5)
        if ev and ev.get("method") == "Page.loadEventFired":
            break
    time.sleep(wait)


def get_token_auto(cdp, attempts=30):
    navigate(cdp, TOKEN_URL, wait=1.5)
    for _ in range(attempts):
        try:
            text = cdp.evaluate("document.body ? document.body.innerText : ''") or ""
            m = re.search(r'Token obtained:\s*"([^"]+)"', text)
            if m:
                return m.group(1)
            can_submit = cdp.evaluate("(function(){var b=document.getElementById('submit');return !!(b && !b.disabled);})()")
            if can_submit:
                cdp.evaluate("document.getElementById('submit').click()")
        except Exception:
            pass
        time.sleep(1.0)
    return None


def find_hbinit_context(cdp, seconds=15):
    """Return the execution context id (or None for the top page) that exposes HBInit."""
    contexts = []
    cdp.call("Runtime.enable")
    deadline = time.time() + seconds
    while time.time() < deadline:
        ev = cdp.poll_event(0.3)
        if ev and ev.get("method") == "Runtime.executionContextCreated":
            contexts.append(ev["params"]["context"]["id"])
        for ctx in list(contexts) + [None]:
            try:
                if cdp.evaluate("typeof HBInit === 'function'", ctx, timeout=5):
                    return ctx, True
            except Exception:
                if ctx in contexts:
                    contexts.remove(ctx)
        time.sleep(0.2)
    return None, False


def watch_console(cdp, proc):
    print("📡 Konsol izleniyor... (Durdurmak için CTRL + C)\n")
    seen_link = False
    while True:
        if proc.poll() is not None:
            print("⚠️ Chrome kapandı, sunucu durdu.")
            return
        try:
            ev = cdp.poll_event(1.0)
        except ConnectionError:
            print("⚠️ Chrome bağlantısı koptu.")
            return
        if not ev:
            continue
        method = ev.get("method")
        if method == "Runtime.consoleAPICalled":
            args = ev["params"].get("args", [])
            parts = []
            for a in args:
                v = a.get("value", a.get("description", ""))
                if isinstance(v, str) and v.startswith("%c"):
                    v = v[2:]
                if isinstance(v, str) and (v.startswith("color:") or v.startswith("color :")):
                    continue
                parts.append(str(v))
            line = " ".join(p for p in parts if p).strip()
            if line:
                print(line)
                if "Oda Linki" in line and not seen_link:
                    seen_link = True
        elif method == "Runtime.exceptionThrown":
            det = ev["params"].get("exceptionDetails", {})
            print("❗ Hata:", det.get("exception", {}).get("description") or det.get("text"))


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------
def main():
    ap = argparse.ArgumentParser(description="Pro Futsal HaxBall Headless sunucusu")
    ap.add_argument("--token", default=os.environ.get("HAXBALL_TOKEN"), help="Headless token (boşsa otomatik alınır)")
    ap.add_argument("--name", default=os.environ.get("ROOM_NAME", "⚡ Pro Futsal 1v1-5v5 | Sıra Sistemi"), help="Oda adı")
    ap.add_argument("--bot-name", default="⚽ Hakem")
    ap.add_argument("--max-players", type=int, default=16)
    ap.add_argument("--password", default=None, help="Oda şifresi (boş = şifresiz)")
    ap.add_argument("--admin-password", default=os.environ.get("ADMIN_PASSWORD", ""), help="!admin şifresi (boş = rastgele)")
    ap.add_argument("--score-limit", type=int, default=3)
    ap.add_argument("--time-limit", type=int, default=3)
    ap.add_argument("--private", action="store_true", help="Oda listesinde gösterme")
    ap.add_argument("--headless", action="store_true", help="Chrome penceresi açmadan çalıştır")
    ap.add_argument("--chrome", default=None, help="Chrome/Chromium yolu")
    ap.add_argument("--port", type=int, default=9222, help="DevTools portu")
    ap.add_argument("--welcome", default="", help="Hoş geldin mesajına eklenecek satır")
    args = ap.parse_args()

    print("=" * 62)
    print("⚡ PRO FUTSAL — OTOMATİK HAXBALL HEADLESS SUNUCU ⚡")
    print("=" * 62)

    chrome = find_chrome(args.chrome)
    if not chrome:
        print("❌ Chrome / Chromium bulunamadı. --chrome ile yolunu verin veya CHROME_PATH ayarlayın.")
        sys.exit(1)

    with open(BOT_FILE, "r", encoding="utf-8") as f:
        bot_js = f.read()
    maps = {}
    if os.path.exists(MAPS_FILE):
        with open(MAPS_FILE, "r", encoding="utf-8") as f:
            maps = json.load(f)
    else:
        print("⚠️ scaled_maps.json bulunamadı, yerleşik yedek haritalar kullanılacak.")

    port = free_port(args.port)
    profile = os.path.join(tempfile.gettempdir(), "profutsal_chrome_profile")
    os.makedirs(profile, exist_ok=True)
    cmd = [
        chrome,
        f"--remote-debugging-port={port}",
        f"--user-data-dir={profile}",
        "--no-first-run",
        "--no-default-browser-check",
        "--disable-features=WebRtcHideLocalIpsWithMdns,IsolateOrigins,site-per-process",
        "--disable-site-isolation-trials",
        "--disable-background-timer-throttling",
        "--disable-renderer-backgrounding",
        "--disable-backgrounding-occluded-windows",
        "--autoplay-policy=no-user-gesture-required",
    ]
    if hasattr(os, "geteuid") and os.geteuid() == 0:
        cmd.append("--no-sandbox")  # Chrome refuses to start as root (common on VPS) without this
    if args.headless:
        cmd.append("--headless=new")
    cmd.append("about:blank")

    print(f"\n[1/4] Chrome başlatılıyor ({os.path.basename(chrome)})...")
    proc = subprocess.Popen(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    try:
        page = wait_for_devtools(port, proc)
        cdp = CDP(port, page["webSocketDebuggerUrl"])

        token = (args.token or "").strip()
        if not token:
            print("[2/4] Token otomatik alınıyor...")
            token = get_token_auto(cdp)
            if not token:
                print("⚠️ Token otomatik alınamadı (reCAPTCHA olabilir).")
                print(f"   Tarayıcıda {TOKEN_URL} adresini açıp token'ı kopyalayın.")
                token = input("   Token'ı buraya yapıştırın: ").strip().strip('"')
        else:
            print("[2/4] Token parametreden alındı.")
        if not token:
            print("❌ Token olmadan oda açılamaz.")
            return
        print(f"✅ Token: {token[:12]}...")

        print("[3/4] Headless sayfası açılıyor...")
        navigate(cdp, HEADLESS_URL, wait=2.0)
        ctx, ok = find_hbinit_context(cdp)
        if not ok:
            print("❌ HBInit bulunamadı. HaxBall sayfası yüklenemedi ya da engellendi.")
            return

        config = {
            "roomName": args.name,
            "botName": args.bot_name,
            "maxPlayers": args.max_players,
            "public": not args.private,
            "password": args.password,
            "token": token,
            "adminPassword": args.admin_password,
            "scoreLimit": args.score_limit,
            "timeLimit": args.time_limit,
            "welcomeExtra": args.welcome,
        }
        prelude = (
            "window.__FUTSAL_CONFIG = " + json.dumps(config, ensure_ascii=False) + ";\n"
            "window.__FUTSAL_MAPS = " + json.dumps(maps, ensure_ascii=False) + ";\n"
        )
        print("[4/4] Futsal botu yükleniyor...")
        cdp.evaluate(prelude + bot_js + "\n;true", ctx)

        print("\n" + "=" * 62)
        print("🚀 SUNUCU YAYINDA! Oda linki ve admin şifresi aşağıda görünecek.")
        print("   Odanın açık kalması için bu pencereyi KAPATMAYIN.")
        print("=" * 62 + "\n")
        watch_console(cdp, proc)
    except KeyboardInterrupt:
        print("\nSunucu kapatılıyor...")
    except Exception as e:
        print("❌ Hata:", e)
    finally:
        try:
            proc.terminate()
            proc.wait(timeout=5)
        except Exception:
            proc.kill()
        print("Kapatıldı.")


if __name__ == "__main__":
    main()
