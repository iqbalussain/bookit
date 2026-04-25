import React, { createContext, useContext, ReactNode } from 'react';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { useRemoteCollection } from '@/hooks/useRemoteCollection';
import type { Client, Quotation, Invoice, PurchaseInvoice, BusinessSettings, Payment, Account, JournalEntry, JournalLine, Company, Voucher, VoucherType, AuditEntry, Item, InvoiceStatus } from '@/types';
import { buildSalesInvoicePostingEntry, repostSalesInvoice as buildSalesInvoiceRepostEntries } from '@/lib/postingEngine';
import type { Salesman } from '@/types';
import { DEFAULT_ACCOUNTS } from '@/types';

interface AppContextType {
  // Clients
  clients: Client[];
  setClients: (clients: Client[] | ((prev: Client[]) => Client[])) => void;
  addClient: (client: Client) => void;
  updateClient: (client: Client) => void;
  deleteClient: (id: string) => void;
  getClient: (id: string) => Client | undefined;
  getCustomers: () => Client[];
  getVendors: () => Client[];
  
  // Quotations
  quotations: Quotation[];
  setQuotations: (quotations: Quotation[] | ((prev: Quotation[]) => Quotation[])) => void;
  addQuotation: (quotation: Quotation) => void;
  updateQuotation: (quotation: Quotation) => void;
  deleteQuotation: (id: string) => void;
  getQuotation: (id: string) => Quotation | undefined;
  
  // Invoices
  invoices: Invoice[];
  setInvoices: (invoices: Invoice[] | ((prev: Invoice[]) => Invoice[])) => void;
  addInvoice: (invoice: Invoice) => void;
  updateInvoice: (invoice: Invoice) => void;
  deleteInvoice: (id: string) => void;
  getInvoice: (id: string) => Invoice | undefined;

  // Purchase Invoices
  purchaseInvoices: PurchaseInvoice[];
  setPurchaseInvoices: (pi: PurchaseInvoice[] | ((prev: PurchaseInvoice[]) => PurchaseInvoice[])) => void;
  addPurchaseInvoice: (pi: PurchaseInvoice) => void;
  updatePurchaseInvoice: (pi: PurchaseInvoice) => void;
  deletePurchaseInvoice: (id: string) => void;
  getPurchaseInvoice: (id: string) => PurchaseInvoice | undefined;
  generatePurchaseInvoiceNumber: () => string;
  
  // Payments
  payments: Payment[];
  addPayment: (payment: Payment) => void;
  getPaymentsByInvoice: (invoiceId: string) => Payment[];
  getPaymentsByClient: (clientId: string) => Payment[];
  calculateInvoicePaymentStatus: (invoiceId: string) => Extract<InvoiceStatus, 'sent' | 'partial' | 'paid'>;

  // Accounts & Journal
  accounts: Account[];
  setAccounts: (accounts: Account[] | ((prev: Account[]) => Account[])) => void;
  addAccount: (account: Account) => void;
  deleteAccount: (id: string) => void;
  // Vouchers
  vouchers: Voucher[];
  addVoucher: (voucher: Voucher) => void;
  generateVoucherNumber: (type: string) => string;
  addJournalVoucher: (voucher: Voucher, lines: JournalLine[]) => void;

  // Items
  items: Item[];
  // Salesmen
  salesmen: Salesman[];
  addSalesman: (s: Salesman) => void;
  getSalesman: (id: string) => Salesman | undefined;
  addItem: (item: Item) => void;
  updateItem: (item: Item) => void;
  deleteItem: (id: string) => void;
  getItem: (id: string) => Item | undefined;
  adjustItemStock: (itemId: string, delta: number) => void;

  // Journal
  journalEntries: JournalEntry[];
  createJournalEntry: (entry: JournalEntry) => void;
  postJournalForReference: (entry: JournalEntry) => JournalEntry;
  reverseJournalForReference: (referenceType: JournalEntry['referenceType'], referenceId: string) => JournalEntry[];
  postSalesInvoice: (invoice: Invoice) => JournalEntry;
  repostSalesInvoice: (invoiceBefore: Invoice, invoiceAfter: Invoice) => JournalEntry[];
  getAccountBalance: (accountId: string) => number;
  
