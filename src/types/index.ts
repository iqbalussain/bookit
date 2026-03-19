// Party types
export type PartyType = 'customer' | 'vendor' | 'both';

// Client types
export interface Client {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  type: PartyType;
  paymentTermsDays?: number;
  taxRegistrationNumber?: string;
  creditLimit?: number;
  createdAt: string;
}

// Line item for quotations/invoices
export interface LineItem {
  id: string;
  name: string;
  description: string;
  quantity: number;
  rate: number;
  total: number;
}

// Quotation types
export type QuotationStatus = 'draft' | 'sent' | 'approved' | 'rejected' | 'converted';

export interface Quotation {
  id: string;
  number: string;
  clientId: string;
  items: LineItem[];
  netTotal: number;
  status: QuotationStatus;
  convertedInvoiceId?: string;
  notes: string;
  terms: string;
  createdAt: string;
  updatedAt: string;
}

// Invoice types
export type InvoiceStatus = 'draft' | 'sent' | 'paid' | 'partial' | 'overdue' | 'cancelled';

export interface Invoice {
  id: string;
  number: string;
  clientId: string;
  quotationId?: string;
  items: LineItem[];
  netTotal: number;
  status: InvoiceStatus;
  dueDate: string;
  notes: string;
  terms: string;
  createdAt: string;
  updatedAt: string;
}

// Purchase Invoice types
export type PurchaseInvoiceStatus = 'draft' | 'sent' | 'partial' | 'paid' | 'overdue';

export interface PurchaseInvoice {
  id: string;
  number: string;
  vendorId: string;
  items: LineItem[];
  netTotal: number;
  status: PurchaseInvoiceStatus;
  dueDate: string;
  notes: string;
  terms: string;
  createdAt: string;
  updatedAt: string;
}

// Payment types
export type PaymentMethod = 'cash' | 'bank' | 'card' | 'cheque' | 'online';

export interface Payment {
  id: string;
  invoiceId: string;
  invoiceType: 'sales' | 'purchase';
  amount: number;
  date: string;
  method: PaymentMethod;
  reference?: string;
  notes: string;
  createdAt: string;
}

// Double-Entry Accounting types
export type AccountType = 'asset' | 'liability' | 'income' | 'expense' | 'equity';

export interface Account {
  id: string;
  code: string;
  name: string;
  type: AccountType;
  parentId?: string;
  isSystem: boolean;
}

export interface JournalEntry {
  id: string;
  date: string;
  reference: string;
  referenceType: 'sales_invoice' | 'purchase_invoice' | 'receipt' | 'payment';
  referenceId: string;
  description: string;
  lines: JournalLine[];
  createdAt: string;
}

export interface JournalLine {
  accountId: string;
  debit: number;
  credit: number;
  description?: string;
}

// Default Chart of Accounts
export const DEFAULT_ACCOUNTS: Account[] = [
  { id: 'acc-1000', code: '1000', name: 'Cash', type: 'asset', isSystem: true },
  { id: 'acc-1010', code: '1010', name: 'Bank', type: 'asset', isSystem: true },
  { id: 'acc-1100', code: '1100', name: 'Accounts Receivable', type: 'asset', isSystem: true },
  { id: 'acc-2000', code: '2000', name: 'Accounts Payable', type: 'liability', isSystem: true },
  { id: 'acc-3000', code: '3000', name: "Owner's Equity", type: 'equity', isSystem: true },
  { id: 'acc-3100', code: '3100', name: 'Retained Earnings', type: 'equity', isSystem: true },
  { id: 'acc-4000', code: '4000', name: 'Sales Revenue', type: 'income', isSystem: true },
  { id: 'acc-5000', code: '5000', name: 'General Expenses', type: 'expense', isSystem: true },
  { id: 'acc-5100', code: '5100', name: 'Cost of Goods', type: 'expense', isSystem: true },
];

// Business settings
export interface BusinessSettings {
  name: string;
  email: string;
  phone: string;
  address: string;
  logo?: string;
  currency: 'INR' | 'USD' | 'EUR' | 'GBP' | 'OMR';
  taxNumber?: string;
}

// Currency symbols
export const currencySymbols: Record<BusinessSettings['currency'], string> = {
  INR: '₹',
  USD: '$',
  EUR: '€',
  GBP: '£',
  OMR: 'ر.ع.',
};
