

# Remove Payments & Receipts from Sidebar

## Change
Remove the "Payments & Receipts" nav item from the sidebar `navigation` array in `src/components/layout/AppLayout.tsx`. The `/payments` route already exists and is accessible from the Voucher Dashboard cards (Payment and Receipt cards link to `/payments`).

## File: `src/components/layout/AppLayout.tsx`

**Line 24**: Delete `{ name: 'Payments & Receipts', href: '/payments', icon: CreditCard },`

The updated navigation array becomes:
```typescript
const navigation = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Quotations', href: '/quotations', icon: FileText },
  { name: 'Sales Invoices', href: '/invoices', icon: Receipt },
  { name: 'Purchase Invoices', href: '/purchases', icon: ShoppingCart },
  { name: 'Vouchers', href: '/vouchers', icon: Wallet },
  { name: 'Parties', href: '/clients', icon: Users },
  { name: 'Chart of Accounts', href: '/accounts', icon: BookOpen },
];
```

No other changes needed — Payment and Receipt are already accessible as cards inside the Voucher Dashboard.

