
# Bottom Action Removal + Build Fixes + Easy Windows Installer

## 1. Remove the bottom on-screen quick actions
The screen-bottom strip with:
- New Quote
- New Invoice
- Receive Payment
- Add Client
- `+`

will be removed so only the centered radial menu remains.

### Files to update
- `src/components/layout/AppLayout.tsx`
  - Remove the `quickActions` constant
  - Remove the fixed bottom action dock markup
  - Remove now-unused imports like `Tooltip`, `Plus`, `FileText`, `Users`, `ArrowRight` only if no longer needed
- If still rendered anywhere else:
  - `src/components/layout/FloatingActionButton.tsx`
  - `src/components/layout/MobileBottomNav.tsx`

### Result
Cleaner mobile/desktop bottom area with no duplicate action buttons.

---

## 2. Fix the current TypeScript build errors
The invoice status type no longer supports `'unpaid'` in the same way as the current logic expects, and `'sent'` checks are conflicting with the defined status union in some places.

### Files to update
- `src/types/index.ts`
- `src/pages/InvoiceForm.tsx`
- `src/pages/InvoicesList.tsx`

### Fixes
- Make invoice status handling consistent across:
  - saved invoice records
  - displayed payment-derived status
  - badge/button conditional logic
- Replace invalid `'unpaid'` fallback usage with a valid `InvoiceStatus`
- Refactor `currentStatus === 'sent'` checks if the form is actually using computed payment status rather than stored invoice status
- Ensure helper return types match `InvoiceStatus`

### Expected outcome
These errors will be resolved:
- `TS2367` in `InvoiceForm.tsx`
- `TS2345` in `InvoicesList.tsx`

---

## 3. Keep VAT/PDF and bank detail work intact while making the app buildable
The already-added VAT and bank-detail document work will be preserved, but I will verify the recent edits don’t introduce additional compile errors.

### Files to validate/update if needed
- `src/lib/documentUtils.ts`
- `src/contexts/AppContext.tsx`
- `src/pages/Settings.tsx`

### Result
No regression to:
- Bank details in quotation/invoice PDF
- VAT columns and totals in quotation/invoice PDF
- LAN multi-user changes already introduced

---

## 4. Deliver a proper easy-to-install Windows `.exe`
You asked specifically for a proper installer that works easily on Windows PCs.

### Best implementation path
Use the existing `electron-builder` + `NSIS` installer setup already present in:
- `electron-builder.json`
- `.github/workflows/release.yml`

### Work to complete
- Verify `package.json` build script is aligned with the installer config
- Make sure Electron entry/build config works reliably for production
- Avoid Bun for packaging because Bun is crashing in this environment
- Use `npm` for installer builds and CI packaging
- Ensure the produced artifact is an installer `.exe`, not just a portable app folder

### Important constraint
A real Windows installer must be built on a Windows environment for best reliability. The safest low-credit approach is:

```text
GitHub Actions (windows-latest)
-> npm ci
-> npm run build-win
-> upload NSIS installer .exe to the Release
```

### Result
You’ll get:
- a proper Windows installer `.exe`
- installation wizard
- desktop shortcut option
- install location selection
- easier installation on other PCs

---

## 5. Keep it within the lowest practical credit usage
To stay close to your “only 2 credit” requirement, implementation will be kept tight:

### Minimal-scope strategy
1. Remove the bottom quick-action bar
2. Fix the current TS build failures
3. Verify production build path
4. Finalize Windows installer flow using existing NSIS setup instead of adding a second packaging system

### Deliberately avoided
- No redesign of navigation
- No new packaging framework
- No unnecessary refactors
- No Bun-based install/build path

---

## Files expected to change
- `src/components/layout/AppLayout.tsx`
- `src/pages/InvoiceForm.tsx`
- `src/pages/InvoicesList.tsx`
- possibly `src/types/index.ts`
- possibly `package.json`
- possibly `.github/workflows/release.yml` only if script alignment is needed

## Final deliverable
After implementation:
- the bottom quick-action strip is gone
- the build errors are fixed
- the app is production-buildable again
- the Windows installer path is cleaned up and ready to generate a proper `.exe`

## Technical notes
```text
Main packaging choice: electron-builder + NSIS
Reason: produces a real Windows installer

Do not rely on Bun for install/build
Reason: current environment shows Bun segmentation fault during install

Status fix approach:
- normalize invoice status checks
- remove invalid 'unpaid' handling where InvoiceStatus does not allow it
- keep computed overdue/payment display separate from stored status
```
