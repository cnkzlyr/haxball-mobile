const { app, BrowserWindow, Menu, ipcMain, shell } = require('electron');
const path = require('path');
const fs = require('fs');

// Optimize Chromium flags for lowest latency WebRTC and 120Hz/60Hz rendering
app.commandLine.appendSwitch('disable-renderer-backgrounding');
app.commandLine.appendSwitch('enable-gpu-rasterization');
app.commandLine.appendSwitch('enable-zero-copy');
app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required');

let mainWindow = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 720,
    minWidth: 800,
    minHeight: 500,
    title: 'HaxBall Client',
    backgroundColor: '#0f172a',
    icon: path.join(__dirname, '../res/mipmap-xxxhdpi/ic_launcher.png'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
      webSecurity: false
    }
  });

  // Inject controller scripts and styles on page load
  mainWindow.webContents.on('did-finish-load', () => {
    const cssPath = path.join(__dirname, '../assets/haxball-controller.css');
    const jsPath = path.join(__dirname, '../assets/haxball-controller.js');

    if (fs.existsSync(cssPath)) {
      const css = fs.readFileSync(cssPath, 'utf8');
      mainWindow.webContents.insertCSS(css).catch(() => {});
    }

    if (fs.existsSync(jsPath)) {
      const js = fs.readFileSync(jsPath, 'utf8');
      mainWindow.webContents.executeJavaScript(js).catch(() => {});
    }
  });

  // Auto-grant WebRTC permissions
  mainWindow.webContents.session.setPermissionRequestHandler((webContents, permission, callback) => {
    callback(true);
  });

  // Open external links in default OS browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http:') || url.startsWith('https:')) {
      if (!url.includes('haxball.com')) {
        shell.openExternal(url);
        return { action: 'deny' };
      }
    }
    return { action: 'allow' };
  });

  // Load online HaxBall game
  mainWindow.loadURL('https://www.haxball.com/play');

  createAppMenu();
}

function createAppMenu() {
  const template = [
    {
      label: 'HaxBall',
      submenu: [
        {
          label: '⚽ Çevrimiçi Oyna',
          click: () => mainWindow && mainWindow.loadURL('https://www.haxball.com/play')
        },
        {
          label: '🎯 Antrenman Modu',
          click: () => {
            if (mainWindow) {
              const offlinePath = path.join(__dirname, '../assets/offline_practice.html');
              mainWindow.loadFile(offlinePath);
            }
          }
        },
        { type: 'separator' },
        {
          label: '🔄 Yenile (F5)',
          accelerator: 'F5',
          click: () => mainWindow && mainWindow.reload()
        },
        {
          label: 'Çıkış',
          accelerator: process.platform === 'darwin' ? 'Cmd+Q' : 'Alt+F4',
          click: () => app.quit()
        }
      ]
    },
    {
      label: 'Görünüm',
      submenu: [
        {
          label: 'Tam Ekran (F11)',
          accelerator: 'F11',
          click: () => {
            if (mainWindow) {
              mainWindow.setFullScreen(!mainWindow.isFullScreen());
            }
          }
        },
        { type: 'separator' },
        { role: 'zoomIn', label: 'Büyüt (Ctrl +)' },
        { role: 'zoomOut', label: 'Küçült (Ctrl -)' },
        { role: 'resetZoom', label: 'Varsayılan Boyut (Ctrl 0)' },
        { type: 'separator' },
        {
          label: 'Geliştirici Araçları',
          accelerator: 'F12',
          click: () => mainWindow && mainWindow.webContents.toggleDevTools()
        }
      ]
    },
    {
      label: 'Yardım',
      submenu: [
        {
          label: 'GitHub Deposu',
          click: () => shell.openExternal('https://github.com/cnkzlyr/haxball-mobile')
        },
        {
          label: 'Hakkında',
          click: () => {
            const { dialog } = require('electron');
            dialog.showMessageBox(mainWindow, {
              type: 'info',
              title: 'HaxBall v2.9.0',
              message: 'HaxBall Mobile & Desktop Client',
              detail: 'Geliştirici: Can Kızılyar\nÖzel Klavye Tapping Motoru, Sanal Klavye ve Masaüstü Desteği.'
            });
          }
        }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
