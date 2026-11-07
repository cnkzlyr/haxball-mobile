# ⚡ Pro Futsal — HaxBall Headless Sunucusu

1v1'den 5v5'e kendiliğinden ölçeklenen, sıra sistemli, canlı spiker anlatımlı futsal odası botu.

## 🚀 Başlatma

### A) Tam otomatik (önerilen)
Gerekenler: Python 3.8+ ve Google Chrome / Chromium. Ek paket kurmanıza gerek yok.

```bash
cd server
python3 start_server.py
```

Başlatıcı Chrome'u açar, token'ı almaya çalışır, headless sayfasını açar, haritaları ve botu yükler. Ardından oda linkini ve **admin şifresini** ekrana yazar. reCAPTCHA yüzünden token otomatik alınamazsa https://www.haxball.com/headlesstoken adresinden token'ı alıp terminale yapıştırmanız istenir.

Sık kullanılan seçenekler:

| Seçenek | Açıklama |
|---|---|
| `--token thr1...` | Token'ı doğrudan verir (veya `HAXBALL_TOKEN` ortam değişkeni) |
| `--name "⚡ Futsal 7/24"` | Oda adı |
| `--admin-password gizli` | `!admin` şifresi (verilmezse her açılışta rastgele üretilir) |
| `--password 1234` | Odaya giriş şifresi |
| `--max-players 14` | Maksimum oyuncu |
| `--score-limit 3 --time-limit 3` | Gol ve süre limiti |
| `--private` | Oda listesinde gösterme |
| `--headless` | Chrome penceresi açmadan çalıştır (sunucu / VPS) |
| `--chrome /yol/chrome` | Chrome yolu (veya `CHROME_PATH`) |
| `--welcome "Discord: ..."` | Hoş geldin mesajına ek satır |
| `--temiz` | Argo spiker anlatımını kapat |

### B) Elle (tarayıcı konsolu)
1. https://www.haxball.com/headlesstoken → token alın.
2. https://www.haxball.com/headless → F12 → Console.
3. `futsal_bot.js` içindeki `CONFIG.token` alanına token'ı yazın, dosyanın tamamını yapıştırıp Enter'a basın.
   (Elle yüklemede `scaled_maps.json` kullanılmaz, yerleşik yedek haritalar devreye girer.)

## 🎮 Özellikler
- **Bot izleyici olarak durur:** odada "🎙️ Spiker" adıyla izleyicide bekler, tüm mesajlar onun ağzından ve olaya göre renkli yazılır.
- **Maç hiç beklemez:** 1 kişi bile olsa maç başlar (ısınma). Rakip gelince maç yeniden başlar, biten maçın ardından yenisi anında başlar.
- **Otomatik saha:** oyuncu sayısına göre 1v1 … 5v5. İlk 25 saniyede veya maç arasında büyür/küçülür; biri çıkınca takımlar 2+ fark açılırsa yeniden kurulur.
- **Sıra sistemi:** kazanan sahada kalır, kaybedenler sıranın sonuna geçer. Takımlar kilitli, maçta çıkan oyuncunun yerine sıradaki girer.
- **Fizik tabanlı olay algılama** (rastgele mesaj yok, her mesajın arkasında gerçek bir olay var):
  - **Şut:** vuruştan sonra topun yönü ve hızıyla kale çizgisine nereden varacağı hesaplanır (isabetli / az farkla dışarı).
  - **Kurtarış:** isabetli şutu kendi kale bölgesinde rakip oyuncu keserse.
  - **Direk:** top gerçek direk diskine çarpıp sekerse; hücum eden takımın vuruşundan sonra ve gol olmadıysa yazılır.
  - **Gol:** golcü, asist (son 6 sn'deki takım arkadaşı pası), mesafe (m), şut hızı (km/s), pas zinciri, hat-trick, kendi kalesine.
  - **Pas / top kapma:** uzun paslar ve top kaptırmalar (sohbeti boğmamak için seyrek).
- **Spiker anlatımı:** argo modu açıkken kaba ve esprili anlatım (anne-bacı ve cinsel küfür yok). `--temiz` veya oyunda `!argo` ile temiz anlatıma geçer.
- **Saha üstü canlı gösterge:** golcünün avatarında gol sayısı, asistçide 🅰️, kurtarışta 🧤, direkte 😱, MVP'de ⭐ birkaç saniye görünür.
- **Maç sonu raporu:** topla oynama yüzdesi, şut ve isabetli şut sayıları, maçın oyuncusu.
- **Kalıcı istatistik:** gol, asist, şut, kurtarış, direk, MVP, galibiyet. `!top` liderlik tabloları.
- AFK algılama, spam koruması, kalıcı ban listesi, admin devri, rastgele admin şifresi.

### Neden sesli spiker ve sahaya canlı yazı yok?
- **Ses:** HaxBall oda botları oyunculara ses gönderemez. Anlatım sohbet mesajlarıyla yapılır; goller bildirim sesiyle gelir.
- **Sahaya canlı yazı:** saha çizimi maç başlamadan sabitlenir, maç sırasında değiştirilemez. Disklerle harf çizmeye çalışmak fiziği bozabileceği için yapılmadı. Bunun yerine oyuncu avatarları canlı gösterge olarak kullanılır.

## 💬 Komutlar

**Oyuncu:** `!yardim`, `!stats [isim]`, `!top [asist|galibiyet|mvp|kurtaris]`, `!sira`, `!afk`, `!geri`, `!admin <şifre>`, `!bb`

**Admin:** `!start`, `!stop`, `!rr` (yeniden başlat), `!pause`, `!swap`, `!harita <1-5>`, `!skor <n>`, `!sure <dk>`, `!argo` (argo aç/kapa), `!kick <isim|#id> [sebep]`, `!ban <isim|#id> [sebep]`, `!unban <isim>`, `!mute <isim> [dk]`, `!unmute <isim>`, `!lock`, `!unlock`, `!duyuru <mesaj>`

## 📁 Dosyalar
- `start_server.py`: otomatik başlatıcı (Chrome DevTools Protocol, yalnızca Python standart kütüphanesi)
- `futsal_bot.js`: oda botu (tek başına konsola da yapıştırılabilir)
- `scaled_maps.json`: 1v1–5v5 ölçekli futsal haritaları
