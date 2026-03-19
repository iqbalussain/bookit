const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

// Database file location - single file users can backup
const dbPath = path.join(app.getPath('userData'), 'invoiceflow.db');
const db = new sqlite3.Database(dbPath);

// Create your tables based on your current schema
db.serialize(() => {
  // Parties (Customers & Vendors)
  db.run(`CREATE TABLE IF NOT EXISTS parties (
    id TEXT PRIMARY KEY,
    type TEXT,
    name TEXT,
    email TEXT,
    phone TEXT,
    address TEXT,
    tax_number TEXT,
    payment_terms INTEGER,
    credit_limit REAL,
    created_at TEXT
  )`);

  // Line items
  db.run(`CREATE TABLE IF NOT EXISTS line_items (
    id TEXT PRIMARY KEY,
    name TEXT,
    description TEXT,
    quantity REAL,
    rate REAL,
    total REAL
  )`);

  // Quotations
  db.run(`CREATE TABLE IF NOT EXISTS quotations (
    id TEXT PRIMARY KEY,
    number TEXT,
    client_id TEXT,
    net_total REAL,
    status TEXT,
    converted_invoice_id TEXT,
    notes TEXT,
    terms TEXT,
    created_at TEXT,
    updated_at TEXT,
    FOREIGN KEY(client_id) REFERENCES parties(id)
  )`);

  // Quotation line items
  db.run(`CREATE TABLE IF NOT EXISTS quotation_line_items (
    quotation_id TEXT,
    line_item_id TEXT,
    FOREIGN KEY(quotation_id) REFERENCES quotations(id),
    FOREIGN KEY(line_item_id) REFERENCES line_items(id)
  )`);

  // Invoices (sales)
  db.run(`CREATE TABLE IF NOT EXISTS invoices (
    id TEXT PRIMARY KEY,
    number TEXT,
    client_id TEXT,
    quotation_id TEXT,
    net_total REAL,
    status TEXT,
    due_date TEXT,
    notes TEXT,
    terms TEXT,
    created_at TEXT,
    updated_at TEXT,
    FOREIGN KEY(client_id) REFERENCES parties(id),
    FOREIGN KEY(quotation_id) REFERENCES quotations(id)
  )`);

  // Invoice line items
  db.run(`CREATE TABLE IF NOT EXISTS invoice_line_items (
    invoice_id TEXT,
    line_item_id TEXT,
    FOREIGN KEY(invoice_id) REFERENCES invoices(id),
    FOREIGN KEY(line_item_id) REFERENCES line_items(id)
  )`);

  // Purchase Invoices
  db.run(`CREATE TABLE IF NOT EXISTS purchase_invoices (
    id TEXT PRIMARY KEY,
    number TEXT,
    vendor_id TEXT,
    net_total REAL,
    status TEXT,
    due_date TEXT,
    notes TEXT,
    terms TEXT,
    created_at TEXT,
    updated_at TEXT,
    FOREIGN KEY(vendor_id) REFERENCES parties(id)
  )`);

  // Purchase invoice line items
  db.run(`CREATE TABLE IF NOT EXISTS purchase_invoice_line_items (
    purchase_invoice_id TEXT,
    line_item_id TEXT,
    FOREIGN KEY(purchase_invoice_id) REFERENCES purchase_invoices(id),
    FOREIGN KEY(line_item_id) REFERENCES line_items(id)
  )`);

  // Payments
  db.run(`CREATE TABLE IF NOT EXISTS payments (
    id TEXT PRIMARY KEY,
    invoice_id TEXT,
    invoice_type TEXT,
    amount REAL,
    date TEXT,
    method TEXT,
    reference TEXT,
    notes TEXT,
    created_at TEXT
  )`);

  // Chart of Accounts
  db.run(`CREATE TABLE IF NOT EXISTS accounts (
    id TEXT PRIMARY KEY,
    code TEXT,
    name TEXT,
    type TEXT,
    parent_id TEXT,
    is_system INTEGER
  )`);

  // Journal Entries
  db.run(`CREATE TABLE IF NOT EXISTS journal_entries (
    id TEXT PRIMARY KEY,
    date TEXT,
    reference TEXT,
    reference_type TEXT,
    reference_id TEXT,
    description TEXT,
    created_at TEXT
  )`);

  // Journal Lines
  db.run(`CREATE TABLE IF NOT EXISTS journal_lines (
    journal_entry_id TEXT,
    account_id TEXT,
    debit REAL,
    credit REAL,
    description TEXT,
    FOREIGN KEY(journal_entry_id) REFERENCES journal_entries(id),
    FOREIGN KEY(account_id) REFERENCES accounts(id)
  )`);

  // Business Settings
  db.run(`CREATE TABLE IF NOT EXISTS business_settings (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    name TEXT,
    email TEXT,
    phone TEXT,
    address TEXT,
    logo TEXT,
    currency TEXT,
    tax_number TEXT
  )`);

  // Insert default accounts if they don't exist
  db.get("SELECT COUNT(*) as count FROM accounts", (err, row) => {
    if (!err && row.count === 0) {
      const defaultAccounts = [
        { id: 'acc-1000', code: '1000', name: 'Cash', type: 'asset', is_system: 1 },
        { id: 'acc-1010', code: '1010', name: 'Bank', type: 'asset', is_system: 1 },
        { id: 'acc-1100', code: '1100', name: 'Accounts Receivable', type: 'asset', is_system: 1 },
        { id: 'acc-2000', code: '2000', name: 'Accounts Payable', type: 'liability', is_system: 1 },
        { id: 'acc-3000', code: '3000', name: "Owner's Equity", type: 'equity', is_system: 1 },
        { id: 'acc-3100', code: '3100', name: 'Retained Earnings', type: 'equity', is_system: 1 },
        { id: 'acc-4000', code: '4000', name: 'Sales Revenue', type: 'income', is_system: 1 },
        { id: 'acc-5000', code: '5000', name: 'General Expenses', type: 'expense', is_system: 1 },
        { id: 'acc-5100', code: '5100', name: 'Cost of Goods', type: 'expense', is_system: 1 },
      ];

      const stmt = db.prepare("INSERT INTO accounts (id, code, name, type, is_system) VALUES (?, ?, ?, ?, ?)");
      defaultAccounts.forEach(account => {
        stmt.run(account.id, account.code, account.name, account.type, account.is_system);
      });
      stmt.finalize();
    }
  });
});

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  // Load the app
  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, 'dist/index.html'));
  }
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// IPC handlers for database operations
ipcMain.handle('db-query', async (event, sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) {
        reject(err);
      } else {
        resolve(rows);
      }
    });
  });
});

