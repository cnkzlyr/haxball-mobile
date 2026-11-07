const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('DesktopAPI', {
  isDesktop: true,
  platform: process.platform,
  version: '2.9.0'
});
