import React, { createContext, useContext, ReactNode } from 'react';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import type { Client, Quotation, Invoice, PurchaseInvoice, BusinessSettings, Payment, Account, JournalEntry, JournalLine, Voucher, VoucherType } from '@/types';
import { DEFAULT_ACCOUNTS } from '@/types';

interface AppContextType {
  clients: Client[];
  setClients: (clients: Client[] | ((prev: Client[]) => Client[])) => void;
  addClient: (client: Client) => void;
  updateClient: (client: Client) => void;
  deleteClient: (id: string) => void;
  getClient: (id: string) => Client | undefined;
  getCustomers: () => Client[];
  getVendors: () => Client[];
  quotations: Quotation[];
  setQuotations: (quotations: Quotation[] | ((prev: Quotation[]) => Quotation[])) => void;
  addQuotation: (quotation: Quotation) => void;
  updateQuotation: (quotation: Quotation) => void;
  deleteQuotation: (id: string) => void;
  getQuotation: (id: string) => Quotation | undefined;
  invoices: Invoice[];
  setInvoices: (invoices: Invoice[] | ((prev: Invoice[]) => Invoice[])) => void;
  addInvoice: (invoice: Invoice) => void;
  updateInvoice: (invoice: Invoice) => void;
  deleteInvoice: (id: string) => void;
  getInvoice: (id: string) => Invoice | undefined;
  purchaseInvoices: PurchaseInvoice[];
  setPurchaseInvoices: (pi: PurchaseInvoice[] | ((prev: PurchaseInvoice[]) => PurchaseInvoice[])) => void;
  addPurchaseInvoice: (pi: PurchaseInvoice) => void;
  updatePurchaseInvoice: (pi: PurchaseInvoice) => void;
  deletePurchaseInvoice: (id: string) => void;
  getPurchaseInvoice: (id: string) => PurchaseInvoice | undefined;
  generatePurchaseInvoiceNumber: () => string;
  payments: Payment[];
  addPayment: (payment: Payment) => void;
  getPaymentsByInvoice: (invoiceId: string) => Payment[];
  getPaymentsByClient: (clientId: string) => Payment[];
  vouchers: Voucher[];
  addVoucher: (voucher: Voucher) => void;
  generateVoucherNumber: (type: VoucherType) => string;
  accounts: Account[];
  setAccounts: (accounts: Account[] | ((prev: Account[]) => Account[])) => void;
  addAccount: (account: Account) => void;
  deleteAccount: (id: string) => void;
  journalEntries: JournalEntry[];
  createJournalEntry: (entry: JournalEntry) => void;
  getAccountBalance: (accountId: string) => number;
  settings: BusinessSettings;
  setSettings: (settings: BusinessSettings | ((prev: BusinessSettings) => BusinessSettings)) => void;
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
  const [clients, setClients] = useLocalStorage<Client[]>('app_clients', []);
  const [quotations, setQuotations] = useLocalStorage<Quotation[]>('app_quotations', []);
  const [invoices, setInvoices] = useLocalStorage<Invoice[]>('app_invoices', []);
  const [purchaseInvoices, setPurchaseInvoices] = useLocalStorage<PurchaseInvoice[]>('app_purchase_invoices', []);
  const [payments, setPayments] = useLocalStorage<Payment[]>('app_payments', []);
  const [vouchers, setVouchers] = useLocalStorage<Voucher[]>('app_vouchers', []);
  const [accounts, setAccounts] = useLocalStorage<Account[]>('app_accounts', DEFAULT_ACCOUNTS);
  const [journalEntries, setJournalEntries] = useLocalStorage<JournalEntry[]>('app_journal_entries', []);
  const [settings, setSettings] = useLocalStorage<BusinessSettings>('app_settings', defaultSettings);