ipcMain.handle('get-parties', async () => {
  return new Promise((resolve, reject) => {
    db.all('SELECT * FROM parties', (err, rows) => {
      if (err) {
        reject(err);
      } else {
        resolve(rows);
      }
    });
  });
});

ipcMain.handle('save-invoice', async (event, invoice) => {
  return new Promise((resolve, reject) => {
    const { id, number, client_id, quotation_id, net_total, status, due_date, notes, terms, created_at, updated_at } = invoice;
    db.run(
      `INSERT OR REPLACE INTO invoices (id, number, client_id, quotation_id, net_total, status, due_date, notes, terms, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, number, client_id, quotation_id, net_total, status, due_date, notes, terms, created_at, updated_at],
      function(err) {
        if (err) {
          reject(err);
        } else {
          resolve({ id: id || this.lastID });
        }
      }
    );
  });
});

ipcMain.handle('get-invoices', async () => {
  return new Promise((resolve, reject) => {
    db.all('SELECT * FROM invoices', (err, rows) => {
      if (err) {
        reject(err);
      } else {
        resolve(rows);
      }
    });
  });
});

ipcMain.handle('save-quotation', async (event, quotation) => {
  return new Promise((resolve, reject) => {
    const { id, number, client_id, net_total, status, converted_invoice_id, notes, terms, created_at, updated_at } = quotation;
    db.run(
      `INSERT OR REPLACE INTO quotations (id, number, client_id, net_total, status, converted_invoice_id, notes, terms, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, number, client_id, net_total, status, converted_invoice_id, notes, terms, created_at, updated_at],
      function(err) {
        if (err) {
          reject(err);
        } else {
          resolve({ id: id || this.lastID });
        }
      }
    );
  });
});

