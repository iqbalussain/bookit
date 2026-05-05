import React, { createContext, useContext, ReactNode, useCallback, useMemo } from 'react';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { useRemoteCollection } from '@/hooks/useRemoteCollection';
import type {
  Client,
  Invoice,
  PurchaseInvoice,
  Payment,
  BusinessSettings,
  Company,
} from '@/types';

interface AppContextType {
  clients: Client[];
  invoices: Invoice[];
  purchaseInvoices: PurchaseInvoice[];
  payments: Payment[];
  settings: BusinessSettings;
  companies: Company[];
  selectedCompanyId: string;
  isElectron: boolean;

  setClients: React.Dispatch<React.SetStateAction<Client[]>>;
  setInvoices: React.Dispatch<React.SetStateAction<Invoice[]>>;
  setPurchaseInvoices: React.Dispatch<React.SetStateAction<PurchaseInvoice[]>>;
  setSettings: React.Dispatch<React.SetStateAction<BusinessSettings>>;
  setSelectedCompanyId: React.Dispatch<React.SetStateAction<string>>;

  addInvoice: (invoice: Invoice) => void;
  addPayment: (payment: Payment) => void;
  createCompany: (name: string) => void;
  updateCompany: (id: string, name: string) => void;
  deleteCompany: (id: string) => void;
  forceSync: () => Promise<void>;

  getCustomers: () => Client[];
  getRecentAuditLog: (limit?: number) => any[];
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

const AppContext = createContext<AppContextType | null>(null);
const defaultCompanies: Company[] = [{ id: 'default', name: 'Default Company' }];

const safeArray = <T,>(arr: T[] | undefined | null): T[] => (Array.isArray(arr) ? arr : []);

export function AppProvider({ children }: { children: ReactNode }) {
  const [clients, setClients] = useRemoteCollection<Client>('clients', 'app_clients', []);
  const [invoices, setInvoices] = useRemoteCollection<Invoice>('invoices', 'app_invoices', []);
  const [purchaseInvoices, setPurchaseInvoices] = useRemoteCollection<PurchaseInvoice>(
    'purchaseInvoices',
    'app_purchase_invoices',
    []
  );
  const [payments, setPayments] = useRemoteCollection<Payment>('payments', 'app_payments', []);
  const [settings, setSettings] = useLocalStorage<BusinessSettings>('app_settings', defaultSettings);
  const [auditLog, setAuditLog] = useLocalStorage<any[]>('app_audit_log', []);
  const [companies, setCompanies] = useLocalStorage<Company[]>('app_companies', defaultCompanies);
  const [selectedCompanyId, setSelectedCompanyId] = useLocalStorage<string>('app_selected_company', 'default');
  const isElectron = typeof window !== 'undefined' && !!window.electronAPI;

  const getCustomers = useCallback(() => {
    return safeArray(clients).filter((c) => c.type === 'customer' || c.type === 'both');
  }, [clients]);

  // ✅ INVOICE
  const addInvoice = useCallback((invoice: Invoice) => {
    const safeInvoice = {
      ...invoice,
      items: Array.isArray(invoice.items) ? invoice.items : [],
      netTotal: Number(invoice.netTotal) || 0,
      createdAt: invoice.createdAt || new Date().toISOString(),
    };

    setInvoices((prev) => [...safeArray(prev), safeInvoice]);

    setAuditLog((prev) => [
      {
        id: Date.now().toString(),
        action: 'invoice_created',
        target: safeInvoice.number,
        createdAt: new Date().toISOString(),
      },
      ...safeArray(prev),
    ]);
  }, [setAuditLog, setInvoices]);

  // ✅ PAYMENT
  const addPayment = useCallback((payment: Payment) => {
    const safePayment = {
      ...payment,
      amount: Number(payment.amount) || 0,
      date: payment.date || new Date().toISOString().slice(0, 10),
    };

    setPayments((prev) => [...safeArray(prev), safePayment]);

    setAuditLog((prev) => [
      {
        id: Date.now().toString(),
        action: 'payment_added',
        target: safePayment.invoiceId,
        createdAt: new Date().toISOString(),
      },
      ...safeArray(prev),
    ]);
  }, [setAuditLog, setPayments]);

  const getRecentAuditLog = useCallback((limit = 10) => {
    return safeArray(auditLog).slice(0, limit);
  }, [auditLog]);

  const createCompany = useCallback((name: string) => {
    const id = `company-${Date.now()}`;
    setCompanies((prev) => [...safeArray(prev), { id, name }]);
    setSelectedCompanyId(id);
  }, [setCompanies, setSelectedCompanyId]);

  const updateCompany = useCallback((id: string, name: string) => {
    setCompanies((prev) => safeArray(prev).map((company) =>
      company.id === id ? { ...company, name } : company
    ));
  }, [setCompanies]);

  const deleteCompany = useCallback((id: string) => {
    setCompanies((prev) => safeArray(prev).filter((company) => company.id !== id));
    if (selectedCompanyId === id) setSelectedCompanyId('default');
  }, [selectedCompanyId, setCompanies, setSelectedCompanyId]);

  const forceSync = useCallback(async () => {
    if (window.electronAPI?.saveBusinessSettings) {
      await window.electronAPI.saveBusinessSettings(settings);
    }
  }, [settings]);

  // ✅ MEMO VALUE (important for performance)
  const value = useMemo(
    () => ({
      clients: safeArray(clients),
      invoices: safeArray(invoices),
      purchaseInvoices: safeArray(purchaseInvoices),
      payments: safeArray(payments),
      settings,
      companies: safeArray(companies).length ? safeArray(companies) : defaultCompanies,
      selectedCompanyId,
      isElectron,

      setClients,
      setInvoices,
      setPurchaseInvoices,
      setSettings,
      setSelectedCompanyId,

      addInvoice,
      addPayment,
      createCompany,
      updateCompany,
      deleteCompany,
      forceSync,

      getCustomers,
      getRecentAuditLog,
    }),
    [
      clients,
      invoices,
      purchaseInvoices,
      payments,
      settings,
      companies,
      selectedCompanyId,
      isElectron,
      addInvoice,
      addPayment,
      createCompany,
      updateCompany,
      deleteCompany,
      forceSync,
      getCustomers,
      getRecentAuditLog,
    ]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

// ✅ THIS IS THE IMPORTANT PART (fixes your error)
export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used inside AppProvider');
  }
  return context;
};
