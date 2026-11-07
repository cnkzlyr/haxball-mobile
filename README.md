# ⚽ HaxBall Mobile & Desktop (Android, Windows, macOS, Linux)

<div align="center">

## 📲 [👉 TÜM SÜRÜMLERİ İNDİR (v2.9.0 Son Sürüm) 👈](https://github.com/cnkzlyr/haxball-mobile/releases/latest)

| Platform | İndirme Bağlantısı | Format |
|---|---|---|
| **Android** | [📲 haxball-v2.9.0.apk](https://github.com/cnkzlyr/haxball-mobile/releases/download/v2.9.0/haxball-v2.9.0.apk) | `.apk` (Telefon & Tablet) |
| **Windows** | [🪟 HaxBall-Setup-2.9.0.exe](https://github.com/cnkzlyr/haxball-mobile/releases/download/v2.9.0/HaxBall-Setup-2.9.0.exe) · [Taşınabilir](https://github.com/cnkzlyr/haxball-mobile/releases/download/v2.9.0/HaxBall-Portable-2.9.0.exe) | `.exe` (Installer & Portable) |
| **macOS (Apple Silicon)** | [🍏 HaxBall-2.9.0-arm64.dmg](https://github.com/cnkzlyr/haxball-mobile/releases/download/v2.9.0/HaxBall-2.9.0-arm64.dmg) | `.dmg` & `.zip` |
| **macOS (Intel)** | [🍏 HaxBall-2.9.0-x64.dmg](https://github.com/cnkzlyr/haxball-mobile/releases/download/v2.9.0/HaxBall-2.9.0-x64.dmg) | `.dmg` & `.zip` |
| **Linux (Debian/Ubuntu)** | [🐧 haxball_2.9.0_amd64.deb](https://github.com/cnkzlyr/haxball-mobile/releases/download/v2.9.0/haxball_2.9.0_amd64.deb) | `.deb` (Debian, Ubuntu, Mint) |
| **Linux (Fedora/RHEL)** | [🐧 haxball-2.9.0.x86_64.rpm](https://github.com/cnkzlyr/haxball-mobile/releases/download/v2.9.0/haxball-2.9.0.x86_64.rpm) | `.rpm` (Fedora, openSUSE) |
| **Linux (Tüm dağıtımlar)** | [🐧 HaxBall-2.9.0.AppImage](https://github.com/cnkzlyr/haxball-mobile/releases/download/v2.9.0/HaxBall-2.9.0.AppImage) | `.AppImage` |

[![Son Sürüm](https://img.shields.io/github/v/release/cnkzlyr/haxball-mobile?label=S%C3%BCr%C3%BCm&style=for-the-badge&color=blue)](https://github.com/cnkzlyr/haxball-mobile/releases/latest)
[![Platformlar](https://img.shields.io/badge/Platform-Android%20%7C%20Windows%20%7C%20macOS%20%7C%20Linux-brightgreen.svg?style=for-the-badge)](https://github.com/cnkzlyr/haxball-mobile)

</div>

> **High-Performance Multiplatform Online & Offline HaxBall Client**
> *Play the legendary HTML5 soccer game HaxBall on Android, Windows, macOS, and Linux with Smart-Hold 8-Way Joystick, Zero-Gboard soft virtual keyboard, and desktop native performance!*

---

## 🌟 Google & Web Search Keywords (SEO)
`haxball mobil` • `haxball desktop` • `haxball indir` • `haxball macos` • `haxball windows exe` • `haxball linux deb rpm` • `haxball android apk` • `haxball touch controller` • `haxball virtual joystick` • `haxball tapping engine`

---

## 📱 Genel Bakış (Overview)

**HaxBall Client**, popüler 2D çok oyunculu fizik tabanlı futbol oyunu [HaxBall](https://www.haxball.com)'u hem mobil cihazlarda (Android telefonlar ve tabletler) hem de masaüstünde (Windows, macOS, Linux) en yüksek akıcılıkta oynamak için geliştirilmiş açık kaynaklı çok platformlu istemcidir.

---

## 🚀 v2.9.0 ile Gelen Büyük Yenilikler

### 🕹️ 1. Akıllı Joystick Motoru (Smart-Hold Engine v2.9.0)
- **Tam Hız, Sıfır Yavaşlama:** Gidilen yönün ok tuşu sürekli basılı kalır; HaxBall'da tuşu basılı tutan bir PC oyuncusu kadar hızlı koşarsınız. Eski "tık-tık" motoru tuşları bırakıp oyuncuyu yavaşlatıyordu, kaldırıldı.
- **Klavyeci Gibi Anlık Yön Geçişi:** Joystick döndükçe yeni yön tuşu basılır, eski tuş aynı karede bırakılır; arada hareketsiz an kalmaz. Dokunuşa 0 kare gecikmeyle tepki verilir.
- **Titremesiz 8 Yön:** Yön sınırlarında histerezis bandı sayesinde tuşlar kendi kendine bas-çek yapmaz.
- **İnce Açı Modu (İsteğe Bağlı):** Ana eksen basılı kalır, yan eksen açıya göre ritmik vuruş yapar; 8 sabit yön yerine ara açılarla koşabilirsiniz. Ayarlar → Joystick Yön Modu.
- **Canlı 4 Yönlü Ok İndikatörü (`▲`, `▼`, `◀`, `▶`):** Joystick halkası üzerinde o an basılı ok tuşları ışıklı gösterilir.
- **Çift Tuş Gönderimi (Ok Tuşları + WASD) & 0ms İlk Vuruş:** Oyun sunucusuna hem Ok Tuşları hem de `WASD` eşzamanlı aktarılır; dokunduğunuz an bekleme olmadan ilk vuruş (strike) gönderilir.

### ⌨️ 2. %100 Gboard (Sistem Klavyesi) Engellemesi & Gelişmiş Sanal Klavye
- **Native WebView Gboard Kilidi:** Android `WebView.onCreateInputConnection` seviyesinde sistem klavyesi (Gboard) tamamen devre dışı bırakıldı; chat, kullanıcı adı, oda şifresi veya arama alanına dokunulduğunda Gboard kesinlikle açılmaz.
- **Shift / Büyük Harf (`⇧`) & Evrensel Sanal Klavye:** Sanal klavyeye Türkçe karakter destekli (`İ, I, Ğ, Ü, Ş, Ö, Ç`) Shift/Büyük Harf tuşu eklendi; oyun içindeki tüm metin kutularıyla canlı çalışır.
- **Lobi & Menü Otomatik Gizleme:** Oda listesi, kullanıcı adı ekranı ve ESC menüsünde joystick ve şut butonları otomatik gizlenir, yalnızca maç sahasında görünür.

### 💻 3. Çok Platformlu Masaüstü Sürümleri (Windows, macOS, Linux)
- **Windows:** `.exe` Kurulum Sihirbazı (NSIS) ve Taşınabilir (Portable) sürüm.
- **macOS:** Apple Silicon (M1/M2/M3) ve Intel için `.dmg` & `.zip`.
- **Linux:** Debian/Ubuntu için `.deb`, Fedora/RHEL/openSUSE için `.rpm`, evrensel `.AppImage` ve taşınabilir `.tar.gz`.
- **Donanım Hızlandırma & Düşük Gecikme:** WebRTC zero-copy, GPU rasterization ve 120Hz/60Hz monitör desteği.

---

## ✨ v2.7.0 Öne Çıkan Özellikler (Key Features)

### 💬 1. Anlık 0ms Sohbet & 120 FPS Avatar Üstü Konuşma Balonları (Canvas Hook)
- **0ms Gecikmesiz Event-Driven Sohbet:** WebRTC üzerinden gelen sohbet paketleri `MutationObserver` ile anında yakalanır, gecikme sıfıra indirilir.
- **Avatarla Birlikte Hareket Eden Baloncuklar:** Bir oyuncu mesaj yazdığında, konuşma balonu doğrudan HTML5 Canvas motoruna enjekte edilerek oyuncunun dairesi/avatarı üzerine çizilir. Oyuncu koştukça baloncuk 120 FPS akıcılıkta avatarla birlikte pürüzsüzce kayar!
- **Kompakt Tipografi:** Kullanıcının isteği doğrultusunda avatar puntolarından bile daha küçük (8.5px), şık ve okunabilir tasarım; sahayı ve skorbordu asla kapatmaz.
- **1 Saniye Sonra Pürüzsüz Kaybolma:** Mesaj tam 1 saniye (1050ms) sahadaki avatarın üstünde görünür ve yumuşak bir alfa geçişiyle kaybolur.
- **Akıllı Bot & Sistem Mesajı Filtreleme:** Discord davet linkleri, sunucu bot duyuruları (`(1576P)` reyting komutları, admin logları) sahadaki avatar balonlarını tetiklemez; sadece gerçek insan oyuncuların sohbetleri avatar üstünde gösterilir.

### 📜 2. Sol Mini Sohbet Akışı (Joystick İle Sıfır Çakışma)
- **5-8 Satırlık Canlı Akış:** Bot ve sistem mesajları dahil tüm oda trafiği sol taraftaki yarı saydam estetik bulutta akar.
- **Sıfır Dokunma Çakışması (`pointer-events: none`):** Sol başparmağınızla joystick'i çevirirken sohbet penceresi dokunmaları asla yakalamaz, oyun kontrolünüz sekteye uğramaz.
- **Kompakt Ping & FPS Rozeti:** Sol alttaki 100 piksellik kaba yeşil grafik kaldırılarak yerine sade 9.5px Ping & FPS rozeti yerleştirildi, sohbet penceresiyle çakışma tamamen ortadan kaldırıldı.
- **%100 Tertemiz Saha Görünümü:** Oyunun varsayılan alt siyah sohbet kutusu tamamen gizlendi, saha görüşü maksimuma çıkarıldı.

### 🚀 3. Canlı Kod Güncelleme Motoru (Hot-OTA Engine)
- **Sıfır APK İndirme:** Ayarlar'dan tek dokunuşla GitHub'daki en güncel JavaScript ve CSS sürümleri indirilir, 0.5 saniyede oyun içi canlı güncellenir.
- **Oda Admini Sürükle & Bırak Koruması:** Oda lobisindeyken (Red / Blue / Spectators) oyun butonları ve joystick otomatik gizlenir, adminler oyuncuları takımlar arasında engelsizce sürükleyebilir.

### 🕹️ 4. PWM Analog Joystick & 8-Yönlü D-Pad
- **PWM (Pulse-Width Modulation) Mikro Açı Simülasyonu:** HaxBall motoru yalnızca dijital W/A/S/D kabul etmesine rağmen, 60/120Hz Bresenham PWM algoritması sayesinde parmağınızın analog açısına göre (örneğin $20^\circ$ veya $70^\circ$) mikro sinyaller üreterek topa pürüzsüz kavisler vermenizi sağlar.
- **Genişletilmiş Dokunmatik Bölge (48vw):** Ekranın sol yarısının tamamı joystick hareket alanıdır; parmağınız köşeden taşsa bile dokunma takibi kopmaz.
- **8-Yönlü Retro D-Pad Seçeneği:** Dokunmatik joystick yerine klasik çapraz tuşları tercih edenler için Ayarlar'dan seçilebilir 8 yönlü D-Pad.
- **Kalibrasyon Ayarları:** Hassasiyet (%50 - %150) ve Ölü Bölge (5px - 22px) ayarları.

### 🎮 5. Bluetooth & USB Gamepad Desteği
- **Tak & Çalıştır:** Xbox Wireless Controller, PlayStation DualSense / DualShock 4 ve standart Bluetooth/OTG kolları otomatik tanınır.
- **Varsayılan Tuş Dizilimi:**
  - **Sol Analog / D-Pad:** Oyuncu Hareketi (360° PWM destekli)
  - **(A) / Cross / RT / RB:** Şut / Vuruş (Space)
  - **(X) / Square:** Son 8 Saniyeyi Video Klip Kaydet
  - **(Y) / Triangle:** Otomatik "hll" Raconu Gönder
  - **Select / Back:** Hızlı Chat Menüsü
  - **Start:** Ayarlar Menüsü

### ⌨️ 6. Gboard Boyutlarında Şeffaf Sanal Klavye
- **Sahayı Kapatmayan Tasarım:** Ekranı karartmayan, neon çerçeveli, dokunsal titreşim (haptic feedback) destekli ferah sanal klavye.
- **Hızlı Jargon Çipleri:** `hll`, `sa`, `as`, `gg`, `lag`, `xd`, `pas ver`, `kaleci kal`.

### 🎥 7. Bozulmayan İkiz Kaydedici (Twin Recorders) & Video Klip
- **Sıfır Bozulma (Pristine WebM/MP4):** İkiz dönüşümlü MediaRecorder mimarisi ile her video dosyasının EBML/MP4 container başlıkları eksiksiz kaydedilir.
- **Oyun İçi Önizleme & Paylaşım:** Gol attıktan sonra videoyu uygulama içinde anında izleyebilir veya paylaşabilirsiniz.

### 🎉 8. Havai Fişek & Alevli Avatar Kutlaması
- Skorbord değiştiğinde 65 parçacıklı havai fişek patlaması, ritmik titreşim ve ortada alevli avatar rozeti belirir.

---

## ⚖️ Telif Hakları, Lisans & Güvenlik (Copyright & Fair Use)

- **HaxBall Telif Hakkı:** HaxBall oyununun motoru, fizik mekanikleri ve markası **Mario Carbajal (basro)**'a aittir.
- **Bu İstemcinin Durumu:** Bu proje, HaxBall'un kamuya açık web sürümünü (`html5.haxball.com`) WebView üzerinden açan, mobil cihazlar için harici kontroller, ergonomik arayüz ve erişilebilirlik sağlayan **bağımsız, açık kaynaklı bir topluluk istemcisidir (3rd Party Community Client)**.
- **Telif Güvenliği:** Oyun dosyaları tersine mühendislikle kırılmamış veya sunucu emülatörü yapılmamıştır; resmi HaxBall sunucularına bağlanır. Ticari bir gelir amacı güdülmemektedir.

---

## 🛠️ Kurulum & Derleme (Installation & Build)

### Doğrudan APK İndirme
En son derlenmiş APK dosyasını sayfanın en üstündeki bağlantıdan veya [Releases](../../releases) sekmesinden indirebilirsiniz.

### Termux ile Sıfırdan Derleme
```bash
apk-builder build haxball
apk-builder deploy haxball
```

---

## 📄 Lisans (License)
Bu mobil arayüz ve istemci kodu [MIT Lisansı](LICENSE) altındadır. HaxBall fikri mülkiyeti Mario Carbajal'a aittir.
