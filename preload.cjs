const { contextBridge, ipcRenderer } = require('electron');

const invoke = (channel, ...args) => ipcRenderer.invoke(channel, ...args);

contextBridge.exposeInMainWorld('electronAPI', {
  query: (sql, params) => invoke('db-query', sql, params),

  getParties: () => invoke('get-parties'),

  saveInvoice: (invoice) => invoke('save-invoice', invoice),
  getInvoices: () => invoke('get-invoices'),

  saveQuotation: (quotation) => invoke('save-quotation', quotation),
  getQuotations: () => invoke('get-quotations'),

  savePurchaseInvoice: (purchaseInvoice) => invoke('save-purchase-invoice', purchaseInvoice),
  getPurchaseInvoices: () => invoke('get-purchase-invoices'),

  savePayment: (payment) => invoke('save-payment', payment),
  getPayments: () => invoke('get-payments'),

  getAccounts: () => invoke('get-accounts'),
  saveAccount: (account) => invoke('save-account', account),

  getBusinessSettings: () => invoke('get-business-settings'),
  saveBusinessSettings: (settings) => invoke('save-business-settings', settings),

  showSaveDialog: (options) => invoke('show-save-dialog', options),
  showOpenDialog: (options) => invoke('show-open-dialog', options),

  getDbPath: () => invoke('get-db-path'),
  backup: (destinationPath) => invoke('backup-db', destinationPath),
  restore: (backupPath) => invoke('restore-db', backupPath),
  openDbFolder: () => invoke('open-db-folder'),

  logRendererError: (payload) => invoke('renderer-error-log', payload),

  diagnostics: {
    getInfo: () => invoke('get-diagnostic-info'),
    getLogs: () => invoke('get-diagnostic-logs'),
    export: () => invoke('export-diagnostics'),
    openLogsFolder: () => invoke('open-logs-folder'),
  },

  update: {
    getVersion: () => invoke('update-get-version'),
    checkForUpdates: () => invoke('update-check-for-updates'),
    downloadUpdate: () => Promise.resolve(null),
    installUpdate: () => Promise.resolve(null),
    onUpdateAvailable: () => undefined,
    onUpdateProgress: () => undefined,
    onUpdateReady: () => undefined,
    onUpdateError: () => undefined,
  },
});

contextBridge.exposeInMainWorld('electron', {
  ipcRenderer: {
    invoke: (channel, ...args) => invoke(channel, ...args),
  },
});
