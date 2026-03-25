

# Fix Settings Page: Updates Section & Multi-Company Management

## Problems Identified

1. **Update section crashes in web**: `window.electronAPI.update.getVersion()` is called unconditionally on mount — fails in browser since `electronAPI` only exists in Electron. Need to guard all Electron API calls.

2. **Company management UX is bare**: Rename/delete are loose inputs and buttons. Need a cleaner UI for managing multiple companies.

## Changes

### 1. Fix Update Section (`src/pages/Settings.tsx`)

- Guard `loadVersion` and `handleCheckUpdates` with `window.electronAPI?.update` checks
- Conditionally render the "About & Updates" card only when running inside Electron (`!!window.electronAPI`)
- Similarly guard `BackupRestore` rendering (it also uses `electronAPI`)

### 2. Improve Multi-Company Management (`src/pages/Settings.tsx`)

Redesign the Company card section:

- **Active company selector** dropdown (existing, keep as-is)
- **Create new company**: Input + "Add" button (existing, keep as-is)
- **Company list**: Show all companies in a small list/table below with:
  - Company name (editable inline or via edit icon that opens a rename input)
  - "Active" badge on the selected company
  - Edit (pencil icon) button — toggles inline rename input
  - Delete (trash icon) button with confirmation dialog — disabled for default company
  - Switch button or click-to-select to change active company
- Remove the loose "Rename" input + button row — replace with per-company edit icons

### File: `src/pages/Settings.tsx`

**Update section fix**:
- `loadVersion`: wrap in `if (!window.electronAPI?.update) return;`
- `handleCheckUpdates`: wrap in `if (!window.electronAPI?.update)` with a toast fallback
- Conditionally render About card: `{window.electronAPI && ( ... )}`
- Conditionally render BackupRestore: `{window.electronAPI && <BackupRestore />}`

**Company management redesign**:
- Add `editingCompanyId` and `editName` state variables
- Replace the rename row with a company list using `companies.map()`:
  - Each row: name (or Input if editing), active badge, edit/save/delete buttons
  - Edit toggles `editingCompanyId`; Save calls `updateCompany` and clears editing state
  - Delete shows a simple confirm or uses AlertDialog
  - Click company name or a "Switch" button calls `setSelectedCompanyId`
- Keep the "Create New Company" input + Add button at the bottom