  const addClient = (client: Client) => setClients((prev) => [...prev, client]);
  const updateClient = (client: Client) => setClients((prev) => prev.map((c) => (c.id === client.id ? client : c)));
  const deleteClient = (id: string) => setClients((prev) => prev.filter((c) => c.id !== id));
  const getClient = (id: string) => clients.find((c) => c.id === id);
  const getCustomers = () => clients.filter((c) => c.type === 'customer' || c.type === 'both');
  const getVendors = () => clients.filter((c) => c.type === 'vendor' || c.type === 'both');

  const addQuotation = (quotation: Quotation) => setQuotations((prev) => [...prev, quotation]);
  const updateQuotation = (quotation: Quotation) => setQuotations((prev) => prev.map((q) => (q.id === quotation.id ? quotation : q)));
  const deleteQuotation = (id: string) => setQuotations((prev) => prev.filter((q) => q.id !== id));
  const getQuotation = (id: string) => quotations.find((q) => q.id === id);

  const addInvoice = (invoice: Invoice) => setInvoices((prev) => [...prev, invoice]);
  const updateInvoice = (invoice: Invoice) => setInvoices((prev) => prev.map((i) => (i.id === invoice.id ? invoice : i)));
  const deleteInvoice = (id: string) => setInvoices((prev) => prev.filter((i) => i.id !== id));
  const getInvoice = (id: string) => invoices.find((i) => i.id === id);

  const addPurchaseInvoice = (pi: PurchaseInvoice) => setPurchaseInvoices((prev) => [...prev, pi]);
  const updatePurchaseInvoice = (pi: PurchaseInvoice) => setPurchaseInvoices((prev) => prev.map((p) => (p.id === pi.id ? pi : p)));
  const deletePurchaseInvoice = (id: string) => setPurchaseInvoices((prev) => prev.filter((p) => p.id !== id));
  const getPurchaseInvoice = (id: string) => purchaseInvoices.find((p) => p.id === id);

  const addPayment = (payment: Payment) => setPayments((prev) => [...prev, payment]);
  const getPaymentsByInvoice = (invoiceId: string) => payments.filter((p) => p.invoiceId === invoiceId);
  const getPaymentsByClient = (clientId: string) => {
    const clientInvoiceIds = invoices.filter((i) => i.clientId === clientId).map((i) => i.id);
    const clientPurchaseIds = purchaseInvoices.filter((p) => p.vendorId === clientId).map((p) => p.id);
    return payments.filter((p) => clientInvoiceIds.includes(p.invoiceId) || clientPurchaseIds.includes(p.invoiceId));
  };

  const addVoucher = (voucher: Voucher) => setVouchers((prev) => [...prev, voucher]);

  const generateVoucherNumber = (type: VoucherType) => {
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const prefixMap: Record<VoucherType, string> = {
      expense: 'EXP', contra: 'CTR', loan_given: 'LGT', loan_received: 'LNR',
    };
    const prefix = prefixMap[type];
    const pattern = `${prefix}-${yyyy}-${mm}`;
    const count = vouchers.filter((v) => v.number.startsWith(pattern)).length + 1;
    return `${pattern}-${count.toString().padStart(3, '0')}`;
  };

  const addAccount = (account: Account) => setAccounts((prev) => [...prev, account]);
  const deleteAccount = (id: string) => setAccounts((prev) => prev.filter((a) => a.id !== id || a.isSystem));

  const createJournalEntry = (entry: JournalEntry) => setJournalEntries((prev) => [...prev, entry]);
  
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
        clients, setClients, addClient, updateClient, deleteClient, getClient, getCustomers, getVendors,
        quotations, setQuotations, addQuotation, updateQuotation, deleteQuotation, getQuotation,
        invoices, setInvoices, addInvoice, updateInvoice, deleteInvoice, getInvoice,
        purchaseInvoices, setPurchaseInvoices, addPurchaseInvoice, updatePurchaseInvoice, deletePurchaseInvoice, getPurchaseInvoice, generatePurchaseInvoiceNumber,
        payments, addPayment, getPaymentsByInvoice, getPaymentsByClient,
        vouchers, addVoucher, generateVoucherNumber,
        accounts, setAccounts, addAccount, deleteAccount,
        journalEntries, createJournalEntry, getAccountBalance,
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
