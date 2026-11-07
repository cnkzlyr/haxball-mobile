# ⚡ Pro Futsal — HaxBall Headless Sunucusu

1v1'den 5v5'e kendiliğinden ölçeklenen, sıra sistemli, istatistik tutan futsal odası botu.

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

### B) Elle (tarayıcı konsolu)
1. https://www.haxball.com/headlesstoken → token alın.
2. https://www.haxball.com/headless → F12 → Console.
3. `futsal_bot.js` içindeki `CONFIG.token` alanına token'ı yazın, dosyanın tamamını yapıştırıp Enter'a basın.
   (Elle yüklemede `scaled_maps.json` kullanılmaz, yerleşik yedek haritalar devreye girer.)

## 🎮 Özellikler
- **Otomatik saha ölçekleme:** oyuncu sayısına göre 1v1, 2v2, ... 5v5 futsal sahası. Maç ortasında saha değişmez; sadece golsüz ilk 15 saniyede veya maç arasında büyür/küçülür.
- **Sıra sistemi:** kazanan sahada kalır, kaybedenler sıranın sonuna geçer. Takımlar kilitli, bot dağıtır. Maç sırasında çıkan oyuncunun yerine sıradaki girer.
- **Gol analizi:** golcü, asist, kendi kalesine gol, şut hızı, direkten dönen toplar, hat-trick, maçın oyuncusu (MVP), gol yemeden bitirme.
- **Kalıcı istatistikler:** tarayıcı profilinde saklanır, sunucu yeniden başlasa da kalır. `!top` liderlik tablosu.
- **AFK algılama:** maçta hareketsiz kalan oyuncu önce uyarılır, sonra izleyiciye alınır.
- **Spam koruması:** kısa sürede çok mesaj atan oyuncu geçici susturulur.
- **Kalıcı ban listesi** (hesap, bağlantı ve isim ile) ve `!unban`.
- **Admin devri:** admin çıkarsa odadaki en eski oyuncu admin olur.

## 💬 Komutlar

**Oyuncu:** `!yardim`, `!stats [isim]`, `!top [asist|galibiyet|mvp]`, `!sira`, `!afk`, `!geri`, `!admin <şifre>`, `!bb`

**Admin:** `!start`, `!stop`, `!rr` (yeniden başlat), `!pause`, `!swap`, `!harita <1-5>`, `!skor <n>`, `!sure <dk>`, `!kick <isim|#id> [sebep]`, `!ban <isim|#id> [sebep]`, `!unban <isim>`, `!mute <isim> [dk]`, `!unmute <isim>`, `!lock`, `!unlock`, `!duyuru <mesaj>`

## 📁 Dosyalar
- `start_server.py`: otomatik başlatıcı (Chrome DevTools Protocol, yalnızca Python standart kütüphanesi)
- `futsal_bot.js`: oda botu (tek başına konsola da yapıştırılabilir)
- `scaled_maps.json`: 1v1–5v5 ölçekli futsal haritaları
