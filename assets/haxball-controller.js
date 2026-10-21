/**
 * HaxBall Mobile Controller & Smart Assistant Engine - Liquid Glass Edition
 * Developer & Architecture: Can Kızılyar
 * - Liquid Glass Splash Screen (1.25s Max, 120Hz Optimized)
 * - Edge-to-Edge Cutout / Notch Bleed (viewport-fit=cover)
 * - In-Game Top-Right Menu Access Protection (185px reserved safe area)
 * - Chat Separation: Keyboard-Free Drag/Tap Banter Wheel vs Dedicated Typing Prompt
 * - Integrated Avatar Picker (/avatar <emoji/text>)
 * - Server-Independent Local Player Statistics (Goals, Matches, Wins, Ratio)
 * - Zero-Drift Mathematically Accurate Joystick & Wild Rift Kick Button
 */
(function() {
  if (window.__haxballMobileLoaded) return;
  window.__haxballMobileLoaded = true;

  console.log("[HaxBall Mobile] Initializing Liquid Glass Edition by Can Kızılyar...");

  // Apply parent viewport overrides and ensure viewport-fit=cover
  function applyViewportCover(doc) {
    if (!doc) return;
    try {
      doc.documentElement.classList.add('hax-override-parent');
      if (doc.body) doc.body.classList.add('hax-override-parent');
      let meta = doc.querySelector('meta[name="viewport"]');
      if (!meta) {
        meta = doc.createElement('meta');
        meta.name = 'viewport';
        if (doc.head) doc.head.appendChild(meta);
      }
      meta.content = 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover';
    } catch(e) {}
  }
  applyViewportCover(document);

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
    { val: 0.70, label: "0.7x (Geniş)", short: "0.7x" },
    { val: 0.55, label: "0.55x (Tam Saha)", short: "0.55x" },
    { val: 1.0,  label: "1.0x (Normal)", short: "1.0x" },
    { val: 0.85, label: "0.85x (Orta)", short: "0.85x" }
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

  // Local Statistics State
  function loadLocalStats() {
    try {
      const raw = localStorage.getItem('hax_local_stats');
      if (raw) return JSON.parse(raw);
    } catch(e) {}
    return { goals: 0, matches: 0, wins: 0, losses: 0, assists: 0 };
  }

  // App State Management
  const state = {
    nickname: localStorage.getItem('hax_player_nick') || '',
    avatar: localStorage.getItem('hax_saved_avatar') || '👑',
    opacity: parseInt(localStorage.getItem('hax_opacity') || '85'),
    joyMode: localStorage.getItem('hax_joy_mode') || 'fixed',
    vibrate: localStorage.getItem('hax_vibrate') !== 'false',
    leftHanded: localStorage.getItem('hax_left_handed') === 'true',
    zoomIdx: savedZoomIdx,
    fieldZoom: ZOOM_PRESETS[savedZoomIdx].val,
    chatHidden: localStorage.getItem('hax_chat_hidden') === 'true',
    controlsManualToggle: null,
    customPhrases: JSON.parse(localStorage.getItem('hax_custom_phrases') || JSON.stringify(defaultCustoms)),
    stats: loadLocalStats()
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

  function saveLocalStats() {
    try {
      localStorage.setItem('hax_local_stats', JSON.stringify(state.stats));
    } catch(e) {}
    updateStatsUI();
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

  // ==========================================
  // 1. LIQUID GLASS SPLASH SCREEN ANIMATION
  // Duration: ~1.25s, hardware-accelerated 120Hz
  // ==========================================
  const splashEl = document.createElement('div');
  splashEl.id = 'hax-liquid-splash';
  splashEl.innerHTML = `
    <div class="splash-glass-card">
      <div class="splash-ball-wrapper">
        <span class="splash-ball-icon">⚽</span>
      </div>
      <h1 class="splash-title">HAXBALL</h1>
      <div class="splash-subtitle">PRO MOBILE CLIENT</div>
      <div class="splash-author-badge">
        <span>✦</span>
        <span>Geliştirici:</span>
        <span class="splash-author-name">Can Kızılyar</span>
        <span>✦</span>
      </div>
    </div>
  `;
  document.body.appendChild(splashEl);

  setTimeout(() => {
    splashEl.classList.add('splash-exit');
    setTimeout(() => {
      if (splashEl.parentNode) splashEl.parentNode.removeChild(splashEl);
    }, 320);
  }, 1000);

  // ==========================================
  // 2. SYNTHETIC KEY EVENTS DISPATCHER
  // ==========================================
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

  // ==========================================
  // 3. IN-GAME IFRAME STYLES INJECTION
  // Reserved Top-Right Menu & Compact Chat
  // ==========================================
  function injectIframeStyles(iframeDoc) {
    if (!iframeDoc || iframeDoc.getElementById('hax-iframe-custom-css')) return;
    applyViewportCover(iframeDoc);

    const style = iframeDoc.createElement('style');
    style.id = 'hax-iframe-custom-css';
    style.textContent = `
      /* Ensure in-game menu buttons (Menu, Rec, Sound, Link) are always accessible */
      .game-view > .buttons {
        z-index: 2147483640 !important;
        pointer-events: auto !important;
        background: rgba(15, 23, 42, 0.85) !important;
        border-radius: 0 0 0 12px !important;
        backdrop-filter: blur(8px) !important;
        -webkit-backdrop-filter: blur(8px) !important;
        border: 1px solid rgba(255, 255, 255, 0.2) !important;
        border-top: none !important;
        border-right: none !important;
        padding: 4px 8px !important;
        height: 30px !important;
      }
      .game-view > .buttons button {
        padding: 3px 7px !important;
        font-size: 11px !important;
        font-weight: 700 !important;
        border-radius: 6px !important;
        cursor: pointer !important;
        pointer-events: auto !important;
      }

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

      /* Chatbox Hide when toggled */
      .chatbox-view.hax-chat-hidden {
        display: none !important;
      }

      /* Centered, sleek Scoreboard */
      .game-state-view .bar {
        height: 28px !important;
        padding: 2px 10px !important;
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
    `;
    iframeDoc.head.appendChild(style);
  }

  // ==========================================
  // 4. CANVAS CAMERA SCALE & JITTER REDUCTION
  // ==========================================
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

    C2D.prototype.translate = function(tx, ty) {
      if (isPostCameraTranslatePending) {
        isPostCameraTranslatePending = false;
        if (window.__haxFieldZoom <= 0.60) {
          tx *= 0.35;
          ty *= 0.35;
        }
      }
      return origTranslate.call(this, tx, ty);
    };
  }

  // ==========================================
  // 5. BUILD MOBILE UI DOM
  // ==========================================
  const root = document.createElement('div');
  root.id = 'hax-mobile-root';
  if (state.leftHanded) root.classList.add('left-handed');
  root.style.opacity = (state.opacity / 100).toString();

  root.innerHTML = `
    <!-- Top Bar: Left cluster + Center scoreboard gap + Right tools (Reserved 185px for native Menu) -->
    <div class="hax-topbar" id="hax-topbar">
      <!-- Left Controls -->
      <div class="hax-topbar-left">
        <div class="hax-brand-mini">
          <span>⚽</span>
          <span>HAXBALL</span>
        </div>
        <button class="hax-btn hax-btn-nick" id="btn-open-nick">👤 <span id="lbl-nick-name">İsim</span></button>
        <button class="hax-btn hax-btn-avatar" id="btn-open-avatar">🎨 <span id="lbl-avatar-name">${state.avatar}</span></button>
        <button class="hax-btn hax-btn-stats" id="btn-open-stats">📊 <span id="lbl-top-stats">⚽ 0</span></button>
        <button class="hax-btn" id="btn-settings">⚙️</button>
      </div>

      <!-- Center Space (Empty for HaxBall Scoreboard & Clock) -->
      <div class="hax-topbar-center"></div>

      <!-- Right Tools (Cleanly shifted left of in-game Menu button) -->
      <div class="hax-topbar-right">
        <button class="hax-btn" id="btn-toggle-chat-box">👁️ <span id="lbl-chat-toggle">${state.chatHidden ? 'Aç' : 'Chat'}</span></button>
        <button class="hax-btn hax-btn-zoom" id="btn-zoom">🔍 <span id="lbl-zoom">${ZOOM_PRESETS[state.zoomIdx].short}</span></button>
        <button class="hax-btn" id="btn-toggle-hud">🎮 <span id="lbl-hud-status">HUD</span></button>
      </div>
    </div>

    <!-- Floating Goal Notification Banner (Appears when scoreboard detects goal) -->
    <div id="hax-goal-banner" style="display:none;">
      <span>⚽</span>
      <span style="font-weight:800; font-size:12px; color:#fcd34d;">GOL OLDU!</span>
      <button class="goal-banner-btn" id="btn-banner-save-clip">📹 8sn Gol Klibini Kaydet</button>
      <button style="background:transparent; border:none; color:#94a3b8; font-size:14px; cursor:pointer; padding:0 4px;" id="btn-banner-close">✕</button>
    </div>

    <!-- Thumb Action Dock (Above Kick Button: Dedicated Goal Clip Recorder, Banter Wheel & Typing Chat) -->
    <div class="hax-thumb-dock" id="hax-thumb-dock">
      <button class="hax-dock-btn-clip" id="hax-btn-clip-goal" title="Golün 5sn öncesi ve 3sn sonrasını kaydet">
        <span class="clip-rec-dot"></span>
        <span>📹 Golü Kaydet</span>
      </button>
      <button class="hax-dock-btn-wheel" id="hax-btn-banter-wheel">
        <span>🎯</span>
        <span>Racon Çarkı</span>
      </button>
      <button class="hax-dock-btn-type" id="hax-btn-type-chat">
        <span>⌨️</span>
        <span>Yaz</span>
      </button>
    </div>

    <!-- Virtual Joystick Touch Area (Left Corner) -->
    <div id="hax-joystick-zone">
      <div id="hax-joystick-base">
        <div id="hax-joystick-knob"></div>
      </div>
    </div>

    <!-- Wild Rift Single Primary Kick Button -->
    <div id="hax-buttons-zone">
      <button class="btn-primary-kick" id="hax-btn-kick">
        <span class="btn-icon">⚽</span>
        <span>VUR</span>
      </button>
    </div>

    <!-- ==========================================
         POPUP 1: ZERO-KEYBOARD BANTER WHEEL / DRAWER
         Drag & Release or Tap without summoning soft keyboard!
         ========================================== -->
    <div id="hax-banter-wheel-overlay" style="display:none;">
      <div class="banter-wheel-card">
        <div class="banter-wheel-header">
          <div class="banter-wheel-title">
            <span>🎯</span>
            <span>Hızlı Mesaj & Racon Çarkı</span>
          </div>
          <button class="modal-close" id="btn-close-wheel">✕</button>
        </div>

        <div class="banter-wheel-categories">
          <button class="banter-cat-btn active" data-wheel-cat="racon">🔥 Racon</button>
          <button class="banter-cat-btn" data-wheel-cat="tactic">⚽ Taktik</button>
          <button class="banter-cat-btn" data-wheel-cat="gg">👏 GG</button>
          <button class="banter-cat-btn" data-wheel-cat="commands">⚡ Komut</button>
          <button class="banter-cat-btn" data-wheel-cat="custom">⭐ Özel</button>
        </div>

        <div class="banter-slices-grid" id="banter-slices-container">
          <!-- Dynamic category chips injected here -->
        </div>

        <div style="margin-top:10px; display:flex; justify-content:space-between; align-items:center;">
          <span class="banter-wheel-hint">💡 Dokunarak hemen gönder! Klavye açılmaz.</span>
          <button class="hax-btn" id="btn-wheel-add-custom" style="padding:3px 8px; font-size:11px;">➕ Özel Ekle</button>
        </div>
      </div>
    </div>

    <!-- ==========================================
         POPUP 2: DEDICATED TYPING CHAT MODAL
         ========================================== -->
    <div class="hax-modal" id="hax-typechat-modal" style="display:none;">
      <div class="modal-card">
        <div class="modal-header">
          <h3>⌨️ Odaya Mesaj Yaz</h3>
          <button class="modal-close" id="btn-close-typechat">✕</button>
        </div>
        <div class="modal-body">
          <div class="hax-input-group">
            <div class="hax-input-row">
              <input type="text" class="hax-text-input" id="ipt-typechat-msg" placeholder="Mesajınızı yazın..." />
              <button class="hax-btn hax-btn-primary" id="btn-confirm-typechat" style="padding:9px 14px;">Gönder 🚀</button>
            </div>
          </div>
          <button class="hax-btn-full hax-btn-native" id="btn-native-typechat">📱 Sistem Klavyesi ile Yaz</button>
        </div>
      </div>
    </div>

    <!-- ==========================================
         POPUP 3: AVATAR PICKER MODAL (/avatar <val>)
         ========================================== -->
    <div class="hax-modal" id="hax-avatar-modal" style="display:none;">
      <div class="modal-card">
        <div class="modal-header">
          <h3>🎨 Avatar Seçici</h3>
          <button class="modal-close" id="btn-close-avatar">✕</button>
        </div>
        <div class="modal-body">
          <!-- Live Preview Disc -->
          <div class="avatar-preview-container">
            <div class="avatar-disc" id="avatar-preview-disc">${state.avatar}</div>
            <div class="avatar-preview-info">
              <div class="avatar-preview-title">Mevcut Avatar: <span id="avatar-preview-text">${state.avatar}</span></div>
              <div class="avatar-preview-desc">Oyun içinde diskinizin üzerinde görünür (/avatar).</div>
            </div>
          </div>

          <div class="hax-input-label">Popüler Emojiler (Tek Dokunuşla Seç):</div>
          <div class="avatar-presets-grid" id="avatar-emoji-grid">
            <!-- Injected below -->
          </div>

          <div class="hax-input-label">Klasik Yazı & Sayılar:</div>
          <div class="avatar-presets-grid" id="avatar-text-grid">
            <!-- Injected below -->
          </div>

          <div class="hax-input-group" style="margin-top:10px;">
            <label class="hax-input-label">Özel Karakter Gir (Maks 2 karakter):</label>
            <div class="hax-input-row">
              <input type="text" class="hax-text-input" id="ipt-custom-avatar" placeholder="Örn: 99, XD, 👑" maxlength="2" />
              <button class="hax-btn hax-btn-primary" id="btn-apply-custom-avatar">Uygula</button>
            </div>
          </div>

          <button class="hax-btn-full" id="btn-clear-avatar" style="background:#334155; color:#f87171;">❌ Avatarı Kaldır</button>
        </div>
      </div>
    </div>

    <!-- ==========================================
         POPUP 4: LOCAL STATISTICS TRACKER MODAL
         ========================================== -->
    <div class="hax-modal" id="hax-stats-modal" style="display:none;">
      <div class="modal-card">
        <div class="modal-header">
          <h3>📊 Oyuncu İstatistikleri</h3>
          <button class="modal-close" id="btn-close-stats">✕</button>
        </div>
        <div class="modal-body">
          <p style="font-size:11px; color:#94a3b8; margin-bottom:10px;">
            Sunuculardan bağımsız, yerel olarak kaydedilen kişisel maç ve gol istatistikleriniz:
          </p>
          <div class="stats-cards-grid">
            <div class="stat-card">
              <div class="stat-val" id="stat-val-goals">${state.stats.goals}</div>
              <div class="stat-label">⚽ Gol</div>
              <div class="stat-adjusters">
                <button class="stat-adjust-btn" data-adj="goals" data-amt="1">+1</button>
                <button class="stat-adjust-btn" data-adj="goals" data-amt="-1">-1</button>
              </div>
            </div>

            <div class="stat-card">
              <div class="stat-val" id="stat-val-wins">${state.stats.wins}</div>
              <div class="stat-label">🏆 Galibiyet</div>
              <div class="stat-adjusters">
                <button class="stat-adjust-btn" data-adj="wins" data-amt="1">+1</button>
                <button class="stat-adjust-btn" data-adj="wins" data-amt="-1">-1</button>
              </div>
            </div>

            <div class="stat-card">
              <div class="stat-val" id="stat-val-matches">${state.stats.matches}</div>
              <div class="stat-label">🎮 Maç</div>
              <div class="stat-adjusters">
                <button class="stat-adjust-btn" data-adj="matches" data-amt="1">+1</button>
                <button class="stat-adjust-btn" data-adj="matches" data-amt="-1">-1</button>
              </div>
            </div>

            <div class="stat-card">
              <div class="stat-val" id="stat-val-winrate">0%</div>
              <div class="stat-label">🎯 Kazanma %</div>
            </div>

            <div class="stat-card">
              <div class="stat-val" id="stat-val-ratio">0.00</div>
              <div class="stat-label">⚡ Gol / Maç</div>
            </div>

            <div class="stat-card">
              <div class="stat-val" id="stat-val-assists">${state.stats.assists}</div>
              <div class="stat-label">🧤 Asist</div>
              <div class="stat-adjusters">
                <button class="stat-adjust-btn" data-adj="assists" data-amt="1">+1</button>
                <button class="stat-adjust-btn" data-adj="assists" data-amt="-1">-1</button>
              </div>
            </div>
          </div>

          <div style="display:flex; gap:6px; margin-top:12px;">
            <button class="hax-btn-full" id="btn-reset-stats" style="background:#451a03; color:#f87171; border:1px solid #78350f;">🗑️ Sıfırla</button>
          </div>
        </div>
      </div>
    </div>

    <!-- ==========================================
         POPUP: GOAL REPLAY CLIP PREVIEW MODAL
         ========================================== -->
    <div class="hax-modal" id="hax-clip-preview-modal" style="display:none;">
      <div class="modal-card" style="max-width: 440px; text-align: center;">
        <div class="modal-header">
          <h3>🎬 8sn Gol Tekrarı (Replay)</h3>
          <button class="modal-close" id="btn-close-clip-preview">✕</button>
        </div>
        <div class="modal-body" style="padding: 4px;">
          <video id="hax-clip-video-el" controls autoplay playsinline loop style="width: 100%; max-height: 220px; border-radius: 12px; background: #000; border: 1.5px solid rgba(56, 189, 248, 0.4);"></video>
          <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 10px;">
            <span style="font-size: 11px; color: #34d399; font-weight: 700;">✓ Galeriye ve İndirilenler'e Kaydedildi</span>
            <button class="hax-btn hax-btn-primary" id="btn-preview-share" style="padding: 6px 14px; font-size: 12px;">📤 Paylaş</button>
          </div>
        </div>
      </div>
    </div>

    <!-- ==========================================
         POPUP 5: NICKNAME MANAGEMENT MODAL
         ========================================== -->
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

    <!-- ==========================================
         POPUP 6: ROOM PASSWORD MODAL
         ========================================== -->
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

    <!-- ==========================================
         POPUP 7: SETTINGS MODAL
         ========================================== -->
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

    <!-- ==========================================
         POPUP 8: JOIN ROOM MODAL
         ========================================== -->
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
  // 6. PERFECT ZERO-DRIFT JOYSTICK
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
  // 7. PRIMARY KICK BUTTON (WILD RIFT ACTION)
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
  // 8. SEND CHAT MESSAGE DISPATCHER
  // ==========================================
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

  // ==========================================
  // 9. ZERO-KEYBOARD BANTER WHEEL / DRAWER
  // Instant send without opening soft keyboard!
  // ==========================================
  const wheelOverlay = document.getElementById('hax-banter-wheel-overlay');
  const wheelContainer = document.getElementById('banter-slices-container');
  const btnBanterWheel = document.getElementById('hax-btn-banter-wheel');
  let currentWheelCat = 'racon';

  const BANTER_DICTIONARY = {
    racon: [
      "Ağlama oyna",
      "Kolsuz seni",
      "Babanız geldi",
      "Sil şu oyunu aq",
      "Kaleden kaleye gol utan",
      "Kolu ısır kolu",
      "Lag olmasa 5 lemiştim",
      "Balını seveyim",
      "Hırsız kaleci",
      "Troll müsün git",
      "Yatacak yerin yok",
      "Hadi köyüne",
      "Kör müsün pas at",
      "Boş yapma icraat yap"
    ],
    tactic: [
      "⚽ Pas ver pas!",
      "🥅 Kaleye geç!",
      "🎯 Vur artık şut çek!",
      "🔄 Defans yapın lan!",
      "🧤 Çıkma kaleden kal!",
      "🚀 Açıl sola açıl!",
      "🏃 Pres yap bas bas!",
      "⚽ Bırak bende!"
    ],
    gg: [
      "🔥 GG WP iyi oyundu!",
      "👑 Kral adamsın!",
      "👏 Helal olsun usta!",
      "🇧🇷 Brezilya mısın!",
      "⚡ Fırtına gibi esti!",
      "💪 Adamsın be!",
      "🎯 Bu ne goldü öyle!",
      "🙏 Pardon lag vardı!"
    ],
    commands: [
      "!stats",
      "!afk",
      "!spec",
      "!bb",
      "!admin",
      "!swap",
      "!reset",
      "!help"
    ]
  };

  function renderWheelSlices(category) {
    currentWheelCat = category;
    wheelContainer.innerHTML = '';
    const list = (category === 'custom') ? state.customPhrases : (BANTER_DICTIONARY[category] || []);

    list.forEach(msg => {
      const slice = document.createElement('div');
      slice.className = 'banter-slice';
      slice.innerText = msg;
      slice.setAttribute('data-msg', msg);
      slice.addEventListener('click', () => {
        sendChatMessage(msg);
        wheelOverlay.style.display = 'none';
      });
      wheelContainer.appendChild(slice);
    });
  }

  function openBanterWheel() {
    wheelOverlay.style.display = 'flex';
    renderWheelSlices(currentWheelCat);
    vibrate(15);
  }

  btnBanterWheel.addEventListener('click', openBanterWheel);
  document.getElementById('btn-close-wheel').addEventListener('click', () => {
    wheelOverlay.style.display = 'none';
  });
  wheelOverlay.addEventListener('click', (e) => {
    if (e.target === wheelOverlay) wheelOverlay.style.display = 'none';
  });

  wheelOverlay.querySelectorAll('.banter-cat-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      wheelOverlay.querySelectorAll('.banter-cat-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      renderWheelSlices(btn.getAttribute('data-wheel-cat'));
      vibrate(10);
    });
  });

  document.getElementById('btn-wheel-add-custom').addEventListener('click', () => {
    if (window.Android && window.Android.showNativePrompt) {
      window.Android.showNativePrompt("Özel Hızlı Mesaj", "Kaydetmek istediğiniz mesajı girin:", "", "add_custom_phrase");
    } else {
      const p = prompt("Kaydetmek istediğiniz hızlı mesajı yazın:");
      if (p && p.trim()) {
        state.customPhrases.push(p.trim());
        localStorage.setItem('hax_custom_phrases', JSON.stringify(state.customPhrases));
        if (currentWheelCat === 'custom') renderWheelSlices('custom');
      }
    }
  });

  // ==========================================
  // 10. DEDICATED TYPING CHAT MODAL
  // ==========================================
  const typeChatModal = document.getElementById('hax-typechat-modal');
  const iptTypeChat = document.getElementById('ipt-typechat-msg');

  function openTypeChat() {
    typeChatModal.style.display = 'flex';
    iptTypeChat.value = '';
    setTimeout(() => {
      iptTypeChat.focus();
      if (window.Android && window.Android.showSoftKeyboard) {
        window.Android.showSoftKeyboard();
      }
    }, 100);
  }

  document.getElementById('hax-btn-type-chat').addEventListener('click', openTypeChat);
  document.getElementById('btn-close-typechat').addEventListener('click', () => {
    typeChatModal.style.display = 'none';
  });

  function submitTypeChat() {
    const txt = iptTypeChat.value;
    if (txt && txt.trim()) {
      sendChatMessage(txt.trim());
    }
    typeChatModal.style.display = 'none';
  }

  document.getElementById('btn-confirm-typechat').addEventListener('click', submitTypeChat);
  iptTypeChat.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') submitTypeChat();
  });

  document.getElementById('btn-native-typechat').addEventListener('click', () => {
    if (window.Android && window.Android.showNativePrompt) {
      window.Android.showNativePrompt("HaxBall Sohbet", "Odaya mesajınızı yazın:", iptTypeChat.value || "", "send_chat");
    } else {
      const res = prompt("Odaya mesaj gönder:", iptTypeChat.value || "");
      if (res) sendChatMessage(res);
    }
  });

  // ==========================================
  // 11. AVATAR PICKER MODAL (/avatar <val>)
  // ==========================================
  const avatarModal = document.getElementById('hax-avatar-modal');
  const avatarDisc = document.getElementById('avatar-preview-disc');
  const avatarPreviewText = document.getElementById('avatar-preview-text');
  const lblAvatarName = document.getElementById('lbl-avatar-name');
  const iptCustomAvatar = document.getElementById('ipt-custom-avatar');

  const AVATAR_EMOJIS = [
    "👑", "⚽", "🔥", "⚡", "💀", "🦁", "🎯", "🚀", "🧤", "🇹🇷",
    "🇧🇷", "🇦🇷", "⭐", "💎", "🤖", "👻", "👽", "🐺", "💣", "🥶",
    "😎", "😈", "🏆", "🎩", "🥊", "💰", "👀", "💤", "🌪️", "🥇"
  ];

  const AVATAR_TEXTS = [
    ":D", "XD", "10", "7", "99", "GG", "NO", "OK",
    "GO", "EZ", "$$", "??", "!!", "<3", "GL", "HF", "OP"
  ];

  function renderAvatarPresets() {
    const emojiGrid = document.getElementById('avatar-emoji-grid');
    const textGrid = document.getElementById('avatar-text-grid');
    emojiGrid.innerHTML = '';
    textGrid.innerHTML = '';

    AVATAR_EMOJIS.forEach(emoji => {
      const btn = document.createElement('button');
      btn.className = 'avatar-preset-btn';
      btn.innerText = emoji;
      btn.addEventListener('click', () => applyAvatar(emoji));
      emojiGrid.appendChild(btn);
    });

    AVATAR_TEXTS.forEach(txt => {
      const btn = document.createElement('button');
      btn.className = 'avatar-preset-btn';
      btn.innerText = txt;
      btn.style.fontSize = '12px';
      btn.addEventListener('click', () => applyAvatar(txt));
      textGrid.appendChild(btn);
    });
  }
  renderAvatarPresets();

  function applyAvatar(val) {
    val = (val || '').trim();
    state.avatar = val;
    localStorage.setItem('hax_saved_avatar', val);
    avatarDisc.innerText = val || ' ';
    avatarPreviewText.innerText = val || '(Yok)';
    lblAvatarName.innerText = val || 'Avatar';

    // Dispatch HaxBall command: /avatar <val>
    sendChatMessage('/avatar ' + val);
    showToast(val ? "Avatar Ayarlandı: " + val : "Avatar Kaldırıldı");
    vibrate(20);
    avatarModal.style.display = 'none';
  }

  document.getElementById('btn-open-avatar').addEventListener('click', () => {
    avatarModal.style.display = 'flex';
    avatarDisc.innerText = state.avatar || ' ';
    avatarPreviewText.innerText = state.avatar || '(Yok)';
    iptCustomAvatar.value = state.avatar || '';
  });

  document.getElementById('btn-close-avatar').addEventListener('click', () => {
    avatarModal.style.display = 'none';
  });

  document.getElementById('btn-apply-custom-avatar').addEventListener('click', () => {
    applyAvatar(iptCustomAvatar.value);
  });

  document.getElementById('btn-clear-avatar').addEventListener('click', () => {
    applyAvatar('');
  });

  // ==========================================
  // 12. SERVER-INDEPENDENT LOCAL STATS ENGINE
  // ==========================================
  const statsModal = document.getElementById('hax-stats-modal');
  const lblTopStats = document.getElementById('lbl-top-stats');

  function updateStatsUI() {
    const s = state.stats;
    lblTopStats.innerText = `⚽ ${s.goals} | 🏆 ${s.wins}`;

    const elGoals = document.getElementById('stat-val-goals');
    const elWins = document.getElementById('stat-val-wins');
    const elMatches = document.getElementById('stat-val-matches');
    const elAssists = document.getElementById('stat-val-assists');
    const elWinrate = document.getElementById('stat-val-winrate');
    const elRatio = document.getElementById('stat-val-ratio');

    if (elGoals) elGoals.innerText = s.goals;
    if (elWins) elWins.innerText = s.wins;
    if (elMatches) elMatches.innerText = s.matches;
    if (elAssists) elAssists.innerText = s.assists;

    const winRate = s.matches > 0 ? Math.round((s.wins / s.matches) * 100) : 0;
    const ratio = s.matches > 0 ? (s.goals / s.matches).toFixed(2) : '0.00';

    if (elWinrate) elWinrate.innerText = winRate + '%';
    if (elRatio) elRatio.innerText = ratio;
  }
  updateStatsUI();

  document.getElementById('btn-open-stats').addEventListener('click', () => {
    updateStatsUI();
    statsModal.style.display = 'flex';
  });
  document.getElementById('btn-close-stats').addEventListener('click', () => {
    statsModal.style.display = 'none';
  });

  statsModal.querySelectorAll('.stat-adjust-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const key = btn.getAttribute('data-adj');
      const amt = parseInt(btn.getAttribute('data-amt') || '1');
      if (state.stats[key] !== undefined) {
        state.stats[key] = Math.max(0, state.stats[key] + amt);
        saveLocalStats();
        vibrate(15);
      }
    });
  });

  document.getElementById('btn-reset-stats').addEventListener('click', () => {
    if (confirm("Tüm yerel istatistikleri sıfırlamak istediğinize emin misiniz?")) {
      state.stats = { goals: 0, matches: 0, wins: 0, losses: 0, assists: 0 };
      saveLocalStats();
      showToast("İstatistikler sıfırlandı");
      vibrate(30);
    }
  });

  // ==========================================
  // 13. FIELD ZOOM (CAMERA SCALING)
  // ==========================================
  const zoomBtn = document.getElementById('btn-zoom');
  const zoomLbl = document.getElementById('lbl-zoom');

  function applyZoom(idx) {
    state.zoomIdx = idx;
    state.fieldZoom = ZOOM_PRESETS[idx].val;
    window.__haxFieldZoom = state.fieldZoom;
    localStorage.setItem('hax_zoom_idx', idx.toString());
    zoomLbl.innerText = ZOOM_PRESETS[idx].short;
    showToast("Kamera Görünümü: " + ZOOM_PRESETS[idx].label);
    vibrate(20);
  }

  zoomBtn.addEventListener('click', () => {
    const nextIdx = (state.zoomIdx + 1) % ZOOM_PRESETS.length;
    applyZoom(nextIdx);
  });

  // ==========================================
  // 14. IN-GAME CHATBOX TOGGLE
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
    lblChatToggle.innerText = state.chatHidden ? 'Aç' : 'Chat';
  }

  toggleChatBoxBtn.addEventListener('click', () => {
    state.chatHidden = !state.chatHidden;
    localStorage.setItem('hax_chat_hidden', state.chatHidden ? 'true' : 'false');
    syncChatVisibility();
    showToast(state.chatHidden ? "Oyun İçi Chat Gizlendi" : "Oyun İçi Chat Açıldı");
    vibrate(15);
  });

  // ==========================================
  // 15. NICKNAME POPUP & MANAGEMENT
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

    showToast("Oyuncu Adı: " + nick);
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
  // 16. ROOM PASSWORD POPUP
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
  // 17. NATIVE ANDROID BRIDGE CALLBACK
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
      if (currentWheelCat === 'custom') renderWheelSlices('custom');
      showToast("Özel mesaj eklendi");
    } else if (action === 'join_room') {
      document.getElementById('ipt-room').value = text;
      document.getElementById('btn-confirm-join').click();
    }
  };

  // ==========================================
  // 18. JOIN ROOM MODAL & CLIPBOARD INTEGRATION
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
  // 19. SETTINGS MODAL
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
  // 20. HUD / GAMEPAD TOGGLE
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
  // 21. STAGGERED TWIN ROLLING RECORDERS (100% UNCORRUPTED REPLAYS)
  // Ensures every saved file has complete container headers, valid keyframes, and proper duration!
  // ==========================================
  let activeCanvas = null;
  let recA = null, recB = null;
  let recAStartTime = 0, recBStartTime = 0;
  let recAChunks = [], recBChunks = [];
  let isClipping = false;
  let staggerTimer = null;
  let lastSavedFilename = "";

  function getBestVideoMimeType() {
    const types = [
      'video/mp4; codecs="avc1.42E01E"',
      'video/mp4',
      'video/webm; codecs=vp8',
      'video/webm; codecs=vp9',
      'video/webm'
    ];
    for (const t of types) {
      if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(t)) {
        return t;
      }
    }
    return 'video/webm';
  }

  function createRecorder(stream, mimeType, onChunk) {
    try {
      const rec = new MediaRecorder(stream, {
        mimeType: mimeType,
        videoBitsPerSecond: 3000000 // 3 Mbps crystal clear HD
      });
      rec.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) onChunk(e.data);
      };
      return rec;
    } catch(e) {
      console.warn("[HaxBall Mobile] createRecorder error:", e);
      return null;
    }
  }

  function startTwinRecorders(canvas) {
    if (!canvas || activeCanvas === canvas) return;
    activeCanvas = canvas;

    const stream = canvas.captureStream ? canvas.captureStream(60) : (canvas.mozCaptureStream ? canvas.mozCaptureStream(60) : null);
    if (!stream) return;

    const mime = getBestVideoMimeType();
    console.log("[HaxBall Mobile] Starting Twin Recorders with MIME:", mime);

    if (recA && recA.state !== 'inactive') try { recA.stop(); } catch(e) {}
    if (recB && recB.state !== 'inactive') try { recB.stop(); } catch(e) {}
    if (staggerTimer) clearInterval(staggerTimer);

    recAChunks = [];
    recBChunks = [];

    recA = createRecorder(stream, mime, (chunk) => recAChunks.push(chunk));
    recB = createRecorder(stream, mime, (chunk) => recBChunks.push(chunk));

    if (!recA || !recB) return;

    // Start RecA at t = 0
    recAChunks = [];
    recAStartTime = Date.now();
    try { recA.start(1000); } catch(e) {}

    // Start RecB at t = 5s
    setTimeout(() => {
      if (!recB || isClipping) return;
      recBChunks = [];
      recBStartTime = Date.now();
      try { recB.start(1000); } catch(e) {}
    }, 5000);

    // Stagger loop: every 5 seconds, alternate stopping and restarting
    let cycle = 0;
    staggerTimer = setInterval(() => {
      if (isClipping) return;
      cycle++;
      if (cycle % 2 === 0) {
        // Restart RecA
        if (recA && recA.state === 'recording') {
          try { recA.stop(); } catch(e) {}
          setTimeout(() => {
            if (isClipping || !recA) return;
            recAChunks = [];
            recAStartTime = Date.now();
            try { recA.start(1000); } catch(e) {}
          }, 150);
        }
      } else {
        // Restart RecB
        if (recB && recB.state === 'recording') {
          try { recB.stop(); } catch(e) {}
          setTimeout(() => {
            if (isClipping || !recB) return;
            recBChunks = [];
            recBStartTime = Date.now();
            try { recB.start(1000); } catch(e) {}
          }, 150);
        }
      }
    }, 5000);
  }

  function sendBlobToAndroidChunked(blob, filename) {
    const reader = new FileReader();
    reader.onloadend = function() {
      if (!reader.result) return;
      const base64 = reader.result.split(',')[1];
      if (!base64) return;

      const chunkSize = 512 * 1024; // 512 KB safe chunk
      const totalLen = base64.length;
      let offset = 0;

      while (offset < totalLen) {
        const chunk = base64.substring(offset, offset + chunkSize);
        const isFirst = (offset === 0);
        const isLast = (offset + chunkSize >= totalLen);

        if (window.Android && window.Android.saveVideoChunk) {
          window.Android.saveVideoChunk(chunk, isFirst, isLast, filename);
        }
        offset += chunkSize;
      }
    };
    reader.readAsDataURL(blob);
  }

  function showClipPreviewModal(blob, filename) {
    lastSavedFilename = filename;
    const modal = document.getElementById('hax-clip-preview-modal');
    const videoEl = document.getElementById('hax-clip-video-el');
    if (!modal || !videoEl) return;

    const url = URL.createObjectURL(blob);
    videoEl.src = url;
    modal.style.display = 'flex';
    videoEl.play().catch(() => {});
  }

  document.getElementById('btn-close-clip-preview').addEventListener('click', () => {
    const modal = document.getElementById('hax-clip-preview-modal');
    const videoEl = document.getElementById('hax-clip-video-el');
    if (videoEl) videoEl.pause();
    if (modal) modal.style.display = 'none';
  });

  document.getElementById('btn-preview-share').addEventListener('click', () => {
    if (window.Android && window.Android.shareVideo && lastSavedFilename) {
      window.Android.shareVideo(lastSavedFilename);
    } else {
      showToast("Video Galeri ve İndirilenler klasörünüzde hazır!");
    }
  });

  function captureGoalClip() {
    if (isClipping) {
      showToast("Zaten bir gol klibi kaydediliyor...");
      return;
    }

    const now = Date.now();
    const ageA = (recA && recA.state === 'recording') ? (now - recAStartTime) : 0;
    const ageB = (recB && recB.state === 'recording') ? (now - recBStartTime) : 0;

    // Select the recorder that has longer history (5-9 seconds!)
    let targetRec = (ageA >= ageB) ? recA : recB;
    let targetChunks = (ageA >= ageB) ? recAChunks : recBChunks;
    let targetName = (ageA >= ageB) ? "RecA" : "RecB";

    if (!targetRec || targetRec.state !== 'recording') {
      showToast("Kayıt motoru hazırlanıyor, 2 saniye sonra tekrar deneyin");
      return;
    }

    isClipping = true;
    const clipBtn = document.getElementById('hax-btn-clip-goal');
    if (clipBtn) clipBtn.classList.add('clipping');
    vibrate(40);
    showToast("📹 Gol kaydediliyor... (+3 sn sonrasını bekliyor)");

    // Wait 3.2 seconds to capture the goal celebration!
    setTimeout(() => {
      try {
        const mime = getBestVideoMimeType();
        targetRec.onstop = () => {
          try {
            const finalBlob = new Blob(targetChunks, { type: mime });
            console.log(`[HaxBall Mobile] Goal clip captured from ${targetName}. Size: ${finalBlob.size} bytes`);

            if (finalBlob.size < 4000) {
              showToast("Klip verisi yetersiz!");
              return;
            }

            const ext = mime.includes('mp4') ? 'mp4' : 'webm';
            const d = new Date();
            const timePad = (n) => String(n).padStart(2, '0');
            const timestamp = `${d.getFullYear()}${timePad(d.getMonth()+1)}${timePad(d.getDate())}_${timePad(d.getHours())}${timePad(d.getMinutes())}${timePad(d.getSeconds())}`;
            const filename = `HaxBall_Goal_${timestamp}.${ext}`;

            // 1. Save uncorrupted chunked stream to Android Gallery
            sendBlobToAndroidChunked(finalBlob, filename);

            // 2. Browser download fallback
            try {
              const url = URL.createObjectURL(finalBlob);
              const a = document.createElement('a');
              a.href = url;
              a.download = filename;
              document.body.appendChild(a);
              a.click();
              setTimeout(() => {
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
              }, 3000);
            } catch(e) {}

            // 3. Show In-App Clip Preview Player
            showClipPreviewModal(finalBlob, filename);

            // 4. Auto update local goal stats!
            state.stats.goals += 1;
            saveLocalStats();

            showToast("🎉 Gol Videosu Kaydedildi! (Galeriye Eklendi)");
            vibrate([50, 70, 90]);

            const banner = document.getElementById('hax-goal-banner');
            if (banner) banner.style.display = 'none';
          } catch(err) {
            console.error("[HaxBall Mobile] Clip process error:", err);
            showToast("Klip kaydedilirken hata oluştu");
          } finally {
            isClipping = false;
            if (clipBtn) clipBtn.classList.remove('clipping');
            // Restart the target recorder
            const stream = activeCanvas ? (activeCanvas.captureStream ? activeCanvas.captureStream(60) : null) : null;
            if (stream) {
              if (targetName === "RecA") {
                recAChunks = [];
                recAStartTime = Date.now();
                recA = createRecorder(stream, mime, (c) => recAChunks.push(c));
                try { recA.start(1000); } catch(e) {}
              } else {
                recBChunks = [];
                recBStartTime = Date.now();
                recB = createRecorder(stream, mime, (c) => recBChunks.push(c));
                try { recB.start(1000); } catch(e) {}
              }
            }
          }
        };

        // Stop target recorder -> MediaRecorder closes the container and writes valid header & EOF!
        targetRec.stop();

      } catch(err) {
        console.error("[HaxBall Mobile] Clip stop error:", err);
        isClipping = false;
        if (clipBtn) clipBtn.classList.remove('clipping');
      }
    }, 3200);
  }

  // Hook Goal Clip buttons
  const btnClipGoal = document.getElementById('hax-btn-clip-goal');
  if (btnClipGoal) btnClipGoal.addEventListener('click', captureGoalClip);

  const btnBannerSave = document.getElementById('btn-banner-save-clip');
  if (btnBannerSave) btnBannerSave.addEventListener('click', captureGoalClip);

  const btnBannerClose = document.getElementById('btn-banner-close');
  if (btnBannerClose) {
    btnBannerClose.addEventListener('click', () => {
      const banner = document.getElementById('hax-goal-banner');
      if (banner) banner.style.display = 'none';
    });
  }

  let goalBannerTimeout = null;
  function showGoalBanner() {
    const banner = document.getElementById('hax-goal-banner');
    if (!banner) return;
    banner.style.display = 'flex';
    vibrate(30);

    if (goalBannerTimeout) clearTimeout(goalBannerTimeout);
    goalBannerTimeout = setTimeout(() => {
      banner.style.display = 'none';
    }, 7000);
  }

  // ==========================================
  // 22. SCOREBOARD & MATCH GOAL DETECTOR
  // ==========================================
  let lastRedScore = null;
  let lastBlueScore = null;

  function checkScoreboardChanges(iframeDoc) {
    if (!iframeDoc) return;
    const scoreEls = iframeDoc.querySelectorAll('.game-state-view .scoreboard .score') ||
                     iframeDoc.querySelectorAll('.scoreboard .score');
    if (scoreEls.length >= 2) {
      const red = parseInt(scoreEls[0].innerText || '0');
      const blue = parseInt(scoreEls[1].innerText || '0');

      if (!isNaN(red) && !isNaN(blue)) {
        if (lastRedScore !== null && lastBlueScore !== null) {
          if (red > lastRedScore || blue > lastBlueScore) {
            console.log(`[HaxBall Mobile] Scoreboard Goal Detected! Score: ${red} - ${blue}`);
            showGoalBanner();
          }
        }
        lastRedScore = red;
        lastBlueScore = blue;
      }
    }
  }

  // ==========================================
  // 23. DOM WATCHER & AUTO STATS DETECTION
  // ==========================================
  let lastNickPromptSeen = false;
  let lastPassPromptSeen = false;
  let lastSeenChatLines = 0;
  let autoAvatarAppliedForRoom = false;

  setInterval(() => {
    const iframeDoc = getIframeDoc();
    const iframeWin = getIframeWin();
    if (!iframeDoc) return;

    // 1. Ensure Iframe Injected Styles & Canvas Scale Hook
    injectIframeStyles(iframeDoc);
    if (iframeWin) hookIframeCanvas(iframeWin);
    syncChatVisibility();

    // 2. Ensure Canvas Attached to Staggered Twin Recorders
    const canvas = iframeDoc.querySelector('canvas');
    if (canvas) {
      startTwinRecorders(canvas);
    }

    // 3. Monitor Scoreboard for Instant Goal Detection
    checkScoreboardChanges(iframeDoc);

    // 4. Detect Choose Nickname View
    const nickView = iframeDoc.querySelector('.choose-nickname-view');
    if (nickView && nickView.offsetParent !== null) {
      if (!lastNickPromptSeen) {
        lastNickPromptSeen = true;
        if (state.nickname) {
          applyNickname(state.nickname);
        } else {
          openNicknameModal();
        }
      }
    } else {
      lastNickPromptSeen = false;
    }

    // 5. Detect Room Password View
    const passView = iframeDoc.querySelector('.room-password-view');
    if (passView && passView.offsetParent !== null) {
      if (!lastPassPromptSeen) {
        lastPassPromptSeen = true;
        openPasswordModal();
      }
    } else {
      lastPassPromptSeen = false;
    }

    // 6. In Match vs In Lobby Controls Switcher
    const inMatch = !!(iframeDoc.querySelector('.game-view') || iframeDoc.querySelector('canvas'));
    const inLobby = !!(iframeDoc.querySelector('.roomlist-view') || iframeDoc.querySelector('.choose-nickname-view'));

    if (state.controlsManualToggle === null) {
      if (inLobby && !isControlsHidden) {
        isControlsHidden = true;
        updateControlsVisibility();
        autoAvatarAppliedForRoom = false;
      } else if (inMatch && isControlsHidden) {
        isControlsHidden = false;
        updateControlsVisibility();
      }
    }

    // 7. Auto Apply Saved Avatar When Entering Match
    if (inMatch && !autoAvatarAppliedForRoom && state.avatar) {
      autoAvatarAppliedForRoom = true;
      setTimeout(() => {
        sendChatMessage('/avatar ' + state.avatar);
      }, 1200);
    }

    // 8. Automatic Match & Goal Detection from Chat Log
    const chatLogEl = iframeDoc.querySelector('.chatbox-view-contents > .log .log-contents');
    if (chatLogEl) {
      const pTags = chatLogEl.querySelectorAll('p');
      if (pTags.length > lastSeenChatLines) {
        for (let i = lastSeenChatLines; i < pTags.length; i++) {
          const rawTxt = (pTags[i].innerText || '').trim();
          const txt = rawTxt.toLowerCase();
          const nick = (state.nickname || '').trim().toLowerCase();

          // Goal detection with room bot regex patterns
          const isGoalAnnouncement = txt.includes('goal') || txt.includes('gol') || txt.includes('scored');
          if (isGoalAnnouncement) {
            showGoalBanner();
            if (nick && txt.includes(nick)) {
              state.stats.goals += 1;
              saveLocalStats();
              showToast("⚽ Golün İstatistiklere Kaydedildi! (" + state.stats.goals + ")");
            }
          }

          // Match win & match completion detection
          if (txt.includes('won the match') || txt.includes('kazandı') || txt.includes('oyun bitti') || txt.includes('game ended')) {
            state.stats.matches += 1;
            if (nick && txt.includes(nick)) {
              state.stats.wins += 1;
            }
            saveLocalStats();
          }
        }
        lastSeenChatLines = pTags.length;
      }
    }
  }, 400);

  console.log("[HaxBall Mobile] Controller Initialized Successfully!");
})();
