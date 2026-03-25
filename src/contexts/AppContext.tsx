import React, { createContext, useContext, ReactNode } from 'react';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import type { Client, Quotation, Invoice, PurchaseInvoice, BusinessSettings, Payment, Account, JournalEntry, JournalLine, Company, Voucher, VoucherType } from '@/types';
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

  // Accounts & Journal
  accounts: Account[];
  setAccounts: (accounts: Account[] | ((prev: Account[]) => Account[])) => void;
  addAccount: (account: Account) => void;
  deleteAccount: (id: string) => void;
  // Vouchers
  vouchers: Voucher[];
  addVoucher: (voucher: Voucher) => void;
  generateVoucherNumber: (type: string) => string;

  // Journal
  journalEntries: JournalEntry[];
  createJournalEntry: (entry: JournalEntry) => void;
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
};

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [companies, setCompanies] = useLocalStorage<Company[]>('app_companies', [{ id: 'default', name: 'Default Company' }]);
  const [selectedCompanyId, setSelectedCompanyId] = useLocalStorage<string>('app_selected_company_id', 'default');

  const companyKey = (key: string) => `app_${key}_${selectedCompanyId}`;

  const [clients, setClients] = useLocalStorage<Client[]>(companyKey('clients'), []);
  const [quotations, setQuotations] = useLocalStorage<Quotation[]>(companyKey('quotations'), []);
  const [invoices, setInvoices] = useLocalStorage<Invoice[]>(companyKey('invoices'), []);
  const [purchaseInvoices, setPurchaseInvoices] = useLocalStorage<PurchaseInvoice[]>(companyKey('purchase_invoices'), []);
  const [payments, setPayments] = useLocalStorage<Payment[]>(companyKey('payments'), []);
  const [accounts, setAccounts] = useLocalStorage<Account[]>(companyKey('accounts'), DEFAULT_ACCOUNTS);
  const [journalEntries, setJournalEntries] = useLocalStorage<JournalEntry[]>(companyKey('journal_entries'), []);
  const [vouchers, setVouchers] = useLocalStorage<Voucher[]>(companyKey('vouchers'), []);
  const [settings, setSettings] = useLocalStorage<BusinessSettings>(companyKey('settings'), defaultSettings);

  // Client operations
  const addClient = (client: Client) => setClients((prev) => [...prev, client]);
  const updateClient = (client: Client) => setClients((prev) => prev.map((c) => (c.id === client.id ? client : c)));
  const deleteClient = (id: string) => setClients((prev) => prev.filter((c) => c.id !== id));
  const getClient = (id: string) => clients.find((c) => c.id === id);
  const getCustomers = () => clients.filter((c) => c.type === 'customer' || c.type === 'both');
  const getVendors = () => clients.filter((c) => c.type === 'vendor' || c.type === 'both');

  // Quotation operations
  const addQuotation = (quotation: Quotation) => setQuotations((prev) => [...prev, quotation]);
  const updateQuotation = (quotation: Quotation) => setQuotations((prev) => prev.map((q) => (q.id === quotation.id ? quotation : q)));
  const deleteQuotation = (id: string) => setQuotations((prev) => prev.filter((q) => q.id !== id));
  const getQuotation = (id: string) => quotations.find((q) => q.id === id);

  // Invoice operations
  const addInvoice = (invoice: Invoice) => setInvoices((prev) => [...prev, invoice]);
  const updateInvoice = (invoice: Invoice) => setInvoices((prev) => prev.map((i) => (i.id === invoice.id ? invoice : i)));
  const deleteInvoice = (id: string) => setInvoices((prev) => prev.filter((i) => i.id !== id));
  const getInvoice = (id: string) => invoices.find((i) => i.id === id);

  // Purchase Invoice operations
  const addPurchaseInvoice = (pi: PurchaseInvoice) => setPurchaseInvoices((prev) => [...prev, pi]);
  const updatePurchaseInvoice = (pi: PurchaseInvoice) => setPurchaseInvoices((prev) => prev.map((p) => (p.id === pi.id ? pi : p)));
  const deletePurchaseInvoice = (id: string) => setPurchaseInvoices((prev) => prev.filter((p) => p.id !== id));
  const getPurchaseInvoice = (id: string) => purchaseInvoices.find((p) => p.id === id);

  // Payment operations
  const addPayment = (payment: Payment) => setPayments((prev) => [...prev, payment]);
  const getPaymentsByInvoice = (invoiceId: string) => payments.filter((p) => p.invoiceId === invoiceId);
  const getPaymentsByClient = (clientId: string) => {
    const clientInvoiceIds = invoices.filter((i) => i.clientId === clientId).map((i) => i.id);
    const clientPurchaseIds = purchaseInvoices.filter((p) => p.vendorId === clientId).map((p) => p.id);
    return payments.filter((p) => clientInvoiceIds.includes(p.invoiceId) || clientPurchaseIds.includes(p.invoiceId));
  };

  // Account operations
  const addAccount = (account: Account) => setAccounts((prev) => [...prev, account]);
  const deleteAccount = (id: string) => setAccounts((prev) => prev.filter((a) => a.id !== id || a.isSystem));

  // Journal operations
  const createJournalEntry = (entry: JournalEntry) => setJournalEntries((prev) => [...prev, entry]);

  // Voucher operations
  const addVoucher = (voucher: Voucher) => setVouchers((prev) => [...prev, voucher]);
  const generateVoucherNumber = (type: string) => {
    const prefix = type.toUpperCase().replace(/_/g, '-');
    const year = new Date().getFullYear();
    const count = vouchers.filter((v) => v.type === type).length + 1;
    return `${prefix}-${year}-${count.toString().padStart(3, '0')}`;
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
      const keys = ['clients', 'quotations', 'invoices', 'purchase_invoices', 'payments', 'accounts', 'journal_entries', 'settings', 'vouchers'];
      keys.forEach(k => window.localStorage.removeItem(`app_${k}_${id}`));
    } catch (error) {
      console.warn('Failed to remove company data', error);
    }
  };

  // Generate unique numbers
  const generateQuotationNumber = () => {
    const year = new Date().getFullYear();
    const count = quotations.filter((q) => q.number.includes(`QT-${year}`)).length + 1;
    return `QT-${year}-${count.toString().padStart(3, '0')}`;
  };

  const generateInvoiceNumber = () => {
    const year = new Date().getFullYear();
    const count = invoices.filter((i) => i.number.includes(`INV-${year}`)).length + 1;
    return `INV-${year}-${count.toString().padStart(3, '0')}`;
  };

  const generatePurchaseInvoiceNumber = () => {
    const year = new Date().getFullYear();
    const count = purchaseInvoices.filter((p) => p.number.includes(`PI-${year}`)).length + 1;
    return `PI-${year}-${count.toString().padStart(3, '0')}`;
  };

  return (
    <AppContext.Provider
      value={{
        companies, selectedCompanyId, setSelectedCompanyId, createCompany, updateCompany, deleteCompany,
        clients, setClients, addClient, updateClient, deleteClient, getClient, getCustomers, getVendors,
        quotations, setQuotations, addQuotation, updateQuotation, deleteQuotation, getQuotation,
        invoices, setInvoices, addInvoice, updateInvoice, deleteInvoice, getInvoice,
        purchaseInvoices, setPurchaseInvoices, addPurchaseInvoice, updatePurchaseInvoice, deletePurchaseInvoice, getPurchaseInvoice, generatePurchaseInvoiceNumber,
        payments, addPayment, getPaymentsByInvoice, getPaymentsByClient,
        accounts, setAccounts, addAccount, deleteAccount,
        journalEntries, createJournalEntry, getAccountBalance,
        vouchers, addVoucher, generateVoucherNumber,
        settings, setSettings,
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
