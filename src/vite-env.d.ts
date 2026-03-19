/// <reference types="vite/client" />

interface ElectronAPI {
  query: (sql: string, params?: any[]) => Promise<any[]>;
  getParties: () => Promise<any[]>;
  saveInvoice: (invoice: any) => Promise<{ id: string }>;
  getInvoices: () => Promise<any[]>;
  saveQuotation: (quotation: any) => Promise<{ id: string }>;
  getQuotations: () => Promise<any[]>;
  savePurchaseInvoice: (purchaseInvoice: any) => Promise<{ id: string }>;
  getPurchaseInvoices: () => Promise<any[]>;
  savePayment: (payment: any) => Promise<{ id: string }>;
  getPayments: () => Promise<any[]>;
  getAccounts: () => Promise<any[]>;
  saveAccount: (account: any) => Promise<{ id: string }>;
  getBusinessSettings: () => Promise<any>;
  saveBusinessSettings: (settings: any) => Promise<void>;
  showSaveDialog: (options: any) => Promise<any>;
  showOpenDialog: (options: any) => Promise<any>;
  getDbPath: () => Promise<string>;
  backup: (destinationPath: string) => Promise<void>;
  restore: (backupPath: string) => Promise<void>;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
