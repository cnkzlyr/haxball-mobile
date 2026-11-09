# ⚽ PASLA — Arkadaşlarla online fizik futbolu

Kendi fizik motoru olan, telefondan oynanan 2D çok oyunculu futbol. Sunucu **tek bir Python dosyası**,
ek paket gerektirmez; telefonlar oyunu tarayıcıdan açar (kurulum yok).

## 🚀 Hızlı başlangıç

```bash
cd pasla
python3 server.py
```
Ekrana şöyle bir adres yazar: `http://192.168.1.20:8080`.
Aynı Wi-Fi'deki herkes telefonunun tarayıcısında bu adresi açar, takma adını yazar ve girer.
İlk giren **oda yöneticisi (★)** olur: takımları ayarlar, gol/süre limitini seçer, **Maçı Başlat**'a basar.

| Seçenek | Açıklama |
|---|---|
| `--port 8080` | Port (veya `PORT` ortam değişkeni) |
| `--name "Halı Saha"` | Oda adı |
| `--score 3` | Gol limiti (0 = sınırsız) |
| `--time 3` | Süre, dakika (0 = sınırsız). Berabere biterse altın gol uzatması |

### Sunucu hangi cihazda çalışır?
Python 3.7+ olan her yerde: Windows, macOS, Linux, Raspberry Pi, **Android (Termux)**:
```bash
pkg install python git
git clone https://github.com/cnkzlyr/haxball-mobile && cd haxball-mobile/pasla
python server.py
```
Telefon hem sunucu hem oyuncu olabilir: Termux'ta sunucuyu açın, aynı telefonun tarayıcısında `http://127.0.0.1:8080` açın.
(Telefon hotspot açarsa, arkadaşlar o hotspot'a bağlanıp oynayabilir — modem bile gerekmez.)

## 🌍 Farklı şehirlerden oynamak
- **Tailscale / ZeroTier (önerilen):** Herkes ücretsiz uygulamayı kurar, aynı ağa girer, sunucunun Tailscale IP'si ile bağlanır. Doğrudan bağlantı olduğu için ping düşüktür.
- **Port yönlendirme:** Modemden 8080 TCP portunu sunucu cihaza yönlendirin; arkadaşlar `http://DIŞ_IP:8080` ile girer.
- **Tünel (cloudflared, ngrok, playit.gg):** Kolay ama araya sunucu girdiği için ping biraz artar. `https://` adresi verirseniz istemci otomatik `wss://` kullanır.

En düşük ping için sunucuyu oyunculara coğrafi olarak en yakın / en iyi internete sahip cihazda açın.

## 🎮 Kontroller
- **Dokunmatik:** Ekranın sol yarısı yüzen analog joystick (nereye dokunursan orada çıkar), sağ yarısı **ŞUT**.
- **Klavye:** Yön tuşları / WASD, şut: X · Space · K. Enter/Esc: menü ve sohbet.
- **Gamepad:** Sol analog / D-Pad + A (veya RT).
- Tarayıcı menüsünden **"Ana ekrana ekle"** derseniz tam ekran uygulama gibi açılır.

## ⚙️ Fizik ve düşük gecikme nasıl çalışıyor?
- **Fizik:** Diskler hız, kütle (ters kütle), sürtünme (damping) ve sekme katsayısıyla simüle edilir. Oyuncu-top-direk çarpışmaları
  momentum korunumlu itme ile çözülür. Şut tuşu basılıyken oyuncu yavaşlar; top menzildeyken basışta bir kez vurulur.
  Santrada rakip takım orta yuvarlağa ve rakip yarı sahaya giremez.
- **Otoriter sunucu, 60 tick/sn:** Tüm fizik sunucuda hesaplanır, her tick ~25 baytlık ikili paket yayınlanır → hile ve senkron sorunu yok.
- **Girdi tahmini:** Kendi oyuncun girdiyi gönderdiğin anda ekranda hareket eder; sunucu cevabı gelince fark sessizce yumuşatılır.
  (115 ms ping ile yapılan testte ortalama düzeltme 0.3 piksel.) Menüden kapatılabilir.
- **Uyarlanabilir interpolasyon:** Diğer oyuncular ve top, ağ titremesine göre ayarlanan küçük bir tampon (≈25–40 ms) ile pürüzsüz çizilir.
- **Ağ:** WebSocket + `TCP_NODELAY`; yavaş bağlantıya eski kareler biriktirilmez, sunucuda girdi kuyruğu en fazla 3 kare tutulur.

## 📁 Dosyalar
```
pasla/
├── server.py          # HTTP + WebSocket + fizik + oda yönetimi (sadece stdlib)
└── web/
    ├── index.html     # arayüz (giriş, lobi, HUD, kontroller)
    ├── game.js        # ağ, tahmin, interpolasyon, çizim, dokunmatik/klavye/gamepad
    ├── manifest.webmanifest, icon.svg
```
