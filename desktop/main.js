const { app, BrowserWindow, Menu, protocol, session, shell } = require('electron');
const fs = require('node:fs');
const path = require('node:path');

const WEB_BUILD = path.join(__dirname, '..', 'web-build');
const APP_ICON = path.join(__dirname, '..', 'assets', 'images', 'icon.png');
const APP_TITLE = 'HSTU Attendance Portal';
const APP_ORIGIN = 'app://local';
const DEFAULT_API_BASE = process.env.PORTAL_API_URL || 'https://attendanceportal.sakibkx.tech';
const DEV_SERVER_URL = process.env.PORTAL_DEV_URL;

const CONTENT_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.otf': 'font/otf',
  '.wasm': 'application/wasm',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
};

protocol.registerSchemesAsPrivileged([
  { scheme: 'app', privileges: { standard: true, secure: true, supportFetchAPI: true, corsEnabled: true, stream: true } },
]);

function readFileOrNull(filePath) {
  try {
    return fs.readFileSync(filePath);
  } catch {
    return null;
  }
}

function responseFor(filePath, body) {
  const type = CONTENT_TYPES[path.extname(filePath).toLowerCase()] || 'application/octet-stream';
  return new Response(body, { headers: { 'Content-Type': type } });
}

function serveBuild(request) {
  const { pathname } = new URL(request.url);
  const relative = decodeURIComponent(pathname).replace(/^\/+/, '') || 'index.html';
  const filePath = path.join(WEB_BUILD, relative);
  if (filePath !== WEB_BUILD && !filePath.startsWith(WEB_BUILD + path.sep)) {
    return new Response('Not found', { status: 404 });
  }
  const file = readFileOrNull(filePath);
  if (file) return responseFor(filePath, file);
  if (!path.extname(relative)) {
    const shellHtml = readFileOrNull(path.join(WEB_BUILD, 'index.html'));
    if (shellHtml) return responseFor('index.html', shellHtml);
  }
  return new Response('Not found', { status: 404 });
}

function allowAppOrigin(details) {
  const headers = { ...(details.responseHeaders || {}) };
  for (const key of Object.keys(headers)) {
    if (key.toLowerCase().startsWith('access-control-')) delete headers[key];
  }
  const allowedOrigin = DEV_SERVER_URL ? new URL(DEV_SERVER_URL).origin : APP_ORIGIN;
  headers['Access-Control-Allow-Origin'] = [allowedOrigin];
  headers['Access-Control-Allow-Methods'] = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'];
  headers['Access-Control-Allow-Headers'] = ['Authorization', 'Content-Type', 'Accept', 'X-Requested-With'];
  headers['Access-Control-Expose-Headers'] = ['Content-Disposition'];
  return headers;
}

function openServerSettings() {
  const win = BrowserWindow.getAllWindows()[0];
  if (!win) return;
  if (win.isMinimized()) win.restore();
  win.focus();
  win.webContents.send('open-server-settings');
}

function goBack() {
  const win = BrowserWindow.getFocusedWindow() || BrowserWindow.getAllWindows()[0];
  if (!win) return;
  win.webContents.send('go-back');
}

function buildMenu() {
  const isMac = process.platform === 'darwin';
  return Menu.buildFromTemplate([
    ...(isMac ? [{ role: 'appMenu' }] : []),
    { role: 'fileMenu' },
    { role: 'editMenu' },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' },
      ],
    },
    {
      label: 'Server',
      submenu: [{ label: 'Change server address…', accelerator: 'CmdOrCtrl+,', click: openServerSettings }],
    },
    {
      label: 'Window',
      submenu: [
        { label: 'Back', accelerator: 'Escape', registerAccelerator: false, click: goBack },
        { type: 'separator' },
        { role: 'minimize' },
        { role: 'zoom' },
        ...(isMac ? [{ type: 'separator' }, { role: 'front' }] : [{ role: 'close' }]),
      ],
    },
  ]);
}

function isInternalUrl(url) {
  return DEV_SERVER_URL ? url.startsWith(DEV_SERVER_URL) : url.startsWith(APP_ORIGIN);
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 860,
    minWidth: 360,
    minHeight: 480,
    backgroundColor: '#F5F7F5',
    title: APP_TITLE,
    icon: fs.existsSync(APP_ICON) ? APP_ICON : undefined,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      additionalArguments: [`--portal-api-base=${DEFAULT_API_BASE}`],
    },
  });

  win.on('page-title-updated', (event) => event.preventDefault());
  win.once('ready-to-show', () => win.show());
  win.loadURL(DEV_SERVER_URL || `${APP_ORIGIN}/`);

  win.webContents.setWindowOpenHandler(({ url }) => {
    if (!isInternalUrl(url) && /^https?:/.test(url)) shell.openExternal(url);
    return { action: 'deny' };
  });
  win.webContents.on('will-navigate', (event, url) => {
    if (isInternalUrl(url)) return;
    event.preventDefault();
    if (/^https?:/.test(url)) shell.openExternal(url);
  });

  return win;
}

app.whenReady().then(() => {
  protocol.handle('app', (request) => serveBuild(request));

  session.defaultSession.setPermissionRequestHandler((webContents, permission, callback) => {
    const allowed = permission === 'media' || permission === 'clipboard-read' || permission === 'clipboard-sanitized-write';
    callback(allowed && isInternalUrl(webContents.getURL()));
  });

  session.defaultSession.webRequest.onHeadersReceived(
    { urls: ['http://*/*', 'https://*/*'] },
    (details, callback) => callback({ responseHeaders: allowAppOrigin(details) })
  );

  Menu.setApplicationMenu(buildMenu());
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
