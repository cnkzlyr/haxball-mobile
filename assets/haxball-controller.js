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

  // Zoom & Field Camera Settings (Default 0.58x Tam Saha for perfect mobile edge-to-edge fit)
  let savedFieldZoom = parseFloat(localStorage.getItem('hax_field_zoom') || '0.58');
  if (isNaN(savedFieldZoom) || savedFieldZoom < 0.40 || savedFieldZoom > 1.30) {
    savedFieldZoom = 0.58;
  }
  const savedCameraLock = localStorage.getItem('hax_camera_lock') === 'true';

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
    controlType: localStorage.getItem('hax_control_type') || 'dynamic', // 'dynamic' | 'fixed' | 'dpad'
    joySensitivity: parseInt(localStorage.getItem('hax_joy_sens') || '100'),
    joyDeadzone: parseInt(localStorage.getItem('hax_joy_deadzone') || '5'),
    autoHll: localStorage.getItem('hax_auto_hll') === 'true',
    vibrate: localStorage.getItem('hax_vibrate') !== 'false',
    leftHanded: localStorage.getItem('hax_left_handed') === 'true',
    fieldZoom: savedFieldZoom,
    cameraLock: savedCameraLock,
    chatHidden: localStorage.getItem('hax_chat_hidden') === 'true',
    controlsManualToggle: null,
    customPhrases: JSON.parse(localStorage.getItem('hax_custom_phrases') || JSON.stringify(defaultCustoms)),
    mutedPlayers: JSON.parse(localStorage.getItem('hax_muted_players') || '[]'),
    autoBanNicks: JSON.parse(localStorage.getItem('hax_autoban_nicks') || '[]'),
    stats: loadLocalStats(),
    gamepadConnected: false
  };

  window.__haxFieldZoom = state.fieldZoom;
  window.__haxCameraLock = state.cameraLock;

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

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
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
      /* Ensure in-game menu buttons (Menu, Rec, Sound, Link, Settings) are always accessible */
      .game-view > .buttons {
        z-index: 2147483640 !important;
        pointer-events: auto !important;
        background: rgba(15, 23, 42, 0.88) !important;
        border-radius: 0 0 0 14px !important;
        border: 1px solid rgba(255, 255, 255, 0.25) !important;
        border-top: none !important;
        border-right: none !important;
        padding: 4px 10px !important;
        height: 32px !important;
        display: flex !important;
        align-items: center !important;
        gap: 5px !important;
      }
      .game-view > .buttons button {
        padding: 4px 8px !important;
        font-size: 11.5px !important;
        font-weight: 700 !important;
        border-radius: 6px !important;
        cursor: pointer !important;
        pointer-events: auto !important;
        touch-action: manipulation !important;
      }

      /* Popups, Dialogs and In-Game Room Menu Container */
      .game-view > [data-hook="popups"],
      .dialog, .dialog-view, .dialog-container {
        z-index: 2147483647 !important;
        pointer-events: auto !important;
      }
      .game-view > .top-section {
        z-index: 2147483645 !important;
        pointer-events: auto !important;
      }
      .game-view.showing-room-view > .top-section {
        z-index: 2147483646 !important;
        pointer-events: auto !important;
      }

      /* Completely Hide Native In-Game Chatbox (Pushed Off-Screen, 100% Pitch Space) */
      .chatbox-view {
        position: absolute !important;
        bottom: -9999px !important;
        left: -9999px !important;
        width: 1px !important;
        height: 1px !important;
        opacity: 0 !important;
        pointer-events: none !important;
        overflow: hidden !important;
      }
      .chatbox-view-contents {
        display: none !important;
      }

      /* Centered, sleek Scoreboard */
      .game-state-view {
        position: absolute !important;
        top: 2px !important;
        left: 0 !important;
        right: 0 !important;
        display: flex !important;
        justify-content: center !important;
        align-items: center !important;
        pointer-events: none !important;
        z-index: 50 !important;
      }
      .game-state-view .bar {
        height: 28px !important;
        width: auto !important;
        max-width: 280px !important;
        padding: 2px 14px !important;
        font-size: 13px !important;
        background: rgba(15, 23, 42, 0.90) !important;
        backdrop-filter: blur(8px) !important;
        -webkit-backdrop-filter: blur(8px) !important;
        border: 1px solid rgba(255, 255, 255, 0.22) !important;
        border-radius: 14px !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        gap: 10px !important;
        box-shadow: 0 4px 14px rgba(0, 0, 0, 0.6) !important;
        pointer-events: none !important;
      }
      .game-state-view .bar * {
        pointer-events: none !important;
      }
      .game-state-view .bar > .scoreboard {
        display: flex !important;
        align-items: center !important;
        gap: 6px !important;
        margin-right: 4px !important;
      }
      .game-state-view .bar > .scoreboard .score {
        width: 22px !important;
        font-size: 15px !important;
        font-weight: 800 !important;
        text-align: center !important;
        color: #ffffff !important;
      }
      .game-state-view .bar > .scoreboard .teamicon {
        width: 16px !important;
        height: 16px !important;
      }
      .game-state-view .bar > .timer {
        font-variant-numeric: tabular-nums !important;
        font-weight: 800 !important;
        color: #38bdf8 !important;
        padding-left: 8px !important;
        border-left: 1px solid rgba(255, 255, 255, 0.25) !important;
      }

      /* Touch-Friendly Room View Teams & Players List (Easy Drag & Drop) */
      .room-view .teams .team .list .player,
      .room-view .player-list .player,
      .game-view .teams .team .list .player {
        min-height: 34px !important;
        padding: 6px 12px !important;
        margin: 3px 0 !important;
        font-size: 13px !important;
        font-weight: 700 !important;
        border-radius: 8px !important;
        touch-action: auto !important;
        -webkit-user-select: none !important;
        user-select: none !important;
        cursor: pointer !important;
        display: flex !important;
        align-items: center !important;
        background: rgba(255, 255, 255, 0.08) !important;
      }
      .room-view .teams .team .list,
      .game-view .teams .team .list {
        min-height: 90px !important;
        overflow-y: auto !important;
        touch-action: pan-y !important;
      }

      /* Transparent FPS and Ping badge at bottom-left corner (Zero background box) */
      .stats-view-container {
        position: absolute !important;
        bottom: 4px !important;
        left: 8px !important;
        width: auto !important;
        height: auto !important;
        pointer-events: none !important;
        z-index: 10 !important;
      }
      .stats-view {
        position: static !important;
        left: 0 !important;
        margin: 0 !important;
        padding: 0 !important;
        background: transparent !important;
        background-color: transparent !important;
        border: none !important;
        box-shadow: none !important;
        display: flex !important;
        flex-direction: row !important;
        gap: 8px !important;
        font-size: 10px !important;
        pointer-events: none !important;
      }
      .stats-view [data-hook="ping"], .stats-view [data-hook="fps"] {
        margin: 0 !important;
        line-height: 1.2 !important;
        font-size: 10px !important;
        font-weight: 800 !important;
        color: #f8fafc !important;
        text-shadow: 0 1px 3px rgba(0, 0, 0, 0.95), 0 0 2px #000 !important;
      }
      .stats-view [data-hook="graph"] {
        display: none !important; /* Hides ONLY the green ping graph, leaving the game pitch 100% visible! */
      }
    `;
    iframeDoc.head.appendChild(style);
  }

  // ==========================================
  // 4. CANVAS CAMERA SCALE & 120 FPS ON-AVATAR SPEECH BUBBLE HOOK
  // ==========================================
  const activeSpeechBubbles = new Map();
  let haxCanvasFrame = 0;
  function tickHaxFrame() {
    haxCanvasFrame = (haxCanvasFrame + 1) % 1000000;
    requestAnimationFrame(tickHaxFrame);
  }
  requestAnimationFrame(tickHaxFrame);

  function renderCanvasAvatarSpeechBubble(ctx, text, x, avatarTopY, remainingMs) {
    if (!ctx || !text || remainingMs <= 0 || isNaN(x) || isNaN(avatarTopY)) return;
    const fadeAlpha = remainingMs < 300 ? (remainingMs / 300) : 1.0;
    if (fadeAlpha <= 0.02) return;

    try {
      ctx.save();
      // Scaled up font by ~25% as requested (crisp, readable on mobile)
      ctx.font = 'bold 8.2px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      const maxChars = 28;
      const displayText = text.length > maxChars ? text.substring(0, maxChars) + '…' : text;
      const metrics = ctx.measureText(displayText);
      const textWidth = Math.max(14, metrics.width || 14);
      const padX = 6;
      const bubbleWidth = textWidth + padX * 2;
      const bubbleHeight = 14;
      const bx = x - bubbleWidth / 2;
      // Float bubble cleanly above the player avatar:
      const by = avatarTopY - bubbleHeight - 4.5;
      const radius = 4;

      // Soft drop shadow
      ctx.shadowColor = 'rgba(0, 0, 0, 0.85)';
      ctx.shadowBlur = 4;
      ctx.shadowOffsetY = 1.5;

      // Dark sleek slate background pill
      ctx.globalAlpha = 0.94 * fadeAlpha;
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      if (typeof ctx.roundRect === 'function') {
        ctx.roundRect(bx, by, bubbleWidth, bubbleHeight, radius);
      } else {
        ctx.moveTo(bx + radius, by);
        ctx.lineTo(bx + bubbleWidth - radius, by);
        ctx.quadraticCurveTo(bx + bubbleWidth, by, bx + bubbleWidth, by + radius);
        ctx.lineTo(bx + bubbleWidth, by + bubbleHeight - radius);
        ctx.quadraticCurveTo(bx + bubbleWidth, by + bubbleHeight, bx + bubbleWidth - radius, by + bubbleHeight);
        ctx.lineTo(bx + radius, by + bubbleHeight);
        ctx.quadraticCurveTo(bx, by + bubbleHeight, bx, by + bubbleHeight - radius);
        ctx.lineTo(bx, by + radius);
        ctx.quadraticCurveTo(bx, by, bx + radius, by);
        ctx.closePath();
      }
      ctx.fill();

      // Subtle neon cyan-blue border
      ctx.shadowColor = 'transparent';
      ctx.lineWidth = 0.9;
      ctx.strokeStyle = '#38bdf8';
      ctx.stroke();

      // Downward pointer tail towards avatar
      ctx.beginPath();
      ctx.moveTo(x - 2.5, by + bubbleHeight);
      ctx.lineTo(x, by + bubbleHeight + 3);
      ctx.lineTo(x + 2.5, by + bubbleHeight);
      ctx.fillStyle = '#0f172a';
      ctx.fill();

      // Crisp white message text
      ctx.fillStyle = '#ffffff';
      ctx.fillText(displayText, x, by + (bubbleHeight / 2) + 0.4);

      ctx.restore();
    } catch(e) {
      try { ctx.restore(); } catch(_) {}
    }
  }

  function checkAndRenderBubbleForNick(ctx, nickLower, px, avatarTopY) {
    if (!nickLower || activeSpeechBubbles.size === 0) return;
    const now = performance.now();
    const cleanA = nickLower.replace(/[^a-z0-9]/gi, '');

    for (const [bNick, bData] of activeSpeechBubbles.entries()) {
      if (bData.expiresAt <= now) {
        activeSpeechBubbles.delete(bNick);
        continue;
      }

      const cleanB = bNick.replace(/[^a-z0-9]/gi, '');
      const isMatch = (nickLower === bNick) ||
                      (cleanA && cleanB && cleanA === cleanB) ||
                      (cleanA.length >= 3 && cleanB.length >= 3 && (cleanA.includes(cleanB) || cleanB.includes(cleanA)));

      if (isMatch) {
        if (bData.lastFrame === haxCanvasFrame) break;
        bData.lastFrame = haxCanvasFrame;
        renderCanvasAvatarSpeechBubble(ctx, bData.text, px, avatarTopY, bData.expiresAt - now);
        break;
      }
    }
  }

  function hookIframeCanvas(iframeWin) {
    if (!iframeWin || iframeWin.__canvasHooked) return;
    iframeWin.__canvasHooked = true;

    const C2D = iframeWin.CanvasRenderingContext2D;
    const CanvasProto = iframeWin.HTMLCanvasElement ? iframeWin.HTMLCanvasElement.prototype : null;
    if (!C2D) return;

    const origResetTransform = C2D.prototype.resetTransform;
    const origSetTransform = C2D.prototype.setTransform;
    const origScale = C2D.prototype.scale;
    const origTranslate = C2D.prototype.translate;
    const origFillText = C2D.prototype.fillText;
    const origDrawImage = C2D.prototype.drawImage;
    const origArc = C2D.prototype.arc;
    const origStroke = C2D.prototype.stroke;
    const origCreatePattern = C2D.prototype.createPattern;

    let isCameraScalePending = false;
    let isPostCameraTranslatePending = false;

    // Pair 64x64 avatar disc canvas with 160x34 nickname canvas in HaxBall
    let last64Canvas = null;
    let last64Time = 0;
    if (CanvasProto && CanvasProto.getContext) {
      const origGetContext = CanvasProto.getContext;
      CanvasProto.getContext = function(type, attrs) {
        const ctx = origGetContext.apply(this, arguments);
        try {
          if (type === '2d' && this) {
            const now = performance.now();
            if (this.width === 64 && this.height === 64) {
              last64Canvas = this;
              last64Time = now;
            } else if (this.width === 160 && this.height === 34) {
              if (last64Canvas && (now - last64Time < 100)) {
                this.__pair64 = last64Canvas;
                last64Canvas.__pair160 = this;
              }
            }
          }
        } catch(e) {}
        return ctx;
      };
    }

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
        if (window.__haxCameraLock) {
          return origTranslate.call(this, 0, 0); // Lock to stadium center (0, 0)
        }
      }
      return origTranslate.call(this, tx, ty);
    };

    // Tag offscreen nickname canvas (160x34) when HaxBall renders player nicknames
    C2D.prototype.fillText = function(text, x, y, maxWidth) {
      try {
        if (text && this.canvas && this.canvas.width === 160 && this.canvas.height === 34) {
          const raw = (typeof text === 'string' ? text : String(text)).trim();
          if (raw) {
            this.canvas.__haxNick = raw;
            this.canvas.__haxNickLower = raw.toLowerCase();
            if (this.canvas.__pair64) {
              this.canvas.__pair64.__haxNick = raw;
              this.canvas.__pair64.__haxNickLower = raw.toLowerCase();
            }
          }
        }
      } catch(e) {}
      return origFillText.apply(this, arguments);
    };

    // Link CanvasPattern created from avatar disc canvas (64x64) to nickname canvas
    C2D.prototype.createPattern = function(image, repetition) {
      const pat = origCreatePattern.apply(this, arguments);
      try {
        if (image && pat) {
          if (image.__pair160) {
            pat.__haxCanvas160 = image.__pair160;
          }
          if (image.__haxNickLower) {
            pat.__haxNickLower = image.__haxNickLower;
          }
        }
      } catch(e) {}
      return pat;
    };

    // Track avatar circle rendering: arc(x, y, radius, ...)
    C2D.prototype.arc = function(x, y, radius, startAngle, endAngle, counterclockwise) {
      try {
        if (radius >= 12 && radius <= 20) {
          this.__lastPlayerArc = { x: x, y: y, r: radius, frame: haxCanvasFrame };
        }
      } catch(e) {}
      return origArc.apply(this, arguments);
    };

    // Render speech bubbles on avatar stroke (for all players including local player)
    C2D.prototype.stroke = function() {
      const res = origStroke.apply(this, arguments);
      try {
        if (activeSpeechBubbles.size > 0 && this.__lastPlayerArc && this.__lastPlayerArc.frame === haxCanvasFrame) {
          let nickLower = '';
          if (this.fillStyle) {
            if (this.fillStyle.__haxCanvas160 && this.fillStyle.__haxCanvas160.__haxNickLower) {
              nickLower = this.fillStyle.__haxCanvas160.__haxNickLower;
            } else if (this.fillStyle.__haxNickLower) {
              nickLower = this.fillStyle.__haxNickLower;
            }
          }
          if (nickLower) {
            checkAndRenderBubbleForNick(this, nickLower, this.__lastPlayerArc.x, this.__lastPlayerArc.y - this.__lastPlayerArc.r);
          }
        }
      } catch(e) {}
      return res;
    };

    // 120 FPS Synchronous On-Avatar Speech Bubble Renderer via drawImage (for all match players)
    C2D.prototype.drawImage = function(img) {
      const res = origDrawImage.apply(this, arguments);
      try {
        if (activeSpeechBubbles.size > 0 && img && img.width === 160 && img.height === 34 && img.__haxNickLower) {
          const dx = arguments.length >= 9 ? arguments[5] : arguments[1];
          const dy = arguments.length >= 9 ? arguments[6] : arguments[2];
          const px = dx + 40;
          const py = dy - 16;
          // Avatar top edge is at py - 15
          checkAndRenderBubbleForNick(this, img.__haxNickLower, px, py - 15);
        }
      } catch(e) {}
      return res;
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
      <!-- Left Controls (Compact, never overlaps center scoreboard) -->
      <div class="hax-topbar-left">
        <div class="hax-brand-mini">
          <span>⚽</span>
          <span class="brand-text">HAXBALL</span>
        </div>
        <button class="hax-btn hax-btn-nick" id="btn-open-nick" title="Oyuncu İsmi">👤 <span id="lbl-nick-name">İsim</span></button>
        <button class="hax-btn hax-btn-avatar" id="btn-open-avatar" title="Avatar Seç">🎨 <span id="lbl-avatar-name">${state.avatar}</span></button>
        <button class="hax-btn" id="btn-settings" title="Ayarlar">⚙️</button>
        <span id="lbl-gamepad-status" style="display:none;" class="gamepad-connected-badge">🎮</span>
      </div>

      <!-- Center Space (Empty, completely open 250px+ for HaxBall Scoreboard & Clock) -->
      <div class="hax-topbar-center"></div>

      <!-- Right Tools (Compact, never overlaps scoreboard or timer) -->
      <div class="hax-topbar-right">
        <button class="hax-btn hax-btn-menu" id="btn-ingame-menu" title="Maç İçi Oda Menüsü (Escape)">☰ Menü</button>
        <button class="hax-btn hax-btn-chat" id="btn-topbar-chat">💬 Yaz</button>
        <button class="hax-btn hax-btn-zoom" id="btn-zoom">🔍 <span id="lbl-zoom">${Math.round(state.fieldZoom * 100)}%</span></button>
        <button class="hax-btn" id="btn-toggle-hud" title="Kontrolleri Aç / Kapat">🎮 <span id="lbl-hud-status">HUD</span></button>
      </div>
    </div>

    <!-- Floating Zoom HUD Badge (Shows live zoom % during pinch or slider) -->
    <div id="hax-zoom-hud-badge">🔍 <span id="lbl-zoom-hud-val">${Math.round(state.fieldZoom * 100)}%</span> • <span id="lbl-zoom-hud-mode">${state.cameraLock ? 'Sabit' : 'Geniş'}</span></div>

    <!-- Floating Quick Zoom Bar (Compact top strip, never hangs over pitch or goals) -->
    <div id="hax-quick-zoom-bar">
      <div class="zoom-compact-row">
        <span class="zoom-val-highlight" id="lbl-quick-zoom-val">${Math.round(state.fieldZoom * 100)}%</span>
        <button class="zoom-step-btn" id="btn-zoom-minus">−</button>
        <button class="zoom-step-btn" id="btn-zoom-plus">+</button>
        <div class="zoom-preset-chip" data-zoom="0.58">🏟️ Tam Saha</div>
        <div class="zoom-preset-chip" data-zoom="0.72">📐 Geniş</div>
        <div class="zoom-preset-chip" data-zoom="1.00">🎯 Normal</div>
        <div class="zoom-mode-btn ${!state.cameraLock ? 'active' : ''}" id="btn-cam-follow">🎥 Takip</div>
        <div class="zoom-mode-btn ${state.cameraLock ? 'active' : ''}" id="btn-cam-lock">🔒 Sabit</div>
        <button class="zoom-close-btn" id="btn-close-quick-zoom">✕</button>
      </div>
    </div>

    <!-- Floating Goal Notification Banner (Appears when scoreboard detects goal) -->
    <div id="hax-goal-banner" style="display:none;">
      <span>⚽</span>
      <span style="font-weight:800; font-size:12px; color:#fcd34d;">GOL OLDU!</span>
      <button class="goal-banner-btn" id="btn-banner-save-clip">📹 8sn Gol Klibini Kaydet</button>
      <button style="background:transparent; border:none; color:#94a3b8; font-size:14px; cursor:pointer; padding:0 4px;" id="btn-banner-close">✕</button>
    </div>

    <!-- Thumb Action Dock (Positioned along bottom edge next to kick button, never blocks the pitch or goal!) -->
    <div class="hax-thumb-dock" id="hax-thumb-dock">
      <button class="hax-dock-btn-clip" id="hax-btn-clip-goal" title="Golün 5sn öncesi ve 3sn sonrasını kaydet">
        <span class="clip-rec-dot"></span>
        <span>📹 Klip</span>
      </button>
      <button class="hax-dock-btn-wheel" id="hax-btn-banter-wheel">
        <span>🎯 Racon</span>
      </button>
      <button class="hax-dock-btn-type" id="hax-btn-type-chat">
        <span>⌨️ Yaz</span>
      </button>
    </div>

    <!-- Virtual Joystick Touch Area (Left Half Screen) -->
    <div id="hax-joystick-zone">
      <div id="hax-joystick-base">
        <div id="hax-joystick-knob"></div>
      </div>
    </div>

    <!-- Alternative 8-Way Retro D-Pad Area -->
    <div id="hax-dpad-zone">
      <button class="dpad-btn dpad-up" id="btn-dpad-up">▲</button>
      <button class="dpad-btn dpad-down" id="btn-dpad-down">▼</button>
      <button class="dpad-btn dpad-left" id="btn-dpad-left">◀</button>
      <button class="dpad-btn dpad-right" id="btn-dpad-right">▶</button>
      <div class="dpad-btn dpad-center">🎮</div>
    </div>

    <!-- ==========================================
         IN-GAME MINIMAL TOUCH KEYBOARD & CHAT HISTORY
         Zero-IME, Soft Minimal, Never Obstructs Game!
         ========================================== -->
    <div id="hax-ingame-keyboard-overlay">
      <!-- Live Chat History Scraper Box -->
      <div class="chat-history-card" id="hax-chat-history-box">
        <div style="color:#94a3b8; font-style:italic; font-size:10px; margin-bottom:2px;">💬 Oda Sohbet Geçmişi:</div>
        <div id="hax-chat-history-list"></div>
      </div>

      <!-- Compact Virtual Keyboard Card -->
      <div class="ingame-keyboard-card">
        <!-- Quick Words Bar -->
        <div class="kb-quick-row">
          <button class="kb-quick-chip" data-kb-text="hll">hll</button>
          <button class="kb-quick-chip" data-kb-text="sa">sa</button>
          <button class="kb-quick-chip" data-kb-text="as">as</button>
          <button class="kb-quick-chip" data-kb-text="gg">gg</button>
          <button class="kb-quick-chip" data-kb-text="lag">lag</button>
          <button class="kb-quick-chip" data-kb-text="pas ver">pas ver</button>
          <button class="kb-quick-chip" data-kb-text="kaleci kal">kaleci kal</button>
          <button class="kb-quick-chip" data-kb-text="xd">xd</button>
          <button class="kb-quick-chip" data-kb-text="tm">tm</button>
          <button class="kb-quick-chip" data-kb-text="bb">bb</button>
          <button class="kb-quick-chip" data-kb-text="helal">helal</button>
        </div>

        <!-- Text Input & Submit Row -->
        <div class="kb-input-row">
          <input type="text" class="kb-screen-input" id="ipt-kb-screen" placeholder="Mesaj yazın..." autocapitalize="none" autocomplete="off" />
          <button class="kb-key key-wide" id="btn-kb-backspace" title="Sil">⌫</button>
          <button class="kb-key key-send" id="btn-kb-send">Gönder</button>
          <button class="kb-key" id="btn-kb-close" title="Kapat" style="background:#475569; font-size:12px; min-width:32px; max-width:40px;">✕</button>
          <button class="kb-key" id="btn-kb-native-toggle" title="Sistem Klavyesi" style="background:#059669; font-size:10px; min-width:32px; max-width:40px;">📱</button>
        </div>

        <!-- Lowercase QWERTY Soft Keys -->
        <div class="kb-keys-container" id="kb-keys-board"></div>
      </div>
    </div>

    <!-- Wild Rift Single Primary Kick Button -->
    <div id="hax-buttons-zone">
      <button class="btn-primary-kick" id="hax-btn-kick">
        <span class="btn-icon">⚽</span>
        <span>VUR</span>
      </button>
    </div>

    <!-- Floating Semi-Transparent 3-4 Line Chat Stream -->
    <div id="hax-mini-chat-stream">
      <div class="mini-chat-line" style="color:#94a3b8; font-style:italic;">💬 Sohbet Akışı</div>
    </div>

    <!-- Floating Comic Speech Bubble Over Action -->
    <div id="hax-chat-speech-bubble">
      <span id="hax-bubble-nick" style="color:#38bdf8; font-weight:800;"></span>:
      <span id="hax-bubble-text"></span>
    </div>

    <!-- Goal Celebration Canvas & Flaming Avatar Overlay -->
    <div id="hax-goal-celebration-overlay">
      <canvas id="hax-goal-particle-canvas"></canvas>
      <div class="flaming-goal-badge" id="hax-flaming-badge">
        <span style="font-size:28px;">🔥</span>
        <span id="hax-flaming-avatar" style="font-size:28px;">👑</span>
        <span>GOOOOL!</span>
        <span style="font-size:28px;">🔥</span>
      </div>
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
              <option value="0.50" ${Math.abs(state.fieldZoom - 0.50) < 0.04 ? 'selected' : ''}>0.50x (Tam Saha)</option>
              <option value="0.65" ${Math.abs(state.fieldZoom - 0.65) < 0.04 ? 'selected' : ''}>0.65x (Geniş+)</option>
              <option value="0.75" ${Math.abs(state.fieldZoom - 0.75) < 0.04 ? 'selected' : ''}>0.75x (Geniş Açılı)</option>
              <option value="0.85" ${Math.abs(state.fieldZoom - 0.85) < 0.04 ? 'selected' : ''}>0.85x (Orta Boyut)</option>
              <option value="1.0" ${Math.abs(state.fieldZoom - 1.0) < 0.04 ? 'selected' : ''}>1.0x (Varsayılan HaxBall)</option>
            </select>
          </div>
          <div class="setting-row">
            <span>Kamera Takip Modu:</span>
            <select id="sel-camera-mode">
              <option value="follow" ${!state.cameraLock ? 'selected' : ''}>🎥 Dinamik Takip (Aksiyonu İzler)</option>
              <option value="fixed" ${state.cameraLock ? 'selected' : ''}>🔒 Sabit Merkez (Yayın / TV Modu)</option>
            </select>
          </div>
          <div class="setting-row">
            <span>Kontrol Opaklığı:</span>
            <input type="range" id="rng-opacity" min="20" max="100" value="${state.opacity}">
            <span id="txt-opacity">${state.opacity}%</span>
          </div>
          <div class="setting-row">
            <span>Kontrol Tipi:</span>
            <select id="sel-control-type">
              <option value="dynamic" ${state.controlType==='dynamic'?'selected':''}>🕹️ Serbest Joystick (Dokunulan Yerde)</option>
              <option value="fixed" ${state.controlType==='fixed'?'selected':''}>🕹️ Sabit Joystick (Köşede)</option>
              <option value="dpad" ${state.controlType==='dpad'?'selected':''}>➕ 8-Yönlü D-Pad (Retro Çapraz Tuşlar)</option>
            </select>
          </div>
          <div class="setting-row">
            <span>Joystick Hassasiyeti:</span>
            <input type="range" id="rng-joy-sens" min="50" max="150" value="${state.joySensitivity}">
            <span id="txt-joy-sens">${state.joySensitivity}%</span>
          </div>
          <div class="setting-row">
            <span>Ölü Bölge (Deadzone):</span>
            <input type="range" id="rng-joy-deadzone" min="5" max="22" value="${state.joyDeadzone}">
            <span id="txt-joy-deadzone">${state.joyDeadzone}px</span>
          </div>
          <div class="setting-row">
            <span>Gol Atınca Otomatik "hll" Yaz:</span>
            <input type="checkbox" id="chk-auto-hll" ${state.autoHll?'checked':''}>
          </div>
          <div class="setting-row">
            <span>🎮 Gamepad (Kol) Durumu:</span>
            <span id="txt-gamepad-status" style="color:#94a3b8; font-weight:700;">Bağlı Değil</span>
          </div>
          <div class="setting-row">
            <span>Titreşim (Haptic Feedback):</span>
            <input type="checkbox" id="chk-vibrate" ${state.vibrate?'checked':''}>
          </div>
          <div class="setting-row">
            <span>Solak Modu:</span>
            <input type="checkbox" id="chk-left-handed" ${state.leftHanded?'checked':''}>
          </div>
          <button class="hax-btn-full hax-btn-stats" id="btn-settings-open-stats" style="margin-top:8px;">📊 Oyuncu İstatistikleri & Geçmiş</button>
          
          <!-- Client-Side Mute Management -->
          <div style="border-top:1px solid rgba(255,255,255,0.1); padding-top:8px; margin-top:8px;">
            <span style="font-size:12px; font-weight:800; color:#38bdf8;">🚫 Susturulan Oyuncular (Mute Listesi)</span>
            <div id="hax-mute-list-container" style="font-size:11px; color:#cbd5e1; margin:4px 0; max-height:60px; overflow-y:auto;"></div>
            <div style="display:flex; gap:6px; margin-top:4px;">
              <input type="text" id="ipt-mute-nick" class="hax-text-input" placeholder="Oyuncu ismi..." style="flex:1; height:28px; font-size:11px;" />
              <button class="hax-btn" id="btn-add-mute" style="height:28px; padding:0 8px;">Sustur</button>
            </div>
          </div>

          <div class="setting-row" style="border-top:1px solid rgba(255,255,255,0.1); padding-top:8px; margin-top:8px;">
            <span>Sürüm & Güncelleme:</span>
            <span style="color:#38bdf8; font-weight:800;">v2.7.10</span>
          </div>
          <button class="hax-btn-full hax-btn-primary" id="btn-check-ota" style="margin-top:6px; background:linear-gradient(135deg, #0284c7, #0369a1);">🚀 Güncellemeleri Denetle (OTA)</button>
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

    <!-- ==========================================
         POPUP 9: OTA UPDATE MODAL
         ========================================== -->
    <div class="hax-modal" id="hax-ota-modal" style="display:none;">
      <div class="modal-card">
        <div class="modal-header">
          <h3>🚀 Oyun Güncellemesi (OTA)</h3>
          <button class="modal-close" id="btn-close-ota">✕</button>
        </div>
        <div class="modal-body">
          <p id="txt-ota-message" style="font-size:13px; color:#cbd5e1; margin-bottom:12px; line-height:1.4;">
            Mevcut Sürüm: <b>v2.7.1</b><br>
            Sunucu kontrol ediliyor...
          </p>
          <div id="ota-action-box" style="display:none; flex-direction:column; gap:6px;">
            <button class="hax-btn-full hax-btn-primary" id="btn-start-ota-hot" style="background:linear-gradient(135deg, #10b981, #059669);">⚡ Canlı Güncelle (APK Yüklemeden Anında Açılır)</button>
            <button class="hax-btn-full hax-btn-native" id="btn-start-ota-install" style="background:#0284c7; color:#fff; font-size:12px;">📦 Tam APK Olarak İndir</button>
          </div>
          <button class="hax-btn-full" id="btn-dismiss-ota" style="background:#1e293b; color:#94a3b8; margin-top:8px;">Kapat</button>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(root);

  // HUD / Controls Visibility Manager
  let isControlsHidden = false;
  const lblHudStatus = document.getElementById('lbl-hud-status');

  function updateControlsVisibility() {
    if (!root) return;
    if (isControlsHidden) {
      root.classList.add('hax-controls-hidden');
      if (lblHudStatus) lblHudStatus.innerText = "Gizli";
    } else {
      root.classList.remove('hax-controls-hidden');
      if (lblHudStatus) lblHudStatus.innerText = "Açık";
    }
  }

  // Initialize Nickname Label
  const nickBtn = document.getElementById('btn-open-nick');
  const nickLabel = document.getElementById('lbl-nick-name');
  if (state.nickname) {
    nickLabel.innerText = state.nickname;
  }

  // ==========================================
  // 6. CONTROL MODES (PWM ANALOG JOYSTICK, 8-WAY D-PAD & GAMEPAD)
  // ==========================================
  const joyZone = document.getElementById('hax-joystick-zone');
  const joyBase = document.getElementById('hax-joystick-base');
  const joyKnob = document.getElementById('hax-joystick-knob');
  const dpadZone = document.getElementById('hax-dpad-zone');

  let joyTouchId = null;
  let joyOriginX = 0, joyOriginY = 0;
  let joyActive = false;
  let targetVx = 0, targetVy = 0;
  let joyDist = 0;
  const maxJoyDist = 52;

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

  function setupControlMode() {
    clearAllJoystickKeys();
    if (state.controlType === 'dpad') {
      joyZone.style.display = 'none';
      dpadZone.style.display = 'block';
    } else {
      dpadZone.style.display = 'none';
      joyZone.style.display = 'block';
      if (state.controlType === 'fixed') {
        joyBase.style.display = 'block';
        joyBase.style.position = 'absolute';
        joyBase.style.left = '20px';
        joyBase.style.bottom = '20px';
        joyBase.style.top = 'auto';
        joyBase.style.right = 'auto';
      } else {
        joyBase.style.display = 'none';
      }
    }
    joyKnob.style.transform = 'translate3d(0, 0, 0)';
  }
  setupControlMode();

  let lastJoySector = -1;

  joyZone.addEventListener('touchstart', (e) => {
    if (e.cancelable) e.preventDefault();
    for (let i = 0; i < e.changedTouches.length; i++) {
      const t = e.changedTouches[i];
      if (joyTouchId === null) {
        joyTouchId = t.identifier;
        joyActive = true;
        lastJoySector = -1;
        if (state.controlType === 'dynamic') {
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
    if (e.cancelable) e.preventDefault();
    for (let i = 0; i < e.changedTouches.length; i++) {
      const t = e.changedTouches[i];
      if (t.identifier === joyTouchId) {
        const dx = t.clientX - joyOriginX;
        const dy = t.clientY - joyOriginY;
        joyDist = Math.hypot(dx, dy);
        const angle = Math.atan2(dy, dx);

        // Follow-finger floating origin in dynamic mode: eliminates dead distance and "boş dönüyor" feel!
        if (state.controlType === 'dynamic' && joyDist > maxJoyDist) {
          const excess = joyDist - maxJoyDist;
          joyOriginX += Math.cos(angle) * excess;
          joyOriginY += Math.sin(angle) * excess;
          joyDist = maxJoyDist;
          joyBase.style.left = (joyOriginX - 58) + 'px';
          joyBase.style.top = (joyOriginY - 58) + 'px';
        }

        const clampedDist = Math.min(joyDist, maxJoyDist);
        const knobX = Math.cos(angle) * clampedDist;
        const knobY = Math.sin(angle) * clampedDist;

        joyKnob.style.transform = `translate3d(${knobX}px, ${knobY}px, 0)`;

        if (joyDist >= state.joyDeadzone) {
          // Precise 8-Sector Direction Angle Calculation [0..7]
          const deg = ((angle * 180 / Math.PI) + 360) % 360;
          const sector = Math.floor(((deg + 22.5) % 360) / 45);

          // Subtle micro-haptic tick whenever the steering sector changes!
          if (sector !== lastJoySector) {
            lastJoySector = sector;
            vibrate(8);
          }

          const isUp = (sector === 5 || sector === 6 || sector === 7);
          const isDown = (sector === 1 || sector === 2 || sector === 3);
          const isLeft = (sector === 3 || sector === 4 || sector === 5);
          const isRight = (sector === 7 || sector === 0 || sector === 1);

          setJoystickKey('KeyW', isUp);
          setJoystickKey('KeyS', isDown);
          setJoystickKey('KeyA', isLeft);
          setJoystickKey('KeyD', isRight);
        } else {
          lastJoySector = -1;
          clearAllJoystickKeys();
        }
        break;
      }
    }
  }, { passive: false });

  function releaseJoystick(e) {
    if (e && e.changedTouches) {
      let isJoyTouch = false;
      for (let i = 0; i < e.changedTouches.length; i++) {
        if (e.changedTouches[i].identifier === joyTouchId) {
          isJoyTouch = true;
          break;
        }
      }
      if (!isJoyTouch) return; // Do not intercept touches belonging to other fingers/buttons
      if (e.cancelable && joyZone.contains(e.target)) {
        e.preventDefault();
      }
    }
    joyTouchId = null;
    joyActive = false;
    joyDist = 0;
    lastJoySector = -1;
    clearAllJoystickKeys();
    if (state.controlType === 'dynamic') {
      joyBase.style.display = 'none';
    } else {
      joyKnob.style.transform = 'translate3d(0, 0, 0)';
    }
  }

  joyZone.addEventListener('touchend', releaseJoystick, { passive: false });
  joyZone.addEventListener('touchcancel', releaseJoystick, { passive: false });
  window.addEventListener('touchend', releaseJoystick, { passive: true });
  window.addEventListener('touchcancel', releaseJoystick, { passive: true });
  window.addEventListener('blur', () => {
    lastJoySector = -1;
    clearAllJoystickKeys();
    releaseJoystick(null);
  });

  // ==========================================
  // RETRO 8-WAY D-PAD TOUCH CONTROLS
  // ==========================================
  function setupDpadButtons() {
    const dpadBtns = [
      { id: 'btn-dpad-up', keys: ['KeyW'] },
      { id: 'btn-dpad-down', keys: ['KeyS'] },
      { id: 'btn-dpad-left', keys: ['KeyA'] },
      { id: 'btn-dpad-right', keys: ['KeyD'] }
    ];

    dpadBtns.forEach(item => {
      const el = document.getElementById(item.id);
      if (!el) return;
      el.addEventListener('touchstart', (e) => {
        if (e.cancelable) e.preventDefault();
        el.classList.add('pressed');
        item.keys.forEach(k => setJoystickKey(k, true));
        vibrate(15);
      }, { passive: false });

      function endDpad(e) {
        if (e.cancelable) e.preventDefault();
        el.classList.remove('pressed');
        item.keys.forEach(k => setJoystickKey(k, false));
      }
      el.addEventListener('touchend', endDpad, { passive: false });
      el.addEventListener('touchcancel', endDpad, { passive: false });
    });
  }
  setupDpadButtons();

  // ==========================================
  // BLUETOOTH & USB GAMEPAD ENGINE (Xbox, PS4/PS5, 8BitDo)
  // ==========================================
  // BLUETOOTH, USB & ANDROID TV GAMEPAD ENGINE (DualShock 4, PS5, Xbox, 8BitDo)
  // ==========================================
  let isGamepadKickPressed = false;
  let nativeKeyKickActive = false;
  let lastGamepadState = {};

  // Virtual Mouse Cursor for Android TV / Gamepad Navigation
  let virtualCursorEl = null;
  let cursorX = window.innerWidth / 2;
  let cursorY = window.innerHeight / 2;
  let cursorVisible = false;

  function initVirtualCursor() {
    if (virtualCursorEl) return;
    virtualCursorEl = document.createElement('div');
    virtualCursorEl.id = 'hax-virtual-cursor';
    virtualCursorEl.innerHTML = `
      <div style="position:relative; width:26px; height:26px;">
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" style="filter:drop-shadow(0 2px 8px rgba(0,0,0,0.9));">
          <path d="M3 2L19 12L12 14L9 22L3 2Z" fill="#38bdf8" stroke="#ffffff" stroke-width="2" stroke-linejoin="round"/>
        </svg>
      </div>
    `;
    virtualCursorEl.style.cssText = `
      position: fixed;
      left: ${cursorX}px;
      top: ${cursorY}px;
      width: 26px;
      height: 26px;
      pointer-events: none;
      z-index: 2147483647;
      display: none;
      transform: translate(-3px, -3px);
      transition: transform 0.04s ease-out;
    `;
    document.body.appendChild(virtualCursorEl);
  }

  function moveVirtualCursor(dx, dy) {
    if (!virtualCursorEl) initVirtualCursor();
    if (!cursorVisible) {
      cursorVisible = true;
      virtualCursorEl.style.display = 'block';
    }
    cursorX = Math.max(10, Math.min(window.innerWidth - 10, cursorX + dx));
    cursorY = Math.max(10, Math.min(window.innerHeight - 10, cursorY + dy));
    virtualCursorEl.style.left = cursorX + 'px';
    virtualCursorEl.style.top = cursorY + 'px';
  }

  function clickVirtualCursor() {
    if (!virtualCursorEl) initVirtualCursor();
    if (!cursorVisible) {
      cursorVisible = true;
      virtualCursorEl.style.display = 'block';
    }

    // Quick visual tap feedback
    virtualCursorEl.style.transform = 'translate(-3px, -3px) scale(0.80)';
    setTimeout(() => {
      if (virtualCursorEl) virtualCursorEl.style.transform = 'translate(-3px, -3px) scale(1)';
    }, 120);

    // Click target element (including inside HaxBall iframe)
    let target = document.elementFromPoint(cursorX, cursorY);
    if (target) {
      if (target.tagName === 'IFRAME') {
        try {
          const iframeDoc = target.contentDocument || target.contentWindow?.document;
          if (iframeDoc) {
            const rect = target.getBoundingClientRect();
            const innerX = cursorX - rect.left;
            const innerY = cursorY - rect.top;
            const innerTarget = iframeDoc.elementFromPoint(innerX, innerY);
            if (innerTarget) {
              innerTarget.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true, clientX: innerX, clientY: innerY }));
              innerTarget.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, cancelable: true, clientX: innerX, clientY: innerY }));
              innerTarget.click();
              if (innerTarget.focus) innerTarget.focus();
              return;
            }
          }
        } catch(e) {}
      }
      target.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true, clientX: cursorX, clientY: cursorY }));
      target.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, cancelable: true, clientX: cursorX, clientY: cursorY }));
      target.click();
      if (target.focus) target.focus();
    }
  }

  // 1. Native Android Gamepad Motion & Axis Bridge (Direct from Activity dispatchGenericMotionEvent)
  window.__onNativeGamepadMotion = function(x, y, hatX, hatY, z, rz, gas, brake) {
    if (!state.gamepadConnected) {
      state.gamepadConnected = true;
      const badge = document.getElementById('lbl-gamepad-status');
      if (badge) badge.style.display = 'inline-flex';
      const statusTxt = document.getElementById('txt-gamepad-status');
      if (statusTxt) {
        statusTxt.innerText = 'Bağlı (DS4 / Gamepad)';
        statusTxt.style.color = '#34d399';
      }
      if (!isControlsHidden) {
        isControlsHidden = true;
        updateControlsVisibility();
      }
    }

    const iframeDoc = getIframeDoc();
    const inMatch = !!(iframeDoc && iframeDoc.querySelector('.game-view canvas'));

    if (inMatch) {
      // In-Game: Left analog stick & D-pad steer the player
      const isUp = y < -0.35 || hatY < -0.5;
      const isDown = y > 0.35 || hatY > 0.5;
      const isLeft = x < -0.35 || hatX < -0.5;
      const isRight = x > 0.35 || hatX > 0.5;

      if (!joyActive) {
        setJoystickKey('KeyW', isUp);
        setJoystickKey('KeyS', isDown);
        setJoystickKey('KeyA', isLeft);
        setJoystickKey('KeyD', isRight);
      }

      // Right stick can steer virtual cursor for menus/dialogs
      if (Math.hypot(z, rz) > 0.2) {
        moveVirtualCursor(z * 16, rz * 16);
      }
    } else {
      // In Lobby / Room List: Left Stick or Right Stick glides virtual mouse cursor!
      const moveX = Math.abs(x) > 0.18 ? x : (Math.abs(z) > 0.18 ? z : 0);
      const moveY = Math.abs(y) > 0.18 ? y : (Math.abs(rz) > 0.18 ? rz : 0);
      if (moveX !== 0 || moveY !== 0) {
        moveVirtualCursor(moveX * 18, moveY * 18);
      }
    }

    // R2 Analog Trigger Kick
    const triggerKick = gas > 0.4 || rz > 0.5;
    if (triggerKick && !isGamepadKickPressed) {
      isGamepadKickPressed = true;
      sendGameKeyEvent('keydown', 'Space');
      sendGameKeyEvent('keydown', 'KeyX');
    } else if (!triggerKick && isGamepadKickPressed && !nativeKeyKickActive) {
      isGamepadKickPressed = false;
      sendGameKeyEvent('keyup', 'Space');
      sendGameKeyEvent('keyup', 'KeyX');
    }
  };

  // 2. Native Android Gamepad Key Bridge (Direct from Activity dispatchKeyEvent)
  window.__onNativeGamepadKey = function(keyCode, isDown) {
    if (!state.gamepadConnected) {
      state.gamepadConnected = true;
      const badge = document.getElementById('lbl-gamepad-status');
      if (badge) badge.style.display = 'inline-flex';
      if (!isControlsHidden) {
        isControlsHidden = true;
        updateControlsVisibility();
      }
    }

    const iframeDoc = getIframeDoc();
    const inMatch = !!(iframeDoc && iframeDoc.querySelector('.game-view canvas'));

    // DualShock 4 & Standard Gamepad Mappings:
    // 96: BUTTON_A (Cross / X)
    // 97: BUTTON_B (Circle / O)
    // 99: BUTTON_X (Square / □)
    // 100: BUTTON_Y (Triangle / △)
    // 102: L1 | 103: R1 | 104: L2 | 105: R2
    // 108: OPTIONS / START | 109: SHARE / SELECT
    // 19..22: DPAD UP, DOWN, LEFT, RIGHT

    // Shoot / Kick buttons: Cross, Circle, R1, R2
    if (keyCode === 96 || keyCode === 97 || keyCode === 103 || keyCode === 105) {
      if (inMatch) {
        nativeKeyKickActive = isDown;
        sendGameKeyEvent(isDown ? 'keydown' : 'keyup', 'Space');
        sendGameKeyEvent(isDown ? 'keydown' : 'keyup', 'KeyX');
      } else {
        if (isDown) {
          clickVirtualCursor();
          vibrate(20);
        }
      }
      return;
    }

    // Square (□ - 99): Save Clip or Secondary Kick
    if (keyCode === 99 && isDown) {
      captureGoalClip();
      return;
    }

    // Triangle (△ - 100): Quick celebration / banter
    if (keyCode === 100 && isDown) {
      sendChatMessage('hll');
      return;
    }

    // Options / Start (108) or Menu (82): Toggle In-Game Room Menu
    if ((keyCode === 108 || keyCode === 82) && isDown) {
      toggleInGameMenu();
      return;
    }

    // Share / Select (109): Toggle HUD / Touch Controls
    if (keyCode === 109 && isDown) {
      isControlsHidden = !isControlsHidden;
      updateControlsVisibility();
      showToast(isControlsHidden ? "Kontroller Gizlendi" : "Kontroller Açıldı");
      return;
    }

    // D-Pad Keys
    if (keyCode === 19) setJoystickKey('KeyW', isDown);
    if (keyCode === 20) setJoystickKey('KeyS', isDown);
    if (keyCode === 21) setJoystickKey('KeyA', isDown);
    if (keyCode === 22) setJoystickKey('KeyD', isDown);
  };

  // 3. HTML5 Standard Gamepad API Polling (Secondary / Fallback Engine)
  window.addEventListener('gamepadconnected', (e) => {
    const pad = e.gamepad;
    showToast(`🎮 DS4 / Gamepad Bağlandı: ${pad.id.slice(0, 24)}`);
    state.gamepadConnected = true;
    const badge = document.getElementById('lbl-gamepad-status');
    if (badge) badge.style.display = 'inline-flex';
    const statusTxt = document.getElementById('txt-gamepad-status');
    if (statusTxt) {
      statusTxt.innerText = `Bağlı (${pad.id.slice(0, 16)}...)`;
      statusTxt.style.color = '#34d399';
    }
    // Auto hide mobile touch circles when gamepad is connected
    if (!isControlsHidden) {
      isControlsHidden = true;
      updateControlsVisibility();
    }
    vibrate(35);
  });

  window.addEventListener('gamepaddisconnected', () => {
    showToast(`🎮 Gamepad Bağlantısı Kesildi`);
    state.gamepadConnected = false;
    const badge = document.getElementById('lbl-gamepad-status');
    if (badge) badge.style.display = 'none';
    const statusTxt = document.getElementById('txt-gamepad-status');
    if (statusTxt) {
      statusTxt.innerText = 'Bağlı Değil';
      statusTxt.style.color = '#94a3b8';
    }
    clearAllJoystickKeys();
  });

  function pollGamepads() {
    if (!navigator.getGamepads) return;
    const gamepads = navigator.getGamepads();
    if (!gamepads) return;

    for (let i = 0; i < gamepads.length; i++) {
      const gp = gamepads[i];
      if (!gp) continue;

      const iframeDoc = getIframeDoc();
      const inMatch = !!(iframeDoc && iframeDoc.querySelector('.game-view canvas'));

      const stickX = gp.axes.length > 0 ? gp.axes[0] : 0;
      const stickY = gp.axes.length > 1 ? gp.axes[1] : 0;
      const rightX = gp.axes.length > 2 ? gp.axes[2] : 0;
      const rightY = gp.axes.length > 3 ? gp.axes[3] : 0;

      const dpadUp = gp.buttons[12] && gp.buttons[12].pressed;
      const dpadDown = gp.buttons[13] && gp.buttons[13].pressed;
      const dpadLeft = gp.buttons[14] && gp.buttons[14].pressed;
      const dpadRight = gp.buttons[15] && gp.buttons[15].pressed;

      if (inMatch) {
        const isUp = stickY < -0.35 || dpadUp;
        const isDown = stickY > 0.35 || dpadDown;
        const isLeft = stickX < -0.35 || dpadLeft;
        const isRight = stickX > 0.35 || dpadRight;

        if (!joyActive) {
          setJoystickKey('KeyW', isUp);
          setJoystickKey('KeyS', isDown);
          setJoystickKey('KeyA', isLeft);
          setJoystickKey('KeyD', isRight);
        }

        if (Math.hypot(rightX, rightY) > 0.2) {
          moveVirtualCursor(rightX * 16, rightY * 16);
        }
      } else {
        const moveX = Math.abs(stickX) > 0.18 ? stickX : (Math.abs(rightX) > 0.18 ? rightX : 0);
        const moveY = Math.abs(stickY) > 0.18 ? stickY : (Math.abs(rightY) > 0.18 ? rightY : 0);
        if (moveX !== 0 || moveY !== 0) {
          moveVirtualCursor(moveX * 18, moveY * 18);
        }
      }

      // Cross (A / button 0), Circle (B / button 1), RB (button 5), RT (button 7)
      const kickPressed = (gp.buttons[0] && gp.buttons[0].pressed) ||
                          (gp.buttons[1] && gp.buttons[1].pressed) ||
                          (gp.buttons[5] && gp.buttons[5].pressed) ||
                          (gp.buttons[7] && gp.buttons[7].pressed);

      if (inMatch) {
        if (kickPressed && !isGamepadKickPressed && !nativeKeyKickActive) {
          isGamepadKickPressed = true;
          sendGameKeyEvent('keydown', 'Space');
          sendGameKeyEvent('keydown', 'KeyX');
          if (gp.vibrationActuator) {
            gp.vibrationActuator.playEffect('dual-rumble', { startDelay: 0, duration: 40, weakMagnitude: 0.5, strongMagnitude: 0.5 }).catch(()=>{});
          }
        } else if (!kickPressed && isGamepadKickPressed && !nativeKeyKickActive) {
          isGamepadKickPressed = false;
          sendGameKeyEvent('keyup', 'Space');
          sendGameKeyEvent('keyup', 'KeyX');
        }
      } else {
        // In lobby: Cross (X) or RT clicks virtual cursor!
        const clickNow = (gp.buttons[0] && gp.buttons[0].pressed) || (gp.buttons[7] && gp.buttons[7].pressed);
        if (clickNow && !lastGamepadState['btn0']) {
          clickVirtualCursor();
          vibrate(20);
        }
        lastGamepadState['btn0'] = clickNow;
      }

      // Square (button 2) -> Save Goal Clip
      if (gp.buttons[2] && gp.buttons[2].pressed && !lastGamepadState['btn2']) {
        captureGoalClip();
      }
      lastGamepadState['btn2'] = gp.buttons[2] && gp.buttons[2].pressed;

      // Triangle (button 3) -> Auto "hll"
      if (gp.buttons[3] && gp.buttons[3].pressed && !lastGamepadState['btn3']) {
        sendChatMessage('hll');
      }
      lastGamepadState['btn3'] = gp.buttons[3] && gp.buttons[3].pressed;

      // Select / Share (button 8) -> Toggle HUD
      if (gp.buttons[8] && gp.buttons[8].pressed && !lastGamepadState['btn8']) {
        isControlsHidden = !isControlsHidden;
        updateControlsVisibility();
      }
      lastGamepadState['btn8'] = gp.buttons[8] && gp.buttons[8].pressed;

      // Start / Options (button 9) -> Toggle In-Game Menu
      if (gp.buttons[9] && gp.buttons[9].pressed && !lastGamepadState['btn9']) {
        toggleInGameMenu();
      }
      lastGamepadState['btn9'] = gp.buttons[9] && gp.buttons[9].pressed;
      break;
    }
  }
  setInterval(pollGamepads, 16);

  // Auto-detect Android TV mode on startup
  if (window.Android && window.Android.isTv && window.Android.isTv()) {
    initVirtualCursor();
    isControlsHidden = true;
    updateControlsVisibility();
    showToast("📺 Android TV Modu Aktif (DS4 Kol Hazır)");
  }

  // ==========================================
  // 7. PRIMARY KICK BUTTON (WILD RIFT ACTION)
  // ==========================================
  const kickBtn = document.getElementById('hax-btn-kick');

  kickBtn.addEventListener('touchstart', (e) => {
    if (e.cancelable) e.preventDefault();
    sendGameKeyEvent('keydown', 'Space');
    sendGameKeyEvent('keydown', 'KeyX');
    vibrate(25);
    kickBtn.classList.add('active');
  }, { passive: false });

  function onKickRelease(e) {
    if (e.cancelable) e.preventDefault();
    sendGameKeyEvent('keyup', 'Space');
    sendGameKeyEvent('keyup', 'KeyX');
    kickBtn.classList.remove('active');
  }
  kickBtn.addEventListener('touchend', onKickRelease);
  kickBtn.addEventListener('touchcancel', onKickRelease);

  // ==========================================
  // 7b. CLIENT-SIDE MUTE & ADMIN AUTO-BAN ENGINE
  // ==========================================
  function mutePlayer(nick) {
    if (!nick) return;
    const clean = nick.trim().toLowerCase();
    if (!state.mutedPlayers.includes(clean)) {
      state.mutedPlayers.push(clean);
      localStorage.setItem('hax_muted_players', JSON.stringify(state.mutedPlayers));
      renderMuteList();
      showToast(`🚫 "${nick}" susturuldu (sohbet ve balonları gizlendi)`);
    } else {
      showToast(`ℹ️ "${nick}" zaten susturulmuş`);
    }
  }

  function unmutePlayer(nick) {
    if (!nick) return;
    const clean = nick.trim().toLowerCase();
    const idx = state.mutedPlayers.indexOf(clean);
    if (idx !== -1) {
      state.mutedPlayers.splice(idx, 1);
      localStorage.setItem('hax_muted_players', JSON.stringify(state.mutedPlayers));
      renderMuteList();
      showToast(`🔊 "${nick}" susturması kaldırıldı`);
    }
  }

  function renderMuteList() {
    const container = document.getElementById('hax-mute-list-container');
    if (!container) return;
    container.innerHTML = '';
    if (!state.mutedPlayers || state.mutedPlayers.length === 0) {
      container.innerHTML = '<span style="color:#64748b; font-style:italic;">Henüz kimse susturulmadı.</span>';
      return;
    }
    state.mutedPlayers.forEach(nick => {
      const chip = document.createElement('span');
      chip.style.cssText = 'display:inline-flex; align-items:center; gap:4px; background:#334155; padding:2px 7px; border-radius:8px; margin:2px; font-size:11px;';
      chip.innerHTML = `${escapeHtml(nick)} <b style="cursor:pointer; color:#ef4444; margin-left:3px;">✕</b>`;
      chip.querySelector('b').addEventListener('click', () => {
        unmutePlayer(nick);
      });
      container.appendChild(chip);
    });
  }

  // ==========================================
  // 8. SEND CHAT MESSAGE DISPATCHER
  // ==========================================
  function sendChatMessage(text) {
    if (!text || !text.trim()) return;
    text = text.trim();

    // Client-side /mute and /unmute commands
    if (text.startsWith('/mute ')) {
      const target = text.substring(6).trim();
      mutePlayer(target);
      return;
    }
    if (text.startsWith('/unmute ')) {
      const target = text.substring(8).trim();
      unmutePlayer(target);
      return;
    }
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
  // 10. IN-GAME MINIMAL TOUCH KEYBOARD & CHAT OVERLAY
  // Fast, lowercase, soft transitions, dismisses on outside tap!
  // ==========================================
  const kbOverlay = document.getElementById('hax-ingame-keyboard-overlay');
  const iptKbScreen = document.getElementById('ipt-kb-screen');
  const kbKeysBoard = document.getElementById('kb-keys-board');
  const chatHistoryList = document.getElementById('hax-chat-history-list');

  let currentKbPage = 'abc'; // 'abc' | 'sym' | 'emoji'

  const KB_PAGES = {
    abc: [
      ["q", "w", "e", "r", "t", "y", "u", "ı", "o", "p", "ğ", "ü"],
      ["a", "s", "d", "f", "g", "h", "j", "k", "l", "ş", "i"],
      ["z", "x", "c", "v", "b", "n", "m", "ö", "ç"]
    ],
    sym: [
      ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0"],
      ["@", "#", "$", "%", "&", "*", "-", "+", "(", ")"],
      ["!", "\"", "'", ":", ";", "/", "?", ",", ".", "_"]
    ],
    emoji: [
      ["🔥", "⚽", "👑", "😂", "👏", "🧤", "💀", "🚀", "❤️", "🤝"],
      ["🎯", "⚡", "😭", "🤣", "🥶", "🏆", "👀", "😎", "🤦", "💯"],
      ["💪", "🥳", "😱", "🤐", "🙄", "🤫", "👋", "🎉", "✨", "🌟"]
    ]
  };

  async function pasteClipboardIntoInput(inputEl) {
    let clipText = "";
    try {
      if (window.Android && window.Android.getClipboardText) {
        clipText = window.Android.getClipboardText();
      }
    } catch(e) {}

    if (!clipText && navigator.clipboard && navigator.clipboard.readText) {
      try {
        clipText = await navigator.clipboard.readText();
      } catch(e) {}
    }

    if (clipText && clipText.trim()) {
      inputEl.value = (inputEl.value ? inputEl.value + ' ' : '') + clipText.trim();
      showToast("📋 Panodan yapıştırıldı");
      vibrate(15);
    } else {
      showToast("⚠️ Pano boş veya erişilemedi");
    }
  }

  let bspRepeatTimer = null;
  let bspRepeatInterval = null;

  function doBackspace() {
    iptKbScreen.value = iptKbScreen.value.slice(0, -1);
    vibrate(6);
  }

  function startBackspaceRepeat() {
    doBackspace();
    clearTimeout(bspRepeatTimer);
    clearInterval(bspRepeatInterval);
    bspRepeatTimer = setTimeout(() => {
      bspRepeatInterval = setInterval(doBackspace, 70);
    }, 320);
  }

  function stopBackspaceRepeat() {
    clearTimeout(bspRepeatTimer);
    clearInterval(bspRepeatInterval);
  }

  function attachFastKeyHandler(btn, onAction) {
    let triggered = false;
    btn.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      e.stopPropagation();
      triggered = true;
      btn.classList.add('active');
      onAction();
    }, { passive: false });

    const clearActive = () => {
      if (triggered) {
        triggered = false;
        btn.classList.remove('active');
      }
    };
    btn.addEventListener('pointerup', clearActive);
    btn.addEventListener('pointercancel', clearActive);
    btn.addEventListener('pointerleave', clearActive);
  }

  function renderInGameKeyboard() {
    if (!kbKeysBoard) return;
    kbKeysBoard.innerHTML = '';

    const currentRows = KB_PAGES[currentKbPage] || KB_PAGES.abc;
    currentRows.forEach(row => {
      const rowEl = document.createElement('div');
      rowEl.className = 'kb-key-row';
      row.forEach(char => {
        const btn = document.createElement('button');
        btn.className = 'kb-key';
        btn.innerText = char;
        attachFastKeyHandler(btn, () => {
          iptKbScreen.value += char;
          vibrate(5);
        });
        rowEl.appendChild(btn);
      });
      kbKeysBoard.appendChild(rowEl);
    });

    // Universal Action Bar (Row 4): [ ?123 / ABC ] [ 😀 / ABC ] [ 📋 ] [ boşluk ] [ ⌫ ] [ ⏎ Gönder ]
    const actionRow = document.createElement('div');
    actionRow.className = 'kb-key-row';

    // 1. Symbol Page Switcher
    const symBtn = document.createElement('button');
    symBtn.className = 'kb-key key-action' + (currentKbPage === 'sym' ? ' active-page' : '');
    symBtn.innerText = currentKbPage === 'sym' ? 'ABC' : '?123';
    attachFastKeyHandler(symBtn, () => {
      currentKbPage = currentKbPage === 'sym' ? 'abc' : 'sym';
      renderInGameKeyboard();
      vibrate(10);
    });
    actionRow.appendChild(symBtn);

    // 2. Emoji Page Switcher
    const emojiBtn = document.createElement('button');
    emojiBtn.className = 'kb-key key-action' + (currentKbPage === 'emoji' ? ' active-page' : '');
    emojiBtn.innerText = currentKbPage === 'emoji' ? 'ABC' : '😀';
    attachFastKeyHandler(emojiBtn, () => {
      currentKbPage = currentKbPage === 'emoji' ? 'abc' : 'emoji';
      renderInGameKeyboard();
      vibrate(10);
    });
    actionRow.appendChild(emojiBtn);

    // 3. Clipboard Paste
    const pasteBtn = document.createElement('button');
    pasteBtn.className = 'kb-key key-paste';
    pasteBtn.innerText = '📋';
    pasteBtn.title = 'Panodan Yapıştır';
    attachFastKeyHandler(pasteBtn, async () => {
      await pasteClipboardIntoInput(iptKbScreen);
    });
    actionRow.appendChild(pasteBtn);

    // 4. Spacebar
    const spaceBtn = document.createElement('button');
    spaceBtn.className = 'kb-key key-space';
    spaceBtn.innerText = 'boşluk';
    attachFastKeyHandler(spaceBtn, () => {
      iptKbScreen.value += ' ';
      vibrate(5);
    });
    actionRow.appendChild(spaceBtn);

    // 5. Backspace (with hold-to-repeat!)
    const bspBtn = document.createElement('button');
    bspBtn.className = 'kb-key key-wide';
    bspBtn.innerText = '⌫';
    bspBtn.title = 'Sil';
    bspBtn.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      e.stopPropagation();
      bspBtn.classList.add('active');
      startBackspaceRepeat();
    });
    const stopBsp = () => {
      bspBtn.classList.remove('active');
      stopBackspaceRepeat();
    };
    bspBtn.addEventListener('pointerup', stopBsp);
    bspBtn.addEventListener('pointercancel', stopBsp);
    bspBtn.addEventListener('pointerleave', stopBsp);
    actionRow.appendChild(bspBtn);

    // 6. Direct Send / Enter
    const enterBtn = document.createElement('button');
    enterBtn.className = 'kb-key key-enter';
    enterBtn.innerText = '⏎ Gönder';
    attachFastKeyHandler(enterBtn, () => {
      const txt = iptKbScreen.value;
      if (txt && txt.trim()) {
        sendChatMessage(txt.trim());
      }
      vibrate(15);
      closeInGameKeyboard();
    });
    actionRow.appendChild(enterBtn);

    kbKeysBoard.appendChild(actionRow);
  }
  renderInGameKeyboard();

  function updateChatHistoryOverlay() {
    const iframeDoc = getIframeDoc();
    if (!iframeDoc || !chatHistoryList) return;
    const pTags = iframeDoc.querySelectorAll('.chatbox-view-contents > .log .log-contents p');
    chatHistoryList.innerHTML = '';
    if (!pTags || pTags.length === 0) {
      chatHistoryList.innerHTML = '<div style="color:#64748b; font-size:10px;">Henüz mesaj yok...</div>';
      return;
    }
    const startIdx = Math.max(0, pTags.length - 8);
    for (let i = startIdx; i < pTags.length; i++) {
      const item = document.createElement('div');
      item.className = 'history-item';
      item.innerHTML = `<span class="history-text">${pTags[i].innerText}</span>`;
      chatHistoryList.appendChild(item);
    }
    const container = document.getElementById('hax-chat-history-box');
    if (container) container.scrollTop = container.scrollHeight;
  }

  function openInGameKeyboard() {
    kbOverlay.style.display = 'flex';
    iptKbScreen.value = '';
    updateChatHistoryOverlay();
    vibrate(15);
  }

  function closeInGameKeyboard() {
    kbOverlay.style.display = 'none';
  }

  // Tapping outside on the overlay background closes keyboard immediately!
  kbOverlay.addEventListener('click', (e) => {
    if (e.target === kbOverlay) {
      closeInGameKeyboard();
    }
  });

  const topBspBtn = document.getElementById('btn-kb-backspace');
  if (topBspBtn) {
    topBspBtn.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      e.stopPropagation();
      topBspBtn.classList.add('active');
      startBackspaceRepeat();
    });
    const stopTopBsp = () => {
      topBspBtn.classList.remove('active');
      stopBackspaceRepeat();
    };
    topBspBtn.addEventListener('pointerup', stopTopBsp);
    topBspBtn.addEventListener('pointercancel', stopTopBsp);
    topBspBtn.addEventListener('pointerleave', stopTopBsp);
  }

  const btnKbClose = document.getElementById('btn-kb-close');
  if (btnKbClose) {
    btnKbClose.addEventListener('click', (e) => {
      e.stopPropagation();
      closeInGameKeyboard();
    });
  }

  document.getElementById('btn-kb-send').addEventListener('click', (e) => {
    e.stopPropagation();
    const txt = iptKbScreen.value;
    if (txt && txt.trim()) {
      sendChatMessage(txt.trim());
    }
    vibrate(20);
    closeInGameKeyboard();
  });
  iptKbScreen.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      const txt = iptKbScreen.value;
      if (txt && txt.trim()) sendChatMessage(txt.trim());
      closeInGameKeyboard();
    }
  });

  // Quick word chips (Fast zero-latency pointer handlers)
  kbOverlay.querySelectorAll('.kb-quick-chip').forEach(chip => {
    attachFastKeyHandler(chip, () => {
      const word = chip.getAttribute('data-kb-text');
      if (!iptKbScreen.value.trim()) {
        sendChatMessage(word);
        closeInGameKeyboard();
      } else {
        iptKbScreen.value += ' ' + word;
      }
      vibrate(8);
    });
  });

  // Native soft keyboard toggle button
  document.getElementById('btn-kb-native-toggle').addEventListener('click', (e) => {
    e.stopPropagation();
    closeInGameKeyboard();
    if (window.Android && window.Android.showNativePrompt) {
      window.Android.showNativePrompt("HaxBall Sohbet", "Mesajınızı yazın:", iptKbScreen.value || "", "send_chat");
    } else {
      const res = prompt("Odaya mesaj gönder:", iptKbScreen.value || "");
      if (res) sendChatMessage(res);
    }
  });

  // Wire dock typing button & topbar chat button (accessible everywhere!)
  const btnDockType = document.getElementById('hax-btn-type-chat');
  if (btnDockType) btnDockType.addEventListener('click', openInGameKeyboard);
  const btnTopbarChat = document.getElementById('btn-topbar-chat');
  if (btnTopbarChat) btnTopbarChat.addEventListener('click', openInGameKeyboard);

  // In-Game Room Menu Toggle (Direct & Reliable via topbar [☰ Menü])
  function toggleInGameMenu() {
    const iframeDoc = getIframeDoc();
    if (iframeDoc) {
      const menuBtn = iframeDoc.querySelector('.game-view [data-hook="menu"]');
      if (menuBtn) {
        menuBtn.click();
        vibrate(15);
        return;
      }
    }
    sendGameKeyEvent('keydown', 'Escape');
    setTimeout(() => sendGameKeyEvent('keyup', 'Escape'), 40);
    vibrate(15);
  }

  const btnInGameMenu = document.getElementById('btn-ingame-menu');
  if (btnInGameMenu) {
    btnInGameMenu.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleInGameMenu();
    });
  }

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
    if (lblTopStats) lblTopStats.innerText = `⚽ ${s.goals} | 🏆 ${s.wins}`;

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

  function openStatsModal() {
    updateStatsUI();
    statsModal.style.display = 'flex';
  }
  const btnOpenStats = document.getElementById('btn-open-stats');
  if (btnOpenStats) btnOpenStats.addEventListener('click', openStatsModal);
  const btnSettingsOpenStats = document.getElementById('btn-settings-open-stats');
  if (btnSettingsOpenStats) btnSettingsOpenStats.addEventListener('click', openStatsModal);
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
  // 13. ADVANCED FIELD ZOOM & PINCH-TO-ZOOM ENGINE
  // Real-time smooth pinch, floating quick bar, 5% steps & locked broadcast mode
  // ==========================================
  const zoomBtn = document.getElementById('btn-zoom');
  const zoomLbl = document.getElementById('lbl-zoom');
  const quickZoomBar = document.getElementById('hax-quick-zoom-bar');
  const btnCloseQuickZoom = document.getElementById('btn-close-quick-zoom');
  const rngQuickZoom = document.getElementById('rng-quick-zoom');
  const lblQuickZoomVal = document.getElementById('lbl-quick-zoom-val');
  const btnZoomMinus = document.getElementById('btn-zoom-minus');
  const btnZoomPlus = document.getElementById('btn-zoom-plus');
  const btnCamFollow = document.getElementById('btn-cam-follow');
  const btnCamLock = document.getElementById('btn-cam-lock');
  const zoomHudBadge = document.getElementById('hax-zoom-hud-badge');
  const lblZoomHudVal = document.getElementById('lbl-zoom-hud-val');
  const lblZoomHudMode = document.getElementById('lbl-zoom-hud-mode');

  let hudBadgeTimeout = null;
  let quickZoomAutoCloseTimeout = null;

  function showZoomHud(zoomVal) {
    if (!zoomHudBadge) return;
    const pct = Math.round(zoomVal * 100);
    if (lblZoomHudVal) lblZoomHudVal.innerText = pct + '%';
    let label = 'Normal';
    if (pct <= 55) label = 'Tam Saha';
    else if (pct <= 70) label = 'Geniş+';
    else if (pct <= 80) label = 'Geniş';
    else if (pct <= 95) label = 'Orta';
    if (lblZoomHudMode) lblZoomHudMode.innerText = state.cameraLock ? 'Sabit' : label;

    zoomHudBadge.classList.add('visible');
    if (hudBadgeTimeout) clearTimeout(hudBadgeTimeout);
    hudBadgeTimeout = setTimeout(() => {
      zoomHudBadge.classList.remove('visible');
    }, 1200);
  }

  function setFieldZoom(val, updateInput = true, triggerHud = true) {
    val = Math.max(0.40, Math.min(1.25, val));
    state.fieldZoom = parseFloat(val.toFixed(2));
    window.__haxFieldZoom = state.fieldZoom;
    localStorage.setItem('hax_field_zoom', state.fieldZoom.toString());

    const pct = Math.round(state.fieldZoom * 100);
    if (zoomLbl) zoomLbl.innerText = pct + '%';
    if (lblQuickZoomVal) lblQuickZoomVal.innerText = pct + '%';
    if (updateInput && rngQuickZoom) rngQuickZoom.value = pct;

    // Highlight matching preset chip
    if (quickZoomBar) {
      quickZoomBar.querySelectorAll('.zoom-preset-chip').forEach(chip => {
        const chipVal = parseFloat(chip.getAttribute('data-zoom'));
        if (Math.abs(chipVal - state.fieldZoom) <= 0.04) {
          chip.classList.add('active');
        } else {
          chip.classList.remove('active');
        }
      });
    }

    if (triggerHud) showZoomHud(state.fieldZoom);
  }

  function setCameraLock(locked) {
    state.cameraLock = !!locked;
    window.__haxCameraLock = state.cameraLock;
    localStorage.setItem('hax_camera_lock', state.cameraLock ? 'true' : 'false');

    if (btnCamFollow) btnCamFollow.classList.toggle('active', !state.cameraLock);
    if (btnCamLock) btnCamLock.classList.toggle('active', state.cameraLock);

    const selCam = document.getElementById('sel-camera-mode');
    if (selCam) selCam.value = state.cameraLock ? 'fixed' : 'follow';

    showToast(state.cameraLock ? "🔒 Sabit Merkez Kamera Aktif (Yayın Modu)" : "🎥 Dinamik Takip Kamerası Aktif");
    vibrate(20);
    showZoomHud(state.fieldZoom);
  }

  function toggleQuickZoomBar(e) {
    if (e) e.stopPropagation();
    if (!quickZoomBar) return;
    const isShowing = (quickZoomBar.style.display === 'flex');
    quickZoomBar.style.display = isShowing ? 'none' : 'flex';
    if (!isShowing) {
      setFieldZoom(state.fieldZoom, true, false);
      resetQuickZoomAutoClose();
      vibrate(15);
    }
  }

  function resetQuickZoomAutoClose() {
    if (quickZoomAutoCloseTimeout) clearTimeout(quickZoomAutoCloseTimeout);
    quickZoomAutoCloseTimeout = setTimeout(() => {
      if (quickZoomBar) quickZoomBar.style.display = 'none';
    }, 6000);
  }

  function bindTouchAction(el, handler) {
    if (!el) return;
    let lastActionTime = 0;
    const trigger = (e) => {
      if (e) e.stopPropagation();
      const now = Date.now();
      if (now - lastActionTime < 300) return;
      lastActionTime = now;
      handler(e);
    };
    el.addEventListener('pointerdown', trigger);
    el.addEventListener('click', trigger);
  }

  if (zoomBtn) bindTouchAction(zoomBtn, toggleQuickZoomBar);
  if (btnCloseQuickZoom) {
    bindTouchAction(btnCloseQuickZoom, () => {
      if (quickZoomBar) quickZoomBar.style.display = 'none';
    });
  }

  if (btnZoomMinus) {
    bindTouchAction(btnZoomMinus, () => {
      setFieldZoom(state.fieldZoom - 0.05);
      resetQuickZoomAutoClose();
      vibrate(12);
    });
  }

  if (btnZoomPlus) {
    bindTouchAction(btnZoomPlus, () => {
      setFieldZoom(state.fieldZoom + 0.05);
      resetQuickZoomAutoClose();
      vibrate(12);
    });
  }

  if (rngQuickZoom) {
    const handleSlider = (e) => {
      if (e) e.stopPropagation();
      setFieldZoom(parseInt(e.target.value, 10) / 100, false, true);
      resetQuickZoomAutoClose();
    };
    rngQuickZoom.addEventListener('input', handleSlider);
    rngQuickZoom.addEventListener('change', handleSlider);
    rngQuickZoom.addEventListener('pointerdown', (e) => e.stopPropagation());
    rngQuickZoom.addEventListener('touchstart', (e) => e.stopPropagation(), { passive: true });
    rngQuickZoom.addEventListener('touchmove', (e) => e.stopPropagation(), { passive: true });
  }

  if (quickZoomBar) {
    quickZoomBar.addEventListener('touchstart', (e) => {
      e.stopPropagation();
      resetQuickZoomAutoClose();
    }, { passive: true });
    quickZoomBar.addEventListener('pointerdown', (e) => {
      e.stopPropagation();
      resetQuickZoomAutoClose();
    });

    quickZoomBar.querySelectorAll('.zoom-preset-chip').forEach(chip => {
      bindTouchAction(chip, () => {
        const targetVal = parseFloat(chip.getAttribute('data-zoom'));
        setFieldZoom(targetVal, true, true);
        resetQuickZoomAutoClose();
        vibrate(15);
      });
    });
  }

  if (btnCamFollow) bindTouchAction(btnCamFollow, () => { setCameraLock(false); resetQuickZoomAutoClose(); });
  if (btnCamLock) bindTouchAction(btnCamLock, () => { setCameraLock(true); resetQuickZoomAutoClose(); });

  // Close Quick Zoom Panel on outside tap
  document.addEventListener('pointerdown', (e) => {
    if (quickZoomBar && quickZoomBar.style.display === 'flex') {
      if (!quickZoomBar.contains(e.target) && e.target !== zoomBtn && !zoomBtn.contains(e.target)) {
        quickZoomBar.style.display = 'none';
      }
    }
  });

  // ==========================================
  // 14. IN-GAME CHATBOX TOGGLE
  // ==========================================
  const toggleChatBoxBtn = document.getElementById('btn-toggle-chat-box');
  const lblChatToggle = document.getElementById('lbl-chat-toggle');

  function syncChatVisibility() {
    const stream = document.getElementById('hax-mini-chat-stream');
    if (stream) {
      stream.style.display = state.chatHidden ? 'none' : 'flex';
    }
    if (lblChatToggle) {
      lblChatToggle.innerText = state.chatHidden ? 'Aç' : 'Chat';
    }
  }

  if (toggleChatBoxBtn) {
    toggleChatBoxBtn.addEventListener('click', () => {
      state.chatHidden = !state.chatHidden;
      localStorage.setItem('hax_chat_hidden', state.chatHidden ? 'true' : 'false');
      syncChatVisibility();
      showToast(state.chatHidden ? "👁️ Sohbet Akışı Gizlendi" : "💬 Sohbet Akışı Açıldı");
      vibrate(15);
    });
  }

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
  if (selFieldZoom) {
    selFieldZoom.addEventListener('change', (e) => {
      setFieldZoom(parseFloat(e.target.value));
    });
  }

  const selCameraMode = document.getElementById('sel-camera-mode');
  if (selCameraMode) {
    selCameraMode.addEventListener('change', (e) => {
      setCameraLock(e.target.value === 'fixed');
    });
  }

  const rngOpacity = document.getElementById('rng-opacity');
  const txtOpacity = document.getElementById('txt-opacity');
  rngOpacity.addEventListener('input', (e) => {
    state.opacity = parseInt(e.target.value);
    txtOpacity.innerText = state.opacity + '%';
    root.style.opacity = (state.opacity / 100).toString();
    localStorage.setItem('hax_opacity', state.opacity.toString());
  });

  const selControlType = document.getElementById('sel-control-type');
  if (selControlType) {
    selControlType.addEventListener('change', (e) => {
      state.controlType = e.target.value;
      localStorage.setItem('hax_control_type', state.controlType);
      setupControlMode();
      showToast(`Kontrol modu: ${state.controlType === 'dpad' ? '8-Yönlü D-Pad' : state.controlType === 'fixed' ? 'Sabit Joystick' : 'Serbest Joystick'}`);
    });
  }

  const rngJoySens = document.getElementById('rng-joy-sens');
  const txtJoySens = document.getElementById('txt-joy-sens');
  if (rngJoySens) {
    rngJoySens.addEventListener('input', (e) => {
      state.joySensitivity = parseInt(e.target.value, 10);
      txtJoySens.innerText = state.joySensitivity + '%';
      localStorage.setItem('hax_joy_sens', state.joySensitivity.toString());
    });
  }

  const rngJoyDeadzone = document.getElementById('rng-joy-deadzone');
  const txtJoyDeadzone = document.getElementById('txt-joy-deadzone');
  if (rngJoyDeadzone) {
    rngJoyDeadzone.addEventListener('input', (e) => {
      state.joyDeadzone = parseInt(e.target.value, 10);
      txtJoyDeadzone.innerText = state.joyDeadzone + 'px';
      localStorage.setItem('hax_joy_deadzone', state.joyDeadzone.toString());
    });
  }

  const chkAutoHll = document.getElementById('chk-auto-hll');
  if (chkAutoHll) {
    chkAutoHll.addEventListener('change', (e) => {
      state.autoHll = e.target.checked;
      localStorage.setItem('hax_auto_hll', state.autoHll ? 'true' : 'false');
      showToast(state.autoHll ? 'Otomatik "hll" Açıldı' : 'Otomatik "hll" Kapatıldı');
    });
  }

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
    setupControlMode();
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
  // OTA UPDATE CHECKER
  // ==========================================
  const CURRENT_APP_VERSION = (window.Android && window.Android.getOtaVersion) ? window.Android.getOtaVersion() : "2.7.6";
  const otaModal = document.getElementById('hax-ota-modal');
  const txtOtaMessage = document.getElementById('txt-ota-message');
  const otaActionBox = document.getElementById('ota-action-box');
  const btnStartOtaHot = document.getElementById('btn-start-ota-hot');
  const btnStartOtaInstall = document.getElementById('btn-start-ota-install');

  function checkOtaUpdate(manual = false) {
    if (manual) showToast("Güncellemeler kontrol ediliyor...");

    fetch('https://api.github.com/repos/cnkzlyr/haxball-mobile/releases/latest')
      .then(r => {
        if (!r.ok) throw new Error("HTTP " + r.status);
        return r.json();
      })
      .then(data => {
        if (data && data.tag_name) {
          const latestTag = data.tag_name.replace(/^v/, '');
          if (latestTag !== CURRENT_APP_VERSION && latestTag > CURRENT_APP_VERSION) {
            txtOtaMessage.innerHTML = `🎉 <b>Yeni HaxBall Güncellemesi Mevcut!</b><br>Mevcut Sürüm: v${CURRENT_APP_VERSION}<br>En Son Sürüm: <b style="color:#38bdf8;">${data.tag_name}</b><br><br><span style="color:#94a3b8;font-size:11px;">${data.name || ''}</span>`;
            otaActionBox.style.display = 'flex';

            const apkAsset = (data.assets || []).find(a => a.name && a.name.endsWith('.apk'));
            const downloadUrl = apkAsset ? apkAsset.browser_download_url : `https://github.com/cnkzlyr/haxball-mobile/releases/download/${data.tag_name}/haxball-debug.apk`;

            // 1. Hot OTA Live Update (No APK installation needed!)
            if (btnStartOtaHot) {
              btnStartOtaHot.onclick = () => {
                showToast("⚡ Canlı güncelleme indiriliyor (0.5 sn)...");
                const rawJs = `https://raw.githubusercontent.com/cnkzlyr/haxball-mobile/${data.tag_name}/assets/haxball-controller.js`;
                const rawCss = `https://raw.githubusercontent.com/cnkzlyr/haxball-mobile/${data.tag_name}/assets/haxball-controller.css`;
                if (window.Android && window.Android.fetchAndApplyOta) {
                  window.Android.fetchAndApplyOta(rawJs, rawCss, data.tag_name);
                } else {
                  showToast("Android köprüsü hazır değil");
                }
                otaModal.style.display = 'none';
              };
            }

            // 2. Full APK Package Installer Option
            if (btnStartOtaInstall) {
              btnStartOtaInstall.onclick = () => {
                if (window.Android && window.Android.downloadAndInstallApk) {
                  window.Android.downloadAndInstallApk(downloadUrl);
                } else {
                  window.open(downloadUrl, '_blank');
                }
                otaModal.style.display = 'none';
              };
            }

            otaModal.style.display = 'flex';
            vibrate(30);
            return;
          }
        }
        if (manual) showToast(`✅ En son sürümü kullanıyorsunuz (v${CURRENT_APP_VERSION})`);
      })
      .catch(() => {
        if (manual) {
          showToast(`✅ En güncel sürüm yüklü (v${CURRENT_APP_VERSION})`);
        }
      });
  }

  const btnCheckOta = document.getElementById('btn-check-ota');
  if (btnCheckOta) {
    btnCheckOta.addEventListener('click', () => {
      checkOtaUpdate(true);
    });
  }
  const btnCloseOta = document.getElementById('btn-close-ota');
  if (btnCloseOta) {
    btnCloseOta.addEventListener('click', () => {
      otaModal.style.display = 'none';
    });
  }
  const btnDismissOta = document.getElementById('btn-dismiss-ota');
  if (btnDismissOta) {
    btnDismissOta.addEventListener('click', () => {
      otaModal.style.display = 'none';
    });
  }

  // Check update quietly on app launch after 4 seconds
  setTimeout(() => checkOtaUpdate(false), 4000);

  // ==========================================
  // 20. HUD / GAMEPAD TOGGLE
  // ==========================================
  document.getElementById('btn-toggle-hud').addEventListener('click', () => {
    isControlsHidden = !isControlsHidden;
    state.controlsManualToggle = isControlsHidden;
    updateControlsVisibility();
    showToast(isControlsHidden ? "Oyun Kontrolleri Gizlendi" : "Oyun Kontrolleri Açıldı");
    vibrate(15);
  });

  // ==========================================
  // 21. ON-DEMAND CLEAN GOAL CLIP RECORDER (ZERO BACKGROUND LAG)
  // Records 6 seconds of HD gameplay directly from canvas on demand.
  // Zero background CPU/GPU load, zero WebRTC thread starvation, 100% valid MP4/WebM!
  // ==========================================
  let isClipping = false;
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

    try {
      const url = URL.createObjectURL(blob);
      videoEl.src = url;
      modal.style.display = 'flex';
      videoEl.play().catch(() => {});
    } catch(e) {}
  }

  const btnCloseClipPreview = document.getElementById('btn-close-clip-preview');
  if (btnCloseClipPreview) {
    btnCloseClipPreview.addEventListener('click', () => {
      const modal = document.getElementById('hax-clip-preview-modal');
      const videoEl = document.getElementById('hax-clip-video-el');
      if (videoEl) videoEl.pause();
      if (modal) modal.style.display = 'none';
    });
  }

  const btnPreviewShare = document.getElementById('btn-preview-share');
  if (btnPreviewShare) {
    btnPreviewShare.addEventListener('click', () => {
      if (window.Android && window.Android.shareVideo && lastSavedFilename) {
        window.Android.shareVideo(lastSavedFilename);
      } else {
        showToast("Video Galeri ve İndirilenler klasörünüzde hazır!");
      }
    });
  }

  function captureGoalClip() {
    if (isClipping) {
      showToast("Zaten bir video kaydediliyor...");
      return;
    }

    const iframeDoc = getIframeDoc();
    const canvas = iframeDoc ? iframeDoc.querySelector('canvas') : document.querySelector('canvas');
    if (!canvas) {
      showToast("Oyun sahası bulunamadı!");
      return;
    }

    const stream = canvas.captureStream ? canvas.captureStream(30) : null;
    if (!stream) {
      showToast("Ekran yakalama desteklenmiyor");
      return;
    }

    const mime = getBestVideoMimeType();
    let rec = null;
    try {
      rec = new MediaRecorder(stream, {
        mimeType: mime,
        videoBitsPerSecond: 2500000
      });
    } catch(e) {
      showToast("Video kaydedici başlatılamadı");
      return;
    }

    isClipping = true;
    const clipBtn = document.getElementById('hax-btn-clip-goal');
    if (clipBtn) clipBtn.classList.add('clipping');
    vibrate(40);
    showToast("🔴 6 Saniyelik Gol Klibi Kaydediliyor...");

    const chunks = [];
    rec.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) chunks.push(e.data);
    };

    rec.onstop = () => {
      try {
        const finalBlob = new Blob(chunks, { type: mime });
        if (finalBlob.size < 4000) {
          showToast("Klip verisi yetersiz!");
          return;
        }

        const ext = mime.includes('mp4') ? 'mp4' : 'webm';
        const d = new Date();
        const timePad = (n) => String(n).padStart(2, '0');
        const timestamp = `${d.getFullYear()}${timePad(d.getMonth()+1)}${timePad(d.getDate())}_${timePad(d.getHours())}${timePad(d.getMinutes())}${timePad(d.getSeconds())}`;
        const filename = `HaxBall_Goal_${timestamp}.${ext}`;

        sendBlobToAndroidChunked(finalBlob, filename);

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

        showClipPreviewModal(finalBlob, filename);

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
        try { stream.getTracks().forEach(t => t.stop()); } catch(e) {}
      }
    };

    rec.start(500);

    setTimeout(() => {
      if (rec && rec.state === 'recording') {
        try { rec.stop(); } catch(e) {}
      }
    }, 6000);
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
  let lastAutoHllTime = 0;

  function triggerAutoHll() {
    if (!state.autoHll) return;
    const now = Date.now();
    if (now - lastAutoHllTime < 15000) return; // avoid duplicate celebrate spam (15s cooldown)
    lastAutoHllTime = now;
    setTimeout(() => {
      sendChatMessage('hll');
      showToast('🎉 Otomatik "hll" Gönderildi');
    }, 1500);
  }

  // ==========================================
  // 21. REAL-TIME INSTANT CHAT & ON-AVATAR SPEECH BUBBLES
  // ==========================================
  function isBotOrSystemMessage(rawText, senderNick, messageBody) {
    if (!senderNick || !messageBody) return true;

    const lowerRaw = rawText.toLowerCase();
    const lowerNick = senderNick.toLowerCase();

    // Links & bot invites
    if (lowerRaw.includes('http://') || lowerRaw.includes('https://') || 
        lowerRaw.includes('discord.gg') || lowerRaw.includes('discord.com') ||
        lowerRaw.includes('t.me/') || lowerRaw.includes('.com/')) {
      return true;
    }

    // Bot stats & ratings pattern: (1576P), [57P], (0P)
    if (/\(\d+p\)/i.test(lowerRaw) || /\[\d+p\]/i.test(lowerRaw)) {
      return true;
    }

    // Bot prefixes
    if (lowerNick.includes('bot') || lowerNick.includes('server') || lowerNick.includes('sunucu') ||
        lowerNick === 'admin' || lowerNick.startsWith('!') || lowerNick.startsWith('/')) {
      return true;
    }

    // Server announcements & room system events (Strictly non-player system text)
    const botKeywords = [
      'topluluğumuza katıl', 'hosgeldin', 'hoşgeldin', 'komutlar',
      'discord sunucu', 'stadium:', 'time limit:', 'score limit:',
      'was kicked', 'was banned', 'left the room',
      'joined the room', 'teams were locked', 'swapped'
    ];
    for (const kw of botKeywords) {
      if (lowerRaw.includes(kw)) return true;
    }

    return false;
  }

  function addMessageToMiniChatStream(rawText, senderNick, messageBody, isBotOrSys) {
    const stream = document.getElementById('hax-mini-chat-stream');
    if (!stream) return;

    // Filter out client-side muted players
    if (senderNick && state.mutedPlayers && state.mutedPlayers.includes(senderNick.toLowerCase())) {
      return;
    }

    const line = document.createElement('div');
    line.className = 'mini-chat-line';

    const lowerRaw = rawText.toLowerCase();
    if (!isBotOrSys && senderNick && messageBody) {
      line.innerHTML = `<span class="nick">${escapeHtml(senderNick)}:</span><span class="msg">${escapeHtml(messageBody)}</span>`;
    } else if (lowerRaw.includes('goal') || lowerRaw.includes('gol') || lowerRaw.includes('scored')) {
      line.innerHTML = `<span class="sys-goal">⚽ ${escapeHtml(rawText)}</span>`;
    } else {
      line.innerHTML = `<span class="sys-msg">${escapeHtml(rawText)}</span>`;
    }

    stream.appendChild(line);

    // Auto blur-fade dissolution after 4.2 seconds
    setTimeout(() => {
      line.classList.add('fading');
    }, 4200);

    setTimeout(() => {
      if (line.parentNode) line.parentNode.removeChild(line);
    }, 5000);

    // Keep last 7-8 lines (5-8 satırlık chat akışı)
    while (stream.children.length > 8) {
      stream.removeChild(stream.children[0]);
    }

    stream.scrollTop = stream.scrollHeight;
  }

  function triggerPlayerSpeechBubble(senderNick, messageBody) {
    if (!senderNick || !messageBody) return;
    const cleanNick = senderNick.trim().toLowerCase();
    // Drop speech bubbles for client-side muted players
    if (state.mutedPlayers && state.mutedPlayers.includes(cleanNick)) return;

    activeSpeechBubbles.set(cleanNick, {
      nick: senderNick,
      text: messageBody.trim(),
      expiresAt: performance.now() + 1800, // 1.8s duration ensures it is reliably readable & visible!
      lastFrame: -1
    });
  }

  function checkGameEventsFromChat(rawText) {
    const txt = rawText.toLowerCase();
    const myNick = (state.nickname || '').trim().toLowerCase();

    // Strictly ignore shot notices, speed readings and save commentary ("şut", "hız", "km/h")
    const isShotNotice = txt.includes('şut') || txt.includes('km/h') || txt.includes('hız') || 
                         txt.includes('kurtardı') || txt.includes('kurtarış') || txt.includes('direk') || 
                         txt.includes('kaçtı') || txt.includes('şansı');
    if (isShotNotice) return;

    // Match win & completion detection
    if (txt.includes('won the match') || txt.includes('kazandı') || txt.includes('oyun bitti') || txt.includes('game ended')) {
      state.stats.matches += 1;
      if (myNick && txt.includes(myNick)) {
        state.stats.wins += 1;
      }
      saveLocalStats();
    }
  }

  function handleIncomingChatNode(node) {
    if (!node || node.__haxHandled) return;
    node.__haxHandled = true;
    const rawText = (node.innerText || node.textContent || '').trim();
    if (!rawText) return;

    // Nickname extraction
    const nickEl = node.querySelector ? node.querySelector('.nickname, .nick, strong, b') : null;
    let senderNick = nickEl ? (nickEl.innerText || nickEl.textContent || '').trim().replace(/:$/, '').trim() : '';
    let messageBody = '';

    if (senderNick) {
      const idx = rawText.indexOf(senderNick);
      messageBody = rawText.substring(idx + senderNick.length).replace(/^[:\s]+/, '').trim();
    } else {
      const colonIdx = rawText.indexOf(':');
      if (colonIdx > 0 && colonIdx < 35) {
        senderNick = rawText.substring(0, colonIdx).trim();
        messageBody = rawText.substring(colonIdx + 1).trim();
      }
    }

    // Client-side Mute Check
    if (senderNick && state.mutedPlayers && state.mutedPlayers.includes(senderNick.toLowerCase())) {
      return;
    }

    const isBotOrSys = isBotOrSystemMessage(rawText, senderNick, messageBody);

    // 1. Add all lines (including system) to left mini chat stream
    addMessageToMiniChatStream(rawText, senderNick, messageBody, isBotOrSys);

    // 2. Real player speech bubbles on avatar (1.8s duration, 25% larger, follows avatar at 120 FPS)
    if (!isBotOrSys && senderNick && messageBody) {
      triggerPlayerSpeechBubble(senderNick, messageBody);
    }

    // 3. Game event detection (Scoreboard changes strictly handle goals)
    checkGameEventsFromChat(rawText);
  }

  let chatObserver = null;
  let lastObservedLogEl = null;

  function setupChatObserver(iframeDoc) {
    if (!iframeDoc) return;
    const logEl = iframeDoc.querySelector('.chatbox-view-contents > .log .log-contents') ||
                  iframeDoc.querySelector('.chatbox-view .log-contents') ||
                  iframeDoc.querySelector('.log-contents');
    if (!logEl || logEl === lastObservedLogEl) return;

    if (chatObserver) {
      try { chatObserver.disconnect(); } catch(e) {}
    }

    lastObservedLogEl = logEl;

    // Catch up on initial lines
    const existingLines = logEl.querySelectorAll('p');
    lastSeenChatLines = existingLines.length;

    chatObserver = new MutationObserver((mutations) => {
      for (const m of mutations) {
        for (const added of m.addedNodes) {
          if (added.nodeType === 1) {
            handleIncomingChatNode(added);
          }
        }
      }
    });

    chatObserver.observe(logEl, { childList: true });
  }

  function launchGoalCelebration() {
    const overlay = document.getElementById('hax-goal-celebration-overlay');
    const canvas = document.getElementById('hax-goal-particle-canvas');
    const flamingAvatar = document.getElementById('hax-flaming-avatar');
    if (!overlay || !canvas) return;

    if (flamingAvatar) {
      flamingAvatar.innerText = state.avatar || '⚽';
    }

    overlay.style.display = 'flex';
    vibrate([40, 70, 40, 90, 140]);

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const particles = [];
    const colors = ['#f59e0b', '#ef4444', '#10b981', '#38bdf8', '#fbbf24', '#ffffff'];
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;

    for (let i = 0; i < 65; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 9 + 4;
      particles.push({
        x: centerX,
        y: centerY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 3,
        color: colors[Math.floor(Math.random() * colors.length)],
        size: Math.random() * 5 + 3,
        alpha: 1.0,
        decay: Math.random() * 0.02 + 0.015
      });
    }

    let animId = null;
    function renderParticles() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      let alive = false;
      for (let p of particles) {
        if (p.alpha > 0) {
          alive = true;
          p.x += p.vx;
          p.y += p.vy;
          p.vy += 0.18; // gravity
          p.alpha -= p.decay;

          ctx.save();
          ctx.globalAlpha = Math.max(0, p.alpha);
          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
      }
      if (alive) {
        animId = requestAnimationFrame(renderParticles);
      }
    }
    renderParticles();

    setTimeout(() => {
      overlay.style.display = 'none';
      if (animId) cancelAnimationFrame(animId);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }, 1800);
  }

  function showGoalBanner() {
    launchGoalCelebration();
    const banner = document.getElementById('hax-goal-banner');
    if (banner) {
      banner.style.display = 'flex';
    }

    triggerAutoHll();

    if (goalBannerTimeout) clearTimeout(goalBannerTimeout);
    goalBannerTimeout = setTimeout(() => {
      if (banner) banner.style.display = 'none';
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
  let lastAvatarSentTime = 0;

  setInterval(() => {
    const iframeDoc = getIframeDoc();
    const iframeWin = getIframeWin();
    if (!iframeDoc) return;

    // 1. Ensure Iframe Injected Styles & Canvas Scale Hook
    injectIframeStyles(iframeDoc);
    if (iframeWin) hookIframeCanvas(iframeWin);
    syncChatVisibility();

    // 2. Monitor Scoreboard for Instant Goal Detection
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

    // 6. In Match vs In Lobby Controls Switcher & Room Menu Auto-Detection
    const hasRoomList = !!iframeDoc.querySelector('.roomlist-view');
    const inLobby = !!(hasRoomList || 
                       iframeDoc.querySelector('.choose-nickname-view') ||
                       iframeDoc.querySelector('.room-view > .container') ||
                       iframeDoc.querySelector('.room-view .teams'));
    const inMatch = !!(iframeDoc.querySelector('.game-view') && iframeDoc.querySelector('canvas') && !hasRoomList && !iframeDoc.querySelector('.room-view > .container'));

    // Check if in-game room menu, settings dialog or popup is currently showing
    const isRoomMenuShowing = !!(
      iframeDoc.querySelector('.game-view.showing-room-view') ||
      iframeDoc.querySelector('.game-view .room-view') ||
      iframeDoc.querySelector('.dialog:not(.loader-view .dialog)') ||
      (iframeDoc.querySelector('.game-view > [data-hook="popups"]') && 
       iframeDoc.querySelector('.game-view > [data-hook="popups"]').style.display !== 'none' &&
       iframeDoc.querySelector('.game-view > [data-hook="popups"]').children.length > 0)
    );

    if (isRoomMenuShowing) {
      root.classList.add('hax-room-menu-open');
    } else {
      root.classList.remove('hax-room-menu-open');
    }

    if (state.controlsManualToggle === null) {
      if (inLobby && !isControlsHidden) {
        isControlsHidden = true;
        updateControlsVisibility();
      } else if (inMatch && isControlsHidden) {
        isControlsHidden = false;
        updateControlsVisibility();
      }
    }

    // Reset avatar flag only when returning to public room list
    if (hasRoomList) {
      autoAvatarAppliedForRoom = false;
    }

    // 7. Auto Apply Saved Avatar When Entering Match (with 60s cooldown, never re-sent on pause/menu)
    const nowTime = Date.now();
    if (inMatch && !autoAvatarAppliedForRoom && state.avatar && (nowTime - lastAvatarSentTime > 60000)) {
      autoAvatarAppliedForRoom = true;
      lastAvatarSentTime = nowTime;
      setTimeout(() => {
        sendChatMessage('/avatar ' + state.avatar);
      }, 1500);
    }

    // 8. Instant 0ms Chat Observer & Backup Sync
    setupChatObserver(iframeDoc);
    const chatLogEl = iframeDoc.querySelector('.chatbox-view-contents > .log .log-contents') ||
                      iframeDoc.querySelector('.chatbox-view .log-contents') ||
                      iframeDoc.querySelector('.log-contents');
    if (chatLogEl) {
      const pTags = chatLogEl.querySelectorAll('p');
      if (pTags.length > lastSeenChatLines) {
        for (let i = lastSeenChatLines; i < pTags.length; i++) {
          handleIncomingChatNode(pTags[i]);
        }
        lastSeenChatLines = pTags.length;
      }
    }
  }, 250);

  console.log("[HaxBall Mobile] Controller Initialized Successfully!");
})();