  // Company management
  companies: Company[];
  selectedCompanyId: string;
  setSelectedCompanyId: (companyId: string) => void;
  createCompany: (name: string) => void;
  updateCompany: (id: string, name: string) => void;
  deleteCompany: (id: string) => void;

  // Business Settings
  settings: BusinessSettings;
  setSettings: (settings: BusinessSettings | ((prev: BusinessSettings) => BusinessSettings)) => void;
  
  // Sync functionality
  syncToDatabase: () => Promise<void>;
  syncFromDatabase: () => Promise<void>;
  forceSync: () => Promise<void>;
  isElectron: boolean;
  
  // Audit & activity log
  auditLog: AuditEntry[];
  addAuditEntry: (entry: Omit<AuditEntry, 'id' | 'createdAt'>) => void;
  getRecentAuditLog: (limit?: number) => AuditEntry[];

  // Utility functions
  generateQuotationNumber: () => string;
  generateInvoiceNumber: () => string;
}

const defaultSettings: BusinessSettings = {
  name: '',
  email: '',
  phone: '',
  address: '',
  currency: 'INR',
  theme: 'system',
  vatEnabled: true,
  defaultVatPercentage: 5,
  bankName: '',
  bankAccountNumber: '',
};

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [companies, setCompanies] = useLocalStorage<Company[]>('app_companies', [{ id: 'default', name: 'Default Company' }]);
  const [selectedCompanyId, setSelectedCompanyId] = useLocalStorage<string>('app_selected_company_id', 'default');

  const companyKey = (key: string) => `app_${key}_${selectedCompanyId}`;

  // Shared collections sync with the LAN server when one is configured;
  // otherwise they fall back to localStorage.
  const [clients, setClients] = useRemoteCollection<Client>('clients', companyKey('clients'), []);
  const [quotations, setQuotations] = useRemoteCollection<Quotation>('quotations', companyKey('quotations'), []);
  const [invoices, setInvoices] = useRemoteCollection<Invoice>('invoices', companyKey('invoices'), []);
  const [purchaseInvoices, setPurchaseInvoices] = useRemoteCollection<PurchaseInvoice>('purchaseInvoices', companyKey('purchase_invoices'), []);
  const [payments, setPayments] = useRemoteCollection<Payment>('payments', companyKey('payments'), []);
  const [accounts, setAccounts] = useRemoteCollection<Account>('accounts', companyKey('accounts'), DEFAULT_ACCOUNTS);
  const [journalEntries, setJournalEntries] = useRemoteCollection<JournalEntry>('journalEntries', companyKey('journal_entries'), []);
  const [vouchers, setVouchers] = useRemoteCollection<Voucher>('vouchers', companyKey('vouchers'), []);
  const [items, setItems] = useRemoteCollection<Item>('items', companyKey('items'), []);
  const [salesmen, setSalesmen] = useRemoteCollection<Salesman>('salesmen', companyKey('salesmen'), []);
  const [settings, setSettings] = useLocalStorage<BusinessSettings>(companyKey('settings'), defaultSettings);
  const [auditLog, setAuditLog] = useLocalStorage<AuditEntry[]>(companyKey('audit_log'), []);

  const addAuditEntry = (entry: Omit<AuditEntry, 'id' | 'createdAt'>) => {
    const auditEntry: AuditEntry = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      createdAt: new Date().toISOString(),
      ...entry,
    };
    setAuditLog((prev) => [auditEntry, ...prev]);
  };

  const getRecentAuditLog = (limit = 10) => auditLog.slice(0, limit);

  // Client operations
  const addClient = (client: Client) => {
    setClients((prev) => [...prev, client]);
    addAuditEntry({
      type: 'client',
      action: 'created',
      target: client.name,
      details: `Created ${client.type}`,
    });
  };

  const updateClient = (client: Client) => {
    setClients((prev) => prev.map((c) => (c.id === client.id ? client : c)));
    addAuditEntry({
      type: 'client',
      action: 'updated',
      target: client.name,
      details: `Updated client profile`,
    });
  };

  const deleteClient = (id: string) => {
    const existing = clients.find((c) => c.id === id);
    // Guard: warn if open invoices exist for this client
    const openInvoices = invoices.filter(
      (i) => i.clientId === id && !['paid', 'cancelled'].includes(i.status)
    );
    if (openInvoices.length > 0) {
      throw new Error(
        `Cannot delete: this client has ${openInvoices.length} open invoice(s). Please settle or cancel them first.`
      );
    }
    setClients((prev) => prev.filter((c) => c.id !== id));
    if (existing) {
      addAuditEntry({
        type: 'client',
        action: 'deleted',
        target: existing.name,
        details: `Removed customer/vendor profile`,
      });
    }
  };
  const getClient = (id: string) => clients.find((c) => c.id === id);
  const getCustomers = () => clients.filter((c) => c.type === 'customer' || c.type === 'both');
  const getVendors = () => clients.filter((c) => c.type === 'vendor' || c.type === 'both');

  // Quotation operations
  const addQuotation = (quotation: Quotation) => {
    setQuotations((prev) => [...prev, quotation]);
    addAuditEntry({
      type: 'quotation',
      action: 'created',
      target: quotation.number,
      details: `Quotation saved for client ${quotation.clientId}`,
      value: quotation.netTotal,
    });
  };

  const updateQuotation = (quotation: Quotation) => {
    setQuotations((prev) => prev.map((q) => (q.id === quotation.id ? quotation : q)));
    addAuditEntry({
      type: 'quotation',
      action: 'updated',
      target: quotation.number,
      details: 'Quotation details updated',
      value: quotation.netTotal,
    });
  };

  const deleteQuotation = (id: string) => {
    const existing = quotations.find((q) => q.id === id);
    setQuotations((prev) => prev.filter((q) => q.id !== id));
    if (existing) {
      addAuditEntry({
        type: 'quotation',
        action: 'deleted',
        target: existing.number,
        details: 'Quotation removed',
      });
    }
  };
  const getQuotation = (id: string) => quotations.find((q) => q.id === id);

  // Invoice operations
  const addInvoice = (invoice: Invoice) => {
    setInvoices((prev) => [...prev, invoice]);
    addAuditEntry({
      type: 'invoice',
      action: 'created',
      target: invoice.number,
      details: `Sales invoice created for client ${invoice.clientId}`,
      value: invoice.netTotal,
    });
  };

  const updateInvoice = (invoice: Invoice) => {
    setInvoices((prev) => prev.map((i) => (i.id === invoice.id ? invoice : i)));
    addAuditEntry({
      type: 'invoice',
      action: 'updated',
      target: invoice.number,
      details: `Invoice status updated to ${invoice.status}`,
      value: invoice.netTotal,
    });
  };

  const deleteInvoice = (id: string) => {
    const existing = invoices.find((i) => i.id === id);
    setInvoices((prev) => prev.filter((i) => i.id !== id));
    if (existing) {
      addAuditEntry({
        type: 'invoice',
        action: 'deleted',
        target: existing.number,
        details: 'Sales invoice deleted',
      });
    }
  };
  const getInvoice = (id: string) => invoices.find((i) => i.id === id);

  // Purchase Invoice operations
  const addPurchaseInvoice = (pi: PurchaseInvoice) => {
    setPurchaseInvoices((prev) => [...prev, pi]);
    addAuditEntry({
      type: 'purchase_invoice',
      action: 'created',
      target: pi.number,
      details: `Purchase invoice created for vendor ${pi.vendorId}`,
      value: pi.netTotal,
    });
  };

  const updatePurchaseInvoice = (pi: PurchaseInvoice) => {
    setPurchaseInvoices((prev) => prev.map((p) => (p.id === pi.id ? pi : p)));
    addAuditEntry({
      type: 'purchase_invoice',
      action: 'updated',
      target: pi.number,
      details: `Purchase invoice status updated to ${pi.status}`,
      value: pi.netTotal,
    });
  };

  const deletePurchaseInvoice = (id: string) => {
    const existing = purchaseInvoices.find((p) => p.id === id);
    setPurchaseInvoices((prev) => prev.filter((p) => p.id !== id));
    if (existing) {
      addAuditEntry({
        type: 'purchase_invoice',
        action: 'deleted',
        target: existing.number,
        details: 'Purchase invoice deleted',
      });
    }
  };
  const getPurchaseInvoice = (id: string) => purchaseInvoices.find((p) => p.id === id);

  // Payment operations
  const addPayment = (payment: Payment) => {
    setPayments((prev) => [...prev, payment]);
    addAuditEntry({
      type: 'payment',
      action: 'processed',
      target: payment.reference || payment.invoiceId,
      details: `Payment recorded via ${payment.method}`,
      value: payment.amount,
    });
  };
  const getPaymentsByInvoice = (invoiceId: string) => payments.filter((p) => p.invoiceId === invoiceId);
  const getPaymentsByClient = (clientId: string) => {
    const clientInvoiceIds = invoices.filter((i) => i.clientId === clientId).map((i) => i.id);
    const clientPurchaseIds = purchaseInvoices.filter((p) => p.vendorId === clientId).map((p) => p.id);
    return payments.filter((p) => clientInvoiceIds.includes(p.invoiceId) || clientPurchaseIds.includes(p.invoiceId));
  };

  // Account operations
  const addAccount = (account: Account) => {
    setAccounts((prev) => [...prev, account]);
    addAuditEntry({
      type: 'account',
      action: 'created',
      target: account.name,
      details: 'Chart of accounts item added',
    });
  };
  const deleteAccount = (id: string) => setAccounts((prev) => prev.filter((a) => a.id !== id || a.isSystem));

  // Journal operations
  const createJournalEntry = (entry: JournalEntry) => {
    const totalDebit  = entry.lines.reduce((s, l) => s + l.debit,  0);
    const totalCredit = entry.lines.reduce((s, l) => s + l.credit, 0);
    if (Math.abs(totalDebit - totalCredit) > 0.001) {
      const diff = Math.abs(totalDebit - totalCredit).toFixed(2);
      throw new Error(
        `Journal entry is unbalanced by ${diff} (debits: ${totalDebit.toFixed(2)}, credits: ${totalCredit.toFixed(2)})`
      );
    }
    setJournalEntries((prev) => [...prev, entry]);
    addAuditEntry({
      type: 'account',
      action: 'created',
      target: entry.reference,
      details: `Journal entry recorded for ${entry.referenceType}`,
    });
  };


  const postJournalForReference = (entry: JournalEntry) => {
    const duplicate = entry.idempotencyKey
      ? journalEntries.find((existing) => existing.idempotencyKey === entry.idempotencyKey)
      : undefined;
    if (duplicate) {
      return duplicate;
    }
    createJournalEntry(entry);
    return entry;
  };

  const reverseJournalForReference = (
    referenceType: JournalEntry['referenceType'],
    referenceId: string,
  ): JournalEntry[] => {
    if (referenceType !== 'sales_invoice') return [];
    const existingForRef = journalEntries.filter(
      (entry) => entry.referenceType === referenceType && entry.referenceId === referenceId,
    );
    const baseInvoice = invoices.find((inv) => inv.id === referenceId);
    if (!baseInvoice || existingForRef.length === 0) {
      return [];
    }

    const reversals = buildSalesInvoiceRepostEntries(baseInvoice, baseInvoice, existingForRef)
      .filter((entry) => !!entry.reversalOf);

    return reversals.map((entry) => postJournalForReference(entry));
  };

  const postSalesInvoice = (invoice: Invoice): JournalEntry => {
    const postingEntry = buildSalesInvoicePostingEntry(invoice);
    return postJournalForReference(postingEntry);
  };

  const repostSalesInvoice = (invoiceBefore: Invoice, invoiceAfter: Invoice): JournalEntry[] => {
    const existingForRef = journalEntries.filter(
      (entry) => entry.referenceType === 'sales_invoice' && entry.referenceId === invoiceBefore.id,
    );
    const generatedEntries = buildSalesInvoiceRepostEntries(invoiceBefore, invoiceAfter, existingForRef);
    return generatedEntries.map((entry) => postJournalForReference(entry));
  };

  // Voucher operations
  const addVoucher = (voucher: Voucher) => {
    setVouchers((prev) => [...prev, voucher]);
    addAuditEntry({
      type: 'voucher',
      action: 'created',
      target: voucher.number,
      details: `Voucher created for ${voucher.partyName}`,
      value: voucher.amount,
    });
  };
  const generateVoucherNumber = (type: string) => {
    const prefix = type.toUpperCase().replace(/_/g, '-');
    const year = new Date().getFullYear();
    const count = vouchers.filter((v) => v.type === type).length + 1;
    return `${prefix}-${year}-${count.toString().padStart(3, '0')}`;
  };

  const addJournalVoucher = (voucher: Voucher, lines: JournalLine[]) => {
    setVouchers((prev) => [...prev, voucher]);
    const totalDebit = lines.reduce((s, l) => s + l.debit, 0);
    const totalCredit = lines.reduce((s, l) => s + l.credit, 0);
    if (Math.abs(totalDebit - totalCredit) > 0.001) {
      throw new Error(`Journal voucher unbalanced (Dr ${totalDebit.toFixed(2)} vs Cr ${totalCredit.toFixed(2)})`);
    }
    setJournalEntries((prev) => [...prev, {
      id: crypto.randomUUID(),
      date: voucher.date,
      reference: voucher.number,
      referenceType: 'journal',
      referenceId: voucher.id,
      description: voucher.narration || `Journal Voucher ${voucher.number}`,
      lines,
      createdAt: new Date().toISOString(),
    }]);
    addAuditEntry({
      type: 'voucher', action: 'created', target: voucher.number,
      details: 'Journal voucher posted', value: voucher.amount,
    });
  };

  // Item operations
  const addItem = (item: Item) => {
    setItems((prev) => [...prev, item]);
  };
  const addSalesman = (s: Salesman) => {
    setSalesmen((prev) => [...prev, s]);
  };
  const getSalesman = (id: string) => salesmen.find((s) => s.id === id);
  const updateItem = (item: Item) => {
    setItems((prev) => prev.map((i) => (i.id === item.id ? item : i)));
  };
  const deleteItem = (id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
  };
  const getItem = (id: string) => items.find((i) => i.id === id);
  const adjustItemStock = (itemId: string, delta: number) => {
    setItems((prev) => prev.map((i) => (i.id === itemId ? { ...i, stock: i.stock + delta } : i)));
  };
  
  const getAccountBalance = (accountId: string) => {
    let balance = 0;
    journalEntries.forEach((entry) => {
      entry.lines.forEach((line) => {
        if (line.accountId === accountId) {
          balance += line.debit - line.credit;
        }
      });
    });
    return balance;
  };

  // Company operations
  const createCompany = (name: string) => {
    const id = (Math.random() * 1e9).toFixed(0);
    const newCompany: Company = { id, name };
    setCompanies((prev) => [...prev, newCompany]);
    setSelectedCompanyId(id);
  };

  const updateCompany = (id: string, name: string) => {
    setCompanies((prev) => prev.map((company) => (company.id === id ? { ...company, name } : company)));
  };

  const deleteCompany = (id: string) => {
    setCompanies((prev) => {
      const updated = prev.filter((company) => company.id !== id);
      if (id === selectedCompanyId) {
        const fallback = updated[0] ?? { id: 'default', name: 'Default Company' };
        setSelectedCompanyId(fallback.id);
      }
      return updated;
    });

    try {
      const keys = ['clients', 'quotations', 'invoices', 'purchase_invoices', 'payments', 'accounts', 'journal_entries', 'settings', 'vouchers', 'items', 'audit_log'];
      keys.forEach(k => window.localStorage.removeItem(`app_${k}_${id}`));
    } catch (error) {
      console.warn('Failed to remove company data', error);
    }
  };

  // Generate unique numbers
  const generateQuotationNumber = () => {
    const year = new Date().getFullYear();
    const prefix = `QT-${year}-`;
    const existing = new Set(quotations.map((q) => q.number));
    let count = quotations.filter((q) => q.number.startsWith(prefix)).length + 1;
    let candidate = `${prefix}${count.toString().padStart(3, '0')}`;
    while (existing.has(candidate)) {
      count++;
      candidate = `${prefix}${count.toString().padStart(3, '0')}`;
    }
    return candidate;
  };

  const generateInvoiceNumber = () => {
    const year = new Date().getFullYear();
    const prefix = `INV-${year}-`;
    const existing = new Set(invoices.map((i) => i.number));
    let count = invoices.filter((i) => i.number.startsWith(prefix)).length + 1;
    let candidate = `${prefix}${count.toString().padStart(3, '0')}`;
    while (existing.has(candidate)) {
      count++;
      candidate = `${prefix}${count.toString().padStart(3, '0')}`;
    }
    return candidate;
  };

  const generatePurchaseInvoiceNumber = () => {
    const year = new Date().getFullYear();
    const prefix = `PI-${year}-`;
    const existing = new Set(purchaseInvoices.map((p) => p.number));
    let count = purchaseInvoices.filter((p) => p.number.startsWith(prefix)).length + 1;
    let candidate = `${prefix}${count.toString().padStart(3, '0')}`;
    while (existing.has(candidate)) {
      count++;
      candidate = `${prefix}${count.toString().padStart(3, '0')}`;
    }
    return candidate;
  };

  // Helper function to calculate invoice payment status based on payment records
  const calculateInvoicePaymentStatus = (invoiceId: string): Extract<InvoiceStatus, 'sent' | 'partial' | 'paid'> => {
    const invoicePayments = getPaymentsByInvoice(invoiceId);
    const invoice = invoices.find((i) => i.id === invoiceId);
    
    if (!invoice) return 'sent';
    
    const totalPaid = invoicePayments.reduce((sum, payment) => sum + payment.amount, 0);
    const invoiceTotal = invoice.netTotal;
    
    if (totalPaid === 0) {
      return 'sent';
    } else if (totalPaid < invoiceTotal) {
      return 'partial';
    } else {
      return 'paid';
    }
  };

  // Sync functionality
  const isElectron = typeof window !== 'undefined' && !!window.electronAPI;

  const syncToDatabase = async () => {
    if (!isElectron) {
      throw new Error('Sync is only available in the desktop app');
    }

    try {
      // Sync clients
      for (const client of clients) {
        await window.electronAPI!.query(
          `INSERT OR REPLACE INTO parties (id, type, name, email, phone, address, tax_number, payment_terms, credit_limit, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [client.id, client.type, client.name, client.email, client.phone, client.address, client.taxRegistrationNumber, client.paymentTermsDays, client.creditLimit, client.createdAt]
        );
      }

      // Sync quotations
      for (const quotation of quotations) {
        await window.electronAPI!.query(
          `INSERT OR REPLACE INTO quotations (id, number, client_id, salesman_id, net_total, vat_amount, total, status, converted_invoice_id, notes, terms, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [quotation.id, quotation.number, quotation.clientId, quotation.salesmanId || null, quotation.netTotal, 0, quotation.netTotal, quotation.status, quotation.convertedInvoiceId, quotation.notes, quotation.terms, quotation.createdAt, quotation.updatedAt]
        );
      }

      // Sync invoices
      for (const invoice of invoices) {
        await window.electronAPI!.query(
          `INSERT OR REPLACE INTO invoices (id, number, client_id, salesman_id, quotation_id, net_total, vat_amount, total, status, due_date, notes, terms, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [invoice.id, invoice.number, invoice.clientId, (invoice as any).salesmanId || null, invoice.quotationId, invoice.netTotal, 0, invoice.netTotal, invoice.status, invoice.dueDate, invoice.notes, invoice.terms, invoice.createdAt, invoice.updatedAt]
        );
      }

      // Sync purchase invoices
      for (const pi of purchaseInvoices) {
        await window.electronAPI!.query(
          `INSERT OR REPLACE INTO purchase_invoices (id, number, vendor_id, net_total, vat_amount, total, status, due_date, notes, terms, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [pi.id, pi.number, pi.vendorId, pi.netTotal, 0, pi.netTotal, pi.status, pi.dueDate, pi.notes, pi.terms, pi.createdAt, pi.updatedAt]
        );
      }

      // Sync payments
      for (const payment of payments) {
        await window.electronAPI!.query(
          `INSERT OR REPLACE INTO payments (id, invoice_id, invoice_type, amount, date, method, reference, notes, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [payment.id, payment.invoiceId, payment.invoiceType, payment.amount, payment.date, payment.method, payment.reference, payment.notes, payment.createdAt]
        );
      }

      // Sync salesmen
      for (const s of salesmen) {
        await window.electronAPI!.query(
          `INSERT OR REPLACE INTO salesmen (id, name, phone, created_at) VALUES (?, ?, ?, ?)`,
          [s.id, s.name, s.phone || null, s.createdAt]
        );
      }

      // Sync business settings
      await window.electronAPI!.query(
        `INSERT OR REPLACE INTO business_settings (id, name, email, phone, address, logo, currency, tax_number)
         VALUES (1, ?, ?, ?, ?, ?, ?, ?)`,
        [settings.name, settings.email, settings.phone, settings.address, settings.logo, settings.currency, settings.taxNumber]
      );

    } catch (error) {
      console.error('Sync to database failed:', error);
      throw error;
    }
  };

  const syncFromDatabase = async () => {
    if (!isElectron) {
      throw new Error('Sync is only available in the desktop app');
    }

    try {
      // Sync clients from database
      const dbClients = await window.electronAPI!.getParties();
      if (dbClients && dbClients.length > 0) {
        const formattedClients: Client[] = dbClients.map((c: any) => ({
          id: c.id,
          name: c.name,
          email: c.email,
          phone: c.phone,
          address: c.address,
          type: c.type,
          paymentTermsDays: c.payment_terms,
          taxRegistrationNumber: c.tax_number,
          creditLimit: c.credit_limit,
          createdAt: c.created_at,
        }));
        setClients(formattedClients);
      }

      // Sync quotations from database
      const dbQuotations = await window.electronAPI!.getQuotations();
      if (dbQuotations && dbQuotations.length > 0) {
        const formattedQuotations: Quotation[] = dbQuotations.map((q: any) => ({
          id: q.id,
          number: q.number,
          clientId: q.client_id,
          salesmanId: q.salesman_id,
          items: [], // Would need to sync line items separately
          netTotal: q.net_total,
          vatAmount: q.vat_amount || 0,
          total: q.total || q.net_total,
          status: q.status,
          convertedInvoiceId: q.converted_invoice_id,
          notes: q.notes,
          terms: q.terms,
          createdAt: q.created_at,
          updatedAt: q.updated_at,
        }));
        setQuotations(formattedQuotations);
      }

      // Sync invoices from database
      const dbInvoices = await window.electronAPI!.getInvoices();
      if (dbInvoices && dbInvoices.length > 0) {
        const formattedInvoices: Invoice[] = dbInvoices.map((i: any) => ({
          id: i.id,
          number: i.number,
          clientId: i.client_id,
          salesmanId: i.salesman_id,
          quotationId: i.quotation_id,
          items: [], // Would need to sync line items separately
          netTotal: i.net_total,
          vatAmount: i.vat_amount || 0,
          total: i.total || i.net_total,
          status: i.status,
          dueDate: i.due_date,
          notes: i.notes,
          terms: i.terms,
          createdAt: i.created_at,
          updatedAt: i.updated_at,
        }));
        setInvoices(formattedInvoices);
      }

      // Sync purchase invoices from database
      const dbPurchaseInvoices = await window.electronAPI!.getPurchaseInvoices();
      if (dbPurchaseInvoices && dbPurchaseInvoices.length > 0) {
        const formattedPurchaseInvoices: PurchaseInvoice[] = dbPurchaseInvoices.map((p: any) => ({
          id: p.id,
          number: p.number,
          vendorId: p.vendor_id,
          items: [], // Would need to sync line items separately
          netTotal: p.net_total,
          vatAmount: p.vat_amount || 0,
          total: p.total || p.net_total,
          status: p.status,
          dueDate: p.due_date,
          notes: p.notes,
          terms: p.terms,
          createdAt: p.created_at,
          updatedAt: p.updated_at,
        }));
        setPurchaseInvoices(formattedPurchaseInvoices);
      }

      // Sync payments from database
      const dbPayments = await window.electronAPI!.getPayments();
      if (dbPayments && dbPayments.length > 0) {
        const formattedPayments: Payment[] = dbPayments.map((p: any) => ({
          id: p.id,
          invoiceId: p.invoice_id,
          invoiceType: p.invoice_type,
          amount: p.amount,
          date: p.date,
          method: p.method,
          reference: p.reference,
          notes: p.notes,
          createdAt: p.created_at,
        }));
        // Note: This will replace all payments, might want to merge instead
        // For now, we'll set them directly
      }

      // Sync business settings from database
      const dbSettings = (await window.electronAPI!.getBusinessSettings()) as Record<string, any> | null;
      if (dbSettings) {
        setSettings({
          name: dbSettings.name || '',
          email: dbSettings.email || '',
          phone: dbSettings.phone || '',
          address: dbSettings.address || '',
          logo: dbSettings.logo,
          currency: dbSettings.currency || 'INR',
          taxNumber: dbSettings.tax_number,
          defaultVatPercentage: settings.defaultVatPercentage ?? 18,
          vatEnabled: settings.vatEnabled,
          bankName: settings.bankName,
          bankAccountNumber: settings.bankAccountNumber,
          theme: settings.theme,
        });
      }

    } catch (error) {
      console.error('Sync from database failed:', error);
      throw error;
    }
  };

  const forceSync = async () => {
    try {
      // First sync from database to get latest data
      await syncFromDatabase();
      // Then sync local changes back to database
      await syncToDatabase();
    } catch (error) {
      console.error('Force sync failed:', error);
      throw error;
    }
  };

  return (
    <AppContext.Provider
      value={{
        companies, selectedCompanyId, setSelectedCompanyId, createCompany, updateCompany, deleteCompany,
        clients, setClients, addClient, updateClient, deleteClient, getClient, getCustomers, getVendors,
        quotations, setQuotations, addQuotation, updateQuotation, deleteQuotation, getQuotation,
        invoices, setInvoices, addInvoice, updateInvoice, deleteInvoice, getInvoice,
        purchaseInvoices, setPurchaseInvoices, addPurchaseInvoice, updatePurchaseInvoice, deletePurchaseInvoice, getPurchaseInvoice, generatePurchaseInvoiceNumber,
        payments, addPayment, getPaymentsByInvoice, getPaymentsByClient, calculateInvoicePaymentStatus,
        accounts, setAccounts, addAccount, deleteAccount,
        journalEntries, createJournalEntry, postJournalForReference, reverseJournalForReference, postSalesInvoice, repostSalesInvoice, getAccountBalance,
        vouchers, addVoucher, generateVoucherNumber,
        addJournalVoucher,
        items, addItem, updateItem, deleteItem, getItem, adjustItemStock,
        salesmen, addSalesman, getSalesman,
        settings, setSettings,
        syncToDatabase, syncFromDatabase, forceSync, isElectron,
        auditLog, addAuditEntry, getRecentAuditLog,
        generateQuotationNumber, generateInvoiceNumber,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}
