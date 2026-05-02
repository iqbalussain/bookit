import React, { createContext, useContext, ReactNode, useMemo } from 'react';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { useRemoteCollection } from '@/hooks/useRemoteCollection';
import type {
  Client,
  Invoice,
  PurchaseInvoice,
  Payment,
  BusinessSettings,
} from '@/types';

interface AppContextType {
  clients: Client[];
  invoices: Invoice[];
  purchaseInvoices: PurchaseInvoice[];
  payments: Payment[];
  settings: BusinessSettings;

  setClients: React.Dispatch<React.SetStateAction<Client[]>>;
  setInvoices: React.Dispatch<React.SetStateAction<Invoice[]>>;
  setPurchaseInvoices: React.Dispatch<React.SetStateAction<PurchaseInvoice[]>>;

  addInvoice: (invoice: Invoice) => void;
  addPayment: (payment: Payment) => void;

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

  // ✅ SAFE HELPERS
  const safeArray = <T,>(arr: T[] | undefined | null): T[] => (Array.isArray(arr) ? arr : []);

  // ✅ CLIENT HELPERS
  const getCustomers = () => {
    return safeArray(clients).filter((c) => c.type === 'customer' || c.type === 'both');
  };

  // ✅ INVOICE
  const addInvoice = (invoice: Invoice) => {
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
  };

  // ✅ PAYMENT
  const addPayment = (payment: Payment) => {
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
  };

  // ✅ AUDIT
  const getRecentAuditLog = (limit = 10) => {
    return safeArray(auditLog).slice(0, limit);
  };

  // ✅ MEMO VALUE (important for performance)
  const value = useMemo(
    () => ({
      clients: safeArray(clients),
      invoices: safeArray(invoices),
      purchaseInvoices: safeArray(purchaseInvoices),
      payments: safeArray(payments),
      settings,

      setClients,
      setInvoices,
      setPurchaseInvoices,

      addInvoice,
      addPayment,

      getCustomers,
      getRecentAuditLog,
    }),
    [clients, invoices, purchaseInvoices, payments, settings]
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