// Desktop app (Windows / Linux): a window around the live web app, so it is
// always up to date. Build installers with `npm run dist` in this folder.
const { app, BrowserWindow, session, shell } = require('electron');
const path = require('path');

// ATTENDANCE_APP_URL lets you point a local test at another address.
const APP_URL = process.env.ATTENDANCE_APP_URL || 'https://attendanceportal.sakibkx.tech';
const APP_ORIGIN = new URL(APP_URL).origin;

const isOwnSite = (url) => {
  try {
    return new URL(url).origin === APP_ORIGIN;
  } catch {
    return false;
  }
};

// Only web and mail links may leave the app. Other schemes (file:, ms-msdt:, search-ms:, ...)
// could make the computer start a program, so they are ignored.
const openInBrowser = (url) => {
  try {
    if (['https:', 'http:', 'mailto:'].includes(new URL(url).protocol)) shell.openExternal(url);
  } catch {
    // not a valid URL: ignore
  }
};

let mainWindow = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 380,
    minHeight: 600,
    title: 'Class Attendance Portal',
    icon: path.join(__dirname, 'build', 'icon.png'),
    autoHideMenuBar: true,
    show: false,
    webPreferences: {
      // The window shows a website: give it no access to the computer.
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });
  mainWindow.once('ready-to-show', () => mainWindow.show());

  // Links to other sites open in the normal browser, not inside the app.
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (!isOwnSite(url)) openInBrowser(url);
    return { action: 'deny' };
  });
  mainWindow.webContents.on('will-navigate', (event, url) => {
    if (!isOwnSite(url)) {
      event.preventDefault();
      openInBrowser(url);
    }
  });

  // No internet or server down: show a small page with a Retry button.
  mainWindow.webContents.on('did-fail-load', (_event, errorCode, _description, _url, isMainFrame) => {
    if (isMainFrame && errorCode !== -3 /* aborted, e.g. a redirect */) {
      mainWindow.loadFile(path.join(__dirname, 'offline.html'), { query: { url: APP_URL } });
    }
  });

  mainWindow.loadURL(APP_URL);
}

// One window only: opening the app again focuses it.
if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (!mainWindow) return;
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
  });

  app.whenReady().then(() => {
    // Camera (face registration, class photos) and fullscreen only for our own site.
    session.defaultSession.setPermissionRequestHandler((_contents, permission, callback, details) => {
      callback(isOwnSite(details.requestingUrl) && ['media', 'fullscreen'].includes(permission));
    });
    createWindow();
  });

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
  });
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
}
