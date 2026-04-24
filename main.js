const path = require('path');
const fs = require('fs');
const { app, BrowserWindow, dialog, shell } = require('electron');
const { autoUpdater } = require('electron-updater');
const DiagnosticLogger = require('./diagnostic-logger');

const isDev = process.env.NODE_ENV === 'development';
const diagnostics = new DiagnosticLogger();
let mainWindow = null;

function getIndexPath() {
  const localBuild = path.join(__dirname, 'dist', 'index.html');
  if (fs.existsSync(localBuild)) {
    return localBuild;
  }

  const fallbackBuild = path.join(process.resourcesPath || __dirname, 'app.asar', 'dist', 'index.html');
  if (fs.existsSync(fallbackBuild)) {
    return fallbackBuild;
  }

  return localBuild;
}

function verifyBuildExists(indexPath) {
  diagnostics.log('info', `Verifying local build file: ${indexPath}`);

  if (!fs.existsSync(indexPath)) {
    diagnostics.log('error', `Production build missing at: ${indexPath}`);
    dialog.showErrorBox(
      'BookIt Startup Error',
      `Unable to find the local application bundle at:\n${indexPath}\n\nRun npm run build and package again.`
    );
    app.quit();
    return false;
  }

  return true;
}

function setupAutoUpdate() {
  if (isDev) {
    diagnostics.log('info', 'Skipping auto-updater in development mode');
    return;
  }

  diagnostics.log('info', 'Preparing auto-update architecture');

  autoUpdater.on('checking-for-update', () => diagnostics.log('info', 'Auto-updater: checking for update'));
  autoUpdater.on('update-available', () => diagnostics.log('info', 'Auto-updater: update available'));
  autoUpdater.on('update-not-available', () => diagnostics.log('info', 'Auto-updater: no update available'));
  autoUpdater.on('download-progress', (progress) => diagnostics.log('info', `Auto-updater progress: ${Math.round(progress.percent)}%`));
  autoUpdater.on('update-downloaded', () => diagnostics.log('info', 'Auto-updater: update downloaded - will install on quit'));
  autoUpdater.on('error', (error) => diagnostics.log('error', `Auto-updater error: ${error?.message || error}`));

  autoUpdater.checkForUpdatesAndNotify().catch((error) => diagnostics.log('error', `Auto-updater failed: ${error?.message || error}`));
}

function createWindow() {
  diagnostics.log('info', 'Creating application window...');

  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 1024,
    minHeight: 700,
    autoHideMenuBar: true,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      devTools: isDev,
    },
  });

  mainWindow.once('ready-to-show', () => {
    diagnostics.log('info', 'Window is ready to show');
    mainWindow.show();
  });

  mainWindow.webContents.on('did-finish-load', () => diagnostics.log('info', 'Renderer finished loading'));

  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL, isMainFrame) => {
    diagnostics.log('warn', `Failed to load ${validatedURL} (${errorCode}): ${errorDescription}`);
    if (isMainFrame) {
      const indexPath = getIndexPath();
      if (verifyBuildExists(indexPath)) {
        mainWindow.loadFile(indexPath).catch((error) => diagnostics.log('error', `Reload failed: ${error.message}`));
      }
    }
  });

  mainWindow.webContents.on('crashed', () => {
    diagnostics.log('error', 'Renderer process crashed');
    dialog.showErrorBox('App Crashed', 'BookIt has crashed. Please restart the application.');
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http')) {
      shell.openExternal(url);
      return { action: 'deny' };
    }
    return { action: 'allow' };
  });

  mainWindow.on('closed', () => {
    diagnostics.log('info', 'Main window closed');
    mainWindow = null;
    diagnostics.logSessionEnd();
  });

  const indexPath = getIndexPath();
  if (!verifyBuildExists(indexPath)) {
    return;
  }

  if (isDev) {
    diagnostics.log('info', 'Loading development server at http://localhost:5173');
    mainWindow.loadURL('http://localhost:5173').catch((error) => diagnostics.log('error', `Dev load failed: ${error.message}`));
    mainWindow.webContents.openDevTools();
  } else {
    diagnostics.log('info', `Loading local production build from: ${indexPath}`);
    mainWindow.loadFile(indexPath).catch((error) => {
      diagnostics.log('error', `Production load failed: ${error.message}`);
      dialog.showErrorBox('Startup Failed', `Unable to load BookIt UI: ${error.message}`);
      app.quit();
    });
  }
}

function initializeApp() {
  app.setAppUserModelId('com.bookit.app');
  app.disableHardwareAcceleration();

  if (!app.requestSingleInstanceLock()) {
    diagnostics.log('warn', 'Another instance is already running');
    app.quit();
    return;
  }

  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
  });

  app.on('activate', () => {
    if (!mainWindow) createWindow();
  });

  app.whenReady()
    .then(() => {
      diagnostics.logAppStart();
      setupAutoUpdate();
      createWindow();
    })
    .catch((error) => {
      diagnostics.logError(error, 'app-ready');
      dialog.showErrorBox('BookIt Startup Error', `Unable to start BookIt: ${error.message}`);
      app.quit();
    });

  process.on('uncaughtException', (error) => diagnostics.logError(error, 'uncaughtException'));
  process.on('unhandledRejection', (reason) => diagnostics.log('error', `Unhandled Promise rejection: ${reason}`));
}

initializeApp();
