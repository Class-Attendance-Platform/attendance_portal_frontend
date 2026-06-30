const { app, BrowserWindow } = require('electron');
const path = require('path');
const isDev = require('electron-is-dev');

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
  });

  if (isDev) {
    // Expo Router dev server
    win.loadURL('http://localhost:8081');
    // Optional: Open DevTools
    // win.webContents.openDevTools();
  } else {
    // In production, we load the static index.html
    win.loadFile(path.join(__dirname, 'dist/index.html'));
  }

  // Handle Expo Router's history API for deep linking/refreshes
  win.webContents.on('did-fail-load', () => {
    if (!isDev) win.loadFile(path.join(__dirname, 'dist/index.html'));
  });
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});