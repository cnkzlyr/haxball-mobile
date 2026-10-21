# ⚽ HaxBall Mobile (Android APK)

<div align="center">

## 📲 [👉 DOĞRUDAN APK İNDİR (v2.7.1 Son Sürüm) 👈](https://github.com/cnkzlyr/haxball-mobile/releases/download/v2.7.1/haxball-debug.apk)
### *(Telefonunuzdan bu linke tıklayın, inen dosyayı açıp "Yükle"ye basın!)*

[![Hemen İndir](https://img.shields.io/badge/📲_Hemen_İndir-HaxBall_v2.7.1.apk-10b981?style=for-the-badge&logo=android&logoColor=white)](https://github.com/cnkzlyr/haxball-mobile/releases/download/v2.7.1/haxball-debug.apk)
[![Son Sürüm](https://img.shields.io/github/v/release/cnkzlyr/haxball-mobile?label=S%C3%BCr%C3%BCm&style=for-the-badge&color=blue)](https://github.com/cnkzlyr/haxball-mobile/releases/latest)
[![Platform](https://img.shields.io/badge/Platform-Android%205.0%2B%20%7C%20iOS%20Web-brightgreen.svg?style=for-the-badge)](https://github.com/cnkzlyr/haxball-mobile)

</div>

> **High-Performance Online & Offline HaxBall Mobile Client for Android**
> *Play the legendary HTML5 soccer game HaxBall on mobile phones & tablets with PWM micro-angle analog joystick, 8-way D-Pad, Bluetooth Gamepad support, in-game minimal virtual keyboard, 8-second instant replay goal clipping, and automatic celebration!*

---

## 🌟 Google & Web Search Keywords (SEO)
`haxball mobil` • `haxball mobile` • `haxball android apk` • `haxball telefonda oyna` • `haxball touch controller` • `haxball apk indir` • `haxball mobile client` • `haxball virtual joystick` • `haxball gamepad support`

---

## 📱 Genel Bakış (Overview)

**HaxBall Mobile**, popüler 2D çok oyunculu fizik tabanlı futbol oyunu [HaxBall](https://www.haxball.com)'u mobil cihazlarda (Android telefonlar ve tabletler) en yüksek akıcılıkta oynamak için sıfırdan geliştirilmiş özel bir mobil istemcidir. 

Masaüstü klavyelerine ihtiyaç duymadan, modern dokunmatik ekranlar için özel olarak optimize edilmiş sanal kumanda (virtual gamepad), ultra geniş saha görüşü, tek tuşla taktik/racon sohbeti ve tam ekran donanım hızlandırması sunar.

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
