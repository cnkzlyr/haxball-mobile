/**
 * HaxBall Mobile Controller & Smart Assistant Engine - Wild Rift / MOBA Edition
 * - Single Primary Kick Button with Haptic & Ripple Feedback
 * - Floating Banter / Chat Pill & Turkish HaxBall Banter Dictionary
 * - Wide & Stable Camera View (0.70x / 0.55x Pitch View)
 * - Zero-Drift Visual Center Joystick
 */
(function() {
  if (window.__haxballMobileLoaded) return;
  window.__haxballMobileLoaded = true;

  console.log("[HaxBall Mobile] Initializing Wild Rift Edition Controller...");

  // Apply parent viewport overrides
  document.documentElement.classList.add('hax-override-parent');
  document.body.classList.add('hax-override-parent');

  // Load CSS if not present
  if (!document.getElementById('haxball-controller-style')) {
    const link = document.createElement('link');
    link.id = 'haxball-controller-style';
    link.rel = 'stylesheet';
    link.href = 'haxball-controller.css';
    document.head.appendChild(link);
  }

  // Zoom presets: 0.70x is wide, 0.55x is full stadium, 1.0x is default
  const ZOOM_PRESETS = [
    { val: 0.70, label: "0.7x (Geniş)" },
    { val: 0.55, label: "0.55x (Tam Saha)" },
    { val: 1.0,  label: "1.0x (Normal)" },
    { val: 0.85, label: "0.85x (Orta)" }
  ];

  let savedZoomIdx = parseInt(localStorage.getItem('hax_zoom_idx') || '0');
  if (savedZoomIdx < 0 || savedZoomIdx >= ZOOM_PRESETS.length) savedZoomIdx = 0;

  // Default Custom Banter if empty
  const defaultCustoms = [
    "Ağlama oyna",
    "Babanız geldi",
    "Kolu ısır kolu",
    "Gözünü seveyim pas at",
    "Lag olmasa 5 lemiştim"
  ];

  // State Management
  const state = {
    nickname: localStorage.getItem('hax_player_nick') || '',
    opacity: parseInt(localStorage.getItem('hax_opacity') || '85'),
    joyMode: localStorage.getItem('hax_joy_mode') || 'fixed',
    vibrate: localStorage.getItem('hax_vibrate') !== 'false',
    leftHanded: localStorage.getItem('hax_left_handed') === 'true',
    zoomIdx: savedZoomIdx,
    fieldZoom: ZOOM_PRESETS[savedZoomIdx].val,
    chatHidden: localStorage.getItem('hax_chat_hidden') === 'true',
    controlsManualToggle: null,
    customPhrases: JSON.parse(localStorage.getItem('hax_custom_phrases') || JSON.stringify(defaultCustoms))
  };

  window.__haxFieldZoom = state.fieldZoom;

  function vibrate(ms) {
    if (!state.vibrate) return;
    try {
      if (window.Android && window.Android.vibrate) {
        window.Android.vibrate(ms);
      } else if (navigator.vibrate) {
        navigator.vibrate(ms);
      }
    } catch(e) {}
  }

  function showToast(msg) {
    try {
      if (window.Android && window.Android.showToast) {
        window.Android.showToast(msg);
      } else {
        console.log("[Toast]", msg);
      }
    } catch(e) {}
  }

  function getIframeDoc() {
    try {
      const iframe = document.querySelector('iframe.gameframe');
      if (iframe && iframe.contentDocument) return iframe.contentDocument;
    } catch(e) {}
    return null;
  }

  function getIframeWin() {
    try {
      const iframe = document.querySelector('iframe.gameframe');
      if (iframe && iframe.contentWindow) return iframe.contentWindow;
    } catch(e) {}
    return null;
  }

  // --- Dispatch Synthetic Key Events into Haxball Game ---
  const keyMap = {
    'KeyW': { key: 'w', keyCode: 87 },
    'KeyS': { key: 's', keyCode: 83 },
    'KeyA': { key: 'a', keyCode: 65 },
    'KeyD': { key: 'd', keyCode: 68 },
    'ArrowUp': { key: 'ArrowUp', keyCode: 38 },
    'ArrowDown': { key: 'ArrowDown', keyCode: 40 },
    'ArrowLeft': { key: 'ArrowLeft', keyCode: 37 },
    'ArrowRight': { key: 'ArrowRight', keyCode: 39 },
    'Space': { key: ' ', keyCode: 32 },
    'KeyX': { key: 'x', keyCode: 88 },
    'Enter': { key: 'Enter', keyCode: 13 },
    'Escape': { key: 'Escape', keyCode: 27 }
  };

  function sendGameKeyEvent(type, code) {
    const info = keyMap[code] || { key: code, keyCode: 0 };
    const targets = [];
    const iframeDoc = getIframeDoc();
    const iframeWin = getIframeWin();

    if (iframeWin) targets.push(iframeWin);
    if (iframeDoc) targets.push(iframeDoc);
    targets.push(window, document);

    for (const t of targets) {
      try {
        const ev = new KeyboardEvent(type, {
          code: code,
          key: info.key,
          keyCode: info.keyCode,
          which: info.keyCode,
          bubbles: true,
          cancelable: true,
          composed: true
        });
        Object.defineProperty(ev, 'keyCode', { get: () => info.keyCode });
        Object.defineProperty(ev, 'which', { get: () => info.keyCode });
        Object.defineProperty(ev, 'code', { get: () => code });
        t.dispatchEvent(ev);
      } catch(e) {}
    }
  }

  // --- Inject In-Game Compact Chat & Scoreboard Styling into Iframe ---
  function injectIframeStyles(iframeDoc) {
    if (!iframeDoc || iframeDoc.getElementById('hax-iframe-custom-css')) return;
    const style = iframeDoc.createElement('style');
    style.id = 'hax-iframe-custom-css';
    style.textContent = `
      /* Compact, Mobile-Optimized In-Game Chatbox */
      .chatbox-view {
        height: 50px !important;
        max-width: 320px !important;
        width: 320px !important;
        margin: 0 auto !important;
        background: transparent !important;
        transition: all 0.2s ease !important;
      }
      .chatbox-view:focus-within {
        height: 85px !important;
        opacity: 0.95 !important;
      }
      .chatbox-view-contents {
        padding: 2px 6px !important;
        background-color: rgba(15, 23, 42, 0.6) !important;
        border-radius: 8px 8px 0 0 !important;
        backdrop-filter: blur(4px) !important;
      }
      .chatbox-view-contents > .log {
        font-size: 10px !important;
        line-height: 1.2 !important;
      }
      .chatbox-view-contents > .log .log-contents p {
        margin-bottom: 1px !important;
        font-size: 10px !important;
        white-space: pre-wrap !important;
        word-break: break-word !important;
      }
      .chatbox-view-contents > .input {
        height: 18px !important;
      }
      .chatbox-view-contents > .input input[type=text] {
        font-size: 10px !important;
        padding: 0 4px !important;
      }
      .chatbox-view-contents > .drag {
        display: none !important;
      }

      /* Completely Hide Chatbox when toggled off */
      .chatbox-view.hax-chat-hidden {
        display: none !important;
      }

      /* Compact Scoreboard & Match Info so it never overlaps buttons */
      .game-state-view .bar {
        height: 26px !important;
        padding: 2px 8px !important;
        font-size: 14px !important;
      }
      .game-state-view .bar > .scoreboard {
        margin-right: 0 !important;
      }
      .game-state-view .bar > .scoreboard .score {
        width: 24px !important;
        font-size: 15px !important;
      }
      .game-state-view .bar > .scoreboard .teamicon {
        width: 16px !important;
        height: 16px !important;
      }
      .game-view > .buttons {
        height: 26px !important;
        padding: 2px 4px !important;
      }
      .game-view > .buttons button {
        padding: 2px 5px !important;
        font-size: 10px !important;
      }
    `;
    iframeDoc.head.appendChild(style);
  }

  // --- Hook Canvas 2D Camera Scale & Jitter Reduction in Iframe ---
  function hookIframeCanvas(iframeWin) {
    if (!iframeWin || iframeWin.__canvasHooked) return;
    iframeWin.__canvasHooked = true;

    const C2D = iframeWin.CanvasRenderingContext2D;
    if (!C2D) return;

    const origResetTransform = C2D.prototype.resetTransform;
    const origSetTransform = C2D.prototype.setTransform;
    const origScale = C2D.prototype.scale;
    const origTranslate = C2D.prototype.translate;

    let isCameraScalePending = false;
    let isPostCameraTranslatePending = false;

    C2D.prototype.resetTransform = function() {
      isCameraScalePending = true;
      return origResetTransform.apply(this, arguments);
    };

    C2D.prototype.setTransform = function() {
      if (arguments.length === 6 && arguments[0] === 1 && arguments[1] === 0 && arguments[2] === 0 && arguments[3] === 1 && arguments[4] === 0 && arguments[5] === 0) {
        isCameraScalePending = true;
      }
      return origSetTransform.apply(this, arguments);
    };

    C2D.prototype.scale = function(sx, sy) {
      if (isCameraScalePending && sx === sy) {
        isCameraScalePending = false;
        isPostCameraTranslatePending = true;
        const zoom = window.__haxFieldZoom || 0.70;
        return origScale.call(this, sx * zoom, sy * zoom);
      }
      return origScale.apply(this, arguments);
    };

    // Camera Jitter Reduction & Centering when zoomed out
    C2D.prototype.translate = function(tx, ty) {
      if (isPostCameraTranslatePending) {
        isPostCameraTranslatePending = false;
        // In full stadium zoom (0.55x), damp camera movement towards pitch center (0, 0)
        if (window.__haxFieldZoom <= 0.60) {
          tx *= 0.35;
          ty *= 0.35;
        }
      }
      return origTranslate.call(this, tx, ty);
    };
  }

  // --- Build Clean Mobile UI ---
  const root = document.createElement('div');
  root.id = 'hax-mobile-root';
  if (state.leftHanded) root.classList.add('left-handed');
  root.style.opacity = (state.opacity / 100).toString();

  root.innerHTML = `
    <!-- Top Navigation Bar (Left & Right Split, Empty Center for Scoreboard) -->
    <div class="hax-topbar" id="hax-topbar">
      <!-- Left Side -->
      <div class="hax-topbar-left">
        <div class="hax-brand-mini">
          <span>⚽</span>
          <span>HAXBALL</span>
        </div>
        <button class="hax-btn hax-btn-nick" id="btn-open-nick">👤 <span id="lbl-nick-name">İsim Seç</span></button>
      </div>

      <!-- Center Space (Empty for HaxBall Scoreboard & Clock) -->
      <div class="hax-topbar-center"></div>

      <!-- Right Side Tools -->
      <div class="hax-topbar-right">
        <button class="hax-btn hax-btn-chat" id="btn-quick-chat">💬 Sohbet</button>
        <button class="hax-btn" id="btn-toggle-chat-box">👁️ <span id="lbl-chat-toggle">${state.chatHidden ? 'Chat Aç' : 'Chat Gizle'}</span></button>
        <button class="hax-btn hax-btn-zoom" id="btn-zoom">🔍 <span id="lbl-zoom">${ZOOM_PRESETS[state.zoomIdx].label}</span></button>
        <button class="hax-btn" id="btn-toggle-hud">🎮 <span id="lbl-hud-status">Açık</span></button>
        <button class="hax-btn" id="btn-settings">⚙️</button>
      </div>
    </div>

    <!-- Floating Banter & Tactical Chat Pill (Thumb-reachable right above kick button) -->
    <button class="hax-floating-banter-btn" id="hax-floating-banter-btn">
      💬 Hızlı Chat & Racon
    </button>

    <!-- Virtual Joystick Touch Area (Left Corner) -->
    <div id="hax-joystick-zone">
      <div id="hax-joystick-base">
        <div id="hax-joystick-knob"></div>
      </div>
    </div>

    <!-- Action Button Area - Wild Rift Single Satisfying Kick Button -->
    <div id="hax-buttons-zone">
      <button class="btn-primary-kick" id="hax-btn-kick">
        <span class="btn-icon">⚽</span>
        <span>VUR</span>
      </button>
    </div>

    <!-- 1. POPUP: Nickname Management Modal -->
    <div class="hax-modal" id="hax-nick-modal" style="display:none;">
      <div class="modal-card">
        <div class="modal-header">
          <h3>👤 HaxBall Oyuncu Adı</h3>
          <button class="modal-close" id="btn-close-nick">✕</button>
        </div>
        <div class="modal-body">
          <div class="hax-input-group">
            <label class="hax-input-label">Oyunda görünecek adınız (Kullanıcı Adı):</label>
            <div class="hax-input-row">
              <input type="text" class="hax-text-input" id="ipt-player-nick" placeholder="Örn: KralGolcü, Fırtına..." maxlength="25" />
              <button class="hax-btn" id="btn-random-nick" title="Rastgele İsim">🎲 Rastgele</button>
            </div>
          </div>
          <div class="hax-nick-suggestions">
            <span class="hax-nick-tag" data-nick="⚡ Fırtına">⚡ Fırtına</span>
            <span class="hax-nick-tag" data-nick="🎯 Roket">🎯 Roket</span>
            <span class="hax-nick-tag" data-nick="⚽ KralGolcü">⚽ KralGolcü</span>
            <span class="hax-nick-tag" data-nick="🛡️ Duvar">🛡️ Duvar</span>
            <span class="hax-nick-tag" data-nick="🔥 Maestro">🔥 Maestro</span>
          </div>
          <button class="hax-btn-full hax-btn-primary" id="btn-save-nick">💾 Kaydet ve Oyuna Başla</button>
          <button class="hax-btn-full hax-btn-native" id="btn-native-nick">📱 Sistem Klavyesi ile Yaz</button>
        </div>
      </div>
    </div>

    <!-- 2. POPUP: Smart Mobile Chat Modal with Turkish Banter Categories -->
    <div class="hax-modal" id="hax-smartchat-modal" style="display:none;">
      <div class="modal-card">
        <div class="modal-header">
          <h3>💬 HaxBall Hızlı Chat & Racon</h3>
          <button class="modal-close" id="btn-close-chat">✕</button>
        </div>
        <div class="modal-body">
          <div class="hax-input-group">
            <div class="hax-input-row">
              <input type="text" class="hax-text-input" id="ipt-chat-message" placeholder="Odaya mesaj yazın..." />
              <button class="hax-btn hax-btn-primary" id="btn-send-chat" style="padding:9px 14px;">Gönder 🚀</button>
            </div>
          </div>

          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
            <div class="hax-chat-tabs">
              <button class="hax-chat-tab active" data-tab="racon">🔥 Racon & Banter</button>
              <button class="hax-chat-tab" data-tab="tactic">⚽ Taktik</button>
              <button class="hax-chat-tab" data-tab="gg">👏 Övgü & GG</button>
              <button class="hax-chat-tab" data-tab="commands">⚡ Komutlar</button>
              <button class="hax-chat-tab" data-tab="custom">⭐ Özel</button>
            </div>
            <button class="hax-btn hax-btn-native" id="btn-native-chat" style="padding:3px 7px; font-size:10px;">📱 Klavye Aç</button>
          </div>

          <!-- Tab 1: Turkish Haxball Banter & Trash-Talk (Argolu/Bansız) -->
          <div class="hax-chip-grid" id="chat-tab-racon">
            <button class="hax-macro-chip" data-msg="Ağlama oyna">Ağlama oyna</button>
            <button class="hax-macro-chip" data-msg="Kolsuz seni">Kolsuz seni</button>
            <button class="hax-macro-chip" data-msg="Babanız geldi">Babanız geldi</button>
            <button class="hax-macro-chip" data-msg="Sil şu oyunu aq">Sil şu oyunu aq</button>
            <button class="hax-macro-chip" data-msg="Kaleden kaleye gol utan">Kaleden kaleye utan</button>
            <button class="hax-macro-chip" data-msg="Kolu ısır kolu">Kolu ısır kolu</button>
            <button class="hax-macro-chip" data-msg="Lag olmasa 5 lemiştim">Lag olmasa 5 lemiştim</button>
            <button class="hax-macro-chip" data-msg="Balını seveyim senin">Balını seveyim</button>
            <button class="hax-macro-chip" data-msg="Hırsız gibi bekliyor kalede">Hırsız kaleci</button>
            <button class="hax-macro-chip" data-msg="Troll müsün bas git">Troll müsün git</button>
            <button class="hax-macro-chip" data-msg="Yatacak yerin yok kaleci">Yatacak yerin yok</button>
            <button class="hax-macro-chip" data-msg="Hadi köyüne">Hadi köyüne</button>
            <button class="hax-macro-chip" data-msg="Kör müsün pas atsana">Kör müsün pas at</button>
            <button class="hax-macro-chip" data-msg="Boş yapma icraat yap">Boş yapma</button>
          </div>

          <!-- Tab 2: Tactics -->
          <div class="hax-chip-grid" id="chat-tab-tactic" style="display:none;">
            <button class="hax-macro-chip" data-msg="⚽ Pas ver pas!">⚽ Pas ver pas!</button>
            <button class="hax-macro-chip" data-msg="🥅 Kaleye geç!">🥅 Kaleye geç!</button>
            <button class="hax-macro-chip" data-msg="🎯 Vur artık şut çek!">🎯 Vur artık!</button>
            <button class="hax-macro-chip" data-msg="🔄 Defans yapın lan!">🔄 Defans yapın!</button>
            <button class="hax-macro-chip" data-msg="🧤 Çıkma kaleden kal!">🧤 Çıkma kal!</button>
            <button class="hax-macro-chip" data-msg="🚀 Açıl sola açıl!">🚀 Açıl sola!</button>
            <button class="hax-macro-chip" data-msg="🏃 Pres yap bas bas!">🏃 Pres yap!</button>
            <button class="hax-macro-chip" data-msg="⚽ Bırak bende!">⚽ Bırak bende!</button>
          </div>

          <!-- Tab 3: Praise & GG -->
          <div class="hax-chip-grid" id="chat-tab-gg" style="display:none;">
            <button class="hax-macro-chip" data-msg="🔥 GG WP iyi oyundu!">🔥 GG WP!</button>
            <button class="hax-macro-chip" data-msg="👑 Kral adamsın!">👑 Kral adamsın!</button>
            <button class="hax-macro-chip" data-msg="👏 Helal olsun usta!">👏 Helal olsun!</button>
            <button class="hax-macro-chip" data-msg="🇧🇷 Brezilya mısın mübarek!">🇧🇷 Brezilya mısın!</button>
            <button class="hax-macro-chip" data-msg="⚡ Fırtına gibi esti!">⚡ Fırtına gibi!</button>
            <button class="hax-macro-chip" data-msg="💪 Adamsın be!">💪 Adamsın be!</button>
            <button class="hax-macro-chip" data-msg="🎯 Bu ne goldü öyle!">🎯 Müthiş gol!</button>
            <button class="hax-macro-chip" data-msg="🙏 Pardon lag vardı!">🙏 Pardon lag!</button>
          </div>

          <!-- Tab 4: Room Commands -->
          <div class="hax-chip-grid" id="chat-tab-commands" style="display:none;">
            <button class="hax-macro-chip" data-msg="!stats">📊 !stats</button>
            <button class="hax-macro-chip" data-msg="!afk">💤 !afk</button>
            <button class="hax-macro-chip" data-msg="!spec">👀 !spec</button>
            <button class="hax-macro-chip" data-msg="!bb">👋 !bb</button>
            <button class="hax-macro-chip" data-msg="!admin">🛡️ !admin</button>
            <button class="hax-macro-chip" data-msg="!swap">🔄 !swap</button>
            <button class="hax-macro-chip" data-msg="!reset">🔄 !reset</button>
            <button class="hax-macro-chip" data-msg="!help">❓ !help</button>
          </div>

          <!-- Tab 5: Custom User Phrases with Delete & Add -->
          <div class="hax-chip-grid" id="chat-tab-custom" style="display:none;"></div>
        </div>
      </div>
    </div>

    <!-- 3. POPUP: Room Password Modal -->
    <div class="hax-modal" id="hax-password-modal" style="display:none;">
      <div class="modal-card">
        <div class="modal-header">
          <h3>🔑 Oda Şifresi Gerekli</h3>
          <button class="modal-close" id="btn-close-password">✕</button>
        </div>
        <div class="modal-body">
          <p style="font-size:12px;color:#94a3b8;margin-bottom:8px;">Bu oda şifre ile korunmaktadır:</p>
          <div class="hax-input-group">
            <input type="password" class="hax-text-input" id="ipt-room-password" placeholder="Oda şifresini girin..." />
          </div>
          <button class="hax-btn-full hax-btn-primary" id="btn-submit-password">🔑 Şifreyi Gönder ve Gir</button>
          <button class="hax-btn-full hax-btn-native" id="btn-native-password">📱 Sistem Klavyesi ile Gir</button>
        </div>
      </div>
    </div>

    <!-- 4. POPUP: Settings Modal (includes Room Join & Practice links) -->
    <div class="hax-modal" id="hax-settings-modal" style="display:none;">
      <div class="modal-card">
        <div class="modal-header">
          <h3>⚙️ Oyun & Görünüm Ayarları</h3>
          <button class="modal-close" id="btn-close-settings">✕</button>
        </div>
        <div class="modal-body">
          <div class="setting-row">
            <span>Saha Genişliği (Zoom):</span>
            <select id="sel-field-zoom">
              <option value="0.70" ${state.fieldZoom===0.70?'selected':''}>0.70x (Geniş Açılı)</option>
              <option value="0.55" ${state.fieldZoom===0.55?'selected':''}>0.55x (Tam Saha - Sabit)</option>
              <option value="0.85" ${state.fieldZoom===0.85?'selected':''}>0.85x (Orta Boyut)</option>
              <option value="1.0" ${state.fieldZoom===1.0?'selected':''}>1.0x (Varsayılan Haxball)</option>
            </select>
          </div>
          <div class="setting-row">
            <span>Kontrol Opaklığı:</span>
            <input type="range" id="rng-opacity" min="20" max="100" value="${state.opacity}">
            <span id="txt-opacity">${state.opacity}%</span>
          </div>
          <div class="setting-row">
            <span>Joystick Modu:</span>
            <select id="sel-joy-mode">
              <option value="fixed" ${state.joyMode==='fixed'?'selected':''}>Sabit (Köşede - Sıfır Sapma)</option>
              <option value="dynamic" ${state.joyMode==='dynamic'?'selected':''}>Serbest (Dokunulan Yerde)</option>
            </select>
          </div>
          <div class="setting-row">
            <span>Titreşim (Haptic Feedback):</span>
            <input type="checkbox" id="chk-vibrate" ${state.vibrate?'checked':''}>
          </div>
          <div class="setting-row">
            <span>Solak Modu:</span>
            <input type="checkbox" id="chk-left-handed" ${state.leftHanded?'checked':''}>
          </div>
          <div style="display:flex; gap:6px; margin-top:10px;">
            <button class="hax-btn-full hax-btn-primary" id="btn-open-join-modal" style="margin-top:0;">🔗 Odaya Katıl</button>
            <button class="hax-btn-full hax-btn-native" id="btn-open-offline" style="margin-top:0;">⚽ Antrenman</button>
          </div>
          <button class="hax-btn-full" id="btn-reload-iframe" style="background:#1e293b; color:#cbd5e1; margin-top:8px;">🔄 Oyunu Yeniden Yükle</button>
        </div>
      </div>
    </div>

    <!-- 5. POPUP: Join Room Modal -->
    <div class="hax-modal" id="hax-join-modal" style="display:none;">
      <div class="modal-card">
        <div class="modal-header">
          <h3>🔗 HaxBall Odasına Katıl</h3>
          <button class="modal-close" id="btn-close-join">✕</button>
        </div>
        <div class="modal-body">
          <p style="font-size:12px;color:#94a3b8;margin-bottom:8px;">Oda bağlantısını veya kodunu girin:</p>
          <div class="hax-input-row" style="margin-bottom:10px;">
            <input type="text" class="hax-text-input" id="ipt-room" placeholder="https://www.haxball.com/play?c=... veya kod" />
            <button class="hax-btn" id="btn-paste-clipboard" title="Panodan Yapıştır">📋 Yapıştır</button>
          </div>
          <button class="hax-btn-full hax-btn-primary" id="btn-confirm-join">Odaya Katıl</button>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(root);

  // Initialize Nickname Label
  const nickBtn = document.getElementById('btn-open-nick');
  const nickLabel = document.getElementById('lbl-nick-name');
  if (state.nickname) {
    nickLabel.innerText = state.nickname;
  }

  // ==========================================
  // MATHEMATICALLY PERFECT ZERO-DRIFT JOYSTICK
  // ==========================================
  const joyZone = document.getElementById('hax-joystick-zone');
  const joyBase = document.getElementById('hax-joystick-base');
  const joyKnob = document.getElementById('hax-joystick-knob');
  let joyTouchId = null;
  let joyOriginX = 0, joyOriginY = 0;
  const maxJoyDist = 48;

  const activeKeys = { KeyW: false, KeyS: false, KeyA: false, KeyD: false };

  function setJoystickKey(key, isPressed) {
    if (activeKeys[key] !== isPressed) {
      activeKeys[key] = isPressed;
      sendGameKeyEvent(isPressed ? 'keydown' : 'keyup', key);
    }
  }

  function clearAllJoystickKeys() {
    for (const k of ['KeyW', 'KeyS', 'KeyA', 'KeyD']) {
      setJoystickKey(k, false);
    }
  }

  function getJoystickVisualCenter() {
    const rect = joyBase.getBoundingClientRect();
    return {
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2
    };
  }

  function setupJoystickMode() {
    if (state.joyMode === 'fixed') {
      joyBase.style.display = 'block';
      joyBase.style.position = 'absolute';
      joyBase.style.left = '20px';
      joyBase.style.bottom = '20px';
      joyBase.style.top = 'auto';
      joyBase.style.right = 'auto';
    } else {
      joyBase.style.display = 'none';
    }
    joyKnob.style.transform = 'translate3d(0, 0, 0)';
  }
  setupJoystickMode();

  joyZone.addEventListener('touchstart', (e) => {
    e.preventDefault();
    for (let i = 0; i < e.changedTouches.length; i++) {
      const t = e.changedTouches[i];
      if (joyTouchId === null) {
        joyTouchId = t.identifier;
        if (state.joyMode === 'dynamic') {
          joyOriginX = t.clientX;
          joyOriginY = t.clientY;
          joyBase.style.display = 'block';
          joyBase.style.position = 'fixed';
          joyBase.style.left = (joyOriginX - 58) + 'px';
          joyBase.style.top = (joyOriginY - 58) + 'px';
          joyBase.style.bottom = 'auto';
        } else {
          const center = getJoystickVisualCenter();
          joyOriginX = center.x;
          joyOriginY = center.y;
        }
        joyKnob.style.transform = 'translate3d(0, 0, 0)';
        clearAllJoystickKeys();
        break;
      }
    }
  }, { passive: false });

  joyZone.addEventListener('touchmove', (e) => {
    e.preventDefault();
    for (let i = 0; i < e.changedTouches.length; i++) {
      const t = e.changedTouches[i];
      if (t.identifier === joyTouchId) {
        const dx = t.clientX - joyOriginX;
        const dy = t.clientY - joyOriginY;
        const dist = Math.hypot(dx, dy);
        const angle = Math.atan2(dy, dx);
        const clampedDist = Math.min(dist, maxJoyDist);
        const knobX = Math.cos(angle) * clampedDist;
        const knobY = Math.sin(angle) * clampedDist;

        joyKnob.style.transform = `translate3d(${knobX}px, ${knobY}px, 0)`;

        if (dist >= 12) {
          const isUp = dy < -0.382 * dist;
          const isDown = dy > 0.382 * dist;
          const isLeft = dx < -0.382 * dist;
          const isRight = dx > 0.382 * dist;

          setJoystickKey('KeyW', isUp);
          setJoystickKey('KeyS', isDown);
          setJoystickKey('KeyA', isLeft);
          setJoystickKey('KeyD', isRight);
        } else {
          clearAllJoystickKeys();
        }
        break;
      }
    }
  }, { passive: false });

  function releaseJoystick(e) {
    for (let i = 0; i < e.changedTouches.length; i++) {
      if (e.changedTouches[i].identifier === joyTouchId) {
        joyTouchId = null;
        clearAllJoystickKeys();
        if (state.joyMode === 'dynamic') {
          joyBase.style.display = 'none';
        } else {
          joyKnob.style.transform = 'translate3d(0, 0, 0)';
        }
        break;
      }
    }
  }
  joyZone.addEventListener('touchend', releaseJoystick);
  joyZone.addEventListener('touchcancel', releaseJoystick);

  // ==========================================
  // UNIFIED PRIMARY KICK BUTTON (WILD RIFT ACTION)
  // In HaxBall, kick is Space + X (same physics)
  // ==========================================
  const kickBtn = document.getElementById('hax-btn-kick');

  kickBtn.addEventListener('touchstart', (e) => {
    e.preventDefault();
    sendGameKeyEvent('keydown', 'Space');
    sendGameKeyEvent('keydown', 'KeyX');
    vibrate(25);
    kickBtn.classList.add('active');
  }, { passive: false });

  function onKickRelease(e) {
    e.preventDefault();
    sendGameKeyEvent('keyup', 'Space');
    sendGameKeyEvent('keyup', 'KeyX');
    kickBtn.classList.remove('active');
  }
  kickBtn.addEventListener('touchend', onKickRelease);
  kickBtn.addEventListener('touchcancel', onKickRelease);

  // ==========================================
  // FIELD ZOOM (WIDE ANGLE / FULL PITCH VIEW)
  // ==========================================
  const zoomBtn = document.getElementById('btn-zoom');
  const zoomLbl = document.getElementById('lbl-zoom');

  function applyZoom(idx) {
    state.zoomIdx = idx;
    state.fieldZoom = ZOOM_PRESETS[idx].val;
    window.__haxFieldZoom = state.fieldZoom;
    localStorage.setItem('hax_zoom_idx', idx.toString());
    zoomLbl.innerText = ZOOM_PRESETS[idx].label;
    showToast("Kamera Görünümü: " + ZOOM_PRESETS[idx].label);
    vibrate(20);
  }

  zoomBtn.addEventListener('click', () => {
    const nextIdx = (state.zoomIdx + 1) % ZOOM_PRESETS.length;
    applyZoom(nextIdx);
  });

  // ==========================================
  // IN-GAME CHATBOX TOGGLE (HIDE/SHOW)
  // ==========================================
  const toggleChatBoxBtn = document.getElementById('btn-toggle-chat-box');
  const lblChatToggle = document.getElementById('lbl-chat-toggle');

  function syncChatVisibility() {
    const iframeDoc = getIframeDoc();
    if (!iframeDoc) return;
    const chatView = iframeDoc.querySelector('.chatbox-view');
    if (chatView) {
      if (state.chatHidden) {
        chatView.classList.add('hax-chat-hidden');
      } else {
        chatView.classList.remove('hax-chat-hidden');
      }
    }
    lblChatToggle.innerText = state.chatHidden ? 'Chat Aç' : 'Chat Gizle';
  }

  toggleChatBoxBtn.addEventListener('click', () => {
    state.chatHidden = !state.chatHidden;
    localStorage.setItem('hax_chat_hidden', state.chatHidden ? 'true' : 'false');
    syncChatVisibility();
    showToast(state.chatHidden ? "Oyun İçi Chat Gizlendi (Tam Görüş)" : "Oyun İçi Chat Açıldı");
    vibrate(15);
  });

  // ==========================================
  // SMART NICKNAME POPUP & MANAGEMENT
  // ==========================================
  const nickModal = document.getElementById('hax-nick-modal');
  const iptNick = document.getElementById('ipt-player-nick');

  function openNicknameModal() {
    nickModal.style.display = 'flex';
    iptNick.value = state.nickname || '';
    setTimeout(() => {
      iptNick.focus();
      if (window.Android && window.Android.showSoftKeyboard) {
        window.Android.showSoftKeyboard();
      }
    }, 100);
  }

  nickBtn.addEventListener('click', openNicknameModal);
  document.getElementById('btn-close-nick').addEventListener('click', () => {
    nickModal.style.display = 'none';
  });

  const randomNicks = ["⚽ KralGolcü", "⚡ Fırtına", "🎯 Roket", "🛡️ TaşDuvar", "🔥 Maestro", "🌟 Yıldız", "👑 Kaptan", "🚀 Şimşek", "🎩 Sihirbaz", "🦁 Aslan"];
  document.getElementById('btn-random-nick').addEventListener('click', () => {
    const r = randomNicks[Math.floor(Math.random() * randomNicks.length)];
    iptNick.value = r;
    vibrate(15);
  });

  nickModal.querySelectorAll('.hax-nick-tag').forEach(tag => {
    tag.addEventListener('click', () => {
      iptNick.value = tag.getAttribute('data-nick');
      vibrate(15);
    });
  });

  function applyNickname(nick) {
    if (!nick || !nick.trim()) {
      showToast("Lütfen bir kullanıcı adı girin!");
      return;
    }
    nick = nick.trim();
    state.nickname = nick;
    localStorage.setItem('hax_player_nick', nick);
    localStorage.setItem('player_name', nick);
    nickLabel.innerText = nick;
    nickModal.style.display = 'none';

    const iframeDoc = getIframeDoc();
    const iframeWin = getIframeWin();
    if (iframeWin) {
      try { iframeWin.localStorage.setItem('player_name', nick); } catch(e) {}
    }

    if (iframeDoc) {
      const nickInput = iframeDoc.querySelector('.choose-nickname-view input[data-hook="input"]') ||
                        iframeDoc.querySelector('.choose-nickname-view input');
      const okBtn = iframeDoc.querySelector('.choose-nickname-view button[data-hook="ok"]') ||
                    iframeDoc.querySelector('.choose-nickname-view button');

      if (nickInput) {
        nickInput.value = nick;
        nickInput.dispatchEvent(new Event('input', { bubbles: true }));
        nickInput.dispatchEvent(new Event('change', { bubbles: true }));
      }
      if (okBtn) okBtn.click();
    }

    showToast("Oyuncu Adı Belirlendi: " + nick);
    vibrate(30);
  }

  document.getElementById('btn-save-nick').addEventListener('click', () => {
    applyNickname(iptNick.value);
  });
  iptNick.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') applyNickname(iptNick.value);
  });

  document.getElementById('btn-native-nick').addEventListener('click', () => {
    if (window.Android && window.Android.showNativePrompt) {
      window.Android.showNativePrompt("HaxBall Kullanıcı Adı", "Kullanıcı adınızı girin:", iptNick.value || state.nickname || "", "set_nickname");
    } else {
      const res = prompt("HaxBall Kullanıcı Adı:", iptNick.value || state.nickname || "");
      if (res) applyNickname(res);
    }
  });

  // ==========================================
  // SMART CHAT POPUP & BANTER DICTIONARY
  // ==========================================
  const chatModal = document.getElementById('hax-smartchat-modal');
  const iptChat = document.getElementById('ipt-chat-message');

  function openChatModal() {
    chatModal.style.display = 'flex';
    iptChat.value = '';
    renderCustomPhrases();
    setTimeout(() => {
      iptChat.focus();
      if (window.Android && window.Android.showSoftKeyboard) {
        window.Android.showSoftKeyboard();
      }
    }, 100);
  }

  document.getElementById('btn-quick-chat').addEventListener('click', openChatModal);
  document.getElementById('hax-floating-banter-btn').addEventListener('click', openChatModal);
  document.getElementById('btn-close-chat').addEventListener('click', () => {
    chatModal.style.display = 'none';
  });

  const chatTabs = chatModal.querySelectorAll('.hax-chat-tab');
  chatTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      chatTabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      const target = tab.getAttribute('data-tab');
      ['racon', 'tactic', 'gg', 'commands', 'custom'].forEach(id => {
        const el = document.getElementById('chat-tab-' + id);
        if (el) el.style.display = (id === target) ? 'grid' : 'none';
      });
      vibrate(12);
    });
  });

  function renderCustomPhrases() {
    const container = document.getElementById('chat-tab-custom');
    if (!container) return;
    container.innerHTML = '';
    state.customPhrases.forEach((phrase, idx) => {
      const btn = document.createElement('button');
      btn.className = 'hax-macro-chip';
      btn.innerHTML = `<span>${phrase}</span><span class="chip-del" title="Sil">✕</span>`;
      btn.querySelector('.chip-del').addEventListener('click', (e) => {
        e.stopPropagation();
        state.customPhrases.splice(idx, 1);
        localStorage.setItem('hax_custom_phrases', JSON.stringify(state.customPhrases));
        renderCustomPhrases();
        showToast("Mesaj silindi");
      });
      btn.addEventListener('click', () => {
        sendChatMessage(phrase);
        chatModal.style.display = 'none';
      });
      container.appendChild(btn);
    });

    const addBtn = document.createElement('button');
    addBtn.className = 'hax-macro-chip';
    addBtn.style.borderColor = '#10b981';
    addBtn.style.color = '#34d399';
    addBtn.innerText = '➕ Yeni Mesaj Ekle';
    addBtn.addEventListener('click', () => {
      if (window.Android && window.Android.showNativePrompt) {
        window.Android.showNativePrompt("Özel Hızlı Mesaj", "Kaydetmek istediğiniz mesajı girin:", "", "add_custom_phrase");
      } else {
        const p = prompt("Kaydetmek istediğiniz hızlı mesajı yazın:");
        if (p && p.trim()) {
          state.customPhrases.push(p.trim());
          localStorage.setItem('hax_custom_phrases', JSON.stringify(state.customPhrases));
          renderCustomPhrases();
        }
      }
    });
    container.appendChild(addBtn);
  }

  function sendChatMessage(text) {
    if (!text || !text.trim()) return;
    text = text.trim();
    const doc = getIframeDoc() || document;

    let input = doc.querySelector('.chatbox-view-contents .input input') ||
                doc.querySelector('.chatbox-view input[data-hook="input"]') ||
                doc.querySelector('.chatbox-view input');

    function dispatchText(inp) {
      inp.focus();
      inp.value = text;
      inp.dispatchEvent(new Event('input', { bubbles: true }));
      inp.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', keyCode: 13, which: 13, bubbles: true }));
      inp.dispatchEvent(new KeyboardEvent('keyup', { key: 'Enter', code: 'Enter', keyCode: 13, which: 13, bubbles: true }));
      inp.blur();
      showToast("💬 Gönderildi: " + text);
      vibrate(20);
    }

    if (input) {
      dispatchText(input);
    } else {
      sendGameKeyEvent('keydown', 'Enter');
      setTimeout(() => {
        input = doc.querySelector('.chatbox-view-contents .input input') ||
                doc.querySelector('.chatbox-view input[data-hook="input"]') ||
                doc.querySelector('.chatbox-view input');
        if (input) {
          dispatchText(input);
        } else {
          showToast("Oda içi sohbet bulunamadı");
        }
      }, 100);
    }
  }

  document.getElementById('btn-send-chat').addEventListener('click', () => {
    sendChatMessage(iptChat.value);
    chatModal.style.display = 'none';
  });
  iptChat.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      sendChatMessage(iptChat.value);
      chatModal.style.display = 'none';
    }
  });

  chatModal.querySelectorAll('.hax-macro-chip[data-msg]').forEach(chip => {
    chip.addEventListener('click', () => {
      sendChatMessage(chip.getAttribute('data-msg'));
      chatModal.style.display = 'none';
    });
  });

  document.getElementById('btn-native-chat').addEventListener('click', () => {
    if (window.Android && window.Android.showNativePrompt) {
      window.Android.showNativePrompt("HaxBall Sohbet", "Odaya mesajınızı yazın:", iptChat.value || "", "send_chat");
    } else {
      const res = prompt("Odaya mesaj gönder:", iptChat.value || "");
      if (res) sendChatMessage(res);
    }
  });

  // ==========================================
  // ROOM PASSWORD POPUP
  // ==========================================
  const passModal = document.getElementById('hax-password-modal');
  const iptPassword = document.getElementById('ipt-room-password');

  function openPasswordModal() {
    passModal.style.display = 'flex';
    iptPassword.value = '';
    setTimeout(() => {
      iptPassword.focus();
      if (window.Android && window.Android.showSoftKeyboard) {
        window.Android.showSoftKeyboard();
      }
    }, 100);
  }

  document.getElementById('btn-close-password').addEventListener('click', () => {
    passModal.style.display = 'none';
  });

  function submitRoomPassword(pw) {
    if (!pw) return;
    passModal.style.display = 'none';
    const iframeDoc = getIframeDoc();
    if (iframeDoc) {
      const pwInput = iframeDoc.querySelector('.room-password-view input[data-hook="input"]') ||
                      iframeDoc.querySelector('.room-password-view input');
      const okBtn = iframeDoc.querySelector('.room-password-view button[data-hook="ok"]') ||
                    iframeDoc.querySelector('.room-password-view button');

      if (pwInput) {
        pwInput.value = pw;
        pwInput.dispatchEvent(new Event('input', { bubbles: true }));
        pwInput.dispatchEvent(new Event('change', { bubbles: true }));
      }
      if (okBtn) okBtn.click();
    }
    showToast("Şifre gönderildi");
    vibrate(20);
  }

  document.getElementById('btn-submit-password').addEventListener('click', () => {
    submitRoomPassword(iptPassword.value);
  });
  iptPassword.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') submitRoomPassword(iptPassword.value);
  });

  document.getElementById('btn-native-password').addEventListener('click', () => {
    if (window.Android && window.Android.showNativePrompt) {
      window.Android.showNativePrompt("Oda Şifresi", "Oda şifresini girin:", "", "room_password");
    } else {
      const res = prompt("Oda Şifresi:");
      if (res) submitRoomPassword(res);
    }
  });

  // ==========================================
  // NATIVE ANDROID PROMPT CALLBACK BRIDGE
  // ==========================================
  window.__onNativePromptResult = function(action, text) {
    if (!text) return;
    if (action === 'set_nickname') {
      applyNickname(text);
    } else if (action === 'send_chat') {
      sendChatMessage(text);
    } else if (action === 'room_password') {
      submitRoomPassword(text);
    } else if (action === 'add_custom_phrase') {
      state.customPhrases.push(text.trim());
      localStorage.setItem('hax_custom_phrases', JSON.stringify(state.customPhrases));
      renderCustomPhrases();
      showToast("Özel mesaj eklendi");
    } else if (action === 'join_room') {
      document.getElementById('ipt-room').value = text;
      document.getElementById('btn-confirm-join').click();
    }
  };

  // ==========================================
  // ROOM JOIN MODAL & CLIPBOARD INTEGRATION
  // ==========================================
  const joinModal = document.getElementById('hax-join-modal');
  const iptRoom = document.getElementById('ipt-room');

  document.getElementById('btn-open-join-modal').addEventListener('click', () => {
    document.getElementById('hax-settings-modal').style.display = 'none';
    joinModal.style.display = 'flex';
    iptRoom.value = '';
    iptRoom.focus();
  });

  document.getElementById('btn-open-offline').addEventListener('click', () => {
    document.getElementById('hax-settings-modal').style.display = 'none';
    if (window.Android && window.Android.loadOffline) {
      window.Android.loadOffline();
    } else {
      window.location.href = 'offline_practice.html';
    }
  });

  document.getElementById('btn-close-join').addEventListener('click', () => {
    joinModal.style.display = 'none';
  });

  document.getElementById('btn-paste-clipboard').addEventListener('click', () => {
    let clipText = "";
    try {
      if (window.Android && window.Android.getClipboardText) {
        clipText = window.Android.getClipboardText();
      }
    } catch(e) {}
    if (clipText) {
      iptRoom.value = clipText;
      showToast("Panodan yapıştırıldı");
      vibrate(15);
    } else {
      showToast("Pano boş veya izin verilmedi");
    }
  });

  document.getElementById('btn-confirm-join').addEventListener('click', () => {
    let val = iptRoom.value.trim();
    if (!val) return;
    joinModal.style.display = 'none';
    let targetUrl = val;
    if (!val.startsWith('http')) {
      targetUrl = 'https://www.haxball.com/play?c=' + encodeURIComponent(val);
    }
    if (window.Android && window.Android.openUrl) {
      window.Android.openUrl(targetUrl);
    } else {
      window.location.href = targetUrl;
    }
  });

  // ==========================================
  // SETTINGS MODAL
  // ==========================================
  const settingsModal = document.getElementById('hax-settings-modal');
  document.getElementById('btn-settings').addEventListener('click', () => {
    settingsModal.style.display = 'flex';
  });
  document.getElementById('btn-close-settings').addEventListener('click', () => {
    settingsModal.style.display = 'none';
  });

  const selFieldZoom = document.getElementById('sel-field-zoom');
  selFieldZoom.addEventListener('change', (e) => {
    const val = parseFloat(e.target.value);
    const idx = ZOOM_PRESETS.findIndex(p => p.val === val);
    if (idx !== -1) applyZoom(idx);
  });

  const rngOpacity = document.getElementById('rng-opacity');
  const txtOpacity = document.getElementById('txt-opacity');
  rngOpacity.addEventListener('input', (e) => {
    state.opacity = parseInt(e.target.value);
    txtOpacity.innerText = state.opacity + '%';
    root.style.opacity = (state.opacity / 100).toString();
    localStorage.setItem('hax_opacity', state.opacity.toString());
  });

  const selJoyMode = document.getElementById('sel-joy-mode');
  selJoyMode.addEventListener('change', (e) => {
    state.joyMode = e.target.value;
    localStorage.setItem('hax_joy_mode', state.joyMode);
    setupJoystickMode();
  });

  const chkVibrate = document.getElementById('chk-vibrate');
  chkVibrate.addEventListener('change', (e) => {
    state.vibrate = e.target.checked;
    localStorage.setItem('hax_vibrate', state.vibrate ? 'true' : 'false');
  });

  const chkLeftHanded = document.getElementById('chk-left-handed');
  chkLeftHanded.addEventListener('change', (e) => {
    state.leftHanded = e.target.checked;
    localStorage.setItem('hax_left_handed', state.leftHanded ? 'true' : 'false');
    if (state.leftHanded) root.classList.add('left-handed');
    else root.classList.remove('left-handed');
    setupJoystickMode();
  });

  document.getElementById('btn-reload-iframe').addEventListener('click', () => {
    settingsModal.style.display = 'none';
    const iframe = document.querySelector('iframe.gameframe');
    if (iframe) {
      iframe.src = iframe.src;
      showToast("Oyun yeniden yükleniyor...");
    } else {
      window.location.reload();
    }
  });

  // ==========================================
  // HUD / GAMEPAD TOGGLE & LOBBY AUTO-MODE
  // ==========================================
  let isControlsHidden = false;
  const lblHudStatus = document.getElementById('lbl-hud-status');

  function updateControlsVisibility() {
    if (isControlsHidden) {
      root.classList.add('hax-controls-hidden');
      lblHudStatus.innerText = "Gizli";
    } else {
      root.classList.remove('hax-controls-hidden');
      lblHudStatus.innerText = "Açık";
    }
  }

  document.getElementById('btn-toggle-hud').addEventListener('click', () => {
    isControlsHidden = !isControlsHidden;
    state.controlsManualToggle = isControlsHidden;
    updateControlsVisibility();
    showToast(isControlsHidden ? "Oyun Kontrolleri Gizlendi" : "Oyun Kontrolleri Açıldı");
    vibrate(15);
  });

  // ==========================================
  // SMART DOM WATCHER (AUTO NICKNAME, PASSWORD & LOBBY DETECTOR)
  // ==========================================
  let lastNickPromptSeen = false;
  let lastPassPromptSeen = false;

  setInterval(() => {
    const iframeDoc = getIframeDoc();
    const iframeWin = getIframeWin();
    if (!iframeDoc) return;

    // 1. Ensure Iframe Injected Styles & Canvas Scale Hook
    injectIframeStyles(iframeDoc);
    if (iframeWin) hookIframeCanvas(iframeWin);
    syncChatVisibility();

    // 2. Detect Choose Nickname View
    const nickView = iframeDoc.querySelector('.choose-nickname-view');
    if (nickView && nickView.offsetParent !== null) {
      if (!lastNickPromptSeen) {
        lastNickPromptSeen = true;
        console.log("[HaxBall Mobile] Detected choose-nickname-view!");
        if (state.nickname) {
          applyNickname(state.nickname);
        } else {
          openNicknameModal();
        }
      }
    } else {
      lastNickPromptSeen = false;
    }

    // 3. Detect Room Password View
    const passView = iframeDoc.querySelector('.room-password-view');
    if (passView && passView.offsetParent !== null) {
      if (!lastPassPromptSeen) {
        lastPassPromptSeen = true;
        console.log("[HaxBall Mobile] Detected room-password-view!");
        openPasswordModal();
      }
    } else {
      lastPassPromptSeen = false;
    }

    // 4. Auto Controls Switcher: In match vs In Lobby
    if (state.controlsManualToggle === null) {
      const inMatch = !!(iframeDoc.querySelector('.game-view') || iframeDoc.querySelector('canvas'));
      const inLobby = !!(iframeDoc.querySelector('.roomlist-view') || iframeDoc.querySelector('.choose-nickname-view'));

      if (inLobby && !isControlsHidden) {
        isControlsHidden = true;
        updateControlsVisibility();
      } else if (inMatch && isControlsHidden) {
        isControlsHidden = false;
        updateControlsVisibility();
      }
    }
  }, 400);

  console.log("[HaxBall Mobile] Wild Rift Edition Controller Ready!");
})();
