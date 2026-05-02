const path = require('path');
const fs = require('fs');
const { app, BrowserWindow, dialog, shell, ipcMain } = require('electron');
const sqlite3 = require('sqlite3').verbose();

let mainWindow = null;
let db = null;

// ================= DATABASE =================
function initDatabase() {
  const dbPath = path.join(app.getPath('userData'), 'Bit2book.db');
  db = new sqlite3.Database(dbPath);

  db.serialize(() => {

    // PARTIES
    db.run(`CREATE TABLE IF NOT EXISTS parties (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT,
      phone TEXT,
      type TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // QUOTATIONS
    db.run(`CREATE TABLE IF NOT EXISTS quotations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      number TEXT,
      client_id INTEGER,
      salesman_id INTEGER,
      status TEXT,
      net_total REAL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME
    )`);

    // INVOICES
    db.run(`CREATE TABLE IF NOT EXISTS invoices (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      party_id INTEGER,
      invoice_no TEXT,
      total REAL,
      status TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // PAYMENTS
    db.run(`CREATE TABLE IF NOT EXISTS payments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      party_id INTEGER,
      amount REAL,
      method TEXT,
      reference TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);
  });
}

// ================= IPC =================
function setupIPC() {

  // PARTIES
  ipcMain.handle('get-parties', () => {
    return new Promise((resolve, reject) => {
      db.all(`SELECT * FROM parties`, [], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  });

  // ================= QUOTATIONS =================
  ipcMain.handle('get-quotations', () => {
    return new Promise((resolve, reject) => {
      db.all(`SELECT * FROM quotations ORDER BY created_at DESC`, [], (err, rows) => {
        if (err) reject(err);
        else {
          const mapped = rows.map(r => ({
            id: r.id,
            number: r.number,
            clientId: r.client_id,
            salesmanId: r.salesman_id,
            status: r.status,
            netTotal: r.net_total,
            updatedAt: r.updated_at || r.created_at
          }));
          resolve(mapped);
        }
      });
    });
  });

  ipcMain.handle('save-quotation', (_, q) => {
    return new Promise((resolve, reject) => {
      db.run(
        `INSERT INTO quotations (number, client_id, salesman_id, status, net_total, updated_at)
         VALUES (?, ?, ?, ?, ?, datetime('now'))`,
        [q.number, q.clientId, q.salesmanId, q.status, q.netTotal],
        function (err) {
          if (err) reject(err);
          else resolve({ id: this.lastID });
        }
      );
    });
  });

  // ================= INVOICES =================
  ipcMain.handle('get-invoices', () => {
    return new Promise((resolve, reject) => {
      db.all(`SELECT * FROM invoices`, [], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  });

  ipcMain.handle('save-invoice', (_, invoice) => {
    return new Promise((resolve, reject) => {
      db.run(
        `INSERT INTO invoices (party_id, invoice_no, total, status)
         VALUES (?, ?, ?, ?)`,
        [invoice.party_id, invoice.invoice_no, invoice.total, 'unpaid'],
        function (err) {
          if (err) reject(err);
          else resolve({ id: this.lastID });
        }
      );
    });
  });

  // ================= PAYMENTS =================
  ipcMain.handle('get-payments', () => {
    return new Promise((resolve, reject) => {
      db.all(`SELECT * FROM payments`, [], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  });

  ipcMain.handle('save-payment', (_, payment) => {
    return new Promise((resolve, reject) => {
      db.run(
        `INSERT INTO payments (party_id, amount, method, reference)
         VALUES (?, ?, ?, ?)`,
        [payment.party_id, payment.amount, payment.method, payment.reference],
        function (err) {
          if (err) reject(err);
          else resolve(true);
        }
      );
    });
  });

  // ================= SETTINGS =================
  ipcMain.handle('get-business-settings', () => Promise.resolve({ currency: 'INR' }));
  ipcMain.handle('save-business-settings', () => Promise.resolve(true));
  ipcMain.handle('get-db-path', () => {
  return path.join(app.getPath('userData'), 'Bit2book.db');
  });
    // Get DB Path
  ipcMain.handle('get-db-path', () => {
    return path.join(app.getPath('userData'), 'bookit.db');
  });

  // Open DB Folder
  ipcMain.handle('open-db-folder', () => {
    const dbPath = path.join(app.getPath('userData'), 'bookit.db');
    shell.showItemInFolder(dbPath);
    return true;
  });

  // Backup Database
  ipcMain.handle('backup-db', async () => {
    const dbPath = path.join(app.getPath('userData'), 'bookit.db');

    const result = await dialog.showSaveDialog(mainWindow, {
      title: 'Backup Database',
      defaultPath: 'bookit-backup.db',
      filters: [{ name: 'Database', extensions: ['db'] }]
    });

    if (result.canceled) return false;

    fs.copyFileSync(dbPath, result.filePath);
    return true;
  });

  // Restore Database
  ipcMain.handle('restore-db', async () => {
    const dbPath = path.join(app.getPath('userData'), 'bookit.db');

    const result = await dialog.showOpenDialog(mainWindow, {
      title: 'Restore Database',
      filters: [{ name: 'Database', extensions: ['db'] }],
      properties: ['openFile']
    });

    if (result.canceled) return false;

    fs.copyFileSync(result.filePaths[0], dbPath);
    return true;
  });

    // ================= DIALOG =================
    ipcMain.handle('show-save-dialog', (_, options) => dialog.showSaveDialog(mainWindow, options));
    ipcMain.handle('show-open-dialog', (_, options) => dialog.showOpenDialog(mainWindow, options));
    ipcMain.handle('get-db-path',()=> {
      return path.join(app.getPath('userData'),'Bit2book.db')
    });
  }

// ================= WINDOW =================
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
    },
  });

  // 🔥 IMPORTANT FOR DEBUG
  mainWindow.webContents.openDevTools();

  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:5173');
  } else {
    mainWindow.loadFile(path.join(__dirname, 'dist/index.html'));
  }
}

// ================= APP =================
app.whenReady().then(() => {
  initDatabase();
  setupIPC();
  createWindow();
});