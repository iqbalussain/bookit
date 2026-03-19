

# Add OMR Currency + Client Statement & Payment Features

## 1. Add OMR (Omani Rial) Currency

**Files to change:**
- `src/types/index.ts` -- Add `'OMR'` to the `BusinessSettings['currency']` union type and add `OMR: 'ر.ع.'` to `currencySymbols`
- `src/pages/Settings.tsx` -- Add OMR option to the currency Select dropdown

## 2. Client Statement Page

A new page at `/clients/:id/statement` showing a full financial summary for a specific client.

**What it shows:**
- Client name and contact info at the top
- Filter by date range
- A table/list of all quotations and invoices for that client, sorted by date
- Each row: Date | Document Number | Type (Quote/Invoice) | Status | Amount
- Running balance/totals at the bottom: Total Invoiced, Total Paid, Outstanding Balance

**New file:** `src/pages/ClientStatement.tsx`

**Changes to existing files:**
- `src/App.tsx` -- Add route `/clients/:id/statement`
- `src/pages/ClientsList.tsx` -- Add a "Statement" button/link for each client (desktop actions + mobile sheet)

## 3. Payment Recording Page

A new page at `/invoices/:id/payment` (or a dialog) to record payments against invoices.

**New type in `src/types/index.ts`:**
```
Payment {
  id, invoiceId, amount, date, method ('cash'|'bank'|'cheque'|'online'), notes, createdAt
}
```

**What it includes:**
- Select payment method (Cash, Bank Transfer, Cheque, Online)
- Enter amount (with option to pay partial or full)
- Payment date picker
- Optional notes/reference number
- Shows invoice balance remaining after payment

**New files:**
- `src/pages/PaymentForm.tsx` -- Record payment form

**Changes to existing files:**
- `src/types/index.ts` -- Add `Payment` interface and payment method type
- `src/contexts/AppContext.tsx` -- Add `payments` state array with CRUD operations, add helper to get payments by invoice/client
- `src/App.tsx` -- Add route `/invoices/:id/payment`
- `src/pages/InvoiceForm.tsx` -- Add "Record Payment" button for sent/unpaid invoices
- `src/pages/ClientStatement.tsx` -- Include payment records in the statement view

## Technical Details

- Payments stored in localStorage via `useLocalStorage` hook (key: `app_payments`)
- Invoice status auto-updates to "paid" when total payments equal or exceed invoice amount
- Client statement aggregates invoices + payments to show outstanding balance
- All new pages follow the existing compact, mobile-first design patterns