ipcMain.handle('get-quotations', async () => {
  return new Promise((resolve, reject) => {
    db.all('SELECT * FROM quotations', (err, rows) => {
      if (err) {
        reject(err);
      } else {
        resolve(rows);
      }
    });
  });
});

ipcMain.handle('save-purchase-invoice', async (event, purchaseInvoice) => {
  return new Promise((resolve, reject) => {
    const { id, number, vendor_id, net_total, status, due_date, notes, terms, created_at, updated_at } = purchaseInvoice;
    db.run(
      `INSERT OR REPLACE INTO purchase_invoices (id, number, vendor_id, net_total, status, due_date, notes, terms, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, number, vendor_id, net_total, status, due_date, notes, terms, created_at, updated_at],
      function(err) {
        if (err) {
          reject(err);
        } else {
          resolve({ id: id || this.lastID });
        }
      }
    );
  });
});

ipcMain.handle('get-purchase-invoices', async () => {
  return new Promise((resolve, reject) => {
    db.all('SELECT * FROM purchase_invoices', (err, rows) => {
      if (err) {
        reject(err);
      } else {
        resolve(rows);
      }
    });
  });
});

ipcMain.handle('save-payment', async (event, payment) => {
  return new Promise((resolve, reject) => {
    const { id, invoice_id, invoice_type, amount, date, method, reference, notes, created_at } = payment;
    db.run(
      `INSERT OR REPLACE INTO payments (id, invoice_id, invoice_type, amount, date, method, reference, notes, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, invoice_id, invoice_type, amount, date, method, reference, notes, created_at],
      function(err) {
        if (err) {
          reject(err);
        } else {
          resolve({ id: id || this.lastID });
        }
      }
    );
  });
});

ipcMain.handle('get-payments', async () => {
  return new Promise((resolve, reject) => {
    db.all('SELECT * FROM payments', (err, rows) => {
      if (err) {
        reject(err);
      } else {
        resolve(rows);
      }
    });
  });
});

ipcMain.handle('get-accounts', async () => {
  return new Promise((resolve, reject) => {
    db.all('SELECT * FROM accounts', (err, rows) => {
      if (err) {
        reject(err);
      } else {
        resolve(rows);
      }
    });
  });
});

ipcMain.handle('save-account', async (event, account) => {
  return new Promise((resolve, reject) => {
    const { id, code, name, type, parent_id, is_system } = account;
    db.run(
      `INSERT OR REPLACE INTO accounts (id, code, name, type, parent_id, is_system)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [id, code, name, type, parent_id, is_system],
      function(err) {
        if (err) {
          reject(err);
        } else {
          resolve({ id: id || this.lastID });
        }
      }
    );
  });
});

ipcMain.handle('get-business-settings', async () => {
  return new Promise((resolve, reject) => {
    db.get('SELECT * FROM business_settings WHERE id = 1', (err, row) => {
      if (err) {
        reject(err);
      } else {
        resolve(row);
      }
    });
  });
});

ipcMain.handle('save-business-settings', async (event, settings) => {
  return new Promise((resolve, reject) => {
    const { name, email, phone, address, logo, currency, tax_number } = settings;
    db.run(
      `INSERT OR REPLACE INTO business_settings (id, name, email, phone, address, logo, currency, tax_number)
       VALUES (1, ?, ?, ?, ?, ?, ?, ?)`,
      [name, email, phone, address, logo, currency, tax_number],
      function(err) {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      }
    );
  });
});

// Dialog handlers
ipcMain.handle('show-save-dialog', async (event, options) => {
  return dialog.showSaveDialog(mainWindow, options);
});

ipcMain.handle('get-db-path', () => {
  return dbPath;
});

// Backup/Restore handlers
ipcMain.handle('backup-db', async (event, destinationPath) => {
  const fs = require('fs');
  return new Promise((resolve, reject) => {
    fs.copyFile(dbPath, destinationPath, (err) => {
      if (err) {
        reject(err);
      } else {
        resolve();
      }
    });
  });
});

ipcMain.handle('restore-db', async (event, backupPath) => {
  const fs = require('fs');
  return new Promise((resolve, reject) => {
    fs.copyFile(backupPath, dbPath, (err) => {
      if (err) {
        reject(err);
      } else {
        resolve();
      }
    });
  });
});