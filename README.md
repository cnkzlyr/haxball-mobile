# ⚽ HaxBall Mobile (Android APK)

> **High-Performance Online & Offline HaxBall Mobile Client for Android**
> *Play the legendary HTML5 soccer game HaxBall on mobile phones & tablets with a custom zero-drift virtual touch gamepad, Wild Rift-style action controls, wide-angle stadium zoom, and instant banter chat!*

[![Platform](https://img.shields.io/badge/Platform-Android%205.0%2B-brightgreen.svg)](https://github.com/cnkzlyr/haxball-mobile)
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Build](https://img.shields.io/badge/Build-Termux%20APK%20Builder-orange.svg)](https://github.com/cnkzlyr/haxball-mobile)

---

## 🌟 Google & Web Search Keywords (SEO)
`haxball mobil` • `haxball mobile` • `haxball android apk` • `haxball telefonda oyna` • `haxball touch controller` • `haxball apk indir` • `haxball mobile client` • `haxball virtual joystick` • `haxball game android`

---

## 📱 Genel Bakış (Overview)

**HaxBall Mobile**, popüler 2D çok oyunculu fizik tabanlı futbol oyunu [HaxBall](https://www.haxball.com)'u mobil cihazlarda (Android telefonlar ve tabletler) en yüksek akıcılıkta oynamak için sıfırdan geliştirilmiş özel bir mobil istemcidir. 

Masaüstü klavyelerine ihtiyaç duymadan, modern dokunmatik ekranlar için özel olarak optimize edilmiş sanal kumanda (virtual gamepad), ultra geniş saha görüşü, tek tuşla taktik/racon sohbeti ve tam ekran donanım hızlandırması sunar.

---

## ✨ Öne Çıkan Özellikler (Key Features)

### 🕹️ 1. Wild Rift / MOBA Stili Sanal Kontroller
- **Sıfır Sapmalı (Zero-Drift) Joystick:** Dinamik alt-piksel geometrik merkez hesaplaması (`getBoundingClientRect`) ve 12px ölü bölge (deadzone) ile parmağınızı koyduğunuz anda sıfır sapma ile çalışır.
- **Tek ve Güçlü Şut Butonu:** Gerçek HaxBall fiziğine uygun, dokunmatik basma animasyonlu ve hafif haptik titreşimli büyük ana vuruş butonu.
- **Ekran Kenarı Yerleşimi:** Başparmak ergonomisine uygun olarak ekranın en alt köşelerine yerleştirilmiş, oyun sahasını kapatmayan şeffaf kontrol katmanı.

### 💬 2. Akıllı Sohbet & HaxBall Raconu (Smart Banter Chat)
- **Başparmak Erişimi:** Şut butonunun hemen üstünde yer alan yüzen `💬 Hızlı Chat & Racon` butonu ile oyundan kopmadan 0.1 saniyede mesaj gönderin.
- **Zengin Kategori Sekmeleri:**
  - 🔥 **Racon & Banter (Argolu / Bansız):** *"Ağlama oyna"*, *"Kolsuz seni"*, *"Babanız geldi"*, *"Sil şu oyunu aq"*, *"Kaleden kaleye utan"*, *"Lag olmasa 5 lemiştim"*, *"Balını seveyim"*, *"Kolu ısır kolu"*, vb.
  - ⚽ **Taktik:** *"Pas ver!"*, *"Kaleye geç!"*, *"Vur artık!"*, *"Defans yapın lan"*, *"Çıkma kal!"*, *"Açıl sola!"*, *"Ortala!"*, *"Bırak bende!"*.
  - 👏 **Övgü & GG:** *"Kral adamsın"*, *"Helal usta"*, *"Brezilya mısın be"*, *"Müthiş gol"*, *"GG WP"*.
  - ⚡ **Oda Komutları:** `!stats`, `!afk`, `!spec`, `!bb`, `!admin`, `!swap`, `!reset`.
  - ⭐ **Özel Mesajlar (+ Ekle / Sil):** Kendi sık kullandığınız özel cümleleri kaydedip tek dokunuşla gönderebilme.
- **📱 Sistem Klavyesi Entegrasyonu:** HTML klavye sorunlarını aşmak için yerel Android `AlertDialog` köprüsü ile Gboard/Samsung klavyelerini tek tıkla açabilme.

### 🔍 3. Ultra Geniş Saha Görüşü & Kamera Sabitleme (Wide Stadium Zoom)
- Canvas 2D render motoruna entegre edilen özel kamera çarpanı:
  - **`0.70x (Geniş Açılı):`** Sahayı %40 daha geniş açıyla gösterir (Varsayılan).
  - **`0.55x (Tam Saha):`** İki kaleyi ve tüm saha çizgilerini tek ekrana sığdırır; kamera sarsıntısını azaltır.
  - **`0.85x (Orta):`** Dengeli görünüm.
  - **`1.0x (Normal HaxBall):`** Standart yakın çekim.
- **👁️ Chat Gizle / Aç:** Saha üzerindeki in-game sohbet kutusunu tek tıkla gizleyerek %100 temiz maç görüşü sağlar.

### 👤 4. Otomatik Oyuncu Adı & Şifreli Oda Asistanı
- **Kalıcı Kullanıcı Adı:** Belirlediğiniz isim hafızaya alınır, oyuna her girişte otomatik olarak oturum açılır.
- **Rastgele İsim Üreteci:** Tek tıkla eğlenceli HaxBall nickleri üretir (`⚽ KralGolcü`, `⚡ Fırtına`, `🎯 Roket`).
- **Oda Şifresi Algılama:** Şifreli bir odaya girildiğinde otomatik olarak açılan şifre pop-up'ı.
- **Panodan Yapıştır:** Kopyalanan oda linklerini tek tıkla panodan çekip odaya katılma.

### ⚽ 5. Çevrimdışı Antrenman Modu (Offline Practice)
- İnternet bağlantısı olmadığında çalışan, sıfır gecikmeli Canvas 2D fizik motoru ve yapay zeka botuna karşı şut/çalım antrenman modu.

---

## 🛠️ Kurulum & Derleme (Installation & Build)

### APK Olarak Yükleme
En son derlenmiş APK dosyasını [Releases](../../releases) sekmesinden veya proje içindeki `build/haxball-debug.apk` dosyasından indirip telefonunuza kurabilirsiniz.

### Kaynak Koddan Derleme (Termux veya Linux)
Proje saf Android SDK derleme zinciri (`aapt2`, `javac`, `d8`, `apksigner`) ile doğrudan Termux veya Linux terminalinde 3 saniyede derlenir:

```bash
# Termux APK Builder ile derleme:
apk-builder build haxball

# Telefona yükleme:
apk-builder deploy haxball
```

---

## 📂 Proje Yapısı (Architecture)

```text
haxball-mobile/
├── AndroidManifest.xml        # Paket ayarları, adjustResize ve tam ekran izinleri
├── res/                       # Android kaynak dosyaları
│   ├── drawable/              # 512x512 High-Res App Icon
│   ├── mipmap-*/              # Çoklu yoğunluklu launcher ikonları (mdpi...xxxhdpi)
│   ├── layout/                # Ana aktivite layout'u (activity_main.xml)
│   └── values/                # Strings ve metadata
├── src/                       # Java kaynak kodları
│   └── com/agy/
│       ├── haxball/           # MainActivity.java (WebBridge, Insets, SoftKeyboard)
│       └── telemetry/         # CrashReporter.java (Canlı telemetri & loglama)
├── assets/                    # Mobil web arayüzü ve oyun motoru katmanı
│   ├── haxball-controller.js  # Dokunmatik joystick, sohbet çarkı ve canvas hook
│   ├── haxball-controller.css # Wild Rift tarzı mobil tasarım ve karanlık tema
│   └── offline_practice.html  # Çevrimdışı antrenman modu
└── README.md                  # Proje dökümantasyonu
```

---

## 📄 Lisans (License)
Bu proje [MIT Lisansı](LICENSE) altında açık kaynaklı olarak sunulmaktadır. HaxBall oyununun telif hakları Mario Carbajal'a aittir.
