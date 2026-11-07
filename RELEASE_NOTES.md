## ⚽ HaxBall Mobile & Desktop Client v2.9.0

### 🎮 Yenilikler & Geliştirmeler
- **Akıllı Joystick Motoru (Smart-Hold Engine v2.9.0):**
  - v2.8'deki "tık-tık" darbeli motor oyuncuyu yavaşlatıyordu; artık gidilen yönün ok tuşu **sürekli basılı** kalır (PC'de tuşu basılı tutan oyuncu kadar hızlı).
  - Joystick döndürüldüğünde yeni yön tuşu basılır ve eski tuş **aynı karede** bırakılır; arada hareketsiz an kalmaz.
  - 8 yön sınırlarında histerezis bandı ile tuş titremesi tamamen engellendi; dokunuşa 0 kare gecikmeyle (touchmove içinde) tepki verilir.
  - Yeni **İnce Açı** modu: ana eksen basılı, yan eksen açıya göre ritmik vuruş yapar (ara açılarla koşu).
- **Fiziksel Klavye Çift Harf Hatası Düzeltildi:** Sohbet / nick / şifre yazarken harflerin "yyaazzııyyoorr" şeklinde çift yazılması giderildi; Tab/Enter/Esc artık tek tetiklenir, oyun iframe'i odaktayken de yazı sanal klavyeye gider. Ctrl+V yapıştırma ve Ctrl+Backspace kelime silme eklendi.
- **%100 Gboard (Sistem Klavyesi) Engellemesi & Gelişmiş Sanal Klavye:**
  - Android `WebView.onCreateInputConnection` seviyesinde donanımsal/native kilit eklendi; sohbet, kullanıcı adı, oda şifresi veya arama kutusuna dokunulduğunda Android ekran klavyesi (Gboard) kesinlikle açılmaz.
  - Özel sanal klavyeye **Büyük/Küçük Harf (`⇧ Shift`, Türkçe İ/I/Ğ/Ü/Ş/Ö/Ç destekli)** tuşu ve tüm oyun içi input'larla canlı senkronizasyon eklendi.
- **Lobi & Menü Görünürlük Düzeltmesi ve Kritik Bug Fix:**
  - v2.8.0 sürümünde butonların ve sanal klavyenin çalışmasını engelleyen `currentKbMode` başlatma hatası giderildi ve eski OTA önbelleği otomatik temizlendi.
  - Lobi, oda listesi, kullanıcı adı seçimi ve ESC menüsünde joystick ve şut butonları otomatik gizlenir; yalnızca maç sahasında aktif olur.
- **Masaüstü Sürümleri (Multiplatform Desktop Support):**
  - **Windows**: `.exe` (Kurulum Sihirbazı & Taşınabilir Sürüm)
  - **macOS**: `.dmg` & `.zip` (Apple Silicon & Intel)
  - **Linux**: `.deb` (Debian, Ubuntu, Linux Mint) ve `.rpm` (Fedora, RHEL, openSUSE) + `.AppImage`
  - **Android**: `.apk` (120 FPS / Full HD Mobil İstemci)
