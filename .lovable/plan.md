

# Add Journal Voucher, Item Master with VAT, and Item-wise Reporting

## Overview
Three connected features:
1. **Journal Voucher** — non-cash adjustment entries (depreciation, credit asset purchase, corrections)
2. **Item Master** — central item catalog with per-item VAT settings, replacing free-text item entry
3. **Item-wise Report** — Tally-style stock & sales/purchase report per item

---

## 1. Journal Voucher (non-cash adjustments)

**New page**: `src/pages/JournalVoucher.tsx`
- Form with: Date, Voucher Number (auto: `JV-YYYY-MM-XXX`), Narration
- **Multi-line debit/credit grid**: each row picks an Account (from Chart of Accounts) + Debit amount OR Credit amount + line description
- Live "Total Debit / Total Credit / Difference" footer — Save disabled unless balanced
- "+ Add Line" button (minimum 2 lines)
- On save: create Voucher (`type: 'journal'`) + JournalEntry with the exact lines entered

**Type changes** (`src/types/index.ts`):
- Add `'journal'` to `VoucherType`
- Add `'journal'` to `JournalEntry.referenceType`

**Context** (`src/contexts/AppContext.tsx`):
- `generateVoucherNumber('journal')` → `JV-YYYY-MM-XXX`
- `addJournalVoucher(voucher, lines)` — saves voucher + raw journal entry (skips the auto-posting logic used by other vouchers)

**Routing & menu**:
- Route `/vouchers/journal` in `App.tsx`
- Card on `VoucherDashboard` titled "Journal Voucher" (icon: `BookOpen`)

---

## 2. Item Master with VAT

**New type** `Item` in `src/types/index.ts`:
```ts
interface Item {
  id: string;
  name: string;
  description?: string;
  unit?: string;        // pcs, kg, hr...
  rate: number;         // default sale rate
  cost?: number;        // default purchase rate
  stock: number;
  reorderLevel?: number;
  vatApplicable: boolean;
  vatPercentage: number; // 0, 5, 15, etc.
  createdAt: string;
}
```

**Settings additions** (`BusinessSettings`):
- `defaultVatPercentage: number` (e.g. 5)
- `vatEnabled: boolean`

**New page** `src/pages/ItemsList.tsx`:
- Full CRUD: name, unit, rate, cost, opening stock, reorder level, **VAT applicable toggle**, **VAT %** (defaults from settings)
- Search + edit/delete

**LineItem changes** (`src/types/index.ts`):
- Add `itemId: string` (required), `vatApplicable: boolean`, `vatPercentage: number`, `vatAmount: number`
- Keep `name`, `rate`, `qty`, `total` populated from selected item

**Quotation / Invoice / Purchase Invoice forms** (`QuotationForm.tsx`, `InvoiceForm.tsx`, `PurchaseInvoiceForm.tsx`):
- Replace free-text item name input with a **searchable Item dropdown** (Command + Popover) — only items from Item Master are selectable
- Next to each row's item dropdown: **`+` button** opens a small "Quick Add Item" dialog that creates the item via `addItem()` and auto-selects it
- On item select: auto-fill rate/cost, vatApplicable, vatPercentage from the Item record (user can still override qty/rate per line)
- Per line: compute `vatAmount = vatApplicable ? (qty*rate * vatPercentage/100) : 0`
- Totals footer: **Subtotal, VAT Total, Grand Total** (replaces single `netTotal` display; `netTotal` stored = grand total)
- Reduce/restore stock on save/delete (sales decreases, purchase increases)

**Context**:
- `items: Item[]`, `addItem`, `updateItem`, `deleteItem`
- `adjustItemStock(itemId, delta)`

**Routing & menu**:
- Route `/items` in `App.tsx`
- Add "Items" entry to `RadialMenu.tsx` nav array (icon: `Package`)

---

## 3. Item-wise Report (Tally style)

**New page** `src/pages/reports/ItemReport.tsx`:
- Date range filter
- Table columns: Item Name | Opening Stock | Purchased Qty | Sold Qty | Closing Stock | Sales Value | Purchase Value | VAT Collected | VAT Paid
- Click row → drilldown modal listing every quotation/invoice/purchase line that touched the item
- Export to CSV

**Linked from**: Reports area (add to `VoucherDashboard` or via radial menu under existing reports pattern)

---

## File Change Summary

| File | Action |
|------|--------|
| `src/types/index.ts` | Add `Item`, `journal` voucher type, extend `LineItem` & `BusinessSettings` |
| `src/contexts/AppContext.tsx` | items state + CRUD, stock adjust, journal voucher handler |
| `src/pages/JournalVoucher.tsx` | New — multi-line debit/credit form |
| `src/pages/ItemsList.tsx` | New — item master CRUD with VAT |
| `src/pages/reports/ItemReport.tsx` | New — item-wise stock & value report |
| `src/pages/QuotationForm.tsx` | Item dropdown + `+` quick-add + VAT calc + totals |
| `src/pages/InvoiceForm.tsx` | Same as quotation + stock decrement |
| `src/pages/PurchaseInvoiceForm.tsx` | Same + stock increment + VAT paid tracking |
| `src/pages/VoucherDashboard.tsx` | Add Journal Voucher card |
| `src/pages/Settings.tsx` | Add VAT default % + VAT enabled toggle |
| `src/App.tsx` | Routes for `/vouchers/journal`, `/items`, `/reports/items` |
| `src/components/layout/RadialMenu.tsx` | Add "Items" nav item |

## Migration note
Existing quotations/invoices have line items without `itemId`. They'll continue to display (we'll treat missing `itemId` as legacy free-text and show as-is in lists), but editing them will require selecting an item from the master.

