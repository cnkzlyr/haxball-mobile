# ⚽ HaxBall Mobile & Desktop (Android, Windows, macOS, Linux)

<div align="center">

## 📲 [👉 TÜM SÜRÜMLERİ İNDİR (v2.8.0 Son Sürüm) 👈](https://github.com/cnkzlyr/haxball-mobile/releases/latest)

| Platform | İndirme Bağlantısı | Format |
|---|---|---|
| **Android** | [📲 haxball-v2.8.0.apk](https://github.com/cnkzlyr/haxball-mobile/releases/download/v2.8.0/haxball-v2.8.0.apk) | `.apk` (Telefon & Tablet) |
| **Windows** | [🪟 HaxBall-Setup-2.8.0.exe](https://github.com/cnkzlyr/haxball-mobile/releases/download/v2.8.0/HaxBall-Setup-2.8.0.exe) | `.exe` (Installer & Portable) |
| **macOS** | [🍏 HaxBall-2.8.0.dmg](https://github.com/cnkzlyr/haxball-mobile/releases/download/v2.8.0/HaxBall-2.8.0.dmg) | `.dmg` & `.zip` (Apple Silicon & Intel) |
| **Linux (Debian/Ubuntu)** | [🐧 haxball_2.8.0_all.deb](https://github.com/cnkzlyr/haxball-mobile/releases/download/v2.8.0/haxball_2.8.0_all.deb) | `.deb` (Debian, Ubuntu, Mint) |
| **Linux (Fedora/RHEL)** | [🐧 haxball-2.8.0.rpm](https://github.com/cnkzlyr/haxball-mobile/releases/download/v2.8.0/haxball-2.8.0.rpm) | `.rpm` & `.tar.gz` (Fedora, openSUSE) |

[![Son Sürüm](https://img.shields.io/github/v/release/cnkzlyr/haxball-mobile?label=S%C3%BCr%C3%BCm&style=for-the-badge&color=blue)](https://github.com/cnkzlyr/haxball-mobile/releases/latest)
[![Platformlar](https://img.shields.io/badge/Platform-Android%20%7C%20Windows%20%7C%20macOS%20%7C%20Linux-brightgreen.svg?style=for-the-badge)](https://github.com/cnkzlyr/haxball-mobile)

</div>

> **High-Performance Multiplatform Online & Offline HaxBall Client**
> *Play the legendary HTML5 soccer game HaxBall on Android, Windows, macOS, and Linux with Smart Stutter-Tapping Joystick, Zero-Gboard soft virtual keyboard, and desktop native performance!*

---

## 🌟 Google & Web Search Keywords (SEO)
`haxball mobil` • `haxball desktop` • `haxball indir` • `haxball macos` • `haxball windows exe` • `haxball linux deb rpm` • `haxball android apk` • `haxball touch controller` • `haxball virtual joystick` • `haxball tapping engine`

---

## 📱 Genel Bakış (Overview)

**HaxBall Client**, popüler 2D çok oyunculu fizik tabanlı futbol oyunu [HaxBall](https://www.haxball.com)'u hem mobil cihazlarda (Android telefonlar ve tabletler) hem de masaüstünde (Windows, macOS, Linux) en yüksek akıcılıkta oynamak için geliştirilmiş açık kaynaklı çok platformlu istemcidir.

---

## 🚀 v2.8.0 ile Gelen Büyük Yenilikler

### 🕹️ 1. Akıllı PC Klavye Joystick Motoru (Stutter-Tapping Engine)
- **Klavyedeki Gibi Saniyede Defalarca Tık Tık Basma Fiziği:** Bilgisayarda ok tuşlarıyla top sürerken ve dönüş yaparken saniyede birkaç kez tuşa bas-bırak (stutter-tapping) yapılır. Yeni analog joystick motoru, parmağınızı sürüklediğiniz yöne ve mesafeye göre bu tık tık basma döngüsünü milisaniyelik hassasiyetle hesaplar ve uygular!
- **Çift Tuş Gönderimi (Ok Tuşları + WASD):** Oyun sunucusuna hem Ok Tuşları (`ArrowUp`, `ArrowDown`, `ArrowLeft`, `ArrowRight`) hem de `WASD` eşzamanlı aktarılır; tüm oda konfigürasyonlarında %100 uyumluluk.
- **Kesintisiz Depar & Milimetrik Dönüş:** Joystick %85 ve üzerine çekildiğinde kesintisiz sprint (continuous hold), ara açılarda ise milimetrik kavisler için insan klavye hızında (8-10 Hz) dinamik tıklama vuruşları uygulanır.
- **0ms Anında İlk Vuruş Tepkisi:** Dokunduğunuz an bekleme olmadan ilk vuruş (strike) gönderilir, topa ani müdahalelerde sıfır gecikme!

### ⌨️ 2. Sistem Klavyesi (Gboard) Engellemesi & Şık Sanal Klavye
- **Gboard Çakışması Engellendi:** Chat açıldığında veya kullanıcı adı yazma alanına tıklandığında Android sistem klavyesinin (Gboard) ekrana fırlayıp oyunu ve sanal klavyeyi kapatması tamamen engellendi (`inputmode="none"` & native focus isolation).
- **Evrensel Sanal Klavye:** Hem oda içi sohbet hem de kullanıcı adı (nickname) ve oda şifresi girişleri, ekranı kapatmayan şeffaf sanal klavye üzerinden rahatça yazılır.
- **İsteğe Bağlı Sistem Klavyesi:** Kullanıcı isterse sanal klavyedeki yeşil 📱 butonuna basarak sistem klavyesini açabilir.

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
